import { describe, it, expect } from 'vitest'
import { getAllCanonicalEntries } from '../canonicalRegistry.js'
import { getSimulationModel } from '../simulationRegistry.js'

describe('ADR-012 Registry / Simulation coherence', () => {
  it('INV-REG-002: every canonical modelAvailable=true resolves to an executable model', () => {
    for (const entry of getAllCanonicalEntries()) {
      if (!entry.modelAvailable) continue
      expect(() => getSimulationModel(entry.type)).not.toThrow()
    }
  })

  it('INV-REG-003: canonical identity matches executable model identity', () => {
    for (const entry of getAllCanonicalEntries()) {
      if (!entry.modelAvailable) continue
      const model = getSimulationModel(entry.type)
      expect(model.type).toBe(entry.type)
    }
  })
})
