// Command System (existants)
export { Command } from './command/Command.js';
export { CommandBus } from './command/CommandBus.js';
export { CommandHandler } from './command/CommandHandler.js';
export { CommandRegistry } from './command/CommandRegistry.js';

// Command Errors (existants)
export {
  CommandNotFoundError,
  HandlerNotFoundError,
  CommandExecutionError,
} from './command/errors/index.js';

// Validation System (existants)
export { ValidationEngine } from './validation/ValidationEngine.js';
export { ValidationRegistry } from './validation/ValidationRegistry.js';
export { ValidationReport } from './validation/ValidationReport.js';
export { ValidationProblem } from './validation/ValidationProblem.js';
export { ValidationError } from './validation/errors/ValidationError.js';
export {
  LEVELS,
  CATEGORIES,
  STATUSES,
  SEVERITY_ORDER,
} from './validation/constants.js';

// Handlers System (NOUVEAU)
export { BaseCommandHandler } from './handlers/BaseCommandHandler.js';
export {
  AddComponentHandler,
  RemoveComponentHandler,
  UpdateComponentHandler,
  MoveComponentHandler,
} from './handlers/index.js';
export {
  HandlerError,
  ComponentNotFoundError,
  InvalidComponentTypeError,
} from './handlers/index.js';

// History Integration (NOUVEAU)
export { HistoryService } from './history/HistoryService.js';
export { HistoryCommandAdapter } from './history/HistoryCommandAdapter.js';
