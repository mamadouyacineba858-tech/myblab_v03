import { Signal } from "./signals.js"

/**
 * Ãƒâ€°tat visuel d'une LED selon les signaux de ses pins.
 * @param {string} uid
 * @param {Map<string, string>} pinSignals
 */
export function getLedState(uid, pinSignals) {
  const anode = pinSignals.get(`${uid}:anode`)
  const cathode = pinSignals.get(`${uid}:cathode`)
  const on = anode === Signal.HIGH && cathode === Signal.LOW
  return { on, anode, cathode }
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