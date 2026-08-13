export class UnsupportedSimulationCapabilityError extends Error {
  constructor(type, capability) {
    super(`UnsupportedSimulationCapabilityError: ${type} does not declare capability ${capability}.`)
    this.name = 'UnsupportedSimulationCapabilityError'
    this.type = type
    this.capability = capability
  }
}
