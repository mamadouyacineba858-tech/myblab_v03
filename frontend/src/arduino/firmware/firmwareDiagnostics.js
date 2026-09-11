/**
 * MB-L1-ARD-002 — vocabulaire de diagnostics structuré, déterministe et
 * indépendant de toute UI (§18 du ticket). Consommé uniquement par
 * `firmwareCompiler.js` — aucune connaissance de Simulation/Runtime/React.
 */

export const DiagnosticCode = Object.freeze({
  MISSING_SETUP: "MISSING_SETUP",
  MISSING_LOOP: "MISSING_LOOP",
  MALFORMED_BRACES: "MALFORMED_BRACES",
  UNSUPPORTED_STATEMENT: "UNSUPPORTED_STATEMENT",
  UNSUPPORTED_PIN: "UNSUPPORTED_PIN",
  UNSUPPORTED_MODE: "UNSUPPORTED_MODE",
  INVALID_LEVEL: "INVALID_LEVEL",
  // MB-L1-ARD-003 §5/§26 : delay(<literal>) — durée non numérique, absente,
  // négative, ou appel à arité incorrecte (0 ou 2+ arguments).
  INVALID_DELAY_DURATION: "INVALID_DELAY_DURATION",
})

/**
 * @param {string} code Un membre de DiagnosticCode.
 * @param {string} message Message lisible, autonome (ne suppose aucun contexte UI).
 * @param {number|null} [line] Ligne 1-indexée dans le source, si connue.
 * @returns {{ code: string, message: string, line: number|null }}
 */
export function createDiagnostic(code, message, line = null) {
  return { code, message, line }
}
