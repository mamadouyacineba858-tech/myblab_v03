/**
 * Derived DC domains, separate from primary sources and digital signals.
 * Entries declare { inputPin, referencePin, outputPin, contribute }.
 * The pure contribute({ inputVoltage, params }) returns positive finite volts
 * or null. The resolver calls it only with a resolved positive input relative
 * to referencePin, and keeps the output in that same reference domain.
 * Pin IDs must be distinct canonical pins. No production entries in this PREQ.
 */
const contributions = new Map()

export function getDcVoltageDomainContribution(type) {
  return contributions.get(type) ?? null
}
