/**
 * MB-L1-ARD-001 — source de vérité unique pour le contrat firmware V1.
 *
 * Aucune connaissance de Simulation/Runtime (ARD-13/ARD-14/ARD-21) : ce
 * fichier ne manipule que la FORME du firmware (`{ source: string }`), le
 * sketch par défaut, et la liste des types de composant qui possèdent un
 * firmware — jamais son exécution. `core/handlers/component/
 * UpdateArduinoFirmwareHandler.js` (Core) importe uniquement
 * `isValidFirmwareStructure` d'ici — jamais `ArduinoSimulator.js`,
 * `runtimeOrchestrator.js`, `simulationRuntimeIntegration.js`, ni aucun
 * parseur (ARD-04, ARD-09, §21 du ticket).
 *
 * ARD-29 (Level-1) : le sketch par défaut est un squelette vide, jamais un
 * Blink — Blink est réservé au scénario de qualification `MB-L1-ARD-005`.
 */

export const DEFAULT_FIRMWARE_SOURCE = "void setup() {\n}\n\nvoid loop() {\n}\n"

/** Types de composant possédant un firmware (ARD-03/AC-04) — un seul pour l'instant. */
const TYPES_WITH_FIRMWARE = new Set(["ARDUINO"])

export function hasFirmwareCapability(type) {
  return TYPES_WITH_FIRMWARE.has(type)
}

/**
 * Matérialise le firmware par défaut d'une nouvelle instance, ou `undefined`
 * si ce type de composant n'a pas de firmware (AC-04 : un composant non
 * Arduino n'acquiert jamais de champ `firmware`).
 */
export function createDefaultFirmware(type) {
  return hasFirmwareCapability(type) ? { source: DEFAULT_FIRMWARE_SOURCE } : undefined
}

/**
 * Validation structurelle V1 (§14 du ticket) : `firmware` est un objet,
 * `firmware.source` est une chaîne. AUCUNE validation syntaxique C++/Arduino
 * — cette responsabilité appartient à `MB-L1-ARD-002` (parser/compiler).
 */
export function isValidFirmwareStructure(firmware) {
  return Boolean(
    firmware &&
    typeof firmware === "object" &&
    !Array.isArray(firmware) &&
    typeof firmware.source === "string"
  )
}
