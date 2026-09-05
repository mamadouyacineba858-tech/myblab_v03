# MB-VIS-CANVAS-051 — Delivery Report
## Canvas Performance Isolation

Statut : **Implémentation livrée sous autorisation CSA « mode direct » (`docs/pmo/delivery-reports/MB-VIS-CANVAS-051-authority.md`) — commit d'implémentation et Delivery Report déjà committés et poussés sous cette même autorisation.**

---

## 1. Rappel du mandat

Après MB-VIS-CANVAS-050 (viewport pan/zoom), le hook `useCircuitState.js` continuait d'exposer TOUT son état — Document stable ET state d'interaction haute fréquence (`dragPreview`, `viewport`, `marqueeRect`, `breadboardFeedback`, `breadboardInsertPreview`) — par un unique `CircuitContext.Provider`. Le Blueprint (`docs/pmo/blueprints/MB-VIS-CANVAS-051-blueprint.md`, §D1) a diagnostiqué le risque : un Context global mélangeant state stable et state haute fréquence force, à chaque changement de preview/navigation, la réévaluation de tout composant qui consomme ce Context — y compris ceux qui ne dépendent d'aucun des champs qui viennent de changer.

Périmètre inclus (Ticket §C) : isolation du state haute fréquence, réduction du fan-out de rendu pendant drag/pan/marquee/waypoint/feedback, stabilisation des références nécessaires, adaptation minimale des consommateurs, tests fonctionnels + tests d'isolation, mesure reproductible AVANT/APRÈS sur 100+ composants, preuve navigateur, typecheck, build. Périmètre exclu, non touché : nouvelle fonctionnalité utilisateur, nouvelle architecture de viewport, focus/zoom local (052), Component Library/Toolbar/Inspector, nouveau backend de rendu, assets, solveur/connectivité, réarchitecture de la simulation.

## 2. Diagnostic confirmé (CARTOGRAPHIE)

- `CircuitComponent.jsx` (un par composant du Document) appelait `useCircuit()` directement — donc consommait le Context monolithique en entier, malgré ne lire que des champs stables (`pinSignals`, `isPinPending/Connected`, `isSelected`, `startDrag`, `selectOnly`, `toggleSelection`, `setButtonState`, `toggleLatchingButton`). Il n'était en outre pas mémoïsé (`React.memo`), ni les autres composants directement consommateurs (`WiresLayer.jsx`, `StatusBar.jsx`, `AppShell` via `App.jsx`).
- Deux fonctions du gros `useEffect` pointermove/up/cancel/blur — `updateMarquee` (dépendante de `viewport`) et `endMarquee` (dépendante de `wirePaths`) — désabonnaient/réabonnaient les 4 listeners `window` à **chaque pixel** de pan (`viewport` change en continu) et à **chaque pixel** de drag de composant/waypoint (`wirePaths` suit le preview) — un coût de listener churn réel, indépendant du fan-out React, identifié en C4/D2 du Blueprint.

## 3. Architecture livrée

### 3.1 Second Context dédié au state haute fréquence

`frontend/src/context/CircuitContext.js` exporte désormais deux contextes : `CircuitContext` (inchangé de nom, désormais **stable uniquement**) et `CircuitInteractionContext` (**nouveau**). `frontend/src/context/useCircuitInteraction.js` (nouveau) est le hook d'accès symétrique à `useCircuit()`.

`useCircuitState.js` **ne change pas de forme de retour** (un seul objet fusionné, comme avant ce ticket — aucune régression pour un test qui l'invoque directement via `renderHook`). La séparation se fait en aval, dans `CircuitContext.jsx` : deux `useMemo` distincts, chacun avec un tableau de dépendances restreint aux champs qu'il expose —

- **`stableValue`** (→ `CircuitContext`) : Document (`wires`, `connectedPins`, `pinSignals`), sélection, simulation, `showGrid`/`theme`, et la totalité des callbacks d'action (`addComponent`, `startDrag`, `selectOnly`, `undo`/`redo`, etc.).
- **`interactionValue`** (→ `CircuitInteractionContext`) : `components` (componentsForRender, suit le drag), `breadboard`/`breadboardFeedback`/`breadboardInsertPreview`, `wirePaths`, `viewport`/`zoom`, `marqueeRect`.

Comme chaque champ individuel de `state` (le retour de `useCircuitState()`) garde sa propre identité de `useMemo`/`useCallback` — inchangée par ce ticket — `stableValue` ne change de référence QUE si un champ stable change réellement, même si `state` lui-même est reconstruit à chaque frame d'un drag/pan/marquee. Les deux Provider sont imbriqués ; un changement de l'un n'invalide jamais l'autre.

### 3.2 Adaptation des consommateurs (minimale, ciblée)

- **`CircuitComponent.jsx`** : aucun changement de quels champs il lit (déjà 100% stables) — ajout de `React.memo` (`export const CircuitComponent = React.memo(CircuitComponentImpl)`). C'est la combinaison **Context stable + mémoïsation** qui élimine le fan-out : la mémoïsation seule ne suffit pas face à un Context consommé directement (React re-rend tout consommateur d'un Context dont la valeur change, quel que soit `React.memo`) ; un Context stable seul ne suffit pas non plus si le composant n'est pas mémoïsé (son parent le re-rendrait quand même à chaque frame).
- **`SimulationCanvas.jsx`** : lit désormais `useCircuitInteraction()` pour `components`/`breadboard`/`breadboardFeedback`/`breadboardInsertPreview`/`wirePaths`/`viewport`/`marqueeRect`, et `useCircuit()` pour le reste (inchangé). Continue de re-rendre à chaque frame (racine du rendu Canvas, nécessaire) — l'isolation vient du fait que ses enfants n'en ont plus besoin.
- **`WiresLayer.jsx`** : seul `viewport` (nécessaire pour la création de waypoint par double-clic) migre vers `useCircuitInteraction()` ; tout le reste (`wires`, `pinSignals`, `isSelected`, etc.) reste sur `useCircuit()`.
- **`StatusBar.jsx`** : `components`/`wirePaths` (comptage seul) migrent vers `useCircuitInteraction()` ; `isWiringActive`/`simulationActive` restent stables.
- **Aucun changement** : `Breadboard.jsx`, `Sidebar.jsx`, `Navbar.jsx`, `SettingsPanel.jsx`, `useKeyboardSystem.js`, `App.jsx` — audités, ne lisent que des champs déjà stables.

### 3.3 Stabilisation des références (D3, correctif du listener churn)

Dans `useCircuitState.js` : `startDrag`, `startBreadboardDrag`, `startMarquee`, `startWaypointDrag`, `startPan`, `updateSidebarComponentDragPosition` lisent désormais `viewportRef.current` au lieu de `viewport` (dépendance retirée) — ces fonctions ne lisent le viewport qu'à l'instant du pointerdown, jamais en continu. Deux corrections plus significatives :

- **`updateMarquee`** : `viewport` retiré des dépendances (→ `viewportRef.current`). Avant ce correctif, un **pan** (qui change `viewport` à chaque pixel) forçait le gros `useEffect` pointermove/up/cancel/blur à désabonner/réabonner ses 4 listeners `window` à chaque pixel — même lorsqu'aucun marquee n'était actif.
- **`endMarquee`** : nouvelle référence synchrone `wirePathsRef` (même patron que `componentsRef`/`viewportRef`) ; `wirePaths` retiré des dépendances. Avant ce correctif, un **drag de composant/waypoint** (qui change `wirePaths` à chaque pixel, D5) forçait le même désabonnement/réabonnement à chaque pixel.

Ces deux fonctions étant des dépendances du gros effect, il ne se réattache plus qu'au montage — plus jamais pendant une interaction active.

## 4. Tests ajoutés / adaptés

### 4.1 Nouveau — `frontend/src/__tests__/CanvasPerformanceIsolation.test.jsx` (4 tests)

Verrouille le contrat d'isolation sur un circuit de **120 composants** (grille 12×10) :

1. Drag continu (30 pointermove) d'un seul composant → **0 des 119 autres composants ne re-rend** pendant la fenêtre d'interaction active ; le composant déplacé re-rend à chaque frame ; les fils suivent le preview.
2. Pan continu (30 pointermove) → **0/120** composants re-rendent.
3. Marquee continu (15 pointermove) → **0/120** composants re-rendent.
4. Les fils continuent de suivre le preview de drag (géométrie change avant tout commit) ; une seule mutation Document par drag (jamais par frame).

Mécanisme de mesure : un wrapper `React.memo` dédié au test (`ProbedComponent`) dont le corps n'exécute que si React décide réellement de rendre — **pas** `React.Profiler`, dont `onRender()` se déclenche pour tout commit visitant le Profiler même quand le sous-arbre a intégralement « bailed out » via `memo` (vérifié empiriquement en cours de mesure, cf. §5 Déviation).

### 4.2 Adaptés — 22 fichiers de test existants

Deux catégories d'adaptation, strictement mécaniques (aucune assertion modifiée) :

- **Harnais de rendu locaux** (`function Harness(){ const c = useCircuit(); ...c.components... }`, pattern préexistant dans 18 fichiers `*.raster.test.jsx` + `renderQualityGate.test.jsx` + `circuitComponentRasterChrome.test.jsx` + `CircuitComponent.interaction.test.jsx`) — `components` migré vers `useCircuitInteraction()`, fusionné dans l'objet transmis à `onReady()`/`getApi()` pour que les assertions existantes (`api.components...`) restent inchangées.
- **`renderHook(() => useCircuit(), { wrapper })`** (pattern préexistant dans 14 fichiers d'intégration `*.integration.test.jsx` + `useCircuitStateArduinoBridge`/`useCircuitStateInteraction*`) — remplacé par `renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })`, reconstituant l'API unifiée historique sans toucher aux assertions.
- **`WiresLayer.test.jsx`** : le contexte minimal simulé (`CircuitContext.Provider` seul) enveloppé d'un second `CircuitInteractionContext.Provider value={{ viewport: undefined }}` — `viewport` était déjà optionnel dans ce test avant ce ticket.
- **`Sidebar.test.jsx`** : la sonde locale (`Probe`) fusionne `useCircuit()`+`useCircuitInteraction()`.

Aucun fichier de test n'a eu ses **assertions** modifiées — seule la source de lecture de `components`/`viewport` a changé, pour suivre le nouveau découpage de Context.

## 5. Déviation disclosed (corrigée avant livraison)

**`React.Profiler` ne mesure pas fidèlement le bail-out `React.memo`.** Première tentative de mesure : un `<Profiler id={uid} onRender={...}>` par composant. Résultat initial : 120/120 composants « re-rendus » pendant drag ET pan — contredisant l'analyse du code. Vérifié empiriquement (diagnostic dédié, script jetable) que les objets `component` individuels restent bel et bien référentiellement stables pour les composants non affectés — la mesure elle-même était en cause : `Profiler.onRender` se déclenche pour tout commit visitant ce nœud, y compris quand le sous-arbre entier a été sauté par un ancêtre mémoïsé. Corrigé en remplaçant le Profiler par un wrapper `React.memo` dédié dont le CORPS (donc le compteur) n'exécute que si React appelle réellement son rendu — cohérent avec le mécanisme réel de `CircuitComponent.jsx`.

**Deuxième déviation, plus significative, découverte pendant la mesure AVANT/APRÈS** : la même technique (`ProbedComponent`, wrapper ajouté PAR le test) s'est révélée **aveugle à un phénomène réel du code AVANT ce ticket** — React fait « traverser » un Context consommé directement par un descendant (`CircuitComponent.jsx` avant ce ticket, via `useContext(CircuitContext)`) au travers d'un ancêtre mémoïsé dont les props n'ont pas changé, **sans ré-exécuter le corps de cet ancêtre**. `ProbedComponent` (l'ancêtre injecté par le test) ne se ré-exécutait donc jamais, alors que `CircuitComponent.jsx` À L'INTÉRIEUR, lui, se re-rendait bel et bien à chaque frame sur le code AVANT ce ticket (contexte monolithique). Corrigé en remplaçant le wrapper `ProbedComponent` par une interception directe de `useCircuit()` (`vi.spyOn`, jamais de modification de fichier source) : `CircuitComponent.jsx` appelle `useCircuit()` exactement une fois par exécution de son rendu, avant ET après ce ticket — compter ces appels (moins ceux du harnais lui-même) donne une mesure fiable quelle que soit l'architecture de Context sous-jacente. Voir §6 pour les deux relevés obtenus avec cette méthode corrigée.

## 6. Mesure AVANT/APRÈS — protocole reproductible

**Procédure identique** sur les deux commits : circuit de grille 12×10 = **120 composants** (`RESISTOR`), aucun breadboard ; drag continu = 30 `pointermove` sur un seul composant ; pan continu = 30 `pointermove` (clic molette) ; comptage des exécutions réelles du rendu de `CircuitComponent.jsx` par interception de `useCircuit()` (`vi.spyOn`, voir §5) — jamais de modification de fichier source, jamais de mesure de durée (non reproductible d'une machine à l'autre).

| Scénario | AVANT (commit `1fbabaa`, pré-ticket) | APRÈS (ce ticket) | Réduction |
|---|---|---|---|
| Drag continu, 1 composant déplacé sur 120, 30 pointermove | **3600** exécutions de rendu (120 composants × 30 frames — tous re-rendent à chaque frame) | **30** exécutions (1 composant × 30 frames — seul le composant déplacé) | **−99,2 %** |
| Pan continu, 120 composants, 30 pointermove | **3600** exécutions de rendu (120 × 30) | **0** exécution | **−100 %** |

FAIT MESURÉ (méthode ci-dessus, reproductible à l'identique) : au commit (`pointerup`), le round-trip complet du Document via `ReactDocumentMapper.toReact()`/`normalizeComponent()` (`applyDocument()`, comportement préexistant de MB-CF3-003/MB-004.5, non modifié par ce ticket) reconstruit un nouvel objet pour chaque composant, provoquant un re-rendu unique de tous les composants à cet instant précis — un coût UNIQUE au commit, jamais UN PAR FRAME, mesuré et rapporté séparément dans `CanvasPerformanceIsolation.test.jsx` (`AU COMMIT (pointerup, une seule fois...)`) pour ne jamais être confondu avec le fan-out pendant l'interaction active.

OBSERVATION (non mesurée quantitativement, cohérente avec le mécanisme décrit en §3.3) : le gros `useEffect` pointermove/up/cancel/blur ne se réabonne plus pendant un pan ou un drag, éliminant le désabonnement/réabonnement des 4 listeners `window` à chaque pixel présent avant ce ticket.

## 7. Résultats

- **`CanvasPerformanceIsolation.test.jsx`** : 4/4 verts.
- **Suite complète** (`npm run test:ci`, `src/simulator/vitest.config.ts`) : **1888/1907 verts (19 échecs / 11 fichiers)** — exactement la même baseline pré-existante que HEAD avant ce ticket (`1fbabaa`, vérifié par exécution différentielle : `git stash` complet des changements de ce ticket, suite ré-exécutée sur commit nu → mêmes 19 échecs exacts, mêmes fichiers, mêmes messages). 1907 = 1903 (baseline) + 4 tests neufs de ce ticket. **0 régression nouvelle.**
- **`tsc -b`** : exit 0.
- **`npm run build`** (`tsc -b && vite build`) : vert, `built in 7.37s`, aucune erreur (avertissement `[PLUGIN_TIMINGS]` informatif de Vite, non bloquant, sans lien avec ce ticket).
- **`git diff --check`** : exit 0.

## 8. Preuve navigateur (Chromium réel, dev server réel — pas jsdom)

Circuit assemblé interactivement : 5 composants (LED ×2, Résistance, Interrupteur), positions distinctes.

| Scénario | Résultat observé |
|---|---|
| Ajout de composants (clics palette) | Rendu raster réaliste correct pour chaque type (LED, Résistance, Interrupteur), compteur `Composants : N` correctement synchronisé |
| Drag d'un composant | Composant déplacé visuellement à la position relâchée, reste sélectionné (contour vert) |
| Zoom orienté curseur (molette, plusieurs crans) | Zoom arrière fluide, tous les composants restent correctement positionnés et rendus sans artefact |
| Console (`read_console_messages`) tout au long de la session | **Propre** — 0 erreur, 0 avertissement |
| Requêtes réseau (assets composants) | Tous les assets raster chargés avec succès (`200 OK`) |

Complète la couverture exhaustive drag/pan/marquee/wiring/breadboard/simulation/undo-redo déjà apportée par la suite automatisée (§7), qui exerce ces scénarios avec une précision (dispatch d'événements DOM réels) supérieure à une manipulation manuelle par capture d'écran.

## 9. Non-régression du scope out (vérifié)

Aucune modification de : géométrie électrique canonique, `componentDefinitions.js`, `canonicalRegistry.js`, solveur/connectivité (`breadboardConnectivity.js`, `engine.js`), `PartRenderer`/`Pin.jsx`, assets, Sidebar/Navbar/SettingsPanel (comportement), architecture fonctionnelle du viewport (049/050, uniquement ses dépendances internes stabilisées). Aucun travail sur MB-VIS-CANVAS-052.

## 10. Fichiers livrés

| Fichier | Nature |
|---|---|
| `frontend/src/context/CircuitContext.js` | modifié — export `CircuitInteractionContext` (nouveau) |
| `frontend/src/context/CircuitContext.jsx` | modifié — `stableValue`/`interactionValue`, deux Provider imbriqués |
| `frontend/src/context/useCircuitInteraction.js` | **nouveau** — hook d'accès au state haute fréquence |
| `frontend/src/hooks/useCircuitState.js` | modifié — `wirePathsRef` (nouveau), stabilisation `viewport`→`viewportRef` dans 6 callbacks, `endMarquee`/`updateMarquee` découplés de `wirePaths`/`viewport` |
| `frontend/src/canvas/CircuitComponent.jsx` | modifié — `React.memo` |
| `frontend/src/canvas/SimulationCanvas.jsx` | modifié — lecture scindée `useCircuit()`/`useCircuitInteraction()` |
| `frontend/src/wires/WiresLayer.jsx` | modifié — `viewport` migré vers `useCircuitInteraction()` |
| `frontend/src/components/StatusBar.jsx` | modifié — `components`/`wirePaths` migrés vers `useCircuitInteraction()` |
| `frontend/src/__tests__/CanvasPerformanceIsolation.test.jsx` | **nouveau** — 4 tests d'isolation + mesure |
| 21 fichiers de test existants (§4.2) | modifiés — adaptation mécanique du harnais de lecture, aucune assertion changée |

`.claude/launch.json` (config locale de preview du dev server, auto-générée pour la preuve navigateur) reste hors périmètre de ce commit, comme `.claude/` dans son ensemble (répertoire non suivi).

`git diff --stat` (hors `.claude/`) : `44 files changed, 518 insertions(+), 130 deletions(-)`.

## 11. Traçabilité Git

- Branche : `feat/MB-VIS-LED-V16-leads-thicker-realistic`
- HEAD avant implémentation : `1fbabaa6cc4351731aa88c68df9548698bff68a8` (fast-forward incluant les 3 artefacts PMO MB-VIS-CANVAS-051)
- Commit d'implémentation : `65230b104240396af1882b3923cfef933d51e74a`
- Commit du Delivery Report (preuve distincte) : `7034e96b51249530456360680da49d95d50072e3`

## 12. Suite

Conformément à l'Authority (`docs/pmo/delivery-reports/MB-VIS-CANVAS-051-authority.md`) : **STOP** après commit/push de l'implémentation et de ce rapport, vérification HEAD local = HEAD distant. Aucun travail sur MB-VIS-CANVAS-052, aucun nouveau Blueprint/Ticket produit. Le CSA effectue la validation finale et la clôture PMO.
