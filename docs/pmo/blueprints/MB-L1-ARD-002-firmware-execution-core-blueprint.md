# Blueprint — MB-L1-ARD-002 : Firmware Execution Core V1

## Contexte

`MB-L1-ARD-001` a fermé la Sous-capacité A (Firmware Document Contract) : `component.firmware.source` est persistant, historisé, exportable — mais jamais interprété. Ce ticket ferme la **Sous-capacité B — Firmware Execution Core** : donner un sens exécutable au source, de façon pure et testable, sans encore de progression temporelle (`MB-L1-ARD-003`), d'éditeur (`MB-L1-ARD-004`), ni de preuve Blink navigateur (`MB-L1-ARD-005`).

## Architecture implémentée

```text
firmware.source (string)
      ↓
compileFirmware(source)          — frontend/src/arduino/firmware/firmwareCompiler.js
      ↓ { ok:true, ir } | { ok:false, diagnostics }
FirmwareExecutor(ir, runtimePort) — frontend/src/arduino/firmware/firmwareExecutor.js
      ↓ start() / runLoopOnce() / reset()
runtimePort.digitalWrite(pin, Signal.HIGH|LOW)
      ↓
ArduinoSimulator (inchangé — satisfait déjà l'interface RuntimePort)
```

`frontend/src/arduino/firmware/boardPinMap.js` (source de vérité unique pin numérique → pin canonique) et `firmwareDiagnostics.js` (vocabulaire de diagnostics structuré) sont des modules de données purs, consultés uniquement par le compiler.

## Séparation des responsabilités (§7/§21/§22/§24 du ticket)

- **`firmwareCompiler.js`** — pur : `source: string → { ok, ir | diagnostics }`. Aucun import `simulator/*`, React, Document, History, CommandBus. Aucune interprétation directe (pas d'`eval`, pas de `new Function`, pas de comparaison littérale du texte entier d'une instruction) — chaque instruction est reconnue par un motif structurel (nom de fonction + arguments).
- **`firmwareExecutor.js`** — consomme uniquement l'IR et un `RuntimePort` injecté (`digitalWrite(pin, level)`). Le seul import `simulator/*` autorisé est `signals.js` (vocabulaire `Signal.HIGH`/`Signal.LOW` pur, jamais le solveur) — verrouillé structurellement. N'importe ni `scheduler.js` ni `runtimeOrchestrator.js` : ce ticket construit la sémantique du programme, pas sa progression temporelle.
- **`ArduinoSimulator.js`** — **non modifié**. Son API existante (`digitalWrite(pin, level)`, `start()`, `tick()`) satisfait déjà intégralement l'interface RuntimePort attendue — confirmé par le test d'intégration réel (§32).

## Contrat IR (ExecutableFirmware)

```js
{
  setup: [ { op: "PIN_MODE", pin: "D2", mode: "OUTPUT" } ],
  loop:  [ { op: "DIGITAL_WRITE", pin: "D2", value: "HIGH" } ],
}
```

`Object.freeze()` appliqué récursivement (structure + chaque instruction) — toute tentative de mutation lève (modules ESM en mode strict) ou échoue silencieusement, satisfaisant ARD-09 ("immutable or treated as immutable").

## Subset Arduino V1 supporté

```cpp
void setup() { }
void loop() { }
pinMode(2|3, OUTPUT);
digitalWrite(2|3, HIGH|LOW);
```

Tout le reste (`delay()`, `Serial.*`, `analogWrite()`, `digitalRead()`, `analogRead()`, pins ≠ {2,3}, modes ≠ OUTPUT, niveaux ≠ HIGH/LOW, `setup()`/`loop()` manquant ou dupliqué, accolades non équilibrées) produit un diagnostic explicite et déterministe — jamais une implémentation silencieuse, jamais un crash non contrôlé.

## Sémantique setup/loop/reset

- `start()` exécute `setup` **exactement une fois** par cycle — idempotent (un second `start()` sans `reset()` intermédiaire ne réexécute jamais `setup`).
- `runLoopOnce()` exécute **exactement une itération** du corps `loop` — aucune boucle interne, aucun timer, aucun `requestAnimationFrame`/`setInterval`/`setTimeout`.
- `reset()` efface l'état d'exécution LOCAL (`setupExecuted`, `pinModes`) — ne touche jamais `component.firmware.source` (Document) ni l'état global d'un `ArduinoSimulator` réel au-delà des futurs appels `digitalWrite()`.
- `digitalWrite` sur un pin jamais configuré `OUTPUT` lève une `FirmwareExecutionError` déterministe — jamais un échec silencieux.

## Atomicité du source invalide

Un source dont AU MOINS une instruction est hors subset ne produit AUCUNE IR (même partielle) : `compileFirmware()` retourne `{ ok:false, diagnostics }` sans jamais exposer `ir`. Aucun appelant ne peut donc construire un `FirmwareExecutor` à partir d'un résultat de compilation invalide, et aucun `digitalWrite()` partiel n'atteint jamais un `ArduinoSimulator` réel (vérifié : T35, avec le vrai runtime).

## Non-scope respecté

`delay()`, `millis()`/`micros()`, Scheduler, `RuntimeOrchestrator`, boucle continue, éditeur de code, intégration React/Start Simulation, Blink navigateur, `analogRead()`/`digitalRead()`, Serial/I2C/SPI, interruptions, émulateur AVR, bibliothèques Arduino, préprocesseur C++ complet — **aucun** de ces éléments n'est implémenté par ce ticket.

## Validation

- Board pin map : `boardPinMap.test.js` (3/3 PASS).
- Compiler : `firmwareCompiler.test.js` (21/21 PASS, couvre C1-C16 + cas additionnels §19 + atomicité T35 + immutabilité IR).
- Executor : `firmwareExecutor.test.js` (15/15 PASS, couvre E1-E12 + ordre §33 + setup/loop §34).
- Intégration réelle `ArduinoSimulator` : `firmwareExecution.integration.test.js` (5/5 PASS — programmes de référence §6, ordre §33, atomicité T35 avec runtime réel).
- Architecture : `firmwareArchitecture.test.js` (5/5 PASS — verrous §21/§22/§24/§25).
- Suite complète : baseline 50 FAIL / 2781 PASS (12 fichiers) strictement préservée.
- Build, typecheck, `git diff --check` : PASS.
- `git status` : **zéro fichier tracké modifié** — seul le nouveau répertoire `frontend/src/arduino/firmware/` a été ajouté. Aucune adaptation d'`ArduinoSimulator.js` n'a été nécessaire (§39, alternative non requise).
