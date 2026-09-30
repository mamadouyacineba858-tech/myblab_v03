import { getCanonicalEntry } from "./canonicalRegistry.js"
import { resolveComponentParameters } from "./resolveComponentParameters.js"
import { netIdentities } from "./resolution.js"

/**
 * A11-COMP4-PREQ4 — Transient electrical fact -> mixed-signal sample bridge.
 *
 *   electricalTransientStates[n-1]
 *     -> transient Registry observers (owner-only knowledge of the private state)
 *     -> immutable transient voltage facts (validated, per component)
 *     -> projection on the prepared physical nets (read only)
 *     -> composed with the DC-source facts
 *     -> sample voltage facts of the mixed-signal SAMPLE[n]
 *
 * This is not an electrical resolution : no resolveSignals(), no passive
 * propagation, no model law, no nodal solve. It only projects states already
 * committed by the previous step onto the existing topology. The private state
 * store is read here and handed to its owner's observer only ; it never reaches
 * a mixed-signal contributor, and nothing here reads a field of a state.
 */

/**
 * Collects the observable voltage facts of the transient contributors from
 * their committed states. A type without observer, or a component without a
 * committed state, exposes nothing. Contract violations throw explicitly.
 *
 * @param {Array<{ uid, type, parameters? }>} transientComponents
 * @param {{ getTransientObservation?: (type: string) => Function | null }} transientRegistry
 * @param {Map<string, any>} electricalTransientStates read only.
 * @returns {ReadonlyArray<Readonly<{ uid: string, positivePin: string, referencePin: string, voltage: number | null }>>}
 *   `voltage` null = the observer reported a non-finite value (unresolved).
 */
export function observeTransientVoltageFacts(transientComponents, transientRegistry, electricalTransientStates) {
  const facts = []
  const ordered = (transientComponents || [])
    .filter((c) => c && typeof c.uid === "string")
    .sort((a, b) => a.uid.localeCompare(b.uid))

  for (const comp of ordered) {
    const observe = transientRegistry.getTransientObservation?.(comp.type) ?? null
    if (!observe || !electricalTransientStates.has(comp.uid)) continue
    const fail = (reason) => new Error(`observeTransientVoltageFacts: component "${comp.uid}" (type "${comp.type}") ${reason}`)
    const canonicalPins = new Set((getCanonicalEntry(comp.type)?.pins ?? []).map((pin) => pin.id))
    const observation = observe({
      component: comp,
      params: resolveComponentParameters(comp.type, comp.parameters),
      previousState: electricalTransientStates.get(comp.uid),
    })
    if (observation === null || observation === undefined) continue
    if (typeof observation !== "object") throw fail("returned an invalid observation")
    const voltageFacts = observation.voltageFacts ?? []
    if (!Array.isArray(voltageFacts)) throw fail("returned invalid voltageFacts")
    for (const fact of voltageFacts) {
      const { positivePin, referencePin, voltage } = fact ?? {}
      if (!canonicalPins.has(positivePin) || !canonicalPins.has(referencePin) || positivePin === referencePin) {
        throw fail("observed a voltage fact that is not between two distinct canonical pins")
      }
      const valid = typeof voltage === "number" && Number.isFinite(voltage)
      facts.push(Object.freeze({ uid: comp.uid, positivePin, referencePin, voltage: valid ? voltage : null }))
    }
  }
  return Object.freeze(facts)
}

/**
 * Composes the DC-source voltage facts with the observed transient facts into
 * the sample voltage facts. Each transient fact belongs to the physical net of
 * its positive pin, relative to the net identity of its reference pin (the
 * same identity as the DC-source facts). Pure and order-independent : two
 * compatible authorities (same voltage, same reference) keep one valid fact ;
 * incompatible ones, or a null, make the net null (unresolved) — no authority
 * family wins. A net without any authority stays absent. Inputs are never
 * mutated ; the result is a new Map of fresh fact objects.
 *
 * @param {Map<string, { voltage: number, reference: string } | null>} sourceVoltageFacts key "uid:pinId"
 * @param {ReadonlyArray<{ uid: string, positivePin: string, referencePin: string, voltage: number | null }>} transientFacts
 * @param {{ uf, nets, allKeys }} prepared read only.
 * @returns {Map<string, { voltage: number, reference: string } | null>}
 */
export function composeSampleVoltageFacts(sourceVoltageFacts, transientFacts, prepared) {
  const netByKey = netIdentities(prepared.nets)
  const byNet = new Map()
  const merge = (net, value) => {
    if (net === undefined) return
    if (!byNet.has(net)) byNet.set(net, value)
    else if (!sameFact(byNet.get(net), value)) byNet.set(net, null)
  }
  for (const [key, fact] of sourceVoltageFacts) merge(netByKey.get(key), fact)
  for (const { uid, positivePin, referencePin, voltage } of transientFacts) {
    const reference = netByKey.get(prepared.uf.key(uid, referencePin))
    merge(netByKey.get(prepared.uf.key(uid, positivePin)),
      reference !== undefined && voltage !== null ? { voltage, reference } : null)
  }

  const composed = new Map()
  for (const key of prepared.allKeys) {
    const fact = byNet.get(netByKey.get(key))
    if (fact !== undefined) composed.set(key, fact && { voltage: fact.voltage, reference: fact.reference })
  }
  return composed
}

function sameFact(a, b) {
  return a === b || (!!a && !!b && a.voltage === b.voltage && a.reference === b.reference)
}
