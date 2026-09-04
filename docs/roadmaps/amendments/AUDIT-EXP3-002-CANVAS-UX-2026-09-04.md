# AUDIT-EXP3-002 — Canvas / UX — 2026-09-04

## 1. Objet

Audit architectural ciblé après clôture de MB-VIS-COMP-037 (ARDUINO), afin de recalibrer EXP3 autour de l'expérience réelle du canvas et de la bibliothèque de composants.

Ce document ne constitue pas un Blueprint d'implémentation et n'autorise aucun nouveau ticket d'exécution. Il établit les constats, invariants, risques et découpage recommandé.

## 2. Base auditée

Référence fonctionnelle : commit `fa77dddc1a6fb619e71e01c31d9bd1878d559359` et état de branche observé lors de l'audit.

Fichiers examinés :

- `frontend/src/canvas/SimulationCanvas.jsx`
- `frontend/src/canvas/SimulationCanvas.css`
- `frontend/src/canvas/CircuitComponent.jsx`
- `frontend/src/canvas/CircuitComponent.css`
- `frontend/src/hooks/useCircuitState.js`
- `frontend/src/utils/geometry.js`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/Sidebar.css`
- `frontend/src/components/parts/PartRenderer.jsx`
- `frontend/src/visualization/defaultRegistrations.js`
- `docs/roadmaps/ROADMAP_PLATFORM.md`

## 3. Constat principal

Les 16 composants du catalogue ont maintenant un backend raster réaliste, mais l'expérience de visualisation reste limitée par le canvas et son système de navigation. Le problème observé sur ARDUINO est donc transversal : les assets sont de qualité supérieure à leur confort de lecture dans la scène.

## 4. Constats détaillés

### C1 — Zoom global uniquement

`SimulationCanvas` applique actuellement `scale(zoom)` à une couche unique. Le contexte expose seulement `zoom`, `zoomIn()` et `zoomOut()`. Les niveaux sont bornés de `0.5` à `2.0` par pas de `0.1`.

Impact : impossible de conserver une vue globale compacte tout en agrandissant uniquement un composant pour inspecter ses inscriptions, contacts ou pins.

### C2 — Absence de Component Focus / Local Zoom

Aucune capacité canonique de focus, fit-to-selection ou échelle visuelle locale d'un composant n'existe actuellement dans l'état ou dans le contrat de rendu.

Impact : la lisibilité dépend exclusivement du zoom global.

### C3 — Risque de divergence des systèmes de coordonnées à zoom != 1

`geometry.js::clientToCanvas()` retourne actuellement la différence brute entre coordonnées client et origine du canvas. Les chemins de placement depuis la Sidebar appliquent explicitement `/ zoom` dans `SimulationCanvas.jsx`, alors que la logique de drag/marquee du hook consomme `clientToCanvas()` sans conversion inverse de zoom.

Conclusion d'audit : le modèle de coordonnées n'est pas encore suffisamment explicite pour supporter un zoom local en toute sécurité. Le futur ticket Canvas doit établir une conversion de coordonnées canonique distinguant au minimum viewport, canvas/document et espace visuel local.

Ceci est un RISQUE architectural à traiter, pas une autorisation de réécrire immédiatement `geometry.js`.

### C4 — Les composants ont une boîte visuelle fixe issue du registre

`CircuitComponent` utilise `def.width` / `def.height` pour la taille du wrapper et pour le rendu. La couche visuelle raster remplit cette boîte. Il n'existe pas de notion déclarative de facteur d'échelle local.

Impact : l'ajout d'un zoom local doit être conçu comme une capacité de présentation/navigation, et non comme une modification des dimensions canoniques du composant.

### C5 — Pins et géométrie sont déjà séparables

La présentation des pins peut être projetée indépendamment de la géométrie électrique. Le mécanisme existe déjà pour LED, NPN_TRANSISTOR et POWER et vient d'être utilisé pour ARDUINO.

Conséquence : le futur zoom/focus peut préserver les coordonnées électriques et n'agir que sur la présentation et les transformations de viewport.

### C6 — Le hit-test / drag doit rester cohérent avec le zoom

Le wrapper `.circuit-component` reste l'élément interactif et le raster ne porte pas les gestionnaires. C'est la bonne frontière.

Cependant, un zoom local doit garantir que sélection, drag, pin-click et câblage restent alignés avec le même espace de coordonnées. Le futur ticket doit donc tester explicitement hit-test et interaction à plusieurs échelles.

### C7 — Toolbar actuelle trop minimale

`Navbar.jsx` expose essentiellement Nouveau, Ouvrir, Sauvegarder, Simuler, Arrêter, Zoom +, Zoom -, Paramètres.

Impact : les fonctions d'affichage et de navigation ne sont pas regroupées et il n'existe pas de surface UI pour focus, fit, reset ou affichage contextuel.

### C8 — Sidebar actuelle = palette linéaire

`Sidebar.jsx` parcourt directement `PALETTE_ITEMS` et affiche essentiellement icône/label. `Sidebar.css` prévoit uniquement une colonne fixe de 220px avec défilement interne de la liste.

Seul LED bénéficie actuellement d'un aperçu utilisant son renderer ; les autres composants restent représentés par leur icône/emoji dans la palette.

Impact : la bibliothèque n'exploite pas encore le système d'assets réalistes construit pour le canvas.

### C9 — Bibliothèque sans recherche/catégories/filtres

Aucun mécanisme de recherche, catégories, favoris, récents ou filtrage n'est présent dans la Sidebar actuelle.

Impact : le catalogue devient rapidement difficile à parcourir à mesure que le nombre de composants augmente.

### C10 — Absence d'inspecteur composant

Aucun panneau contextuel dédié ne présente actuellement les informations/transformations d'un composant sélectionné.

### C11 — Profondeur et feedback restent rudimentaires

Le wrapper générique porte encore un modèle simple de sélection, ombre et état visuel. La phase de profondeur/feedback doit être traitée après stabilisation de la navigation canvas afin de ne pas superposer deux modèles d'interaction.

## 5. Invariants à verrouiller

1. La géométrie électrique canonique reste la source de vérité.
2. Le zoom global ne doit pas modifier les coordonnées électriques.
3. Le zoom local ne doit pas modifier `component.x/y`, `def.width/height` ni les pins canoniques.
4. Les fils doivent rester attachés aux mêmes références logiques après tout changement de zoom/focus.
5. Sélection, drag, pin-click, marquee et câblage doivent fonctionner dans le même modèle de coordonnées.
6. Les assets ne sont pas redimensionnés ni régénérés pour compenser une faiblesse du canvas.
7. Aucun branchement central `type === ...` ne doit être ajouté pour corriger l'affichage d'un composant particulier.
8. La bibliothèque et le canvas doivent pouvoir consommer la même identité de présentation/asset.
9. Le système doit rester compatible avec les composants raster existants et les composants SVG historiques éventuels jusqu'au basculement complet du pipeline concerné.
10. Toute évolution architecturale significative du système de coordonnées ou du workspace doit être explicitement documentée et validée par le CSA.

## 6. Découpage recommandé des tickets

### T1 — `MB-VIS-CANVAS-043`
**Canvas Navigation & Component Focus**

Périmètre :
- zoom global cohérent ;
- reset 100 % ;
- pan ;
- fit-to-content ;
- fit-to-selection ;
- focus composant ;
- local zoom/focus visuel ;
- modèle de coordonnées explicite ;
- interaction cohérente à plusieurs zooms.

### T2 — `MB-VIS-CONTACT-044`
**Contacts & Pin Interaction**

Périmètre :
- lisibilité des contacts ;
- hitbox ;
- point d'ancrage visuel ;
- raccordement à toutes les échelles ;
- validation transversale des 16 composants.

### T3 — `MB-VIS-WIRE-045`
**Wire Visual System**

Périmètre :
- géométrie ;
- épaisseur ;
- routage ;
- jonctions ;
- comportement avec zoom global/local.

### T4 — `MB-VIS-WIRE-046`
**Dynamic Wire States**

Périmètre : restitution des états électriques et simulation.

### T5 — `MB-VIS-BREAD-047`
**Breadboard Visual & Assembly**

Périmètre : restitution, insertion et cohérence d'assemblage avec les nouveaux comportements de canvas.

### T6 — `MB-VIS-LIB-048`
**Component Library 2.0**

Périmètre :
- recherche ;
- catégories ;
- filtres ;
- cartes/aperçus réels ;
- drag & drop ;
- clic d'ajout ;
- récents/favoris si retenus par Blueprint ;
- extensibilité du catalogue.

### T7 — `MB-VIS-UI-049`
**Laboratory Toolbar 2.0**

Périmètre : Fichier / Édition / Affichage / Composants / Câblage / Simulation / Outils, plus actions contextuelles.

### T8 — `MB-VIS-UI-050`
**Component Inspector**

Périmètre : informations et propriétés visuelles/contextuelles du composant sélectionné, sans seconde source de vérité métier.

### T9 — `MB-VIS-INTERACTION-051`
**Component Transform**

Périmètre : rotation, miroir et transformations visuelles contrôlées, après stabilisation du zoom/focus.

### T10 — `MB-VIS-STATE-052`
**Component Visual States**

Périmètre : restitution dynamique des états de simulation.

### T11 — `MB-VIS-DEPTH-053`
**Depth & Interaction Feedback**

Périmètre : ombres, profondeur, hover, sélection, focus et feedback.

### T12 — `MB-VIS-LAB-054`
**Laboratory Workspace**

Périmètre : composition finale Sidebar / Canvas / Inspector / Toolbar / Status.

### T13 — `MB-VIS-QA-055`
**Visual Regression & Benchmark Gate**

Périmètre : captures, comparaisons, zooms, interactions, 16 composants, bibliothèque, canvas et absence de régression.

### T14 — `MB-VIS-TINKERCAD-056`
**Tinkercad Level 1 Gate**

Jalon comparatif et décision explicite avant EXP4.

## 7. Ordre recommandé

```text
AUDIT-EXP3-002 ✅
        ↓
CANVAS-043
        ↓
CONTACT-044
        ↓
WIRE-045
        ↓
WIRE-046
        ↓
BREAD-047
        ↓
LIB-048
        ↓
UI-049
        ↓
UI-050
        ↓
INTERACTION-051
        ↓
STATE-052
        ↓
DEPTH-053
        ↓
LAB-054
        ↓
QA-055
        ↓
TINKERCAD-056
        ↓
EXP4 — Dépasser Tinkercad
```

## 8. Décision CSA

- MB-VIS-COMP-037 ARDUINO : clôturé/validé séparément.
- Aucun changement d'asset ARDUINO requis au titre de cet audit.
- Le problème de taille/lisibilité est reclassé comme capacité de Canvas/UX transversale.
- Aucun ticket d'implémentation Canvas ne doit être lancé avant production et validation d'un Blueprint dédié à `MB-VIS-CANVAS-043`.
- Les nouveaux identifiants proposés ci-dessus remplacent conceptuellement le sous-découpage correspondant des anciennes séquences historiques, mais la consolidation de `ROADMAP_PLATFORM.md` doit conserver la traçabilité des identifiants historiques.
