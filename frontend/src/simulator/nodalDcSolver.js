import { prepareCircuit } from "./preparation.js"
import { getDcSource } from "./dcSourceRegistry.js"
import { getGroundReferencePins } from "./groundReferenceRegistry.js"
import { Signal } from "./signals.js"

/**
 * TINKERCAD-004 — solveur DC nodal (Modified Nodal Analysis).
 *
 * Additif : il lit les MÊMES nets que le moteur (prepareCircuit : fils,
 * trous de breadboard dérivés, interrupteurs via topologie interne) et ne
 * remplace ni resolution.js ni le moteur numérique. Il calcule des tensions
 * de nœuds et des courants réels pour les modèles qualifiés ci-dessous :
 *
 *   - sources DC idéales (POWER, piles)            → source de tension
 *   - RESISTOR                                      → conductance R
 *   - POTENTIOMETER (left-wiper / wiper-right)      → R·position, R·(1-position)
 *   - LED / DIODE                                   → modèle linéaire par morceaux
 *                                                     (seuil Vf + résistance Ron)
 *   - ARDUINO D0–D13 pilotées HIGH/LOW              → source Thévenin 5 V / 0 V
 *                                                     + résistance de sortie 25 Ω
 *   - ARDUINO GND                                   → référence 0 V
 *   - interrupteurs / boutons                       → déjà fusionnés en nets
 *   - CAPACITOR                                     → circuit ouvert en DC
 *
 * Tout autre type est listé dans `unqualifiedTypes` et traité comme absent
 * du réseau : aucun résultat n'est inventé pour lui.
 */

export const ARDUINO_OUTPUT_RESISTANCE_OHMS = 25
export const ARDUINO_HIGH_VOLTS = 5
const GMIN = 1e-12
const DEFAULT_LED_VF = 2.0
const DEFAULT_LED_RON = 10
const DEFAULT_DIODE_VF = 0.7
const DEFAULT_DIODE_RON = 10
const MAX_DIODE_ITERATIONS = 40
const MIN_CONDUCTION_AMPS = 1e-9

const MODELED = new Set([
  "RESISTOR", "POTENTIOMETER", "LED", "DIODE", "POWER", "BATTERY_9V", "BATTERY_AA",
  "COIN_CELL_CR2032", "ARDUINO", "BUTTON", "BUTTON_LATCHING", "SLIDE_SWITCH", "DIP_SWITCH", "CAPACITOR",
])

function positive(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback
}

function solveLinear(matrix, rhs) {
  const n = rhs.length
  const a = matrix.map((row, i) => [...row, rhs[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r
    if (Math.abs(a[pivot][col]) < 1e-13) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    for (let r = col + 1; r < n; r++) {
      const f = a[r][col] / a[col][col]
      if (f === 0) continue
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c]
    }
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = a[i][n]
    for (let c = i + 1; c < n; c++) s -= a[i][c] * x[c]
    x[i] = s / a[i][i]
  }
  return x
}

function collectElements(components, prepared, pinSignals) {
  const { uf } = prepared
  const node = (uid, pin) => uf.find(uf.key(uid, pin))
  const elements = []
  const unqualifiedTypes = new Set()
  const warnings = []
  const sourceNets = new Set()

  for (const comp of components) {
    const src = getDcSource(comp)
    if (src) {
      sourceNets.add(node(comp.uid, src.positivePin))
      sourceNets.add(node(comp.uid, src.negativePin))
    }
  }

  for (const comp of components) {
    const { uid, type } = comp
    const params = comp.parameters ?? {}
    const source = getDcSource(comp)
    if (source) {
      elements.push({ kind: "V", uid, p: node(uid, source.positivePin), n: node(uid, source.negativePin), v: source.voltage })
      continue
    }
    if (type === "RESISTOR") {
      elements.push({ kind: "R", uid, a: node(uid, "A"), b: node(uid, "B"), r: positive(params.resistance, 220), seg: "A-B" })
    } else if (type === "POTENTIOMETER") {
      const total = positive(params.resistance, 10000)
      const pos = typeof params.position === "number" ? Math.min(1, Math.max(0, params.position)) : 0.5
      const minR = 0.001
      elements.push({ kind: "R", uid, a: node(uid, "left"), b: node(uid, "wiper"), r: Math.max(minR, total * pos), seg: "left-wiper" })
      elements.push({ kind: "R", uid, a: node(uid, "wiper"), b: node(uid, "right"), r: Math.max(minR, total * (1 - pos)), seg: "wiper-right" })
    } else if (type === "LED" || type === "DIODE") {
      const isLed = type === "LED"
      elements.push({
        kind: "D", uid, a: node(uid, "anode"), b: node(uid, "cathode"),
        vf: positive(params.forwardVoltage, isLed ? DEFAULT_LED_VF : DEFAULT_DIODE_VF),
        ron: positive(params.onResistance, isLed ? DEFAULT_LED_RON : DEFAULT_DIODE_RON),
        isLed,
      })
    } else if (type === "ARDUINO") {
      const gnd = node(uid, "GND")
      for (let i = 0; i <= 13; i++) {
        const pin = `D${i}`
        const signal = pinSignals?.get(`${uid}:${pin}`)
        const n = node(uid, pin)
        // Une broche n'est considérée pilotée que si aucune source DC n'est sur son net.
        if ((signal === Signal.HIGH || signal === Signal.LOW) && !sourceNets.has(n)) {
          elements.push({
            kind: "T", uid, pin, p: n, n: gnd,
            v: signal === Signal.HIGH ? ARDUINO_HIGH_VOLTS : 0, r: ARDUINO_OUTPUT_RESISTANCE_OHMS,
          })
        }
      }
    } else if (!MODELED.has(type)) {
      unqualifiedTypes.add(type)
    }
  }
  return { elements, unqualifiedTypes: [...unqualifiedTypes].sort(), warnings }
}

function solveIsland(nodes, elements, refNode) {
  const unknownNodes = nodes.filter((n) => n !== refNode)
  const index = new Map(unknownNodes.map((n, i) => [n, i]))
  const vSources = elements.filter((e) => e.kind === "V")
  const size = unknownNodes.length + vSources.length
  const diodes = elements.filter((e) => e.kind === "D")
  const diodeOn = new Map(diodes.map((d) => [d, false]))

  const build = () => {
    const m = Array.from({ length: size }, () => new Array(size).fill(0))
    const rhs = new Array(size).fill(0)
    const stampG = (a, b, g) => {
      const ia = index.get(a); const ib = index.get(b)
      if (ia !== undefined) m[ia][ia] += g
      if (ib !== undefined) m[ib][ib] += g
      if (ia !== undefined && ib !== undefined) { m[ia][ib] -= g; m[ib][ia] -= g }
    }
    const stampI = (a, i) => { const ia = index.get(a); if (ia !== undefined) rhs[ia] += i }
    for (const n of unknownNodes) stampG(n, refNode, GMIN)
    for (const e of elements) {
      if (e.kind === "R") stampG(e.a, e.b, 1 / e.r)
      else if (e.kind === "T") { const g = 1 / e.r; stampG(e.p, e.n, g); stampI(e.p, g * e.v); stampI(e.n, -g * e.v) }
      else if (e.kind === "D" && diodeOn.get(e)) {
        const g = 1 / e.ron
        stampG(e.a, e.b, g); stampI(e.a, g * e.vf); stampI(e.b, -g * e.vf)
      }
    }
    vSources.forEach((s, k) => {
      const row = unknownNodes.length + k
      const ip = index.get(s.p); const in_ = index.get(s.n)
      if (ip !== undefined) { m[ip][row] += 1; m[row][ip] += 1 }
      if (in_ !== undefined) { m[in_][row] -= 1; m[row][in_] -= 1 }
      rhs[row] = s.v
    })
    return { m, rhs }
  }

  let solution = null
  let converged = false
  for (let it = 0; it < MAX_DIODE_ITERATIONS; it++) {
    const { m, rhs } = build()
    solution = solveLinear(m, rhs)
    if (!solution) return { status: "SHORT_CIRCUIT" }
    const volt = (n) => (n === refNode ? 0 : solution[index.get(n)])
    let changed = false
    for (const d of diodes) {
      const on = volt(d.a) - volt(d.b) > d.vf
      if (on !== diodeOn.get(d)) { diodeOn.set(d, on); changed = true }
    }
    if (!changed) { converged = true; break }
  }
  if (!converged) return { status: "NO_CONVERGENCE" }

  const volt = (n) => (n === refNode ? 0 : solution[index.get(n)])
  const sourceCurrents = new Map(vSources.map((s, k) => [s, -solution[unknownNodes.length + k]]))
  return { status: "OK", volt, diodeOn, sourceCurrents }
}

/**
 * @param {Array} components composants au format moteur ({uid,type,parameters,state})
 * @param {Array} wires      fils au format moteur ({fromUid,fromPin,toUid,toPin})
 * @param {{ pinSignals?: Map<string,string> }} [options]
 */
export function solveDcNetwork(components, wires, options = {}) {
  const prepared = prepareCircuit(components, wires)
  const { uf, allKeys } = prepared
  const { elements, unqualifiedTypes, warnings } = collectElements(components, prepared, options.pinSignals)

  // Îlots électriques : composantes connexes de nœuds liés par un élément.
  const parent = new Map()
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x)
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)
    parent.set(x, r)
    return r
  }
  const endpoints = (e) => (e.kind === "V" || e.kind === "T" ? [e.p, e.n] : [e.a, e.b])
  for (const e of elements) { const [x, y] = endpoints(e); parent.set(find(x), find(y)) }

  const islands = new Map()
  for (const e of elements) {
    const root = find(endpoints(e)[0])
    if (!islands.has(root)) islands.set(root, { nodes: new Set(), elements: [] })
    const island = islands.get(root)
    island.elements.push(e)
    for (const n of endpoints(e)) island.nodes.add(n)
  }

  const groundNodes = new Set()
  for (const comp of components) {
    for (const pinId of getGroundReferencePins(comp.type)) groundNodes.add(uf.find(uf.key(comp.uid, pinId)))
  }

  const nodeVoltage = new Map()
  const elementResult = new Map()
  const ledState = new Map()
  const sourceCurrent = new Map()
  const islandStatus = []
  let shorted = false

  for (const island of islands.values()) {
    const nodes = [...island.nodes]
    const vSources = island.elements.filter((e) => e.kind === "V")
    const refNode = nodes.find((n) => groundNodes.has(n)) ?? vSources[0]?.n
    if (refNode === undefined) { islandStatus.push("NO_REFERENCE"); continue }
    if (vSources.some((s) => s.p === s.n)) { shorted = true; islandStatus.push("SHORT_CIRCUIT"); continue }

    const out = solveIsland(nodes, island.elements, refNode)
    islandStatus.push(out.status)
    if (out.status === "SHORT_CIRCUIT") { shorted = true; continue }
    if (out.status !== "OK") continue

    // Atteignabilité conductrice depuis la référence : sinon le nœud est flottant.
    const adjacency = new Map(nodes.map((n) => [n, []]))
    const link = (a, b) => { adjacency.get(a).push(b); adjacency.get(b).push(a) }
    for (const e of island.elements) {
      if (e.kind === "D" && !(out.diodeOn.get(e) && (out.volt(e.a) - out.volt(e.b) - e.vf) / e.ron > MIN_CONDUCTION_AMPS)) continue
      const [a, b] = endpoints(e)
      link(a, b)
    }
    const reached = new Set([refNode])
    const queue = [refNode]
    while (queue.length) for (const nb of adjacency.get(queue.pop())) if (!reached.has(nb)) { reached.add(nb); queue.push(nb) }
    for (const n of nodes) nodeVoltage.set(n, reached.has(n) ? out.volt(n) : null)

    for (const e of island.elements) {
      if (e.kind === "R") {
        const v = out.volt(e.a) - out.volt(e.b)
        const list = elementResult.get(e.uid) ?? []
        list.push({ segment: e.seg, voltage: v, current: v / e.r })
        elementResult.set(e.uid, list)
      } else if (e.kind === "D") {
        const v = out.volt(e.a) - out.volt(e.b)
        const on = out.diodeOn.get(e)
        const current = on ? (v - e.vf) / e.ron : 0
        const conducting = current > MIN_CONDUCTION_AMPS
        elementResult.set(e.uid, [{ segment: "anode-cathode", voltage: v, current: conducting ? current : 0 }])
        if (e.isLed) ledState.set(e.uid, { on: conducting, current: conducting ? current : 0, voltage: v })
      } else if (e.kind === "V") {
        sourceCurrent.set(e.uid, out.sourceCurrents.get(e))
      }
    }
  }

  const keyVoltage = (key) => {
    if (!allKeys.includes(key)) return null
    const v = nodeVoltage.get(uf.find(key))
    return v === undefined ? null : v
  }

  return {
    status: shorted ? "SHORT_CIRCUIT" : islands.size === 0 ? "NO_ELEMENTS" : islandStatus.every((s) => s === "OK") ? "OK" : "PARTIAL",
    unqualifiedTypes,
    warnings,
    islandStatus,
    pinVoltage: (uid, pin) => keyVoltage(uf.key(uid, pin)),
    voltageBetween(uidA, pinA, uidB, pinB) {
      const a = keyVoltage(uf.key(uidA, pinA)); const b = keyVoltage(uf.key(uidB, pinB))
      return a === null || b === null ? null : a - b
    },
    elementCurrent: (uid, segment) => {
      const list = elementResult.get(uid)
      if (!list) return null
      return (segment ? list.find((r) => r.segment === segment) : list[0])?.current ?? null
    },
    elementSegments: (uid) => elementResult.get(uid) ?? [],
    ledState: (uid) => ledState.get(uid) ?? null,
    sourceCurrent: (uid) => sourceCurrent.get(uid) ?? null,
  }
}
