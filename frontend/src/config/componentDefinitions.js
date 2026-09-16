import { createUid } from "../utils/ids.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"

const PIN_PRESENTATION_BY_TYPE = {
  BATTERY_AA: [
    { id: "plus", label: "+", dx: 28.5, dy: 10.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 28.5, dy: 10.5, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "−", dx: 12.5, dy: 10.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 12.5, dy: 10.5, wireConnectable: true, breadboardInsertable: false }] },
  ],
  COIN_CELL_CR2032: [
    { id: "plus", label: "+", dx: 30.5, dy: 8.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 30.5, dy: 8.5, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "−", dx: 30.5, dy: 52.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 30.5, dy: 52.5, wireConnectable: true, breadboardInsertable: false }] },
  ],
  BATTERY_9V: [
    { id: "plus", label: "+", dx: 50.5, dy: 12.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 50.5, dy: 12.5, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "−", dx: 20.5, dy: 12.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 20.5, dy: 12.5, wireConnectable: true, breadboardInsertable: false }] },
  ],
  LED: [
    { id: "anode", label: "Anode", dx: 28, dy: 62 },
    { id: "cathode", label: "Cathode", dx: 52, dy: 62 },
  ],
  RESISTOR: [
    { id: "A", label: "A", dx: 0, dy: 14 },
    { id: "B", label: "B", dx: 84, dy: 14 },
  ],
  ARDUINO: [
    { id: "D2", label: "D2", dx: 0, dy: 50, contacts: [{ id: "D2", dx: 3, dy: 50, wireConnectable: true, breadboardInsertable: false }] },
    { id: "D3", label: "D3", dx: 0, dy: 75, contacts: [{ id: "D3", dx: 15, dy: 75, wireConnectable: true, breadboardInsertable: false }] },
    { id: "GND", label: "GND", dx: 0, dy: 110, contacts: [{ id: "GND", dx: 15, dy: 108, wireConnectable: true, breadboardInsertable: false }] },
    { id: "5V", label: "5V", dx: 120, dy: 50, contacts: [{ id: "5V", dx: 115, dy: 50, wireConnectable: true, breadboardInsertable: false }] },
  ],
  BUTTON: [
    { id: "pin1", label: "1", dx: 14, dy: 30, contacts: [{ id: "1a", dx: 14, dy: 58, wireConnectable: true, breadboardInsertable: true }, { id: "1b", dx: 14, dy: 2, wireConnectable: true, breadboardInsertable: true }] },
    { id: "pin2", label: "2", dx: 46, dy: 30, contacts: [{ id: "2a", dx: 46, dy: 58, wireConnectable: true, breadboardInsertable: true }, { id: "2b", dx: 46, dy: 2, wireConnectable: true, breadboardInsertable: true }] },
  ],
  BUTTON_LATCHING: [
    { id: "pin1", label: "1", dx: 13, dy: 30, contacts: [{ id: "1a", dx: 13, dy: 58, wireConnectable: true, breadboardInsertable: true }, { id: "1b", dx: 13, dy: 2, wireConnectable: true, breadboardInsertable: true }] },
    { id: "pin2", label: "2", dx: 47, dy: 30, contacts: [{ id: "2a", dx: 47, dy: 58, wireConnectable: true, breadboardInsertable: true }, { id: "2b", dx: 47, dy: 2, wireConnectable: true, breadboardInsertable: true }] },
  ],
  POWER: [
    { id: "5V", label: "+5V", dx: 70, dy: 37, contacts: [{ id: "5V", dx: 35, dy: 67, wireConnectable: true, breadboardInsertable: false }] },
    { id: "GND", label: "GND", dx: 58, dy: 25, contacts: [{ id: "GND", dx: 22, dy: 67, wireConnectable: true, breadboardInsertable: false }] },
  ],
  CAPACITOR: [
    { id: "pinA", label: "A", dx: 0, dy: 20, contacts: [{ id: "pinA", dx: 23, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
    { id: "pinB", label: "B", dx: 70, dy: 20, contacts: [{ id: "pinB", dx: 47, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // FT-C-COMP-002 — condensateur électrolytique radial polarisé. Boîte
  // canonique 33×120 = pixels natifs @1x de l'asset raster (portrait, corps
  // bleu + bande négative à GAUCHE + deux pattes). PhysicalContacts =
  // extrémités FONCTIONNELLES des pattes : `minus` (côté bande négative,
  // gauche) et `plus` (droite), entraxe 24 = 2 × BREADBOARD_PITCH (12) —
  // exact, donc enfichable proprement. Les pattes cuites dans le raster
  // sont masquées par `bodyClip` (assemblyProfiles.js) ; la géométrie
  // finale des pattes est rendue par AssemblyLeadsLayer entre `root`
  // (assemblyProfiles.js) et ces contacts. La longueur fonctionnelle est
  // harmonisée avec LED/LDR/THERMISTOR : root y=48 → contact y=80 (~32 px).
  POLARIZED_CAPACITOR: [
    { id: "plus", label: "+", dx: 28, dy: 80, contacts: [{ id: "plus", dx: 28, dy: 80, wireConnectable: true, breadboardInsertable: true }] },
    { id: "minus", label: "−", dx: 4, dy: 80, contacts: [{ id: "minus", dx: 4, dy: 80, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // FT-C-COMP-004 — buzzer piézo TRAVERSANT réaliste (asset 120×120). Les deux
  // pattes métalliques sont cuites dans le raster autour de x≈42 / 77, y≈79..114
  // (probe pixel ; PO probe 44 / 76, entraxe 32). Pour l'insertion breadboard
  // les deux PhysicalContacts fonctionnels sont recalés à dx 42 / 78 (entraxe
  // 36 = 3 × BREADBOARD_PITCH exact, centrés sur les deux pieds visibles) et
  // dy 108 (= probe `canonical.pins` du manifeste ; 9 × BREADBOARD_PITCH).
  // AssemblyLeadsLayer relie racine visuelle → contact (pattes fines droites).
  // IDs, rôles et modèle électrique (plus / minus, role input) INCHANGÉS —
  // aucune nouvelle simulation, aucun état "on".
  BUZZER: [
    { id: "plus", label: "+", dx: 42, dy: 108, contacts: [{ id: "plus", dx: 42, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "minus", label: "-", dx: 78, dy: 108, contacts: [{ id: "minus", dx: 78, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // FT-C-COMP-003 — potentiomètre ROTATIF réaliste (asset 120×120). Les 3
  // cosses métalliques verticales sont cuites dans le raster autour de
  // x≈42 / 60 / 78 (probe pixel ; PO probe 40/60/80). Pour l'insertion
  // breadboard les 3 PhysicalContacts fonctionnels sont recalés à
  // dx 36 / 60 / 84 (entraxe 24 = 2 × BREADBOARD_PITCH exact, `wiper` aligné
  // sur la cosse centrale) et dy 108 (multiple exact de 12 ; = probe
  // `canonical.pins` du manifeste). AssemblyLeadsLayer relie racine visuelle
  // → contact avec un léger évasement des cosses extérieures. IDs, rôles et
  // modèle électrique (left/wiper/right, resistance, position) INCHANGÉS.
  POTENTIOMETER: [
    { id: "left", label: "L", dx: 36, dy: 108, contacts: [{ id: "left", dx: 36, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "wiper", label: "W", dx: 60, dy: 108, contacts: [{ id: "wiper", dx: 60, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "right", label: "R", dx: 84, dy: 108, contacts: [{ id: "right", dx: 84, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
  ],
  LDR: [
    { id: "A", label: "A", dx: 0, dy: 18, contacts: [{ id: "A", dx: 30, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 84, dy: 18, contacts: [{ id: "B", dx: 54, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
  ],
  THERMISTOR: [
    { id: "A", label: "A", dx: 0, dy: 18, contacts: [{ id: "A", dx: 30, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 84, dy: 18, contacts: [{ id: "B", dx: 54, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
  ],
  DIODE: [
    { id: "anode", label: "A", dx: 0, dy: 15 },
    { id: "cathode", label: "K", dx: 84, dy: 15 },
  ],
  RGB_LED: [
    { id: "R", label: "R", dx: 19, dy: 56, contacts: [{ id: "R", dx: 19, dy: 72, wireConnectable: true, breadboardInsertable: true }] },
    { id: "common", label: "COM", dx: 35, dy: 56, contacts: [{ id: "common", dx: 35, dy: 72, wireConnectable: true, breadboardInsertable: true }] },
    { id: "G", label: "G", dx: 53, dy: 56, contacts: [{ id: "G", dx: 53, dy: 72, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 71, dy: 56, contacts: [{ id: "B", dx: 71, dy: 72, wireConnectable: true, breadboardInsertable: true }] },
  ],
  NPN_TRANSISTOR: [
    { id: "collector", label: "C", dx: 45, dy: 0, contacts: [{ id: "C", dx: 42.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
    { id: "base", label: "B", dx: 0, dy: 45, contacts: [{ id: "B", dx: 31.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
    { id: "emitter", label: "E", dx: 90, dy: 45, contacts: [{ id: "E", dx: 53.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
  ],
  SERVO: [
    { id: "signal", label: "SIG", dx: 90, dy: 20, breadboardInsertable: false },
    { id: "vcc", label: "VCC", dx: 90, dy: 35, breadboardInsertable: false },
    { id: "gnd", label: "GND", dx: 90, dy: 50, breadboardInsertable: false },
  ],
  // MB-L1-PROP-009 — le Core reste inchangé (+ à 0,25 ; - à 84,25), mais
  // les PhysicalContacts de présentation suivent désormais les DEUX vraies
  // cosses électriques de l'overlay arrière. L'arbre mécanique à droite n'est
  // jamais connectable. Le moteur reste non-insérable sur breadboard.
  DC_MOTOR: [
    { id: "plus", label: "+", dx: 0, dy: 25, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 3.5, dy: 16, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "-", dx: 84, dy: 25, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 3.5, dy: 34, wireConnectable: true, breadboardInsertable: false }] },
  ],
  // A3-SW1 — Slide Switch (SPDT). Renderer CSS/DOM (SlideSwitchPart.jsx),
  // A3-SW3 : géométrie déjà compatible BREADBOARD_PITCH=12 SANS modification
  // (12, 36, 60 sont tous des multiples exacts de 12 ; dy=44 uniforme pour les
  // 3 contacts) — démontré par breadboardSwitchFit.test.js (T1-T4). Un seul
  // changement : breadboardInsertable false -> true (pin-level + contact-level).
  SLIDE_SWITCH: [
    { id: "throwA", label: "A", dx: 12, dy: 44, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "throwA", dx: 12, dy: 44, wireConnectable: true, breadboardInsertable: true }] },
    { id: "common", label: "C", dx: 36, dy: 44, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "common", dx: 36, dy: 44, wireConnectable: true, breadboardInsertable: true }] },
    { id: "throwB", label: "B", dx: 60, dy: 44, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "throwB", dx: 60, dy: 44, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A3-SW3 : géométrie CORRIGÉE — l'espacement A3-SW2 d'origine (8,20,36,48,
  // 64,76,92,104 = alternance 12/16) mélangeait TROIS résidus mod 12 distincts
  // (8, 0, 4) : aucune origine commune ne pouvait aligner les 8 contacts sur le
  // pitch breadboard à la fois (démontré par breadboardSwitchFit.test.js avant
  // correction). Corrigé en espacement UNIFORME de 12 (8 pattes réellement au
  // pas 0.1", conforme à l'asset réel : un DIP switch à corps DIP-8 breadboard-
  // friendly a ses 8 broches à pas constant, cf. rapport final §D) :
  // 14,26,38,50,62,74,86,98 (7 intervalles de 12, centrés dans la boîte
  // canonique 112 large, marge 14 de chaque côté). dy=50 inchangé (rangée
  // unique — l'asset ne montre PAS deux rangées opposées, cf. rapport final
  // §D). Topologie électrique 1A/1B/2A/2B/3A/3B/4A/4B INCHANGÉE : seule la
  // géométrie PHYSIQUE de présentation est corrigée. breadboardInsertable
  // false -> true (pin-level + contact-level) après preuve géométrique.
  DIP_SWITCH: [
    { id: "1A", label: "1A", dx: 14, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1A", dx: 14, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1B", label: "1B", dx: 26, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1B", dx: 26, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2A", label: "2A", dx: 38, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2A", dx: 38, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2B", label: "2B", dx: 50, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2B", dx: 50, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "3A", label: "3A", dx: 62, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "3A", dx: 62, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "3B", label: "3B", dx: 74, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "3B", dx: 74, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "4A", label: "4A", dx: 86, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "4A", dx: 86, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "4B", label: "4B", dx: 98, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "4B", dx: 98, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A6-OUT1 — Vibration Motor : réutilisation de la famille DC_MOTOR (même
  // contrat électrique plus/minus, cf. canonicalRegistry.js). Boîte
  // canonique portrait 50×70 (renderer CSS/DOM VibrationMotorPart.jsx : petit
  // corps cylindrique en haut, deux pattes-fil souples verticales en bas).
  // Aucun asset raster Founder-approved n'existe encore (ticket §8) : les
  // deux PhysicalContacts tombent sur l'extrémité basse des pattes dessinées
  // par le renderer, exactement comme le corps l'exige (pas de recalage
  // ultérieur nécessaire). breadboardInsertable:false par défaut, comme
  // DC_MOTOR (aucune géométrie enfichable démontrée).
  VIBRATION_MOTOR: [
    { id: "plus", label: "+", dx: 18, dy: 68, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 18, dy: 68, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "-", dx: 32, dy: 68, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 32, dy: 68, wireConnectable: true, breadboardInsertable: false }] },
  ],
}

function buildPins(type) {
  const canonicalEntry = getCanonicalEntry(type)
  const presentationPins = PIN_PRESENTATION_BY_TYPE[type]
  if (!canonicalEntry || !presentationPins) throw new Error(`Unknown component pin definition: ${type}`)
  const presentationById = new Map()
  for (const presentationPin of presentationPins) {
    if (presentationById.has(presentationPin.id)) throw new Error(`Duplicate presentation pin id for component ${type}: ${presentationPin.id}`)
    presentationById.set(presentationPin.id, presentationPin)
  }
  if (canonicalEntry.pins.length !== presentationPins.length) throw new Error(`Pin count mismatch for component ${type}`)
  return canonicalEntry.pins.map((canonicalPin) => {
    const presentationPin = presentationById.get(canonicalPin.id)
    if (!presentationPin) throw new Error(`Missing presentation pin for component ${type}: ${canonicalPin.id}`)
    return {
      ...canonicalPin,
      label: presentationPin.label,
      dx: presentationPin.dx,
      dy: presentationPin.dy,
      ...(typeof presentationPin.wireConnectable === "boolean" ? { wireConnectable: presentationPin.wireConnectable } : {}),
      ...(typeof presentationPin.breadboardInsertable === "boolean" ? { breadboardInsertable: presentationPin.breadboardInsertable } : {}),
      ...(Array.isArray(presentationPin.contacts) ? { contacts: presentationPin.contacts.map((c) => ({ ...c })) } : {}),
    }
  })
}

export const COMPONENT_TYPES = {
  LED: { id: "LED", label: "LED", icon: "💡", width: 80, height: 64, pins: buildPins("LED") },
  RESISTOR: { id: "RESISTOR", label: "Résistance", icon: "〰️", width: 84, height: 28, pins: buildPins("RESISTOR") },
  ARDUINO: { id: "ARDUINO", label: "Arduino UNO", icon: "🤖", width: 120, height: 140, pins: buildPins("ARDUINO") },
  BUTTON: { id: "BUTTON", label: "Bouton", icon: "🔘", width: 60, height: 60, pins: buildPins("BUTTON"), interaction: { type: "momentary" }, initialState: "released" },
  BUTTON_LATCHING: { id: "BUTTON_LATCHING", label: "Interrupteur", icon: "🔲", width: 60, height: 60, pins: buildPins("BUTTON_LATCHING"), interaction: { type: "latching" }, initialState: "off" },
  POWER: { id: "POWER", label: "Alimentation", icon: "⚡", width: 70, height: 90, pins: buildPins("POWER") },
  BATTERY_AA: { id: "BATTERY_AA", label: "Pile AA 1,5 V", icon: "🔋", width: 40, height: 100, pins: buildPins("BATTERY_AA") },
  COIN_CELL_CR2032: { id: "COIN_CELL_CR2032", label: "Pile CR2032 3 V", icon: "🔋", width: 60, height: 60, pins: buildPins("COIN_CELL_CR2032") },
  BATTERY_9V: { id: "BATTERY_9V", label: "Pile 9 V", icon: "🔋", width: 70, height: 90, pins: buildPins("BATTERY_9V") },
  CAPACITOR: { id: "CAPACITOR", label: "Condensateur", icon: "║║", width: 70, height: 40, pins: buildPins("CAPACITOR") },
  BUZZER: { id: "BUZZER", label: "Buzzer", icon: "🔊", width: 120, height: 120, pins: buildPins("BUZZER") },
  POTENTIOMETER: { id: "POTENTIOMETER", label: "Potentiomètre", icon: "🎚", width: 120, height: 120, pins: buildPins("POTENTIOMETER") },
  LDR: { id: "LDR", label: "Photoresistance (LDR)", icon: "☀️", width: 84, height: 36, pins: buildPins("LDR") },
  THERMISTOR: { id: "THERMISTOR", label: "Thermistance", icon: "🌡", width: 84, height: 36, pins: buildPins("THERMISTOR") },
  DIODE: { id: "DIODE", label: "Diode", icon: "↦|", width: 84, height: 30, pins: buildPins("DIODE") },
  RGB_LED: { id: "RGB_LED", label: "LED RGB", icon: "🌈", width: 90, height: 56, pins: buildPins("RGB_LED") },
  NPN_TRANSISTOR: { id: "NPN_TRANSISTOR", label: "Transistor NPN", icon: "NPN", width: 90, height: 60, pins: buildPins("NPN_TRANSISTOR") },
  SERVO: { id: "SERVO", label: "Micro Servo", icon: "⚙️", width: 90, height: 70, pins: buildPins("SERVO") },
  DC_MOTOR: { id: "DC_MOTOR", label: "Moteur DC", icon: "🌀", width: 84, height: 50, pins: buildPins("DC_MOTOR") },
  POLARIZED_CAPACITOR: { id: "POLARIZED_CAPACITOR", label: "Condensateur polarisé", icon: "⊕║", width: 33, height: 120, pins: buildPins("POLARIZED_CAPACITOR") },
  // A3-SW1 — Slide Switch : interaction déclarative généralisée pour un
  // composant à état persistant à N valeurs (cf. CircuitComponent.jsx,
  // interaction.type === "state-toggle") — BUTTON_LATCHING (type "latching",
  // on/off) reste inchangé et distinct.
  SLIDE_SWITCH: { id: "SLIDE_SWITCH", label: "Interrupteur à glissière", icon: "⇄", width: 72, height: 48, pins: buildPins("SLIDE_SWITCH"), interaction: { type: "state-toggle", states: ["left", "right"] }, initialState: "left" },
  // A3-SW2 — DIP Switch : capacité déclarative généralisée pour un composant
  // à PLUSIEURS canaux de commutation indépendants (cf. CircuitComponent.jsx,
  // interaction.type === "multi-state-toggle" ; canonicalRegistry.js,
  // internalConnections.channels). `channels` énumère les canaux déclarés,
  // `states` leur vocabulaire commun (off/on) — ni l'un ni l'autre n'est
  // figé sur "4" ou sur DIP_SWITCH : un futur composant multi-canaux
  // réutilise ce même contrat sans modification de CircuitComponent.jsx.
  DIP_SWITCH: { id: "DIP_SWITCH", label: "Interrupteur DIP 4 positions", icon: "▦", width: 112, height: 56, pins: buildPins("DIP_SWITCH"), interaction: { type: "multi-state-toggle", channels: ["1", "2", "3", "4"], states: ["off", "on"] }, initialChannelStates: { "1": "off", "2": "off", "3": "off", "4": "off" } },
  // A6-OUT1 — Vibration Motor : réutilisation DC_MOTOR (aucune duplication de
  // simulation, cf. simulator/dcContributionRegistry.js). Renderer CSS/DOM
  // provisoire (VibrationMotorPart.jsx), visuellement distinct du carter
  // raster DC_MOTOR — cf. ticket A6-OUT1 §8.
  VIBRATION_MOTOR: { id: "VIBRATION_MOTOR", label: "Moteur à vibration", icon: "📳", width: 50, height: 70, pins: buildPins("VIBRATION_MOTOR") },
}

// L1-PROP-001: one common product contract, attached to the existing catalogue.
export const COMMON_PROPERTY_SCHEMA = Object.freeze({
  name: Object.freeze({ type: "string", default: "", maxLength: 80, label: "Nom", control: "text" }),
})
for (const definition of Object.values(COMPONENT_TYPES)) {
  definition.propertySchema = COMMON_PROPERTY_SCHEMA
}

// L1-PROP-003: LED's first physical property — orthogonal to electrical
// parameters/runtime isOn (§4/§6 of the ticket). Declarative extension of the
// common contract; the renderer (LedPart.jsx) is the only place allowed to
// interpret `color`.
export const LED_COLOR_OPTIONS = Object.freeze([
  Object.freeze({ value: "red", label: "Rouge" }),
  Object.freeze({ value: "green", label: "Vert" }),
  Object.freeze({ value: "blue", label: "Bleu" }),
  Object.freeze({ value: "yellow", label: "Jaune" }),
  Object.freeze({ value: "white", label: "Blanc" }),
])
COMPONENT_TYPES.LED.propertySchema = Object.freeze({
  ...COMMON_PROPERTY_SCHEMA,
  color: Object.freeze({ type: "string", default: "red", label: "Couleur", control: "select", options: LED_COLOR_OPTIONS }),
})

export const PALETTE_ITEMS = [COMPONENT_TYPES.LED, COMPONENT_TYPES.RESISTOR, COMPONENT_TYPES.ARDUINO, COMPONENT_TYPES.BUTTON, COMPONENT_TYPES.BUTTON_LATCHING, COMPONENT_TYPES.POWER, COMPONENT_TYPES.BATTERY_AA, COMPONENT_TYPES.COIN_CELL_CR2032, COMPONENT_TYPES.BATTERY_9V, COMPONENT_TYPES.CAPACITOR, COMPONENT_TYPES.BUZZER, COMPONENT_TYPES.POTENTIOMETER, COMPONENT_TYPES.LDR, COMPONENT_TYPES.THERMISTOR, COMPONENT_TYPES.DIODE, COMPONENT_TYPES.RGB_LED, COMPONENT_TYPES.NPN_TRANSISTOR, COMPONENT_TYPES.SERVO, COMPONENT_TYPES.DC_MOTOR, COMPONENT_TYPES.POLARIZED_CAPACITOR, COMPONENT_TYPES.SLIDE_SWITCH, COMPONENT_TYPES.DIP_SWITCH, COMPONENT_TYPES.VIBRATION_MOTOR]

export function getComponentDef(type) { return COMPONENT_TYPES[type] ?? null }

export function createComponent(type, x, y) {
  const def = getComponentDef(type)
  if (!def) return null
  return {
    uid: createUid(), type: def.id, x, y, pins: def.pins.map((pin) => ({ ...pin })),
    ...(def.initialState !== undefined ? { state: def.initialState } : {}),
    ...(def.initialChannelStates !== undefined ? { channelStates: { ...def.initialChannelStates } } : {}),
  }
}
