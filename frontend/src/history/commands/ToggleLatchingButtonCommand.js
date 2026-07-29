import { HistoryCommand } from '../HistoryCommand.js'

/**
 * ToggleLatchingButtonCommand — A2
 * 
 * Commande pour basculer l'état d'un bouton à verrouillage avec historique.
 * Respecte l'invariant I-H7 : ne modifie pas directement l'état React,
 * passe exclusivement par documentApi.
 */
export class ToggleLatchingButtonCommand extends HistoryCommand {
  /**
   * @param {Object} documentApi - API du Document System
   * @param {string} uid - Identifiant unique du composant
   * @param {string} oldState - État précédent ('on' ou 'off')
   * @param {string} newState - Nouvel état ('on' ou 'off')
   */
  constructor(documentApi, uid, oldState, newState) {
    if (!documentApi) {
      throw new Error('ToggleLatchingButtonCommand: documentApi est obligatoire')
    }
    if (!uid) {
      throw new Error('ToggleLatchingButtonCommand: uid est obligatoire')
    }
    if (oldState !== 'on' && oldState !== 'off') {
      throw new Error('ToggleLatchingButtonCommand: oldState doit être "on" ou "off"')
    }
    if (newState !== 'on' && newState !== 'off') {
      throw new Error('ToggleLatchingButtonCommand: newState doit être "on" ou "off"')
    }
    if (oldState === newState) {
      throw new Error('ToggleLatchingButtonCommand: oldState et newState doivent être différents')
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
    return `Interrupteur ${this._uid} : ${this._oldState} → ${this._newState}`
  }
}
