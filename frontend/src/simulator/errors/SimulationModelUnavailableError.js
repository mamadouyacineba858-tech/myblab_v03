/**
 * SimulationModelUnavailableError — MB-CF2-SIM-001.
 */
export class SimulationModelUnavailableError extends Error {
  constructor(type) {
    super(
      `SimulationModelUnavailableError: "${type}" is declared in the canonical registry ` +
        `but has no simulation model available (modelAvailable = false). ` +
        `This component exists visually/declaratively but cannot be simulated yet.`
    )
    this.name = 'SimulationModelUnavailableError'
    this.type = type
  }
}
