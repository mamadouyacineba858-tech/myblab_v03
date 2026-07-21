/**
 * Niveaux logiques pour la simulation (préparation Arduino HIGH/LOW/PWM).
 */
export const Signal = {
  UNKNOWN: "UNKNOWN",
  LOW: "LOW",
  HIGH: "HIGH",
  FLOATING: "FLOATING",
}

export function isHigh(level) {
  return level === Signal.HIGH
}

export function isLow(level) {
  return level === Signal.LOW
}
