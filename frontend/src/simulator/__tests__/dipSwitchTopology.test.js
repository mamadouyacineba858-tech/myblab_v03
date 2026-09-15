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
  validateCanonicalEntry,
  resolveInternalConnections,
} from "../canonicalRegistry.js"
import { createComponent } from "../../config/componentDefinitions.js"

/**
 * A3-SW2 — DIP Switch 4 positions (SPST × 4). Couvre les tests
 * d'acceptation électriques et canoniques T1-T8 et les invariants
 * I-DIP-01..09/15/21 — extension générique du contrat A3-SW0 (forme
 * `internalConnections.channels`), aucune modification de preparation.js.
 */

const preparationSourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "preparation.js")

function sameNet(prepared, uidA, pinA, uidB, pinB) {
  return prepared.uf.find(prepared.uf.key(uidA, pinA)) === prepared.uf.find(prepared.uf.key(uidB, pinB))
}

describe("A3-SW2 — canonical entry (T1)", () => {
  it("T1 : DIP_SWITCH existe dans canonicalRegistry avec 8 pins", () => {
    expect(getAllCanonicalTypes()).toContain("DIP_SWITCH")
    const entry = getCanonicalEntry("DIP_SWITCH")
    expect(entry).not.toBeNull()
    expect(entry.pins).toHaveLength(8)
    expect(entry.pins.map((p) => p.id)).toEqual(["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"])
  })

  it("I-DIP-01 : DIP_SWITCH n'a pas de modèle DC dédié (topologie seule suffit, comme BUTTON/SLIDE_SWITCH)", () => {
    const entry = getCanonicalEntry("DIP_SWITCH")
    expect(entry.modelAvailable).toBe(false)
    expect(entry.parameterSchema).toBeNull()
  })
})

describe("A3-SW2 — default state (T2)", () => {
  it("T2 : createComponent -> 4 voies OFF (source de vérité unique = componentDefinitions.initialChannelStates)", () => {
    const comp = createComponent("DIP_SWITCH", 0, 0)
    expect(comp.channelStates).toEqual({ "1": "off", "2": "off", "3": "off", "4": "off" })
  })
})

describe("A3-SW2 — indépendance des canaux (T3, T4, I-DIP-08, I-DIP-09)", () => {
  it("T3 : toggle voie 1 seule -> 1=on, 2/3/4=off", () => {
    const channelStates = { "1": "on", "2": "off", "3": "off", "4": "off" }
    const prepared = prepareCircuit([{ uid: "d1", type: "DIP_SWITCH", channelStates }], [])
    expect(sameNet(prepared, "d1", "1A", "d1", "1B")).toBe(true)
    expect(sameNet(prepared, "d1", "2A", "d1", "2B")).toBe(false)
    expect(sameNet(prepared, "d1", "3A", "d1", "3B")).toBe(false)
    expect(sameNet(prepared, "d1", "4A", "d1", "4B")).toBe(false)
  })

  it("T4 : voies 1 et 3 ON simultanément, 2 et 4 restent OFF", () => {
    const channelStates = { "1": "on", "2": "off", "3": "on", "4": "off" }
    const prepared = prepareCircuit([{ uid: "d1", type: "DIP_SWITCH", channelStates }], [])
    expect(sameNet(prepared, "d1", "1A", "d1", "1B")).toBe(true)
    expect(sameNet(prepared, "d1", "3A", "d1", "3B")).toBe(true)
    expect(sameNet(prepared, "d1", "2A", "d1", "2B")).toBe(false)
    expect(sameNet(prepared, "d1", "4A", "d1", "4B")).toBe(false)
  })
})

describe("A3-SW2 — topologie électrique (T5, T6, T7, T8, I-DIP-05/06/07)", () => {
  it("T5 : toutes voies OFF -> aucune paire fermée", () => {
    const channelStates = { "1": "off", "2": "off", "3": "off", "4": "off" }
    const prepared = prepareCircuit([{ uid: "d1", type: "DIP_SWITCH", channelStates }], [])
    for (const ch of ["1", "2", "3", "4"]) {
      expect(sameNet(prepared, "d1", `${ch}A`, "d1", `${ch}B`)).toBe(false)
    }
  })

  it("T6 : voie 1 seule ON -> 1A↔1B uniquement", () => {
    const channelStates = { "1": "on", "2": "off", "3": "off", "4": "off" }
    const prepared = prepareCircuit([{ uid: "d1", type: "DIP_SWITCH", channelStates }], [])
    expect(sameNet(prepared, "d1", "1A", "d1", "1B")).toBe(true)
    let closedCount = 0
    for (const ch of ["1", "2", "3", "4"]) {
      if (sameNet(prepared, "d1", `${ch}A`, "d1", `${ch}B`)) closedCount += 1
    }
    expect(closedCount).toBe(1)
  })

  it("T7 : voies 1+3 ON -> 1A↔1B et 3A↔3B uniquement", () => {
    const channelStates = { "1": "on", "2": "off", "3": "on", "4": "off" }
    const prepared = prepareCircuit([{ uid: "d1", type: "DIP_SWITCH", channelStates }], [])
    expect(sameNet(prepared, "d1", "1A", "d1", "1B")).toBe(true)
    expect(sameNet(prepared, "d1", "3A", "d1", "3B")).toBe(true)
    let closedCount = 0
    for (const ch of ["1", "2", "3", "4"]) {
      if (sameNet(prepared, "d1", `${ch}A`, "d1", `${ch}B`)) closedCount += 1
    }
    expect(closedCount).toBe(2)
  })

  it("T8 : jamais de connexion croisée entre canaux, quel que soit l'état", () => {
    const channelStates = { "1": "on", "2": "on", "3": "on", "4": "on" }
    const prepared = prepareCircuit([{ uid: "d1", type: "DIP_SWITCH", channelStates }], [])
    const allPins = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"]
    for (const pinA of allPins) {
      for (const pinB of allPins) {
        if (pinA === pinB) continue
        const channelA = pinA[0]
        const channelB = pinB[0]
        const same = sameNet(prepared, "d1", pinA, "d1", pinB)
        if (channelA === channelB) {
          expect(same, `${pinA}/${pinB} (même canal, ON)`).toBe(true)
        } else {
          expect(same, `${pinA}/${pinB} (canaux différents) ne doit jamais être uni`).toBe(false)
        }
      }
    }
  })

  it("état/canal inconnu ou absent : aucune connexion interne, aucun crash", () => {
    expect(() => prepareCircuit([{ uid: "d1", type: "DIP_SWITCH" }], [])).not.toThrow()
    const prepared = prepareCircuit([{ uid: "d1", type: "DIP_SWITCH", channelStates: { "1": "bogus" } }], [])
    expect(sameNet(prepared, "d1", "1A", "d1", "1B")).toBe(false)
  })
})

describe("A3-SW2 — resolveInternalConnections générique (channels)", () => {
  it("ne dépend d'aucun nom de type ni nombre de canaux codé en dur", () => {
    const source = fs.readFileSync(path.join(path.dirname(preparationSourcePath), "canonicalRegistry.js"), "utf-8")
    const fnStart = source.indexOf("export function resolveInternalConnections")
    expect(fnStart).toBeGreaterThan(-1)
    const fnBody = source.slice(fnStart)
    expect(fnBody).not.toMatch(/DIP_SWITCH|SLIDE_SWITCH|BUTTON/)
    expect(fnBody).toMatch(/channels/)
  })

  it("supporte un composant synthétique à 3 canaux, sans connaissance de DIP_SWITCH", () => {
    const entry = {
      type: "TEST_MULTI_CHANNEL",
      pins: [
        { id: "aA", role: "switch" }, { id: "aB", role: "switch" },
        { id: "bA", role: "switch" }, { id: "bB", role: "switch" },
        { id: "cA", role: "switch" }, { id: "cB", role: "switch" },
      ],
      internalConnections: {
        channels: {
          a: { states: { on: [["aA", "aB"]], off: [] } },
          b: { states: { on: [["bA", "bB"]], off: [] } },
          c: { states: { on: [["cA", "cB"]], off: [] } },
        },
      },
      parameterSchema: null, defaultParameters: null, capabilities: null, modelAvailable: false,
    }
    const result = resolveInternalConnections(entry, { channelStates: { a: "on", b: "off", c: "on" } })
    expect(result.sort()).toEqual([["aA", "aB"], ["cA", "cB"]].sort())
  })
})

describe("A3-SW2 — validation canonique de la forme channels", () => {
  it("une topologie de canal référençant une pin inexistante est rejetée", () => {
    const entry = {
      type: "TEST_BAD_CHANNEL_PIN",
      pins: [{ id: "aA", role: "switch" }, { id: "aB", role: "switch" }],
      internalConnections: { channels: { a: { states: { on: [["aA", "ghost"]] } } } },
      parameterSchema: null, defaultParameters: null, capabilities: null, modelAvailable: false,
    }
    const result = validateCanonicalEntry(entry)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('unknown pin "ghost"'))).toBe(true)
  })

  it("l'entrée réelle DIP_SWITCH est valide (self-check déjà passé au chargement du module)", () => {
    const entry = getCanonicalEntry("DIP_SWITCH")
    expect(validateCanonicalEntry(entry)).toEqual({ valid: true, errors: [] })
  })
})

describe("A3-SW2 — architecture guard (I-DIP-15)", () => {
  it("preparation.js ne contient aucune référence à DIP_SWITCH", () => {
    const source = fs.readFileSync(preparationSourcePath, "utf-8")
    expect(source).not.toMatch(/DIP_SWITCH/)
  })
})

describe("A3-SW2 — non-régression Registry (I-DIP-25)", () => {
  it("les entrées canoniques complètes restent valides (22 types)", () => {
    const entries = getAllCanonicalEntries()
    expect(entries.length).toBeGreaterThanOrEqual(22)
    expect(validateCanonicalEntrySet(entries)).toEqual({ valid: true, errors: [] })
  })
})
