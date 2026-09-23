import { createVoltageSourceModel } from './models/VoltageSourceModel.js'
import * as defaultCanonicalRegistry from './canonicalRegistry.js'
import { PowerModel } from './models/PowerModel.js'
import { ResistorModel } from './models/ResistorModel.js'
import { LdrModel } from './models/LdrModel.js'
import { ThermistorModel } from './models/ThermistorModel.js'
import { DiodeModel } from './models/DiodeModel.js'
import { DcMotorModel } from './models/DcMotorModel.js'
import { VibrationMotorModel } from './models/VibrationMotorModel.js'
import { LightBulbModel } from './models/LightBulbModel.js'
import { HobbyGearmotorModel } from './models/HobbyGearmotorModel.js'
import { CapacitorModel } from './models/CapacitorModel.js'
import { PolarizedCapacitorModel } from './models/PolarizedCapacitorModel.js'
import { PotentiometerModel } from './models/PotentiometerModel.js'
import { PnpTransistorModel } from './models/PnpTransistorModel.js'
import { NmosModel } from './models/NmosModel.js'
import { RelayModel } from './models/RelayModel.js'
import { VoltageRegulatorModel } from './models/VoltageRegulatorModel.js'
import { AndGateModel } from './models/AndGateModel.js'
import { OrGateModel } from './models/OrGateModel.js'
import { NandGateModel } from './models/NandGateModel.js'
import { NorGateModel } from './models/NorGateModel.js'
import { XorGateModel } from './models/XorGateModel.js'
import { NotGateModel } from './models/NotGateModel.js'
import { JkFlipFlop74HC73Model } from './models/JkFlipFlop74HC73Model.js'
import { DFlipFlop74HC74Model } from './models/DFlipFlop74HC74Model.js'
import { DLatch74HC75Model } from './models/DLatch74HC75Model.js'
import { HBridgeModel } from './models/HBridgeModel.js'
import { PmosModel } from './models/PmosModel.js'
import { NpnTransistorModel } from './models/NpnTransistorModel.js'
import { Tmp36Model } from './models/Tmp36Model.js'
import { ForceSensorModel } from './models/ForceSensorModel.js'
import { FlexSensorModel } from './models/FlexSensorModel.js'
import { SoilMoistureSensorModel } from './models/SoilMoistureSensorModel.js'
import { PirMotionSensorModel } from './models/PirMotionSensorModel.js'
import { TiltSensorModel } from './models/TiltSensorModel.js'
import { IrReceiverModel } from './models/IrReceiverModel.js'
import { HcSr04Model } from './models/HcSr04Model.js'
import { InductorModel } from './models/InductorModel.js'
import { ZenerDiodeModel } from './models/ZenerDiodeModel.js'
import {
  UnknownComponentTypeError,
  SimulationModelUnavailableError,
  InvalidSimulationModelError,
  UnsupportedSimulationCapabilityError,
} from './errors/index.js'

function isValidSimulationModel(model) {
  return (
    !!model &&
    typeof model === 'object' &&
    typeof model.type === 'string' &&
    model.type.length > 0 &&
    typeof model.validate === 'function'
  )
}

export function createSimulationRegistry({
  canonicalRegistry = defaultCanonicalRegistry,
  models = [],
} = {}) {
  const modelStore = new Map()
  for (const model of models) {
    if (model && typeof model.type === 'string') modelStore.set(model.type, model)
  }

  function getSimulationModel(type, { requireCapability } = {}) {
    if (!canonicalRegistry.hasCanonicalType(type)) {
      throw new UnknownComponentTypeError(type)
    }

    const entry = canonicalRegistry.getCanonicalEntry(type)
    if (!entry.modelAvailable) {
      throw new SimulationModelUnavailableError(type)
    }

    const model = modelStore.get(type) ?? null
    if (!isValidSimulationModel(model)) {
      throw new InvalidSimulationModelError(type)
    }

    if (model.type !== entry.type) {
      throw new InvalidSimulationModelError(type)
    }

    if (requireCapability && !entry.capabilities.includes(requireCapability)) {
      throw new UnsupportedSimulationCapabilityError(type, requireCapability)
    }

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
    if (!canonicalRegistry.hasCanonicalType(type)) {
      throw new UnknownComponentTypeError(type)
    }

    const entry = canonicalRegistry.getCanonicalEntry(type)
    if (!entry.modelAvailable || entry.defaultParameters === null) {
      throw new SimulationModelUnavailableError(type)
    }

    return entry.defaultParameters
  }

  return { getSimulationModel, isSimulationModelAvailable, getSimulationDefaultParameters }
}

const defaultRegistry = createSimulationRegistry({
  models: [
    PowerModel,
    createVoltageSourceModel('BATTERY_9V'),
    createVoltageSourceModel('COIN_CELL_CR2032'),
    createVoltageSourceModel('BATTERY_AA'),

    ResistorModel,
    LdrModel,
    ThermistorModel,
    DiodeModel,
    DcMotorModel,
    VibrationMotorModel,
    LightBulbModel,
    HobbyGearmotorModel,
    CapacitorModel,
    PolarizedCapacitorModel,
    PotentiometerModel,
    NpnTransistorModel,
    PnpTransistorModel,
    NmosModel,
    PmosModel,
    VoltageRegulatorModel,
    HBridgeModel,
    AndGateModel,
    OrGateModel,
    NandGateModel,
    NorGateModel,
    XorGateModel,
    NotGateModel,
    JkFlipFlop74HC73Model,
    DFlipFlop74HC74Model,
    DLatch74HC75Model,
    RelayModel,
    Tmp36Model,
    ForceSensorModel,
    FlexSensorModel,
    SoilMoistureSensorModel,
    PirMotionSensorModel,
    TiltSensorModel,
    IrReceiverModel,
    HcSr04Model,
    InductorModel,
    ZenerDiodeModel,
  ],
})

export const getSimulationModel = defaultRegistry.getSimulationModel
export const isSimulationModelAvailable = defaultRegistry.isSimulationModelAvailable
export const getSimulationDefaultParameters = defaultRegistry.getSimulationDefaultParameters
