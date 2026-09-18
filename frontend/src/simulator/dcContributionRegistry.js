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
  //
  // A6-OUT1 : cette fonction est RÉUTILISÉE TELLE QUELLE (même référence de
  // fonction, voir DC_CONTRIBUTIONS ci-dessous) pour VIBRATION_MOTOR — pas
  // une copie. VIBRATION_MOTOR déclare exactement les mêmes broches
  // (plus/minus) et le même paramètre (resistance) que DC_MOTOR dans
  // canonicalRegistry.js ; il n'existe donc aucune raison physique ou
  // architecturale d'écrire une seconde fonction identique
  // (`vibrationMotorDc`) — cela dupliquerait `resistiveTwoTerminalDc` sans
  // rien y ajouter. Si VIBRATION_MOTOR devait un jour diverger
  // électriquement de DC_MOTOR, cette réutilisation serait le premier
  // endroit à revoir (introduire alors une fonction dédiée, jamais avant).
  return resistiveTwoTerminalDc(pins.plus, pins.minus, params.resistance, supplyVoltage)
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

/**
 * A5-D-PREQ : une configuration de reverse breakdown n'est exploitable que
 * si breakdownVoltage est fini et >= 0 ET breakdownResistance est fini et
 * > 0 (jamais de division par 0/négatif/NaN/Infinity/undefined). Toute
 * configuration invalide est traitée comme absente : la branche inverse
 * reste bloquée (current: 0), aucune valeur de secours n'est inventée.
 */
function isValidBreakdownParams(params) {
  return (
    isFiniteNumber(params?.breakdownVoltage) &&
    params.breakdownVoltage >= 0 &&
    isFiniteNumber(params?.breakdownResistance) &&
    params.breakdownResistance > 0
  )
}

/**
 * A5-D-PREQ — Factory générique pour la famille physique « diode ».
 *
 * Produit une fonction de contribution DC compatible avec le contrat du
 * Registry (`({ pins, params, supplyVoltage }) => { voltage, current } |
 * null`), partagée par DIODE et par le futur ZENER_DIODE (non implémenté
 * ici) : même branche directe (anode HIGH / cathode LOW → forwardVoltage /
 * onResistance), avec une branche inverse optionnellement configurable en
 * reverse breakdown plutôt qu'un blocage strict.
 *
 * `reverseBreakdown: false` (défaut, utilisé par DIODE) : la branche
 * inverse reste STRICTEMENT celle de la diode historique — courant nul, non
 * régression. `reverseBreakdown: true` active la lecture, à chaque appel,
 * de `params.breakdownVoltage`/`params.breakdownResistance` (jamais figés
 * à la construction de la factory — chaque composant fournit ses propres
 * valeurs effectives) : modèle Level-1 pédagogique DC, pas SPICE.
 * `current` reste une magnitude non signée (aucun courant négatif
 * introduit), conformément au contrat électrique existant.
 *
 * `anodePinId`/`cathodePinId` (A5-ZENER_DIODE) : identifiants de pins
 * canoniques à lire dans `pins` pour les rôles anode/cathode. Défaut
 * `'anode'`/`'cathode'` (identiques aux ids canoniques de DIODE, donc
 * comportement DIODE strictement inchangé). ZENER_DIODE réutilise cette
 * même famille physique mais son pack Founder PASS impose les ids
 * canoniques `'A'`/`'K'` (manifest.json `visiblePinOrder`/`polarity`) —
 * cette configuration évite toute duplication de `diodeFamilyDc` pour une
 * simple différence de nommage de pins, sans jamais introduire de
 * comparaison `type === "ZENER_DIODE"`.
 */
function createDiodeDcContribution({ reverseBreakdown = false, anodePinId = "anode", cathodePinId = "cathode" } = {}) {
  return function diodeFamilyDc({ pins, params, supplyVoltage }) {
    const anode = pins[anodePinId]
    const cathode = pins[cathodePinId]
    const forward = anode === Signal.HIGH && cathode === Signal.LOW
    const reverse = anode === Signal.LOW && cathode === Signal.HIGH
    if (!forward && !reverse) return null

    if (forward) {
      const effectiveVoltage = Math.max(0, supplyVoltage - params.forwardVoltage)
      return { voltage: supplyVoltage, current: effectiveVoltage / params.onResistance }
    }

    if (reverseBreakdown && isValidBreakdownParams(params)) {
      const reverseVoltage = supplyVoltage
      if (reverseVoltage >= params.breakdownVoltage) {
        const effectiveBreakdownVoltage = Math.max(0, reverseVoltage - params.breakdownVoltage)
        return { voltage: supplyVoltage, current: effectiveBreakdownVoltage / params.breakdownResistance }
      }
    }
    return { voltage: supplyVoltage, current: 0 }
  }
}

/**
 * MB-SIM-008 v2 : diode idéale à seuil, famille diode SANS reverse
 * breakdown (A5-D-PREQ : migration vers createDiodeDcContribution sans
 * changement observable — comportement historique STRICTEMENT préservé).
 */
const diodeDc = createDiodeDcContribution({ reverseBreakdown: false })

/**
 * A5-ZENER_DIODE : même famille physique diode que diodeDc ci-dessus, avec
 * reverse breakdown activé (A5-D-PREQ) et les ids de pins canoniques du
 * pack Founder PASS (A/K, pas anode/cathode). Aucune physique dupliquée,
 * aucune connaissance de "ZENER_DIODE" dans resolution.js/engine.js/etc.
 */
const zenerDiodeDc = createDiodeDcContribution({ reverseBreakdown: true, anodePinId: "A", cathodePinId: "K" })

/**
 * Contribution DC générique pour un composant « circuit ouvert en régime DC
 * établi » à deux bornes : I = 0 quelle que soit la polarité dès lors que le
 * composant est alimenté — un résultat physiquement correct, pas une
 * simplification arbitraire. Réutilisée par CAPACITOR (bornes pinA/pinB) et
 * POLARIZED_CAPACITOR (bornes plus/minus) : même physique, seuls les noms de
 * broches diffèrent selon le type appelant (même patron que
 * `resistiveTwoTerminalDc`).
 */
function openCircuitTwoTerminalDc(termA, termB, supplyVoltage) {
  if (!isSimplePoweredLoop(termA, termB)) return null
  return { voltage: supplyVoltage, current: 0 }
}

function capacitorDc({ pins, supplyVoltage }) {
  return openCircuitTwoTerminalDc(pins.pinA, pins.pinB, supplyVoltage)
}

function polarizedCapacitorDc({ pins, supplyVoltage }) {
  // FT-C-COMP-002 : régime DC établi uniquement, comportement identique à
  // CAPACITOR. La polarité est conservée structurellement (bornes plus/minus)
  // mais n'a aucune conséquence DC : circuit ouvert dans les deux sens.
  return openCircuitTwoTerminalDc(pins.plus, pins.minus, supplyVoltage)
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

/**
 * A8-PREQ : interrupteur DC commandé Level-1, sans physique de
 * semi-conducteur. Les rôles de pins et le signal actif sont explicites.
 * La boucle conserve ses deux orientations historiques ; UNKNOWN et
 * FLOATING bloquent la conduction. Les entrées ne sont jamais mutées.
 */
export function createControlledDcSwitchContribution(config) {
  if (config === null || typeof config !== "object") {
    throw new TypeError("Controlled DC switch configuration must be an object")
  }
  const { terminalAPinId, terminalBPinId, controlPinId, activeControlSignal } = config
  const pinIds = [terminalAPinId, terminalBPinId, controlPinId]
  if (pinIds.some((id) => typeof id !== "string" || id.trim() === "")) {
    throw new TypeError("Controlled DC switch pin IDs must be non-empty strings")
  }
  if (new Set(pinIds).size !== pinIds.length) {
    throw new TypeError("Controlled DC switch pin IDs must be distinct")
  }
  if (activeControlSignal !== Signal.HIGH && activeControlSignal !== Signal.LOW) {
    throw new TypeError("Controlled DC switch active signal must be HIGH or LOW")
  }
  return function controlledDcSwitchDc({ pins, params, supplyVoltage }) {
    const terminalA = pins[terminalAPinId]
    const terminalB = pins[terminalBPinId]
    const control = pins[controlPinId]
    if (!isSimplePoweredLoop(terminalA, terminalB)) return null
    return {
      voltage: supplyVoltage,
      current: control === activeControlSignal ? supplyVoltage / params.onResistance : 0,
    }
  }
}

// Modèle NPN pédagogique historique : aucune physique transistor ajoutée.
const npnTransistorDc = createControlledDcSwitchContribution({
  terminalAPinId: "collector",
  terminalBPinId: "emitter",
  controlPinId: "base",
  activeControlSignal: Signal.HIGH,
})

const nmosDc = createControlledDcSwitchContribution({
  terminalAPinId: "drain",
  terminalBPinId: "source",
  controlPinId: "gate",
  activeControlSignal: Signal.HIGH,
})

const pmosDc = createControlledDcSwitchContribution({
  terminalAPinId: "drain",
  terminalBPinId: "source",
  controlPinId: "gate",
  activeControlSignal: Signal.LOW,
})

const pnpTransistorDc = createControlledDcSwitchContribution({
  terminalAPinId: "collector",
  terminalBPinId: "emitter",
  controlPinId: "base",
  activeControlSignal: Signal.LOW,
})

function tmp36Dc({ pins, params }) {
  // A7-C1 : +Vs/GND sont DIRECTIONNELS (rôles power/ground, comme
  // SERVO/ARDUINO) — à la différence des paires non polarisées A/B
  // (RESISTOR/LDR/THERMISTOR/LIGHT_BULB), l'alimentation n'est reconnue que
  // dans le bon sens (+Vs=HIGH, GND=LOW), jamais l'inverse (même principe de
  // directionnalité que diodeDc/npnTransistorDc) : un TMP36 mal alimenté ou
  // non alimenté ne produit aucune sortie valide (absent de dcAnalysis,
  // Observation retourne UNAVAILABLE — cf. §17 du ticket).
  //
  // `params.outputVoltage` est déjà la tension EFFECTIVE : soit le fallback
  // canonique (aucun stimulus TEMPERATURE actif), soit la valeur produite
  // par `environmentalResponseRegistry.js` à partir de TEMPERATURE — cette
  // fonction ne fait qu'exposer cette tension une fois l'alimentation
  // vérifiée, jamais de calcul de température ici (séparation des
  // responsabilités, §13 du ticket). `current: 0` : Vout est un point de
  // mesure haute impédance (aucun modèle de charge/consommation Vout à ce
  // niveau de simulation), supplyVoltage n'intervient pas dans le résultat
  // (TMP36 n'est pas une charge résistive du bus d'alimentation dans ce
  // modèle simplifié).
  if (pins.plus !== Signal.HIGH || pins.gnd !== Signal.LOW) return null
  return { voltage: params.outputVoltage, current: 0 }
}

function soilMoistureSensorDc({ pins, params, supplyVoltage }) {
  // A7-C3 — VCC/GND sont DIRECTIONNELS (mêmes rôles power/ground que TMP36) :
  // seule la bonne polarité (VCC=HIGH, GND=LOW) produit une sortie AO valide,
  // exactement le même principe que tmp36Dc ci-dessus (§7 du ticket, réutilise
  // l'infrastructure PREQ2 en amont — resolveSignals() reste l'unique
  // fournisseur de pins.VCC/pins.GND, aucune branche SOIL dans resolution.js).
  //
  // AO voltage = supplyVoltage × analogRatio (§9 du ticket) : `analogRatio`
  // est déjà la valeur EFFECTIVE (fallback canonique, ou produite par
  // environmentalResponseRegistry.js sous MOISTURE actif) — aucun calcul de
  // MOISTURE ici, cette fonction ne fait qu'appliquer la formule de tension.
  // `current: 0` : AO est un point de mesure haute impédance, même convention
  // que Vout de TMP36 (aucun modèle de charge à ce niveau de simulation).
  if (pins.VCC !== Signal.HIGH || pins.GND !== Signal.LOW) return null
  return { voltage: supplyVoltage * params.analogRatio, current: 0 }
}

const DC_CONTRIBUTIONS = new Map([
  ["RESISTOR", resistorDc],
  ["LDR", ldrDc],
  ["THERMISTOR", thermistorDc],
  ["DC_MOTOR", dcMotorDc],
  // A6-OUT1 : VIBRATION_MOTOR pointe vers LA MÊME fonction que DC_MOTOR
  // (référence partagée, pas une fonction "vibrationMotorDc" dupliquée) —
  // voir le commentaire de dcMotorDc ci-dessus pour la justification.
  ["VIBRATION_MOTOR", dcMotorDc],
  // A6-OUT2 : LIGHT_BULB est une charge résistive DC simple à deux bornes
  // NON polarisée, exactement le même contrat que RESISTOR (pins canoniques
  // 'A'/'B', paramètre 'resistance') — pas une différence de câblage comme
  // pour VIBRATION_MOTOR/DC_MOTOR (pins 'plus'/'minus'). Elle pointe donc
  // vers LA MÊME fonction que RESISTOR (référence partagée, aucune fonction
  // "lightBulbDc" dupliquée) plutôt que de rappeler resistiveTwoTerminalDc
  // séparément : même pins, même paramètre, même physique, donc littéralement
  // le même contributeur. Si LIGHT_BULB devait un jour diverger électriquement
  // (ex. modèle thermique de filament), ce point serait le premier à revoir.
  ["LIGHT_BULB", resistorDc],
  // A6-OUT3 : HOBBY_GEARMOTOR pointe vers LA MÊME fonction que DC_MOTOR
  // (référence partagée, comme VIBRATION_MOTOR ci-dessus) — mêmes broches
  // canoniques plus/minus, même paramètre resistance, même physique
  // simplifiée. Aucune fonction dédiée à ce composant, aucun solveur de
  // réducteur mécanique n'existe : le réducteur n'entre dans aucun modèle
  // électrique à ce niveau de simulation (Level 1).
  ["HOBBY_GEARMOTOR", dcMotorDc],
  ["DIODE", diodeDc],
  ["ZENER_DIODE", zenerDiodeDc],
  ["CAPACITOR", capacitorDc],
  ["POLARIZED_CAPACITOR", polarizedCapacitorDc],
  ["POTENTIOMETER", potentiometerDc],
  ["NPN_TRANSISTOR", npnTransistorDc],
  ["PNP_TRANSISTOR", pnpTransistorDc],
  ["NMOS", nmosDc],
  ["PMOS", pmosDc],
  ["TMP36", tmp36Dc],
  // A7-C2 : FORCE_SENSOR et FLEX_SENSOR sont des capteurs résistifs à deux
  // bornes NON polarisées, exactement le même contrat que RESISTOR/LIGHT_BULB
  // (pins canoniques 'A'/'B', paramètre 'resistance') — pas de câblage
  // plus/minus comme DC_MOTOR. Ils pointent donc vers LA MÊME fonction que
  // RESISTOR (référence partagée, aucune fonction "forceSensorDc"/
  // "flexSensorDc" dupliquée) : même pins, même paramètre, même physique.
  // La résistance EFFECTIVE reçue ici (params.resistance) est déjà celle
  // produite par environmentalResponseRegistry.js sous stimulus FORCE/FLEX
  // actif, ou le fallback canonique sinon — cette fonction ne calcule rien
  // de spécifique à FORCE/FLEX, elle ne fait qu'appliquer la loi d'Ohm
  // générique (aucune branche if(type==='FORCE_SENSOR') introduite ici).
  ["FORCE_SENSOR", resistorDc],
  ["FLEX_SENSOR", resistorDc],
  ["SOIL_MOISTURE_SENSOR", soilMoistureSensorDc],
])

/**
 * @param {string} type
 * @returns {((ctx: { pins: Record<string, string>, params: Record<string, number>, supplyVoltage: number }) => ({voltage:number, current:number} | null)) | null}
 */
export function getDcContribution(type) {
  return DC_CONTRIBUTIONS.get(type) ?? null
}

/**
 * A5-D-PREQ : exportée pour permettre au futur ZENER_DIODE (ticket
 * suivant, hors scope ici) de réutiliser cette même primitive, et pour
 * qualifier le contrat reverse breakdown par fixture de test dans ce
 * ticket sans enregistrer de composant de production.
 */
export { createDiodeDcContribution }

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
