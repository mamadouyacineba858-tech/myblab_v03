import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'resolution.js')

describe('MB-CF2-SIM-001 architecture', () => {
  it('resolution imports simulationRegistry and no concrete models', () => {
    const source = fs.readFileSync(sourcePath, 'utf-8')
    expect(source).toMatch(/from\s+["']\.\/simulationRegistry\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/models\/PowerModel\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/models\/ResistorModel\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/models\/LdrModel\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/models\/ThermistorModel\.js["']/)
  })
})

/**
 * MB-SIM-008 v2 — AC-012 / AC-019 / AC-021.
 *
 * Preuve architecturale, par inspection statique du source, que
 * computeDcAnalysis() ne contient plus aucune branche spécifique à un type
 * de composant DC (ni pour RESISTOR/LDR/THERMISTOR déjà intégrés, ni pour
 * les cinq nouveaux composants), et qu'elle consulte réellement le
 * mécanisme générique du Registry de contribution DC (dcContributionRegistry.js)
 * plutôt que de laisser une API générique inutilisée (AC-021).
 */
describe('MB-SIM-008 v2 — contribution DC générique', () => {
  const DC_COMPONENT_TYPES = [
    'RESISTOR', 'LDR', 'THERMISTOR', 'DIODE', 'DC_MOTOR', 'CAPACITOR', 'POTENTIOMETER', 'NPN_TRANSISTOR',
  ]

  it('resolution.js ne contient aucune branche spécifique à un type de composant DC', () => {
    const source = fs.readFileSync(sourcePath, 'utf-8')
    for (const type of DC_COMPONENT_TYPES) {
      const strictEquality = new RegExp(`comp\\.type\\s*(===|!==)\\s*["']${type}["']`)
      expect(source, `resolution.js ne devrait pas comparer comp.type à "${type}"`).not.toMatch(strictEquality)
    }
  })

  it('resolution.js consulte le Registry de contribution DC générique (dcContributionRegistry.js), pas les fichiers models/*.js directement', () => {
    const source = fs.readFileSync(sourcePath, 'utf-8')
    expect(source).toMatch(/from\s+["']\.\/dcContributionRegistry\.js["']/)
    expect(source).toMatch(/getDcContribution/)
    for (const file of ['DiodeModel', 'DcMotorModel', 'CapacitorModel', 'PotentiometerModel', 'NpnTransistorModel']) {
      expect(source).not.toMatch(new RegExp(`from\\s+["']\\./models/${file}\\.js["']`))
    }
  })
})
