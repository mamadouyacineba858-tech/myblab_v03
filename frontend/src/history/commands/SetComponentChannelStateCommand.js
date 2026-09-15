import { HistoryCommand } from '../HistoryCommand.js'

/**
 * SetComponentChannelStateCommand — A3-SW2
 *
 * Commande générique de changement d'état persistant d'UN CANAL d'un
 * composant multi-canaux (DIP Switch en étant le premier consommateur), avec
 * historique. Ne connaît aucun type de composant, aucun nombre de canaux, ni
 * aucun identifiant de canal particulier.
 *
 * Choix architectural (B4, justifié dans le rapport de ticket) : une
 * commande DÉDIÉE plutôt qu'une généralisation de SetComponentStateCommand
 * (A3-SW1). SetComponentStateCommand valide strictement oldState/newState
 * comme des CHAÎNES non vides (l'état global d'un composant) — channelStates
 * est un OBJET (map canal -> état), une forme fondamentalement différente.
 * Réutiliser SetComponentStateCommand aurait exigé d'affaiblir son contrat
 * de validation pour BUTTON_LATCHING/SLIDE_SWITCH, qui restent inchangés.
 * Cette commande transporte un SNAPSHOT COMPLET de channelStates avant/après
 * (jamais un diff) : appliquer/annuler ne touche donc jamais que le(s)
 * canal(aux) réellement différent(s) entre les deux snapshots, les autres
 * canaux étant recopiés à l'identique — I-DIP-09/I-DIP-11/I-DIP-12.
 *
 * Respecte l'invariant I-H7 : ne modifie pas directement l'état React,
 * passe exclusivement par documentApi.
 */
export class SetComponentChannelStateCommand extends HistoryCommand {
  /**
   * @param {Object} documentApi - API du Document System
   * @param {string} uid - Identifiant unique du composant
   * @param {Record<string,string>} oldChannelStates - snapshot complet avant
   * @param {Record<string,string>} newChannelStates - snapshot complet après
   */
  constructor(documentApi, uid, oldChannelStates, newChannelStates) {
    if (!documentApi) {
      throw new Error('SetComponentChannelStateCommand: documentApi est obligatoire')
    }
    if (!uid) {
      throw new Error('SetComponentChannelStateCommand: uid est obligatoire')
    }
    if (!oldChannelStates || typeof oldChannelStates !== 'object' || Array.isArray(oldChannelStates)) {
      throw new Error('SetComponentChannelStateCommand: oldChannelStates doit être un objet')
    }
    if (!newChannelStates || typeof newChannelStates !== 'object' || Array.isArray(newChannelStates)) {
      throw new Error('SetComponentChannelStateCommand: newChannelStates doit être un objet')
    }
    if (JSON.stringify(oldChannelStates) === JSON.stringify(newChannelStates)) {
      throw new Error('SetComponentChannelStateCommand: oldChannelStates et newChannelStates doivent être différents')
    }

    super(documentApi)
    this._uid = uid
    this._oldChannelStates = { ...oldChannelStates }
    this._newChannelStates = { ...newChannelStates }
  }

  /**
   * Applique le changement d'état du canal.
   */
  apply() {
    this.documentApi.updateComponentChannelStates(this._uid, this._newChannelStates)
  }

  /**
   * Annule le changement d'état (restaure le snapshot précédent).
   */
  undo() {
    this.documentApi.updateComponentChannelStates(this._uid, this._oldChannelStates)
  }

  /**
   * Retourne une description lisible de la commande.
   * @returns {string}
   */
  getDescription() {
    return `Composant ${this._uid} : canaux ${JSON.stringify(this._oldChannelStates)} → ${JSON.stringify(this._newChannelStates)}`
  }
}
