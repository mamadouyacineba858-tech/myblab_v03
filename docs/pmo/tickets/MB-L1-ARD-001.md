# MB-L1-ARD-001 — Arduino Firmware Document Contract

**Type :** Level-1 Capability Foundation

**Priorité :** P1

**Programme :** Arduino Programming / Firmware Runtime — Level-1 (P1-02)

**Sous-capacité fermée :** A — Firmware Document Contract (sur la séquence A→E, voir Blueprint directeur Arduino Level-1)

**Dépendances :** aucune (fondation) ; ouvre la voie à `MB-L1-ARD-002` (Firmware Execution Core), `MB-L1-ARD-003` (Scheduler Driven Runtime), `MB-L1-ARD-004` (Integrated Code Workspace), `MB-L1-ARD-005` (Level-1 E2E Qualification).

**Blueprint associé :** `docs/pmo/blueprints/MB-L1-ARD-001-arduino-firmware-document-contract-blueprint.md`

## Objectif

Introduire la persistance du sketch Arduino dans le Document MYBlab : source firmware, mutation dédiée, Undo/Redo, export/import — sans parser, sans exécution, sans éditeur.

## Périmètre

- `component.firmware = { source: string }` pour les composants ARDUINO uniquement.
- Sketch par défaut centralisé (`frontend/src/arduino/firmwareDefaults.js`), squelette `setup()`/`loop()` vide.
- Commande dédiée `UPDATE_ARDUINO_FIRMWARE` (jamais un `UPDATE_COMPONENT` générique, jamais une réutilisation de `UPDATE_COMPONENT_PARAMETERS`).
- Handler dédié `UpdateArduinoFirmwareHandler.js`.
- Export/import préservent `firmware.source`, aucun état runtime volatile sérialisé.

## Hors périmètre

Parser/compilateur, exécution `setup()`/`loop()`/`delay()`, éditeur de code (Monaco/Blockly), modification du Scheduler/ArduinoSimulator/simulationRuntimeIntegration, Serial/I2C/SPI, émulation AVR.

## Fichiers créés

- `frontend/src/arduino/firmwareDefaults.js`
- `frontend/src/arduino/__tests__/firmwareDefaults.test.js`
- `frontend/src/core/handlers/component/UpdateArduinoFirmwareHandler.js`
- `frontend/src/core/handlers/__tests__/UpdateArduinoFirmwareHandler.test.js`
- `frontend/src/__tests__/ArduinoFirmwareDocument.integration.test.jsx`
- `docs/pmo/blueprints/MB-L1-ARD-001-arduino-firmware-document-contract-blueprint.md`
- `docs/pmo/tickets/MB-L1-ARD-001.md`
- `docs/pmo/delivery-reports/MB-L1-ARD-001-delivery-report.md`

## Fichiers modifiés

- `frontend/src/hooks/useCircuitState.js` — registration `UPDATE_ARDUINO_FIRMWARE`, matérialisation du firmware par défaut dans `addComponent()`, action `updateArduinoFirmware()`.
- `frontend/src/core/handlers/component/AddComponentHandler.js` — transport générique optionnel du champ `firmware` (même patron que `parameters`).
- `frontend/src/utils/circuitModel.js` — `normalizeComponent()` préserve `firmware` (même patron que `parameters`).
- `frontend/src/context/CircuitContext.jsx` — expose `updateArduinoFirmware` dans le contexte stable.
- `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` — amendement du verrou de canal (10ᵉ commande), précédent établi 6 fois pour chaque extension antérieure.

`ReactDocumentMapper.js`, `engineAdapter.js`, `HistoryService.js`, `Command.js`, `CommandBus.js`, `CommandRegistry.js`, `ArduinoSimulator.js`, `runtimeOrchestrator.js`, `simulationRuntimeIntegration.js`, `scheduler.js`, `resolution.js`, `pwmSignal.js` — **tous inchangés**, exactement comme requis par les §21/§25 du ticket.

## Critères d'acceptation

Voir le Delivery Report — AC-01 à AC-25, tous statués.
