/**
 * Derived DC domains, separate from primary sources and digital signals.
 * Entries declare { inputPin, referencePin, outputPin, contribute }.
 * The pure contribute({ inputVoltage, params }) returns positive finite volts
 * or null. The resolver calls it only with a resolved positive input relative
 * to referencePin, and keeps the output in that same reference domain.
 * Pin IDs must be distinct canonical pins. Production entries use the same generic PREQ contract.
 *
 * A11-ANALOG-PREQ1 — controlled analog form, observing several numeric pins:
 * { inputPins, referencePin, outputPins, contribute }. The pure
 * contribute({ inputVoltages, params }) receives { [inputPin]: volts } (finite,
 * >= 0, relative to referencePin) and returns { [outputPin]: volts | null };
 * an omitted or invalid pin is unresolved. The resolver calls it only when
 * EVERY input shares the resolved referencePin domain, never from HIGH/LOW.
 * The single-input form above is the one-input, one-output case of this form.
 *
 * A11-COMP3-PREQ1 — grouped form, additive to both forms above:
 * { referencePin, requiredPositivePins?, groups: [{ inputPins, outputPins, contribute }] }.
 * Each group is observed on its own inputPins with the same rules and its
 * contribute({ inputVoltages, params }) drives only its own outputPins; an
 * unresolved group reserves its outputs as unresolved without affecting the
 * other groups. Optional requiredPositivePins is component-wide activation:
 * each pin must be a finite > 0 V fact of the referencePin domain, otherwise
 * no group contributes and every group output is reserved as unresolved.
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
