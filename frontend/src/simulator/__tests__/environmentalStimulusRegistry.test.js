import { describe, it, expect } from "vitest"
import {
  getSupportedStimulusKinds,
  isKnownStimulusKind,
  isValidStimulusValue,
  isValidLightStimulus,
} from "../environmentalStimulusRegistry.js"

/**
 * A7-C0/A7-C1/A7-C2 — Environmental Stimulus Registry (contrat générique des kinds).
 *
 * Ces tests verrouillent le contrat déclaratif lui-même : la liste des
 * kinds connus, la validation générique par clé, et le rejet défensif d'un
 * kind inconnu. A7-C1 a ajouté TEMPERATURE (première preuve réelle de
 * l'extensibilité promise par A7-C0, cf. environmentalResponseRegistry.js
 * TMP36) en ajoutant une seule entrée à la table, sans toucher
 * `environmentalStimulus.js` (T29/T30). A7-C2 ajoute FORCE et FLEX sur le
 * même principe (deux kinds séparés — grandeurs physiques incompatibles,
 * cf. environmentalStimulusRegistry.js) — les assertions ci-dessous sont
 * mises à jour en conséquence. A7-C3 ajoute MOISTURE, A7-C4-PIR ajoute MOTION
 * (contrat binaire {0,1}) sur le même principe ; DISTANCE/IR/GAS restent les
 * exemples de kinds encore non enregistrés.
 */

describe("A7-C0/A7-C1/A7-C2/A7-C3/A7-C4-PIR — getSupportedStimulusKinds / isKnownStimulusKind", () => {
  it("LIGHT est enregistré (T1)", () => {
    expect(getSupportedStimulusKinds()).toContain("LIGHT")
    expect(isKnownStimulusKind("LIGHT")).toBe(true)
  })

  it("TEMPERATURE est enregistré (A7-C1 — preuve réelle d'extensibilité de A7-C0)", () => {
    expect(getSupportedStimulusKinds()).toContain("TEMPERATURE")
    expect(isKnownStimulusKind("TEMPERATURE")).toBe(true)
  })

  it("FORCE est enregistré (A7-C2 — deuxième preuve réelle d'extensibilité de A7-C0)", () => {
    expect(getSupportedStimulusKinds()).toContain("FORCE")
    expect(isKnownStimulusKind("FORCE")).toBe(true)
  })

  it("FLEX est enregistré (A7-C2 — deuxième kind, distinct de FORCE)", () => {
    expect(getSupportedStimulusKinds()).toContain("FLEX")
    expect(isKnownStimulusKind("FLEX")).toBe(true)
  })

  it("MOISTURE est enregistré (A7-C3 — troisième preuve réelle d'extensibilité de A7-C0)", () => {
    expect(getSupportedStimulusKinds()).toContain("MOISTURE")
    expect(isKnownStimulusKind("MOISTURE")).toBe(true)
  })

  it("MOTION est enregistré (A7-C4-PIR — quatrième preuve réelle d'extensibilité de A7-C0, contrat binaire {0,1})", () => {
    expect(getSupportedStimulusKinds()).toContain("MOTION")
    expect(isKnownStimulusKind("MOTION")).toBe(true)
  })

  it("TILT est enregistré (A7-C4-TILT — cinquième preuve réelle d'extensibilité de A7-C0, contrat binaire {0,1}, distinct de MOTION)", () => {
    expect(getSupportedStimulusKinds()).toContain("TILT")
    expect(isKnownStimulusKind("TILT")).toBe(true)
  })

  it("INFRARED est enregistré (A7-C4-IR — sixième preuve réelle d'extensibilité de A7-C0, contrat binaire {0,1}, distinct de LIGHT/MOTION/TILT)", () => {
    expect(getSupportedStimulusKinds()).toContain("INFRARED")
    expect(isKnownStimulusKind("INFRARED")).toBe(true)
  })

  it("DISTANCE est enregistré (A7-C5 — septième preuve réelle d'extensibilité de A7-C0, continuum borné [2,400])", () => {
    expect(getSupportedStimulusKinds()).toContain("DISTANCE")
    expect(isKnownStimulusKind("DISTANCE")).toBe(true)
  })

  it("un kind inconnu (par ex. futur PRESSURE, A7-C6+) n'est pas encore enregistré (T11)", () => {
    expect(isKnownStimulusKind("PRESSURE")).toBe(false)
    expect(getSupportedStimulusKinds()).not.toContain("PRESSURE")
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
    expect(isValidStimulusValue("DISTANCE", 0.5)).toBe(false)
    expect(isValidStimulusValue("UNKNOWN_KIND", 0)).toBe(false)
    expect(isValidStimulusValue("__proto__", 0)).toBe(false)
  })

  it("est cohérent avec isValidLightStimulus exportée séparément", () => {
    expect(isValidStimulusValue("LIGHT", 0.75)).toBe(isValidLightStimulus(0.75))
  })
})

describe("A7-C0/A7-C1/A7-C2/A7-C3/A7-C4-PIR — preuve d'extensibilité architecturale (T30)", () => {
  it("isValidStimulusValue et getSupportedStimulusKinds n'énumèrent jamais les kinds via un if/switch : la table est la seule source", () => {
    // A7-C1 : TEMPERATURE a rejoint LIGHT dans la table déclarative sans
    // qu'aucune ligne de isValidStimulusValue/getSupportedStimulusKinds
    // n'ait été modifiée (voir environmentalStimulusRegistry.js) — preuve
    // réelle, pas seulement architecturale, que A7-C0 tient sa promesse.
    // A7-C2 ajoute FORCE et FLEX, A7-C3 ajoute MOISTURE, A7-C4-PIR ajoute
    // MOTION, A7-C4-TILT ajoute TILT, A7-C4-IR ajoute INFRARED, A7-C5 ajoute
    // DISTANCE sur le même principe, toujours sans modifier ce fichier ni
    // environmentalStimulus.js. Le comportement pour toute clé encore
    // absente de la table (A7-C6+) reste uniformément "rejeté", jamais un
    // cas spécial.
    const knownKinds = getSupportedStimulusKinds()
    expect(knownKinds).toEqual(["LIGHT", "TEMPERATURE", "FORCE", "FLEX", "MOISTURE", "MOTION", "TILT", "INFRARED", "DISTANCE"])
    for (const candidateKind of ["PRESSURE", "IR", "GAS"]) {
      expect(isKnownStimulusKind(candidateKind)).toBe(false)
      expect(isValidStimulusValue(candidateKind, 0.5)).toBe(false)
    }
  })
})
