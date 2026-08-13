/**
 * InvalidSimulationModelError — MB-CF2-SIM-001.
 */
export class InvalidSimulationModelError extends Error {
  constructor(type) {
    super(
      `InvalidSimulationModelError: the canonical registry declares a simulation model ` +
        `available for "${type}", but no valid executable model is registered for it. ` +
        `This indicates a desync between the declarative registry and the model annuaire.`
    )
    this.name = 'InvalidSimulationModelError'
    this.type = type
  }
}
