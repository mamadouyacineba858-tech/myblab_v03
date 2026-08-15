/**
 * InvalidTimeDeltaError — MB-SIM-009.
 */
export class InvalidTimeDeltaError extends Error {
  constructor(dt) {
    super(
      `InvalidTimeDeltaError: "${String(dt)}" is not a valid time delta. ` +
        `A time delta must be a finite number >= 0 (negative values, NaN, ` +
        `Infinity, -Infinity and non-number values are all rejected). The ` +
        `simulated clock state is left unchanged when this error is thrown.`
    )
    this.name = 'InvalidTimeDeltaError'
    this.value = dt
  }
}
