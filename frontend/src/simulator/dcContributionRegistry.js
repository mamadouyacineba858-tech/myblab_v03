import { Signal } from "./signals.js"

/**
 * MB-SIM-008 v2 — Registre des contributions DC (ADR-006).
 *
 * ADR-006 décrit un « Registry des modèles de simulation » associant
 * `type de composant → fonction de contribution qui définit comment ce
 * composant participe aux équations du circuit ». Ce fichier EST cette
 * association pour l'analyse DC : `resolution.js` ne contient plus aucune
 * branche `if (comp.type === "X")` — il consulte uniquement
 * `getDcContribution(type)` et appelle la fonction retournée, de façon
 * générique, quel que soit le type.
 *
 * Choix architectural délibéré, à valider par le CSA (voir le rapport de
 * livraison, section « Écarts »).
 * `simulator/models/*.js` (PowerModel, ResistorModel, LdrModel,
 * ThermistorModel) portent aujourd'hui EXCLUSIVEMENT `{ type, validate() }`
 * — un contrat couvert par 4 suites de tests dédiées
 * (`__tests__/models/*.test.js`) qui vérifient explicitement l'absence de
 * `solve`/`compute` sur ces objets (« Conformité au contrat MB-SIM-001 /
 * ADR-012 »). ADR-012 (§4, orientation validée CSA bien que le document
 * reste PROPOSED) pose par ailleurs une frontière stricte entre Registry
 * canonique (connaissance déclarative) et Simulation (comportement et
 * calcul), et son §11 affirme explicitement que le calcul de
 * `computeDcAnalysis` reste porté par la Résolution, pas par le Registry.
 *
 * Plutôt que d'ajouter `computeDcContribution()` directement sur les
 * objets `models/*.js` (ce qui aurait modifié le contrat déjà couvert par
 * ces 4 suites de tests, et aurait fait porter une logique de calcul par
 * des fichiers dont l'intitulé même des tests dit qu'ils ne le doivent
 * pas), ce module introduit un second registre, dédié, séparé des
 * modèles de validation : mêmes propriétés architecturales qu'exigées par
 * ADR-006 (association type → fonction de contribution, Open/Closed —
 * ajouter un composant n'impose aucune modification de `resolution.js`),
 * sans toucher au contrat existant de `models/*.js` ni à `canonicalRegistry.js`
 * (qui reste purement déclaratif, conformément à ADR-012 §4).
 */

function isSimplePoweredLoop(pinA, pinB) {
  return (
    (pinA === Signal.HIGH && pinB === Signal.LOW) ||
    (pinA === Signal.LOW && pinB === Signal.HIGH)
  )
}

/**
 * Contribution DC générique pour un composant résistif à deux broches
 * (loi d'Ohm, I = U / R). Réutilisée par RESISTOR, LDR, THERMISTOR et
 * DC_MOTOR : même physique simplifiée, seuls les noms de broches et le
 * paramètre de résistance diffèrent selon le type appelant.
 */
function resistiveTwoTerminalDc(pinA, pinB, resistance, supplyVoltage) {
  if (!isSimplePoweredLoop(pinA, pinB)) return null
  return { voltage: supplyVoltage, current: supplyVoltage / resistance }
}

function resistorDc({ pins, params, supplyVoltage }) {
  return resistiveTwoTerminalDc(pins.A, pins.B, params.resistance, supplyVoltage)
}

function ldrDc({ pins, params, supplyVoltage }) {
  return resistiveTwoTerminalDc(pins.A, pins.B, params.resistance, supplyVoltage)
}

function thermistorDc({ pins, params, supplyVoltage }) {
  return resistiveTwoTerminalDc(pins.A, pins.B, params.resistance, supplyVoltage)
}

function dcMotorDc({ pins, params, supplyVoltage }) {
  // MB-SIM-008 v2 : modèle électrique DC simplifié uniquement (résistance
  // fixe équivalente du bobinage). Aucun comportement mécanique (vitesse,
  // couple, inertie, FEM dynamique) — hors périmètre, voir DcMotorModel.js.
  return resistiveTwoTerminalDc(pins.plus, pins.minus, params.resistance, supplyVoltage)
}

function diodeDc({ pins, params, supplyVoltage }) {
  // MB-SIM-008 v2 : diode idéale à seuil. Conduit uniquement si polarisée
  // en direct (anode HIGH, cathode LOW) ; bloquée en polarisation inverse
  // (courant nul, mais entrée reportée pour rendre le blocage observable) ;
  // absente de dcAnalysis si le composant n'est simplement pas alimenté.
  const { anode, cathode } = pins
  const forward = anode === Signal.HIGH && cathode === Signal.LOW
  const reverse = anode === Signal.LOW && cathode === Signal.HIGH
  if (!forward && !reverse) return null
  if (reverse) return { voltage: supplyVoltage, current: 0 }
  const effectiveVoltage = Math.max(0, supplyVoltage - params.forwardVoltage)
  return { voltage: supplyVoltage, current: effectiveVoltage / params.onResistance }
}

function capacitorDc({ pins, supplyVoltage }) {
  // MB-SIM-008 v2 : régime DC établi uniquement. I = 0 quelle que soit la
  // polarité dès lors que le composant est alimenté (circuit ouvert) — un
  // résultat physiquement correct, pas une simplification arbitraire.
  if (!isSimplePoweredLoop(pins.pinA, pins.pinB)) return null
  return { voltage: supplyVoltage, current: 0 }
}

function potentiometerDc({ pins, params, supplyVoltage }) {
  // MB-SIM-008 v2 : trois cas mutuellement exclusifs selon la paire de
  // broches effectivement alimentée. Priorité LEFT↔RIGHT (piste complète)
  // si les deux extrémités sont alimentées, sinon LEFT↔WIPER ou
  // WIPER↔RIGHT selon la résistance équivalente déterminée par `position`
  // (voir PotentiometerModel.js pour la justification de ce choix).
  const { left, wiper, right } = pins
  const { resistance, position } = params

  if (isSimplePoweredLoop(left, right)) {
    return { voltage: supplyVoltage, current: supplyVoltage / resistance }
  }
  if (isSimplePoweredLoop(left, wiper)) {
    const equivalentResistance = resistance * position
    if (equivalentResistance <= 0) return null // curseur en butée LEFT : cas limite (court-circuit) non modélisé
    return { voltage: supplyVoltage, current: supplyVoltage / equivalentResistance }
  }
  if (isSimplePoweredLoop(wiper, right)) {
    const equivalentResistance = resistance * (1 - position)
    if (equivalentResistance <= 0) return null // curseur en butée RIGHT : cas limite (court-circuit) non modélisé
    return { voltage: supplyVoltage, current: supplyVoltage / equivalentResistance }
  }
  return null
}

function npnTransistorDc({ pins, params, supplyVoltage }) {
  // MB-SIM-008 v2 : interrupteur commandé. Le couple collecteur/émetteur
  // doit former une boucle alimentée pour qu'un contexte électrique existe
  // ; BASE détermine ensuite conduction (HIGH) ou blocage (LOW/UNKNOWN/
  // FLOATING, courant nul mais entrée reportée pour rendre le blocage
  // observable).
  const { collector, base, emitter } = pins
  if (!isSimplePoweredLoop(collector, emitter)) return null
  if (base === Signal.HIGH) {
    return { voltage: supplyVoltage, current: supplyVoltage / params.onResistance }
  }
  return { voltage: supplyVoltage, current: 0 }
}

const DC_CONTRIBUTIONS = new Map([
  ["RESISTOR", resistorDc],
  ["LDR", ldrDc],
  ["THERMISTOR", thermistorDc],
  ["DC_MOTOR", dcMotorDc],
  ["DIODE", diodeDc],
  ["CAPACITOR", capacitorDc],
  ["POTENTIOMETER", potentiometerDc],
  ["NPN_TRANSISTOR", npnTransistorDc],
])

/**
 * @param {string} type
 * @returns {((ctx: { pins: Record<string, string>, params: Record<string, number>, supplyVoltage: number }) => ({voltage:number, current:number} | null)) | null}
 */
export function getDcContribution(type) {
  return DC_CONTRIBUTIONS.get(type) ?? null
}

export function hasDcContribution(type) {
  return DC_CONTRIBUTIONS.has(type)
}

export function getAllDcContributionTypes() {
  return Object.freeze([...DC_CONTRIBUTIONS.keys()])
}

/**
 * MB-SIM-015 (ruling CSA, GATE 1 PASS / GATE 2 AUTHORIZED, 2026-08-20).
 *
 * Registre déclaratif des composants passifs à deux bornes considérés,
 * dans ce modèle simplifié, comme des « conducteurs inconditionnels » pour
 * les besoins de la propagation logique dérivée de resolution.js : un
 * composant listé ici ne bloque jamais la continuité entre ses deux bornes
 * déclarées (contrairement à DIODE/NPN_TRANSISTOR, conditionnels, ou à
 * CAPACITOR, un circuit ouvert en régime DC établi).
 *
 * Ruling CSA explicite pour ce ticket : seul RESISTOR est autorisé
 * maintenant. LDR/THERMISTOR/DC_MOTOR partagent la même forme physique
 * (resistiveTwoTerminalDc) mais sont volontairement reportés à un ticket
 * ultérieur pour ne pas élargir le périmètre de MB-SIM-015 au-delà de ce
 * qui est nécessaire pour reproduire et corriger le bug. DIODE, CAPACITOR,
 * POTENTIOMETER et NPN_TRANSISTOR restent explicitement exclus (voir leurs
 * fonctions de contribution ci-dessus pour la justification physique de
 * chaque exclusion).
 *
 * resolution.js ne doit consulter cette capacité que via
 * getUnconditionalConductionPinPair(type) — jamais par une comparaison
 * littérale comp.type === "RESISTOR" (verrouillé par
 * resolutionArchitecture.test.js).
 */
const UNCONDITIONAL_CONDUCTION_PIN_PAIRS = new Map([
  ["RESISTOR", ["A", "B"]],
])

/**
 * @param {string} type
 * @returns {[string, string] | null} La paire de broches (ids canoniques)
 *   considérée comme un conducteur inconditionnel pour ce type, ou null si
 *   ce type n'est pas éligible à la propagation passive dérivée.
 */
export function getUnconditionalConductionPinPair(type) {
  return UNCONDITIONAL_CONDUCTION_PIN_PAIRS.get(type) ?? null
}
