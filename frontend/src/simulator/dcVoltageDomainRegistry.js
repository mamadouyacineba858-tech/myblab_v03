/**
 * Derived DC domains, separate from primary sources and digital signals.
 * Entries declare { inputPin, referencePin, outputPin, contribute }.
 * The pure contribute({ inputVoltage, params }) returns positive finite volts
 * or null. The resolver calls it only with a resolved positive input relative
 * to referencePin, and keeps the output in that same reference domain.
 * Pin IDs must be distinct canonical pins. Production entries use the same generic PREQ contract.
 */
const contributions = new Map([
  ['VOLTAGE_REGULATOR', {
    inputPin: 'IN',
    referencePin: 'GND',
    outputPin: 'OUT',
    // Ideal Level-1: no physical dropout, thermal or current-limit model.
    contribute({ inputVoltage, params }) {
      const target = params?.outputVoltage
      return Number.isFinite(inputVoltage) && inputVoltage > 0 &&
        Number.isFinite(target) && target > 0 && inputVoltage >= target
        ? target : null
    },
  }],
])

export function getDcVoltageDomainContribution(type) {
  return contributions.get(type) ?? null
}

export function hasDcVoltageDomainContribution(type) {
  return contributions.has(type)
}
