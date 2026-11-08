import { prepareCircuit } from "./preparation.js"
import { getDcSource } from "./dcSourceRegistry.js"
import { getGroundReferencePins } from "./groundReferenceRegistry.js"
import { solveLinear } from "./nodalDcSolver.js"
import { resolveComponentParameters, validateComponentParameters } from "./resolveComponentParameters.js"

/**
 * TINKERCAD-005 — solveur transitoire nodal (MNA + schéma d'Euler implicite).
 *
 * Additif : lit les mêmes nets que le moteur numérique (`prepareCircuit`) et
 * ne remplace ni `resolution.js` ni `nodalDcSolver.js`. Une session conserve
 * l'état dynamique (tension des condensateurs, courant des inductances) d'un
 * pas à l'autre ; `step(dt)` avance le temps simulé.
 *
 * Modèles qualifiés (domaine de validité en commentaire) :
 *   - R, potentiomètre, sources DC, générateur de signaux (V(t) idéal)
 *   - CAPACITOR / POLARIZED_CAPACITOR : i = C·dv/dt (Euler implicite, état initial explicite ou nul)
 *   - INDUCTOR : v = L·di/dt (Euler implicite, courant initial explicite ou nul)
 *   - LED / DIODE : seuil Vf + Ron (linéaire par morceaux, sans capacité de jonction)
 *   - NPN / PNP : Vbe=0,7 V + Rbe, Ic = β·Ib en actif, Vce,sat = 0,2 V ; pas d'effet Early,
 *     pas de capacités, pas de claquage
 *   - LM358P (2 amplis) : gain ouvert fini, résistance de sortie, saturation aux rails
 *     (VCC+ − headroom / VCC- + 20 mV) ; pas de bande passante ni de slew-rate ; le courant
 *     d'alimentation n'est pas modélisé ; sans alimentation (< 2 V) la sortie est en haute impédance
 *   - ARDUINO : GND = référence, 5V = source 5 V (1 Ω), D0–D13 pilotées (Thévenin 25 Ω)
 *     par une fonction `drive(uid, pin, t)` qui permet de reproduire un PWM exact
 *   - Ampèremètres de sonde : source de tension 0 V insérée en série entre deux contacts
 *
 * Tout autre type est signalé dans `unqualifiedTypes` et ignoré (aucun résultat inventé).
 * Précision : erreur en O(dt) ; choisir dt ≪ constante de temps.
 */

export const TRANSIENT_ARDUINO_OUTPUT_OHMS = 25
export const TRANSIENT_ARDUINO_SUPPLY_OHMS = 1
export const ARDUINO_LOGIC_HIGH_VOLTS = 5

const GMIN = 1e-12
const MAX_ITERATIONS = 60
const MAX_ADVANCE_STEPS = 1_000_000
const BJT = Object.freeze({ beta: 100, vbe: 0.7, rbe: 10, vceSat: 0.2, rSat: 1 })
const OPAMP = Object.freeze({ rOut: 50, lowHeadroom: 0.02, minSupply: 2 })
const MODELED = new Set([
  "RESISTOR", "POTENTIOMETER", "LED", "DIODE", "CAPACITOR", "POLARIZED_CAPACITOR", "INDUCTOR",
  "NPN_TRANSISTOR", "PNP_TRANSISTOR", "LM358P", "ARDUINO",
  "POWER", "BATTERY_9V", "BATTERY_AA", "COIN_CELL_CR2032",
  "BUTTON", "BUTTON_LATCHING", "SLIDE_SWITCH", "DIP_SWITCH",
])

export const WAVEFORMS = Object.freeze(["dc", "sine", "square", "triangle"])
const VALIDATED_COMPONENT_TYPES = new Set([
  "POWER", "BATTERY_AA", "COIN_CELL_CR2032", "BATTERY_9V", "RESISTOR", "DIODE",
  "CAPACITOR", "POLARIZED_CAPACITOR", "POTENTIOMETER", "INDUCTOR",
  "NPN_TRANSISTOR", "PNP_TRANSISTOR", "LM358P",
])

function positiveParameter(params, key, fallback, uid) {
  const value = params[key]
  if (value === undefined) return fallback
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${uid}: ${key} must be a finite number greater than zero`)
  }
  return value
}

function nonnegativeParameter(params, key, fallback, uid) {
  const value = params[key]
  if (value === undefined) return fallback
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${uid}: ${key} must be a finite non-negative number`)
  }
  return value
}

function getComponentParameters(component) {
  const params = component.parameters ?? {}
  if (typeof params !== "object" || Array.isArray(params)) {
    throw new TypeError(`${component.uid}: parameters must be an object`)
  }
  if (!VALIDATED_COMPONENT_TYPES.has(component.type)) return params

  const validation = validateComponentParameters(component.type, params)
  if (!validation.valid) {
    throw new RangeError(`${component.uid}: invalid ${component.type} parameters: ${validation.errors.join("; ")}`)
  }
  return resolveComponentParameters(component.type, params)
}

function normalizeInitialConditions(input) {
  if (input === undefined) return { time: 0, capacitorVoltages: {}, inductorCurrents: {} }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("initialConditions must be an object")
  }
  const result = { time: input.time ?? 0, capacitorVoltages: {}, inductorCurrents: {} }
  if (!Number.isFinite(result.time) || result.time < 0) {
    throw new RangeError("initialConditions.time must be finite and non-negative")
  }
  for (const [field, label] of [["capacitorVoltages", "capacitor voltage"], ["inductorCurrents", "inductor current"]]) {
    const values = input[field] ?? {}
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new TypeError(`initialConditions.${field} must be an object keyed by component uid`)
    }
    for (const [uid, value] of Object.entries(values)) {
      if (!Number.isFinite(value)) throw new RangeError(`initial ${label} for ${uid} must be finite`)
      result[field][uid] = value
    }
  }
  return result
}

function validateGenerator(generator, index) {
  const label = `generators[${index}]`
  if (!generator || typeof generator !== "object" || Array.isArray(generator)) {
    throw new TypeError(`${label} must be an object`)
  }
  if (typeof generator.id !== "string" || generator.id.length === 0) {
    throw new TypeError(`${label}.id must be a non-empty string`)
  }
  if (!generator.plus || typeof generator.plus.uid !== "string" || typeof generator.plus.pin !== "string") {
    throw new TypeError(`${label}.plus must identify a component uid and pin`)
  }
  if (generator.minus !== undefined && generator.minus !== null
    && (typeof generator.minus.uid !== "string" || typeof generator.minus.pin !== "string")) {
    throw new TypeError(`${label}.minus must be null or identify a component uid and pin`)
  }
  if (!WAVEFORMS.includes(generator.waveform)) {
    throw new RangeError(`${label}.waveform must be one of: ${WAVEFORMS.join(", ")}`)
  }
  if (typeof generator.amplitude !== "number" || !Number.isFinite(generator.amplitude) || generator.amplitude < 0) {
    throw new RangeError(`${label}.amplitude must be finite and non-negative`)
  }
  if (!Number.isFinite(generator.offset)) {
    throw new RangeError(`${label}.offset must be finite`)
  }
  if (typeof generator.frequencyHz !== "number" || !Number.isFinite(generator.frequencyHz) || generator.frequencyHz <= 0) {
    throw new RangeError(`${label}.frequencyHz must be finite and greater than zero`)
  }
  if (generator.waveform === "square"
    && (!Number.isFinite(generator.duty) || generator.duty <= 0 || generator.duty >= 1)) {
    throw new RangeError(`${label}.duty must be greater than zero and less than one for a square wave`)
  }
}

/** Valeur instantanée (V) d'un générateur à l'instant t (s). */
export function waveformValue(gen, t) {
  if (!gen || typeof gen !== "object" || Array.isArray(gen)) throw new TypeError("generator must be an object")
  if (!Number.isFinite(t) || t < 0) throw new RangeError("waveform time must be finite and non-negative")
  const amp = gen.amplitude ?? 0
  const off = gen.offset ?? 0
  if (!Number.isFinite(amp) || amp < 0) throw new RangeError("generator amplitude must be finite and non-negative")
  if (!Number.isFinite(off)) throw new RangeError("generator offset must be finite")
  const f = gen.frequencyHz ?? 1
  if (!Number.isFinite(f) || f <= 0 || !Number.isFinite(t * f)) {
    throw new RangeError("generator frequency and time must produce a finite positive phase")
  }
  const phase = (t * f) % 1
  switch (gen.waveform) {
    case "sine": return off + amp * Math.sin(2 * Math.PI * t * f)
    case "square": {
      const duty = gen.duty ?? 0.5
      if (!Number.isFinite(duty) || duty <= 0 || duty >= 1) throw new RangeError("square-wave duty must be greater than zero and less than one")
      return off + (phase < duty ? amp : -amp)
    }
    case "triangle": return off + amp * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase)
    case "dc": return off
    default: throw new RangeError(`unsupported waveform: ${String(gen.waveform)}`)
  }
}

function buildElements(components, prepared, generators, ammeters, initialConditions) {
  const { uf } = prepared
  const node = (uid, pin) => uf.find(uf.key(uid, pin))
  const elements = []
  const unqualified = new Set()
  const sourceNets = new Set()
  for (const comp of components) {
    const src = getDcSource(comp)
    if (src) { sourceNets.add(node(comp.uid, src.positivePin)); sourceNets.add(node(comp.uid, src.negativePin)) }
  }
  for (const comp of components) {
    const { uid, type } = comp
    const params = getComponentParameters(comp)
    const src = getDcSource({ ...comp, parameters: params })
    if (src) {
      elements.push({ kind: "V", uid, p: node(uid, src.positivePin), n: node(uid, src.negativePin), v: src.voltage })
    } else if (type === "RESISTOR") {
      elements.push({ kind: "R", uid, seg: "A-B", a: node(uid, "A"), b: node(uid, "B"), r: positiveParameter(params, "resistance", 220, uid) })
    } else if (type === "POTENTIOMETER") {
      const total = positiveParameter(params, "resistance", 10000, uid)
      const pos = params.position ?? 0.5
      if (!Number.isFinite(pos) || pos < 0 || pos > 1) throw new RangeError(`${uid}: position must be between zero and one`)
      elements.push({ kind: "R", uid, seg: "left-wiper", a: node(uid, "left"), b: node(uid, "wiper"), r: Math.max(0.001, total * pos) })
      elements.push({ kind: "R", uid, seg: "wiper-right", a: node(uid, "wiper"), b: node(uid, "right"), r: Math.max(0.001, total * (1 - pos)) })
    } else if (type === "CAPACITOR" || type === "POLARIZED_CAPACITOR") {
      const [pa, pb] = type === "CAPACITOR" ? ["pinA", "pinB"] : ["plus", "minus"]
      elements.push({
        kind: "C", uid, seg: "pinA-pinB", a: node(uid, pa), b: node(uid, pb),
        c: positiveParameter(params, "capacitance", type === "CAPACITOR" ? 1e-7 : 1e-4, uid),
        v: initialConditions.capacitorVoltages[uid] ?? 0, i: 0,
      })
    } else if (type === "INDUCTOR") {
      elements.push({
        kind: "L", uid, seg: "A-B", a: node(uid, "A"), b: node(uid, "B"),
        l: positiveParameter(params, "inductance", 1e-3, uid),
        i: initialConditions.inductorCurrents[uid] ?? 0, v: 0,
      })
    } else if (type === "LED" || type === "DIODE") {
      const led = type === "LED"
      elements.push({
        kind: "D", uid, seg: "anode-cathode", led, on: false,
        a: node(uid, "anode"), b: node(uid, "cathode"),
        vf: nonnegativeParameter(params, "forwardVoltage", led ? 2.0 : 0.7, uid),
        ron: positiveParameter(params, "onResistance", 10, uid), i: 0, v: 0,
      })
    } else if (type === "NPN_TRANSISTOR" || type === "PNP_TRANSISTOR") {
      const c = node(uid, "collector"), b = node(uid, "base"), e = node(uid, "emitter")
      const npn = type === "NPN_TRANSISTOR"
      elements.push({
        kind: "Q", uid, mode: "off", npn, c, b, e,
        ja: npn ? b : e, jb: npn ? e : b, pa: npn ? c : e, pb: npn ? e : c, ic: 0, ib: 0, vj: 0, vpath: 0,
        rSat: positiveParameter(params, "onResistance", BJT.rSat, uid),
      })
    } else if (type === "LM358P") {
      const gain = positiveParameter(params, "openLoopGain", 1e5, uid)
      const headroom = nonnegativeParameter(params, "outputHighHeadroom", 1.5, uid)
      for (const ch of [1, 2]) {
        elements.push({
          kind: "O", uid, ch, mode: "off", gain, headroom,
          out: node(uid, `${ch}OUT`), p: node(uid, `${ch}IN+`), n: node(uid, `${ch}IN-`),
          vccp: node(uid, "VCC+"), vccn: node(uid, "VCC-"), vth: 0,
        })
      }
    } else if (type === "ARDUINO") {
      const gnd = node(uid, "GND")
      const five = node(uid, "5V")
      if (!sourceNets.has(five)) elements.push({ kind: "S", uid, pin: "5V", p: five, n: gnd, v: ARDUINO_LOGIC_HIGH_VOLTS, r: TRANSIENT_ARDUINO_SUPPLY_OHMS })
      for (let i = 0; i <= 13; i++) {
        const pin = `D${i}`
        const n = node(uid, pin)
        if (!sourceNets.has(n)) elements.push({ kind: "T", uid, pin, p: n, n: gnd, r: TRANSIENT_ARDUINO_OUTPUT_OHMS, active: false, v: 0 })
      }
    } else if (!MODELED.has(type)) {
      unqualified.add(type)
    }
  }
  for (const g of generators) {
    if (!g?.plus) continue
    const p = node(g.plus.uid, g.plus.pin)
    const n = g.minus ? node(g.minus.uid, g.minus.pin) : null
    elements.push({ kind: "G", uid: g.id, id: g.id, gen: g, p, n, hasMinus: Boolean(g.minus), v: 0, i: 0 })
  }
  for (const m of ammeters) {
    if (!m?.a || !m?.b) continue
    elements.push({ kind: "A", uid: m.id, id: m.id, p: node(m.a.uid, m.a.pin), n: node(m.b.uid, m.b.pin), v: 0, i: 0 })
  }
  return { elements, unqualifiedTypes: [...unqualified].sort() }
}

const endpoints = (e) => {
  switch (e.kind) {
    case "V": case "S": case "T": case "A": return [e.p, e.n]
    case "G": return e.n === null ? [e.p] : [e.p, e.n]
    case "Q": return [e.c, e.b, e.e]
    case "O": return [e.out, e.p, e.n, e.vccp, e.vccn]
    default: return [e.a, e.b]
  }
}

function buildIslands(elements, groundNodes) {
  const parent = new Map()
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x)
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)
    parent.set(x, r)
    return r
  }
  for (const e of elements) {
    const pts = endpoints(e)
    for (const pt of pts) find(pt)
    for (let i = 1; i < pts.length; i++) parent.set(find(pts[i]), find(pts[0]))
  }
  const map = new Map()
  for (const e of elements) {
    const root = find(endpoints(e)[0])
    if (!map.has(root)) map.set(root, { nodes: new Set(), elements: [] })
    const isl = map.get(root)
    isl.elements.push(e)
    for (const pt of endpoints(e)) isl.nodes.add(pt)
  }
  return [...map.values()].map((isl) => {
    const nodes = [...isl.nodes]
    const generatorMinus = isl.elements.find((e) => e.kind === "G" && e.n !== null)?.n
    const ref = nodes.find((n) => groundNodes.has(n))
      ?? isl.elements.find((e) => e.kind === "V")?.n
      ?? generatorMinus
    return { nodes, elements: isl.elements, ref }
  })
}

/**
 * @param {Array} components composants au format moteur
 * @param {Array} wires fils au format moteur
 * @param {{
 *   generators?: object[],
 *   ammeters?: object[],
 *   drive?: (uid:string, pin:string, t:number)=>number|null,
 *   initialConditions?: { time?: number, capacitorVoltages?: Record<string,number>, inductorCurrents?: Record<string,number> }
 * }} [options]
 *   drive : retourne un niveau 0..1 (0 = LOW, 1 = HIGH, valeur intermédiaire = moyenne PWM sur le pas)
 *   ou null (haute impédance) pour une broche D0–D13 d'un Arduino.
 *   Les conditions initiales sont indexées par UID ; tout état non fourni vaut zéro.
 */
export function createTransientSession(components, wires, options = {}) {
  const generators = options.generators ?? []
  const ammeters = options.ammeters ?? []
  const drive = options.drive ?? (() => null)
  if (!Array.isArray(components) || !Array.isArray(wires)) {
    throw new TypeError("components and wires must be arrays")
  }
  if (!Array.isArray(generators) || !Array.isArray(ammeters)) {
    throw new TypeError("generators and ammeters must be arrays")
  }
  if (typeof drive !== "function") throw new TypeError("drive must be a function")
  generators.forEach(validateGenerator)
  const initialConditions = normalizeInitialConditions(options.initialConditions)
  const prepared = prepareCircuit(components, wires)
  const { uf } = prepared
  const { elements, unqualifiedTypes } = buildElements(components, prepared, generators, ammeters, initialConditions)

  const groundNodes = new Set()
  for (const comp of components) for (const pin of getGroundReferencePins(comp.type)) groundNodes.add(uf.find(uf.key(comp.uid, pin)))
  const islands = buildIslands(elements, groundNodes)

  const state = {
    time: initialConditions.time,
    nodeVoltage: new Map(),
    status: islands.length === 0 ? "NO_ELEMENTS" : "OK",
    nonConverged: 0,
    results: new Map(),
    generatorResults: new Map(),
    ammeterResults: new Map(),
  }

  function stepIsland(island, tEnd, dt) {
    const { nodes, ref } = island
    const unknown = nodes.filter((n) => n !== ref)
    const index = new Map(unknown.map((n, i) => [n, i]))
    const branches = island.elements.filter((e) => e.kind === "V" || e.kind === "G" || e.kind === "A")
    const size = unknown.length + branches.length
    const idx = (n) => (n === null || n === ref ? undefined : index.get(n))

    for (const e of island.elements) if (e.kind === "T") { const level = drive(e.uid, e.pin, tEnd); e.active = Number.isFinite(level) && level >= 0 && level <= 1; e.v = e.active ? level * ARDUINO_LOGIC_HIGH_VOLTS : 0 }
    for (const e of branches) if (e.kind === "G") e.v = waveformValue(e.gen, tEnd)

    let solution = null
    let converged = false
    const voltOf = (n) => (n === null || n === ref ? 0 : solution[index.get(n)])
    for (let it = 0; it < MAX_ITERATIONS; it++) {
      const m = Array.from({ length: size }, () => new Array(size).fill(0))
      const rhs = new Array(size).fill(0)
      const add = (rn, cn, val) => { const r = idx(rn); const c = idx(cn); if (r !== undefined && c !== undefined) m[r][c] += val }
      const inject = (n, i) => { const r = idx(n); if (r !== undefined) rhs[r] += i }
      const conductance = (a, b, g) => { add(a, a, g); add(b, b, g); add(a, b, -g); add(b, a, -g) }
      for (const n of unknown) add(n, n, GMIN)
      for (const e of island.elements) {
        switch (e.kind) {
          case "R": conductance(e.a, e.b, 1 / e.r); break
          case "S": { const g = 1 / e.r; conductance(e.p, e.n, g); inject(e.p, g * e.v); inject(e.n, -g * e.v); break }
          case "T": if (e.active) { const g = 1 / e.r; conductance(e.p, e.n, g); inject(e.p, g * e.v); inject(e.n, -g * e.v) } break
          case "C": { const g = e.c / dt; conductance(e.a, e.b, g); inject(e.a, g * e.v); inject(e.b, -g * e.v); break }
          case "L": { const g = dt / e.l; conductance(e.a, e.b, g); inject(e.a, -e.i); inject(e.b, e.i); break }
          case "D": if (e.on) { const g = 1 / e.ron; conductance(e.a, e.b, g); inject(e.a, g * e.vf); inject(e.b, -g * e.vf) } break
          case "Q": {
            if (e.mode === "off") break
            const g = 1 / BJT.rbe
            conductance(e.ja, e.jb, g); inject(e.ja, g * BJT.vbe); inject(e.jb, -g * BJT.vbe)
            if (e.mode === "active") {
              const gm = BJT.beta / BJT.rbe
              add(e.pa, e.ja, gm); add(e.pa, e.jb, -gm); add(e.pb, e.ja, -gm); add(e.pb, e.jb, gm)
              inject(e.pa, gm * BJT.vbe); inject(e.pb, -gm * BJT.vbe)
            } else {
              const gs = 1 / e.rSat
              conductance(e.pa, e.pb, gs); inject(e.pa, gs * BJT.vceSat); inject(e.pb, -gs * BJT.vceSat)
            }
            break
          }
          case "O": {
            if (e.mode === "off") break
            const g = 1 / OPAMP.rOut
            add(e.out, e.out, g)
            if (e.mode === "lin") { add(e.out, e.p, -g * e.gain); add(e.out, e.n, g * e.gain) }
            else if (e.mode === "high") { add(e.out, e.vccp, -g); inject(e.out, -g * e.headroom) }
            else { add(e.out, e.vccn, -g); inject(e.out, g * OPAMP.lowHeadroom) }
            break
          }
          default: break
        }
      }
      branches.forEach((s, k) => {
        const row = unknown.length + k
        const ip = idx(s.p); const in_ = idx(s.n)
        if (ip !== undefined) { m[ip][row] += 1; m[row][ip] += 1 }
        if (in_ !== undefined) { m[in_][row] -= 1; m[row][in_] -= 1 }
        rhs[row] = s.v
      })
      solution = solveLinear(m, rhs)
      if (!solution) return "SHORT_CIRCUIT"

      let changed = false
      for (const e of island.elements) {
        if (e.kind === "D") {
          const on = voltOf(e.a) - voltOf(e.b) > e.vf
          if (on !== e.on) { e.on = on; changed = true }
        } else if (e.kind === "Q") {
          const vj = voltOf(e.ja) - voltOf(e.jb)
          const vpath = voltOf(e.pa) - voltOf(e.pb)
          let next = e.mode
          if (e.mode === "off") { if (vj > BJT.vbe) next = "active" }
          else if (vj <= BJT.vbe) next = "off"
          else if (e.mode === "active") { if (vpath < BJT.vceSat) next = "sat" }
          else if ((vpath - BJT.vceSat) / e.rSat > (BJT.beta * (vj - BJT.vbe)) / BJT.rbe) next = "active"
          if (next !== e.mode) { e.mode = next; changed = true }
        } else if (e.kind === "O") {
          const supply = voltOf(e.vccp) - voltOf(e.vccn)
          const vth = e.gain * (voltOf(e.p) - voltOf(e.n))
          const high = voltOf(e.vccp) - e.headroom
          const low = voltOf(e.vccn) + OPAMP.lowHeadroom
          let next = e.mode
          if (supply < OPAMP.minSupply) next = "off"
          else if (e.mode === "off") next = "lin"
          else if (e.mode === "lin") {
            const vo = voltOf(e.out)
            if (vo > high) next = "high"
            else if (vo < low) next = "low"
          } else if (e.mode === "high") { if (vth < high) next = "lin" }
          else if (vth > low) next = "lin"
          if (next !== e.mode) { e.mode = next; changed = true }
        }
      }
      if (!changed) { converged = true; break }
    }
    if (!converged) state.nonConverged += 1

    // Mise à jour de l'état dynamique et des résultats.
    const reached = reachable(island, voltOf)
    for (const n of nodes) state.nodeVoltage.set(n, reached.has(n) ? voltOf(n) : null)
    const rec = (uid, entry) => { const list = state.results.get(uid) ?? []; list.push(entry); state.results.set(uid, list) }
    for (const e of island.elements) {
      switch (e.kind) {
        case "R": { const v = voltOf(e.a) - voltOf(e.b); rec(e.uid, { segment: e.seg, voltage: v, current: v / e.r }); break }
        case "C": { const v = voltOf(e.a) - voltOf(e.b); e.i = (e.c / dt) * (v - e.v); e.v = v; rec(e.uid, { segment: e.seg, voltage: v, current: e.i }); break }
        case "L": { const v = voltOf(e.a) - voltOf(e.b); e.i += (dt / e.l) * v; e.v = v; rec(e.uid, { segment: e.seg, voltage: v, current: e.i }); break }
        case "D": {
          const v = voltOf(e.a) - voltOf(e.b)
          const i = e.on ? Math.max(0, (v - e.vf) / e.ron) : 0
          e.i = i; e.v = v
          rec(e.uid, { segment: e.seg, voltage: v, current: i, on: i > 1e-9 })
          break
        }
        case "Q": {
          e.vj = voltOf(e.ja) - voltOf(e.jb); e.vpath = voltOf(e.pa) - voltOf(e.pb)
          e.ib = e.mode === "off" ? 0 : (e.vj - BJT.vbe) / BJT.rbe
          e.ic = e.mode === "off" ? 0 : e.mode === "active" ? BJT.beta * e.ib : (e.vpath - BJT.vceSat) / e.rSat
          rec(e.uid, { segment: "collector-emitter", voltage: e.vpath, current: e.ic, base: e.ib, mode: e.mode })
          break
        }
        case "O": rec(e.uid, { segment: `ampli-${e.ch}`, voltage: voltOf(e.out), current: null, mode: e.mode }); break
        default: break
      }
    }
    branches.forEach((s, k) => {
      const through = solution[unknown.length + k]
      if (s.kind === "V") rec(s.uid, { segment: "source", voltage: s.v, current: -through })
      else if (s.kind === "G") state.generatorResults.set(s.id, { voltage: s.v, current: -through })
      else s.i = through
    })
    for (const s of branches) if (s.kind === "A") state.ammeterResults.set(s.id, { current: s.i, voltage: 0 })
    return converged ? "OK" : "NON_CONVERGED"
  }

  function reachable(island, voltOf) {
    const adj = new Map(island.nodes.map((n) => [n, []]))
    const link = (a, b) => { if (a === null || b === null || !adj.has(a) || !adj.has(b)) return; adj.get(a).push(b); adj.get(b).push(a) }
    for (const e of island.elements) {
      switch (e.kind) {
        case "D": if (e.on) link(e.a, e.b); break
        case "Q": if (e.mode !== "off") { link(e.ja, e.jb); link(e.pa, e.pb) } break
        case "O": if (e.mode !== "off") link(e.out, island.ref); break
        case "T": if (e.active) link(e.p, e.n); break
        case "G": link(e.p, e.n ?? island.ref); break
        case "V": case "S": case "A": link(e.p, e.n); break
        default: if (e.a !== undefined) link(e.a, e.b)
      }
    }
    void voltOf
    const seen = new Set([island.ref])
    const queue = [island.ref]
    while (queue.length) for (const nb of adj.get(queue.pop()) ?? []) if (!seen.has(nb)) { seen.add(nb); queue.push(nb) }
    return seen
  }

  const keyOf = (uid, pin) => uf.find(uf.key(uid, pin))
  const session = {
    unqualifiedTypes,
    get time() { return state.time },
    get status() { return state.status },
    get nonConverged() { return state.nonConverged },
    getInitialConditions() {
      return {
        time: state.time,
        capacitorVoltages: Object.fromEntries(elements.filter((e) => e.kind === "C").map((e) => [e.uid, e.v])),
        inductorCurrents: Object.fromEntries(elements.filter((e) => e.kind === "L").map((e) => [e.uid, e.i])),
      }
    },
    /** Avance d'un pas de simulation de `dt` secondes. */
    step(dt) {
      if (!Number.isFinite(dt) || dt <= 0) throw new RangeError("dt must be finite and greater than zero")
      const tEnd = state.time + dt
      if (!Number.isFinite(tEnd)) throw new RangeError("simulation time overflow")
      state.results = new Map()
      let shorted = false
      let noRef = false
      let nonConverged = false
      for (const island of islands) {
        if (island.ref === undefined) { noRef = true; continue }
        const result = stepIsland(island, tEnd, dt)
        if (result === "SHORT_CIRCUIT") shorted = true
        if (result === "NON_CONVERGED") nonConverged = true
      }
      state.status = shorted ? "SHORT_CIRCUIT" : noRef ? "NO_REFERENCE" : nonConverged ? "NON_CONVERGED" : "OK"
      state.time = tEnd
      return state.status
    },
    /** Avance de `total` secondes par pas d'au plus `dtMax`. */
    advance(total, dtMax) {
      if (!Number.isFinite(total) || total < 0) throw new RangeError("total must be finite and non-negative")
      if (!Number.isFinite(dtMax) || dtMax <= 0) throw new RangeError("dtMax must be finite and greater than zero")
      if (total === 0) return state.status
      const n = Math.max(1, Math.ceil(total / dtMax - 1e-9))
      if (!Number.isSafeInteger(n) || n > MAX_ADVANCE_STEPS) {
        throw new RangeError(`advance would require more than ${MAX_ADVANCE_STEPS} steps`)
      }
      const dt = total / n
      for (let i = 0; i < n; i++) session.step(dt)
      return state.status
    },
    pinVoltage(uid, pin) {
      const v = state.nodeVoltage.get(keyOf(uid, pin))
      return v === undefined ? null : v
    },
    voltageBetween(a, b) {
      const va = session.pinVoltage(a.uid, a.pin)
      const vb = session.pinVoltage(b.uid, b.pin)
      return va === null || vb === null ? null : va - vb
    },
    elementSegments: (uid) => state.results.get(uid) ?? [],
    elementCurrent(uid, segment) {
      const list = state.results.get(uid)
      if (!list) return null
      return (segment ? list.find((r) => r.segment === segment) : list[0])?.current ?? null
    },
    generator: (id) => state.generatorResults.get(id) ?? null,
    /** Lecture d'un ampèremètre inséré : valide seulement si ses deux bornes sont sur deux nets distincts et reliés au circuit. */
    ammeter(id) {
      const meter = ammeters.find((m) => m.id === id)
      if (!meter) return { valid: false, reason: "UNKNOWN_METER", current: null }
      const na = keyOf(meter.a.uid, meter.a.pin)
      const nb = keyOf(meter.b.uid, meter.b.pin)
      if (na === nb) return { valid: false, reason: "SAME_NET", current: null }
      const result = state.ammeterResults.get(id)
      if (!result) return { valid: false, reason: "NOT_SOLVED", current: null }
      const keyCount = (n) => (prepared.allKeys ?? []).filter((k) => uf.find(k) === n).length
      const dangling = keyCount(na) <= 1 || keyCount(nb) <= 1
      if (dangling && Math.abs(result.current) < 1e-9) return { valid: false, reason: "OPEN_TERMINAL", current: null }
      return { valid: true, reason: null, current: result.current }
    },
  }
  return session
}
