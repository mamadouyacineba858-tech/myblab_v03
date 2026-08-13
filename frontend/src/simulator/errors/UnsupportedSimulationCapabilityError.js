/**
 * MB-CF2-SIM-001 — Capability requise absente du modèle de simulation.
 */
export class UnsupportedSimulationCapabilityError extends Error {
  constructor(type, capability) {
    super(
      `UnsupportedSimulationCapabilityError: the simulation model for "${type}" does not ` +
        `declare the required capability "${capability}".`
    )
    this.name = 'UnsupportedSimulationCapabilityError'
    this.type = type
    this.capability = capability
  }
}
