import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

/**
 * MB-L1-ARD-002 — §36 : verrou structurel confirmant la séparation
 * imposée par §21/§22/§24. Même patron que resolutionArchitecture.test.js/
 * measurementArchitecture.test.js : preuve par inspection statique du
 * source, pas d'introspection du graphe de modules réel.
 */
const __dirname = dirname(fileURLToPath(import.meta.url))

function readCodeOnly(relativePath) {
  const raw = readFileSync(resolve(__dirname, relativePath), "utf-8")
  return raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("MB-L1-ARD-002 — firmwareCompiler.js reste pur (§21)", () => {
  it("n'importe ni simulator/*, ni React, ni Document/History, ni core/*", () => {
    const source = readCodeOnly("../firmwareCompiler.js")
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\//)
    expect(source).not.toMatch(/from\s+["']react["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\//)
    expect(source).not.toMatch(/from\s+["'][^"']*History[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*useCircuitState[^"']*["']/)
  })

  it("n'utilise ni eval, ni new Function, ni comparaison littérale du texte entier d'une instruction connue (§8)", () => {
    const source = readCodeOnly("../firmwareCompiler.js")
    expect(source).not.toMatch(/\beval\s*\(/)
    expect(source).not.toMatch(/new\s+Function\s*\(/)
    expect(source).not.toMatch(/\.includes\(\s*["']digitalWrite\(2,\s*HIGH\)["']\s*\)/)
  })
})

describe("MB-L1-ARD-002 — firmwareExecutor.js reste isolé (§22/§24)", () => {
  it("n'importe ni React, ni Document/History, ni core/*, ni scheduler.js, ni runtimeOrchestrator.js", () => {
    const source = readCodeOnly("../firmwareExecutor.js")
    expect(source).not.toMatch(/from\s+["']react["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\//)
    expect(source).not.toMatch(/from\s+["'][^"']*History[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*useCircuitState[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*scheduler\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*runtimeOrchestrator[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*simulationRuntimeIntegration[^"']*["']/)
  })

  it("le seul import simulator/* autorisé est signals.js (vocabulaire pur, §25) — jamais resolution.js/preparation.js/dcContributionRegistry.js/canonicalRegistry.js/engine.js", () => {
    const source = readCodeOnly("../firmwareExecutor.js")
    const simulatorImports = [...source.matchAll(/from\s+["']([^"']*\/simulator\/[^"']*)["']/g)].map((m) => m[1])
    for (const importPath of simulatorImports) {
      expect(importPath, `import simulator/* inattendu : ${importPath}`).toMatch(/signals\.js$/)
    }
    expect(source).not.toMatch(/resolution\.js|preparation\.js|dcContributionRegistry\.js|canonicalRegistry\.js|engine\.js/)
  })
})

describe("MB-L1-ARD-002 — boardPinMap.js et firmwareDiagnostics.js sont des modules de données purs", () => {
  it("aucun des deux n'importe simulator/*, React, ni Document/History", () => {
    for (const file of ["../boardPinMap.js", "../firmwareDiagnostics.js"]) {
      const source = readCodeOnly(file)
      expect(source, `${file} ne devrait importer aucun module simulator/*`).not.toMatch(/from\s+["'][^"']*\/simulator\//)
      expect(source, `${file} ne devrait pas importer react`).not.toMatch(/from\s+["']react["']/)
    }
  })
})
