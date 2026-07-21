/**
 * Historique — Exports publics
 * 
 * Point d'entrée unique pour le système d'historique.
 * 
 * @module history
 */

export { HistoryManager } from './HistoryManager.js'
export { HistoryCommand } from './HistoryCommand.js'

// Les commandes spécifiques seront exportées dans les tickets futurs :
// export { MoveCommand } from './commands/MoveCommand.js'
// export { AddComponentCommand } from './commands/AddComponentCommand.js'
// export { DeleteComponentCommand } from './commands/DeleteComponentCommand.js'
// export { AddWireCommand } from './commands/AddWireCommand.js'
// export { DeleteWireCommand } from './commands/DeleteWireCommand.js'
// export { PasteCommand } from './commands/PasteCommand.js'