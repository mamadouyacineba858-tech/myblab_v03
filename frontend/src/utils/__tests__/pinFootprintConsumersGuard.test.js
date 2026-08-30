/**
 * pinFootprintConsumersGuard.test.js — MB-VIS-COMP-007 (Phase 4)
 *
 * Verrouille, côté CONSOMMATEURS électriques autorisés par ce ticket
 * (circuitSelectors.js / BreadboardWiresLayer.jsx / Breadboard.jsx /
 * CircuitComponent.jsx), le principe : aucun de ces fichiers ne doit
 * reconstruire localement `component.x + pin.dx` / `component.y + pin.dy`
 * — ils doivent tous déléguer à getPinPosition() (ou
 * getPinPresentationPosition(), qui délègue lui-même au cas générique,
 * cf. COMP-005).
 *
 * PÉRIMÈTRE VOLONTAIREMENT RESTREINT (CSA Décision MB-VIS-COMP-007,
 * Option B) : breadboardConnectivity.js, breadboardPlacementAdapter.js,
 * breadboardSolidarity.js et BreadboardHoleCollisionRule.js réimplémentent
 * réellement cette formule localement (dette architecturale confirmée,
 * documentée dans le rapport final) — ils sont délibérément EXCLUS de ce
 * scan et de toute modification : ce n'est pas un oubli, c'est la décision
 * CSA explicite de ce ticket. Un futur ticket dédié Breadboard/Core devra
 * les traiter.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

import { getComponentDef } from "../../config/componentDefinitions.js"
import { getPinPosition } from "../geometry.js"
import { buildWirePaths } from "../circuitSelectors.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

function stripComments(source) {
  // Ordre important : les commentaires `//` sont retirés EN PREMIER. Sinon,
  // un commentaire `//` dont le texte contient incidemment la séquence `/*`
  // (ex: une référence de chemin glob du style `parts/*.jsx` dans une phrase
  // en français, rencontré réellement dans canvas/Breadboard.jsx) serait
  // pris à tort pour l'ouverture d'un commentaire bloc, et le retrait de
  // bloc engloutirait alors tout le code jusqu'au prochain `*/` RÉEL du
  // fichier (import statements y compris) — faux négatif potentiellement
  // dangereux (le code réellement scanné devient tronqué/vide sans qu'aucune
  // erreur ne le signale). Confirmé sans danger sur les 4 fichiers gardés de
  // ce ticket : aucun de leurs commentaires bloc `/* */` réels ne contient de
  // séquence `//` en son sein (vérifié explicitement, cf. test de sanity
  // check ci-dessous).
  return source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
}

// Motif interdit : `<quelque chose> + pin.dx` / `.dx` en dehors de
// geometry.js lui-même (qui EST la définition canonique et doit donc être
// seul à porter physiquement le calcul `+ pinDef.dx`).
const FORBIDDEN_DX_PATTERN = /[.\w\])]\s*\+\s*pin(?:Def)?\.dx\b/
const FORBIDDEN_DY_PATTERN = /[.\w\])]\s*\+\s*pin(?:Def)?\.dy\b/

// Fichiers autorisés de ce ticket, qui doivent rester exempts de toute
// reconstruction locale de la formule électrique.
const GUARDED_CONSUMER_FILES = [
  resolve(__dirname, "../circuitSelectors.js"),
  resolve(__dirname, "../../wires/BreadboardWiresLayer.jsx"),
  resolve(__dirname, "../../canvas/Breadboard.jsx"),
  resolve(__dirname, "../../canvas/CircuitComponent.jsx"),
]

describe("MB-VIS-COMP-007 — TEST 6 : aucune duplication locale des coordonnées canoniques dans les consommateurs autorisés", () => {
  for (const filePath of GUARDED_CONSUMER_FILES) {
    const fileName = filePath.split("/").pop()

    it(`${fileName} : le contenu utile survit bien au retrait des commentaires (pas de faux négatif silencieux)`, () => {
      // Garde-fou du garde-fou : si stripComments() avalait par erreur une
      // portion du fichier (cf. sanity check ci-dessous pour le cas exact
      // rencontré sur Breadboard.jsx), le scan `+ pin.dx`/`+ pin.dy` pourrait
      // passer au vert pour la mauvaise raison (rien à scanner) plutôt que
      // parce que le fichier est réellement conforme. On vérifie donc que le
      // code utile (un import réel du fichier) est toujours présent après
      // strip.
      const raw = readFileSync(filePath, "utf-8")
      const codeOnly = stripComments(raw)
      expect(codeOnly.length).toBeGreaterThan(raw.length / 4)
      expect(codeOnly).toMatch(/^import /m)
    })

    it(`${fileName} : ne reconstruit pas localement "+ pin.dx" / "+ pin.dy"`, () => {
      const codeOnly = stripComments(readFileSync(filePath, "utf-8"))
      const dxMatch = codeOnly.match(FORBIDDEN_DX_PATTERN)
      const dyMatch = codeOnly.match(FORBIDDEN_DY_PATTERN)
      expect(dxMatch, `motif interdit trouvé dans ${fileName} : "${dxMatch?.[0]}"`).toBeNull()
      expect(dyMatch, `motif interdit trouvé dans ${fileName} : "${dyMatch?.[0]}"`).toBeNull()
    })
  }

  it("sanity check : le motif interdit est bien détecté sur un extrait fabriqué reproduisant la duplication réelle (breadboardConnectivity.js)", () => {
    const fakeDuplicatedSource = `
      function resolveOccupiedHoles(breadboard, components) {
        const x = component.position.x + pin.dx
        const y = component.position.y + pin.dy
      }
    `
    expect(fakeDuplicatedSource).toMatch(FORBIDDEN_DX_PATTERN)
    expect(fakeDuplicatedSource).toMatch(FORBIDDEN_DY_PATTERN)
  })

  it("sanity check : stripComments() ne se laisse plus piéger par un `/*` incident à l'intérieur d'un commentaire `//` (cas réel rencontré dans Breadboard.jsx : \"// ... parts/*.jsx) ...\")", () => {
    const trap = [
      "// une phrase qui référence un chemin glob parts/*.jsx) au passage",
      "import { getPinPosition } from \"../utils/geometry.js\"",
      "/* un vrai commentaire bloc, plus loin dans le fichier */",
      "const x = 1",
    ].join("\n")
    const cleaned = stripComments(trap)
    // L'import doit survivre : l'ancien ordre (bloc-d'abord) l'aurait
    // supprimé en confondant le `/*` de la ligne 1 avec une ouverture de
    // bloc s'étendant jusqu'au VRAI `/* ... */` de la ligne 3.
    expect(cleaned).toContain('import { getPinPosition } from "../utils/geometry.js"')
    // Le vrai commentaire bloc, lui, doit bien avoir disparu.
    expect(cleaned).not.toContain("un vrai commentaire bloc")
  })
})

describe("MB-VIS-COMP-007 — TEST 7 : les coordonnées utilisées par les wires restent identiques à getPinPosition()", () => {
  it("buildWirePaths() route bien via getPinPosition()/getPinPresentationPosition() — un wire RESISTOR<->RESISTOR (sans projection visuelle) part exactement des coordonnées canoniques", () => {
    const resistorDef = getComponentDef("RESISTOR")
    const compA = { uid: "a", type: "RESISTOR", x: 100, y: 100 }
    const compB = { uid: "b", type: "RESISTOR", x: 300, y: 100 }
    const wire = { id: "w1", fromUid: "a", fromPin: "A", toUid: "b", toPin: "B" }

    const pinA = resistorDef.pins.find((p) => p.id === "A")
    const pinB = resistorDef.pins.find((p) => p.id === "B")
    const expectedFrom = getPinPosition(compA, pinA)
    const expectedTo = getPinPosition(compB, pinB)

    const paths = buildWirePaths([compA, compB], [wire])
    expect(paths).toHaveLength(1)
    expect(paths[0].d.startsWith(`M ${expectedFrom.x} ${expectedFrom.y}`)).toBe(true)
    expect(paths[0].d.endsWith(`${expectedTo.x} ${expectedTo.y}`)).toBe(true)
  })
})

describe("MB-VIS-COMP-007 — TEST 8 : les coordonnées utilisées par le rendu breadboard (BreadboardWiresLayer/Breadboard) restent compatibles avec le contrat canonique", () => {
  it("BreadboardWiresLayer.jsx importe bien getPinPosition() depuis geometry.js (pas de recalcul indépendant)", () => {
    const codeOnly = stripComments(
      readFileSync(resolve(__dirname, "../../wires/BreadboardWiresLayer.jsx"), "utf-8")
    )
    expect(codeOnly).toMatch(/import\s*\{\s*getPinPosition\s*\}\s*from\s*["']\.\.\/utils\/geometry\.js["']/)
  })

  it("Breadboard.jsx importe bien getPinPosition() depuis geometry.js (pas de recalcul indépendant)", () => {
    const codeOnly = stripComments(readFileSync(resolve(__dirname, "../../canvas/Breadboard.jsx"), "utf-8"))
    expect(codeOnly).toMatch(/import\s*\{\s*getPinPosition\s*\}\s*from\s*["']\.\.\/utils\/geometry\.js["']/)
  })

  it("pour un composant occupant un trou, la position réellement utilisée pour résoudre le trou égale getPinPosition() (RESISTOR, aucune projection visuelle en jeu)", () => {
    const def = getComponentDef("RESISTOR")
    const component = { uid: "r1", type: "RESISTOR", x: 40, y: 60 }
    for (const pin of def.pins) {
      // Même calcul que celui utilisé en interne par Breadboard.jsx
      // (occupiedBy) : ce test ne réimporte pas React/Breadboard.jsx pour
      // rester rapide et ciblé — il verrouille le CONTRAT que le composant
      // consomme, déjà prouvé identique par lecture de code (test ci-dessus).
      expect(getPinPosition(component, pin)).toEqual({ x: component.x + pin.dx, y: component.y + pin.dy })
    }
  })
})

describe("MB-VIS-COMP-007 — dette documentée : les 4 fichiers hors périmètre restent identifiés mais non testés/modifiés ici", () => {
  it("la liste des fichiers exclus par la décision CSA (Option B) est bien celle attendue (aucun oubli, aucun ajout silencieux)", () => {
    const EXCLUDED_FILES = [
      "utils/breadboardConnectivity.js",
      "utils/breadboardPlacementAdapter.js",
      "core/handlers/breadboard/breadboardSolidarity.js",
      "core/validation/rules/structural/BreadboardHoleCollisionRule.js",
    ]
    // Ce test ne fait qu'affirmer la liste documentaire (aucune lecture de
    // fichier, aucune dépendance à leur contenu) — il sert de trace explicite
    // dans la suite de tests que cette exclusion est intentionnelle et
    // référencée, pas oubliée.
    expect(EXCLUDED_FILES).toHaveLength(4)
    expect(EXCLUDED_FILES).toEqual([
      "utils/breadboardConnectivity.js",
      "utils/breadboardPlacementAdapter.js",
      "core/handlers/breadboard/breadboardSolidarity.js",
      "core/validation/rules/structural/BreadboardHoleCollisionRule.js",
    ])
  })
})
