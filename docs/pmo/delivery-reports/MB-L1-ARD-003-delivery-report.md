# Delivery Report — MB-L1-ARD-003 : Scheduler-Driven Firmware Runtime

**Base SHA:** `f9505ffa506d8b2796e7e18bed241f740672bd2b` (verified via `git checkout --detach` before branching)
**Branch:** `feat/MB-L1-ARD-003-scheduler-driven-firmware-runtime`
**Final SHA:** see commit confirmation at the end of this report

## Audit réel (avant implémentation)

- `scheduler.js` (MB-SIM-009): `getCurrentTime()`, `advance(dt)`, `reset()` — confirmed generic, Arduino-agnostic, callback-free, delegates all time validation to `clock.js`. Zero modification needed or made.
- `clock.js`: `advance(dt)` throws `InvalidTimeDeltaError` on invalid delta (negative/NaN/Infinity), leaves state unchanged on failure — confirmed safe to delegate to unconditionally.
- `runtimeOrchestrator.js`: confirmed established idiom `constructor({ scheduler, runtime } = {})` with optional injection, default-construct fallback — `FirmwareRuntimeController` mirrors this exact pattern for consistency and future composability (§15/§16), without importing or modifying `RuntimeOrchestrator` itself.

## Temporal architecture

```text
Scheduler (unchanged)
   ↓ getCurrentTime() / advance(dt) / reset()
FirmwareRuntimeController (new)
   ↓ start() / advance(dt) / stop() / reset()
FirmwareExecutor.resume(currentTimeMs) (extended, additive)
   ↓
ArduinoSimulator.digitalWrite(pin, Signal.HIGH|LOW) (unchanged)
```

`scheduler.js` remains **completely unmodified** — structurally verified to contain zero reference to `arduino`/`firmware` (case-insensitive).

## Delay IR

`delay(<finite numeric literal >= 0>)` compiles to `{ op: "DELAY", durationMs: <number> }`. Strict arity/type: exactly one argument, a numeric literal (never a variable, never zero or 2+ arguments) — anything else produces `INVALID_DELAY_DURATION`.

## Compiler changes

`firmwareCompiler.js`: added a `delay(...)` recognition branch (before the generic `UNSUPPORTED_STATEMENT` catch-all), validating arity and numeric-literal format via regex, never `eval`/`new Function`. `analogWrite()`/`Serial.*`/etc. remain rejected exactly as in ARD-002 (unchanged catch-all).

## Executor changes

`firmwareExecutor.js` gained a second, additive API (`resume(currentTimeMs)`, `_runBody`, `_runLoopBounded`) alongside the **untouched** ARD-002 API (`start()`, `runLoopOnce()`, `reset()` — behavior byte-for-byte identical, all 15 original E1-E12 tests pass unmodified). Both APIs share `_pinModes` (same underlying hardware state) but track progression independently (`_setupExecuted` for the legacy API; `_setupCompleted`/`_pc`/`_waitingUntil` for the temporal API) — no test exercises both APIs on the same instance.

## FirmwareRuntimeController contract

```js
new FirmwareRuntimeController({ scheduler, executor })
```

`scheduler` optional (defaults to an independent `createScheduler()`, called exactly once — verified structurally); `executor` required. Methods: `start()`, `advance(dt)`, `stop()`, `reset()`, `getScheduler()`, `getCurrentTime()`, `isRunning()`.

## Diagnostics contract

Added `DiagnosticCode.INVALID_DELAY_DURATION` alongside the 7 existing ARD-002 codes — same structure `{ code, message, line }`.

## setup suspension

`resume(currentTimeMs)` executes `setup` from `_pc`, respecting any armed `_waitingUntil`. A `DELAY` mid-setup advances `_pc` past itself and arms `_waitingUntil = currentTimeMs + durationMs`, then returns (suspended) — verified T2 (no premature resume before deadline) and the §9 setup-with-delay scenario (D2 stays HIGH while waiting, LOW exactly at t=100, setup completes).

## loop suspension

Once `setup` completes without a pending wait, execution continues immediately into `loop` in the same call (no separate trigger required from the caller) — verified T4 (`resume(0)` alone produces the first `HIGH`). A `DELAY` mid-loop suspends identically to setup; `loop` wraps `_pc` back to `0` at its natural end but is bounded to **at most one fresh un-delayed iteration per `resume()` call** (see "infinite-loop protection" below).

## resume semantics

Resuming exactly at the deadline (`currentTimeMs === _waitingUntil`) is treated as "deadline reached" (not "still waiting") — verified T6/T7 (`advance(1)` landing exactly on `t=500`/`t=1000` produces the expected transition). Resumption always continues from the instruction *after* the `DELAY`, never re-executing the `delay()` call itself or restarting the body from the top (verified T3, §33 order preservation).

## stop semantics

`FirmwareRuntimeController.stop()` sets an internal `_running = false`; `advance(dt)` still advances the Scheduler (time axis stays coherent and composable with a future shared-Scheduler consumer) but skips calling `executor.resume()` entirely — zero new GPIO writes occur after `stop()`, verified by asserting `runtime.digitalWrite`'s call count is unchanged across two subsequent `advance()` calls.

## reset semantics

`FirmwareRuntimeController.reset()` calls `scheduler.reset()` (time → 0) then `executor.reset()` (clears `_setupExecuted`, `_pinModes`, `_setupCompleted`, `_pc`, `_waitingUntil`) and sets `_running = false`. Never touches `component.firmware.source`, History, wires, or components — the controller and executor import neither Document nor History domains (verified structurally).

## large-dt semantics

Jumping directly by a large `dt` (e.g. `advance(1000)` from `t=0` with a pending `delay(500)`) resumes the suspended instruction at the **actual** resume time (`t=1000`), never at an artificially interpolated intermediate tick (`t=500`) — the next `delay()`'s deadline is computed from this real resume time (`1000 + 500 = 1500`), not from when the delay would "ideally" have been evaluated. Verified explicitly (T13): after `advance(1000)`, exactly one new `digitalWrite` call occurs (`LOW`), and the following deadline is confirmed to be `1500` (still `LOW` at `t=1499`, `HIGH` at `t=1500`) — never a per-millisecond simulation.

## infinite-loop protection

A `loop()` containing zero `delay()` calls (e.g. `void loop() { digitalWrite(2, HIGH); }`) must never block JavaScript by looping synchronously forever within one `resume()` call. Implemented rule (CSA-recommended, §12): **at most one complete un-delayed loop iteration per `resume()`/`advance()` call** — tracked via a `freshIterationsStarted` counter in `_runLoopBounded()`, incremented only when a fresh iteration is about to begin at `_pc === 0`; a second fresh iteration attempt in the same call returns immediately instead of executing. This exactly reproduces ARD-002's `runLoopOnce()` semantics for the no-delay case (one call = one iteration) — verified by a dedicated test (three consecutive `resume()` calls on a no-delay loop produce exactly one new `digitalWrite` call each).

## Files created

- `frontend/src/arduino/firmware/firmwareRuntimeController.js`
- `frontend/src/arduino/firmware/__tests__/firmwareRuntimeController.test.js`
- `frontend/src/arduino/firmware/__tests__/firmwareBlink.integration.test.js`
- `frontend/src/arduino/firmware/__tests__/firmwareTemporalArchitecture.test.js`
- `docs/pmo/blueprints/MB-L1-ARD-003-scheduler-driven-firmware-runtime-blueprint.md`
- `docs/pmo/tickets/MB-L1-ARD-003.md`
- `docs/pmo/delivery-reports/MB-L1-ARD-003-delivery-report.md` (this file)

## Files modified

- `frontend/src/arduino/firmware/firmwareCompiler.js` (delay recognition)
- `frontend/src/arduino/firmware/firmwareDiagnostics.js` (`INVALID_DELAY_DURATION` code)
- `frontend/src/arduino/firmware/firmwareExecutor.js` (additive `resume()` API)
- `frontend/src/arduino/firmware/__tests__/firmwareCompiler.test.js` (C14 amended — explicitly mandated by this ticket's §5/§21; D1-D7 added)
- `frontend/src/arduino/firmware/__tests__/firmwareExecutor.test.js` (T1-T15 + infinite-loop-protection test added; zero existing assertion changed)

`scheduler.js`, `clock.js`, `runtimeOrchestrator.js`, `simulationRuntimeIntegration.js`, `resolution.js`, `useCircuitState.js`, `UpdateArduinoFirmwareHandler.js`, `ArduinoSimulator.js` — **all untouched**, confirmed by `git status` and by the structural architecture tests.

## Compiler tests

`firmwareCompiler.test.js` — **28/28 PASS**: all ARD-002 C1-C16 preserved (C14 amended per this ticket's explicit mandate), plus D1-D7 (delay compiles / delay(0) valid / negative rejected / missing-arg rejected / variable rejected / multi-arg rejected / instruction order preserved), plus existing analogWrite/digitalRead/analogRead-out-of-scope and IR-immutability checks reconfirmed.

## Executor temporal tests

`firmwareExecutor.test.js` — **31/31 PASS**: 15 original ARD-002 tests (E1-E12 + order/setup-loop) unchanged and passing, plus T1-T15 (setup/loop suspension, exact-deadline resumption, instruction-order preservation, reset-restarts-setup, digitalWrite-without-OUTPUT still deterministic under the temporal API, determinism across independent instances, large-dt semantics, zero `Date.now()` access, IR non-mutation) plus the infinite-loop-protection test (§12).

## Controller tests

`firmwareRuntimeController.test.js` — **8/8 PASS**: injected vs. default Scheduler, `start()` without advancing the Scheduler, `advance()` advancing both Scheduler and firmware, `stop()` blocking new GPIO while the Scheduler keeps advancing, `reset()` restoring a clean start, and the full Blink sequence via the controller's own API.

## Real Scheduler integration

Exercised directly by `firmwareBlink.integration.test.js` (below) and by `firmwareRuntimeController.test.js`'s use of a real, unmocked `Scheduler` instance for the injected-scheduler test.

## Real ArduinoSimulator integration

`firmwareBlink.integration.test.js` uses a real `ArduinoSimulator` (not a fake runtime) throughout — `runtime.tick(t).get("D2")` is read directly, never a hand-constructed signal map.

## Blink Core proof

`firmwareBlink.integration.test.js` — **3/3 PASS**, using the **real** `ArduinoSimulator` and the **real** `Scheduler` (no React, no fakes): the exact sequence mandated by §28 —

```
start / t=0   → HIGH
advance(499)  → HIGH
advance(1)    → LOW   (t=500)
advance(499)  → LOW
advance(1)    → HIGH  (t=1000)
advance(500)  → LOW   (t=1500)
```

— reproduced precisely, plus a `stop()`→`reset()`→`start()` cycle reproducing the identical sequence from the beginning.

## Architecture guards

`firmwareTemporalArchitecture.test.js` — **10/10 PASS**: `scheduler.js` contains zero reference to `arduino`/`firmware` (case-insensitive); `firmwareCompiler.js`/`firmwareExecutor.js` import neither `scheduler.js`/`clock.js`/`runtimeOrchestrator.js` nor any wall-clock/timer API; `firmwareRuntimeController.js` imports `scheduler.js` (the sole legitimate consumer for this domain) but neither React/`core/*`/History/`useCircuitState` nor `runtimeOrchestrator.js`/`simulationRuntimeIntegration.js`/`resolution.js` (no premature merge with the existing Simulation bridge); `createScheduler()` appears exactly once (no hidden second Scheduler); none of the three files reference `UpdateArduinoFirmwareHandler`/`CommandBus`/`circuitModel.js` (Document/History genuinely unaffected).

`firmwareArchitecture.test.js` (ARD-002) — **5/5 PASS**, reconfirmed unchanged.

## ARD-002 regression

All 15 original executor tests (E1-E12 + order/setup-loop) and all 16 original compiler tests (C1-C13, C15, C16 — C14 explicitly amended) pass with zero behavioral change beyond the mandated `delay()` recognition. `firmwareExecution.integration.test.js` (ARD-002's own real-`ArduinoSimulator` integration, 5 tests) also reconfirmed passing unchanged.

## Full canonical suite

```
npm --prefix frontend run test:ci
Test Files  12 failed | 201 passed (213)
     Tests  50 failed | 2825 passed (2875)
```

Identical to the locked baseline (50 FAIL / 12 files, same file names, same counts). Tests grew from 2831 to 2875 (44 new tests), files from 210 to 213 (3 new test files). **Zero new regression.**

## Build

```
npm --prefix frontend run build
✓ built in 1.58s
```
PASS. Bundle hash unchanged — confirms the firmware module tree remains unwired to the live application (no UI/React integration in this ticket, as required).

## Typecheck

```
cd frontend && npx tsc -b
```
PASS (no output, exit 0).

## git diff --check

PASS (only CRLF/LF advisory warnings, no errors).

## AC-01 → AC-28

| AC | Status |
|---|---|
| AC-01 delay compile | PASS — D1 |
| AC-02 delay devient IR, pas timer | PASS — structural guard |
| AC-03 Scheduler unique source temps | PASS |
| AC-04 aucune horloge système | PASS — firmwareTemporalArchitecture.test.js |
| AC-05 Firmware peut suspendre setup | PASS — T2 |
| AC-06 Firmware peut reprendre setup | PASS — T3 |
| AC-07 Firmware peut suspendre loop | PASS — T5 |
| AC-08 reprise à instruction suivante | PASS — T3/§33 |
| AC-09 instruction order préservé | PASS — D7, §33 |
| AC-10 loop redémarre proprement | PASS — T8 |
| AC-11 Blink temporel correct | PASS — T9, Blink Core |
| AC-12 D2 réel alterne HIGH/LOW | PASS — Blink Core (real ArduinoSimulator) |
| AC-13 ArduinoSimulator réel utilisé | PASS |
| AC-14 Scheduler réel utilisé | PASS |
| AC-15 reset remet temps à zéro | PASS |
| AC-16 reset permet nouveau setup | PASS — T10 |
| AC-17 stop bloque nouvelle exécution | PASS |
| AC-18 grand dt déterministe | PASS — T13 |
| AC-19 pas de boucle JS infinie | PASS — §12 test |
| AC-20 borne d'instructions/cycles documentée | PASS — "one fresh iteration per call" |
| AC-21 aucun Document change | PASS |
| AC-22 aucune History pollution | PASS |
| AC-23 aucun UI change | PASS |
| AC-24 aucun React timer | PASS |
| AC-25 aucun Scheduler Arduino-specific | PASS |
| AC-26 ARD-002 tests restent PASS | PASS — 15/15 + 16/16 (C14 amended) |
| AC-27 runtimeArchitecture reste PASS | PASS — 13/13 unchanged |
| AC-28 full suite zéro nouvelle régression | PASS |

## Known limitations

None within scope. Deliberately deferred to future tickets: `millis()`/`micros()`, PWM firmware (`analogWrite()`), variables/control-flow, React/UI wiring, Code Workspace, Blink browser proof (`MB-L1-ARD-004`/`005`).

## Gates summary

GATE 1 exact SHA PASS · GATE 2 exact branch PASS · GATE 3 ARD-002 regression PASS · GATE 4 delay compiler PASS · GATE 5 temporal executor PASS · GATE 6 controller PASS · GATE 7 real Scheduler PASS · GATE 8 real ArduinoSimulator PASS · GATE 9 Blink Core PASS · GATE 10 architecture guards PASS · GATE 11 no wall-clock APIs PASS · GATE 12 no Document/History changes PASS · GATE 13 protected simulator files unchanged PASS · GATE 14 full suite no regression PASS · GATE 15 build PASS · GATE 16 typecheck PASS · GATE 17 git diff --check PASS.

**All 17 gates PASS.**

## Commit / Push

See `[CLAUDE — MB-L1-ARD-003 — RAPPORT FINAL]` chat message for the final commit SHA, push confirmation, `git status` and ahead/behind verification.
