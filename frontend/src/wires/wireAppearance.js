/**
 * Physical insulation colors are independent of simulated logic levels.
 * Optional wire.color is presentation metadata; legacy wires keep their
 * existing signal-based appearance until the color-editing UI is connected.
 */
export const WIRE_INSULATION_COLORS = Object.freeze({
  red: '#dc2626',
  black: '#1f2937',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#eab308',
  orange: '#f97316',
  white: '#e5e7eb',
  purple: '#9333ea',
})

const VALID_COLORS = new Set(Object.values(WIRE_INSULATION_COLORS))

export function resolveWireInsulationColor(color) {
  if (typeof color !== 'string') return null
  const value = color.trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(WIRE_INSULATION_COLORS, value)) {
    return WIRE_INSULATION_COLORS[value]
  }
  return VALID_COLORS.has(value) ? value : null
}

/**
 * Explicit physical color wins over simulated signal colors, but selection
 * remains visually prominent. No mutation or simulation coupling.
 */
export function resolveWireDisplayColor({ color, selected = false, fallback }) {
  if (selected) return fallback
  return resolveWireInsulationColor(color) ?? fallback
}
