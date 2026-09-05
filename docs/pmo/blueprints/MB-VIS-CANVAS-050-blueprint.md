# MB-VIS-CANVAS-050 — Execution Blueprint

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
|---|---|
| Blueprint-ID | `MB-VIS-CANVAS-050-blueprint` |
| Ticket-ID | `MB-VIS-CANVAS-050` |
| Commit analysé | `047f66e5db14fa0fd8c89a9f2f5e45de34172172` |
| Date de production | `2026-09-05` |
| Auteur | `CSA — audit terrain GitHub + consolidation EXP3` |
| Statut | `PRÊT_POUR_CONCEPTION` |

## B. SYNTHÈSE POUR L'AGENT D'IMPLÉMENTATION

Le Canvas dispose maintenant d'une fondation écran→Document cohérente avec MB-VIS-CANVAS-049, mais la navigation reste limitée à un `zoom` global stocké dans `useCircuitState.js`. Le rendu applique actuellement ce zoom sur l'ensemble de la scène via `.simulation-canvas__zoom-layer` avec un point d'origine `0 0`, sans translation de viewport/pan, sans reset viewport, sans navigation orientée curseur, sans fit-to-content et sans fit-to-selection.

MB-VIS-CANVAS-050 doit introduire une vraie couche de viewport/caméra pour la présentation et la navigation, tout en conservant le Document comme source de vérité. Le viewport ne doit jamais muter `component.x/y`, les pins, les fils, le breadboard, la simulation ou l'historique métier.

Le choix CSA est d'étendre le modèle existant de viewport plutôt que d'introduire un second canvas renderer ou une nouvelle technologie de rendu. La représentation cible est conceptuellement :

```text
SCREEN
  ↑
  │ projection viewport
  │
VIEWPORT / CAMERA = { translation, zoom }
  │
  ↓ inverse projection
DOCUMENT / CANVAS
```

La navigation doit rester une préoccupation de Presentation/Canvas. La conversion inverse écran→Document doit intégrer la translation et le zoom du viewport, sans déplacer la géométrie canonique.

## C. CONTEXTE TECHNIQUE — [FAIT]

### C1 — Zoom existant

`frontend/src/hooks/useCircuitState.js` conserve `zoom` via `useState(1)` et expose actuellement `zoomIn()` / `zoomOut()`. Les bornes observées sont `0.5` à `2.0`, par pas de `0.1`.

### C2 — Projection actuelle

`frontend/src/canvas/SimulationCanvas.jsx` rend :

```jsx
<div className="simulation-canvas__zoom-layer" style={{ transform: `scale(${zoom})` }}>
```

`frontend/src/canvas/SimulationCanvas.css` positionne cette couche en `absolute; inset: 0`, avec `transform-origin: 0 0`. Les couches grille, breadboard, fils, composants et marquee descendent de cette même couche.

### C3 — Conversion écran→Document après MB-049

`frontend/src/utils/geometry.js::clientToCanvas(event, canvasRect, zoom)` est désormais le point de conversion central et divise la coordonnée locale par `zoom`. Les chemins de drag composant, marquee, waypoint, Breadboard et Sidebar utilisent ce modèle.

### C4 — Interactions pointer existantes

`useCircuitState.js` centralise les interactions globales `pointermove` / `pointerup` / `pointercancel` / `blur`. Les gardes I-M1 empêchent actuellement un drag, un marquee ou un câblage de se superposer dans les cas couverts par le système existant.

### C5 — Géométrie canonique

`frontend/src/utils/geometry.js::getPinPosition()` calcule les positions électriques à partir de `component.x/y + pinDef.dx/dy`. Cette géométrie ne dépend pas du zoom et ne doit pas être modifiée par le viewport.

### C6 — Rendu et séparation Presentation / Document

Les composants, fils, breadboard et marquee sont rendus dans la même sous-arbre transformée. Le viewport peut donc être traité comme une transformation de cette couche commune sans déplacer individuellement les objets.

### C7 — Historique

Le système Undo/Redo historise les mutations Document. Le viewport actuel n'est pas une mutation Document. Le pan, zoom, reset et fit devront rester hors historique métier dans ce ticket.

### C8 — Navbar

`frontend/src/components/Navbar.jsx` expose actuellement `zoomIn` et `zoomOut`, mais aucun reset viewport, pan, fit ou commande de navigation structurée.

### C9 — Bounds disponibles

Le repository dispose déjà de primitives géométriques pour rectangles, chevauchements, positions de composants et chemins de fils. La sélection courante est un `Set` de clés sémantiques `component`, `wire`, `breadboard`. Le viewport 050 peut donc construire des bounds de scène à partir des objets existants sans modifier leur modèle Document.

## D. DÉCISIONS CSA — [ANALYSE]

### D1 — Modèle de viewport

Le ticket introduira un état de viewport unique pour la présentation, conceptuellement composé de :

```text
zoom
translationX
translationY
```

La translation est exprimée dans l'espace écran/viewport afin qu'un déplacement panoramique ne dépende pas du zoom courant. L'implémentation exacte des noms/structures est libre sous réserve de conserver un modèle unique.

### D2 — Projection CSS

La scène commune doit recevoir la transformation de viewport en un seul endroit. Les objets ne doivent pas recevoir chacun une translation ou un zoom indépendant.

La composition cible doit préserver la relation :

```text
screen = viewportTranslation + document * zoom
```

L'ordre concret des fonctions CSS peut varier, mais cette relation doit être vraie et testable.

### D3 — Conversion inverse

`clientToCanvas()` doit évoluer pour accepter la transformation viewport complète ou un objet équivalent unique. Il ne doit exister qu'un seul oracle screen↔Document.

La conversion inverse cible est conceptuellement :

```text
xDocument = (xScreen - translationX) / zoom
yDocument = (yScreen - translationY) / zoom
```

L'API exacte est libre, mais les interactions existantes doivent toutes continuer à passer par le même oracle.

### D4 — Zoom orienté curseur

Quand le zoom change sous le curseur, le point Document actuellement sous le curseur doit rester sous ce même point écran autant que possible. Cela implique de recalculer la translation du viewport en fonction de l'ancien zoom, du nouveau zoom et de la position écran du curseur.

Le bouton `zoomIn/zoomOut` peut utiliser un point d'ancrage déterministe (centre du viewport ou curseur si le dernier geste est pointer-based), mais une API de navigation orientée curseur doit exister pour les gestes pointer/wheel.

### D5 — Pan

Le pan est une translation du viewport uniquement. Il doit suivre le déplacement écran du pointeur sans changer les coordonnées Document. Le pan ne doit pas créer de commande Undo/Redo.

Le pan doit être déclenché uniquement sur un geste explicitement identifié comme navigation du fond (par exemple geste dédié configuré par le système), sans entrer en concurrence avec drag composant, marquee, waypoint, breadboard ou câblage.

### D6 — Reset

Une primitive de reset doit ramener le viewport à un état déterministe de référence : translation neutre et zoom de référence `1`.

### D7 — Fit-to-content

Une primitive générique doit pouvoir calculer les bounds de la scène visible/utile à partir des objets du Document et ajuster translation + zoom pour les contenir dans le viewport avec une marge définie. Les bounds doivent inclure au minimum les composants présents et les autres objets de scène déjà représentés de façon géométrique pertinente (fils/breadboard) lorsque leur géométrie est disponible.

Le fit ne modifie aucun objet Document.

### D8 — Fit-to-selection

Une primitive doit ajuster le viewport aux éléments actuellement sélectionnés. Si aucune sélection exploitable n'existe, la commande est un no-op déterministe et ne doit pas corrompre le viewport.

### D9 — Focus / centrage

Le ticket fournit la primitive réutilisable `centerOnRect` / `centerOnPoint` (nom libre) permettant de centrer une zone Document dans le viewport. Ce ticket ne doit pas introduire le focus UX/local zoom d'un composant ; MB-VIS-CANVAS-052 réutilisera ces primitives.

### D10 — Limites du zoom

Le ticket peut conserver les bornes actuelles tant qu'elles permettent les scénarios fit. Si elles doivent évoluer pour rendre `fit-to-content`/`fit-to-selection` fonctionnels, l'extension doit rester bornée, déterministe et explicitement testée. Aucun zoom infini ou valeur non finie n'est autorisé.

### D11 — Préservation des invariants

- Document = source de vérité.
- Zoom/pan = état de viewport uniquement.
- Géométrie électrique canonique inchangée.
- Une seule interaction pointer active.
- Drag/marquee/waypoint/Breadboard/wiring continuent à recevoir des coordonnées Document correctes après pan + zoom.
- Une navigation ne crée pas d'entrée History.
- Aucune branche par type de composant.

## E. RISQUES — [ANALYSE]

1. **Double modèle de transformation** : ne pas laisser certaines interactions utiliser seulement `zoom` alors que le viewport possède aussi une translation.
2. **Ordre CSS** : une mauvaise composition `translate/scale` peut introduire une translation dépendante du zoom. La relation mathématique screen = translation + document × zoom doit être verrouillée par tests.
3. **Conflit pointer** : un pan lancé en même temps qu'un drag ou un marquee violerait I-M1.
4. **Scroll navigateur** : `wheel` doit être annulé seulement si le geste est reconnu comme navigation Canvas ; le comportement de page ne doit pas être cassé arbitrairement en dehors du Canvas.
5. **Fit incorrect** : les bounds doivent être calculés dans l'espace Document, puis transformés par le viewport ; jamais l'inverse via pixels écran déjà transformés.
6. **History polluée** : aucune commande Document ne doit être émise pour pan/zoom/reset/fit/focus viewport.
7. **Régression 049** : toute évolution de `clientToCanvas()` doit préserver les tests zoom != 1 déjà validés et ajouter des cas combinant pan + zoom.
8. **Performance** : ce ticket ne doit pas tenter de résoudre le fan-out React identifié pour MB-VIS-CANVAS-051. L'état de viewport peut être centralisé dans l'architecture actuelle, mais la mesure et l'isolation de performance restent hors scope.

## F. FICHIERS TERRAIN — [FAIT]

Fichiers directement concernés ou candidats confirmés :

- `frontend/src/hooks/useCircuitState.js` — état et API de viewport, interactions globales ;
- `frontend/src/utils/geometry.js` — oracle screen↔Document à faire évoluer ;
- `frontend/src/canvas/SimulationCanvas.jsx` — application unique de la transformation viewport et interception des gestes de navigation ;
- `frontend/src/canvas/SimulationCanvas.css` — transformation/overflow/point d'origine ;
- `frontend/src/components/Navbar.jsx` — commandes viewport visibles ;
- `frontend/src/context/useCircuit.js` — exposition du viewport si nécessaire via le contrat existant ;
- `frontend/src/context/CircuitContext.jsx` — aucun changement structurel requis par principe, seulement si le contrat actuel l'impose ;
- utilitaires de sélection/géométrie existants, selon le besoin réel de calcul des bounds ;
- tests associés au canvas/geometry/interaction.

Les noms de nouveaux modules sont laissés libres si une primitive générique de viewport mérite un fichier dédié, mais une telle extraction doit rester limitée au périmètre du ticket.

## G. TESTS OBLIGATOIRES — [ANALYSE]

Les tests doivent prouver, au minimum :

1. pan horizontal et vertical ;
2. pan sans mutation du Document ;
3. zoom orienté curseur : le point Document sous le curseur reste invariant en coordonnées écran ;
4. reset viewport déterministe ;
5. fit-to-content sur scène non vide ;
6. fit-to-selection avec sélection valide ;
7. fit-to-selection sans sélection = no-op sûr ;
8. center/focus primitive sur point ou rectangle ;
9. conversion screen→Document correcte avec `zoom != 1` + translation ;
10. drag composant correct avec pan + zoom ;
11. marquee correct avec pan + zoom ;
12. waypoint correct avec pan + zoom ;
13. Breadboard correct avec pan + zoom ;
14. Sidebar drop/preview cohérent avec pan + zoom ;
15. navigation n'ajoute aucune entrée History ;
16. limites de zoom et valeurs non finies défendues ;
17. zoom = 1 + translation = 0 conserve le comportement de référence de 049 ;
18. aucun chemin concurrent screen→Document n'est réintroduit.

## H. PREUVE NAVIGATEUR — [ANALYSE]

La preuve navigateur doit couvrir sur une session fraîche au minimum :

- pan sur un circuit contenant plusieurs composants et un fil ;
- zoom avant/arrière avec curseur positionné au-dessus d'un composant, sans dérive du point visé ;
- reset ;
- fit-to-content ;
- sélection puis fit-to-selection ;
- drag d'un composant après combinaison pan + zoom ;
- marquee après combinaison pan + zoom ;
- absence d'erreurs/avertissements console liés au ticket.

## I. QUESTIONS OUVERTES

Aucune question ouverte bloquante n'est identifiée à ce stade.

### [QUESTION OUVERTE — NON BLOQUANTE]

Le nom et le découpage exact des primitives de viewport (`useViewport`, utilitaire pur, ou extension du hook existant) restent libres tant que la frontière Document/Viewport est respectée et qu'un seul modèle de transformation est utilisé. Le CSA n'impose pas un nom de fichier ; il impose le contrat.

## J. NON-OBJECTIFS TECHNIQUES

MB-VIS-CANVAS-050 ne doit pas introduire :

- zoom visuel local par composant ;
- focus UX complet d'un composant ;
- rotation/mirror/transformation de composant ;
- Inspector ;
- Component Library 2.0 ;
- Toolbar/Menu 2.0 complet ;
- refonte générale du contexte React/performance isolation de 051 ;
- nouveau backend de rendu, Canvas2D, WebGL ou 3D ;
- modification de la géométrie électrique canonique ;
- nouvelles règles de connectivité/simulation ;
- régénération ou agrandissement des assets raster ;
- refonte du breadboard au-delà des conséquences directes de navigation ;
- nouvelle commande métier dans History pour viewport.

## K. CRITÈRES DE SORTIE DU BLUEPRINT

Le Blueprint sera considéré exploitable lorsque l'agent peut implémenter le contrat sans inventer une nouvelle source de vérité, et lorsque les tests peuvent démontrer :

```text
Document inchangé
      ↑
pan / zoom / reset / fit / center
      ↓
viewport unique
      ↓
screen ↔ document unique
```

Les artefacts suivants forment avec ce Blueprint le contrat d'implémentation :

- `docs/pmo/tickets/MB-VIS-CANVAS-050.md`
- `docs/pmo/delivery-reports/MB-VIS-CANVAS-050-authority.md`
- `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`

## L. SOURCES

- `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
- `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-049.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-049-blueprint.md`
- `docs/pmo/delivery-reports/MB-VIS-CANVAS-049-delivery-report.md`
- `frontend/src/hooks/useCircuitState.js`
- `frontend/src/utils/geometry.js`
- `frontend/src/canvas/SimulationCanvas.jsx`
- `frontend/src/canvas/SimulationCanvas.css`
- `frontend/src/components/Navbar.jsx`

## M. DÉCISION CSA

**Blueprint MB-VIS-CANVAS-050 : VALIDÉ POUR PASSAGE AU TICKET PMO.**

Aucune question ouverte bloquante n'empêche la conception.