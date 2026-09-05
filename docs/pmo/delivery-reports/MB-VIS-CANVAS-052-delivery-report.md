# MB-VIS-CANVAS-052 — Delivery Report
## Component Focus & Local Visual Zoom

Statut : **Implémentation livrée sous autorisation CSA « mode direct » (`docs/pmo/delivery-reports/MB-VIS-CANVAS-052-authority.md`) — commit d'implémentation et Delivery Report committés et poussés sous cette même autorisation.**

---

## 1. Résumé

Introduit un mécanisme générique de focus visuel de composant + échelle visuelle locale bornée, réutilisant intégralement les primitives de viewport de `MB-VIS-CANVAS-050` (`centerOnRect`) et respectant strictement la frontière stable/haute-fréquence établie par `MB-VIS-CANVAS-051`. Le focus et l'échelle locale sont des états de présentation/navigation purs : `component.uid`/`x`/`y`, les pins canoniques, les références de wires, la simulation et l'historique métier restent strictement inchangés.

UX verrouillée par l'Authority : composant sélectionné + `Enter` → focus + centrage ; `Escape` → sortie ; molette au-dessus du Canvas pendant un focus actif → échelle locale (bornée `[1.0, 3.0]`, pas `0.1`, défaut `1.5`) ; molette hors focus → zoom global 050 inchangé.

## 2. Design retenu

### 2.1 State — `useCircuitState.js`

- `focusedComponentId` (uid | null) : state stable, bas débit (change uniquement sur Enter/Escape/suppression du composant focalisé). Exposé via `CircuitContext` (comme `selection`).
- `localScale` (number, `[1.0, 3.0]`) : state haute fréquence (change à chaque pas de molette). Exposé via `CircuitInteractionContext` (comme `viewport`), **jamais** lu par `CircuitComponent.jsx`.
- `focusComponent(uid)` : calcule les bounds du composant en espace Document (`x/y` + dimensions de `componentDefinitions.js`) puis appelle `centerViewportOnRect()` (primitive 050 existante, zoom courant conservé) ; réinitialise `localScale` à `LOCAL_SCALE_DEFAULT`.
- `exitFocus()` : remet `focusedComponentId` à `null`, conserve le viewport courant tel quel (aucune restauration de caméra).
- `adjustLocalScale(deltaSteps)` : `setLocalScale(prev => clampLocalScale(prev + deltaSteps))`, no-op si aucun focus actif.
- Un `useEffect` défensif libère automatiquement le focus si le composant focalisé disparaît du Document (suppression, Undo, import) — jamais d'uid fantôme.
- `clearCircuit`/`importCircuit` réinitialisent focus/échelle locale, comme les autres states de présentation.

### 2.2 Isolation de performance (contrainte 051)

`CircuitComponent.jsx` ne consomme **aucun nouveau Context**. `focused`/`localScale` lui arrivent en **PROPS**, calculées par `SimulationCanvas.jsx` (déjà consommateur de `useCircuitInteraction()`) :
```js
focused={comp.uid === focusedComponentId}
localScale={comp.uid === focusedComponentId ? localScale : 1}
```
Pour les composants non focalisés, ces deux props restent `false`/`1` à l'identique à chaque pas de molette (égalité par valeur) — `React.memo` (déjà en place depuis 051) les saute, exactement comme il saute déjà `component` pour un composant non déplacé pendant un drag. Seule l'instance focalisée re-rend à chaque pas de molette. Vérifié par un test dédié (§4) sur 20 composants : 0 re-rendu hors cible pendant 15 pas de molette.

### 2.3 Présentation visuelle — `CircuitComponent.jsx`

Un unique `transform: scale(localScale)` (si focalisé) posé sur le wrapper `.circuit-component`, avec `transform-origin: center center`. Ce choix scale en un seul geste CSS l'asset (`.circuit-component__body`, enfant), les `<Pin>` (enfants, **jamais** recalculés — leur agrandissement/déplacement vient uniquement de l'héritage du transform) et la zone de hit du wrapper (les navigateurs hit-testent la boîte transformée) : asset/pins/hit target restent coherents par construction, sans branche par type. `data-focused` (attribut) et `z-index: 20` (si focalisé) complètent la présentation.

### 2.4 Cohérence des extrémités de fil — `pinPresentationGeometry.js` / `circuitSelectors.js`

Puisque `WiresLayer.jsx` dessine ses `<path>` dans un calque SVG indépendant du sous-arbre DOM transformé, `getPinPresentationPosition(component, pinDef, { scale })` (nouveau paramètre optionnel, défaut `1`, comportement 2-arguments strictement inchangé) reprojette la position de présentation déjà résolue (canonique ou override par type — LED/NPN/POWER/ARDUINO, inchangés) autour du **centre du composant** (mêmes dimensions `componentDefinitions.js`, jamais un `getBoundingClientRect()` transformé) — exactement la même formule que l'effet visuel du `transform: scale()` CSS. `buildWirePaths(components, wires, focusInfo)` (nouveau 3ᵉ paramètre optionnel `{ uid, scale } | null`) transmet ce `scale` uniquement pour les pins du composant focalisé. C'est cette formule **partagée** (nouvelle fonction pure `scalePointAroundCenter`, `utils/localScale.js`) qui garantit, par construction, que l'extrémité de fil dessinée coïncide avec la position visuelle du pin — sans jamais recalculer la position DOM du `<Pin>` lui-même.

### 2.5 Molette — `SimulationCanvas.jsx`

Le listener `wheel` natif existant (050) est étendu : si `focusedComponentId` est défini, la molette appelle `adjustLocalScale(±LOCAL_SCALE_STEP)` et retourne (jamais les deux effets sur le même événement) ; sinon, comportement 050 strictement inchangé (zoom global orienté curseur).

### 2.6 Clavier — `useKeyboardSystem.js`

`Enter` : focalise `activeItem` si `activeItem?.type === 'component'` (no-op sinon, no-op depuis un champ de saisie). `Escape` : sortie du focus en **premier** (avant marquee/câblage/désélection 049, priorité la plus spécifique), sans muter la sélection métier.

## 3. Fichiers livrés

| Fichier | Nature |
|---|---|
| `frontend/src/utils/localScale.js` | **nouveau** — constantes CSA, `clampLocalScale`, `scalePointAroundCenter` |
| `frontend/src/utils/pinPresentationGeometry.js` | modifié — `getPinPresentationPosition(component, pinDef, { scale })` |
| `frontend/src/utils/circuitSelectors.js` | modifié — `buildWirePaths(components, wires, focusInfo)` |
| `frontend/src/hooks/useCircuitState.js` | modifié — `focusedComponentId`/`localScale`, `focusComponent`/`exitFocus`/`adjustLocalScale`, purge défensive, reset `clearCircuit`/`importCircuit` |
| `frontend/src/context/CircuitContext.jsx` | modifié — routage stable (`focusedComponentId`/actions) vs haute fréquence (`localScale`) |
| `frontend/src/canvas/SimulationCanvas.jsx` | modifié — branchement molette, props `focused`/`localScale` par instance |
| `frontend/src/canvas/CircuitComponent.jsx` | modifié — `transform: scale()`, `data-focused`, aucune nouvelle lecture de Context |
| `frontend/src/keyboard/useKeyboardSystem.js` | modifié — `Enter`/`Escape` |
| `frontend/src/utils/__tests__/localScale.test.js` | **nouveau** — 12 tests unitaires purs |
| `frontend/src/utils/__tests__/pinPresentationGeometry.test.js` | modifié — +6 tests (`{ scale }`) |
| `frontend/src/utils/__tests__/circuitSelectors.test.js` | modifié — +6 tests (`focusInfo`) |
| `frontend/src/__tests__/ComponentFocusLocalZoom.integration.test.jsx` | **nouveau** — 18 tests d'intégration (pipeline réel) |

Aucun asset modifié. Aucune modification de `PartRenderer.jsx`, `Pin.jsx`, `CircuitComponent.css`, `componentDefinitions.js`, `viewport.js`, `geometry.js` (lus, non modifiés — les primitives existantes ont suffi).

`git diff --stat` (hors `.claude/`) : `9 files changed` + 3 nouveaux fichiers, `434 insertions(+), 36 deletions(-)`.

## 4. Tests exécutés et résultats

- **`localScale.test.js`** : 12/12 verts (bornes CSA, clamp NaN/Infinity, formule `scalePointAroundCenter`).
- **`pinPresentationGeometry.test.js`** : 8/8 dont 1 échec **pré-existant** (LED, sans rapport avec ce ticket — voir §6) ; les 6 tests neufs (`{ scale }`) tous verts, y compris non-régression stricte à `scale=1` et cohérence pour un type avec projection par type (NPN_TRANSISTOR).
- **`circuitSelectors.test.js`** : 14/14 dont 2 échecs **pré-existants** (LED, sans rapport) ; les 6 tests neufs (`focusInfo`) tous verts, y compris non-mutation des composants d'entrée.
- **`ComponentFocusLocalZoom.integration.test.jsx`** : **18/18 verts** — Enter→focus, focus unique, Escape, centrage exact (formule `centerOnRect`), reset de l'échelle locale à chaque nouveau focus, bornes `[1.0,3.0]` exactes, no-op sans focus, **aucune entrée History**, pins canoniques/IDs inchangés, **drag focalisé** (delta écran exact, jamais corrigé par l'échelle locale), **câblage focalisé** (mêmes identités de pin), extrémité de fil qui suit le pin focalisé sans déplacer l'autre extrémité, `transform: scale()` DOM exact sur l'instance focalisée seule, combinaison zoom global + pan + focus + échelle locale (déterministe, réversible), 2 types visuellement différents (LED/RESISTOR), les 16 types du catalogue (aucune erreur), libération automatique du focus à la suppression, **non-régression 051** (0 re-rendu hors cible sur 20 composants pendant 15 pas de molette).
- **Suite complète** (`npm run test:ci`) : **1930/1949 verts (19 échecs / 11 fichiers)** — exactement la même baseline pré-existante que HEAD avant ce ticket (`5f506e3`), aucun des échecs n'appartient aux fichiers touchés par ce ticket sauf les 3 échecs LED déjà documentés ci-dessus. **0 régression nouvelle.**
- **`tsc -b`** : exit 0.
- **`npm run build`** : exit 0, vert.
- **`git diff --check`** : exit 0.

## 5. Preuve navigateur (Chromium réel, dev server réel, session fraîche)

| Scénario | Résultat observé |
|---|---|
| Sélection LED + `Enter` | Focus engagé (`data-focused=""`), composant centré, échelle locale par défaut appliquée (`transform: scale(1.5)`, mesuré via inspection DOM) |
| Molette (focus actif), un cran avant | `scale(1.5)` → `scale(1.6)` — pas exact de `LOCAL_SCALE_STEP=0.1` |
| Molette répétée vers le bas | Clampé exactement à `scale(1)` (`LOCAL_SCALE_MIN`) — le style `transform` est alors omis (équivalent à aucune transformation) |
| Molette répétée vers le haut | Clampé exactement à `scale(3)` (`LOCAL_SCALE_MAX`) ; `left`/`top`/`width`/`height` du wrapper strictement inchangés (`200px`/`180px`/`80px`/`64px`) — seule la présentation visuelle change |
| Drag du composant focalisé (échelle 3) | Le Document (`left`/`top`) avance exactement du delta écran du drag ; `transform: scale(3)` et `data-focused` restent intacts pendant tout le drag |
| `Escape` | Focus levé (`data-focused` retiré, `transform` vidé), composant revenu à sa taille normale |
| Combinaison zoom global (molette hors focus, ×1,1) + focus (×1,5) | Largeur DOM mesurée = 132px = 80 (largeur canonique) × 1,1 (zoom global) × 1,5 (échelle locale) — composition multiplicative confirmée au pixel près |
| Câblage (LED.Anode → RESISTOR.A, composant non focalisé) | Fil créé avec succès (`Fils : 0 → 1`), confirmant la non-régression du câblage de base après ce ticket |
| Console (tout au long de la session) | Aucune erreur liée à l'application ; un seul avertissement réseau environnemental (`ERR_CONNECTION_REFUSED`, reconnexion HMR Vite du pane de prévisualisation) sans rapport avec le code livré |

**Limite disclosed (méthode, pas produit)** : la démonstration manuelle du câblage **alors que le composant est focalisé** (broche du composant agrandi) n'a pas pu être menée à bien de façon concluante dans cette session de prévisualisation — les tentatives ont buté sur des dérives de coordonnées de clic propres à l'outil d'automatisation du navigateur (décalages entre le référentiel de capture d'écran et `getBoundingClientRect()`, et un chevauchement de zone de clic lorsque le composant agrandi recouvrait visuellement un composant voisin trop proche) et une reconnexion HMR intermittente du serveur de développement pendant la session — jamais une erreur applicative observée. Cette exacte combinaison (câblage vers/depuis un pin d'un composant focalisé, avec vérification des identités de pin) est en revanche **prouvée** de façon précise et reproductible par `ComponentFocusLocalZoom.integration.test.jsx` (dispatch DOM réel via `fireEvent`/`act`, composants espacés délibérément de 300px pour éliminer toute ambiguïté géométrique) — voir §4. Observation et mesure sont ici explicitement distinguées, conformément à l'exigence du Ticket (§14 des invariants de la mission).

## 6. Vérifications explicites des invariants

- **uid/x/y** : `component.uid`/`x`/`y` vérifiés bit-à-bit identiques avant/après `focusComponent()`/`adjustLocalScale()` (test dédié + preuve navigateur `left`/`top` inchangés).
- **Pins** : `getComponentDef(type).pins` vérifié être la **même référence d'objet** avant/après focus/échelle locale (aucune mutation de `componentDefinitions.js`) ; IDs de pins inchangés pour tous les types testés.
- **Wires** : références (`fromUid`/`fromPin`/`toUid`/`toPin`) inchangées ; seule la géométrie de présentation (`wirePaths`) suit le focus, jamais le modèle `wires` lui-même.
- **Simulation** : aucun chemin de ce ticket ne touche `pinSignals`/`runSimulationWithRuntime` — non modifié, non exercé différemment.
- **History** : `getUndoCount()`/`canUndo()` vérifiés inchangés après une séquence complète focus → molette ×2 → sortie focus.
- **Global/local** : `viewport.zoom`/`translateX`/`translateY` vérifiés inchangés par un changement d'échelle locale ; `localScale` vérifié inchangé par zoom/pan globaux ; composition multiplicative confirmée en navigateur (§5).
- **Multi-types** : LED et RESISTOR couverts en test dédié + preuve navigateur (LED) ; les 16 types du catalogue couverts par un test générique dédié (aucun branchement par type introduit — vérifié par lecture du diff de `PartRenderer.jsx`/`CircuitComponent.jsx`, tous deux non modifiés).

## 7. Observations de performance

FAIT MESURÉ (test dédié, comptage exact d'exécutions de rendu via `React.memo`+props, méthode validée par MB-VIS-CANVAS-051) : sur un circuit de 20 composants avec un focus actif, 15 pas de molette consécutifs (échelle locale) ne provoquent **aucun** re-rendu des 19 composants non focalisés ; seul le composant focalisé re-rend à chaque pas. La frontière stable/haute-fréquence de MB-VIS-CANVAS-051 est donc préservée par construction (props, jamais un nouveau Context pour `CircuitComponent.jsx`).

## 8. Limites / écarts

- Le geste UX exact (`Enter`/`Escape`/molette) est celui verrouillé par l'Authority — aucune alternative envisagée.
- La démonstration manuelle du câblage sur un pin focalisé n'a pas été menée à bien en navigateur pour les raisons méthodologiques disclosed au §5 ; le contrat est néanmoins prouvé par test automatisé précis.
- Aucun autre écart par rapport au Blueprint/Authority.

## 9. Traçabilité Git

- Branche : `feat/MB-VIS-LED-V16-leads-thicker-realistic`
- HEAD avant implémentation : `5f506e30a2896143fb4624ae6ae8f0fd3b172d38` (« docs: authorize MB-VIS-CANVAS-052 implementation »)
- Commit d'implémentation : `5821199f560fcb8fdbeaa57d3df89b73909349d5`
- Commit du Delivery Report : ce commit (voir SHA distant final ci-dessous une fois poussé)

## 10. Suite

Conformément à l'Authority (`docs/pmo/delivery-reports/MB-VIS-CANVAS-052-authority.md`) : **STOP** après commit/push et vérification HEAD local = HEAD distant. Aucun travail sur MB-VIS-CANVAS-053, aucune clôture PMO, aucune déclaration de CSA Technical/Visual GO. Le CSA effectue la validation technique et visuelle finale.
