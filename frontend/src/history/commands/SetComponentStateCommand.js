import { HistoryCommand } from '../HistoryCommand.js'

/**
 * SetComponentStateCommand — A3-SW1
 *
 * Commande générique de changement d'état persistant d'un composant, avec
 * historique. Ne connaît aucun type de composant ni aucune valeur d'état
 * particulière (contrairement à ToggleLatchingButtonCommand, spécialisé
 * historiquement sur 'on'/'off' — conservé inchangé pour BUTTON_LATCHING).
 * Respecte l'invariant I-H7 : ne modifie pas directement l'état React,
 * passe exclusivement par documentApi.
 */
export class SetComponentStateCommand extends HistoryCommand {
  /**
   * @param {Object} documentApi - API du Document System
   * @param {string} uid - Identifiant unique du composant
   * @param {string} oldState - État précédent
   * @param {string} newState - Nouvel état
   */
  constructor(documentApi, uid, oldState, newState) {
    if (!documentApi) {
      throw new Error('SetComponentStateCommand: documentApi est obligatoire')
    }
    if (!uid) {
      throw new Error('SetComponentStateCommand: uid est obligatoire')
    }
    if (typeof oldState !== 'string' || oldState.length === 0) {
      throw new Error('SetComponentStateCommand: oldState doit être une chaîne non vide')
    }
    if (typeof newState !== 'string' || newState.length === 0) {
      throw new Error('SetComponentStateCommand: newState doit être une chaîne non vide')
    }
    if (oldState === newState) {
      throw new Error('SetComponentStateCommand: oldState et newState doivent être différents')
    }

    super(documentApi)
    this._uid = uid
    this._oldState = oldState
    this._newState = newState
  }

  /**
   * Applique le changement d'état.
   */
  apply() {
    this.documentApi.updateComponentState(this._uid, this._newState)
  }

  /**
   * Annule le changement d'état (restaure l'ancien état).
   */
  undo() {
    this.documentApi.updateComponentState(this._uid, this._oldState)
  }

  /**
   * Retourne une description lisible de la commande.
   * @returns {string}
   */
  getDescription() {
    return `Composant ${this._uid} : ${this._oldState} → ${this._newState}`
  }
}
