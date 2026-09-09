import { getCanonicalEntry } from './canonicalRegistry.js'

const SOURCES = new Map([
  ['POWER', { positivePin: '5V', negativePin: 'GND', adjustable: true }],
  ['BATTERY_9V', { positivePin: 'plus', negativePin: 'minus', adjustable: false }],
  ['COIN_CELL_CR2032', { positivePin: 'plus', negativePin: 'minus', adjustable: false }],
  ['BATTERY_AA', { positivePin: 'plus', negativePin: 'minus', adjustable: false }],
])

/** Batteries stay nominal; adjustable sources accept positive finite instance volts. */
export function getDcSource(component) {
  const source = SOURCES.get(component?.type)
  if (!source) return null
  const nominal = getCanonicalEntry(component.type).defaultParameters.voltage
  const requested = component.parameters?.voltage
  const voltage = source.adjustable && typeof requested === 'number'
    && Number.isFinite(requested) && requested > 0 ? requested : nominal
  return { positivePin: source.positivePin, negativePin: source.negativePin, voltage }
}
