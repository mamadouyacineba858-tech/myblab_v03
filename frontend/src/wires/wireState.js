import { Signal } from "../simulator/signals.js"

/**
 * Dérivation de l'état logique visuel d'un fil (MB-VIS-004).
 *
 * Suit fidèlement le pattern déjà établi par getLedState/getRgbLedState
 * (frontend/src/simulator/production.js, généralisé par MB-VIS-001/002) :
 * getXxxState(entité, pinSignals) → état dérivé, lecture seule, aucune
 * mutation, aucun état conservé entre deux appels.
 *
 * Un wire relie exactement deux pins (fromUid/fromPin, toUid/toPin — forme
 * React, cf. ADR-008/ReactDocumentMapper). Ces deux pins appartiennent par
 * construction au même net électrique : c'est précisément la présence de ce
 * wire qui crée leur union dans simulator/preparation.js. Elles portent donc
 * toujours le même Signal une fois la simulation résolue. Cette fonction
 * lit les deux extrémités et ne suppose pas laquelle des deux a été
 * effectivement peuplée par le moteur (robuste à un futur wire partiel).
 *
 * Q3 (arbitrage CSA 2026-08-20) : lorsque la simulation est inactive,
 * pinSignals est une Map vide (EMPTY_MAP, useCircuitState.js) — .get()
 * renvoie alors `undefined` pour toute clé. `undefined` n'est JAMAIS
 * converti en Signal.UNKNOWN ici : la fonction renvoie `signal: null`,
 * qui doit être interprété par le rendu comme un état neutre/statique,
 * explicitement distinct de l'état électrique UNKNOWN (qui signifie
 * « aucune source n'a encore atteint ce net », une affirmation qui n'a pas
 * de sens tant que la simulation n'a pas tourné).
 *
 * @param {{ fromUid?: string, fromPin?: string, toUid?: string, toPin?: string }} wire
 * @param {Map<string, string>} pinSignals
 * @returns {{ signal: string|null }}
 */
export function getWireLogicalState(wire, pinSignals) {
  if (!wire || !(pinSignals instanceof Map)) {
    return { signal: null }
  }

  const { fromUid, fromPin, toUid, toPin } = wire
  if (!fromUid || !fromPin || !toUid || !toPin) {
    return { signal: null }
  }

  const fromSignal = pinSignals.get(`${fromUid}:${fromPin}`)
  const toSignal = pinSignals.get(`${toUid}:${toPin}`)

  const signal = fromSignal ?? toSignal ?? null

  return { signal }
}

/**
 * @param {string|null} signal
 * @returns {boolean}
 */
export function isKnownSignal(signal) {
  return (
    signal === Signal.HIGH ||
    signal === Signal.LOW ||
    signal === Signal.UNKNOWN ||
    signal === Signal.FLOATING
  )
}

export { Signal }
