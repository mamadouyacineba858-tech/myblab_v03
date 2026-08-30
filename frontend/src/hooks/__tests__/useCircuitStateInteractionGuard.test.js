/**
 * useCircuitStateInteractionGuard.test.js — MB-VIS-COMP-003 (Phase 8, garde-fou)
 *
 * TEST 6 : aucun branchement littéral type === "BUTTON" / "BUTTON_LATCHING"
 * (ou équivalent case) ne subsiste dans useCircuitState.js.
 *
 * Vérification ciblée par lecture de source (pas de grep fragile ni d'AST
 * complet — une recherche de motifs précis sur le seul fichier concerné
 * suffit, comme suggéré par le ticket). Ce test ne s'applique volontairement
 * qu'à useCircuitState.js : les occurrences légitimes de "BUTTON"/
 * "BUTTON_LATCHING" comme clés d'objet dans componentDefinitions.js (ou dans
 * les fichiers de test) sont hors du champ de ce fichier et ne sont pas
 * concernées par ce garde-fou.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = resolve(__dirname, "../useCircuitState.js")
const source = readFileSync(SOURCE_PATH, "utf-8")

const FORBIDDEN_PATTERNS = [
  /type\s*===\s*["']BUTTON["']/,
  /type\s*!==\s*["']BUTTON["']/,
  /type\s*===\s*["']BUTTON_LATCHING["']/,
  /type\s*!==\s*["']BUTTON_LATCHING["']/,
  /case\s*["']BUTTON["']/,
  /case\s*["']BUTTON_LATCHING["']/,
]

describe("MB-VIS-COMP-003 — garde-fou architectural (TEST 6)", () => {
  it("useCircuitState.js ne contient aucun branchement littéral sur BUTTON/BUTTON_LATCHING", () => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      const match = source.match(pattern)
      expect(match, `motif interdit trouvé: ${pattern} → "${match?.[0]}"`).toBeNull()
    }
  })

  it("useCircuitState.js consomme bien interaction.type de manière déclarative (sanity check positif)", () => {
    expect(source).toMatch(/interaction\?\.type\s*!==\s*["']momentary["']/)
    expect(source).toMatch(/interaction\?\.type\s*===\s*["']latching["']/)
  })
})
