import { COMPONENT_TYPES } from './componentTypes'

export const PIN_DEFINITIONS = {
  RESISTOR: [
    { id: "pin1", label: "1", dx: 0, dy: 20 },
    { id: "pin2", label: "2", dx: 70, dy: 20 },
  ],
  LED: [
    { id: "anode", label: "A", dx: 28, dy: 62 },
    { id: "cathode", label: "K", dx: 52, dy: 62 },
  ],
  CAPACITOR: [
    { id: "pinA", label: "A", dx: 24, dy: 40 },
    { id: "pinB", label: "B", dx: 46, dy: 40 },
  ],
}

export const COMPONENT_DEFINITIONS = {
  CAPACITOR: {
    id: "CAPACITOR",
    label: "Condensateur",
    icon: "║║",
    width: 70,
    height: 40,
    pins: buildPins("CAPACITOR"),
  },
}

function buildPins(type) {
  return (PIN_DEFINITIONS[type] ?? []).map((pin) => ({ ...pin }))
}

export { COMPONENT_TYPES }
