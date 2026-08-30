/**
 * circuitModelInteractionGuard.test.js — MB-VIS-COMP-004 (Phase 9, garde-fou)
 *
 * TEST 6 : aucun littéral BUTTON/BUTTON_LATCHING n'est utilisé comme
 * mécanisme de dispatch (branchement conditionnel) dans normalizeComponent()
 * / circuitModel.js.
 *
 * Les commentaires (bloc /* * / et ligne //) sont retirés avant l'analyse :
 * ce fichier documente délibérément, à des fins d'audit, l'ANCIEN
 * branchement littéral retiré par ce ticket (voir l'en-tête de
 * normalizeComponent(), circuitModel.js) — une référence documentaire aux
 * chaînes "BUTTON"/"BUTTON_LATCHING" est donc attendue et légitime dans les
 * commentaires (autorisé explicitement par la Phase 9 du Blueprint : "Le
 * résultat peut contenir des références documentaires/tests si elles sont
 * justifiées"), mais AUCUNE occurrence ne doit subsister dans le CODE.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = resolve(__dirname, "../circuitModel.js")
const rawSource = readFileSync(SOURCE_PATH, "utf-8")

// Retrait des commentaires bloc puis ligne (suffisant ici : circuitModel.js
// ne contient aucune chaîne littérale contenant "/*", "*/" ou "//").
const codeOnly = rawSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "")

const FORBIDDEN_PATTERNS = [
  /type\s*===\s*["']BUTTON["']/,
  /type\s*!==\s*["']BUTTON["']/,
  /type\s*===\s*["']BUTTON_LATCHING["']/,
  /type\s*!==\s*["']BUTTON_LATCHING["']/,
  /case\s*["']BUTTON["']/,
  /case\s*["']BUTTON_LATCHING["']/,
]

describe("MB-VIS-COMP-004 — garde-fou architectural (TEST 6)", () => {
  it("circuitModel.js (code, hors commentaires) ne contient aucun branchement littéral sur BUTTON/BUTTON_LATCHING", () => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      const match = codeOnly.match(pattern)
      expect(match, `motif interdit trouvé dans le code : ${pattern} → "${match?.[0]}"`).toBeNull()
    }
  })

  it("circuitModel.js consomme bien interaction.type/initialState de manière déclarative (sanity check positif)", () => {
    expect(codeOnly).toMatch(/interactionType\s*===\s*["']momentary["']/)
    expect(codeOnly).toMatch(/interactionType\s*===\s*["']latching["']/)
    expect(codeOnly).toMatch(/getComponentDef/)
    expect(codeOnly).toMatch(/initialState/)
  })

  it("la documentation historique (commentaires) mentionne bien les chaînes retirées, à titre d'audit — sanity check du retrait de commentaires lui-même", () => {
    // Confirme que le stripping fonctionne réellement (sinon le TEST 6
    // ci-dessus serait un faux négatif silencieux : le commentaire de
    // circuitModel.js contient littéralement `component.type === "BUTTON"`).
    expect(rawSource).toMatch(/component\.type\s*===\s*["']BUTTON["']/)
    expect(codeOnly).not.toMatch(/component\.type\s*===\s*["']BUTTON["']/)
  })
})
