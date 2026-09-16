import { describe, it, expect } from "vitest"
import {
  getSupportedStimulusKinds,
  isKnownStimulusKind,
  isValidStimulusValue,
  isValidLightStimulus,
} from "../environmentalStimulusRegistry.js"

/**
 * A7-C0 — Environmental Stimulus Registry (contrat générique des kinds).
 *
 * Ces tests verrouillent le contrat déclaratif lui-même : la liste des
 * kinds connus, la validation générique par clé, et le rejet défensif d'un
 * kind inconnu — les propriétés qu'un futur A7-C1 (TEMPERATURE) devra
 * pouvoir satisfaire en ajoutant une seule entrée à la table, sans toucher
 * `environmentalStimulus.js` (T29/T30).
 */

describe("A7-C0 — getSupportedStimulusKinds / isKnownStimulusKind", () => {
  it("LIGHT est enregistré (T1)", () => {
    expect(getSupportedStimulusKinds()).toContain("LIGHT")
    expect(isKnownStimulusKind("LIGHT")).toBe(true)
  })

  it("un kind inconnu (par ex. futur TEMPERATURE) n'est pas encore enregistré (T11)", () => {
    expect(isKnownStimulusKind("TEMPERATURE")).toBe(false)
    expect(getSupportedStimulusKinds()).not.toContain("TEMPERATURE")
  })
})

describe("A7-C0 — isValidStimulusValue : validation générique par clé", () => {
  it("délègue à la définition LIGHT pour les valeurs valides (T2-T4)", () => {
    expect(isValidStimulusValue("LIGHT", 0)).toBe(true)
    expect(isValidStimulusValue("LIGHT", 1)).toBe(true)
    expect(isValidStimulusValue("LIGHT", 0.42)).toBe(true)
  })

  it("délègue à la définition LIGHT pour les valeurs invalides (T5-T10)", () => {
    for (const invalid of [NaN, Infinity, -Infinity, -0.0001, 1.0001, "0.5", null, undefined, {}]) {
      expect(isValidStimulusValue("LIGHT", invalid)).toBe(false)
    }
  })

  it("rejette défensivement tout kind non enregistré, quelle que soit la valeur (T11)", () => {
    expect(isValidStimulusValue("TEMPERATURE", 0.5)).toBe(false)
    expect(isValidStimulusValue("UNKNOWN_KIND", 0)).toBe(false)
    expect(isValidStimulusValue("__proto__", 0)).toBe(false)
  })

  it("est cohérent avec isValidLightStimulus exportée séparément", () => {
    expect(isValidStimulusValue("LIGHT", 0.75)).toBe(isValidLightStimulus(0.75))
  })
})

describe("A7-C0 — preuve d'extensibilité architecturale (T30)", () => {
  it("isValidStimulusValue et getSupportedStimulusKinds n'énumèrent jamais les kinds via un if/switch : la table est la seule source", () => {
    // Un kind ajouté à la table déclarative deviendrait immédiatement
    // connu par `isKnownStimulusKind`/`isValidStimulusValue` sans toucher
    // leur code : ce test verrouille qu'aujourd'hui, avec une table à une
    // seule entrée, le comportement pour toute clé absente de la table est
    // uniformément "rejeté", jamais un cas spécial supplémentaire.
    const knownKinds = getSupportedStimulusKinds()
    expect(knownKinds).toEqual(["LIGHT"])
    for (const candidateKind of ["FORCE", "MOISTURE", "MOTION", "DISTANCE", "IR", "GAS"]) {
      expect(isKnownStimulusKind(candidateKind)).toBe(false)
      expect(isValidStimulusValue(candidateKind, 0.5)).toBe(false)
    }
  })
})
