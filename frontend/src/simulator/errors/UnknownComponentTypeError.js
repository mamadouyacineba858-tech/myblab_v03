/**
 * UnknownComponentTypeError — MB-CF2-SIM-001.
 */
export class UnknownComponentTypeError extends Error {
  constructor(type) {
    super(
      `UnknownComponentTypeError: "${type}" is not declared in the canonical registry ` +
        `(canonicalRegistry.js). This type does not exist for the platform, ` +
        `not even declaratively.`
    )
    this.name = 'UnknownComponentTypeError'
    this.type = type
  }
}
