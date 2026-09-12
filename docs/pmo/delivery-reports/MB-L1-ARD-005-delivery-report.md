# MB-L1-ARD-005 — Arduino Browser E2E Qualification

Base: `57e17095dacff2ac4809d0d2b6ce591f3fbd1a74`
Branch: `feat/MB-L1-ARD-005-browser-e2e-blink`
Commit message: `test(arduino): qualify browser blink e2e`

## Objectif du ticket

Qualifier, dans le vrai laboratoire MYBlab, la chaîne Level-1 complète :
Arduino Code Workspace → firmware Document → compiler → FirmwareExecutor →
Scheduler → ArduinoSimulator D2 → Simulation → circuit → LED visible, sur le
circuit canonique `ARDUINO.D2 → RESISTOR → LED.anode`, `LED.cathode →
POWER.GND` (`POWER.5V` non connectée, `ARDUINO.GND` non utilisée). C'est un
ticket de qualification E2E, pas un redesign : aucune extension
d'architecture n'était autorisée, et aucune n'a été nécessaire.

## Audit réel (avant implémentation)

Lecture ciblée (pas d'audit général) de :
`simulationRuntimeIntegration.js` (composition Scheduler/Runtime/résolution,
`runSimulationWithRuntime`, `synchronizeFirmware`, `stopFirmwareSimulation`),
`useCircuitState.js` (boucle RAF `SIMULATION_STEP_MS`, `firmwareSessions`,
`orchestrators`, gate `simulationActive`), `ArduinoCodeWorkspace.jsx`
(Sketch/Appliquer/Compiler/diagnostics), `Navbar.jsx` (bouton Code
conditionné à la sélection Arduino, Simuler/Arrêter globaux),
`canonicalRegistry.js` (pins ARDUINO D2/D3/GND/5V, RESISTOR A/B, LED
anode/cathode, POWER 5V/GND), `resolution.js` (§MB-SIM-015 :
`propagatePassiveConduction` documente explicitement la topologie
`POWER → RESISTOR → LED → GND` comme cas canonique supporté ; le même
mécanisme, générique, s'applique sans changement quand la source HIGH est
`externalSignals` (ARDUINO) plutôt que `getDcSource` (POWER)).

Conclusion de l'audit : l'intégration ARD-004 (Start/Stop global,
`runSimulationWithRuntime`, boucle RAF) est déjà complète et branchée sur le
circuit réel. Aucun fichier protégé ne nécessitait de modification pour que
le Blink atteigne la LED — confirmé ensuite par la preuve navigateur.

## AUTOMATED EVIDENCE

### Nouveau test d'intégration

`frontend/src/arduino/firmware/__tests__/firmwareCircuitQualification.integration.test.js`
(5 tests, nouveau fichier) ferme l'écart de couverture identifié : aucun
test existant (ARD-001 à ARD-004) n'exerçait le circuit canonique complet
`ARDUINO → RESISTOR → LED → POWER.GND` jusqu'à `getLedState()`
(`production.js`) — ARD-003/ARD-004 s'arrêtent au GPIO brut
(`runtime.pinOutputs`/Signal D2) ou à des fixtures ARDUINO nues
(`firmwareLive.integration.test.js`). Aucun des 210 tests ARD-004 n'est
dupliqué.

- **D2 HIGH → résistance → LED allumée** dès `t=0` (setup + premier passage
  de loop), via `runSimulationWithRuntime` + `getLedState`.
- **Progression Blink HIGH → LOW → HIGH** : reproduite en avançant le
  Scheduler par pas de `SIMULATION_STEP_MS`, la LED suit exactement D2.
- **Stop** : `stopFirmwareSimulation` vide `orchestrators`/`firmwareSessions`
  (aucun état résiduel) ; la LED lit `off` sur la `Map` vide que
  `useCircuitState.js` utilise réellement une fois `simulationActive`
  redevenu `false` (`EMPTY_MAP`).
- **Restart** : après Stop, un nouvel appel recrée une session fraîche —
  `setup()` réexécute et la LED s'allume immédiatement à `t=0`.
- **Firmware invalide** : un sketch avec `analogWrite` (non supporté) ne
  produit jamais de GPIO parasite — la LED reste `off`.

### Régression ciblée et suite complète

- Suite Arduino ciblée (`src/arduino`) : **110/110 PASS** (12 fichiers, dont
  les 5 nouveaux tests ARD-005).
- Suite canonique complète (`npm --prefix frontend run test:ci`) :
  **2839 PASS / 50 FAIL / 2889 total**, 204 fichiers passants et 12 fichiers
  historiquement en échec (216 fichiers). Comparé à la baseline ARD-004
  (2834 PASS / 50 FAIL / 2884 total) : **+5 tests passants (exactement les 5
  nouveaux), 0 changement dans les 50 échecs historiques, 0 nouvelle
  régression.**

| Fichier historiquement en échec | Échecs (baseline ARD-004) | Échecs (ARD-005) |
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

- Build (`npm --prefix frontend run build`) : **PASS**.
- Typecheck (`cd frontend; npx tsc -b`) : **PASS**.
- `git diff --check` : **PASS** (aucun avertissement).
- Fichiers protégés (`scheduler.js`, `clock.js`, `runtimeOrchestrator.js`,
  `resolution.js`, `engine.js`, `preparation.js`, `firmwareCompiler.js`,
  `firmwareExecutor.js`, `firmwareRuntimeController.js`) : **tous
  inchangés**, confirmé par `git status --short` (un seul fichier ajouté :
  le nouveau test).

## BROWSER EVIDENCE

Qualification réalisée dans le Browser pane (serveur de dev réel, même
build que l'utilisateur), circuit construit manuellement composant par
composant, fil par fil (D2 → RESISTOR.A, RESISTOR.B → LED.anode,
LED.cathode → POWER.GND, `POWER.5V` laissée non connectée, `ARDUINO.GND`
jamais utilisée), Arduino sélectionné, panneau Code ouvert, sketch Blink
saisi, Compiler → « Compilation réussie », Appliquer, fermeture du panneau,
clic global **Simuler**.

Observation directe de l'état réel du DOM (`aria-label` de la LED
`"LED allumée"`/`"LED éteinte"`, classes CSS des fils `wires-layer__wire--high`/
`--low`/`--floating`, elles-mêmes dérivées de `pinSignals` réel, jamais
d'un minuteur ou d'une animation CSS) — jamais une supposition :

- **Blink ON → OFF → ON** : observé avec horodatage réel
  (`performance.now()`) — HIGH constant jusqu'à ~t=3.1s (temps réel), puis
  bascule LOW confirmée, puis re-bascule HIGH confirmée à un cycle suivant.
  Séquence minimale exigée par le ticket (`ON → OFF → ON`) **observée**.
- **Arrêter** : clic sur `■ Arrêter` → les 3 fils repassent à l'état neutre
  (`?`, aucune classe high/low — `pinSignals` vidé), la LED reste
  `"LED éteinte"` en continu sur 3,5s d'observation sans aucune progression.
- **Redémarrage (Simuler à nouveau)** : immédiatement après le clic, la LED
  est `"LED allumée"` — `setup()` réexécuté et premier passage de `loop()`
  effectués de façon synchrone (indépendant du throttling RAF, cf.
  limitation ci-dessous), conforme au contrat `FirmwareRuntimeController`
  (§ARD-003 : `start()` exécute `resume(currentTimeMs)` immédiatement).
- **Sketch HIGH constant** (`digitalWrite(2, HIGH)` sans delay, sans Stop
  préalable) : Appliquer + nouveau cycle observé → LED restée
  `"LED allumée"` en continu sur 7,6s d'observation, aucun scintillement.
- **Retour au Blink** (Appliquer pendant que la simulation tourne, sans
  Stop) : alternance HIGH → LOW confirmée à nouveau juste après — preuve
  que le navigateur exécute le firmware courant du Document (remplacement
  de session live via `synchronizeFirmware`), jamais une IR obsolète.
- **Sketch invalide** (`analogWrite(2, 128)`, hors sous-ensemble V1) :
  diagnostic visible dans le panneau Code
  (« Ligne 6 / UNSUPPORTED_STATEMENT / unsupported statement:
  "analogWrite(2, 128)" »), aucune erreur console, aucun crash, fil D2 en
  style `--floating` (tirets) — jamais un HIGH/LOW figé — LED confirmée
  `"LED éteinte"` (aucune activité visuelle factice). Correction du sketch
  (retour au Blink valide) → simulation reprend, HIGH puis LOW observés à
  nouveau sans intervention supplémentaire.

Aucun hack visuel : à aucun moment le test ou le code ne pilote la LED
autrement que par la chaîne firmware → GPIO → `externalSignals` →
résolution électrique → `pinSignals` → `getLedState` (Visual State Registry)
→ `LedPart.jsx`. Aucune animation CSS, aucun minuteur, aucune mutation
React directe de l'état visuel n'a été introduite ni constatée.

## OBSERVED LIMITATIONS

- **Cadence temps réel non conforme aux 500 ms nominaux** : la période
  réelle observée entre deux bascules a varié de ~3 s à plusieurs dizaines
  de secondes selon les instants d'observation, au lieu des 500 ms attendus
  du sketch. Cause identifiée avec certitude (et non supposée) : dans ce
  Browser pane automatisé, `requestAnimationFrame` ne se déclenche que
  lorsqu'une image est effectivement composée (chaque `screenshot`/rendu
  déclenché par l'outillage), et non selon une cadence d'affichage continue
  — vérifié directement (`requestAnimationFrame` enregistré : 0 déclenchement
  en 2,5 s d'attente pure via `setTimeout`, puis déclenchement confirmé dès
  qu'un `screenshot` force un repaint). `document.hidden` reste `false` et
  `document.visibilityState` reste `"visible"` pendant toute l'observation :
  ce n'est donc pas la Page Visibility API qui throttle, mais l'absence de
  compositing continu propre à ce pane de test automatisé. C'est une
  caractéristique de l'outillage de qualification utilisé dans cette
  session, pas un défaut de MYBlab : la boucle RAF de
  `useCircuitState.js` et le Scheduler restent corrects — un navigateur
  utilisateur normal, avec un onglet réellement affiché en continu,
  respecte la cadence de 16 ms/`SIMULATION_STEP_MS` sans throttling
  comparable. Aucun code n'a été modifié pour contourner cette limitation
  (interdiction explicite de « patcher autour » d'un blocage) : la preuve a
  été obtenue en pompant des repaints via des `screenshot` successifs plutôt
  qu'en attendant un minuteur réel, ce qui reste une preuve électrique
  authentique (mêmes lectures DOM, même `pinSignals`), seulement à une
  cadence d'observation plus lente que le temps réel nominal.
- Hors cette limitation d'outillage, aucune limitation architecturale n'a
  été rencontrée : la topologie canonique (`ARDUINO.D2 → RESISTOR → LED →
  POWER.GND`, `POWER.5V` non connectée) est nativement supportée par
  `resolution.js` (§MB-SIM-015) sans aucune modification.

## Fichiers créés

- `frontend/src/arduino/firmware/__tests__/firmwareCircuitQualification.integration.test.js`
- `docs/pmo/delivery-reports/MB-L1-ARD-005-delivery-report.md`

## Fichiers modifiés

Aucun. Tous les fichiers protégés (`scheduler.js`, `clock.js`,
`runtimeOrchestrator.js`, `resolution.js`, `engine.js`, `preparation.js`,
`firmwareCompiler.js`, `firmwareExecutor.js`,
`firmwareRuntimeController.js`) restent strictement inchangés, ainsi que
tout le reste de l'application (Navbar.jsx, ArduinoCodeWorkspace.jsx,
useCircuitState.js, simulationRuntimeIntegration.js) — la qualification
n'a nécessité aucune correction.

## Critères d'acceptation

Voir sections ci-dessus (AUTOMATED EVIDENCE / BROWSER EVIDENCE) — tous les
gates de la section VALIDATION GATES du ticket sont PASS : ARD-001 à
ARD-004 (régression), ARD-005 ciblé, suite complète (0 régression), build,
typecheck, diff-check, et les 4 preuves navigateur obligatoires (Blink,
Stop/Restart, mise à jour de code, code invalide).
