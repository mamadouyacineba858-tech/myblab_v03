/**
 * Interface de base pour un Command Handler.
 * Un handler est responsable de l'exécution d'un type spécifique de commande.
 *
 * La validation métier est déléguée au Validation Engine (ADR-010).
 * Le handler n'effectue que la transformation du Document.
 */
export class CommandHandler {
  /**
   * Exécute la commande et retourne le résultat.
   * @param {Command} command - La commande à exécuter
   * @param {object} document - L'état actuel du Document Circuit
   * @returns {object} Résultat contenant le nouveau document et métadonnées
   * @throws {CommandExecutionError} Si l'exécution échoue
   */
  execute(command, document) {
    throw new Error('CommandHandler.execute() must be implemented by subclass');
  }
}
