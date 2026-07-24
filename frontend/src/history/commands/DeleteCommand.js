import { HistoryCommand } from '../HistoryCommand.js'

/**
 * DeleteCommand — MB-004.6
 * 
 * Commande pour la suppression groupée de composants et fils avec historique.
 * 
 * @invariant I-H7 : La commande ne modifie pas directement l'état React.
 *                    Elle appelle uniquement les API du Document System.
 * @invariant I-H9 : Les données sont copiées à la construction (copie des objets
 *                    de niveau supérieur). Les composants et fils MYBlab ne
 *                    contiennent pas de structures imbriquées mutables.
 * 
 * @example
 * // Suppression d'un composant avec ses fils connectés
 * const components = new Map([['led-1', { uid: 'led-1', type: 'LED', x: 100, y: 100 }]])
 * const wires = new Map([['wire-1', { id: 'wire-1', fromUid: 'led-1', fromPin: 'anode', toUid: 'power-1', toPin: 'VCC' }]])
 * const cmd = new DeleteCommand(documentApi, components, wires)
 * 
 * // Suppression de plusieurs composants et fils
 * const cmd = new DeleteCommand(documentApi, deletedComponents, deletedWires)
 */
export class DeleteCommand extends HistoryCommand {
    /**
     * @param {Object} documentApi - API du Document System
     * @param {Map<string, Object>} deletedComponents - Composants supprimés (uid → component)
     * @param {Map<string, Object>} deletedWires - Fils supprimés (id → wire)
     * @throws {Error} Si documentApi est manquant
     * @throws {Error} Si deletedComponents ou deletedWires n'est pas un Map
     * @throws {Error} Si les deux Maps sont vides
     */
    constructor(documentApi, deletedComponents, deletedWires) {
        // Vérification de documentApi
        if (!documentApi) {
            throw new Error('DeleteCommand: documentApi est obligatoire')
        }

        // Vérification des types
        if (!(deletedComponents instanceof Map)) {
            throw new Error('DeleteCommand: deletedComponents doit être un Map')
        }
        if (!(deletedWires instanceof Map)) {
            throw new Error('DeleteCommand: deletedWires doit être un Map')
        }

        // Vérification qu'il y a au moins un élément
        if (deletedComponents.size === 0 && deletedWires.size === 0) {
            throw new Error('DeleteCommand: au moins un composant ou un fil doit être présent')
        }

        super(documentApi)

        // Copie des données à la construction (I-H9)
        // Les objets composants et fils MYBlab contiennent uniquement des primitives
        // (uid, type, x, y, pins pour les composants ; id, fromUid, fromPin, toUid, toPin pour les fils)
        // donc une copie superficielle { ...value } est suffisante.
        this._deletedComponents = new Map(
            [...deletedComponents].map(([key, value]) => [
                key,
                { ...value }
            ])
        )
        this._deletedWires = new Map(
            [...deletedWires].map(([key, value]) => [
                key,
                { ...value }
            ])
        )

        // IDs pour les opérations de suppression
        this._componentIds = [...deletedComponents.keys()]
        this._wireIds = [...deletedWires.keys()]
    }

    /**
     * Applique la suppression.
     * Ordre : fils puis composants.
     * Appelée par do() (via HistoryManager.execute) et redo().
     */
    apply() {
        // 1. Supprimer les fils
        if (this._wireIds.length > 0) {
            this.documentApi.removeWires(this._wireIds)
        }

        // 2. Supprimer les composants
        if (this._componentIds.length > 0) {
            this.documentApi.removeComponents(this._componentIds)
        }
    }

    /**
     * Annule la suppression (restauration).
     * Ordre : composants puis fils.
     */
    undo() {
        // 1. Restaurer les composants
        if (this._deletedComponents.size > 0) {
            this.documentApi.restoreComponents([...this._deletedComponents.values()])
        }

        // 2. Restaurer les fils
        if (this._deletedWires.size > 0) {
            this.documentApi.restoreWires([...this._deletedWires.values()])
        }
    }

    /**
     * Retourne une description lisible de la commande.
     * @returns {string}
     */
    getDescription() {
        const parts = []
        if (this._componentIds.length > 0) {
            const count = this._componentIds.length
            parts.push(`${count} composant${count > 1 ? 's' : ''}`)
        }
        if (this._wireIds.length > 0) {
            const count = this._wireIds.length
            parts.push(`${count} fil${count > 1 ? 's' : ''}`)
        }
        return `Suppression de ${parts.join(' et ')}`
    }
}