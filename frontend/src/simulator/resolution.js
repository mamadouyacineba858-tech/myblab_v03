import { Signal } from "./signals.js"
import { getSimulationDefaultParameters } from "./simulationRegistry.js"
import { getCanonicalEntry } from "./canonicalRegistry.js"
import { getDcContribution } from "./dcContributionRegistry.js"

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

  const dcAnalysis = computeDcAnalysis(components, prepared, pinSignals)
  return { pinSignals, dcAnalysis }
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
