/**
 * Classe de base pour toutes les commandes de l'historique.
 * 
 * Une commande représente une action utilisateur qui peut être :
 * - exécutée (do / apply)
 * - annulée (undo)
 * - rétablie (redo)
 * 
 * Les commandes peuvent également être fusionnées si elles sont consécutives
 * et de même type (ex: déplacement continu).
 * 
 * @invariant I-H7 : Une commande ne modifie jamais directement l'état React ;
 *                   elle appelle uniquement les API du Document System.
 * @invariant I-H8 : merge() est une opération purement logique ; elle ne modifie
 *                   pas le document. L'application des modifications se fait
 *                   exclusivement via do() / apply().
 */
export class HistoryCommand {
    /**
     * @param {Object} documentApi - API du Document System (obligatoire)
     * @throws {Error} Si documentApi est manquant
     */
    constructor(documentApi) {
        if (!documentApi) {
            throw new Error('HistoryCommand: documentApi is required')
        }
        this.documentApi = documentApi
    }

    /**
     * Exécute la commande (action initiale).
     * Appelée par HistoryManager.execute().
     */
    do() {
        this.apply()
    }

    /**
     * Applique la commande (peut être appelé par do() ou redo()).
     * @abstract
     */
    apply() {
        throw new Error('apply() must be implemented by subclass')
    }

    /**
     * Annule la commande (retour à l'état précédent).
     * @abstract
     */
    undo() {
        throw new Error('undo() must be implemented by subclass')
    }

    /**
     * Rétablit la commande (re-application après undo).
     * Par défaut, ré-appelle apply().
     */
    redo() {
        this.apply()
    }

    /**
     * Vérifie si cette commande peut être fusionnée avec une autre.
     * 
     * @param {HistoryCommand} next - La commande suivante à fusionner
     * @returns {boolean} - true si les commandes peuvent être fusionnées
     */
   canMerge() {
    return false
}

    /**
     * Fusionne deux commandes.
     * Appelé uniquement si canMerge() retourne true.
     * 
     * @invariant I-H8 : merge() est une opération purement logique.
     *                    Elle ne modifie PAS le document.
     *                    L'application des modifications sera faite
     *                    par HistoryManager après la fusion.
     * 
     * @param {HistoryCommand} next - La commande suivante à fusionner
     * @returns {HistoryCommand} - La commande fusionnée
     * @abstract
     */
   merge() {
    throw new Error('merge() must be implemented if canMerge() can return true')
}

    /**
     * Retourne une description lisible de la commande (pour debug).
     * @returns {string}
     */
    getDescription() {
        return this.constructor.name
    }
}