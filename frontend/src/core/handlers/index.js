// Base
export { BaseCommandHandler } from './BaseCommandHandler.js';

// Component handlers
export { AddComponentHandler } from './component/AddComponentHandler.js';
export { RemoveComponentHandler } from './component/RemoveComponentHandler.js';
export { UpdateComponentHandler } from './component/UpdateComponentHandler.js';
export { MoveComponentHandler } from './component/MoveComponentHandler.js';

// Breadboard handlers
// MB-BREADBOARD-002 (CSA Ruling GO du 2026-08-25) : ADD_BREADBOARD, seule
// nouvelle commande introduite par ce ticket (voir Blueprint
// MB-BREADBOARD-001 §6). Enregistrée en production dans useCircuitState.js.
export { AddBreadboardHandler } from './breadboard/AddBreadboardHandler.js';

// Wire handlers
// MB-VIS-005 : exporté pour tests/consommation directe, mais NON enregistré
// dans le CommandRegistry de production (ruling CSA requis, cf.
// UpdateWireWaypointsHandler.js). AddWireHandler (MB-CF3-002) n'était pas
// exporté ici avant ce ticket et n'est pas ajouté rétroactivement — hors
// scope de MB-VIS-005 (G-05).
export { UpdateWireWaypointsHandler } from './wire/UpdateWireWaypointsHandler.js';

// Errors
export { HandlerError } from './errors/HandlerError.js';
export { ComponentNotFoundError } from './errors/ComponentNotFoundError.js';
export { InvalidComponentTypeError } from './errors/InvalidComponentTypeError.js';
export { WireNotFoundError } from './errors/WireNotFoundError.js';
