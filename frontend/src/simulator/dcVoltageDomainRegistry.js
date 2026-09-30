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
 *
 * A11-COMP3-PREQ2 — explicit, opt-in scalar feedback of ONE group (or of the
 * non-grouped form): feedback: { mode: 'scalar-bounded', characteristic:
 * 'single-root', variableOutputPin, bounds({ supplyVoltages, params }) =>
 * { min, max } }. supplyVoltages holds the resolved requiredPositivePins
 * volts. When the group's only output (variableOutputPin) is wired directly
 * (same net, never through a passive part) to some of its own inputPins, and
 * at least one input stays external, the resolver solves x = F(x) with the
 * SAME contribute() law, x substituted on those feedback pins, by bounded
 * bisection within [min, max] (see controlledAnalogFeedbackSolver.js). Any
 * other dependency cycle, or any failed solve, leaves the outputs unresolved.
 * A contributor without `feedback` is never solved, whatever its wiring.
 *
 * A11-COMP3-PREQ3 — supply context, additive: the controlled forms' contribute
 * is called as contribute({ inputVoltages, supplyVoltages, params }), in the
 * feed-forward path and in the feedback transfer alike. supplyVoltages is the
 * same component-wide object bounds() receives: { [requiredPositivePin]: volts }
 * relative to referencePin (already resolved and validated by the activation
 * rule), {} without requiredPositivePins. Supply pins never enter inputVoltages
 * nor the observed inputs; a law may ignore supplyVoltages. Each call receives
 * its own object.
 */
/**
 * Independent single-supply operational amplifier channels, Level-1 pedagogical
 * abstraction (no transistor, SPICE or nodal model). Per channel, volts relative
 * to referencePin:
 *   out = clamp(openLoopGain * (V(plus) - V(minus)), 0, max(0, V(supply) - outputHighHeadroom))
 * V(supply) comes from supplyVoltages (PREQ3), never from the channel inputs;
 * openLoopGain and outputHighHeadroom come from params. The SAME law serves
 * feed-forward and the opt-in scalar feedback (PREQ2), whose bounds are that same
 * output range. An unpowered component drives no channel (PREQ1 activation).
 */
export function createSingleSupplyOpAmps({ channels, referencePin, supplyPin }) {
  const high = (supplyVoltages, params) => Math.max(0, supplyVoltages[supplyPin] - params.outputHighHeadroom)
  return {
    referencePin,
    requiredPositivePins: [supplyPin],
    groups: channels.map(({ plus, minus, output }) => ({
      inputPins: [plus, minus],
      outputPins: [output],
      contribute: ({ inputVoltages, supplyVoltages, params }) => ({
        [output]: Math.min(Math.max(params.openLoopGain * (inputVoltages[plus] - inputVoltages[minus]), 0),
          high(supplyVoltages, params)),
      }),
      feedback: {
        mode: 'scalar-bounded',
        characteristic: 'single-root',
        variableOutputPin: output,
        bounds: ({ supplyVoltages, params }) => ({ min: 0, max: high(supplyVoltages, params) }),
      },
    })),
  }
}

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
  // A11-COMP3 : TI LM358P dual op amp, single supply VCC+ referenced to VCC- (two channels).
  ['LM358P', createSingleSupplyOpAmps({
    referencePin: 'VCC-',
    supplyPin: 'VCC+',
    channels: [1, 2].map((n) => ({ plus: `${n}IN+`, minus: `${n}IN-`, output: `${n}OUT` })),
  })],
])

export function getDcVoltageDomainContribution(type) {
  return contributions.get(type) ?? null
}

export function hasDcVoltageDomainContribution(type) {
  return contributions.has(type)
}
