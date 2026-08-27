import { createUid } from "../utils/ids.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"

/**
 * Présentation locale des pins. Les identifiants et rôles sont canoniques dans
 * simulator/canonicalRegistry.js ; ce tableau ne contient que la clé de jointure
 * id et les propriétés propres à l'affichage et au positionnement.
 */
const PIN_PRESENTATION_BY_TYPE = {
  LED: [
    // Ancres sur les extrémités réelles des pattes physiques.
    { id: "anode", label: "Anode", dx: 31, dy: 60 },
    { id: "cathode", label: "Cathode", dx: 54, dy: 60 },
  ],
  RESISTOR: [
    { id: "A", label: "A", dx: 0, dy: 14 },
    { id: "B", label: "B", dx: 84, dy: 14 },
  ],
  ARDUINO: [
    { id: "D2", label: "D2", dx: 0, dy: 50 },
    { id: "D3", label: "D3", dx: 0, dy: 75 },
    { id: "GND", label: "GND", dx: 0, dy: 110 },
    { id: "5V", label: "5V", dx: 120, dy: 50 },
  ],
  BUTTON: [
    { id: "pin1", label: "1", dx: 0, dy: 30 },
    { id: "pin2", label: "2", dx: 60, dy: 30 },
  ],
  BUTTON_LATCHING: [
    { id: "pin1", label: "1", dx: 0, dy: 30 },
    { id: "pin2", label: "2", dx: 60, dy: 30 },
  ],
  POWER: [
    { id: "5V", label: "+5V", dx: 70, dy: 37 },
    { id: "GND", label: "GND", dx: 58, dy: 25 },
  ],
  CAPACITOR: [
    { id: "pinA", label: "A", dx: 0, dy: 20 },
    { id: "pinB", label: "B", dx: 70, dy: 20 },
  ],
  BUZZER: [
    { id: "plus", label: "+", dx: 10, dy: 50 },
    { id: "minus", label: "-", dx: 60, dy: 50 },
  ],
  POTENTIOMETER: [
    { id: "left", label: "L", dx: 10, dy: 50 },
    { id: "wiper", label: "W", dx: 45, dy: 0 },
    { id: "right", label: "R", dx: 80, dy: 50 },
  ],
  LDR: [
    { id: "A", label: "A", dx: 0, dy: 18 },
    { id: "B", label: "B", dx: 84, dy: 18 },
  ],
  THERMISTOR: [
    { id: "A", label: "A", dx: 0, dy: 18 },
    { id: "B", label: "B", dx: 84, dy: 18 },
  ],
  DIODE: [
    { id: "anode", label: "A", dx: 0, dy: 15 },
    { id: "cathode", label: "K", dx: 84, dy: 15 },
  ],
  RGB_LED: [
    { id: "R", label: "R", dx: 12, dy: 56 },
    { id: "common", label: "COM", dx: 34, dy: 56 },
    { id: "G", label: "G", dx: 56, dy: 56 },
    { id: "B", label: "B", dx: 78, dy: 56 },
  ],
  NPN_TRANSISTOR: [
    { id: "collector", label: "C", dx: 45, dy: 0 },
    { id: "base", label: "B", dx: 0, dy: 45 },
    { id: "emitter", label: "E", dx: 90, dy: 45 },
  ],
  SERVO: [
    { id: "signal", label: "SIG", dx: 90, dy: 20 },
    { id: "vcc", label: "VCC", dx: 90, dy: 35 },
    { id: "gnd", label: "GND", dx: 90, dy: 50 },
  ],
  DC_MOTOR: [
    { id: "plus", label: "+", dx: 0, dy: 25 },
    { id: "minus", label: "-", dx: 84, dy: 25 },
  ],
}

function buildPins(type) {
  const canonicalEntry = getCanonicalEntry(type)
  const presentationPins = PIN_PRESENTATION_BY_TYPE[type]

  if (!canonicalEntry || !presentationPins) {
    throw new Error(`Unknown component pin definition: ${type}`)
  }

  const presentationById = new Map()
  for (const presentationPin of presentationPins) {
    if (presentationById.has(presentationPin.id)) {
      throw new Error(`Duplicate presentation pin id for component ${type}: ${presentationPin.id}`)
    }
    presentationById.set(presentationPin.id, presentationPin)
  }

  if (canonicalEntry.pins.length !== presentationPins.length) {
    throw new Error(`Pin count mismatch for component ${type}`)
  }

  return canonicalEntry.pins.map((canonicalPin) => {
    const presentationPin = presentationById.get(canonicalPin.id)
    if (!presentationPin) {
      throw new Error(`Missing presentation pin for component ${type}: ${canonicalPin.id}`)
    }

    return {
      ...canonicalPin,
      label: presentationPin.label,
      dx: presentationPin.dx,
      dy: presentationPin.dy,
    }
  })
}

export const COMPONENT_TYPES = {
  LED: { id: "LED", label: "LED", icon: "💡", width: 80, height: 64, pins: buildPins("LED") },
  RESISTOR: { id: "RESISTOR", label: "Résistance", icon: "〰️", width: 84, height: 28, pins: buildPins("RESISTOR") },
  ARDUINO: { id: "ARDUINO", label: "Arduino UNO", icon: "🤖", width: 120, height: 140, pins: buildPins("ARDUINO") },
  BUTTON: { id: "BUTTON", label: "Bouton", icon: "🔘", width: 60, height: 60, pins: buildPins("BUTTON") },
  BUTTON_LATCHING: { id: "BUTTON_LATCHING", label: "Interrupteur", icon: "🔲", width: 60, height: 60, pins: buildPins("BUTTON_LATCHING") },
  POWER: { id: "POWER", label: "Alimentation", icon: "⚡", width: 70, height: 90, pins: buildPins("POWER") },
  CAPACITOR: { id: "CAPACITOR", label: "Condensateur", icon: "║║", width: 70, height: 40, pins: buildPins("CAPACITOR") },
  BUZZER: { id: "BUZZER", label: "Buzzer", icon: "🔊", width: 70, height: 50, pins: buildPins("BUZZER") },
  POTENTIOMETER: { id: "POTENTIOMETER", label: "Potentiomètre", icon: "🎚", width: 90, height: 50, pins: buildPins("POTENTIOMETER") },
  LDR: { id: "LDR", label: "Photoresistance (LDR)", icon: "☀️", width: 84, height: 36, pins: buildPins("LDR") },
  THERMISTOR: { id: "THERMISTOR", label: "Thermistance", icon: "🌡", width: 84, height: 36, pins: buildPins("THERMISTOR") },
  DIODE: { id: "DIODE", label: "Diode", icon: "↦|", width: 84, height: 30, pins: buildPins("DIODE") },
  RGB_LED: { id: "RGB_LED", label: "LED RGB", icon: "🌈", width: 90, height: 56, pins: buildPins("RGB_LED") },
  NPN_TRANSISTOR: { id: "NPN_TRANSISTOR", label: "Transistor NPN", icon: "NPN", width: 90, height: 60, pins: buildPins("NPN_TRANSISTOR") },
  SERVO: { id: "SERVO", label: "Micro Servo", icon: "⚙️", width: 90, height: 70, pins: buildPins("SERVO") },
  DC_MOTOR: { id: "DC_MOTOR", label: "Moteur DC", icon: "🌀", width: 84, height: 50, pins: buildPins("DC_MOTOR") },
}

export const PALETTE_ITEMS = [COMPONENT_TYPES.LED, COMPONENT_TYPES.RESISTOR, COMPONENT_TYPES.ARDUINO, COMPONENT_TYPES.BUTTON, COMPONENT_TYPES.BUTTON_LATCHING, COMPONENT_TYPES.POWER, COMPONENT_TYPES.CAPACITOR, COMPONENT_TYPES.BUZZER, COMPONENT_TYPES.POTENTIOMETER, COMPONENT_TYPES.LDR, COMPONENT_TYPES.THERMISTOR, COMPONENT_TYPES.DIODE, COMPONENT_TYPES.RGB_LED, COMPONENT_TYPES.NPN_TRANSISTOR, COMPONENT_TYPES.SERVO, COMPONENT_TYPES.DC_MOTOR]

export function getComponentDef(type) { return COMPONENT_TYPES[type] ?? null }

export function createComponent(type, x, y) {
  const def = getComponentDef(type)
  if (!def) return null
  return {
    uid: createUid(), type: def.id, x, y,
    pins: def.pins.map((pin) => ({ ...pin })),
    ...(def.id === "BUTTON" ? { state: "released" } : {}),
    ...(def.id === "BUTTON_LATCHING" ? { state: "off" } : {}),
  }
}
