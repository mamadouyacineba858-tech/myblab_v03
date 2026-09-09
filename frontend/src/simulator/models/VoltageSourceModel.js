/** Executable behavior only; declarative data stays in canonicalRegistry. */
export function createVoltageSourceModel(type) {
  return {
    type,
    validate(params) {
      return !!params && typeof params === 'object'
        && typeof params.voltage === 'number'
        && Number.isFinite(params.voltage) && params.voltage > 0
    },
  }
}
