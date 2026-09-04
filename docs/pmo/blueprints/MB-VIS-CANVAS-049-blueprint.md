# MB-VIS-CANVAS-049 — Execution Blueprint

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
|---|---|
| Blueprint-ID | `MB-VIS-CANVAS-049-blueprint` |
| Ticket-ID | `MB-VIS-CANVAS-049` |
| Commit analysé | `fa77dddc1a6fb619e71e01c31d9bd1878d559359` |
| Date de production | `2026-09-05` |
| Auteur | `CSA consolidation basée sur EXP3-RECALAGE-002` |
| Statut | `PRÊT_POUR_CONCEPTION` |

## B. SYNTHÈSE POUR L'AGENT D'IMPLÉMENTATION

Le Canvas actuel utilise un zoom global CSS sur une couche commune. Le dépôt contient déjà deux comportements distincts de conversion des coordonnées : certains chemins compensent le zoom et d'autres non.

Le point d'entrée recommandé est `utils/geometry.js::clientToCanvas()`, puis le pipeline d'interactions de `useCircuitState.js`, `SimulationCanvas.jsx` et `wires/WiresLayer.jsx`.

Le pattern à réutiliser est la centralisation d'une seule conversion écran→document et la séparation existante entre géométrie canonique du Document et présentation visuelle.

## C. CONTEXTE TECHNIQUE — [FAIT]

### C1 — Zoom actuel

`useCircuitState.js` conserve une valeur `zoom` unique, bornée actuellement entre `0.5` et `2.0` avec un pas de `0.1`.

`SimulationCanvas.jsx` applique le zoom via un unique `transform: scale(${zoom})` sur `simulation-canvas__zoom-layer`. Grille, breadboard, fils, composants et marquee sont descendants de cette couche.

### C2 — Conversion écran→document

`utils/geometry.js::clientToCanvas(event, canvasRect)` retourne actuellement :

```js
{
  x: event.clientX - canvasRect.left,
  y: event.clientY - canvasRect.top,
}
```

La fonction ne reçoit pas le zoom et ne le compense pas.

### C3 — Chemins déjà zoom-aware

Le dépôt compense déjà le zoom dans le dépôt initial Sidebar→Canvas et dans l'aperçu de drag Sidebar, via une division par `zoom`.

Cela constitue le comportement de référence à harmoniser, plutôt qu'une seconde formule indépendante.

### C4 — Interactions utilisant le chemin non compensé

Le rapport `EXP3-RECALAGE-002` établit que `clientToCanvas()` est utilisé pour :

- drag composant ;
- marquee ;
- drag de waypoint de fil ;
- clic Canvas utilisé pour l'insertion de waypoint.

Le même rapport indique que le déplacement du Breadboard réutilise la même machine de drag et hérite donc du problème.

### C5 — Géométrie canonique

`getPinPosition(component, pinDef)` reste la fonction canonique : `component.x/y + pinDef.dx/dy`. Cette géométrie est indépendante du zoom et ne doit pas être recalculée à partir de la valeur de zoom.

### C6 — Historique et preview

Le drag composant utilise un preview de positions pendant l'interaction, puis une mutation historisée à la fin de l'interaction. Le contrat I-H10 impose une seule action d'historique par interaction utilisateur.

### C7 — Architecture de rendu

Le renderer raster reçoit des coordonnées en unités Canvas et le zoom est appliqué à l'extérieur par la couche de zoom globale. Le contrat visuel interdit les corrections de géométrie par zoom dans les PartRenderer.

## D. DÉPENDANCES & IMPACT — [FAIT]

Zones concernées par le ticket :

- conversion de coordonnées Canvas ;
- drag composant ;
- marquee ;
- waypoint drag / insertion ;
- drag Breadboard ;
- Sidebar drop/preview pour alignement du modèle ;
- tests géométriques et tests d'interaction ;
- preuve navigateur.

Tests existants mentionnés par l'audit :

- `geometryPinCanonical(Guard).test.js` ;
- `WiresLayer.test.jsx` ;
- `MoveComponentHandler.test.js` ;
- `MoveComponentMutationChannel.integration.test.jsx` ;
- tests d'intégration Breadboard ;
- `visualContract.test.js`.

L'angle mort identifié est l'absence de scénario d'interaction exécuté à `zoom != 1`.

## E. SIGNAUX D'ATTENTION — [ANALYSE]

1. Le défaut observé est transversal : corriger uniquement le drag composant serait insuffisant.
2. Il faut éviter de confondre conversion d'interaction et transform visuel : le renderer ne doit pas devenir zoom-aware.
3. Une correction de coordonnées doit préserver le snapping, qui travaille dans le repère document.
4. Le marquee doit être cohérent entre rectangle affiché et rectangle logique ; il faut valider les deux directions du drag.
5. La correction doit éviter l'introduction d'un second calcul inline concurrent avec la fonction commune.
6. Toute évolution future vers pan ou focus local dépendra de cette fondation ; la représentation actuelle doit donc rester extensible sans imposer leur implémentation immédiate.

## F. CONTRAINTES DE CONCEPTION

| Champ | Valeur |
|---|---|
| Niveau de liberté | `CONCEPTION` |
| Mode d'exécution recommandé | `Implémentation` |
| Contraintes | Une seule sémantique écran→document ; aucun changement de géométrie canonique ; aucun calcul de zoom dans PartRenderer ; préserver History et snapping |

### Décision CSA — règle de coordonnées

Le repère de vérité pour les interactions est le **repère Document/Canvas**. Toute entrée de coordonnées provenant du viewport doit être convertie vers ce repère avant d'alimenter les opérations de sélection, drag, waypoint ou snapping.

Le zoom est un facteur de projection entre Document et écran ; il ne modifie jamais les coordonnées du Document.

## G. QUESTIONS OUVERTES

### [QUESTION OUVERTE — NON BLOQUANTE]

**Question :** la signature définitive de l'utilitaire de conversion doit-elle porter explicitement `zoom` comme argument, ou consommer un objet de viewport futur ?

**Arbitrage CSA (2026-09-05) : NON BLOQUANTE.**

Pour ce ticket, l'implémentation est libre de choisir une signature compatible avec l'architecture réelle, à condition qu'elle produise une conversion déterministe et centralisée et qu'elle soit facilement extensible vers le futur viewport. Aucun modèle complet de pan/local focus ne doit être introduit dans ce ticket uniquement pour résoudre cette question.

Aucune autre question ouverte bloquante n'est identifiée.

## H. CRITÈRES TECHNIQUES DE SORTIE

Le Blueprint est considéré réalisé lorsque :

- un seul modèle de conversion écran→document est utilisé pour les interactions couvertes ;
- drag, marquee, waypoint et Breadboard sont corrects à plusieurs zooms ;
- Sidebar drop/preview et interactions Canvas partagent la même sémantique ;
- aucune géométrie électrique canonique n'est modifiée ;
- les tests d'interaction à `zoom != 1` existent et échouent si la compensation disparaît ;
- aucune nouvelle branche centrale par type de composant n'est introduite ;
- les invariants History / snapping / sélection restent valides ;
- build/typecheck et diff-check restent propres ;
- preuve navigateur reproductible fournie.

## I. NON-OBJECTIFS TECHNIQUES

Ce ticket ne doit pas introduire :

- pan ;
- fit-to-content ;
- fit-to-selection ;
- focus composant ;
- zoom local ;
- rotation ;
- échelle visuelle par composant ;
- découpage complet du contexte React ;
- refonte de Sidebar/Navbar/Inspector ;
- changement de backend de rendu.

## J. SOURCES

- `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
- `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
- Audit `EXP3-RECALAGE-002 — Canvas, Zoom & Bibliothèque de composants`
- `frontend/src/utils/geometry.js`
- `frontend/src/canvas/SimulationCanvas.jsx`
- `frontend/src/hooks/useCircuitState.js`
- `frontend/src/components/Sidebar.jsx`

## K. GO

**CSA GO — IMPLÉMENTATION AUTORISÉE.**

L'autorisation porte exclusivement sur `MB-VIS-CANVAS-049`. Toute extension de périmètre vers 050+ nécessite une nouvelle décision CSA.