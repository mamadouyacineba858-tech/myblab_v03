import { createUid } from "../utils/ids.js"

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
    pins: [
      { id: "anode", label: "Anode", dx: 0, dy: 20, role: "input" },
      { id: "cathode", label: "Cathode", dx: 80, dy: 20, role: "input" },
    ],
  },
  RESISTOR: {
    id: "RESISTOR",
    label: "Résistance",
    icon: "〰️",
    width: 90,
    height: 28,
    pins: [
      { id: "A", label: "A", dx: 0, dy: 14, role: "passive" },
      { id: "B", label: "B", dx: 90, dy: 14, role: "passive" },
    ],
  },
  ARDUINO: {
    id: "ARDUINO",
    label: "Arduino UNO",
    icon: "🤖",
    width: 120,
    height: 140,
    pins: [
      { id: "D2", label: "D2", dx: 0, dy: 50, role: "gpio" },
      { id: "D3", label: "D3", dx: 0, dy: 75, role: "gpio" },
      { id: "GND", label: "GND", dx: 0, dy: 110, role: "ground" },
      { id: "5V", label: "5V", dx: 120, dy: 50, role: "power" },
    ],
  },
  BUTTON: {
    id: "BUTTON",
    label: "Bouton",
    icon: "🔘",
    width: 60,
    height: 60,
    pins: [
      { id: "pin1", label: "1", dx: 0, dy: 30, role: "switch" },
      { id: "pin2", label: "2", dx: 60, dy: 30, role: "switch" },
    ],
  },
  POWER: {
    id: "POWER",
    label: "Alimentation",
    icon: "⚡",
    width: 70,
    height: 90,
    pins: [
      { id: "5V", label: "+5V", dx: 70, dy: 25, role: "power_out" },
      { id: "GND", label: "GND", dx: 70, dy: 65, role: "ground_out" },
    ],
  },
  CAPACITOR: {
    id: "CAPACITOR",
    label: "Condensateur",
    icon: "║║",
    width: 70,
    height: 40,
    pins: [
      { id: "pinA", label: "A", dx: 0, dy: 20, role: "passive" },
      { id: "pinB", label: "B", dx: 70, dy: 20, role: "passive" },
    ],
  },
  BUZZER: {
    id: "BUZZER",
    label: "Buzzer",
    icon: "🔊",
    width: 70,
    height: 50,
    pins: [
      { id: "plus", label: "+", dx: 10, dy: 50, role: "input" },
      { id: "minus", label: "-", dx: 60, dy: 50, role: "input" },
    ],
  },
  POTENTIOMETER: {
    id: "POTENTIOMETER",
    label: "Potentiomètre",
    icon: "🎚",
    width: 90,
    height: 50,
    pins: [
      { id: "left", label: "L", dx: 10, dy: 50, role: "passive" },
      { id: "wiper", label: "W", dx: 45, dy: 0, role: "output" },
      { id: "right", label: "R", dx: 80, dy: 50, role: "passive" },
    ],
  },
  LDR: {
    id: "LDR",
    label: "Photoresistance (LDR)",
    icon: "☀️",
    width: 90,
    height: 36,
    pins: [
      { id: "A", label: "A", dx: 0, dy: 18, role: "sensor" },
      { id: "B", label: "B", dx: 90, dy: 18, role: "sensor" },
    ],
  },
  THERMISTOR: {
    id: "THERMISTOR",
    label: "Thermistance",
    icon: "🌡",
    width: 90,
    height: 36,
    pins: [
      { id: "A", label: "A", dx: 0, dy: 18, role: "sensor" },
      { id: "B", label: "B", dx: 90, dy: 18, role: "sensor" },
    ],
  },
  DIODE: {
    id: "DIODE",
    label: "Diode",
    icon: "↦|",
    width: 90,
    height: 30,
    pins: [
      { id: "anode", label: "A", dx: 0, dy: 15, role: "input" },
      { id: "cathode", label: "K", dx: 90, dy: 15, role: "output" },
    ],
  },
  RGB_LED: {
    id: "RGB_LED",
    label: "LED RGB",
    icon: "🌈",
    width: 90,
    height: 56,
    pins: [
      { id: "R", label: "R", dx: 12, dy: 56, role: "input" },
      { id: "common", label: "COM", dx: 34, dy: 56, role: "ground" },
      { id: "G", label: "G", dx: 56, dy: 56, role: "input" },
      { id: "B", label: "B", dx: 78, dy: 56, role: "input" },
    ],
  },
  NPN_TRANSISTOR: {
    id: "NPN_TRANSISTOR",
    label: "Transistor NPN",
    icon: "NPN",
    width: 90,
    height: 60,
    pins: [
      { id: "collector", label: "C", dx: 45, dy: 0, role: "input" },
      { id: "base", label: "B", dx: 0, dy: 45, role: "input" },
      { id: "emitter", label: "E", dx: 90, dy: 45, role: "output" },
    ],
  },
  SERVO: {
    id: "SERVO",
    label: "Micro Servo",
    icon: "⚙️",
    width: 90,
    height: 70,
    pins: [
      { id: "signal", label: "SIG", dx: 90, dy: 20, role: "gpio" },
      { id: "vcc", label: "VCC", dx: 90, dy: 35, role: "power" },
      { id: "gnd", label: "GND", dx: 90, dy: 50, role: "ground" },
    ],
  },
  DC_MOTOR: {
    id: "DC_MOTOR",
    label: "Moteur DC",
    icon: "🌀",
    width: 90,
    height: 50,
    pins: [
      { id: "plus", label: "+", dx: 0, dy: 25, role: "input" },
      { id: "minus", label: "-", dx: 90, dy: 25, role: "input" },
    ],
  },
}

/** Liste ordonnée pour la sidebar */
export const PALETTE_ITEMS = [
  COMPONENT_TYPES.LED,
  COMPONENT_TYPES.RESISTOR,
  COMPONENT_TYPES.ARDUINO,
  COMPONENT_TYPES.BUTTON,
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
    pins: [],
  }
}
