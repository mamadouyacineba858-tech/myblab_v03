# Blueprint — MB-L1-ARD-001 : Arduino Firmware Document Contract

## Contexte

`P1-02 — Arduino Programming / Firmware Runtime` (Arduino Level-1) exige, à terme, qu'un utilisateur écrive un programme, l'exécute, et observe le circuit réagir (Blink réel). L'audit CSA établit que MYBlab possède déjà : le composant Arduino visuel, son câblage, `ArduinoSimulator` (digitalWrite/analogWrite/PWM), un `Scheduler`, un `RuntimeOrchestrator`, et le pont Runtime → Simulation (`simulationRuntimeIntegration.js`). Ce qui manque entièrement est la **source** : aucun sketch utilisateur n'est persisté, historisé, ni exportable.

Ce ticket ferme exclusivement la **Sous-capacité A — Firmware Document Contract** de la séquence A→E : persistance, mutation dédiée, Undo/Redo, export/import du firmware. Il ne construit ni parser, ni exécution (`setup()`/`loop()`/`delay()`), ni éditeur — ces responsabilités appartiennent à `MB-L1-ARD-002` à `MB-L1-ARD-005`.

## Architecture implémentée

```text
Document (component.firmware = { source: string })
      ↓
useCircuitState.js (composition — addComponent matérialise le default,
                     updateArduinoFirmware dispatch la mutation)
      ↓
CommandBus → UpdateArduinoFirmwareHandler → HistoryService → Document API
      ↓
component.firmware (persisté, historisé, exporté/importé)
```

`frontend/src/arduino/firmwareDefaults.js` est la source de vérité unique du contrat firmware V1 (`DEFAULT_FIRMWARE_SOURCE`, `hasFirmwareCapability`, `createDefaultFirmware`, `isValidFirmwareStructure`) — aucune connaissance de Simulation/Runtime, uniquement la FORME du firmware.

## Invariants ARD applicables à ce ticket

- **ARD-01/ARD-02** : `firmware.source` est persistant dans le Document ; tout état runtime (program counter, delay state, scheduler time, PWM phase) reste volatile et n'est jamais introduit par ce ticket.
- **ARD-03** : le firmware n'est jamais stocké dans `component.parameters` — champ `firmware` distinct, au même niveau que `parameters`.
- **ARD-04** : le firmware ne vit jamais uniquement dans `ArduinoSimulator.code` — il est désormais dans le Document, source de vérité unique.
- **ARD-05/ARD-06** : aucune mutation directe React du firmware — le seul chemin est `updateArduinoFirmware() → CommandBus → UpdateArduinoFirmwareHandler → HistoryService → Document API`.
- **ARD-07** : Undo/Redo fonctionnent sur le firmware (T8/T9/T10).
- **ARD-09** : `UpdateArduinoFirmwareHandler` manipule une représentation Document `{ source: string }` — pas encore de représentation exécutable dérivée (hors scope, `MB-L1-ARD-002`).
- **ARD-13/ARD-14/ARD-15/ARD-21** : aucune modification de `ArduinoSimulator.js`, `runtimeOrchestrator.js`, `simulationRuntimeIntegration.js`, `scheduler.js`, `resolution.js`, `pwmSignal.js`. Le Handler n'importe que `isValidFirmwareStructure` (validation de forme pure, `firmwareDefaults.js`) — jamais un module Simulator/Runtime (vérifié structurellement, TEST T20).
- **ARD-16** : hors scope de ce ticket (mapping pin Arduino → Document pin ID existe déjà via `componentDefinitions.js`/`canonicalRegistry.js`, non touché ici).
- **ARD-20** : le code source reste présent après Stop Simulation (aucune interaction avec `simulationActive` dans ce ticket).
- **ARD-22/ARD-23** : export/import conservent `firmware.source` (T15/T16/T17) ; aucun état runtime volatile n'est sérialisé (T18 — vérifié : seule la clé `source` existe dans le JSON exporté).
- **ARD-25** : hors scope — la preuve Blink appartient à `MB-L1-ARD-005`.
- **ARD-29 (recommandation §29 du ticket)** : le sketch par défaut est un squelette `setup()`/`loop()` vide, jamais un Blink.

## Contrat de commande

```js
new Command("UPDATE_ARDUINO_FIRMWARE", {
  componentId,
  beforeFirmware,  // { source: string }
  afterFirmware,   // { source: string }
})
```

Neuvième puis dixième types autorisés sur le canal CommandBus historique (après `UPDATE_COMPONENT_PARAMETERS`, MB-L1-CVE-001) — jamais un `UPDATE_COMPONENT` générique (le fichier `UpdateComponentHandler.js` existe en source depuis des tickets antérieurs mais reste délibérément non enregistré dans `useCircuitState.js`, confirmé par `cf1DocumentArchitecture.test.js`).

## Forme du Document

```js
{
  uid, type: "ARDUINO", x, y,
  parameters: {},
  firmware: { source: "void setup() {\n}\n\nvoid loop() {\n}\n" }
}
```

Un composant non-ARDUINO ne reçoit jamais de champ `firmware` (AC-04, vérifié T2).

## Comportement History

Une validation utilisateur = une commande = une entrée History (ARD-07). L'action `updateArduinoFirmware(componentId, nextSource)` (composition, `useCircuitState.js`) est déjà conçue pour qu'un futur Code Workspace (`MB-L1-ARD-004`) n'ait qu'à l'appeler au moment d'un commit explicite (blur/bouton "Appliquer"), jamais à chaque frappe — garde d'idempotence incluse (aucune commande si la source est identique).

## Comportement export/import

`ReactDocumentMapper.js` transporte déjà `firmware` génériquement (propriété non structurelle, copiée par `_applyMapping`'s "copie automatique des propriétés non structurelles") — **aucune modification nécessaire**. `normalizeComponent()` (`circuitModel.js`) a été étendu pour préserver `firmware`, exactement selon le même patron que `parameters` (FT-C-BAT-001-R2).

## Hors scope (rappel)

Parser, compilateur, `setup()`/`loop()` exécutés, `delay()`, éditeur de code, Blockly/Monaco, Serial/I2C/SPI, émulation AVR — appartiennent à `MB-L1-ARD-002` à `MB-L1-ARD-005`.

## Validation

- Tests unitaires Handler : `UpdateArduinoFirmwareHandler.test.js` (10/10 PASS).
- Tests domaine firmware : `firmwareDefaults.test.js` (5/5 PASS).
- Test d'intégration cycle de vie complet (§28) : `ArduinoFirmwareDocument.integration.test.jsx` (8/8 PASS) — passe par les vrais canaux (`useCircuitState` → `CommandBus` → `Handler` → `History` → `Document`), jamais une mutation directe d'objet.
- Architecture : `cf1DocumentArchitecture.test.js` amendé et PASS (10 commandes exactement sur le canal).
- Suite complète : baseline 50 FAIL / 2732 PASS (12 fichiers) strictement préservée.
- Build, typecheck, `git diff --check` : PASS.
- Sanity check navigateur réel (aucun gate explicite pour ce ticket, aucune UI ajoutée) : placement Arduino, ComponentInspector, Undo/Redo tous fonctionnels, 0 erreur console.
