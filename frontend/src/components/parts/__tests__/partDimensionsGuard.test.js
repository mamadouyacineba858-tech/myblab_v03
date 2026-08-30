/**
 * partDimensionsGuard.test.js — MB-VIS-COMP-006 (TEST architectural, garde-fou)
 *
 * Empêche la réintroduction future d'une largeur/hauteur/viewBox codée en
 * dur littéralement dans l'attribut SVG racine d'un renderer `*Part.jsx`
 * (ex: `<svg viewBox="0 0 84 28" width="84" height="28">`) — la duplication
 * structurelle identifiée et éliminée par ce ticket entre
 * componentDefinitions.js et les 16 renderers de la bibliothèque visuelle.
 *
 * Portée volontairement précise : seul l'attribut du TAG <svg> RACINE
 * lui-même est scanné (premier `<svg ...>` du fichier), jamais les
 * `width=`/`height=` littéraux des formes internes (`<rect>`, `<line>`,
 * `<circle>`, ...) qui définissent la silhouette du dessin à l'intérieur du
 * viewBox — ces valeurs-là ne dupliquent aucune donnée de
 * componentDefinitions.js et sont une responsabilité strictement distincte
 * (même principe de portée précise que geometryPinCanonicalGuard.test.js,
 * MB-VIS-COMP-005 : ne pas interdire un motif légitime ailleurs dans le
 * fichier).
 *
 * PartRenderer.jsx est explicitement exclu du scan : ce fichier ne contient
 * aucun <svg> et n'a jamais fait partie de la duplication (délégation pure
 * via manager.render(), confirmé par la cartographie MB-VIS-COMP-006).
 */
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PARTS_DIR = resolve(__dirname, "..")

const PART_FILES = readdirSync(PARTS_DIR).filter(
  (name) => name.endsWith("Part.jsx") && name !== "PartRenderer.jsx"
)

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
}

function extractRootSvgOpenTag(codeOnly) {
  const match = codeOnly.match(/<svg\b[^>]*>/)
  return match ? match[0] : null
}

describe("MB-VIS-COMP-006 — garde-fou architectural : dimensions du <svg> racine non codées en dur", () => {
  it("la liste des fichiers scannés couvre bien les 16 Part renderers connus (aucun oubli silencieux)", () => {
    expect(PART_FILES.sort()).toEqual(
      [
        "ArduinoPart.jsx",
        "ButtonPart.jsx",
        "BuzzerPart.jsx",
        "CapacitorPart.jsx",
        "DcMotorPart.jsx",
        "DiodePart.jsx",
        "LatchingButtonPart.jsx",
        "LdrPart.jsx",
        "LedPart.jsx",
        "NpnTransistorPart.jsx",
        "PotentiometerPart.jsx",
        "PowerPart.jsx",
        "ResistorPart.jsx",
        "RgbLedPart.jsx",
        "ServoPart.jsx",
        "ThermistorPart.jsx",
      ].sort()
    )
  })

  for (const file of PART_FILES) {
    it(`${file} : le <svg> racine ne contient aucun viewBox/width/height littéral`, () => {
      const rawSource = readFileSync(resolve(PARTS_DIR, file), "utf-8")
      const codeOnly = stripComments(rawSource)
      const svgTag = extractRootSvgOpenTag(codeOnly)
      expect(svgTag, `aucun <svg> trouvé dans ${file}`).not.toBeNull()

      expect(svgTag, `viewBox littéral trouvé dans le <svg> racine de ${file}`).not.toMatch(
        /viewBox="0 0 \d+ \d+"/
      )
      expect(svgTag, `width littéral trouvé dans le <svg> racine de ${file}`).not.toMatch(
        /\bwidth="\d+"/
      )
      expect(svgTag, `height littéral trouvé dans le <svg> racine de ${file}`).not.toMatch(
        /\bheight="\d+"/
      )

      // Positif : le <svg> racine doit bien référencer les variables
      // dérivées (preuve que la valeur vient d'une expression JS, pas d'un
      // second literal accidentellement introduit sous une autre forme).
      expect(svgTag, `${file} ne référence pas {width}/{height} dans le <svg> racine`).toMatch(
        /viewBox=\{`0 0 \$\{width\} \$\{height\}`\}\s*width=\{width\}\s*height=\{height\}/
      )
    })

    it(`${file} : importe getComponentDef depuis componentDefinitions.js (source canonique unique)`, () => {
      const rawSource = readFileSync(resolve(PARTS_DIR, file), "utf-8")
      const codeOnly = stripComments(rawSource)
      expect(codeOnly).toMatch(
        /import\s*\{\s*getComponentDef\s*\}\s*from\s*["']\.\.\/\.\.\/config\/componentDefinitions\.js["']/
      )
    })
  }

  it("sanity check : stripComments() retire bien un commentaire de bloc contenant un faux positif (ex: ancienne doc décrivant viewBox=\"0 0 999 999\")", () => {
    const fake = `/* exemple historique : viewBox="0 0 999 999" width="999" height="999" */\nconst x = 1`
    const cleaned = stripComments(fake)
    expect(cleaned).not.toMatch(/viewBox="0 0 999 999"/)
  })
})
