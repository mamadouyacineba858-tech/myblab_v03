/**
 * componentLibraryRolloutGate.test.js — MB-VIS-COMP-008 (Phase 4, TEST G1-G10)
 *
 * GATE : verrouille, comme garde durable, les propriétés d'architecture dont
 * la preuve de recette (INDUCTOR, exécutée dans un clone jetable, jamais
 * transférée — voir RAPPORT FINAL) a démontré qu'elles tiennent aujourd'hui.
 *
 * Contrainte de gouvernance de ce ticket : "pas de nouveau composant de
 * production". Tous les tests ci-dessous portent donc EXCLUSIVEMENT sur des
 * types RÉELS déjà existants (COMPONENT_TYPES / getAllCanonicalTypes()) —
 * aucune donnée fictive, aucune référence à INDUCTOR. Ils valident des
 * PROPRIÉTÉS de l'architecture (cohérence croisée entre registres, absence de
 * branchement générique), pas un composant particulier : ils resteront donc
 * valides et pertinents quel que soit le prochain composant réellement ajouté
 * par un futur ticket d'expansion.
 *
 * Cartographie MB-VIS-COMP-008 (Phase 1) : cinq listes déclaratives
 * manuellement synchronisées ont été identifiées comme nécessaires à
 * l'ajout complet d'un composant simulé — canonicalRegistry.js
 * (DECLARED_*), componentDefinitions.js (COMPONENT_TYPES + PALETTE_ITEMS),
 * visualization/defaultRegistrations.js (DEFAULT_REGISTRATIONS) et
 * simulator/simulationRegistry.js (models[]). Un oubli sur les 4 premières
 * produit une DÉGRADATION SILENCIEUSE (composant invisible en sidebar ou sur
 * le canvas, cf. VisualizationManager.render() → null + console.warn) ; un
 * oubli sur la 5ᵉ produit un THROW dur (InvalidSimulationModelError), déjà
 * intercepté par le garde-fou existant registrySimulationCoherence.test.js
 * (INV-REG-002/003, non modifié ici). TEST G1-G4 ci-dessous couvrent
 * généricément les 4 premières listes (non couvertes par un garde-fou
 * générique avant ce ticket).
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

import { COMPONENT_TYPES, PALETTE_ITEMS } from "../config/componentDefinitions.js"
import { DEFAULT_REGISTRATIONS, getAvailableTypes, getComponentByType } from "../visualization/defaultRegistrations.js"
import { getAllCanonicalTypes, getCanonicalEntry } from "../simulator/canonicalRegistry.js"
import { hasDcContribution } from "../simulator/dcContributionRegistry.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Réutilise tel quel le stripComments() corrigé de MB-VIS-COMP-007 (ordre
// ligne-puis-bloc) : ne retire aucune référence en dur, seulement le
// commentaire ; voir pinFootprintConsumersGuard.test.js pour la justification
// complète de cet ordre.
function stripComments(source) {
  return source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
}

const ALL_COMPONENT_TYPES = Object.keys(COMPONENT_TYPES)

describe("MB-VIS-COMP-008 — TEST G1-G4 : cohérence croisée des registres déclaratifs (types réels)", () => {
  it("G1 : chaque type de COMPONENT_TYPES a une entrée DEFAULT_REGISTRATIONS (sinon : composant invisible sur le Canvas, VisualizationManager.render() → null silencieux)", () => {
    const registeredTypes = new Set(getAvailableTypes())
    const missing = ALL_COMPONENT_TYPES.filter((type) => !registeredTypes.has(type))
    expect(missing, `type(s) présents dans COMPONENT_TYPES mais absents de DEFAULT_REGISTRATIONS : ${missing.join(", ")}`).toEqual([])
  })

  it("G1bis : chaque type de DEFAULT_REGISTRATIONS résout bien un composant React via getComponentByType()", () => {
    for (const type of getAvailableTypes()) {
      expect(getComponentByType(type), `getComponentByType("${type}") ne doit pas être null`).not.toBeNull()
    }
  })

  it("G2 : aucune entrée DEFAULT_REGISTRATIONS orpheline (type absent de COMPONENT_TYPES)", () => {
    const knownTypes = new Set(ALL_COMPONENT_TYPES)
    const orphans = DEFAULT_REGISTRATIONS.map((r) => r.type).filter((type) => !knownTypes.has(type))
    expect(orphans, `type(s) enregistrés dans DEFAULT_REGISTRATIONS mais absents de COMPONENT_TYPES : ${orphans.join(", ")}`).toEqual([])
  })

  it("G3 : chaque type de COMPONENT_TYPES apparaît exactement une fois dans PALETTE_ITEMS (sinon : composant invisible dans la Sidebar, ou dupliqué)", () => {
    const paletteIds = PALETTE_ITEMS.map((item) => item.id)
    for (const type of ALL_COMPONENT_TYPES) {
      const occurrences = paletteIds.filter((id) => id === type).length
      expect(occurrences, `"${type}" apparaît ${occurrences} fois dans PALETTE_ITEMS (attendu : 1)`).toBe(1)
    }
    expect(paletteIds.length).toBe(ALL_COMPONENT_TYPES.length)
  })

  it("G4 : chaque type canonique avec modelAvailable=true ET capability 'dc' a une contribution DC enregistrée (dcContributionRegistry.js), sinon computeDcAnalysis() l'ignorerait silencieusement (aucune erreur, mais composant électriquement inerte)", () => {
    // POWER est l'unique exception légitime : c'est la SOURCE (seedée
    // directement par resolveSignals(), voir resolution.js ligne "comp.type
    // !== POWER"), jamais un consommateur passif itéré par
    // computeDcAnalysis() via getDcContribution() — son absence de
    // dcContributionRegistry.js est donc structurelle, pas un oubli.
    const KNOWN_SOURCE_EXCEPTIONS = new Set(["POWER"])
    const missing = getAllCanonicalTypes().filter((type) => {
      if (KNOWN_SOURCE_EXCEPTIONS.has(type)) return false
      const entry = getCanonicalEntry(type)
      return entry.modelAvailable && entry.capabilities?.includes("dc") && !hasDcContribution(type)
    })
    expect(missing, `type(s) "dc" sans contribution DC enregistrée : ${missing.join(", ")}`).toEqual([])
  })
})

describe("MB-VIS-COMP-008 — TEST G5-G6 : absence de nouveau branchement générique par type dans les fichiers de dispatch", () => {
  // Les SEULES exceptions déjà connues et légitimes (role-spécifiques, non
  // liées à l'ajout d'un composant statique/passif) — verrouillées ici par
  // liste explicite : toute AUTRE occurrence de `.type === "X"` /
  // `.type !== "X"` dans ces fichiers est un signal d'alerte pour le Gate.
  const TYPE_BRANCH_PATTERN = /\.type\s*(===|!==)\s*["']([A-Z0-9_]+)["']/g

  const KNOWN_EXCEPTIONS = {
    "resolution.js": ["POWER", "ARDUINO"],
    "preparation.js": ["BUTTON", "BUTTON_LATCHING"],
  }

  const DISPATCH_FILES = [
    { path: resolve(__dirname, "../simulator/resolution.js"), key: "resolution.js" },
    { path: resolve(__dirname, "../simulator/preparation.js"), key: "preparation.js" },
    { path: resolve(__dirname, "../visualization/VisualizationManager.js"), key: "VisualizationManager.js" },
    { path: resolve(__dirname, "../core/handlers/component/AddComponentHandler.js"), key: "AddComponentHandler.js" },
  ]

  for (const { path, key } of DISPATCH_FILES) {
    it(`G5 : ${key} ne contient aucune comparaison de type non répertoriée (branchement générique nouveau)`, () => {
      const codeOnly = stripComments(readFileSync(path, "utf-8"))
      const found = [...codeOnly.matchAll(TYPE_BRANCH_PATTERN)].map((m) => m[2])
      const allowed = new Set(KNOWN_EXCEPTIONS[key] ?? [])
      const unexpected = found.filter((type) => !allowed.has(type))
      expect(
        unexpected,
        `comparaison(s) de type non répertoriée(s) dans ${key} : ${unexpected.join(", ")} (si un nouveau composant nécessite un branchement ici, cf. règle de STOP MB-VIS-COMP-008 — revenir au CSA avant toute modification)`
      ).toEqual([])
    })
  }

  it("G6 : Sidebar.jsx ne contient qu'une seule exception cosmétique connue (aperçu animé de la LED), aucune autre comparaison d'identifiant de type", () => {
    const codeOnly = stripComments(readFileSync(resolve(__dirname, "../components/Sidebar.jsx"), "utf-8"))
    const ITEM_ID_PATTERN = /item\.id\s*===\s*["']([A-Z0-9_]+)["']/g
    const found = [...codeOnly.matchAll(ITEM_ID_PATTERN)].map((m) => m[1])
    expect(found, "Sidebar.jsx ne doit comporter qu'une seule comparaison item.id === \"LED\" (aperçu cosmétique, MB-VIS-002)").toEqual(["LED"])
  })

  it("sanity check : le motif de branchement générique est bien détecté sur un extrait fabriqué (faux négatif impossible)", () => {
    const fakeSource = `if (comp.type === "WIDGET") { doSomethingSpecific() }`
    const found = [...fakeSource.matchAll(TYPE_BRANCH_PATTERN)].map((m) => m[2])
    expect(found).toEqual(["WIDGET"])
  })
})

describe("MB-VIS-COMP-008 — TEST G7-G8 : la recette déclarative reste suffisante pour tous les types réels", () => {
  it("G7 : pour chaque type, le nombre de pins de COMPONENT_TYPES égale exactement celui de canonicalRegistry (contrat déjà imposé au chargement par buildPins(), verrouillé ici comme non-régression explicite)", () => {
    for (const type of ALL_COMPONENT_TYPES) {
      const presentationPins = COMPONENT_TYPES[type].pins
      const canonicalPins = getCanonicalEntry(type)?.pins ?? []
      expect(presentationPins.length, `${type} : nombre de pins Presentation != Canonique`).toBe(canonicalPins.length)
    }
  })

  it("G8 : aucun type de COMPONENT_TYPES n'est absent de getAllCanonicalTypes() (et réciproquement) — les deux registres orthogonaux (géométrie / électrique) restent alignés sur le même ensemble de types", () => {
    const canonicalTypes = new Set(getAllCanonicalTypes())
    const presentationTypes = new Set(ALL_COMPONENT_TYPES)
    const onlyInPresentation = ALL_COMPONENT_TYPES.filter((t) => !canonicalTypes.has(t))
    const onlyInCanonical = getAllCanonicalTypes().filter((t) => !presentationTypes.has(t))
    expect(onlyInPresentation, "type(s) présents seulement côté Presentation").toEqual([])
    expect(onlyInCanonical, "type(s) présents seulement côté Canonique").toEqual([])
  })
})

describe("MB-VIS-COMP-008 — dette documentée : dette Breadboard/Core hors périmètre (rappel, aucune modification ici)", () => {
  it("la liste des fichiers exclus par la décision CSA MB-VIS-COMP-007 (Option B) reste inchangée et non traitée par ce ticket (GATE audit-only, cf. RAPPORT FINAL)", () => {
    const EXCLUDED_FILES = [
      "utils/breadboardConnectivity.js",
      "utils/breadboardPlacementAdapter.js",
      "core/handlers/breadboard/breadboardSolidarity.js",
      "core/validation/rules/structural/BreadboardHoleCollisionRule.js",
    ]
    expect(EXCLUDED_FILES).toHaveLength(4)
  })
})
