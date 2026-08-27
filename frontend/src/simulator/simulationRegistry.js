import * as defaultCanonicalRegistry from './canonicalRegistry.js'
import { PowerModel } from './models/PowerModel.js'
import { ResistorModel } from './models/ResistorModel.js'
import { LdrModel } from './models/LdrModel.js'
import { ThermistorModel } from './models/ThermistorModel.js'
import { DiodeModel } from './models/DiodeModel.js'
import { DcMotorModel } from './models/DcMotorModel.js'
import { CapacitorModel } from './models/CapacitorModel.js'
import { PolarizedCapacitorModel } from './models/PolarizedCapacitorModel.js'
import { PotentiometerModel } from './models/PotentiometerModel.js'
import { NpnTransistorModel } from './models/NpnTransistorModel.js'
import {
  UnknownComponentTypeError,
  SimulationModelUnavailableError,
  InvalidSimulationModelError,
  UnsupportedSimulationCapabilityError,
} from './errors/index.js'

function isValidSimulationModel(model) {
  return !!model && typeof model === 'object' && typeof model.type === 'string' && model.type.length > 0 && typeof model.validate === 'function'
}

export function createSimulationRegistry({ canonicalRegistry = defaultCanonicalRegistry, models = [] } = {}) {
  const modelStore = new Map()
  for (const model of models) {
    if (model && typeof model.type === 'string') modelStore.set(model.type, model)
  }

  function getSimulationModel(type, { requireCapability } = {}) {
    if (!canonicalRegistry.hasCanonicalType(type)) throw new UnknownComponentTypeError(type)
    const entry = canonicalRegistry.getCanonicalEntry(type)
    if (!entry.modelAvailable) throw new SimulationModelUnavailableError(type)
    const model = modelStore.get(type) ?? null
    if (!isValidSimulationModel(model)) throw new InvalidSimulationModelError(type)
    if (model.type !== entry.type) throw new InvalidSimulationModelError(type)
    if (requireCapability && !entry.capabilities.includes(requireCapability)) throw new UnsupportedSimulationCapabilityError(type, requireCapability)
    return model
  }

  function isSimulationModelAvailable(type) {
    if (!canonicalRegistry.hasCanonicalType(type)) return false
    const entry = canonicalRegistry.getCanonicalEntry(type)
    if (!entry.modelAvailable) return false
    const model = modelStore.get(type) ?? null
    return isValidSimulationModel(model) && model.type === entry.type
  }

  function getSimulationDefaultParameters(type) {
    if (!canonicalRegistry.hasCanonicalType(type)) throw new UnknownComponentTypeError(type)
    const entry = canonicalRegistry.getCanonicalEntry(type)
    if (!entry.modelAvailable || entry.defaultParameters === null) throw new SimulationModelUnavailableError(type)
    return entry.defaultParameters
  }

  return { getSimulationModel, isSimulationModelAvailable, getSimulationDefaultParameters }
}

const defaultRegistry = createSimulationRegistry({
  models: [
    PowerModel,
    ResistorModel,
    LdrModel,
    ThermistorModel,
    DiodeModel,
    DcMotorModel,
    CapacitorModel,
    PolarizedCapacitorModel,
    PotentiometerModel,
    NpnTransistorModel,
  ],
})

export const getSimulationModel = defaultRegistry.getSimulationModel
export const isSimulationModelAvailable = defaultRegistry.isSimulationModelAvailable
export const getSimulationDefaultParameters = defaultRegistry.getSimulationDefaultParameters
