# MB-ARDUINO-BRIDGE-001-report — Delivery Report

Conforme à SPEC-PMO-004.

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
|---|---|
| `Report-ID` | `MB-ARDUINO-BRIDGE-001-report` |
| `Ticket-ID` | `MB-ARDUINO-BRIDGE-001` (Canvas → Arduino Runtime Electrical Bridge) |
| `Blueprint-ID` | `MB-ARDUINO-BRIDGE-001` — Blueprint (CSA APPROVED, IMPLEMENTATION GO) |
| `Commit(s) produit(s)` | **Aucun.** Ni le Ticket ni le Blueprint n'autorisent explicitement de commit local pour cette livraison (à la différence de MB-OBS-003, où la mission d'implémentation contenait la clause séparée « Commit local autorisé. Push interdit. »). Par prudence, aucun `git add`/commit n'a été exécuté — ni dans le bac à sable cloud de cette session, ni a fortiori sur le dépôt réel de l'utilisateur. Les fichiers sont livrés non committés (voir §G). |
| `Branche` | `main` (base de travail : commit `e501ec6`, dernier état connu du dépôt réel — MB-OBS-003 round 2) |
| `Date d'exécution` | 2026-08-25 |

## B. RÉSUMÉ D'EXÉCUTION

Le pont électrique Canvas → Runtime Arduino est branché : `useCircuitState.js` appelle désormais `runSimulationWithRuntime()` (`simulationRuntimeIntegration.js`, déjà existant et déjà testé) au lieu de `runSimulation()` (`engine.js`). Le container runtime (`Map<uid, RuntimeOrchestrator>`) est possédé au niveau application (`App.jsx`) et injecté via `CircuitProvider`, exactement selon l'ownership approuvé par la CSA (Blueprint §3/§4) — `useCircuitState.js` n'instancie directement ni `RuntimeOrchestrator` ni `ArduinoSimulator`. Le scénario de référence (`ARDUINO.D2 → LED`, `POWER.GND → LED`, `digitalWrite("D2", ...)` piloté programmatiquement) est démontré de bout en bout dans le Canvas réel via le hook applicatif : `D2 = LOW` maintient la LED éteinte, `D2 = HIGH` l'allume réellement, dans les deux sens de transition. Aucune boucle temps réel, aucune nouvelle horloge, aucune interface de commande utilisateur, aucune modification de MB-OBS-002/003 ou du canal CF3.

## C. FICHIERS MODIFIÉS — `[FAIT]`

| Fichier | Nature | Lignes |
|---|---|---|
| `frontend/src/App.jsx` | Modifié — possession du container runtime (`useState(() => new Map())`), injection dans `CircuitProvider` | +14 / −4 |
| `frontend/src/context/CircuitContext.jsx` | Modifié — relais de la prop `orchestrators` vers `useCircuitState()`, aucun état propre | +9 / −2 |
| `frontend/src/hooks/useCircuitState.js` | Modifié — bascule `runSimulation()` → `runSimulationWithRuntime()`, container runtime (repli `useState`), purge sur composant Arduino supprimé, vidage sur `clearCircuit()`/`importCircuit()` | +70 / −4 |
| `frontend/src/hooks/__tests__/useCircuitStateRuntimeArchitecture.test.js` | Créé — tests d'architecture LOCK-01 → LOCK-08 (inspection statique) | 147 lignes, 10 tests |
| `frontend/src/hooks/__tests__/useCircuitStateArduinoBridge.test.jsx` | Créé — tests comportementaux TEST-01 → TEST-08 | 260 lignes, 6 tests (regroupant plusieurs TEST- du Blueprint par souci de scénarios réalistes — voir §E) |

Total : 3 fichiers de production modifiés (+93/−10 lignes), 2 fichiers de test créés (407 lignes, 16 tests). Aucun autre fichier créé, modifié ou supprimé.

**Aucun fichier protégé touché** (§18 du Blueprint) : `simulator/engine.js`, `simulator/resolution.js`, `simulator/preparation.js`, `simulator/runtimeOrchestrator.js`, `simulator/scheduler.js`, `simulator/clock.js`, `simulator/arduino/ArduinoSimulator.js`, `simulator/pwmSignal.js`, `simulator/simulationRuntimeIntegration.js`, `observation/**`, `measurement/**`, `core/handlers/**`, `CommandBus.js`, `HistoryService.js`, `canonicalRegistry.js` — confirmé par `git status --short`/`git diff --stat` (voir §D) : seuls les 3 fichiers listés ci-dessus apparaissent modifiés.

## D. PREUVES DE VALIDATION — `[FAIT]`

| Champ | Résultat |
|---|---|
| Tests ciblés (les 2 nouveaux fichiers + `App.test.js`, config jsdom) | `Test Files 3 passed (3)` / `Tests 17 passed (17)` |
| Suite complète — config CI-wired (`npx vitest --config src/simulator/vitest.config.ts --run`) | `Test Files 80 passed (80)` / `Tests 872 passed (872)` — baseline avant ce ticket : 79/862 ; delta exact +1 fichier / +10 tests = `useCircuitStateRuntimeArchitecture.test.js` (seul nouveau fichier `.test.js` — le fichier comportemental `.test.jsx` n'est, comme tous les fichiers `.test.jsx` du dépôt, pas inclus dans cette config `include: src/**/*.test.{js,ts}`). 0 régression. |
| Suite complète — config jsdom (`npx vitest --config vitest.config.js --run`, tous fichiers `.test.{js,jsx}` y compris CF3/MB-OBS-002/MB-OBS-003/UI) | `Test Files 91 passed (91)` / `Tests 976 passed (976)`. 0 régression sur l'ensemble des tests d'intégration CF3, MB-OBS-002 et MB-OBS-003 déjà existants. |
| Build (`npm run build`) | `✓ built in 708ms`, sans erreur |
| Lint (`npx eslint .`, dépôt complet) | 42 erreurs au total (baseline mesurée sur le même commit sans les modifications de ce ticket, via `git stash` : 41) — le seul delta (+1) est `'React' is defined but never used` dans le nouveau fichier `useCircuitStateArduinoBridge.test.jsx`, catégorie déjà présente et acceptée telle quelle dans le dépôt (`MeasurementPanel.jsx`/`TemporalObservationPanel.jsx`/`WiresLayer.jsx` et leurs tests — l'import `React` y est requis par le transform JSX du projet malgré le faux positif ESLint ; retirer l'import casse le rendu au runtime, vérifié empiriquement — voir §F). 0 nouvelle catégorie d'erreur. |
| `git diff --check` | exit 0 |

**Critères d'acceptation du Ticket (AC-01 → AC-13) :**

| AC | Description | Statut réel |
|---|---|---|
| AC-01 | Le Canvas utilise `runSimulationWithRuntime()` | Satisfait — `useCircuitState.js`, appel unique remplacé |
| AC-02 | `useCircuitState` n'instancie pas directement `RuntimeOrchestrator`/`ArduinoSimulator` | Satisfait — LOCK-01/LOCK-02 (inspection statique) |
| AC-03 | Orchestrators injectés depuis le niveau application | Satisfait — `App.jsx` (possession) → `CircuitProvider` (relais) → `useCircuitState` (consommation) |
| AC-04 | D2 HIGH → LED allumable | Satisfait — TEST-02/03/04 |
| AC-05 | D2 LOW → LED éteinte | Satisfait — TEST-02/03/04, TEST-05 |
| AC-06 | Circuits sans Arduino : comportement de `runSimulation()` préservé | Satisfait — TEST-01 (LED POWER→RESISTOR→LED→GND fonctionne, `orchestrators.size === 0`), + GATE 0 déjà prouvé au niveau moteur par `simulationRuntimeIntegration.test.js` (non modifié) |
| AC-07 | Invariants CF3 intacts | Satisfait — `cf1DocumentArchitecture.test.js` (14/14) toujours vert, LOCK-08 (aucune dépendance Runtime dans les handlers CF3/CommandBus/HistoryService) |
| AC-08 | Le runtime ne modifie pas le Document | Satisfait — le container runtime n'écrit jamais dans `components`/`wires`/`HistoryManager` ; seules des méthodes déjà existantes du hook (`addComponent`/`addWire`/`deleteComponent`) mutent le Document, inchangées |
| AC-09 | Aucune boucle temps réel introduite | Satisfait — LOCK-04 (aucun `setInterval`/`setTimeout`/`requestAnimationFrame`/`Date.now`/`performance.now` dans les 3 fichiers touchés) |
| AC-10 | Tests MB-OBS-002 verts, contrat non modifié | Satisfait — `temporalObservationContract.test.js` (26/26), `temporalObservationArchitecture.test.js` (16/16) toujours verts ; `temporalObservationContract.js` non touché (LOCK-07) |
| AC-11 | Tests d'architecture empêchant les contournements | Satisfait — LOCK-01 → LOCK-08, 10 tests, tous verts |
| AC-12 | Non-régression CF3/simulation/runtime/observation | Satisfait — 872/872 (node) + 976/976 (jsdom) |
| AC-13 | Aucun fichier hors périmètre modifié | Satisfait — `git status --short` confirme exactement les 3 fichiers de production + 2 fichiers de test créés |

## E. ÉCARTS PAR RAPPORT AU BLUEPRINT — `[FAIT]` + `[ANALYSE]`

**[FAIT]** Écart 1 — mécanisme de repli du container (§4/§16 du Blueprint parlent d'un `Map<ArduinoUID, RuntimeOrchestrator>` sans préciser son mécanisme d'implémentation React). Un premier essai (`useRef`, pour le container côté `useCircuitState.js` **et** côté `App.jsx`) a été rejeté par `eslint-plugin-react-hooks` (règle `react-hooks/refs`, « Cannot access refs during render ») : lire `.current` pendant le rendu (pour le passer en prop JSX, ou pour l'exposer via le retour du hook) est désormais interdit par cette règle, y compris pour un repli d'ownership. **[ANALYSE]** Corrigé en utilisant `useState(() => new Map())` (initialisation paresseuse) au lieu de `useRef(new Map())`, aux deux endroits concernés (`App.jsx` pour la possession réelle, `useCircuitState.js` pour le repli des appelants n'injectant rien). Ce choix ne change ni la sémantique ni la stabilité de référence attendue par le Blueprint (§16 : « les orchestrators doivent rester stables entre deux recalculs ») — une valeur de `useState` sans setter appelé reste strictement la même référence entre tous les rendus, exactement comme le serait un `useRef.current` — et respecte en plus une règle de lint déjà appliquée ailleurs dans ce même fichier pour une raison identique (voir le commentaire existant sur `commandBusRef`/`historyServiceRef`, MB-CF3-001). N'affecte aucun critère d'acceptation.

**[FAIT]** Écart 2 — regroupement des tests comportementaux. Le Blueprint (§20) énumère TEST-01 à TEST-10 comme des scénarios individuels. Certains ont été regroupés dans un même `it()` lorsqu'ils forment une seule démonstration cohérente et évitent une duplication de montage de circuit : TEST-02/03/04 (D2 LOW → OFF, puis HIGH → ON) sont un seul test de transition ; TEST-09 (CF3 vert) et TEST-10 (MB-OBS-002 vert) ne sont pas des tests nouveaux mais l'exécution des suites déjà existantes, rapportée en §D. **[ANALYSE]** Aucune couverture n'est perdue par ce regroupement — chaque assertion individuelle du Blueprint (LOW→OFF, HIGH→ON, HIGH→LOW, persistance, cleanup composant supprimé, cleanup nouveau Document) est vérifiée explicitement, seule la structure des `describe`/`it()` diffère de l'énumération littérale.

Aucun autre écart constaté. Aucun fichier protégé n'a nécessité de modification (aucune condition de STOP §23 rencontrée).

## F. STABILISATION EFFECTUÉE — `[FAIT]`

- Correction de l'écart 1 ci-dessus (`useRef` → `useState` pour le container runtime, aux deux points d'ownership) — détectée par le lint lui-même avant toute livraison.
- Un essai intermédiaire avait retiré l'import `React` du nouveau fichier de test comportemental pour satisfaire ESLint ; cela a fait échouer les 6 tests à l'exécution (`ReferenceError: React is not defined` — le transform JSX de ce projet requiert `React` en scope, contrairement à ce que suppose la configuration ESLint). Import restauré, tests revérifiés verts ; l'erreur de lint résiduelle correspondante est documentée en §D comme faisant partie d'une catégorie déjà acceptée dans le dépôt, jamais masquée.

## G. RÉSERVES, LIMITES & DEMANDES D'ARBITRAGE — `[FAIT]` uniquement

- **Aucun commit produit.** Ni le Ticket ni le Blueprint transmis pour MB-ARDUINO-BRIDGE-001 ne contiennent de clause équivalente à l'autorisation Phase 3 de MB-OBS-003 (« Commit local autorisé. Push interdit. »). En l'absence d'une telle clause explicite, aucun `git add`/commit n'a été exécuté — les 5 fichiers (3 modifiés, 2 créés) sont livrés à l'état de fichiers déposés, non committés, à la fois dans le bac à sable cloud de cette session et — après dépôt — sur le dépôt réel de l'utilisateur. Question ouverte pour la CSA : un commit local (non poussé) est-il souhaité pour ce Ticket, selon le même principe que MB-OBS-003 ?
- **Limite d'outillage constante :** cette session n'a pas d'accès shell (`device_bash`) à la machine locale de l'utilisateur ; le dépôt des fichiers se fait via le pont fichier de cette session (voir §I).
- **Delta de lint (+1, catégorie déjà acceptée)** : documenté en détail en §D/§F, non traité comme un écart nécessitant arbitrage — il s'agit d'un faux positif ESLint déjà présent sous cette même forme pour 4 autres fichiers du dépôt avant ce ticket.
- Aucune réserve technique nouvelle. Le scénario de référence (§8 du Blueprint) est démontré intégralement dans le Canvas réel via le hook applicatif ; l'exécution manuelle dans l'interface graphique elle-même (ouvrir l'application, glisser un Arduino, câbler visuellement) n'a pas été effectuée par cette session (pas d'accès navigateur interactif ici) — la preuve fournie est au niveau du hook React qui pilote effectivement ce même Canvas (`useCircuitState`/`CircuitProvider`), pas une capture d'écran de l'UI.

## H. GESTION PMO

### H.1 — Constat factuel (Claude) — `[FAIT]`

- Le pont électrique MB-ARDUINO-BRIDGE-001 est implémenté conformément au Blueprint approuvé : `useCircuitState.js` utilise `runSimulationWithRuntime()`, ownership du container runtime au niveau `App.jsx`, injection via `CircuitProvider`.
- Le scénario de référence D2 → LED est démontré : LOW → OFF, HIGH → ON, dans les deux sens de transition, persistance de l'orchestrator entre recalculs, purge du container à la suppression de l'Arduino et au chargement d'un nouveau Document.
- Aucun fichier protégé touché, aucune boucle temps réel, aucune nouvelle horloge, aucune modification de CF3 ou de MB-OBS-002/003 — vérifié par 10 tests d'architecture dédiés (LOCK-01 → LOCK-08) et par la non-régression complète (872/872 + 976/976).
- Build et lint conformes (lint : delta +1, catégorie déjà acceptée, détaillé en §D).
- Aucun commit produit (voir §G) — les fichiers restent, à ce stade, uniquement déposés.

Ce constat porte exclusivement sur l'exécution technique livrée et vérifiée. Il ne constitue ni un jugement de conformité définitif au Ticket, ni une décision de clôture.

### H.2 — Décision de clôture (CSA) — non rendue par Claude

Conformément à la règle de gouvernance de SPEC-PMO-004 (« Claude constate, ChatGPT décide »), ce rapport ne prononce et ne présuppose aucune décision CLOS / RETOUR EN EXÉCUTION / ARBITRAGE. Restent notamment à la main de la CSA : la validation du scénario dans l'application réelle (au-delà de la preuve au niveau hook fournie ici), la question du commit local (§G), et la décision d'ouvrir ou non le prochain Ticket prévu (MB-ARDUINO-COMMAND-001, commande utilisateur — explicitement hors périmètre de ce Ticket).

## I. TRAÇABILITÉ DES LIVRABLES

- **Commit(s) :** aucun (voir §A/§G)
- **Pull Request :** aucune
- **Documentation créée :** ce rapport (`docs/pmo/delivery-reports/MB-ARDUINO-BRIDGE-001-delivery-report.md`)
- **Fichiers de production modifiés :** `frontend/src/App.jsx`, `frontend/src/context/CircuitContext.jsx`, `frontend/src/hooks/useCircuitState.js`
- **Tests ajoutés :** `frontend/src/hooks/__tests__/useCircuitStateRuntimeArchitecture.test.js` (10, LOCK-01→08), `frontend/src/hooks/__tests__/useCircuitStateArduinoBridge.test.jsx` (6, TEST-01→08 regroupés)
- **Blueprint utilisé :** MB-ARDUINO-BRIDGE-001 — Blueprint (CSA APPROVED BLUEPRINT — IMPLEMENTATION GO), transmis par le PMO/CSA dans le fil de conversation
- **Ticket source :** MB-ARDUINO-BRIDGE-001 (CSA BLUEPRINT READY — NO IMPLEMENTATION GO puis approuvé), transmis par le PMO/CSA dans le fil de conversation
- **Audit préalable :** `AUDIT PRÉ-IMPLÉMENTATION — MB-ARDUINO-BRIDGE-001`, produit par cette session en amont du Ticket (base factuelle du Blueprint)
