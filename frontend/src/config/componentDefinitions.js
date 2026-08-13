import { createUid } from "../utils/ids.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"

/**
 * Présentation locale des pins. Les identifiants et rôles sont canoniques dans
 * simulator/canonicalRegistry.js ; ce tableau ne contient que les propriétés
 * propres à l'affichage et au positionnement.
 */
const PIN_PRESENTATION_BY_TYPE = {
  LED: [
    { label: "Anode", dx: 0, dy: 20 },
    { label: "Cathode", dx: 80, dy: 20 },
  ],
  RESISTOR: [
    { label: "A", dx: 0, dy: 14 },
    { label: "B", dx: 90, dy: 14 },
  ],
  ARDUINO: [
    { label: "D2", dx: 0, dy: 50 },
    { label: "D3", dx: 0, dy: 75 },
    { label: "GND", dx: 0, dy: 110 },
    { label: "5V", dx: 120, dy: 50 },
  ],
  BUTTON: [
    { label: "1", dx: 0, dy: 30 },
    { label: "2", dx: 60, dy: 30 },
  ],
  BUTTON_LATCHING: [
    { label: "1", dx: 0, dy: 30 },
    { label: "2", dx: 60, dy: 30 },
  ],
  POWER: [
    { label: "+5V", dx: 70, dy: 25 },
    { label: "GND", dx: 70, dy: 65 },
  ],
  CAPACITOR: [
    { label: "A", dx: 0, dy: 20 },
    { label: "B", dx: 70, dy: 20 },
  ],
  BUZZER: [
    { label: "+", dx: 10, dy: 50 },
    { label: "-", dx: 60, dy: 50 },
  ],
  POTENTIOMETER: [
    { label: "L", dx: 10, dy: 50 },
    { label: "W", dx: 45, dy: 0 },
    { label: "R", dx: 80, dy: 50 },
  ],
  LDR: [
    { label: "A", dx: 0, dy: 18 },
    { label: "B", dx: 90, dy: 18 },
  ],
  THERMISTOR: [
    { label: "A", dx: 0, dy: 18 },
    { label: "B", dx: 90, dy: 18 },
  ],
  DIODE: [
    { label: "A", dx: 0, dy: 15 },
    { label: "K", dx: 90, dy: 15 },
  ],
  RGB_LED: [
    { label: "R", dx: 12, dy: 56 },
    { label: "COM", dx: 34, dy: 56 },
    { label: "G", dx: 56, dy: 56 },
    { label: "B", dx: 78, dy: 56 },
  ],
  NPN_TRANSISTOR: [
    { label: "C", dx: 45, dy: 0 },
    { label: "B", dx: 0, dy: 45 },
    { label: "E", dx: 90, dy: 45 },
  ],
  SERVO: [
    { label: "SIG", dx: 90, dy: 20 },
    { label: "VCC", dx: 90, dy: 35 },
    { label: "GND", dx: 90, dy: 50 },
  ],
  DC_MOTOR: [
    { label: "+", dx: 0, dy: 25 },
    { label: "-", dx: 90, dy: 25 },
  ],
}

function buildPins(type) {
  const canonicalEntry = getCanonicalEntry(type)
  const presentationPins = PIN_PRESENTATION_BY_TYPE[type]

  if (!canonicalEntry || !presentationPins) {
    throw new Error(`Unknown component pin definition: ${type}`)
  }

  if (canonicalEntry.pins.length !== presentationPins.length) {
    throw new Error(`Pin count mismatch for component ${type}`)
  }

  return canonicalEntry.pins.map((canonicalPin, index) => ({
    ...canonicalPin,
    ...presentationPins[index],
  }))
}

/**
 * Définitions des composants électroniques MYBlab.
 * Chaque type expose : dimensions, pins (offsets relatifs), métadonnées simulation.
 *
 * Modèle instance sur le canvas :
 * { uid, type, x, y, pins: [] }  — pins[] réservé pour état futur (ex. bouton pressé)
 */

export const COMPONENT_TYPES = {
  LED: {
    id: "LED",
    label: "LED",
    icon: "💡",
    width: 80,
    height: 40,
    pins: buildPins("LED"),
  },
  RESISTOR: {
    id: "RESISTOR",
    label: "Résistance",
    icon: "〰️",
    width: 90,
    height: 28,
    pins: buildPins("RESISTOR"),
  },
  ARDUINO: {
    id: "ARDUINO",
    label: "Arduino UNO",
    icon: "🤖",
    width: 120,
    height: 140,
    pins: buildPins("ARDUINO"),
  },
  BUTTON: {
    id: "BUTTON",
    label: "Bouton",
    icon: "🔘",
    width: 60,
    height: 60,
    pins: buildPins("BUTTON"),
  },
  BUTTON_LATCHING: {
    id: "BUTTON_LATCHING",
    label: "Interrupteur",
    icon: "🔲",
    width: 60,
    height: 60,
    pins: buildPins("BUTTON_LATCHING"),
  },
  POWER: {
    id: "POWER",
    label: "Alimentation",
    icon: "⚡",
    width: 70,
    height: 90,
    pins: buildPins("POWER"),
  },
  CAPACITOR: {
    id: "CAPACITOR",
    label: "Condensateur",
    icon: "║║",
    width: 70,
    height: 40,
    pins: buildPins("CAPACITOR"),
  },
  BUZZER: {
    id: "BUZZER",
    label: "Buzzer",
    icon: "🔊",
    width: 70,
    height: 50,
    pins: buildPins("BUZZER"),
  },
  POTENTIOMETER: {
    id: "POTENTIOMETER",
    label: "Potentiomètre",
    icon: "🎚",
    width: 90,
    height: 50,
    pins: buildPins("POTENTIOMETER"),
  },
  LDR: {
    id: "LDR",
    label: "Photoresistance (LDR)",
    icon: "☀️",
    width: 90,
    height: 36,
    pins: buildPins("LDR"),
  },
  THERMISTOR: {
    id: "THERMISTOR",
    label: "Thermistance",
    icon: "🌡",
    width: 90,
    height: 36,
    pins: buildPins("THERMISTOR"),
  },
  DIODE: {
    id: "DIODE",
    label: "Diode",
    icon: "↦|",
    width: 90,
    height: 30,
    pins: buildPins("DIODE"),
  },
  RGB_LED: {
    id: "RGB_LED",
    label: "LED RGB",
    icon: "🌈",
    width: 90,
    height: 56,
    pins: buildPins("RGB_LED"),
  },
  NPN_TRANSISTOR: {
    id: "NPN_TRANSISTOR",
    label: "Transistor NPN",
    icon: "NPN",
    width: 90,
    height: 60,
    pins: buildPins("NPN_TRANSISTOR"),
  },
  SERVO: {
    id: "SERVO",
    label: "Micro Servo",
    icon: "⚙️",
    width: 90,
    height: 70,
    pins: buildPins("SERVO"),
  },
  DC_MOTOR: {
    id: "DC_MOTOR",
    label: "Moteur DC",
    icon: "🌀",
    width: 90,
    height: 50,
    pins: buildPins("DC_MOTOR"),
  },
}

/** Liste ordonnée pour la sidebar */
export const PALETTE_ITEMS = [
  COMPONENT_TYPES.LED,
  COMPONENT_TYPES.RESISTOR,
  COMPONENT_TYPES.ARDUINO,
  COMPONENT_TYPES.BUTTON,
  COMPONENT_TYPES.BUTTON_LATCHING,
  COMPONENT_TYPES.POWER,
  COMPONENT_TYPES.CAPACITOR,
  COMPONENT_TYPES.BUZZER,
  COMPONENT_TYPES.POTENTIOMETER,
  COMPONENT_TYPES.LDR,
  COMPONENT_TYPES.THERMISTOR,
  COMPONENT_TYPES.DIODE,
  COMPONENT_TYPES.RGB_LED,
  COMPONENT_TYPES.NPN_TRANSISTOR,
  COMPONENT_TYPES.SERVO,
  COMPONENT_TYPES.DC_MOTOR,
]

/**
 * @param {string} type
 */
export function getComponentDef(type) {
  return COMPONENT_TYPES[type] ?? null
}

/**
 * Crée une nouvelle instance de composant.
 * @param {string} type
 * @param {number} x
 * @param {number} y
 */
export function createComponent(type, x, y) {
  const def = getComponentDef(type)
  if (!def) return null

  return {
    uid: createUid(),
    type: def.id,
    x,
    y,
    pins: def.pins.map((pin) => ({ ...pin })),
    ...(def.id === "BUTTON" ? { state: "released" } : {}),
    ...(def.id === "BUTTON_LATCHING" ? { state: "off" } : {}),
  }
}
