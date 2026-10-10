import { Signal } from "./signals.js"
import { getDcVoltageDomainContribution } from "./dcVoltageDomainRegistry.js"
import { getAnalogConditionalConduction } from "./analogConditionalConductionRegistry.js"
import { getDcSource } from "./dcSourceRegistry.js"
import { getCanonicalEntry } from "./canonicalRegistry.js"
import { getDcContribution, getUnconditionalConductionPinPair } from "./dcContributionRegistry.js"
import { getConditionalConduction } from "./conditionalConductionRegistry.js"
import { resolveComponentParameters } from "./resolveComponentParameters.js"
import { solveScalarFeedback, stronglyConnectedComponents } from "./controlledAnalogFeedbackSolver.js"

/**
 * MB-SIM-006 : Résolution (ADR-004).
 * Reçoit le modèle préparé (nets) en lecture seule, calcule les signaux bruts.
 * MB-CF2-SIM-001 : les modèles sont découverts via simulationRegistry.
 *
 * MB-SIM-008 v2 : computeDcAnalysis() ne contient plus aucune branche
 * spécifique à un type de composant (RESISTOR/LDR/THERMISTOR/DIODE/
 * DC_MOTOR/CAPACITOR/POTENTIOMETER/NPN_TRANSISTOR). Elle consulte, pour
 * chaque composant, le Registry de contribution DC (ADR-006, voir
 * dcContributionRegistry.js) et lui délègue entièrement le calcul. Ajouter
 * un nouveau type de composant DC ne nécessite donc plus de modifier ce
 * fichier — seulement d'enregistrer sa contribution dans
 * dcContributionRegistry.js, conformément au principe Open/Closed d'ADR-006.
 *
 * MB-SIM-012 : `externalSignals` (Map<string, Signal>, clé "uid:pinId" —
 * exactement le même format que pinSignals/allKeys, aucun nouveau système
 * de clés) permet d'injecter des signaux produits en dehors de la
 * Simulation (typiquement par un Runtime, via simulationRuntimeIntegration.js)
 * AVANT la propagation, afin qu'ils participent réellement à la résolution
 * (nets, propagate()) plutôt que d'être simplement ajoutés au résultat une
 * fois le calcul terminé. resolution.js reste totalement indépendant du
 * Runtime : `externalSignals` est une donnée pure (Map), jamais un objet
 * Runtime, jamais un import vers le domaine Runtime.
 *
 * Priorité des sources (dérivée du comportement existant, non inventée) :
 * POWER est seedé en premier et n'est jamais réécrit par externalSignals
 * (une clé déjà non-UNKNOWN — donc POWER — n'est jamais retouchée) ;
 * externalSignals est appliqué ensuite, avant propagate(), sur toute clé
 * encore UNKNOWN ; le fallback ARDUINO -> FLOATING (déjà existant,
 * inchangé) ne s'applique enfin qu'aux pins encore UNKNOWN après
 * propagation — un signal externe valide le supplante donc naturellement.
 *
 * Sans externalSignals (ou avec `null`), le comportement est strictement
 * celui d'avant MB-SIM-012 (invariant de non-régression, §7.1 du ticket).
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {{ uf, nets, allKeys }} prepared
 * @param {Map<string, string>|null} [externalSignals] Optionnel. Clé
 *   "uid:pinId" (même format que pinSignals), valeur Signal. Toute clé qui
 *   ne correspond à aucune pin réelle du circuit préparé (absente de
 *   allKeys) est ignorée silencieusement — aucune clé fantôme n'est créée
 *   dans pinSignals.
 * @param {{ voltageOutputs?: Array<{ uid: string, pinId: string, referencePin: string, voltage: number | null }>, conductionPairs?: Array<{ uid: string, pinA: string, pinB: string }> }|null} [stepAuthorities]
 *   A11-COMP4-PREQ3 — optional PURE electrical authorities of the step, already
 *   computed by the caller (plain data, no producer type, no time, no state).
 *   `voltageOutputs` : numeric authorities on the net of (uid, pinId), relative
 *   to the net of (uid, referencePin), which must carry a 0 V DC-source fact ;
 *   otherwise, or for a null/non-finite/negative voltage, the net is reserved
 *   unresolved (null). They join the primary facts with the same conflict rule
 *   and never become HIGH/LOW in pinSignals. `conductionPairs` : ideal derived
 *   conduction joining the nets of (uid, pinA) and (uid, pinB) for this call
 *   only (same semantics as analog-selected pairs), never a topology change.
 *   Absent/empty : historical behaviour, strictly unchanged.
 */
export function resolveSignals(components, prepared, externalSignals = null, stepAuthorities = null) {
  const { uf } = prepared
  const { pinSignals: seededSignals, sources, conflictingNet } = seedSourceDrivenPinSignals(components, prepared)
  const pinSignals = projectDigitalPinSignals(prepared, seededSignals, conflictingNet ? null : externalSignals)

  if (conflictingNet && sources.length === 1) {
    return { pinSignals, dcAnalysis: new Map(), dcVoltageDomains: new Map() }
  }

  for (const comp of components) {
    if (conflictingNet || comp.type !== "ARDUINO") continue
    for (const pin of getCanonicalEntry(comp.type)?.pins ?? []) {
      if (pin.role !== "gpio") continue
      const k = uf.key(comp.uid, pin.id)
      if (pinSignals.get(k) === Signal.UNKNOWN) pinSignals.set(k, Signal.FLOATING)
    }
  }

  propagatePassiveConduction(components, prepared, pinSignals)

  const domainContributors = [...components]
    .sort((a, b) => a.uid.localeCompare(b.uid))
    .map((comp) => ({ comp, contract: getDcVoltageDomainContribution(comp.type) }))
    .filter(({ contract }) => contract !== null)
    .map(({ comp, contract }) => ({ comp, contract: controlledDomainContract(contract) }))
  const analogConductors = [...components]
    .sort((a, b) => a.uid.localeCompare(b.uid))
    .map((comp) => ({ comp, contract: getAnalogConditionalConduction(comp.type) }))
    .filter(({ contract }) => contract !== null)
  const dcControlSignals = sources.length > 1
    ? resolveDcControlSignals(prepared, externalSignals) : new Map()
  const dcTopologySignals = new Map([...pinSignals, ...dcControlSignals])
  const authorities = normalizeStepAuthorities(stepAuthorities)
  const hasStepAuthorities = authorities.voltageOutputs.length > 0 || authorities.conductionPairs.length > 0
  const dcVoltageDomains = resolveDcVoltageDomains(components, prepared, sources, domainContributors,
    dcTopologySignals, analogConductors, authorities)
  // Final output only: computed after convergence, never fed back into it.
  projectFinalElectricalSignals(prepared, pinSignals, dcVoltageDomains, analogConductors)
  // Numeric facts carry their own voltage and physical reference. Multiple
  // primaries therefore use the same local authority checks as derived domains;
  // a conflict on one net does not erase evidence on independent nets. Digital
  // source-conflict refusal remains unchanged, independently of DC analysis.
  const dcAnalysis = sources.length > 0
    ? computeDcAnalysis(components, prepared, pinSignals, dcVoltageDomains,
      sources.length === 1 && domainContributors.length === 0 && analogConductors.length === 0 && !hasStepAuthorities
        ? sources[0].source.voltage : null,
      dcControlSignals)
    : new Map()
  return { pinSignals, dcAnalysis, dcVoltageDomains }
}

/**
 * A7-C3-PREQ2 (§4/§5/§7 du ticket) — Contexte générique PRÉ-résolution,
 * alimenté par la MÊME primitive de seeding/propagation par sources DC que
 * resolveSignals() ci-dessus (seedSourceDrivenPinSignals/propagateNetSignal,
 * extraites de la logique historique de resolveSignals — aucun second
 * algorithme, aucune dérive sémantique, §5 du ticket : source unique de
 * vérité, deux consommateurs).
 *
 * Exécute UNIQUEMENT : découverte des sources DC (getDcSource), seeding
 * HIGH/LOW de leurs bornes, détection de conflit HIGH+LOW sur un même net
 * (jamais "powered" dans ce cas), puis propagation par nets — rien d'autre :
 * Sans troisième argument, aucune autorité externe. A9-LOGIC-PREQ permet
 * aussi de projeter les autorités digitales du step via `externalSignals`,
 * avec la même priorité et propagation que resolveSignals(). Aucun fallback
 * ARDUINO→FLOATING, ni propagation passive
 * dérivée (RESISTOR...), ni dcAnalysis, ni resolveSignals() elle-même (§4 :
 * "ne PAS exécuter conduction passive / sorties numériques calculées /
 * Runtime / Scheduler / dcAnalysis / resolveSignals complet").
 *
 * PURE, synchrone : ne mute jamais `components`/`prepared`. Un contributeur
 * digital générique (§6 du ticket) consulte cette Map — via son propre
 * sous-ensemble de pins, jamais l'inverse — pour savoir si SON composant est
 * correctement alimenté AVANT que sa propre sortie ne soit injectée dans
 * l'unique passe resolveSignals().
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {{ uf, nets, allKeys }} prepared
 * @param {Map<string, string>|null} [externalSignals] Autorités digitales
 *   optionnelles, injectées avant propagation, sans résolution électrique.
 * @returns {Map<string, string>} pinSignals — niveaux établis par les sources
 *   DC, les autorités externes optionnelles et la topologie physique des
 *   nets ; Signal.UNKNOWN pour toute autre pin, et
 *   pour TOUTES les pins si un conflit HIGH/LOW est détecté sur un même net
 *   (jamais un état "powered" en cas de conflit, §4 du ticket).
 */
export function resolveSourceDrivenPinSignals(components, prepared, externalSignals = null) {
  const { pinSignals, conflictingNet } = seedSourceDrivenPinSignals(components, prepared)
  if (conflictingNet) return pinSignals

  return projectDigitalPinSignals(prepared, pinSignals, externalSignals)
}

/**
 * A11-COMP4-PREQ3 — numeric sibling of resolveSourceDrivenPinSignals() : the
 * pre-resolution voltage facts that the DC sources alone establish on their
 * physical nets (the same primary seeding as resolveDcVoltageDomains(), shared
 * through seedPrimaryVoltageFacts()). No passive conduction, no derived or
 * controlled domain, no contributor, no resolveSignals() : only facts that
 * exist BEFORE any step producer.
 *
 * PURE, synchronous : never mutates `components`/`prepared`.
 *
 * @param {Array<{ uid, type }>} components
 * @param {{ uf, nets, allKeys }} prepared
 * @returns {Map<string, { voltage: number, reference: string } | null>} key
 *   "uid:pinId" -> fact (volts relative to the `reference` net identity), or
 *   null when the net carries conflicting source facts. A key without any
 *   source fact is absent (never an invented voltage, never HIGH/LOW).
 */
export function resolveSourceDrivenVoltageFacts(components, prepared) {
  const sources = components.map((comp) => ({ comp, source: getDcSource(comp) }))
    .filter(({ source }) => source !== null)
  const netByKey = netIdentities(prepared.nets)
  const primary = seedPrimaryVoltageFacts(sources, (comp, pin) => netByKey.get(prepared.uf.key(comp.uid, pin)))
  const facts = new Map()
  for (const key of prepared.allKeys) {
    const fact = primary.get(netByKey.get(key))
    if (fact !== undefined) facts.set(key, fact && { voltage: fact.voltage, reference: fact.reference })
  }
  return facts
}

/**
 * Net identity of every pin key : the smallest key of its physical net.
 * A11-COMP4-PREQ4 : exported (read-only helper) so every numeric fact uses the
 * same `reference` identity.
 */
export function netIdentities(nets) {
  const netByKey = new Map()
  for (const keys of nets.values()) {
    const id = [...keys].sort()[0]
    for (const key of keys) netByKey.set(key, id)
  }
  return netByKey
}

/** Merge a net fact : a disagreeing (or null) fact makes the net null (conflict). */
function mergeNetFact(map, net, value) {
  if (net === undefined) return
  if (!map.has(net)) map.set(net, value)
  else if (!sameDcVoltage(map.get(net), value)) map.set(net, null)
}

/** Primary DC-source facts by physical net : negative terminal 0 V, positive terminal its voltage. */
function seedPrimaryVoltageFacts(sources, netOf) {
  const primary = new Map()
  for (const { comp, source } of sources) {
    const reference = netOf(comp, source.negativePin)
    if (reference === undefined) continue
    mergeNetFact(primary, reference, { voltage: 0, reference })
    mergeNetFact(primary, netOf(comp, source.positivePin), { voltage: source.voltage, reference })
  }
  return primary
}

const NO_STEP_AUTHORITIES = Object.freeze({ voltageOutputs: Object.freeze([]), conductionPairs: Object.freeze([]) })

/** A11-COMP4-PREQ3 — read-only view of the optional step authorities (absent = none). */
function normalizeStepAuthorities(stepAuthorities) {
  if (!stepAuthorities) return NO_STEP_AUTHORITIES
  return {
    voltageOutputs: Array.isArray(stepAuthorities.voltageOutputs) ? stepAuthorities.voltageOutputs : [],
    conductionPairs: Array.isArray(stepAuthorities.conductionPairs) ? stepAuthorities.conductionPairs : [],
  }
}

/**
 * Shared digital-only projection: source pin priority, external injection,
 * then historical HIGH-before-LOW propagation into UNKNOWN pins. Distinct
 * driven pins retain their levels, even on the same net. No passive/DC solve,
 * Union-Find access, FLOATING promotion or mutation of the supplied baseline.
 */
function projectDigitalPinSignals(prepared, baseline, externalSignals) {
  const pinSignals = new Map(baseline)
  if (externalSignals) {
    for (const [key, signal] of externalSignals) {
      if (pinSignals.has(key) && pinSignals.get(key) === Signal.UNKNOWN) {
        pinSignals.set(key, signal)
      }
    }
  }
  propagateNetSignal(prepared.nets, pinSignals, Signal.HIGH)
  propagateNetSignal(prepared.nets, pinSignals, Signal.LOW)
  return pinSignals
}

/**
 * Primitive interne partagée (§5 du ticket) : découverte des sources DC +
 * seeding HIGH/LOW de leurs bornes + détection de conflit — extraite à
 * l'identique du corps historique de resolveSignals(), jamais réimplémentée
 * séparément. Consommée par resolveSignals() ET resolveSourceDrivenPinSignals()
 * ci-dessus, seuls les deux consommateurs autorisés (aucune troisième copie).
 */
function seedSourceDrivenPinSignals(components, prepared) {
  const { uf, nets, allKeys } = prepared
  const pinSignals = new Map()
  for (const k of allKeys) pinSignals.set(k, Signal.UNKNOWN)

  const sources = components.map((comp) => ({ comp, source: getDcSource(comp) }))
    .filter(({ source }) => source !== null)

  for (const { comp, source } of sources) {
    pinSignals.set(uf.key(comp.uid, source.positivePin), Signal.HIGH)
    pinSignals.set(uf.key(comp.uid, source.negativePin), Signal.LOW)
  }

  // Preserve non-ambiguous digital signals, including separate source terminals.
  // Opposing seeded levels refuse all source-driven digital signals, independent
  // of order. Numeric DC authorities are resolved separately by physical net.
  const conflictingNet = [...nets.values()].some((keys) =>
    keys.some((k) => pinSignals.get(k) === Signal.HIGH)
    && keys.some((k) => pinSignals.get(k) === Signal.LOW))
  if (conflictingNet) {
    for (const key of allKeys) pinSignals.set(key, Signal.UNKNOWN)
  }

  return { pinSignals, sources, conflictingNet }
}

/** Propagate `signal` to every UNKNOWN pin sharing a net with a pin already carrying it. */
function propagateNetSignal(nets, pinSignals, signal) {
  for (const [, keys] of nets) {
    let found = false
    for (const k of keys) {
      if (pinSignals.get(k) === signal) { found = true; break }
    }
    if (!found) continue
    for (const k of keys) {
      if (pinSignals.get(k) === Signal.UNKNOWN) pinSignals.set(k, signal)
    }
  }
}

/**
 * MB-SIM-015 (ruling CSA, GATE 1 PASS / GATE 2 AUTHORIZED, 2026-08-20) —
 * Propagation passive dérivée (mécanisme "B'").
 *
 * Corrige POWER → RESISTOR → LED → GND (et les topologies équivalentes) :
 * un composant passif "conducteur inconditionnel" (déclaré par
 * dcContributionRegistry.getUnconditionalConductionPinPair — RESISTOR
 * uniquement pour ce ticket) ne bloque jamais la continuité électrique
 * entre ses deux bornes, contrairement à ce que la propagation par nets
 * seule peut représenter (les deux bornes d'un composant ne sont jamais
 * unies par un fil, donc jamais dans le même net).
 *
 * Correction CSA explicite par rapport à la conception initiale : ceci
 * N'EST PAS une union Union-Find (uf.union) qui modifierait la topologie
 * canonique construite par prepareCircuit() — `prepared.uf`/`prepared.nets`
 * ne sont jamais mutés ici, uniquement lus. Le résultat dérivé est écrit
 * exclusivement dans `pinSignals` (la sortie de la Résolution), exactement
 * comme le fait déjà propagate() pour la propagation par nets. La
 * séparation Topologie physique / Propagation logique dérivée est ainsi
 * préservée : prepareCircuit() reste inchangé, et un futur appelant qui
 * relirait prepared.nets verrait toujours la topologie physique réelle,
 * pas une version enrichie par cette dérivation.
 *
 * Garde de sûreté (jamais d'écrasement, jamais de court-circuit logique
 * créé volontairement) : une valeur n'est propagée vers le net cible que
 * si CE NET EST ENTIÈREMENT UNKNOWN (aucun de ses membres n'a déjà une
 * valeur HIGH ou LOW, quelle qu'elle soit). Par construction, cela rend
 * impossible toute fusion de deux valeurs différentes déjà résolues : si
 * le net cible portait déjà une valeur, la borne examinée du composant ne
 * serait, par définition, pas UNKNOWN, et la condition de déclenchement
 * (une borne connue, l'autre UNKNOWN) ne s'activerait jamais pour ce net.
 * Idempotent : une fois un net résolu, il n'est plus jamais réécrit (son
 * statut "entièrement UNKNOWN" devient faux dès la première écriture).
 *
 * Rounds à point fixe (nécessaire pour les chaînes de composants passifs
 * en série, ex. POWER → R1 → R2 → LED → GND — une résistance ne peut être
 * pontée qu'une fois la résistance en amont déjà résolue) : borné à
 * `allKeys.length + 1` rounds: every changing round resolves at least
 * one previously UNKNOWN pin, including contributors with multiple pairs.
 * Stop as soon as a complete round produces no change.
 */
export function propagatePassiveConduction(components, prepared, pinSignals, conditionalLookup = getConditionalConduction) {
  const baseline = new Map(pinSignals)
  const resolved = recomputeDerivedConduction(components, prepared, baseline, conditionalLookup)
  for (const key of pinSignals.keys()) pinSignals.set(key, resolved.get(key) ?? Signal.UNKNOWN)
}

/**
 * Recompute all passive/conditional consequences from an immutable baseline.
 * Conditional topology is selected from the previous complete candidate, then
 * evaluated from scratch. A pair that disappears therefore cannot leave a
 * signal behind. Repeated states (oscillation) and the deterministic bound
 * both return the conservative baseline: base authorities survive, while no
 * transient derived fact is promoted to truth.
 */
function recomputeDerivedConduction(components, prepared, baseline, conditionalLookup) {
  let previous = new Map(baseline)
  const seen = new Set([signalMapSignature(previous, prepared.allKeys)])
  const maxIterations = prepared.allKeys.length + 1

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const candidate = new Map(baseline)
    const selectedPairs = selectConductionPairs(components, prepared.uf, previous, conditionalLookup)
    propagateSelectedPairs(selectedPairs, prepared, candidate)

    if (signalMapsEqual(candidate, previous, prepared.allKeys)) return candidate

    const signature = signalMapSignature(candidate, prepared.allKeys)
    if (seen.has(signature)) return new Map(baseline)
    seen.add(signature)
    previous = candidate
  }

  return new Map(baseline)
}

function selectConductionPairs(components, uf, topologySignals, conditionalLookup) {
  return [...components]
    .sort((a, b) => a.uid.localeCompare(b.uid))
    .map((comp) => {
      const passivePair = getUnconditionalConductionPinPair(comp.type)
      const contribute = conditionalLookup(comp.type)
      return {
        comp,
        pairs: [
          ...(passivePair ? [passivePair] : []),
          ...(contribute ? contribute(buildPinSignalMap(comp, uf, topologySignals)) : []),
        ],
      }
    })
}

function propagateSelectedPairs(selectedPairs, prepared, pinSignals) {
  const { uf, nets } = prepared
  // Read nets directly: even Union-Find.find() may perform path compression.
  const netByKey = new Map([...nets.values()].flatMap((keys) => keys.map((key) => [key, keys])))
  const maxRounds = prepared.allKeys.length + 1

  for (let round = 0; round < maxRounds; round++) {
    let changed = false

    for (const { comp, pairs } of selectedPairs) {
      for (const [pinIdA, pinIdB] of pairs) {
        const keyA = uf.key(comp.uid, pinIdA)
        const keyB = uf.key(comp.uid, pinIdB)
        if (!pinSignals.has(keyA) || !pinSignals.has(keyB)) continue

        if (bridgeIfEligible(keyA, keyB, netByKey, pinSignals)) changed = true
        if (bridgeIfEligible(keyB, keyA, netByKey, pinSignals)) changed = true
      }
    }

    if (!changed) break
  }
}

export function signalMapsEqual(a, b, keys) {
  return keys.every((key) => a.get(key) === b.get(key))
}

export function signalMapSignature(signals, keys) {
  return keys.map((key) => `${key.length}:${key}=${signals.get(key) ?? Signal.UNKNOWN}`).join('|')
}

/**
 * Si `sourceKey` porte une valeur connue (HIGH/LOW) et `targetKey` est
 * UNKNOWN, tente de propager cette valeur vers le net entier de
 * `targetKey` — uniquement si ce net est entièrement UNKNOWN (garde de
 * sûreté, voir propagatePassiveConduction). Ne mute jamais `uf`/`nets`.
 * @returns {boolean} true si une propagation a effectivement eu lieu.
 */
function bridgeIfEligible(sourceKey, targetKey, netByKey, pinSignals) {
  const sourceValue = pinSignals.get(sourceKey)
  if (sourceValue !== Signal.HIGH && sourceValue !== Signal.LOW) return false
  if (pinSignals.get(targetKey) !== Signal.UNKNOWN) return false

  const netKeys = netByKey.get(targetKey) ?? [targetKey]
  const netEntirelyUnknown = netKeys.every((k) => pinSignals.get(k) === Signal.UNKNOWN)
  if (!netEntirelyUnknown) return false

  for (const k of netKeys) pinSignals.set(k, sourceValue)
  return true
}

/**
 * Construit, pour un composant donné, la table { pinId → Signal } de ses
 * propres broches (lues depuis le Registry canonique, générique quel que
 * soit leur nombre : 2 broches ou 3 broches indifféremment). Ne connaît
 * rien du type du composant — uniquement de sa liste de broches déclarée.
 */
function buildPinSignalMap(comp, uf, pinSignals) {
  const entry = getCanonicalEntry(comp.type)
  if (!entry) return {}
  const map = {}
  for (const pin of entry.pins) {
    map[pin.id] = pinSignals.get(uf.key(comp.uid, pin.id)) ?? Signal.UNKNOWN
  }
  return map
}

/**
 * External controls are evidence on existing physical nets, never a voltage
 * authority. Conflicting external levels remain UNKNOWN, independent of order.
 * Numeric facts (including null conflicts) take precedence at consumption.
 * This local context never changes public digital conflict refusal.
 */
function resolveDcControlSignals(prepared, externalSignals) {
  const signals = new Map()
  if (!externalSignals) return signals
  for (const keys of prepared.nets.values()) {
    const levels = new Set(keys.filter(key => externalSignals.has(key)).map(key => externalSignals.get(key)))
    if (levels.size === 0) continue
    const [level] = levels
    const signal = levels.size === 1 && (level === Signal.HIGH || level === Signal.LOW)
      ? level : Signal.UNKNOWN
    for (const key of keys) signals.set(key, signal)
  }
  return signals
}

function computeDcAnalysis(components, prepared, pinSignals, dcVoltageDomains, legacyVoltage, dcControlSignals) {
  const { uf } = prepared
  const dcAnalysis = new Map()

  for (const comp of [...components].sort((a, b) => a.uid.localeCompare(b.uid))) {
    const contribute = getDcContribution(comp.type)
    if (!contribute) continue

    // MB-L1-CVE-001 : la simulation consomme désormais les paramètres
    // EFFECTIFS de l'instance (defaults canoniques + overrides d'instance
    // validés), plus jamais uniquement les defaults canoniques — sans quoi
    // une UI affichant 1000 Ω pourrait rester en désaccord permanent avec
    // un solveur qui continuerait à consommer 220 Ω. Toujours un objet sûr
    // et complet (jamais d'exception), y compris pour un composant dont
    // `parameters` serait absent/vide (repli identique au comportement
    // précédent dans ce cas).
    const params = resolveComponentParameters(comp.type, comp.parameters)
    const pins = buildPinSignalMap(comp, uf, pinSignals)
    // Preserve the historical single-source approximation (including series
    // loads and externally driven controls) when no domain producer exists.
    // With multiple primaries or a producer, there is no global fallback.
    let supplyVoltage = legacyVoltage
    if (legacyVoltage === null) {
      const values = Object.keys(pins).map((pin) => dcVoltageDomains.get(uf.key(comp.uid, pin)))
      if (values.some((value) => value === null)) continue
      const positive = values.filter((value) => value?.voltage > 0)
      const local = positive[0]
      if (!local || positive.some((value) => !sameDcVoltage(value, local))) continue
      supplyVoltage = local.voltage
      // Adapt electrical evidence only for the existing DC model contract.
      // The public digital pinSignals remain a separate, unchanged result.
      for (const pin of Object.keys(pins)) {
        const value = dcVoltageDomains.get(uf.key(comp.uid, pin))
        pins[pin] = value && value.reference === local.reference
          ? (value.voltage > 0 ? Signal.HIGH : Signal.LOW)
          : value === undefined && contribute.controlPinIds?.includes(pin)
            ? (dcControlSignals.get(uf.key(comp.uid, pin)) ?? Signal.UNKNOWN) : Signal.UNKNOWN
      }
    }
    const contribution = contribute({ pins, params, supplyVoltage })
    if (contribution) dcAnalysis.set(comp.uid, contribution)
  }

  return dcAnalysis
}

/**
 * A11-ANALOG-PREQ1 — explicit adaptation of the historical single-input
 * contract to the controlled multi-input form. It keeps the historical
 * semantics: strictly positive input and strictly positive output.
 */
function controlledDomainContract(contract) {
  if (Array.isArray(contract.inputPins) || Array.isArray(contract.groups)) return contract
  const { inputPin, referencePin, outputPin, contribute } = contract
  return {
    inputPins: [inputPin], referencePin, outputPins: [outputPin],
    contribute({ inputVoltages, params }) {
      const inputVoltage = inputVoltages[inputPin]
      if (!(inputVoltage > 0)) return null
      const voltage = contribute({ inputVoltage, params })
      return { [outputPin]: typeof voltage === 'number' && voltage > 0 ? voltage : null }
    },
  }
}

/**
 * A11-ANALOG-PREQ2-CORR-001 — one final projection of converged DC facts onto
 * the physical nets of explicitly declared digitalProjectionPins only, using
 * the historical numeric-to-Signal rule (voltage > 0 → HIGH, else LOW). A null
 * conflict becomes UNKNOWN; an absent fact keeps the historical signal. Reads
 * prepared and dcVoltageDomains; writes only the local pinSignals output.
 */
function projectFinalElectricalSignals(prepared, pinSignals, dcVoltageDomains, analogConductors) {
  const { uf, nets } = prepared
  const netByKey = new Map([...nets.values()].flatMap((keys) => keys.map((key) => [key, keys])))
  for (const { comp, contract } of analogConductors) {
    const pins = Array.isArray(contract.digitalProjectionPins) ? contract.digitalProjectionPins : []
    for (const pin of pins) {
      const key = uf.key(comp.uid, pin)
      const fact = dcVoltageDomains.get(key)
      if (fact === undefined || !pinSignals.has(key)) continue
      const signal = fact === null ? Signal.UNKNOWN : fact.voltage > 0 ? Signal.HIGH : Signal.LOW
      for (const netKey of netByKey.get(key) ?? [key]) {
        if (pinSignals.has(netKey)) pinSignals.set(netKey, signal)
      }
    }
  }
}

/** Numeric domain identity includes the physical reference net, not HIGH/LOW. */
function sameDcVoltage(a, b) {
  return a === b || (!!a && !!b && a.voltage === b.voltage && a.reference === b.reference)
}

/**
 * A11-COMP1-CORR-001 — independent observation groups of an analog conditional
 * conduction contract. A contract without `groups` is its own single group.
 */
function analogConductionGroups(contract) {
  const groups = Array.isArray(contract.groups) ? contract.groups
    : [{ inputPins: contract.inputPins, contribute: contract.contribute }]
  return groups.filter((group) => group && Array.isArray(group.inputPins) && typeof group.contribute === 'function')
}

/**
 * A11-COMP3-PREQ1 — independent groups of a controlled DC-domain contract.
 * A contract without `groups` is its own single group.
 */
function controlledDomainGroups(contract) {
  const groups = Array.isArray(contract.groups) ? contract.groups
    : [{ inputPins: contract.inputPins, outputPins: contract.outputPins, contribute: contract.contribute,
      feedback: contract.feedback }]
  return groups.filter((group) => group && Array.isArray(group.inputPins) && Array.isArray(group.outputPins))
}

const pinList = (pins) => Array.isArray(pins) ? pins : []

/**
 * A11-COMP3-PREQ2 — static controlled-analog dependency plan. Nodes are
 * controlled groups plus analog conductors; an edge u → v exists when a net u
 * drives (by direct physical net identity only, never through a passive part)
 * is a net v reads. Acyclic groups keep the historical path ('forward'), as
 * does any cycle through an analog conductor (solution-dependent topology is
 * never solved here). Other cycles are 'unsupported' (outputs reserved null,
 * as the historical rounds already deadlock them) unless the cycle is ONE
 * group whose explicit scalar feedback contract closes through its own input
 * pins on the net of its single variable output, with at least one external
 * input and no other authority, producer or conductor on that net.
 */
function planControlledFeedback(controlled, analogConductors, netOf, primary) {
  const nets = (comp, pins) => new Set(pins.map((pin) => netOf(comp, pin)).filter((net) => net !== undefined))
  const nodes = [
    ...controlled.map(({ comp, contract, group }) => ({
      reads: nets(comp, [...group.inputPins, ...pinList(contract.requiredPositivePins)]),
      drives: nets(comp, group.outputPins),
    })),
    ...analogConductors.map(({ comp, contract }) => {
      const observed = [...pinList(contract.inputPins), ...analogConductionGroups(contract).flatMap((g) => g.inputPins),
        ...pinList(contract.requiredPositivePins), contract.referencePin]
      const pins = (getCanonicalEntry(comp.type)?.pins ?? []).map((pin) => pin.id)
      return { reads: nets(comp, observed), drives: nets(comp, pins.filter((pin) => !observed.includes(pin))), conductor: true }
    }),
  ]
  const adjacency = nodes.map((from) => nodes.flatMap((to, index) =>
    [...from.drives].some((net) => to.reads.has(net)) ? [index] : []))
  const { component, cyclic } = stronglyConnectedComponents(adjacency)
  return controlled.map(({ comp, contract, group }, index) => {
    const members = nodes.filter((_, other) => component[other] === component[index])
    if (!cyclic[component[index]] || members.some((node) => node.conductor)) return { kind: 'forward' }
    const feedback = group.feedback
    const variable = feedback?.variableOutputPin
    const unknown = netOf(comp, variable)
    const feedbackPins = group.inputPins.filter((pin) => netOf(comp, pin) === unknown)
    const supported = members.length === 1 && feedback?.mode === 'scalar-bounded'
      && feedback.characteristic === 'single-root' && typeof feedback.bounds === 'function'
      && group.outputPins.length === 1 && group.outputPins[0] === variable && unknown !== undefined
      && feedbackPins.length > 0 && feedbackPins.length < group.inputPins.length
      && ![...pinList(contract.requiredPositivePins), contract.referencePin].some((pin) => netOf(comp, pin) === unknown)
      && !primary.has(unknown) && !nodes.some((node, other) => other !== index && node.drives.has(unknown))
    return supported
      ? { kind: 'feedback', variable, feedbackPins, externalPins: group.inputPins.filter((pin) => !feedbackPins.includes(pin)) }
      : { kind: 'unsupported' }
  })
}

/**
 * Nets joined by ideal derived conduction share one fact: agreeing facts are
 * kept, disagreeing facts (or a null) make the whole group null, and a group
 * without any fact stays absent. Mutates only the local `facts` candidate.
 */
function joinEquipotential(facts, pairs) {
  const root = new Map()
  const find = (net) => {
    while (root.has(net) && root.get(net) !== net) net = root.get(net)
    return net
  }
  for (const [a, b] of pairs) {
    const [ra, rb] = [find(a), find(b)].sort()
    if (ra !== rb) root.set(rb, ra)
  }
  const groups = new Map()
  for (const net of new Set(pairs.flat())) {
    const id = find(net)
    groups.set(id, [...(groups.get(id) ?? []), net])
  }
  for (const members of groups.values()) {
    const known = members.filter((net) => facts.has(net)).map((net) => facts.get(net))
    if (known.length === 0) continue
    const value = known.every((fact) => sameDcVoltage(fact, known[0])) ? known[0] : null
    for (const net of members) facts.set(net, value)
  }
}

/**
 * Read-only derived net facts. undefined = absent; null = unresolved/conflict.
 * Each round rebuilds from authorities, so invalidated inputs retract outputs
 * and all their passive consequences. Repeated states or a bound return no
 * electrical evidence, rather than retaining a transient derived voltage.
 * This is domain propagation for the existing DC analysis, not nodal solving:
 * passive pairs extend a domain only onto nets without a direct authority.
 * A11-ANALOG-PREQ2: analog-selected pairs are ideal derived conduction (a
 * derived wire): the nets they join share one fact, merged with the same
 * conflict rule, before passive extension. They are reselected every round
 * from the previous facts, so a pair that becomes invalid is retracted.
 */
function resolveDcVoltageDomains(components, prepared, sources, contributors, pinSignals, analogConductors = [],
  stepAuthorities = NO_STEP_AUTHORITIES) {
  const { uf, nets, allKeys } = prepared
  const netByKey = netIdentities(nets)
  const netOf = (comp, pin) => netByKey.get(uf.key(comp.uid, pin))
  const merge = mergeNetFact
  const sourceFacts = seedPrimaryVoltageFacts(sources, netOf)
  const primary = new Map(sourceFacts)
  // A11-COMP4-PREQ3 — step voltage authorities join the primary facts. Their
  // reference is read from the DC-source facts only (never from another step
  // output), so the merge is order-independent; an invalid reference or value
  // reserves the output net as unresolved.
  for (const { uid, pinId, referencePin, voltage } of stepAuthorities.voltageOutputs) {
    const reference = sourceFacts.get(netOf({ uid }, referencePin))
    const valid = !!reference && reference.voltage === 0
      && typeof voltage === 'number' && Number.isFinite(voltage) && voltage >= 0
    merge(primary, netOf({ uid }, pinId), valid ? { voltage, reference: reference.reference } : null)
  }
  // Step conduction joins nets for this call only, like analog-selected pairs.
  const stepPairs = stepAuthorities.conductionPairs
    .map(({ uid, pinA, pinB }) => [netOf({ uid }, pinA), netOf({ uid }, pinB)])
    .filter(([a, b]) => a !== undefined && b !== undefined && a !== b)
  const expand = (facts) => new Map([...allKeys].sort().map((key) => [key, facts.get(netByKey.get(key))]))
  const signature = (facts) => JSON.stringify([...facts].sort(([a], [b]) => a.localeCompare(b)))
  // These contracts support common-reference, non-negative DC only: every
  // observed input must be a numeric fact of the referencePin domain.
  const observe = (facts, comp, { inputPins, referencePin }) => {
    const reference = facts.get(netOf(comp, referencePin))
    const inputs = inputPins.map((pin) => facts.get(netOf(comp, pin)))
    if (!reference || reference.voltage !== 0 || !inputs.every((input) => input
      && input.reference === reference.reference && Number.isFinite(input.voltage) && input.voltage >= 0)) return null
    return {
      reference: reference.reference,
      inputVoltages: Object.fromEntries(inputPins.map((pin, i) => [pin, inputs[i].voltage])),
      params: resolveComponentParameters(comp.type, comp.parameters),
    }
  }
  // Component-level activation: every required pin is a positive fact of the referencePin domain.
  const powered = (facts, comp, { referencePin, requiredPositivePins }) => {
    const reference = facts.get(netOf(comp, referencePin))
    return (Array.isArray(requiredPositivePins) ? requiredPositivePins : []).every((pin) => {
      const fact = facts.get(netOf(comp, pin))
      return !!reference && reference.voltage === 0 && !!fact && fact.reference === reference.reference
        && Number.isFinite(fact.voltage) && fact.voltage > 0
    })
  }
  const controlled = contributors.flatMap(({ comp, contract }) =>
    controlledDomainGroups(contract).map((group) => ({ comp, contract, group })))
  const plans = planControlledFeedback(controlled, analogConductors, netOf, primary)
  // A11-COMP3-PREQ3 — component-wide supply context: the already resolved requiredPositivePins
  // facts (volts relative to referencePin, validated by powered()), {} without such pins. Never
  // merged into inputVoltages. A fresh object per law call, so no call can alter another's view.
  const supplyContext = (facts, comp, contract) => Object.fromEntries(pinList(contract.requiredPositivePins)
    .map((pin) => [pin, facts.get(netOf(comp, pin)).voltage]))
  // A11-COMP3-PREQ2 — the same pure law F evaluated with a private candidate x on the
  // feedback pins; x becomes an electrical fact only once validated by the solver.
  const solveFeedback = (facts, comp, contract, group, plan, observed) => {
    const transfer = (x) => group.contribute({
      inputVoltages: { ...observed.inputVoltages, ...Object.fromEntries(plan.feedbackPins.map((pin) => [pin, x])) },
      supplyVoltages: supplyContext(facts, comp, contract),
      params: observed.params,
    })?.[plan.variable]
    const bounds = group.feedback.bounds({ supplyVoltages: supplyContext(facts, comp, contract), params: observed.params })
    return { [plan.variable]: solveScalarFeedback(transfer, bounds) }
  }
  let previous = primary
  const seen = new Set()
  for (let round = 0; round <= allKeys.length + contributors.length + analogConductors.length; round++) {
    const candidate = new Map(primary)
    controlled.forEach(({ comp, contract, group }, index) => {
      // Activation is component-wide; each group is observed on its own inputs, so an
      // unresolved group reserves only its own outputs, never those of the other groups.
      const plan = plans[index]
      const observed = plan.kind !== 'unsupported' && typeof group.contribute === 'function'
        && powered(previous, comp, contract) && observe(previous, comp,
        { inputPins: plan.kind === 'feedback' ? plan.externalPins : group.inputPins, referencePin: contract.referencePin })
      const outputs = !observed ? null : plan.kind === 'feedback'
        ? solveFeedback(previous, comp, contract, group, plan, observed)
        : group.contribute({ inputVoltages: observed.inputVoltages, supplyVoltages: supplyContext(previous, comp, contract),
          params: observed.params })
      for (const pin of group.outputPins) {
        const voltage = outputs?.[pin]
        // Reserve inactive outputs too: a load cannot back-power its producer.
        merge(candidate, netOf(comp, pin), typeof voltage === 'number' && Number.isFinite(voltage)
          && voltage >= 0 ? { voltage, reference: observed.reference } : null)
      }
    })
    // Each observation group is evaluated on its own inputs: an unresolved group selects
    // nothing without suppressing the other groups of the same powered component.
    const analogPairs = analogConductors.flatMap(({ comp, contract }) => !powered(previous, comp, contract) ? []
      : analogConductionGroups(contract).flatMap(({ inputPins, contribute }) => {
        const observed = observe(previous, comp, { inputPins, referencePin: contract.referencePin })
        const selected = observed ? contribute({ inputVoltages: observed.inputVoltages, params: observed.params }) : []
        return (Array.isArray(selected) ? selected : [])
          .filter((pair) => Array.isArray(pair) && pair.length === 2 && pair[0] !== pair[1])
          .map(([a, b]) => [netOf(comp, a), netOf(comp, b)])
          .filter(([a, b]) => a !== undefined && b !== undefined)
      }))
    joinEquipotential(candidate, analogPairs.concat(stepPairs))
    const authorities = new Set(candidate.keys())
    const topologySignals = new Map(pinSignals)
    for (const [key, value] of expand(previous)) {
      if (value !== undefined) topologySignals.set(key, value === null
        ? Signal.UNKNOWN : value.voltage > 0 ? Signal.HIGH : Signal.LOW)
    }
    const pairs = selectConductionPairs(components, uf, topologySignals, getConditionalConduction)
      .flatMap(({ comp, pairs: selected }) => selected.map(([a, b]) => [netOf(comp, a), netOf(comp, b)]))
      .concat(analogPairs, stepPairs)
    // Synchronous proposals detect competing paths independently of iteration order.
    for (let pass = 0; pass <= allKeys.length; pass++) {
      const next = new Map(candidate)
      for (const [a, b] of pairs) {
        for (const [from, to] of [[a, b], [b, a]]) {
          if (from === undefined || to === undefined || authorities.has(to) || !candidate.has(from)) continue
          merge(next, to, candidate.get(from))
        }
      }
      if (signature(next) === signature(candidate)) break
      candidate.clear()
      for (const [net, value] of next) candidate.set(net, value)
    }
    const state = signature(candidate)
    if (state === signature(previous)) return expand(candidate)
    if (seen.has(state)) return new Map(allKeys.map((key) => [key, null]))
    seen.add(state)
    previous = candidate
  }
  return new Map(allKeys.map((key) => [key, null]))
}
