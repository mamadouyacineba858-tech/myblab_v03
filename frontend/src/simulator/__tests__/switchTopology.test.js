import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { prepareCircuit } from "../preparation.js"
import {
  getCanonicalEntry,
  getAllCanonicalEntries,
  resolveInternalConnections,
  validateCanonicalEntry,
  validateCanonicalEntrySet,
} from "../canonicalRegistry.js"

/**
 * A3-SW0 — Generic Switch Topology Contract (blueprint CSA, base
 * de3cb280c76301b5951a3ad3f30217e03d3e7712).
 * Couvre les tests d'acceptation T-SW0-01 à T-SW0-12.
 */

const preparationSourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "preparation.js")
const canonicalRegistrySourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "canonicalRegistry.js")

function sameNet(prepared, uidA, pinA, uidB, pinB) {
  return prepared.uf.find(prepared.uf.key(uidA, pinA)) === prepared.uf.find(prepared.uf.key(uidB, pinB))
}

describe("A3-SW0 — BUTTON via internalConnections", () => {
  it("T-SW0-01 : BUTTON released -> pin1/pin2 restent dans des nets distincts", () => {
    const prepared = prepareCircuit([{ uid: "b1", type: "BUTTON", state: "released" }], [])
    expect(sameNet(prepared, "b1", "pin1", "b1", "pin2")).toBe(false)
  })

  it("T-SW0-02 : BUTTON pressed -> pin1/pin2 appartiennent au même net", () => {
    const prepared = prepareCircuit([{ uid: "b1", type: "BUTTON", state: "pressed" }], [])
    expect(sameNet(prepared, "b1", "pin1", "b1", "pin2")).toBe(true)
  })
})

describe("A3-SW0 — BUTTON_LATCHING via internalConnections", () => {
  it("T-SW0-03 : BUTTON_LATCHING off -> pin1/pin2 restent séparés", () => {
    const prepared = prepareCircuit([{ uid: "s1", type: "BUTTON_LATCHING", state: "off" }], [])
    expect(sameNet(prepared, "s1", "pin1", "s1", "pin2")).toBe(false)
  })

  it("T-SW0-04 : BUTTON_LATCHING on -> pin1/pin2 appartiennent au même net", () => {
    const prepared = prepareCircuit([{ uid: "s1", type: "BUTTON_LATCHING", state: "on" }], [])
    expect(sameNet(prepared, "s1", "pin1", "s1", "pin2")).toBe(true)
  })
})

describe("A3-SW0 — resolveInternalConnections : robustesse", () => {
  it("T-SW0-05 : état absent/inconnu -> aucune connexion, aucun crash", () => {
    const entry = getCanonicalEntry("BUTTON")
    expect(resolveInternalConnections(entry, { state: "not-a-real-state" })).toEqual([])
    expect(resolveInternalConnections(entry, {})).toEqual([])
    expect(resolveInternalConnections(entry, undefined)).toEqual([])
    expect(() => prepareCircuit([{ uid: "b1", type: "BUTTON", state: "bogus" }], [])).not.toThrow()
  })

  it("T-SW0-06 : un composant sans contrat de topologie ne reçoit aucune connexion", () => {
    const entry = getCanonicalEntry("RESISTOR")
    expect(entry.internalConnections).toBeNull()
    expect(resolveInternalConnections(entry, { state: "anything" })).toEqual([])
    const prepared = prepareCircuit([{ uid: "r1", type: "RESISTOR" }], [])
    expect(sameNet(prepared, "r1", "A", "r1", "B")).toBe(false)
  })

  it("T-SW0-07 : le resolver supporte plusieurs connexions actives dans le même état", () => {
    const entry = {
      type: "TEST_MULTI",
      pins: [
        { id: "a", role: "passive" },
        { id: "b", role: "passive" },
        { id: "c", role: "passive" },
        { id: "d", role: "passive" },
      ],
      internalConnections: { states: { closed: [["a", "b"], ["c", "d"]] } },
      parameterSchema: null,
      defaultParameters: null,
      capabilities: null,
      modelAvailable: false,
    }
    expect(resolveInternalConnections(entry, { state: "closed" })).toEqual([["a", "b"], ["c", "d"]])
  })

  it("T-SW0-08 : le resolver ne dépend d'aucun nom de type", () => {
    const source = fs.readFileSync(canonicalRegistrySourcePath, "utf-8")
    const fnStart = source.indexOf("export function resolveInternalConnections")
    expect(fnStart).toBeGreaterThan(-1)
    const fnBody = source.slice(fnStart, source.indexOf("\n}", fnStart) + 2)
    expect(fnBody).not.toMatch(/BUTTON|SWITCH|LATCHING/)
  })
})

describe("A3-SW0 — validation canonique de la topologie déclarée", () => {
  it("T-SW0-09 : une topologie déclarée avec une pin inexistante est rejetée", () => {
    const entry = {
      type: "TEST_BAD_PIN",
      pins: [{ id: "a", role: "passive" }],
      internalConnections: { states: { closed: [["a", "ghost"]] } },
      parameterSchema: null,
      defaultParameters: null,
      capabilities: null,
      modelAvailable: false,
    }
    const result = validateCanonicalEntry(entry)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('unknown pin "ghost"'))).toBe(true)
  })

  it("une entrée sans internalConnections reste parfaitement valide", () => {
    const entry = {
      type: "TEST_NO_TOPOLOGY",
      pins: [{ id: "a", role: "passive" }],
      internalConnections: null,
      parameterSchema: null,
      defaultParameters: null,
      capabilities: null,
      modelAvailable: false,
    }
    expect(validateCanonicalEntry(entry)).toEqual({ valid: true, errors: [] })
  })
})

describe("A3-SW0 — architecture guard preparation.js", () => {
  it("T-SW0-10 : preparation.js ne contient aucune branche type-spécifique BUTTON/BUTTON_LATCHING et n'importe pas componentDefinitions", () => {
    const source = fs.readFileSync(preparationSourcePath, "utf-8")
    expect(source).not.toMatch(/comp\.type\s*===\s*["']BUTTON["']/)
    expect(source).not.toMatch(/comp\.type\s*===\s*["']BUTTON_LATCHING["']/)
    expect(source).not.toContain('componentDefinitions.js')
  })
})

describe("A3-SW0 — non-régression Registry", () => {
  it("T-SW0-12 : canonicalRegistry continue à valider tous les composants existants", () => {
    // A3-SW1 : 20 -> 21 (SLIDE_SWITCH ajouté après ce ticket A3-SW0) — le
    // compte exact n'est plus le sujet de CE test (T-SW0-12 porte sur la
    // validité de l'ensemble, pas sur son cardinal, verrouillé séparément
    // par canonicalRegistry.test.js).
    const entries = getAllCanonicalEntries()
    expect(entries.length).toBeGreaterThanOrEqual(20)
    expect(validateCanonicalEntrySet(entries)).toEqual({ valid: true, errors: [] })
  })
})
