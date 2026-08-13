import { ComponentRegistry } from './registry.js'
import * as defaultCanonicalRegistry from './canonicalRegistry.js'
import { PowerModel } from './models/PowerModel.js'
import { ResistorModel } from './models/ResistorModel.js'
import { LdrModel } from './models/LdrModel.js'
import { ThermistorModel } from './models/ThermistorModel.js'
import {
  UnknownComponentTypeError,
  SimulationModelUnavailableError,
  InvalidSimulationModelError,
  UnsupportedSimulationCapabilityError,
} from './errors/index.js'

function isValidSimulationModel(model) {
  return !!model && typeof model === 'object' && !!model.defaultParameters &&
    typeof model.defaultParameters === 'object' && Array.isArray(model.capabilities) &&
    typeof model.validate === 'function'
}

export function createSimulationRegistry({ canonicalRegistry = defaultCanonicalRegistry, models = [] } = {}) {
  const modelAnnuaire = new ComponentRegistry()
  for (const model of models) modelAnnuaire.register(model)

  function getSimulationModel(type, { requireCapability } = {}) {
    if (!canonicalRegistry.hasCanonicalType(type)) throw new UnknownComponentTypeError(type)
    const entry = canonicalRegistry.getCanonicalEntry(type)
    if (!entry.modelAvailable) throw new SimulationModelUnavailableError(type)
    const model = modelAnnuaire.getModel(type)
    if (!isValidSimulationModel(model)) throw new InvalidSimulationModelError(type)
    if (requireCapability && !model.capabilities.includes(requireCapability)) {
      throw new UnsupportedSimulationCapabilityError(type, requireCapability)
    }
    return model
  }

  function isSimulationModelAvailable(type) {
    return canonicalRegistry.hasCanonicalType(type) &&
      canonicalRegistry.getCanonicalEntry(type).modelAvailable === true
  }

  return { getSimulationModel, isSimulationModelAvailable }
}

const defaultRegistry = createSimulationRegistry({
  models: [PowerModel, ResistorModel, LdrModel, ThermistorModel],
})

export const getSimulationModel = defaultRegistry.getSimulationModel
export const isSimulationModelAvailable = defaultRegistry.isSimulationModelAvailable
