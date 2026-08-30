/**
 * geometryPinCanonicalGuard.test.js — MB-VIS-COMP-005 (TEST 8, garde-fou)
 *
 * Empêche l'introduction future de calculs spécifiques à un type de
 * composant (`if (type === "LED")`, `switch(type)`, etc.) dans
 * `geometry.js` — le fichier qui porte la fonction géométrique canonique
 * `getPinPosition()`.
 *
 * Ce garde-fou cible délibérément UNIQUEMENT geometry.js, jamais
 * pinPresentationGeometry.js : ce dernier contient légitimement
 * `component.type === "LED"` pour sa responsabilité PROPRE et distincte de
 * projection visuelle (MB-VIS-LED-V5), hors du calcul géométrique canonique
 * — interdire ce motif là-bas casserait un comportement voulu et documenté,
 * pas une duplication (Blueprint §G : "Ne PAS utiliser un test fragile qui
 * interdit légitimement les chaînes de type ailleurs dans le fichier").
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const GEOMETRY_SOURCE_PATH = resolve(__dirname, "../geometry.js")
const rawSource = readFileSync(GEOMETRY_SOURCE_PATH, "utf-8")

const codeOnly = rawSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "")

const FORBIDDEN_PATTERNS = [
  /\btype\s*===\s*["'][A-Z_]+["']/, // ex: type === "LED", type === "CAPACITOR"
  /\btype\s*!==\s*["'][A-Z_]+["']/,
  /switch\s*\(\s*type\s*\)/,
  /\.type\s*===\s*["'][A-Z_]+["']/,
]

describe("MB-VIS-COMP-005 — garde-fou architectural (TEST 8)", () => {
  it("geometry.js (code, hors commentaires) ne contient aucun branchement par type de composant", () => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      const match = codeOnly.match(pattern)
      expect(match, `motif interdit trouvé dans geometry.js : ${pattern} → "${match?.[0]}"`).toBeNull()
    }
  })

  it("getPinPosition() ne prend que 2 paramètres (component, pinDef) — aucun paramètre type/renderer/zoom/rotation", () => {
    // Import dynamique pour rester dans le même fichier de test que le
    // scan statique ci-dessus, sans dépendance croisée avec l'autre suite.
    return import("../geometry.js").then(({ getPinPosition }) => {
      expect(getPinPosition.length).toBe(2)
    })
  })
})
