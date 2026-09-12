# MB-L1-ARD-004 — Integrated Arduino Code Workspace

Base: `18dee98c6dd1acc7f28976e44258f1330138e5c0`
Branch: `feat/MB-L1-ARD-004-integrated-code-workspace`
Commit message: `feat(arduino): integrate code workspace`

## Delivered behavior

The laboratory Navbar exposes Code only for the active Arduino. Its integrated
side panel edits a local textarea draft, applies through the existing
`updateArduinoFirmware()` command, and compiles through `compileFirmware()`.
Typing does not mutate Document or History; Apply creates one History action,
while an unchanged source is a no-op. Selection changes load the new Arduino's
source; deselection/non-Arduino selection and Close dismiss the panel. The panel
uses only the stable circuit context. Compiler diagnostics include line, code,
and message; compilation success is displayed separately.

Global Start/Stop remains the only execution lifecycle. Start compiles the
current Document source into volatile sessions using each existing
orchestrator's Arduino runtime and shared Scheduler. Stop stops the controllers
and runtimes, then clears the two volatile containers. Restart creates a fresh
runtime at t=0 and executes setup again. Source changes replace the old session;
invalid compilation leaves the affected runtime stopped with no digital output
and exposes diagnostics through the stable context.

`simulationRuntimeIntegration.js` coordinates each runtime step: advance the
shared Scheduler once, resume all firmware, tick all Arduino runtimes at the
same current time, and resolve electrical signals. The additive controller API
`resumeAtCurrentTime()` does not advance time and respects Stop. Its existing
start/advance/stop/reset API remains compatible with ARD-003.

The hook schedules presentation frames with RAF. The callback accepts no browser
timestamp and uses the central `SIMULATION_STEP_MS = 16`; initial/document
recalculations use dt=0. Runtime mutations occur in an effect/callback, outside
React render. Firmware source is supplied separately from the electrical adapter
so no Document schema or solver change is needed. Circuits without Arduino still
return through the existing `runSimulation()` path.

## Authorized contract migrations

The four stale bridge tests now trigger recalculation within the same active
session instead of using Stop/Start as a refresh. Their electrical and
same-session persistence assertions remain. An explicit restart regression
asserts fresh runtime identity, Scheduler t=0, setup-derived D2 HIGH, no stale D3,
and unchanged Document/History.

LOCK-03 permits additional named imports while checking the required integration
import and call, and forbidding direct runtime-orchestrator/engine coupling.
LOCK-04 retains the bans on setInterval, setTimeout, Date.now and performance.now.
Its new guard inspects every RAF registration, requires a callback without a
timestamp parameter and a fixed-step solve, and forbids direct time advancement
in the presentation bridge. LOCK-06 is unchanged.

## Validation

- Bridge + architecture locks: 18/18 PASS (2 files).
- ARD-001/002/003, ARD-004, bridge/locks, Navbar/laboratory cohesion,
  measurement and ComponentInspector/value editing: 210/210 PASS (22 files).
- Runtime coverage includes two-Arduino single advance, common time, resume
  before tick, fixed-step HIGH/LOW/HIGH, Stop/restart and invalid source replacement.
- Workspace coverage includes availability/open/close, source loading, draft
  isolation, single-action Apply/no-op, compilation and selection switching.
- Full canonical suite: **2834 PASS / 50 FAIL / 2884 total**; 203 passing and
  12 historically failing files (215 total). Exactly the documented baseline
  failure counts in each of the 12 historical files; **zero new regression**.
  Command: `npm --prefix frontend run test:ci -- --reporter=default --reporter=json --outputFile=../ard004-full.json`.
- Build: PASS (`npm --prefix frontend run build`).
- Typecheck: PASS (`cd frontend; npx tsc -b`).
- Diff check: PASS (`git diff --check`).

Protected production files are unchanged: scheduler.js, clock.js,
runtimeOrchestrator.js, resolution.js, engine.js and preparation.js.
No architecture deviations from the amended CSA contract. No second compiler,
Scheduler, simulator, firmware Document model or Arduino Run button was added.

Browser circuit-to-LED qualification remains ARD-005; it is not claimed here.

## Historical failure comparison

Compared with `docs/reports/MB-VIS-QA-047-QUALIFICATION.md` and the
ARD-003 delivery baseline. No baseline exception was introduced.

| File | Baseline | ARD-004 |
|---|---:|---:|
| `AssemblyLeadsLayer.test.jsx` | 2 | 2 |
| `CapacitorPart.raster.test.jsx` | 6 | 6 |
| `LdrPart.raster.test.jsx` | 2 | 2 |
| `RealisticRenderers.test.jsx` | 3 | 3 |
| `RgbLedPart.raster.test.jsx` | 1 | 1 |
| `ThermistorPart.raster.test.jsx` | 8 | 8 |
| `assemblyGeometry.test.js` | 2 | 2 |
| `contactModel.test.js` | 1 | 1 |
| `partDimensionsCanonical.test.jsx` | 8 | 8 |
| `partDimensionsGuard.test.js` | 3 | 3 |
| `renderQualityGate.test.jsx` | 2 | 2 |
| `resolveComponentContactHoles.test.js` | 12 | 12 |
