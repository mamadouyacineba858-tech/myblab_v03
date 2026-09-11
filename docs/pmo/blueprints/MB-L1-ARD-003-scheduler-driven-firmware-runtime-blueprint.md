# Blueprint — MB-L1-ARD-003 : Scheduler-Driven Firmware Runtime

## Contexte

`MB-L1-ARD-002` a fermé la Sous-capacité B (Firmware Execution Core) : `setup()`/`loop()`/`pinMode()`/`digitalWrite()` s'exécutent de façon pure et synchrone, une itération à la fois, sans notion de temps. Ce ticket ferme la **Sous-capacité C — Scheduler Driven Runtime** : `delay()` devient compilable, et l'exécution devient suspendable/reprenable, pilotée exclusivement par le Scheduler MYBlab existant (`scheduler.js`, MB-SIM-009, inchangé).

## Architecture implémentée

```text
Scheduler (inchangé)
   ↓ getCurrentTime() / advance(dt) / reset()
FirmwareRuntimeController (nouveau — frontend/src/arduino/firmware/firmwareRuntimeController.js)
   ↓ start() / advance(dt) / stop() / reset()
FirmwareExecutor.resume(currentTimeMs) (étendu — nouvelle API temporelle, additive)
   ↓
ArduinoSimulator.digitalWrite(pin, Signal.HIGH|LOW) (inchangé)
```

`scheduler.js` reste **totalement inchangé** — générique, Arduino-agnostic, sans callbacks ni file d'événements (vérifié structurellement). Le firmware **consomme** le temps du Scheduler ; l'inverse n'existe pas.

## Deux API coexistantes sur FirmwareExecutor (décision d'implémentation, §8)

1. **API ARD-002 (`start()`/`runLoopOnce()`/`reset()`)** — **comportement strictement inchangé**, les 15 tests E1-E12 (+ ordre/setup-loop) passent sans une seule modification. Ces méthodes ne gèrent jamais `DELAY`.
2. **API ARD-003 (`resume(currentTimeMs)`)** — nouvelle, seule consommée par `FirmwareRuntimeController`. Suspend l'exécution sur un `DELAY` et reprend exactement à l'instruction suivante lors d'un futur `resume()` dont `currentTimeMs >= waitingUntil`. Une fois `setup` terminée sans suspension, enchaîne immédiatement sur `loop` dans le même appel.

Les deux API partagent `_pinModes` (même état matériel) mais possèdent chacune leur propre suivi de progression — aucun test ne mélange les deux sur la même instance.

## Sémantique du delay

`delay(500)` compile en `{ op: "DELAY", durationMs: 500 }` (§5). À l'exécution : `resumeAt = currentTimeAtDelay + durationMs` ; le programme reprend **exactement à l'instruction suivante**, jamais depuis le début de `loop()` (§6, vérifié T3/T7).

## Protection contre la boucle JS synchrone infinie (§12)

Un `loop()` sans aucun `delay()` (ex. `digitalWrite(2, HIGH);`) ne doit jamais bloquer JavaScript. Règle implémentée : **au plus une itération complète non retardée de `loop()` par appel à `resume()`** — dès qu'une itération se termine sans avoir rencontré de délai, une seconde itération n'est PAS démarrée dans le même appel (elle attend le prochain `resume()`). Ce comportement est équivalent, pour ce cas précis, à `runLoopOnce()` (ARD-002) : un appel = une itération. Vérifié par test (§12, boucle sans délai) et par construction (`_runLoopBounded`, compteur `freshIterationsStarted`).

## Déterminisme en grand dt (§13)

Sauter directement d'un grand intervalle (ex. `advance(1000)` depuis `t=0` avec un `delay(500)` en attente) reprend l'instruction suspendue **au temps de reprise réel** (ex. `t=1000`), jamais à un instant intermédiaire artificiellement inventé (`t=500`). Une échéance de délai suivante est calculée depuis ce même temps de reprise réel — jamais un tick de 1 ms n'est simulé. Vérifié explicitement (test T13, avec assertion sur la nouvelle échéance calculée).

## FirmwareRuntimeController — contrat

```js
new FirmwareRuntimeController({ scheduler, executor })
```

- `scheduler` optionnel (composabilité, §15/§16 — le futur `MB-L1-ARD-004/005` pourra injecter le même Scheduler que `RuntimeOrchestrator`) ; à défaut, un Scheduler indépendant est créé (`createScheduler()`, appelé une seule fois, vérifié structurellement).
- `executor` obligatoire (déjà construit avec l'IR compilée et le RuntimePort réel/fake).
- `start()` : réinitialise l'executor, exécute `setup`(+premier passage de `loop` si non suspendu) au temps COURANT du Scheduler — **n'avance jamais le Scheduler lui-même** (§17).
- `advance(dt)` : avance le Scheduler de `dt`, puis reprend l'exécution firmware si `running` (§18).
- `stop()` : suspend le firmware — un `advance()` ultérieur continue de faire progresser le Scheduler (axe du temps cohérent) mais ne produit plus aucun GPIO firmware (§19).
- `reset()` : réinitialise le Scheduler (temps → 0) ET l'executor — ne touche jamais Document/History/wires/composants (§20).

## Non-scope respecté

`millis()`/`micros()`, variables, `if`/`for`/`while`, fonctions utilisateur, `analogWrite()` (toujours hors scope, §25), Code Workspace/éditeur, intégration React/Start Simulation, redesign du Scheduler/RuntimeOrchestrator — **aucun** de ces éléments n'est implémenté par ce ticket.

## Validation

- Compiler (delay) : `firmwareCompiler.test.js` étendu — 28/28 PASS (C1-C16 + D1-D7 + cas additionnels, C14 amendé pour refléter le nouveau comportement autorisé).
- Executor temporel : `firmwareExecutor.test.js` étendu — 31/31 PASS (E1-E12 ARD-002 inchangés + T1-T15 + protection §12).
- Controller : `firmwareRuntimeController.test.js` — 8/8 PASS.
- Blink Core réel (ArduinoSimulator + Scheduler réels, sans React) : `firmwareBlink.integration.test.js` — 3/3 PASS, séquence exacte 0/499/500/999/1000/1500 reproduite.
- Architecture temporelle : `firmwareTemporalArchitecture.test.js` — 10/10 PASS (scheduler.js Arduino-agnostic, aucune horloge système dans compiler/executor/controller, Scheduler unique injectable, Document/History non affectés).
- Suite complète : baseline 50 FAIL / 2825 PASS (12 fichiers) strictement préservée.
- Build, typecheck, `git diff --check` : PASS.
- `git status` : uniquement les fichiers `frontend/src/arduino/firmware/**` modifiés/ajoutés — `scheduler.js`, `clock.js`, `runtimeOrchestrator.js`, `simulationRuntimeIntegration.js`, `resolution.js`, `useCircuitState.js` tous inchangés (aucun STOP nécessaire).
