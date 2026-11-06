import { Signal } from "./signals.js"

/**
 * Ãƒâ€°tat visuel d'une LED selon les signaux de ses pins.
 * @param {string} uid
 * @param {Map<string, string>} pinSignals
 */
export function getLedState(uid, pinSignals, options) {
  const anode = pinSignals.get(`${uid}:anode`)
  const cathode = pinSignals.get(`${uid}:cathode`)
  const on = anode === Signal.HIGH && cathode === Signal.LOW

  let vled, current

  // Calcul de la tension aux bornes de la LED si en marche et fournie
  if (on && options?.forwardVoltage !== undefined) {
    vled = options.forwardVoltage
  } else if (on) {
    vled = 2.1 // Valeur par défaut pour LED rouge
  }

  // Calcul du courant traversant la LED
  if (!on) {
    // LED éteinte : courant nul
    current = 0
  } else if (on && options?.seriesResistance !== undefined && options.seriesResistance > 0) {
    // LED allumée avec résistance en série connue
    // I = (Vsupply - vled) / seriesResistance
    // La tension d'alimentation n'est pas connue de cette fonction,
    // on utilise une valeur par défaut de 5V pour estimer le courant
    const defaultSupplyVoltage = 5
    current = (defaultSupplyVoltage - (vled || 2.1)) / options.seriesResistance
  } else if (on) {
    // LED allumée sans résistance en série connue
    current = undefined
  }

  return { on, anode, cathode, vled, current }
}

/**
 * Ã‰tat visuel d'une LED RGB Ã  cathode commune.
 * Un canal est actif lorsque common est LOW
 * et que le canal correspondant est HIGH.
 *
 * @param {string} uid
 * @param {Map<string, string>} pinSignals
 */
export function getRgbLedState(uid, pinSignals) {
  const common = pinSignals.get(`${uid}:common`)
  const r = pinSignals.get(`${uid}:R`)
  const g = pinSignals.get(`${uid}:G`)
  const b = pinSignals.get(`${uid}:B`)

  const commonIsLow = common === Signal.LOW

  return {
    r: commonIsLow && r === Signal.HIGH,
    g: commonIsLow && g === Signal.HIGH,
    b: commonIsLow && b === Signal.HIGH,
  }
}