import { Signal } from "./signals.js"
import { getDcVoltageDomainContribution } from "./dcVoltageDomainRegistry.js"
import { getDcSource } from "./dcSourceRegistry.js"
import { getCanonicalEntry } from "./canonicalRegistry.js"
import { getDcContribution, getUnconditionalConductionPinPair } from "./dcContributionRegistry.js"
import { getConditionalConduction } from "./conditionalConductionRegistry.js"
import { resolveComponentParameters } from "./resolveComponentParameters.js"

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
 */
export function resolveSignals(components, prepared, externalSignals = null) {
  const { uf, nets } = prepared
  const { pinSignals, sources, conflictingNet } = seedSourceDrivenPinSignals(components, prepared)

  if (conflictingNet && sources.length === 1) {
    return { pinSignals, dcAnalysis: new Map(), dcVoltageDomains: new Map() }
  }

  if (!conflictingNet && externalSignals) {
    for (const [key, signal] of externalSignals) {
      if (pinSignals.has(key) && pinSignals.get(key) === Signal.UNKNOWN) {
        pinSignals.set(key, signal)
      }
    }
  }

  propagateNetSignal(nets, pinSignals, Signal.HIGH)
  propagateNetSignal(nets, pinSignals, Signal.LOW)

  for (const comp of components) {
    if (conflictingNet || comp.type !== "ARDUINO") continue
    for (const pinId of ["D2", "D3"]) {
      const k = uf.key(comp.uid, pinId)
      if (pinSignals.get(k) === Signal.UNKNOWN) pinSignals.set(k, Signal.FLOATING)
    }
  }

  propagatePassiveConduction(components, prepared, pinSignals)

  const domainContributors = [...components]
    .sort((a, b) => a.uid.localeCompare(b.uid))
    .map((comp) => ({ comp, contract: getDcVoltageDomainContribution(comp.type) }))
    .filter(({ contract }) => contract !== null)
  const dcControlSignals = sources.length > 1
    ? resolveDcControlSignals(prepared, externalSignals) : new Map()
  const dcTopologySignals = new Map([...pinSignals, ...dcControlSignals])
  const dcVoltageDomains = resolveDcVoltageDomains(components, prepared, sources, domainContributors, dcTopologySignals)
  // Numeric facts carry their own voltage and physical reference. Multiple
  // primaries therefore use the same local authority checks as derived domains;
  // a conflict on one net does not erase evidence on independent nets. Digital
  // source-conflict refusal remains unchanged, independently of DC analysis.
  const dcAnalysis = sources.length > 0
    ? computeDcAnalysis(components, prepared, pinSignals, dcVoltageDomains,
      sources.length === 1 && domainContributors.length === 0 ? sources[0].source.voltage : null,
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
 * ni externalSignals, ni fallback ARDUINO→FLOATING, ni propagation passive
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
 * @returns {Map<string, string>} pinSignals — Signal.HIGH/Signal.LOW
 *   uniquement pour les pins déterministement établies par une source DC et
 *   la topologie physique des nets ; Signal.UNKNOWN pour toute autre pin, et
 *   pour TOUTES les pins si un conflit HIGH/LOW est détecté sur un même net
 *   (jamais un état "powered" en cas de conflit, §4 du ticket).
 */
export function resolveSourceDrivenPinSignals(components, prepared) {
  const { pinSignals, conflictingNet } = seedSourceDrivenPinSignals(components, prepared)
  if (conflictingNet) return pinSignals

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

function signalMapsEqual(a, b, keys) {
  return keys.every((key) => a.get(key) === b.get(key))
}

function signalMapSignature(signals, keys) {
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

/** Numeric domain identity includes the physical reference net, not HIGH/LOW. */
function sameDcVoltage(a, b) {
  return a === b || (!!a && !!b && a.voltage === b.voltage && a.reference === b.reference)
}

/**
 * Read-only derived net facts. undefined = absent; null = unresolved/conflict.
 * Each round rebuilds from authorities, so invalidated inputs retract outputs
 * and all their passive consequences. Repeated states or a bound return no
 * electrical evidence, rather than retaining a transient derived voltage.
 * This is domain propagation for the existing DC analysis, not nodal solving:
 * passive pairs extend a domain only onto nets without a direct authority.
 */
function resolveDcVoltageDomains(components, prepared, sources, contributors, pinSignals) {
  const { uf, nets, allKeys } = prepared
  const netByKey = new Map()
  for (const keys of nets.values()) {
    const id = [...keys].sort()[0]
    for (const key of keys) netByKey.set(key, id)
  }
  const netOf = (comp, pin) => netByKey.get(uf.key(comp.uid, pin))
  const merge = (map, net, value) => {
    if (net === undefined) return
    if (!map.has(net)) map.set(net, value)
    else if (!sameDcVoltage(map.get(net), value)) map.set(net, null)
  }
  const primary = new Map()
  for (const { comp, source } of sources) {
    const reference = netOf(comp, source.negativePin)
    if (reference === undefined) continue
    merge(primary, reference, { voltage: 0, reference })
    merge(primary, netOf(comp, source.positivePin), { voltage: source.voltage, reference })
  }
  const expand = (facts) => new Map([...allKeys].sort().map((key) => [key, facts.get(netByKey.get(key))]))
  const signature = (facts) => JSON.stringify([...facts].sort(([a], [b]) => a.localeCompare(b)))
  let previous = primary
  const seen = new Set()
  for (let round = 0; round <= allKeys.length + contributors.length; round++) {
    const candidate = new Map(primary)
    for (const { comp, contract } of contributors) {
      const { inputPin, referencePin, outputPin, contribute } = contract
      const input = previous.get(netOf(comp, inputPin))
      const reference = previous.get(netOf(comp, referencePin))
      let output = null
      // This minimal contract supports common-reference, non-negative DC only.
      if (input && reference && reference.voltage === 0
        && input.reference === reference.reference && input.voltage > 0) {
        const voltage = contribute({ inputVoltage: input.voltage,
          params: resolveComponentParameters(comp.type, comp.parameters) })
        if (typeof voltage === 'number' && Number.isFinite(voltage) && voltage > 0) {
          output = { voltage, reference: reference.reference }
        }
      }
      // Reserve inactive outputs too: a load cannot back-power its producer.
      merge(candidate, netOf(comp, outputPin), output)
    }
    const authorities = new Set(candidate.keys())
    const topologySignals = new Map(pinSignals)
    for (const [key, value] of expand(previous)) {
      if (value !== undefined) topologySignals.set(key, value === null
        ? Signal.UNKNOWN : value.voltage > 0 ? Signal.HIGH : Signal.LOW)
    }
    const pairs = selectConductionPairs(components, uf, topologySignals, getConditionalConduction)
      .flatMap(({ comp, pairs: selected }) => selected.map(([a, b]) => [netOf(comp, a), netOf(comp, b)]))
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
