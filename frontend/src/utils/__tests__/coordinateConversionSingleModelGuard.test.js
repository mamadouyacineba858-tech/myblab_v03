/**
 * coordinateConversionSingleModelGuard.test.js — MB-VIS-CANVAS-049.
 *
 * Garde-fou architectural (même patron que geometryPinCanonicalGuard.test.js /
 * pinFootprintConsumersGuard.test.js) : empêche la réintroduction future d'un
 * second calcul de conversion écran→Document concurrent de `clientToCanvas()`
 * (utils/geometry.js) — critère d'acceptation #10 du Ticket : « Aucun nouveau
 * chemin de conversion de coordonnées concurrent n'est introduit lorsque la
 * centralisation est possible. »
 *
 * Avant ce ticket, `SimulationCanvas.jsx::handleDrop` et
 * `useCircuitState.js::updateSidebarComponentDragPosition` réimplémentaient
 * chacun `(clientX - rect.left) / zoom` en ligne, plutôt que d'appeler
 * `clientToCanvas()` — un second modèle de coordonnées, correct par
 * coïncidence mais dupliqué. Ce garde-fou verrouille qu'ils délèguent
 * désormais à la même fonction unique que le drag/marquee/waypoint/Breadboard.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
}

// Division arithmétique par l'identifiant `zoom`, hors définition de
// `clientToCanvas()` elle-même (utils/geometry.js, non scanné ici) — tout
// appelant doit passer `zoom` EN PARAMÈTRE à clientToCanvas(), jamais
// diviser lui-même par cette valeur.
const RAW_ZOOM_DIVISION_PATTERN = /[)\w]\s*\/\s*zoom\b/

const FILES = [
  { rel: "../../canvas/SimulationCanvas.jsx", label: "SimulationCanvas.jsx" },
  { rel: "../../hooks/useCircuitState.js", label: "useCircuitState.js" },
  { rel: "../../wires/WiresLayer.jsx", label: "WiresLayer.jsx" },
]

describe("MB-VIS-CANVAS-049 — un seul modèle de conversion écran→Document (critère d'acceptation #10)", () => {
  for (const { rel, label } of FILES) {
    it(`${label} ne réimplémente jamais localement une division par zoom (délègue à clientToCanvas)`, () => {
      const path = resolve(__dirname, rel)
      const codeOnly = stripComments(readFileSync(path, "utf-8"))
      const match = codeOnly.match(RAW_ZOOM_DIVISION_PATTERN)
      expect(match, `division brute par zoom trouvée dans ${label} : "${match?.[0]}" — doit passer par clientToCanvas(event, rect, zoom)`).toBeNull()
    })
  }

  it("SimulationCanvas.jsx, useCircuitState.js et WiresLayer.jsx importent bien clientToCanvas depuis utils/geometry.js", () => {
    for (const { rel, label } of FILES) {
      const path = resolve(__dirname, rel)
      const source = readFileSync(path, "utf-8")
      expect(source, `${label} devrait importer clientToCanvas`).toMatch(/import\s*\{[^}]*\bclientToCanvas\b[^}]*\}\s*from\s*["'][^"']*geometry\.js["']/)
    }
  })

  it("clientToCanvas() reste la fonction canonique unique : sa signature accepte bien un 3e paramètre zoom", async () => {
    const { clientToCanvas } = await import("../geometry.js")
    expect(clientToCanvas.length).toBeGreaterThanOrEqual(2)
    // Comportement, pas seulement arité : la fonction divise réellement.
    expect(clientToCanvas({ clientX: 100, clientY: 100 }, { left: 0, top: 0 }, 2)).toEqual({ x: 50, y: 50 })
  })
})
