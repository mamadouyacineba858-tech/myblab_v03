# MB-L1-ARD-002 — Firmware Execution Core V1

**Type :** Level-1 Capability Foundation

**Priorité :** P1

**Programme :** Arduino Programming / Firmware Runtime — Level-1 (P1-02)

**Sous-capacité fermée :** B — Firmware Execution Core (A — Firmware Document Contract, `MB-L1-ARD-001`, CLOSED)

**Dépendances :** `MB-L1-ARD-001` ; ouvre la voie à `MB-L1-ARD-003` (Scheduler Driven Runtime), `MB-L1-ARD-004` (Integrated Code Workspace), `MB-L1-ARD-005` (Level-1 E2E Qualification).

**Blueprint associé :** `docs/pmo/blueprints/MB-L1-ARD-002-firmware-execution-core-blueprint.md`

## Objectif

Construire un Firmware Execution Core V1 pur et déterministe : `firmware.source → compiler → ExecutableFirmware (IR) → FirmwareExecutor → setup()/runLoopOnce() → pinMode()/digitalWrite() → ArduinoSimulator`. Purement Core/Runtime — aucune UI, aucun Scheduler, aucune progression temporelle.

## Périmètre

- Subset Arduino V1 : `void setup(){}`, `void loop(){}`, `pinMode(2|3, OUTPUT)`, `digitalWrite(2|3, HIGH|LOW)`.
- Compiler pur (`firmwareCompiler.js`) produisant une IR immuable ou des diagnostics structurés.
- Executor (`firmwareExecutor.js`) exécutant `setup()` une fois et `loop()` une itération à la fois (`runLoopOnce()`), via un RuntimePort injecté.
- Mapping pin centralisé (`boardPinMap.js`) : 2→D2, 3→D3.
- Vocabulaire de diagnostics structuré (`firmwareDiagnostics.js`).
- Preuve d'intégration avec le vrai `ArduinoSimulator` (aucune adaptation nécessaire).

## Hors périmètre

`delay()`, `millis()/micros()`, Scheduler, `RuntimeOrchestrator`, boucle continue/`requestAnimationFrame`/`setInterval`, Code Workspace/éditeur, intégration React/Start Simulation, Blink navigateur, `analogRead()/digitalRead()`, Serial/I2C/SPI, interruptions, émulateur AVR, bibliothèques Arduino, préprocesseur C++ complet.

## Fichiers créés

- `frontend/src/arduino/firmware/boardPinMap.js`
- `frontend/src/arduino/firmware/firmwareDiagnostics.js`
- `frontend/src/arduino/firmware/firmwareCompiler.js`
- `frontend/src/arduino/firmware/firmwareExecutor.js`
- `frontend/src/arduino/firmware/__tests__/boardPinMap.test.js`
- `frontend/src/arduino/firmware/__tests__/firmwareCompiler.test.js`
- `frontend/src/arduino/firmware/__tests__/firmwareExecutor.test.js`
- `frontend/src/arduino/firmware/__tests__/firmwareExecution.integration.test.js`
- `frontend/src/arduino/firmware/__tests__/firmwareArchitecture.test.js`
- `docs/pmo/blueprints/MB-L1-ARD-002-firmware-execution-core-blueprint.md`
- `docs/pmo/tickets/MB-L1-ARD-002.md`
- `docs/pmo/delivery-reports/MB-L1-ARD-002-delivery-report.md`

## Fichiers modifiés

**Aucun.** `useCircuitState.js`, `CircuitContext.jsx`, `UpdateArduinoFirmwareHandler.js`, `ArduinoSimulator.js`, `runtimeOrchestrator.js`, `scheduler.js`, `simulationRuntimeIntegration.js`, `resolution.js` — tous inchangés. L'API existante d'`ArduinoSimulator` (`digitalWrite(pin, level)`, `start()`, `tick()`) satisfaisait déjà intégralement l'interface RuntimePort attendue par `FirmwareExecutor` — aucune adaptation n'a été nécessaire.

## Critères d'acceptation

Voir le Delivery Report — AC-01 à AC-30, tous statués.
