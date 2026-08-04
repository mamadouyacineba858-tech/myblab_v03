import { CommandHandler } from '../../CommandHandler.js';

/**
 * Handler de test — sans validation métier (déléguée à ADR-010)
 */
export class TestCommandHandler extends CommandHandler {
  execute(command, document) {
    return {
      success: true,
      value: command.payload.value,
      document,
    };
  }
}
