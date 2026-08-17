import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  getAllCanonicalTypes,
  getAllCanonicalEntries,
  getCanonicalEntry,
  hasCanonicalType,
} from "../canonicalRegistry.js"

/**
 * MB-CF2-001 — Tests de conformité architecturale (Ticket §12, GATE 3).
 *
 * Ce fichier couvre UNIQUEMENT les invariants INV-CF2-001 à INV-CF2-010 qui
 * ne sont pas déjà démontrés par des tests antérieurs (voir
 * docs/pmo/specifications/MB-CF2-001-registry-cartography-and-conformance.md
 * §3 pour la table de couverture existante — INV-CF2-002/003/004/007/008
 * sont déjà testés par canonicalRegistry.test.js, canonicalRegistryArchitecture.test.js,
 * registrySimulationCoherence.test.js et componentDefinitionsBoundary.test.js,
 * et ne sont donc pas dupliqués ici, conformément au principe de conservation
 * du §8 du ticket).
 *
 * Aucune modification n'a été apportée à canonicalRegistry.js,
 * componentDefinitions.js ou simulationRegistry.js pour produire ces tests.
 *
 * [AMENDEMENT CSA-CF4-001-A — MB-CF4-001] INV-CF2-009 est restreint (et non
 * supprimé) : le noyau du Validation Engine (ValidationEngine.js,
 * ValidationRegistry.js, ValidationReport.js, ValidationProblem.js,
 * constants.js, errors/) reste agnostique du Registry canonique, exactement
 * comme avant. Seul core/validation/rules/** (règles métier CF4, par nature
 * spécifiques au domaine électronique) est désormais explicitement autorisé
 * à consulter canonicalRegistry — condition posée par le contrat CF4 pour
 * éviter toute duplication des types/rôles/parameterSchema/defaultParameters.
 * Amendement additif, scopé à ce seul sous-dossier ; voir le rapport de
 * livraison MB-CF4-001 pour le texte intégral de l'arbitrage.
 */

const simulatorDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(simulatorDir, "..", "..")
const registryJsPath = path.join(simulatorDir, "..", "registry.js")
const componentRegistryTsPath = path.join(srcDir, "core", "ComponentRegistry.ts")
const validationDir = path.join(srcDir, "core", "validation")
const validationRulesDir = path.join(validationDir, "rules")
const canonicalRegistryPath = path.join(simulatorDir, "..", "canonicalRegistry.js")

function listJsFilesRecursive(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listJsFilesRecursive(full))
    else if (entry.isFile() && /\.(js|jsx|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

describe("MB-CF2-001 — INV-CF2-010 : les anciens registres ne deviennent pas implicitement canoniques", () => {
  it("frontend/src/simulator/registry.js reste absent (supprimé avant la baseline, non recréé)", () => {
    expect(fs.existsSync(registryJsPath)).toBe(false)
  })

  it("frontend/src/core/ComponentRegistry.ts reste absent (supprimé avant la baseline, non recréé)", () => {
    expect(fs.existsSync(componentRegistryTsPath)).toBe(false)
  })

  it("aucun fichier de production n'importe 'ComponentRegistry' (l'ancien registre B1/B2 n'est référencé nulle part)", () => {
    for (const file of listJsFilesRecursive(srcDir)) {
      if (file.includes(`${path.sep}__tests__${path.sep}`) || file.includes(`${path.sep}tests${path.sep}`)) continue
      const source = fs.readFileSync(file, "utf-8")
      expect(source, `${path.relative(srcDir, file)} ne devrait pas référencer ComponentRegistry`).not.toMatch(/ComponentRegistry/)
    }
  })

  it("le seul 'registry.js' importé en production est frontend/src/visualization/registry.js (RendererRegistry, hors périmètre CF2, sans rapport avec le Registry canonique)", () => {
    for (const file of listJsFilesRecursive(srcDir)) {
      if (file.includes(`${path.sep}__tests__${path.sep}`) || file.includes(`${path.sep}tests${path.sep}`)) continue
      const source = fs.readFileSync(file, "utf-8")
      const matches = [...source.matchAll(/from\s+["'](.*registry\.js)["']/g)].map((m) => m[1])
      for (const m of matches) {
        expect(m).toMatch(/^\.\/registry\.js$/) // uniquement l'import relatif local de visualization/
      }
    }
  })
})

describe("MB-CF2-001 — INV-CF2-005 / INV-CF2-001 : canonicalRegistry.js reste l'unique source canonique", () => {
  it("aucun autre fichier de frontend/src ne définit une liste de types canoniques concurrente (DECLARED_TYPE_ORDER)", () => {
    for (const file of listJsFilesRecursive(srcDir)) {
      if (file === canonicalRegistryPath) continue
      if (file.includes(`${path.sep}__tests__${path.sep}`) || file.includes(`${path.sep}tests${path.sep}`)) continue
      const source = fs.readFileSync(file, "utf-8")
      expect(source, `${path.relative(srcDir, file)} ne devrait pas redéclarer DECLARED_TYPE_ORDER`).not.toMatch(/DECLARED_TYPE_ORDER/)
    }
  })

  it("componentDefinitions.js et simulationRegistry.js dérivent leur connaissance des types exclusivement de canonicalRegistry.js (pas de liste de types codée en dur indépendante)", () => {
    const componentDefinitionsPath = path.join(srcDir, "config", "componentDefinitions.js")
    const simulationRegistryPath = path.join(simulatorDir, "..", "simulationRegistry.js")
    for (const file of [componentDefinitionsPath, simulationRegistryPath]) {
      const source = fs.readFileSync(file, "utf-8")
      expect(source).toMatch(/from\s+["'].*canonicalRegistry\.js["']/)
    }
  })
})

describe("MB-CF2-001 — INV-CF2-006 : la connaissance déclarative est déterministe", () => {
  it("getCanonicalEntry(type) retourne la même référence à chaque appel (pas de reconstruction, pas d'état caché)", () => {
    const first = getCanonicalEntry("RESISTOR")
    const second = getCanonicalEntry("RESISTOR")
    expect(first).toBe(second)
    expect(first).toEqual(second)
  })

  it("getAllCanonicalEntries() et getAllCanonicalTypes() sont stables entre deux appels successifs", () => {
    expect(getAllCanonicalEntries()).toBe(getAllCanonicalEntries())
    expect(getAllCanonicalTypes()).toBe(getAllCanonicalTypes())
  })

  it("hasCanonicalType est une fonction pure : même entrée, même sortie, aucun effet de bord observable", () => {
    for (let i = 0; i < 3; i++) {
      expect(hasCanonicalType("LED")).toBe(true)
      expect(hasCanonicalType("NOT_A_REAL_TYPE")).toBe(false)
    }
  })
})

describe("MB-CF2-001 — INV-CF2-009 [AMENDÉ par CSA-CF4-001-A] : le noyau Validation reste indépendant du Registry ; seules les règles métier CF4 peuvent le consulter", () => {
  it("le noyau du Validation Engine (hors rules/**) ne référence ni canonicalRegistry.js, ni componentDefinitions.js, ni simulationRegistry.js", () => {
    for (const file of listJsFilesRecursive(validationDir)) {
      if (file.startsWith(validationRulesDir + path.sep)) continue // rules/** : autorisé par CSA-CF4-001-A
      const source = fs.readFileSync(file, "utf-8")
      expect(source, `${path.relative(srcDir, file)} ne devrait pas référencer le Registry`).not.toMatch(
        /canonicalRegistry|componentDefinitions|simulationRegistry/
      )
    }
  })

  it("[CSA-CF4-001-A] au moins une règle de core/validation/rules/ consulte réellement canonicalRegistry (l'amendement est utilisé, pas seulement permis)", () => {
    const ruleFiles = listJsFilesRecursive(validationRulesDir).filter(
      (f) => !f.includes(`${path.sep}__tests__${path.sep}`) && !f.includes(`${path.sep}tests${path.sep}`)
    )
    expect(ruleFiles.length).toBeGreaterThan(0)
    const referencingFiles = ruleFiles.filter((f) => /canonicalRegistry/.test(fs.readFileSync(f, "utf-8")))
    expect(referencingFiles.length).toBeGreaterThan(0)
  })

  it("[CSA-CF4-001-A] core/validation/rules/ ne duplique ni les types, ni les rôles/pins, ni les parameterSchema, ni les defaultParameters déclarés dans canonicalRegistry.js", () => {
    const DUPLICATED_DATA_MARKERS = [
      "DECLARED_TYPE_ORDER",
      "DECLARED_TYPES_PINS",
      "DECLARED_PARAMETER_SCHEMA",
      "DECLARED_DEFAULT_PARAMETERS",
    ]
    for (const file of listJsFilesRecursive(validationRulesDir)) {
      const source = fs.readFileSync(file, "utf-8")
      for (const marker of DUPLICATED_DATA_MARKERS) {
        expect(source, `${path.relative(srcDir, file)} ne devrait pas redéclarer ${marker}`).not.toMatch(
          new RegExp(marker)
        )
      }
    }
  })

  it("canonicalRegistry.js ne référence pas ValidationEngine ni core/validation/ (dépendance inverse toujours interdite)", () => {
    const source = fs.readFileSync(canonicalRegistryPath, "utf-8")
    expect(source).not.toMatch(/ValidationEngine/)
    expect(source).not.toMatch(/core\/validation/)
  })
})
