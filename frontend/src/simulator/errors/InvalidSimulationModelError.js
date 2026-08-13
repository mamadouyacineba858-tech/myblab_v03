export class InvalidSimulationModelError extends Error {
  constructor(type) {
    super(`InvalidSimulationModelError: no valid executable simulation model is registered for ${type}.`)
    this.name = 'InvalidSimulationModelError'
    this.type = type
  }
}
