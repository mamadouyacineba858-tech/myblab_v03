export class SimulationModelUnavailableError extends Error {
  constructor(type) {
    super(`SimulationModelUnavailableError: ${type} has no simulation model available.`)
    this.name = 'SimulationModelUnavailableError'
    this.type = type
  }
}
