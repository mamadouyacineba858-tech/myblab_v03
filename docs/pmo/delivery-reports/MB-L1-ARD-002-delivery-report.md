# Delivery Report — MB-L1-ARD-002 : Firmware Execution Core V1

**Base SHA:** `14c75655fb72b0f86fef599ec594f4a48d26f4f2` (verified via `git checkout --detach` before branching)
**Branch:** `feat/MB-L1-ARD-002-firmware-execution-core`
**Final SHA:** see commit confirmation at the end of this report

## Audit / cartographie réelle (avant implémentation)

- `ArduinoSimulator.js` : `digitalWrite(pin, level)` écrit déjà `pinOutputs.set(pin, level === Signal.HIGH ? Signal.HIGH : Signal.LOW)` — exactement l'interface RuntimePort attendue, aucune adaptation nécessaire. `loadCode(source)` stocke le texte sans l'interpréter (confirmé legacy/inutilisé par ce ticket, tel qu'anticipé §23 "Solution préférée").
- `signals.js` : `Signal.HIGH`/`Signal.LOW` confirmés comme vocabulaire pur, sans dépendance Scheduler/Solveur — réutilisable directement par `firmwareExecutor.js`.
- Aucun `firmwareCompiler.js`/`firmwareExecutor.js` préexistant.

## Architecture

```text
firmware.source (string)
      ↓
compileFirmware(source) → { ok:true, ir } | { ok:false, diagnostics }
      ↓
new FirmwareExecutor(ir, runtimePort)
      ↓ start() / runLoopOnce() / reset()
runtimePort.digitalWrite(pin, Signal.HIGH|LOW)
      ↓
ArduinoSimulator (inchangé)
```

## Files created

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
- `docs/pmo/delivery-reports/MB-L1-ARD-002-delivery-report.md` (this file)

## Files modified

**None.** `git status --short` shows zero tracked file changed — only the new `frontend/src/arduino/firmware/` directory was added. `ArduinoSimulator.js`'s existing API (`digitalWrite`, `start`, `tick`) already satisfies the RuntimePort interface expected by `FirmwareExecutor` without any modification.

## Board pin contract

`boardPinMap.js`: `mapArduinoPin(2) === "D2"`, `mapArduinoPin(3) === "D3"`, any other number returns `null` (never a fabricated value). Single source of truth — no dispersed `pin === 2 ? "D2" : ...` logic anywhere else.

## Compiler contract

`compileFirmware(source: string) → { ok: true, ir: { setup: [], loop: [] } } | { ok: false, diagnostics: [{code, message, line}] }`. Pure: zero import of `simulator/*`, React, Document, History, CommandBus. No `eval`, no `new Function`, no whole-statement literal comparison — each instruction is recognized structurally (function name + argument pattern), verified by `firmwareArchitecture.test.js`.

## Executable IR contract

```js
{
  setup: [ { op: "PIN_MODE", pin: "D2", mode: "OUTPUT" } ],
  loop:  [ { op: "DIGITAL_WRITE", pin: "D2", value: "HIGH" } ],
}
```

`Object.freeze()` applied recursively (top-level object, `setup`/`loop` arrays, each instruction node) — confirmed immutable by test (`Object.isFrozen()` on every level).

## Diagnostics contract

```js
{ code: "UNSUPPORTED_PIN" | "UNSUPPORTED_MODE" | "INVALID_LEVEL" | "UNSUPPORTED_STATEMENT" | "MISSING_SETUP" | "MISSING_LOOP" | "MALFORMED_BRACES", message: string, line: number|null }
```

Structured, deterministic, UI-independent (`firmwareDiagnostics.js`, zero React/Document import).

## Executor contract

`new FirmwareExecutor(ir, runtimePort)` where `runtimePort` is any object exposing `digitalWrite(pin, level)` — both a fake test double and the real `ArduinoSimulator` were used and pass identically. API: `start()`, `runLoopOnce()`, `reset()`.

## setup semantics

`start()` executes `ir.setup` exactly once per start/reset cycle. A second `start()` call without an intervening `reset()` is a no-op (verified E2). `reset()` clears `_setupExecuted` and local `_pinModes`, allowing `setup()` to run again on the next `start()` (verified E9) — never touches `component.firmware.source` or any global `ArduinoSimulator` state beyond future `digitalWrite()` calls.

## loop semantics

`runLoopOnce()` executes `ir.loop` exactly once per call — no internal loop, no timer, no `requestAnimationFrame`/`setInterval`/`setTimeout` (verified E3, and structurally by `firmwareArchitecture.test.js`'s absence of `scheduler.js`/`runtimeOrchestrator.js` imports).

## pinMode semantics

`PIN_MODE` instructions record `pin → "OUTPUT"` in a local `Map`, scoped to the executor instance, cleared on `reset()`. V1 supports `OUTPUT` only — `pinMode(2, INPUT)` is rejected at **compile time** (`UNSUPPORTED_MODE`), never reaches the executor.

## digitalWrite semantics

`DIGITAL_WRITE` instructions translate the IR's symbolic `"HIGH"`/`"LOW"` to `Signal.HIGH`/`Signal.LOW` (reusing the existing vocabulary, `signals.js` — no second vocabulary invented) and call `runtimePort.digitalWrite(pin, signal)` — never a reimplementation of `ArduinoSimulator.digitalWrite()`. A `digitalWrite` on a pin never configured `OUTPUT` throws a deterministic `FirmwareExecutionError` (verified E8) — never a silent no-op.

## Invalid-source atomicity

Any single unsupported instruction anywhere in `setup`/`loop` makes the **entire** compilation fail (`ok: false`) with **no** `ir` field at all — never a partial IR alongside diagnostics. Verified both with a fake runtime (compiler-level test T35) and the real `ArduinoSimulator` (integration-level test T35: `runtime.tick(0).size === 0` after a failed compile, proving zero partial GPIO writes ever reached the real runtime).

## Compiler tests

`firmwareCompiler.test.js` — **21/21 PASS**: C1-C16 (default compile, setup+loop, PIN_MODE D2/D3, DIGITAL_WRITE HIGH/LOW, instruction order, missing setup/loop, unsupported pin/mode/level, Serial.begin, delay, malformed braces, unknown statement), plus `analogWrite`/`digitalRead`/`analogRead` explicitly out-of-scope, comment stripping, and IR immutability.

## Executor tests

`firmwareExecutor.test.js` — **15/15 PASS**: E1-E12 (start-once semantics, idempotent start, runLoopOnce per-call execution, PIN_MODE recording, digitalWrite HIGH/LOW reaching the runtime port with `Signal.HIGH`/`Signal.LOW`, D3 mapping, digitalWrite-without-OUTPUT deterministic failure, reset allowing setup to rerun, reset forgetting pin modes, IR non-mutation, no Document/History coupling), plus instruction-order (§33) and setup-then-loop sequencing (§34).

## Real ArduinoSimulator integration

`firmwareExecution.integration.test.js` — **5/5 PASS**: reference program 1 (D2 HIGH after setup+one loop iteration), reference program 2 (D3 LOW after setup, D3 HIGH after one loop iteration), instruction order on the real runtime, and T35 atomicity with the real `ArduinoSimulator` (`signalMap.get("D2") === Signal.HIGH` for the valid program; `runtime.tick(0).size === 0` for the invalid one — the runtime is never touched when compilation fails).

## Architecture guards

`firmwareArchitecture.test.js` — **5/5 PASS**: `firmwareCompiler.js` imports zero `simulator/*`/React/`core/*`/History/`useCircuitState`, contains zero `eval`/`new Function`/whole-statement literal comparison; `firmwareExecutor.js` imports zero React/`core/*`/History/`useCircuitState`/`scheduler.js`/`runtimeOrchestrator.js`/`simulationRuntimeIntegration.js`, and its only `simulator/*` import is `signals.js`; `boardPinMap.js`/`firmwareDiagnostics.js` are confirmed pure data modules.

## Existing Arduino/runtime regression tests

`cf1DocumentArchitecture.test.js` (14/14), `runtimeArchitecture.test.js` (13/13, unchanged — confirms Runtime independence untouched by this ticket), `useCircuitStateArduinoBridge.test.jsx` (6/6), `ArduinoPart.raster.test.jsx` (14/14), `pwmSignal.test.js` (36/36), `pwmRuntime.test.js` (26/26), `ArduinoFirmwareDocument.integration.test.jsx` (8/8, MB-L1-ARD-001), `UpdateArduinoFirmwareHandler.test.js` (10/10, MB-L1-ARD-001) — **127/127 combined, zero regression**.

## Full canonical suite

```
npm --prefix frontend run test:ci
Test Files  12 failed | 198 passed (210)
     Tests  50 failed | 2781 passed (2831)
```

Identical to the locked baseline (50 FAIL / 12 files, same file names, same counts). Tests grew from 2782 to 2831 (49 new tests), files from 205 to 210 (5 new test files). **Zero new regression.**

## Build

```
npm --prefix frontend run build
✓ built in 1.41s
```
PASS. Bundle hash unchanged from the previous ticket's build — confirms the new `frontend/src/arduino/firmware/` module tree is not yet imported by the live application bundle (expected: no UI/React wiring in this ticket).

## Typecheck

```
cd frontend && npx tsc -b
```
PASS (no output, exit 0).

## git diff --check

PASS (no output — clean).

## Baseline comparison

| | Files failed | Tests failed | Tests passed | Tests total |
|---|---|---|---|---|
| Before (MB-L1-ARD-001 baseline) | 12 | 50 | 2732 | 2782 |
| After (this ticket) | 12 | 50 | 2781 | 2831 |

Same 12 file names, same 50-failure breakdown. `after_failures (50) <= baseline_failures (50)`, and specifically `0` new failures.

## Known limitations

None within scope. As explicitly designed: no `delay()`, no Scheduler connection, no continuous loop, no UI, no browser Blink — all reserved for `MB-L1-ARD-003`/`004`/`005`. The Firmware Execution Core is pure and testable but not yet wired into the live application or any time-progression mechanism.

## AC-01 → AC-30

| AC | Status |
|---|---|
| AC-01 Compiler pur existe | PASS |
| AC-02 ExecutableFirmware/IR existe | PASS |
| AC-03 setup et loop séparés | PASS |
| AC-04 pinMode OUTPUT supporté | PASS — C3/C4 |
| AC-05 digitalWrite HIGH supporté | PASS — C5, E5 |
| AC-06 digitalWrite LOW supporté | PASS — C6, E6 |
| AC-07 pin 2 → D2 | PASS |
| AC-08 pin 3 → D3 | PASS — E7 |
| AC-09 mapping centralisé | PASS — boardPinMap.js unique |
| AC-10 setup exécuté exactement une fois | PASS — E1/E2 |
| AC-11 runLoopOnce exécute exactement une loop | PASS — E3 |
| AC-12 ordre des instructions conservé | PASS — C7, §33 |
| AC-13 digitalWrite appelle le runtime existant | PASS — intégration réelle |
| AC-14 Signal.HIGH/LOW réutilisés | PASS |
| AC-15 pin non OUTPUT rejetée à l'exécution | PASS — E8 |
| AC-16 pin non supportée rejetée | PASS — C10 |
| AC-17 statement inconnu rejeté | PASS — C16 |
| AC-18 delay explicitement non supporté | PASS — C14 |
| AC-19 Serial explicitement non supporté | PASS — C13 |
| AC-20 source invalide sans sortie partielle | PASS — T35 (fake + réel) |
| AC-21 compiler ignore Simulation | PASS — firmwareArchitecture.test.js |
| AC-22 executor ignore Document | PASS — E11, firmwareArchitecture.test.js |
| AC-23 aucun Scheduler dans Firmware Core | PASS — firmwareArchitecture.test.js |
| AC-24 aucune History pollution | PASS — E12 |
| AC-25 aucune mutation firmware source | PASS |
| AC-26 aucun UI ajouté | PASS |
| AC-27 aucun Code Workspace ajouté | PASS |
| AC-28 aucun timer système | PASS |
| AC-29 real ArduinoSimulator integration PASS | PASS — 5/5 |
| AC-30 baseline sans nouvelle régression | PASS |

## Gates summary

GATE 1 exact base SHA PASS · GATE 2 exact branch PASS · GATE 3 scope audit PASS · GATE 4 board mapping tests PASS · GATE 5 compiler tests PASS · GATE 6 executor tests PASS · GATE 7 real ArduinoSimulator integration PASS · GATE 8 architecture guards PASS · GATE 9 existing Arduino tests PASS · GATE 10 runtimeArchitecture tests PASS · GATE 11 full canonical suite NO NEW REGRESSION · GATE 12 build PASS · GATE 13 typecheck PASS · GATE 14 git diff --check PASS · GATE 15 no Document regression PASS · GATE 16 no History pollution PASS · GATE 17 no Scheduler modification PASS · GATE 18 no UI scope drift PASS · GATE 19 only expected/justified files changed PASS (zero tracked files modified).

**All 19 gates PASS.**

## Commit / Push

See `[CLAUDE — MB-L1-ARD-002 — RAPPORT FINAL]` chat message for the final commit SHA, push confirmation, `git status` and ahead/behind verification.
