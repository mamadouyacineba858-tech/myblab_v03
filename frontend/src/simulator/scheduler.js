import { createSimulatedClock } from "./clock.js"

/**
 * MB-SIM-009 — Scheduler (orchestration temporelle minimale).
 *
 * Le Scheduler ne mesure pas le temps lui-même : il consomme une
 * SimulatedClock (séparation stricte imposée par INV-SIM009-008/N03) et se
 * limite à exposer un contrat d'orchestration temporelle minimal,
 * consommable par un futur ticket (MB-SIM-010) sans en anticiper
 * l'implémentation (INV-SIM009-N06) — aucune référence à ArduinoSimulator,
 * aucune logique par type de composant (INV-SIM009-N01), aucune
 * résolution de circuit (INV-SIM009-N02).
 *
 * Volontairement minimal (Ticket MB-SIM-009 v1 §13) : pas de file
 * d'événements, pas de callbacks, pas de priorité, pas de fréquence, pas
 * de boucle temps réel — seule la progression temporelle contrôlée est
 * fournie, jusqu'à ce qu'un besoin supplémentaire soit démontré par un
 * ticket futur (§16 du ticket : toute extension non couverte ici doit
 * être arbitrée, pas ajoutée silencieusement).
 *
 * Relation avec runSimulation() (Ticket §14) : le Scheduler n'appelle pas
 * runSimulation() ni aucune fonction de simulator/engine.js. Il fournit
 * uniquement, dès maintenant, le seam temporel qu'un futur ticket pourra
 * utiliser pour orchestrer l'exécution répétée du cycle existant, sans que
 * cela ne soit implémenté ici.
 */
export class Scheduler {
  /**
   * @param {{ clock?: import('./clock.js').SimulatedClock }} [options]
   *   Une Clock peut être injectée explicitement (utile pour les tests ou
   *   pour un futur consommateur qui posséderait déjà sa propre Clock).
   *   À défaut, le Scheduler crée sa propre SimulatedClock indépendante.
   */
  constructor({ clock } = {}) {
    this._clock = clock ?? createSimulatedClock()
  }

  /**
   * @returns {number} État temporel observable courant, en millisecondes.
   */
  getCurrentTime() {
    return this._clock.getCurrentTime()
  }

  /**
   * Avance temporelle contrôlée. Délègue entièrement la validation et le
   * calcul à la Clock sous-jacente (le Scheduler ne réimplémente aucune
   * logique temporelle propre).
   * @param {number} dt
   * @returns {number} Nouveau temps courant, en millisecondes.
   * @throws {import('./errors/index.js').InvalidTimeDeltaError} si dt est
   *   invalide (voir clock.js) — l'état temporel reste alors inchangé.
   */
  advance(dt) {
    return this._clock.advance(dt)
  }

  /**
   * Réinitialise l'état temporel du Scheduler à 0 ms.
   * @returns {number} Nouveau temps courant (toujours 0).
   */
  reset() {
    return this._clock.reset()
  }
}

/**
 * @param {{ clock?: import('./clock.js').SimulatedClock }} [options]
 * @returns {Scheduler}
 */
export function createScheduler(options) {
  return new Scheduler(options)
}
