export class UnknownComponentTypeError extends Error {
  constructor(type) {
    super(`UnknownComponentTypeError: "${type}" is not declared in the canonical registry.`)
    this.name = 'UnknownComponentTypeError'
    this.type = type
  }
}
