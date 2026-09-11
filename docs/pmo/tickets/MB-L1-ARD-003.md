# MB-L1-ARD-003 — Scheduler-Driven Firmware Runtime

**Type :** Level-1 Capability Foundation

**Priorité :** P1

**Programme :** Arduino Programming / Firmware Runtime — Level-1 (P1-02)

**Sous-capacité fermée :** C — Scheduler Driven Runtime (A — Firmware Document Contract et B — Firmware Execution Core, `MB-L1-ARD-001`/`002`, CLOSED)

**Dépendances :** `MB-L1-ARD-002` ; ouvre la voie à `MB-L1-ARD-004` (Integrated Code Workspace), `MB-L1-ARD-005` (Level-1 E2E Qualification).

**Blueprint associé :** `docs/pmo/blueprints/MB-L1-ARD-003-scheduler-driven-firmware-runtime-blueprint.md`

## Objectif

Étendre le Firmware Core (ARD-002) pour supporter `delay()` et une exécution suspendable/reprenable, pilotée exclusivement par le Scheduler MYBlab existant (`scheduler.js`, inchangé) — jamais une horloge système, jamais un second Scheduler caché.

## Périmètre

- Compilation de `delay(<littérale numérique finie >= 0>)` en IR `{ op: "DELAY", durationMs }`.
- `FirmwareExecutor` étendu avec `resume(currentTimeMs)` : suspend sur `DELAY`, reprend exactement à l'instruction suivante, enchaîne `setup→loop` automatiquement, borné à une itération non retardée de `loop` par appel (protection anti-boucle-infinie).
- `FirmwareRuntimeController` (nouveau) : orchestration Scheduler + Executor + RuntimePort, injectable/composable.
- Preuve Blink Core complète avec le vrai `ArduinoSimulator` et le vrai `Scheduler`, sans React.

## Hors périmètre

`millis()/micros()`, variables, structures de contrôle (`if`/`for`/`while`), fonctions utilisateur, `analogWrite()`, Code Workspace/éditeur, intégration React/Start Simulation, Blink navigateur, redesign du Scheduler/`RuntimeOrchestrator`/`ArduinoSimulator`.

## Fichiers créés

- `frontend/src/arduino/firmware/firmwareRuntimeController.js`
- `frontend/src/arduino/firmware/__tests__/firmwareRuntimeController.test.js`
- `frontend/src/arduino/firmware/__tests__/firmwareBlink.integration.test.js`
- `frontend/src/arduino/firmware/__tests__/firmwareTemporalArchitecture.test.js`
- `docs/pmo/blueprints/MB-L1-ARD-003-scheduler-driven-firmware-runtime-blueprint.md`
- `docs/pmo/tickets/MB-L1-ARD-003.md`
- `docs/pmo/delivery-reports/MB-L1-ARD-003-delivery-report.md`

## Fichiers modifiés

- `frontend/src/arduino/firmware/firmwareCompiler.js` — reconnaît `delay()`.
- `frontend/src/arduino/firmware/firmwareDiagnostics.js` — nouveau code `INVALID_DELAY_DURATION`.
- `frontend/src/arduino/firmware/firmwareExecutor.js` — ajout de l'API temporelle `resume()` (additive, API ARD-002 inchangée).
- `frontend/src/arduino/firmware/__tests__/firmwareCompiler.test.js` — C14 amendé (delay compile désormais, changement de comportement explicitement mandaté par ce ticket) + D1-D7 ajoutés.
- `frontend/src/arduino/firmware/__tests__/firmwareExecutor.test.js` — T1-T15 + test de protection anti-boucle-infinie ajoutés, aucune assertion ARD-002 existante modifiée.

`scheduler.js`, `clock.js`, `runtimeOrchestrator.js`, `simulationRuntimeIntegration.js`, `resolution.js`, `useCircuitState.js`, `UpdateArduinoFirmwareHandler.js`, `ArduinoSimulator.js` — **tous inchangés**.

## Critères d'acceptation

Voir le Delivery Report — AC-01 à AC-28, tous statués.
