import { resolveComponentParameters } from "./resolveComponentParameters.js"
import { netIdentities } from "./resolution.js"

/**
 * A11-COMP4-PREQ5 — Generic resistive-drive context for transient storage.
 *
 *   physical topology (prepared, read only)
 *   + numeric voltage authorities (DC-source facts, step voltage outputs)
 *   + eligible resistive edges (Registry capability `getResistiveEdge`)
 *   + optional ideal conduction pairs of the step (mixed-signal effects)
 *     -> for a requested storage terminal pair (positive, reference)
 *     -> { targetVoltage, equivalentResistance, reference } | null
 *
 * This is NOT an electrical resolution : no resolveSignals(), no passive
 * propagation, no nodal/KCL/MNA solve, no time, no state, no mutation. It is a
 * bounded local reduction : from each storage terminal, the walk follows the
 * UNIQUE resistive chain to a net carrying a numeric authority, summing the
 * series resistances. Any branching (parallel, divider, bridge, mesh), dead
 * end, loop, conflicting or unresolved authority, unknown attachment on an
 * internal node, or authorities of different reference domains yields null :
 * never an invented voltage, never 0 V by default.
 *
 * Step conduction joins physical nets for this computation only (local
 * contraction) : prepared.uf / prepared.nets are never mutated.
 */

/**
 * Admissible resistive edges of the circuit, through the Registry capability
 * only. The resistance is the EFFECTIVE instance parameter ; a non-number,
 * non-finite or non-positive value makes the edge inadmissible (left out, so
 * its pins remain unknown attachments for the walk — never an open circuit by
 * assumption).
 *
 * @param {Array<{ uid, type, parameters? }>} components
 * @param {{ uf }} prepared read only (key format only).
 * @param {(type: string) => { terminalAPinId: string, terminalBPinId: string, resistanceParameter: string } | null} getResistiveEdge
 * @returns {ReadonlyArray<Readonly<{ uid: string, keyA: string, keyB: string, resistance: number }>>}
 */
export function collectResistiveEdges(components, prepared, getResistiveEdge) {
  const edges = []
  for (const comp of [...(components || [])].filter((c) => c && typeof c.uid === "string").sort((a, b) => a.uid.localeCompare(b.uid))) {
    const edge = getResistiveEdge(comp.type)
    if (!edge) continue
    const resistance = resolveComponentParameters(comp.type, comp.parameters)[edge.resistanceParameter]
    if (typeof resistance !== "number" || !Number.isFinite(resistance) || resistance <= 0) continue
    edges.push(Object.freeze({
      uid: comp.uid,
      keyA: prepared.uf.key(comp.uid, edge.terminalAPinId),
      keyB: prepared.uf.key(comp.uid, edge.terminalBPinId),
      resistance,
    }))
  }
  return Object.freeze(edges)
}

/**
 * Pin voltage facts of the step's numeric voltage outputs, with the SAME rule
 * as the one resolution : the output's reference pin must carry a 0 V DC-source
 * fact, and the value must be a finite, non-negative number ; otherwise the
 * output pin is reserved unresolved (null). Composed with the DC-source facts
 * (new Map, inputs untouched).
 *
 * @param {Map<string, { voltage: number, reference: string } | null>} sourceVoltageFacts key "uid:pinId"
 * @param {ReadonlyArray<{ uid: string, pinId: string, referencePin: string, voltage: number | null }>} voltageOutputs
 * @param {{ uf }} prepared read only (key format only).
 * @returns {Array<[string, { voltage: number, reference: string } | null]>} pin facts, source facts first.
 */
export function composeDriveVoltageFacts(sourceVoltageFacts, voltageOutputs, prepared) {
  const facts = [...sourceVoltageFacts]
  for (const { uid, pinId, referencePin, voltage } of voltageOutputs || []) {
    const reference = sourceVoltageFacts.get(prepared.uf.key(uid, referencePin))
    const valid = !!reference && reference.voltage === 0
      && typeof voltage === "number" && Number.isFinite(voltage) && voltage >= 0
    facts.push([prepared.uf.key(uid, pinId), valid ? { voltage, reference: reference.reference } : null])
  }
  return facts
}

/**
 * Builds the read-only effective network of the step once (shared by every
 * storage component of the step).
 *
 * @param {{
 *   prepared: { uf, nets, allKeys },
 *   voltageFacts: Iterable<[string, { voltage: number, reference: string } | null]>,
 *   resistiveEdges: ReadonlyArray<{ keyA: string, keyB: string, resistance: number }>,
 *   conductionPairs?: ReadonlyArray<{ uid: string, pinA: string, pinB: string }>,
 *   highImpedanceKeys?: Set<string>,
 * }} input
 */
export function createResistiveDriveNetwork({ prepared, voltageFacts, resistiveEdges, conductionPairs = [], highImpedanceKeys = new Set() }) {
  const physical = netIdentities(prepared.nets)
  // Local contraction of the nets joined by ideal step conduction (smallest id wins).
  const root = new Map()
  const find = (net) => {
    while (root.has(net) && root.get(net) !== net) net = root.get(net)
    return net
  }
  for (const { uid, pinA, pinB } of conductionPairs) {
    const a = physical.get(prepared.uf.key(uid, pinA))
    const b = physical.get(prepared.uf.key(uid, pinB))
    if (a === undefined || b === undefined) continue
    const [ra, rb] = [find(a), find(b)].sort()
    if (ra !== rb) root.set(rb, ra)
  }
  const netOf = (key) => {
    const net = physical.get(key)
    return net === undefined ? undefined : find(net)
  }

  const members = new Map()
  for (const key of prepared.allKeys) {
    const net = netOf(key)
    if (net !== undefined) members.set(net, [...(members.get(net) ?? []), key])
  }
  // Authorities by effective net : agreeing facts are kept, disagreeing (or null) make the net null.
  const authorities = new Map()
  for (const [key, fact] of voltageFacts) {
    const net = netOf(key)
    if (net === undefined) continue
    if (!authorities.has(net)) authorities.set(net, fact)
    else if (!sameFact(authorities.get(net), fact)) authorities.set(net, null)
  }
  const edgeByKey = new Map()
  for (const edge of resistiveEdges) {
    edgeByKey.set(edge.keyA, edge)
    edgeByKey.set(edge.keyB, edge)
  }
  return Object.freeze({ netOf, members, authorities, edgeByKey, highImpedanceKeys, bound: members.size + 1 })
}

/**
 * Drive context of a storage element between two of its pin keys.
 *
 * @param {ReturnType<typeof createResistiveDriveNetwork>} network
 * @param {string} positiveKey
 * @param {string} referenceKey
 * @returns {Readonly<{ targetVoltage: number, equivalentResistance: number, reference: string }> | null}
 *   `targetVoltage` : volts of `positiveKey` relative to `referenceKey` that the
 *   drive network imposes at equilibrium ; `equivalentResistance` : ohms of the
 *   unique series chain (> 0) ; `reference` : `referenceKey`.
 */
export function resolveResistiveDriveContext(network, positiveKey, referenceKey) {
  const positiveNet = network.netOf(positiveKey)
  const referenceNet = network.netOf(referenceKey)
  if (positiveNet === undefined || referenceNet === undefined || positiveNet === referenceNet) return null
  const positive = walkToAuthority(network, positiveKey)
  const reference = walkToAuthority(network, referenceKey)
  if (!positive || !reference || positive.fact.reference !== reference.fact.reference) return null
  const equivalentResistance = positive.resistance + reference.resistance
  const targetVoltage = positive.fact.voltage - reference.fact.voltage
  if (!Number.isFinite(equivalentResistance) || equivalentResistance <= 0 || !Number.isFinite(targetVoltage)) return null
  return Object.freeze({ targetVoltage, equivalentResistance, reference: referenceKey })
}

/**
 * Follows the unique series chain from `startKey` to the first net carrying an
 * authority. Every other pin of a traversed (non-authority) net must be a
 * resistive edge terminal or a declared high-impedance pin ; a resistor with
 * both terminals on the same net carries no current and is transparent.
 *
 * @returns {{ fact: { voltage: number, reference: string }, resistance: number } | null}
 */
function walkToAuthority(network, startKey) {
  let net = network.netOf(startKey)
  let arrivedKey = startKey
  let resistance = 0
  const visited = new Set()
  for (let hop = 0; hop <= network.bound; hop++) {
    if (network.authorities.has(net)) {
      const fact = network.authorities.get(net)
      return fact ? { fact, resistance } : null
    }
    visited.add(net)
    const exits = []
    for (const key of network.members.get(net) ?? []) {
      if (key === arrivedKey) continue
      const edge = network.edgeByKey.get(key)
      if (edge) {
        const otherKey = edge.keyA === key ? edge.keyB : edge.keyA
        const otherNet = network.netOf(otherKey)
        if (otherNet === net) continue
        exits.push({ edge, otherKey, otherNet })
      } else if (!network.highImpedanceKeys.has(key)) {
        return null
      }
    }
    if (exits.length !== 1) return null
    const [{ edge, otherKey, otherNet }] = exits
    if (otherNet === undefined || visited.has(otherNet)) return null
    resistance += edge.resistance
    arrivedKey = otherKey
    net = otherNet
  }
  return null
}

function sameFact(a, b) {
  return a === b || (!!a && !!b && a.voltage === b.voltage && a.reference === b.reference)
}
