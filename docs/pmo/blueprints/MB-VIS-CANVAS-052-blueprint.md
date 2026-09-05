# MB-VIS-CANVAS-052 — Execution Blueprint

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
|---|---|
| Blueprint-ID | `MB-VIS-CANVAS-052-blueprint` |
| Ticket-ID | `MB-VIS-CANVAS-052` |
| Commit audité | `725f0e775d157c552407714457dfdfb34f57dde9` |
| Date | `2026-09-05` |
| Auteur | `CSA — audit terrain GitHub + consolidation EXP3` |
| Statut | `PRÊT POUR AUTHORITY / CSA GO` |

## B. OBJECTIF

Introduire un mécanisme générique permettant de focaliser visuellement un composant, de le centrer dans le Canvas et d'augmenter/réduire temporairement son échelle visuelle locale, sans modifier le Document électrique.

`MB-VIS-CANVAS-050` fournit déjà un viewport unique avec zoom/pan et des primitives génériques de centrage. `MB-VIS-CANVAS-051` fournit l'isolation des états haute fréquence. 052 doit exploiter ces fondations, pas les contourner.

## C. TERRAIN AUDITÉ — FAITS

### C1 — Viewport
`frontend/src/utils/viewport.js` définit le modèle unique `{ zoom, translateX, translateY }` et la relation `screen = translation + document * zoom`. `centerOnRect()` et `centerOnPoint()` existent déjà et sont explicitement destinés à être réutilisés par un futur focus composant.

### C2 — Conversion écran→Document
`frontend/src/utils/geometry.js::clientToCanvas()` est l'oracle unique. Il intègre actuellement zoom et translation.

### C3 — Canvas
`SimulationCanvas.jsx` applique le viewport à une couche commune contenant composants, fils, breadboard et autres couches du Canvas. Il consomme le state haute fréquence via `useCircuitInteraction()`.

### C4 — Performance 051
`CircuitContext.jsx` sépare déjà `stableValue` et `interactionValue`. `CircuitComponent.jsx` consomme le contexte stable et est mémorisé par `React.memo`; `SimulationCanvas.jsx` consomme le contexte haute fréquence.

### C5 — Composants
`CircuitComponent.jsx` positionne actuellement le wrapper selon `component.x/y`, utilise les dimensions de `componentDefinitions.js`, rend le backend via `PartRenderer`, puis rend les `Pin` à partir de `getPinPresentationPosition()`.

### C6 — Géométrie de présentation des pins
`pinPresentationGeometry.js` distingue déjà géométrie électrique canonique et projection visuelle de présentation. Le focus/local zoom ne doit pas modifier la géométrie électrique.

### C7 — Catalogue raster
Les 16 types de composants sont déclarés dans `componentDefinitions.js` avec leurs dimensions et pins. Le mécanisme 052 doit donc être transversal et ne pas ajouter une branche de renderer par type.

## D. DÉCISIONS CSA — NON NÉGOCIABLES

### D1 — Focus = Presentation
L'état de focus est de la présentation/navigation. Il ne devient pas un champ du Document électrique. Au plus un composant est focalisé.

Conceptuellement : `focusedComponentId : uid | null`.

### D2 — Local scale = Presentation
L'échelle locale est bornée, finie et déterministe.

Paramètres CSA de référence :

```text
LOCAL_SCALE_MIN = 1.0
LOCAL_SCALE_MAX = 3.0
LOCAL_SCALE_STEP = 0.1
LOCAL_SCALE_DEFAULT = 1.5
```

Ces valeurs ne changent jamais `component.width/height`, `component.x/y`, les offsets de pins ou les données de simulation.

### D3 — Interaction UX retenue
Pour éviter tout conflit avec le drag gauche existant :

- entrée focus : composant sélectionné + `Enter` ;
- sortie focus : `Escape` ;
- variation local scale : molette au-dessus du composant focalisé ;
- la molette hors focus conserve son rôle de zoom global 050 ;
- le pan molette reste disponible selon le contrat 050 ; les gestes restent mutuellement exclusifs.

Le choix clavier évite d'introduire un double-clic concurrent du drag existant. Les futurs tickets Toolbar/Menu pourront exposer la même commande sans modifier le modèle 052.

### D4 — Focus/centrage
L'entrée focus calcule les bounds du composant en espace Document, puis réutilise `centerOnRect()` ou une primitive équivalente existante du viewport. Aucun calcul à partir de pixels écran transformés.

Le focus ne crée pas de seconde caméra et ne remplace pas le viewport global.

### D5 — Composition globale + locale
Le résultat visuel doit rester conceptuellement :

```text
viewport global
      ↓
présentation du composant
      ↓
localScale
      ↓
asset + pins + hit target + éléments visuels associés
```

La formulation exacte du DOM/CSS est libre, mais la cohérence entre corps raster, pins visibles, hit target et endpoints visuels de fils est obligatoire.

### D6 — Architecture de performance
La molette de local scale est potentiellement haute fréquence. Elle ne doit pas transformer `CircuitComponent` en consommateur permanent du contexte haute fréquence global.

Préférence CSA : l'état de local scale reste local au composant focalisé, ou utilise un mécanisme de présentation sélectif qui ne réveille pas tous les composants à chaque pas de molette. Le focus ID peut être exposé via le state stable puisqu'il ne varie pas à chaque pas de zoom local.

Une solution qui fait rerendre les 100+ composants à chaque pas de local scale doit être considérée comme une régression de 051 sauf preuve contraire.

### D7 — Aucun renderer spécifique par type
Le mécanisme s'applique aux 16 types sans `if (type === ...)` ou équivalent dans `PartRenderer`/renderer pour obtenir le focus ou l'échelle locale. Le registre de présentation existant reste la source des capacités visuelles déclaratives.

### D8 — Aucun changement du Document
Pendant focus et local scale :

- `component.uid` inchangé ;
- `component.x/y` inchangés ;
- `component.pins` inchangés ;
- pin IDs inchangés ;
- références de wires inchangées ;
- simulation/runtime inchangé ;
- aucune commande History générée.

## E. COHÉRENCE PIN / WIRE / HIT TARGET

Une simple transformation CSS isolée de l'image est refusée si elle produit une pin visuellement décalée, un hit target resté à l'ancienne taille, un endpoint de wire incohérent ou une zone de drag différente du composant visible.

La présentation locale doit donc être appliquée à une unité cohérente du composant, ou être propagée de manière mathématiquement identique à toutes les sous-parties visuelles concernées.

Les coordonnées électriques ne doivent jamais être recalculées à partir de la présentation locale.

## F. DRAG ET FOCUS

Un composant focalisé reste déplaçable avec le contrat existant. Le drag continue de travailler dans l'espace Document via `clientToCanvas()`. Le local scale ne doit pas être injecté dans cet oracle comme s'il s'agissait d'un zoom du viewport.

```text
pointer écran
   ↓
viewport inverse
   ↓
Document
   ↓
drag métier / preview
```

La taille visuelle peut changer le hit testing de présentation, mais elle ne change jamais la position Document obtenue par le drag.

## G. FOCUS ET SÉLECTION

L'entrée en focus est autorisée uniquement pour un composant existant et identifiable par `uid`. Le focus ne remplace pas la sélection métier.

Si un autre composant est focalisé : ancien focus supprimé, nouveau focus unique, aucune mutation Document, aucune entrée History.

La sortie focus conserve par défaut le viewport courant. Aucune restauration automatique d'une ancienne caméra n'est demandée.

## H. BOUNDS

Les bounds du composant proviennent de sa définition dans l'espace Canvas/Document : position `x/y` + dimensions de définition, avec toute marge strictement nécessaire au centrage.

Ils ne doivent jamais être déduits d'un `getBoundingClientRect()` déjà transformé par le viewport ou par local scale.

## I. TESTS OBLIGATOIRES

1. focus d'un composant avec `Enter` ;
2. un seul focus à la fois ;
3. `Escape` quitte le focus ;
4. focus centre correctement le composant ;
5. focus ne modifie pas `uid`/`x/y` ;
6. local scale par molette dans `[1.0, 3.0]` ;
7. aucune valeur NaN/infinie ;
8. local scale ne modifie ni pins canoniques ni pin IDs ;
9. sortie focus ne modifie pas le Document ;
10. aucune entrée History pour focus/local scale ;
11. drag d'un composant focalisé ;
12. câblage vers/depuis un composant focalisé ;
13. hit target et pins suivent la présentation ;
14. fils restent cohérents ;
15. combinaison global zoom + pan + focus + local scale ;
16. au moins deux types visuellement différents ;
17. couverture générique compatible avec les 16 types ;
18. absence de régression 049/050/051 ;
19. typecheck ;
20. build ;
21. `git diff --check`.

## J. PREUVE NAVIGATEUR OBLIGATOIRE

Sur une session fraîche :

```text
1. sélectionner un composant
2. Enter → focus + centrage
3. molette → local scale ↑
4. molette → local scale ↓
5. drag du composant focalisé
6. créer/vérifier un wire vers une pin
7. Escape → sortie focus
8. vérifier que la position et les connexions sont inchangées
9. refaire avec un second type visuellement différent
10. combiner zoom global + pan + focus + local scale
11. inspecter la console
```

La preuve distingue clairement observation visuelle, vérification Document et mesure de performance/rerenders.

## K. NON-OBJECTIFS

- rotation ;
- miroir ;
- transformations générales ;
- Inspector ;
- Toolbar/Menu 2.0 ;
- Component Library 2.0 ;
- nouveau renderer/backend ;
- changement ou agrandissement artificiel des assets raster ;
- refonte wires/breadboard ;
- modification simulation/connectivité ;
- nouvelle commande métier History ;
- implémentation de 053+.

## L. FICHIERS TERRAIN INITIAUX

```text
frontend/src/hooks/useCircuitState.js
frontend/src/context/CircuitContext.jsx
frontend/src/context/useCircuit.js
frontend/src/context/useCircuitInteraction.js
frontend/src/canvas/SimulationCanvas.jsx
frontend/src/canvas/CircuitComponent.jsx
frontend/src/canvas/CircuitComponent.css
frontend/src/canvas/Pin.jsx
frontend/src/utils/viewport.js
frontend/src/utils/geometry.js
frontend/src/utils/pinPresentationGeometry.js
frontend/src/config/componentDefinitions.js
frontend/src/components/parts/PartRenderer.jsx
frontend/src/wires/WiresLayer.jsx
```

Claude peut ajouter des utilitaires/tests ciblés si nécessaire, mais toute extension hors de ce périmètre doit être justifiée dans le Delivery Report.

## M. RISQUES CSA

1. CSS transform isolée : désynchronisation asset/pin/hit/wire.
2. Local scale injecté dans le viewport global : violation de la distinction global/local.
3. Mutation Document : dérive de la géométrie électrique.
4. Second modèle screen↔Document : divergence des interactions.
5. Rerender global à chaque molette : régression de 051.
6. Double-clic pour focus : conflit potentiel avec drag ; interdit par D3.
7. Focus inscrit dans History : pollution du modèle métier.
8. Branchement par type : dette architecturale contraire à la présentation déclarative.
9. Bounds calculés en écran : centrage dépendant du zoom/local scale.
10. Modification des assets : traitement du symptôme au lieu du problème Canvas.

## N. CRITÈRE DE SORTIE

Le Blueprint est respecté lorsque l'implémentation démontre une chaîne unique :

```text
PRESENTATION
  ├── Focus ID
  └── Local Scale
          ↓
   Composant visuel
   ├── asset
   ├── pins
   └── hit/wire
          ↓
   VIEWPORT 050
          ↓
      écran

Document électrique inchangé.
```

## O. SOURCES

- `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
- `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-050.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-050-blueprint.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-051.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-051-blueprint.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-052.md`
- `frontend/src/hooks/useCircuitState.js`
- `frontend/src/utils/viewport.js`
- `frontend/src/utils/geometry.js`
- `frontend/src/canvas/SimulationCanvas.jsx`
- `frontend/src/canvas/CircuitComponent.jsx`
- `frontend/src/utils/pinPresentationGeometry.js`
- `frontend/src/config/componentDefinitions.js`
