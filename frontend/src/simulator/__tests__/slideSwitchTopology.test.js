import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { prepareCircuit } from "../preparation.js"
import {
  getCanonicalEntry,
  getAllCanonicalEntries,
  getAllCanonicalTypes,
  validateCanonicalEntrySet,
} from "../canonicalRegistry.js"
import { createComponent } from "../../config/componentDefinitions.js"

/**
 * A3-SW1 — Slide Switch (SPDT). Couvre les tests d'acceptation électriques
 * et canoniques T-SW1-01 à T-SW1-09 et T-SW1-23, en réutilisant exclusivement
 * le contrat générique internalConnections introduit par A3-SW0 (aucune
 * modification de preparation.js pour ce ticket).
 */

const preparationSourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "preparation.js")

function sameNet(prepared, uidA, pinA, uidB, pinB) {
  return prepared.uf.find(prepared.uf.key(uidA, pinA)) === prepared.uf.find(prepared.uf.key(uidB, pinB))
}

describe("A3-SW1 — canonical entry", () => {
  it("T-SW1-01 : SLIDE_SWITCH existe dans canonicalRegistry", () => {
    expect(getAllCanonicalTypes()).toContain("SLIDE_SWITCH")
    expect(getCanonicalEntry("SLIDE_SWITCH")).not.toBeNull()
  })

  it("T-SW1-02 : possède exactement throwA, common, throwB", () => {
    const entry = getCanonicalEntry("SLIDE_SWITCH")
    expect(entry.pins.map((p) => p.id)).toEqual(["throwA", "common", "throwB"])
  })

  it("T-SW1-03 : default state = left (createComponent, source de vérité unique = componentDefinitions.initialState)", () => {
    const comp = createComponent("SLIDE_SWITCH", 0, 0)
    expect(comp.state).toBe("left")
  })
})

describe("A3-SW1 — topologie électrique (prepareCircuit + contrat générique A3-SW0)", () => {
  it("T-SW1-04 : left — common et throwA appartiennent au même net", () => {
    const prepared = prepareCircuit([{ uid: "sw1", type: "SLIDE_SWITCH", state: "left" }], [])
    expect(sameNet(prepared, "sw1", "common", "sw1", "throwA")).toBe(true)
  })

  it("T-SW1-05 : left — common et throwB restent dans des nets distincts", () => {
    const prepared = prepareCircuit([{ uid: "sw1", type: "SLIDE_SWITCH", state: "left" }], [])
    expect(sameNet(prepared, "sw1", "common", "sw1", "throwB")).toBe(false)
  })

  it("T-SW1-06 : right — common et throwB appartiennent au même net", () => {
    const prepared = prepareCircuit([{ uid: "sw1", type: "SLIDE_SWITCH", state: "right" }], [])
    expect(sameNet(prepared, "sw1", "common", "sw1", "throwB")).toBe(true)
  })

  it("T-SW1-07 : right — common et throwA restent dans des nets distincts", () => {
    const prepared = prepareCircuit([{ uid: "sw1", type: "SLIDE_SWITCH", state: "right" }], [])
    expect(sameNet(prepared, "sw1", "common", "sw1", "throwA")).toBe(false)
  })

  it("T-SW1-08 : throwA et throwB ne sont jamais directement connectés (ni left, ni right)", () => {
    const preparedLeft = prepareCircuit([{ uid: "sw1", type: "SLIDE_SWITCH", state: "left" }], [])
    const preparedRight = prepareCircuit([{ uid: "sw1", type: "SLIDE_SWITCH", state: "right" }], [])
    expect(sameNet(preparedLeft, "sw1", "throwA", "sw1", "throwB")).toBe(false)
    expect(sameNet(preparedRight, "sw1", "throwA", "sw1", "throwB")).toBe(false)
  })

  it("état inconnu/absent : aucune connexion interne, aucun crash", () => {
    expect(() => prepareCircuit([{ uid: "sw1", type: "SLIDE_SWITCH", state: "bogus" }], [])).not.toThrow()
    const prepared = prepareCircuit([{ uid: "sw1", type: "SLIDE_SWITCH" }], [])
    expect(sameNet(prepared, "sw1", "common", "sw1", "throwA")).toBe(false)
    expect(sameNet(prepared, "sw1", "common", "sw1", "throwB")).toBe(false)
  })
})

describe("A3-SW1 — architecture guard", () => {
  it("T-SW1-09 : preparation.js ne contient aucune référence à SLIDE_SWITCH", () => {
    const source = fs.readFileSync(preparationSourcePath, "utf-8")
    expect(source).not.toMatch(/SLIDE_SWITCH/)
  })
})

describe("A3-SW1 — non-régression Registry", () => {
  it("T-SW1-23 : les entrées canoniques complètes restent valides", () => {
    // A3-SW2 : 21 -> 22 (DIP_SWITCH ajouté après ce ticket A3-SW1) — le
    // compte exact n'est plus le sujet de CE test, verrouillé séparément par
    // canonicalRegistry.test.js (même traitement que T-SW0-12/switchTopology.test.js).
    const entries = getAllCanonicalEntries()
    expect(entries.length).toBeGreaterThanOrEqual(21)
    expect(validateCanonicalEntrySet(entries)).toEqual({ valid: true, errors: [] })
  })
})
