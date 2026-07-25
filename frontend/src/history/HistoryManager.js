import { HistoryCommand } from './HistoryCommand.js'

/**
 * Gestionnaire central de l'historique des commandes.
 * 
 * Responsabilités :
 * - Exécuter les commandes et les ajouter à l'historique
 * - Gérer l'annulation (undo) et le rétablissement (redo)
 * - Fusionner les commandes consécutives de même type (I-H6)
 * - Limiter la taille de l'historique (I-H1)
 * - Vider le redoStack lors d'une nouvelle commande (I-H5)
 * 
 * @invariant I-H1 : Toute modification du document passe par une commande
  * @invariant I-H1-A : Toute action utilisateur finalisée et historisable
 *                    doit être représentée par une commande d'historique.
 * @invariant I-H1-B : Les mutations transitoires nécessaires au fonctionnement
 *                    d'une interaction continue peuvent modifier temporairement
 *                    l'état avant la création de la commande finale.
 * @invariant I-H2 : Undo remet le document exactement dans l'état précédent
 * @invariant I-H3 : Redo reproduit exactement Undo
 * @invariant I-H4 : Une commande n'est enregistrée qu'une seule fois
 * @invariant I-H5 : Toute nouvelle commande vide le redoStack
 * @invariant I-H6 : Un drag continu correspond à une seule entrée dans l'historique
 * @invariant I-H7 : Une commande ne modifie jamais directement l'état React
 * @invariant I-H8 : merge() est une opération purement logique
 * 
 * @principle Fusion (I-H6) :
 *   Lorsqu'une commande est fusionnée avec la précédente, le document
 *   est déjà dans l'état final (car le Pointer System met à jour le
 *   document en temps réel). La fusion agit uniquement sur l'historique
 *   pour remplacer deux commandes consécutives par une seule.
 */
export class HistoryManager {
    /**
     * @param {number} maxHistory - Nombre maximum de commandes dans l'historique
     */
    constructor(maxHistory = 50) {
        this.undoStack = []
        this.redoStack = []
        this.maxHistory = maxHistory
        this._isExecuting = false
    }

    /**
     * Exécute une commande et l'ajoute à l'historique.
     * 
     * @param {HistoryCommand} command - La commande à exécuter
     * @returns {HistoryCommand} - La commande exécutée (ou fusionnée)
     */
    execute(command) {
        if (!(command instanceof HistoryCommand)) {
            throw new Error('Command must be an instance of HistoryCommand')
        }

        this._isExecuting = true

        try {
            // Tenter la fusion avec la dernière commande (I-H6)
            const last = this.undoStack[this.undoStack.length - 1]
            if (last && last.canMerge && last.canMerge(command)) {
                // Fusion purement logique (I-H8)
                const merged = last.merge(command)
                
                // Remplacer la dernière commande par la version fusionnée
                this.undoStack[this.undoStack.length - 1] = merged
                
                // NE PAS appeler merged.do() ici :
                // Le document est déjà dans l'état final (mis à jour en temps réel
                // par le Pointer System). La fusion agit uniquement sur l'historique.
                
                // Vider le redoStack (I-H5)
                this.redoStack = []
                return merged
            }

            // Exécuter la commande (I-H1)
            command.do()
            this.undoStack.push(command)
            // Vider le redoStack (I-H5)
            this.redoStack = []

            // Limiter la taille de l'historique
            if (this.undoStack.length > this.maxHistory) {
                this.undoStack.shift()
            }

            return command
        } finally {
            this._isExecuting = false
        }
    }

    /**
     * Annule la dernière commande.
     * 
     * @returns {boolean} - true si undo a été effectué
     */
    undo() {
        if (this.undoStack.length === 0) return false

        const command = this.undoStack.pop()
        command.undo()
        this.redoStack.push(command)
        return true
    }

    /**
     * Rétablit la dernière commande annulée.
     * 
     * @returns {boolean} - true si redo a été effectué
     */
    redo() {
        if (this.redoStack.length === 0) return false

        const command = this.redoStack.pop()
        command.redo()
        this.undoStack.push(command)
        return true
    }

    /**
     * Nettoie l'historique (ex: lors d'un import de circuit).
     */
    clear() {
        this.undoStack = []
        this.redoStack = []
    }

    /**
     * Vérifie si undo est disponible.
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0
    }

    /**
     * Vérifie si redo est disponible.
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0
    }

    /**
     * Retourne le nombre de commandes dans l'historique.
     * @returns {number}
     */
    getUndoCount() {
        return this.undoStack.length
    }

    /**
     * Retourne le nombre de commandes dans le redoStack.
     * @returns {number}
     */
    getRedoCount() {
        return this.redoStack.length
    }

    /**
     * Vérifie si une exécution est en cours.
     * @returns {boolean}
     */
    isExecuting() {
        return this._isExecuting
    }

    /**
     * Retourne une description des commandes dans l'historique (debug).
     * @returns {Array<string>}
     */
    getHistoryDescriptions() {
        return this.undoStack.map(cmd => cmd.getDescription())
    }
}