/**
 * A12-NEOPIXEL-FUNC-WS2812B-V6-001 — projection PURE de l'état runtime du
 * pixel WS2812B-V6 (`digitalEventStates`, lecture seule) vers la Presentation.
 * Aucun décodage : la couleur est celle latchée par `ws2812bV6Protocol.js`.
 * Sans couleur latchée (jamais reçue, non alimenté, simulation arrêtée) : le
 * pixel n'émet rien -> r = g = b = 0, `latched` false.
 *
 * @param {{ color?: { r: number, g: number, b: number } | null } | undefined} runtimeState
 * @returns {Readonly<{ r: number, g: number, b: number, latched: boolean }>}
 */
export function projectWs2812bV6(runtimeState) {
  const color = runtimeState?.color
  if (!color) return Object.freeze({ r: 0, g: 0, b: 0, latched: false })
  return Object.freeze({ r: color.r, g: color.g, b: color.b, latched: true })
}
