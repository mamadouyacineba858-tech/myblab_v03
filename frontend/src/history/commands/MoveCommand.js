import { HistoryCommand } from '../HistoryCommand.js'

/**
 * Commande pour le déplacement de composants.
 * 
 * @invariant I-H7 : La commande ne modifie pas directement l'état React.
 *                   Elle appelle uniquement les API du Document System.
 * @invariant AD-004.2.1 : Le document est déjà dans l'état final après le drag.
 *                          La commande mémorise les états avant/après pour undo/redo.
 * @invariant I-H9 : Une commande est immuable. Les données sont copiées à la construction.
 * 
 * @example
 * // Déplacement d'un seul composant
 * const before = new Map([['comp-1', {x: 100, y: 100}]])
 * const after = new Map([['comp-1', {x: 150, y: 120}]])
 * const cmd = new MoveCommand(documentApi, before, after)
 * 
 * // Déplacement de plusieurs composants
 * const before = new Map([
 *   ['comp-1', {x: 100, y: 100}],
 *   ['comp-2', {x: 300, y: 250}]
 * ])
 * const after = new Map([
 *   ['comp-1', {x: 150, y: 120}],
 *   ['comp-2', {x: 350, y: 270}]
 * ])
 * const cmd = new MoveCommand(documentApi, before, after)
 */
export class MoveCommand extends HistoryCommand {
    /**
     * @param {Object} documentApi - API du Document System
     * @param {Map<string, {x: number, y: number}>} before - Positions initiales
     * @param {Map<string, {x: number, y: number}>} after - Positions finales
     * @throws {Error} Si before n'est pas un Map non-vide
     * @throws {Error} Si after n'est pas un Map non-vide
     * @throws {Error} Si before et after n'ont pas les mêmes clés
     * @throws {Error} Si une coordonnée est invalide (non numérique)
     */
    constructor(documentApi, before, after) {
        super(documentApi)
        
        // Vérification des types
        if (!(before instanceof Map) || before.size === 0) {
            throw new Error('MoveCommand: before must be a non-empty Map')
        }
        if (!(after instanceof Map) || after.size === 0) {
            throw new Error('MoveCommand: after must be a non-empty Map')
        }
        
        // Vérification de cohérence (mêmes clés)
        if (before.size !== after.size) {
            throw new Error('MoveCommand: before and after must have the same size')
        }
        for (const id of before.keys()) {
            if (!after.has(id)) {
                throw new Error(`MoveCommand: component "${id}" not found in after`)
            }
        }
        
        // Vérification des coordonnées
        for (const [id, pos] of before) {
            if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
                throw new Error(`MoveCommand: invalid coordinates for "${id}" in before`)
            }
        }
        for (const [id, pos] of after) {
            if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
                throw new Error(`MoveCommand: invalid coordinates for "${id}" in after`)
            }
        }
        
        // Immutabilité : copie profonde des données (I-H9)
        this.before = new Map(
            [...before].map(([id, pos]) => [
                id,
                { x: pos.x, y: pos.y }
            ])
        )
        this.after = new Map(
            [...after].map(([id, pos]) => [
                id,
                { x: pos.x, y: pos.y }
            ])
        )
    }

    /**
     * Applique les positions finales.
     * Appelé par do() (via execute) ou redo().
     */
    applyPositions() {
        this.documentApi.updateComponentPositions(this.after)
    }

    /**
     * Exécute la commande (via HistoryManager.execute).
     */
    do() {
        this.applyPositions()
    }

    /**
     * Annule le déplacement (positions initiales).
     */
    undo() {
        this.documentApi.updateComponentPositions(this.before)
    }

    /**
     * Rétablit le déplacement (positions finales).
     */
    redo() {
        this.applyPositions()
    }

    /**
     * Retourne une description lisible de la commande.
     */
    getDescription() {
        return `Move ${this.after.size} component(s)`
    }
}