import { Signal } from "./signals.js"
import { getSimulationDefaultParameters } from "./simulationRegistry.js"
import { getCanonicalEntry } from "./canonicalRegistry.js"
import { getDcContribution, getUnconditionalConductionPinPair } from "./dcContributionRegistry.js"

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
  const { uf, nets, allKeys } = prepared
  const pinSignals = new Map()
  for (const k of allKeys) pinSignals.set(k, Signal.UNKNOWN)

  for (const comp of components) {
    if (comp.type !== "POWER") continue
    pinSignals.set(uf.key(comp.uid, "5V"), Signal.HIGH)
    pinSignals.set(uf.key(comp.uid, "GND"), Signal.LOW)
  }

  if (externalSignals) {
    for (const [key, signal] of externalSignals) {
      if (pinSignals.has(key) && pinSignals.get(key) === Signal.UNKNOWN) {
        pinSignals.set(key, signal)
      }
    }
  }

  const propagate = (signal) => {
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

  propagate(Signal.HIGH)
  propagate(Signal.LOW)

  for (const comp of components) {
    if (comp.type !== "ARDUINO") continue
    for (const pinId of ["D2", "D3"]) {
      const k = uf.key(comp.uid, pinId)
      if (pinSignals.get(k) === Signal.UNKNOWN) pinSignals.set(k, Signal.FLOATING)
    }
  }

  propagatePassiveConduction(components, prepared, pinSignals)

  const dcAnalysis = computeDcAnalysis(components, prepared, pinSignals)
  return { pinSignals, dcAnalysis }
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
 * `components.length + 1` rounds (autorisé explicitement par le ruling
 * CSA), avec arrêt dès qu'un round complet ne produit plus aucun
 * changement.
 */
function propagatePassiveConduction(components, prepared, pinSignals) {
  const { uf, nets } = prepared
  const maxRounds = components.length + 1

  for (let round = 0; round < maxRounds; round++) {
    let changed = false

    for (const comp of components) {
      const pinPair = getUnconditionalConductionPinPair(comp.type)
      if (!pinPair) continue

      const [pinIdA, pinIdB] = pinPair
      const keyA = uf.key(comp.uid, pinIdA)
      const keyB = uf.key(comp.uid, pinIdB)
      if (!pinSignals.has(keyA) || !pinSignals.has(keyB)) continue

      if (bridgeIfEligible(keyA, keyB, uf, nets, pinSignals)) changed = true
      if (bridgeIfEligible(keyB, keyA, uf, nets, pinSignals)) changed = true
    }

    if (!changed) break
  }
}

/**
 * Si `sourceKey` porte une valeur connue (HIGH/LOW) et `targetKey` est
 * UNKNOWN, tente de propager cette valeur vers le net entier de
 * `targetKey` — uniquement si ce net est entièrement UNKNOWN (garde de
 * sûreté, voir propagatePassiveConduction). Ne mute jamais `uf`/`nets`.
 * @returns {boolean} true si une propagation a effectivement eu lieu.
 */
function bridgeIfEligible(sourceKey, targetKey, uf, nets, pinSignals) {
  const sourceValue = pinSignals.get(sourceKey)
  if (sourceValue !== Signal.HIGH && sourceValue !== Signal.LOW) return false
  if (pinSignals.get(targetKey) !== Signal.UNKNOWN) return false

  const root = uf.find(targetKey)
  const netKeys = nets.get(root) ?? [targetKey]
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

function computeDcAnalysis(components, prepared, pinSignals) {
  const { uf } = prepared
  const supplyVoltage = getSimulationDefaultParameters("POWER").voltage
  const dcAnalysis = new Map()

  for (const comp of components) {
    const contribute = getDcContribution(comp.type)
    if (!contribute) continue

    const params = getSimulationDefaultParameters(comp.type)
    const pins = buildPinSignalMap(comp, uf, pinSignals)
    const contribution = contribute({ pins, params, supplyVoltage })
    if (contribution) dcAnalysis.set(comp.uid, contribution)
  }

  return dcAnalysis
}
