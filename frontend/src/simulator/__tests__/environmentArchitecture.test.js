import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-L1-ENV-001 — Tests architecturaux (Ticket §22, GATE E11).
 *
 * Preuves par inspection statique du source (même motif que
 * runtimeArchitecture.test.js / timeArchitecture.test.js) que le nouveau
 * sous-système environnemental respecte les invariants ENV-01..ENV-25 :
 * aucune horloge, aucun ArduinoSimulator, aucune connaissance de Core/
 * History, et aucune fuite de la connaissance "LDR répond à LIGHT" (ni de la
 * formule elle-même) dans les consommateurs génériques.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const envStimulusPath = path.join(dir, "..", "environmentalStimulus.js")
const envRegistryPath = path.join(dir, "..", "environmentalResponseRegistry.js")
const resolutionPath = path.join(dir, "..", "resolution.js")
const dcContributionRegistryPath = path.join(dir, "..", "dcContributionRegistry.js")
const integrationPath = path.join(dir, "..", "simulationRuntimeIntegration.js")
const observationContractPath = path.join(dir, "..", "..", "observation", "observationContract.js")
const temporalObservationContractPath = path.join(dir, "..", "..", "observation", "temporalObservationContract.js")
const measurementContractPath = path.join(dir, "..", "..", "measurement", "measurementContract.js")
const measurementPanelPath = path.join(dir, "..", "..", "measurement", "MeasurementPanel.jsx")
const liveMeasurementPanelPath = path.join(dir, "..", "..", "measurement", "LiveMeasurementPanel.jsx")
const useCircuitStatePath = path.join(dir, "..", "..", "hooks", "useCircuitState.js")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

describe("MB-L1-ENV-001 — T19/T20 : resolution.js et dcContributionRegistry.js ignorent l'environnement (ENV-10/ENV-11)", () => {
  it("resolution.js ne référence ni LIGHT ni le sous-système environnemental", () => {
    const source = readSourceWithoutComments(resolutionPath)
    expect(source).not.toMatch(/\bLIGHT\b/)
    expect(source).not.toMatch(/environmentalStimulus/i)
    expect(source).not.toMatch(/environmentalResponseRegistry/i)
    expect(source).not.toMatch(/applyEnvironmentalStimuli/)
  })

  it("dcContributionRegistry.js ne référence ni LIGHT ni le sous-système environnemental", () => {
    const source = readSourceWithoutComments(dcContributionRegistryPath)
    expect(source).not.toMatch(/\bLIGHT\b/)
    expect(source).not.toMatch(/environmentalStimulus/i)
    expect(source).not.toMatch(/environmentalResponseRegistry/i)
    expect(source).not.toMatch(/applyEnvironmentalStimuli/)
  })
})

describe("MB-L1-ENV-001 — T21 : le sous-système ENV ignore ArduinoSimulator/RuntimeOrchestrator (ENV-08/ENV-09)", () => {
  it("environmentalStimulus.js et environmentalResponseRegistry.js n'importent ni ArduinoSimulator ni runtimeOrchestrator", () => {
    for (const sourcePath of [envStimulusPath, envRegistryPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/ArduinoSimulator/)
      expect(source).not.toMatch(/runtimeOrchestrator/)
      expect(source).not.toMatch(/createRuntimeOrchestrator/)
    }
  })
})

describe("MB-L1-ENV-001 — T22 : le sous-système ENV ignore Core/History/Bridge (ENV-01/ENV-02/ENV-03)", () => {
  it("environmentalStimulus.js et environmentalResponseRegistry.js n'importent rien de core/, history/, bridge/", () => {
    for (const sourcePath of [envStimulusPath, envRegistryPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/from\s+["'][^"']*\/core\//)
      expect(source).not.toMatch(/from\s+["'][^"']*\/history\//)
      expect(source).not.toMatch(/from\s+["'][^"']*\/bridge\//)
      expect(source).not.toMatch(/CommandBus/)
      expect(source).not.toMatch(/HistoryManager/)
      expect(source).not.toMatch(/HistoryService/)
    }
  })
})

describe("MB-L1-ENV-001 — T23 : aucune horloge murale dans le sous-système ENV (ENV-04/ENV-05)", () => {
  it("environmentalStimulus.js et environmentalResponseRegistry.js n'utilisent aucune API de temps réel", () => {
    for (const sourcePath of [envStimulusPath, envRegistryPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/Date\.now/)
      expect(source).not.toMatch(/performance\.now/)
      expect(source).not.toMatch(/setTimeout/)
      expect(source).not.toMatch(/setInterval/)
      expect(source).not.toMatch(/requestAnimationFrame/)
    }
  })
})

describe("MB-L1-ENV-001 — T24 : aucune branche spécifique LDR dans les consommateurs génériques (ENV-24)", () => {
  it("resolution.js, simulationRuntimeIntegration.js, observationContract.js, temporalObservationContract.js, useCircuitState.js ne testent jamais littéralement comp.type === \"LDR\"", () => {
    for (const sourcePath of [
      resolutionPath,
      integrationPath,
      observationContractPath,
      temporalObservationContractPath,
      useCircuitStatePath,
    ]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait jamais tester littéralement le type LDR`).not.toMatch(
        /===\s*["']LDR["']/
      )
    }
  })

  it("la connaissance \"LDR répond à LIGHT\" vit exclusivement dans environmentalResponseRegistry.js", () => {
    const source = readSourceWithoutComments(envRegistryPath)
    expect(source).toMatch(/LDR/)
    expect(source).toMatch(/LIGHT/)
  })
})

describe("MB-L1-ENV-001 — aucune formule LIGHT -> LDR dans Measurement/Presentation (ENV-12)", () => {
  it("measurementContract.js, MeasurementPanel.jsx, LiveMeasurementPanel.jsx ne réimplémentent aucune physique LIGHT/LDR", () => {
    for (const sourcePath of [measurementContractPath, measurementPanelPath, liveMeasurementPanelPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/Math\.pow/)
      expect(source).not.toMatch(/getEnvironmentalResponse/)
      expect(source).not.toMatch(/environmentalResponseRegistry/i)
      expect(source).not.toMatch(/applyEnvironmentalStimuli/)
    }
  })
})

describe("MB-L1-ENV-001 — useCircuitState.js ne connaît aucune formule LIGHT -> LDR (ENV-14)", () => {
  it("useCircuitState.js n'importe que la validation du stimulus, jamais applyEnvironmentalStimuli/le Registry", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/Math\.pow/)
    expect(source).not.toMatch(/getEnvironmentalResponse/)
    expect(source).not.toMatch(/environmentalResponseRegistry/i)
    expect(source).not.toMatch(/applyEnvironmentalStimuli/)
    expect(source).toMatch(/isValidLightStimulus/)
  })
})

describe("MB-L1-ENV-001 — GATE 1 : simulationRuntimeIntegration.js et observationContract.js consomment la MÊME primitive centrale (ENV-15/ENV-16)", () => {
  it("les deux fichiers importent applyEnvironmentalStimuli depuis environmentalStimulus.js, sans dupliquer sa logique", () => {
    for (const sourcePath of [integrationPath, observationContractPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).toMatch(/from\s+["'][^"']*environmentalStimulus\.js["']/)
      expect(source).toMatch(/applyEnvironmentalStimuli/)
    }
  })

  it("observationContract.js n'importe pas directement le Registry environnemental (composition via la seule primitive)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).not.toMatch(/environmentalResponseRegistry/i)
  })
})

describe("MB-L1-ENV-001 — externalSignals reste un contrat électrique pur (ENV-06/ENV-07)", () => {
  it("environmentalStimulus.js et environmentalResponseRegistry.js ne référencent jamais externalSignals", () => {
    for (const sourcePath of [envStimulusPath, envRegistryPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/externalSignals/)
    }
  })
})

describe("A7-C0 — le moteur générique environmentalStimulus.js ne connaît aucun stimulus kind par son nom (I-A7C0-08/I-A7C0-09/T28/T29)", () => {
  const envStimulusRegistryPath = path.join(dir, "..", "environmentalStimulusRegistry.js")

  it("environmentalStimulus.js ne contient plus de branche if/switch par kind (aucun `kind === \"...\"`)", () => {
    const source = readSourceWithoutComments(envStimulusPath)
    expect(source).not.toMatch(/kind\s*===\s*["']/)
    expect(source).not.toMatch(/switch\s*\(\s*kind\s*\)/)
  })

  it("environmentalStimulus.js ne mentionne plus littéralement \"LIGHT\" : la connaissance du kind vit uniquement dans environmentalStimulusRegistry.js", () => {
    const source = readSourceWithoutComments(envStimulusPath)
    expect(source).not.toMatch(/["']LIGHT["']/)
  })

  it("environmentalStimulus.js ne teste jamais component.type === \"LDR\"/\"TMP36\"/\"THERMISTOR\" (aucune connaissance composant)", () => {
    const source = readSourceWithoutComments(envStimulusPath)
    expect(source).not.toMatch(/component\.type\s*===\s*["'](LDR|TMP36|THERMISTOR)["']/)
  })

  it("le contrat de stimulus (environmentalStimulusRegistry.js) est bien séparé du moteur générique et du Registry de réponses", () => {
    expect(fs.existsSync(envStimulusRegistryPath)).toBe(true)
    const engineSource = readSourceWithoutComments(envStimulusPath)
    expect(engineSource).toMatch(/from\s+["'][^"']*environmentalStimulusRegistry\.js["']/)

    const responseRegistrySource = readSourceWithoutComments(envRegistryPath)
    expect(responseRegistrySource).not.toMatch(/environmentalStimulusRegistry/)
  })

  it("A7-C1/A7-C2/A7-C3/A7-C4-PIR/A7-C4-TILT : LDR/TMP36/FORCE_SENSOR/FLEX_SENSOR/SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR/TILT_SENSOR sont les SEULS composants de production enregistrés dans environmentalResponseRegistry.js — aucun autre type n'y est ajouté (T27/T37)", () => {
    // A7-C0 interdisait tout TMP36 ici (prérequis architectural seul, aucun
    // composant). A7-C1 l'a ajouté légitimement (premier consommateur réel de
    // l'extensibilité A7-C0). A7-C2 ajoute FORCE_SENSOR et FLEX_SENSOR sur le
    // même principe (deuxième preuve réelle). A7-C3 ajoute
    // SOIL_MOISTURE_SENSOR (troisième preuve réelle, stimulus MOISTURE).
    // A7-C4-PIR ajoute PIR_MOTION_SENSOR (quatrième preuve réelle, stimulus
    // MOTION). A7-C4-TILT ajoute TILT_SENSOR (cinquième preuve réelle,
    // stimulus TILT) — cette assertion verrouille désormais qu'AUCUN AUTRE
    // type de production (A7-C5+) n'a été ajouté en même temps, jamais que
    // ces sept types soient absents.
    const source = readSourceWithoutComments(envRegistryPath)
    const registeredTypes = [...source.matchAll(/^\s*([A-Z][A-Z0-9_]*):\s*Object\.freeze\(\{\s*stimulus:/gm)].map((m) => m[1])
    expect(registeredTypes.sort()).toEqual(["FLEX_SENSOR", "FORCE_SENSOR", "LDR", "PIR_MOTION_SENSOR", "SOIL_MOISTURE_SENSOR", "TILT_SENSOR", "TMP36"])
  })
})
