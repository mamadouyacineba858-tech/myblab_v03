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
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from "../../../visualization/defaultRegistrations.js"
import { getComponentDef } from "../../../config/componentDefinitions.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PARTS_DIR = resolve(__dirname, "..")

const PART_FILES = readdirSync(PARTS_DIR).filter(
  (name) => name.endsWith("Part.jsx") && name !== "PartRenderer.jsx"
)

// MB-VIS-INDUSTRIAL-001 : la liste des renderers "backend raster" est DÉRIVÉE
// du registre (déclaration `visual.backend`), plus jamais un nom de fichier
// codé en dur. Un renderer raster rend un <img> vers un asset validé au lieu
// d'un <svg> : le garde-fou "dimensions du <svg> racine non codées en dur" ne
// s'y applique pas ; on vérifie à la place l'absence de <svg>, la présence
// d'un <img> vers /assets/ et l'import canonique de getComponentDef. Tout
// futur composant raster (DIODE, LED, ...) est couvert sans l'ajouter ici.
const RASTER_PART_FILES = new Set(
  DEFAULT_REGISTRATIONS
    .filter((entry) => getComponentPresentation(entry.type).backend === "raster")
    .map((entry) => `${entry.component.name}.jsx`)
)

// [MB-L1-CONS-002] CAPACITOR / THERMISTOR ont abandonné le raster ET le SVG
// pour un renderer CSS/DOM pur (corps `<div>` stylé, ni <svg> ni <img>) —
// `backend` résout désormais à `svg` (dette de métadonnée corrigée) mais ils
// ne satisfont ni le garde-fou raster (pas d'<img>) ni le garde-fou "<svg>
// racine sans dimension littérale" (pas de <svg> du tout). Liste explicite
// (test uniquement, aucun branchement en production) : cf. delivery report
// MB-L1-CONS-002.
const PHYSICAL_DOM_PART_FILES = new Set(["CapacitorPart.jsx", "ThermistorPart.jsx"])

// [MB-L1-CONS-002] RgbLedPart.jsx est un cas distinct, pré-existant et
// indépendant de la réconciliation CAPACITOR/THERMISTOR : il gère son propre
// pipeline d'assets multi-état (8 combinaisons r/g/b) avec des dimensions
// codées en dur (90×56) plutôt que d'importer `getComponentDef`. Ce n'est pas
// un défaut fonctionnel — RGB_LED délègue entièrement son dimensionnement au
// parent `.circuit-component__body` (cf. partDimensionsCanonical.test.jsx,
// PARENT_DELEGATED_RASTER_TYPES) — mais l'invariant « source canonique unique »
// doit être vérifié différemment : par comparaison RUNTIME entre les valeurs
// codées en dur et componentDefinitions.js, plutôt que par la présence
// littérale d'un import (qui n'existe légitimement pas ici).
const CANONICAL_IMPORT_EXCEPTIONS = new Set(["RgbLedPart.jsx"])

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
}

function extractRootSvgOpenTag(codeOnly) {
  const match = codeOnly.match(/<svg\b[^>]*>/)
  return match ? match[0] : null
}

describe("MB-VIS-COMP-006 — garde-fou architectural : dimensions du <svg> racine non codées en dur", () => {
  it("la liste des fichiers scannés couvre bien tous les Part renderers connus (aucun oubli silencieux)", () => {
    expect(PART_FILES.sort()).toEqual(
      [
        "ArduinoPart.jsx",
        "Battery9VPart.jsx",
        "BatteryAaPart.jsx",
        "CoinCellCr2032Part.jsx",
        "ButtonPart.jsx",
        "BuzzerPart.jsx",
        "CapacitorPart.jsx",
        "DcMotorPart.jsx",
        "DiodePart.jsx",
        "LatchingButtonPart.jsx",
        "LdrPart.jsx",
        "LedPart.jsx",
        "NpnTransistorPart.jsx",
        "PolarizedCapacitorPart.jsx",
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
    if (PHYSICAL_DOM_PART_FILES.has(file)) {
      it(`${file} : renderer CSS/DOM physique — aucun <svg> racine, aucun <img> raster`, () => {
        const rawSource = readFileSync(resolve(PARTS_DIR, file), "utf-8")
        const codeOnly = stripComments(rawSource)
        expect(extractRootSvgOpenTag(codeOnly), `${file} ne devrait pas contenir de <svg>`).toBeNull()
        expect(codeOnly, `${file} ne devrait pas rendre d'<img> (raster abandonné, MB-L1-CONS-002)`).not.toMatch(/<img\b/)
        expect(codeOnly, `${file} ne devrait pas référencer d'asset sous /assets/`).not.toMatch(/["'`]\/assets\//)
      })

      it(`${file} : importe getComponentDef depuis componentDefinitions.js (source canonique unique)`, () => {
        const rawSource = readFileSync(resolve(PARTS_DIR, file), "utf-8")
        const codeOnly = stripComments(rawSource)
        expect(codeOnly).toMatch(
          /import\s*\{\s*getComponentDef\s*\}\s*from\s*["']\.\.\/\.\.\/config\/componentDefinitions\.js["']/
        )
      })
      continue
    }

    if (RASTER_PART_FILES.has(file)) {
      it(`${file} : backend raster — aucun <svg> racine, rend un <img> vers /assets/`, () => {
        const rawSource = readFileSync(resolve(PARTS_DIR, file), "utf-8")
        const codeOnly = stripComments(rawSource)
        expect(extractRootSvgOpenTag(codeOnly), `${file} ne devrait plus contenir de <svg>`).toBeNull()
        expect(codeOnly, `${file} doit rendre un <img>`).toMatch(/<img\b/)
        expect(codeOnly, `${file} doit référencer un asset sous /assets/`).toMatch(/["'`]\/assets\//)
      })

      if (CANONICAL_IMPORT_EXCEPTIONS.has(file)) {
        it(`${file} : ne s'importe pas getComponentDef (pipeline multi-état dédié), mais ses dimensions codées en dur restent cohérentes avec componentDefinitions.js (source canonique vérifiée au runtime)`, () => {
          const rawSource = readFileSync(resolve(PARTS_DIR, file), "utf-8")
          const codeOnly = stripComments(rawSource)
          expect(codeOnly).not.toMatch(
            /import\s*\{\s*getComponentDef\s*\}\s*from\s*["']\.\.\/\.\.\/config\/componentDefinitions\.js["']/
          )
          const type = DEFAULT_REGISTRATIONS.find((entry) => `${entry.component.name}.jsx` === file)?.type
          const def = getComponentDef(type)
          const literalWidth = Number(codeOnly.match(/\bwidth=\{(\d+)\}/)?.[1])
          const literalHeight = Number(codeOnly.match(/\bheight=\{(\d+)\}/)?.[1])
          expect(literalWidth, `${file} : largeur codée en dur introuvable ou incohérente avec componentDefinitions.js`).toBe(def.width)
          expect(literalHeight, `${file} : hauteur codée en dur introuvable ou incohérente avec componentDefinitions.js`).toBe(def.height)
        })
        continue
      }

      it(`${file} : importe getComponentDef depuis componentDefinitions.js (source canonique unique)`, () => {
        const rawSource = readFileSync(resolve(PARTS_DIR, file), "utf-8")
        const codeOnly = stripComments(rawSource)
        expect(codeOnly).toMatch(
          /import\s*\{\s*getComponentDef\s*\}\s*from\s*["']\.\.\/\.\.\/config\/componentDefinitions\.js["']/
        )
      })
      continue
    }

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
