import { Signal } from "./signals.js"
import { PowerModel } from "./models/PowerModel.js"
import { ResistorModel } from "./models/ResistorModel.js"
import { LdrModel } from "./models/LdrModel.js"
import { ThermistorModel } from "./models/ThermistorModel.js"

/**
 * MB-SIM-006 : Résolution (ADR-004).
 * Reçoit le modèle préparé (nets) en lecture seule, calcule les signaux
 * bruts pour chaque pin. Ne conserve aucun état entre deux appels.
 *
 * MB-SIM-007 : point d'entrée unique de la phase Résolution (A5 : aucune
 * nouvelle API publique). Calcule désormais aussi, en interne, l'analyse DC
 * minimale (computeDcAnalysis, privée, non exportée) et l'inclut dans son
 * retour. Les valeurs de pinSignals elles-mêmes restent calculées exactement
 * comme avant MB-SIM-007 (A1) ; seule la forme de l'objet retourné par cette
 * fonction change pour porter, en plus, dcAnalysis.
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {{ uf, nets: Map<string, string[]>, allKeys: string[] }} prepared
 * @returns {{ pinSignals: Map<string, string>, dcAnalysis: Map<string, { voltage: number, current: number }> }}
 */
export function resolveSignals(components, prepared) {
  const { uf, nets, allKeys } = prepared

  const pinSignals = new Map()
  for (const k of allKeys) {
    pinSignals.set(k, Signal.UNKNOWN)
  }

  /** Sources : alimentation */
  for (const comp of components) {
    if (comp.type !== "POWER") continue
    pinSignals.set(uf.key(comp.uid, "5V"), Signal.HIGH)
    pinSignals.set(uf.key(comp.uid, "GND"), Signal.LOW)
  }

  /** Propagation : sur chaque net, si une pin est HIGH/LOW, toute la net hérite */
  const propagate = (signal) => {
    for (const [, keys] of nets) {
      let found = false
      for (const k of keys) {
        if (pinSignals.get(k) === signal) {
          found = true
          break
        }
      }
      if (!found) continue
      for (const k of keys) {
        if (pinSignals.get(k) === Signal.UNKNOWN) {
          pinSignals.set(k, signal)
        }
      }
    }
  }

  propagate(Signal.HIGH)
  propagate(Signal.LOW)

  /** Arduino stub : pins GPIO héritent du net (futur : exécution sketch) */
  for (const comp of components) {
    if (comp.type !== "ARDUINO") continue
    for (const pinId of ["D2", "D3"]) {
      const k = uf.key(comp.uid, pinId)
      if (pinSignals.get(k) === Signal.UNKNOWN) {
        pinSignals.set(k, Signal.FLOATING)
      }
    }
  }

  const dcAnalysis = computeDcAnalysis(components, prepared, pinSignals)

  return { pinSignals, dcAnalysis }
}

/**
 * MB-SIM-007 : premier solveur DC (ADR-004, Résolution).
 *
 * Fonction PRIVÉE, non exportée (A5 : aucune nouvelle API publique du
 * module). Appelée uniquement par resolveSignals(), qui reste le seul point
 * d'entrée public de la phase Résolution.
 *
 * Périmètre volontairement minimal (A6) : calcule tension et courant pour
 * un circuit POWER -> RESISTOR simple, via I = U / R uniquement. Aucune loi
 * de Kirchhoff, aucune résolution matricielle, aucun réseau complexe.
 *
 * A1 : ne modifie jamais les valeurs de pinSignals, uniquement en lecture.
 * A2 : dcAnalysis est une structure distincte, jamais fusionnée avec les
 * valeurs logiques HIGH/LOW/UNKNOWN/FLOATING.
 * A3 : aucune constante magique — les valeurs de tension et de résistance
 * viennent exclusivement de PowerModel.defaultParameters et
 * ResistorModel.defaultParameters (aucun accès à ComponentRegistry, A4).
 *
 * Un RESISTOR est retenu pour le calcul uniquement si ses deux pins (A et B)
 * ont été résolues respectivement à HIGH et LOW par la propagation logique
 * qui précède dans resolveSignals() — condition minimale garantissant qu'il
 * est effectivement placé entre une source et une masse, sans qu'aucune
 * analyse topologique supplémentaire ne soit nécessaire pour ce périmètre.
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {{ uf, nets: Map<string, string[]>, allKeys: string[] }} prepared
 * @param {Map<string, string>} pinSignals
 * @returns {Map<string, { voltage: number, current: number }>}
 */
function computeDcAnalysis(components, prepared, pinSignals) {
  const { uf } = prepared

  const voltage = PowerModel.defaultParameters.voltage
  const resistance = ResistorModel.defaultParameters.resistance

  const dcAnalysis = new Map()

  for (const comp of components) {
    if (comp.type !== "RESISTOR") continue

    const pinA = pinSignals.get(uf.key(comp.uid, "A"))
    const pinB = pinSignals.get(uf.key(comp.uid, "B"))

    const isSimplePoweredLoop =
      (pinA === Signal.HIGH && pinB === Signal.LOW) ||
      (pinA === Signal.LOW && pinB === Signal.HIGH)

    if (!isSimplePoweredLoop) continue

    dcAnalysis.set(comp.uid, {
      voltage,
      current: voltage / resistance,
    })
  }

  /**
   * MB-SIM-008 : LDR — modèle DC simplifié à résistance fixe.
   * Même motif que RESISTOR (isSimplePoweredLoop), aucune dépendance à la
   * lumière (hors périmètre). Valeur de résistance exclusivement issue de
   * LdrModel.defaultParameters (A3).
   */
  const ldrResistance = LdrModel.defaultParameters.resistance

  for (const comp of components) {
    if (comp.type !== "LDR") continue

    const pinA = pinSignals.get(uf.key(comp.uid, "A"))
    const pinB = pinSignals.get(uf.key(comp.uid, "B"))

    const isSimplePoweredLoop =
      (pinA === Signal.HIGH && pinB === Signal.LOW) ||
      (pinA === Signal.LOW && pinB === Signal.HIGH)

    if (!isSimplePoweredLoop) continue

    dcAnalysis.set(comp.uid, {
      voltage,
      current: voltage / ldrResistance,
    })
  }

  /**
   * MB-SIM-008 : THERMISTOR (NTC) — modèle DC simplifié à résistance fixe.
   * Même motif que RESISTOR (isSimplePoweredLoop), aucune dépendance à la
   * température (hors périmètre). Valeur de résistance exclusivement issue
   * de ThermistorModel.defaultParameters (A3).
   */
  const thermistorResistance = ThermistorModel.defaultParameters.resistance

  for (const comp of components) {
    if (comp.type !== "THERMISTOR") continue

    const pinA = pinSignals.get(uf.key(comp.uid, "A"))
    const pinB = pinSignals.get(uf.key(comp.uid, "B"))

    const isSimplePoweredLoop =
      (pinA === Signal.HIGH && pinB === Signal.LOW) ||
      (pinA === Signal.LOW && pinB === Signal.HIGH)

    if (!isSimplePoweredLoop) continue

    dcAnalysis.set(comp.uid, {
      voltage,
      current: voltage / thermistorResistance,
    })
  }

  return dcAnalysis
}