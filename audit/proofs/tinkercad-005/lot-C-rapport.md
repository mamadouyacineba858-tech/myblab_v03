# MYBLAB-TINKERCAD-005-C — Rapport de qualification

**Verdict : `005-C NOT_CLOSED` — ne pas déclarer `CLOSED_PASS`.**
**Base :** `fa614d8` (`copilot/myblab-tinkercad-005-b`).
**Worktree :** `C:\bureau\_documents\bureau\_worktrees\myblab-005-c`.
**Branche :** `copilot/myblab-tinkercad-005-c`.

Le travail est isolé du dépôt de référence et de `codex/A13-VISUAL-CORR-004`. Aucun push, merge ou travail du lot D n'a été exécuté. Le verdict reste ouvert : la rotation demanderait une décision sur la géométrie électrique canonique, et le mandat réserve cette décision au CSA.

## C01–C10

| Critère | Résultat et preuve |
|---|---|
| C01 — Placement | **PASS.** Glisser-déposer HTML5 réel de la palette vers le canvas : un composant est posé au point ciblé. |
| C02 — Fils | **PASS.** Trois fils créés en cliquant successivement sur les broches ; la simulation DC s'active et la LED s'allume. |
| C03 — Breadboard | **PASS.** Ajout de deux cartes par l'interface, y compris à 390 px ; la topologie est couverte par `Breadboard.test.jsx` (27 tests), `breadboardMeasurementIntegration.test.js` (6) et `firmwareBreadboardBlink.integration.test.js` (2). |
| C04 — Voltmètre | **PASS.** Mesure réelle de 5,000 V entre +5 V et GND. Le marqueur V+ a été glissé de la broche +5 V à la broche A de la résistance ; l'affectation et l'étiquette suivent la broche et la lecture reste cohérente. |
| C05 — Ampèremètre série | **PASS.** Coupure entre une résistance 220 Ω et GND refermée par les deux bornes du banc : `22,727 mA`, cohérent avec `5/220 A`. Des bornes sur le même nœud donnent `SAME_NET`, sans courant affiché. Les trois tests transitoires ciblés (valide, `SAME_NET`, `OPEN_TERMINAL`) passent. |
| C06 — Multimètre | **PASS partiel.** Mode V interactif mesuré à 5 V ; le mode A s'active et reste vide avec la note « Choisissez un composant » quand aucune charge n'est disponible. Pas de preuve navigateur d'une lecture A issue du panneau multimètre dans cette session. |
| C07 — Oscilloscope | **PASS.** Sur une résistance pilotée par le GBF, CH1 mesure `−1,00 → +3,00 V` et estime `100,0 Hz`. L'échantillonnage provient du solveur live. |
| C08 — GBF | **PASS.** Réglage UI carré, 100 Hz, amplitude crête 2 V, offset 1 V ; valeur instantanée observée à 3 V. B08/B09 couvrent les formes d'onde et la chaîne RC au solveur. |
| C09 — Arduino | **PASS.** Éditeur ouvert sur une carte Arduino ; l'exemple LED intégrée D13 compile avec « Compilation réussie ». Tests de l'éditeur, Blink breadboard et firmware conservés. |
| C10 — Édition et responsive | **PARTIEL.** Déplacement souris réel, Delete puis Undo restaure le composant ; Undo/Redo UI fait passer les fils de 3 à 2 puis 3. Desktop/tablette/mobile sans débordement horizontal et canvas visible. **Rotation non faite** : `geometry.js::getPinPosition()` est la géométrie électrique canonique et le dépôt la déclare non rotative ; l'activer touche un contrat transversal protégé par des tests. Décision CSA nécessaire. |

## Preuves navigateur

Captures réalisées dans le navigateur intégré sur l'application Vite du worktree C :

- `screens/lot-C-desktop-final.png` — circuit DC et instruments, 1440 × 900 CSS px.
- `screens/lot-C-tablet-final.png` — disposition tablette, 820 × 1180 CSS px.
- `screens/lot-C-mobile-final.png` — canvas, palette et panneau instruments, 390 × 844 CSS px.
- `screens/lot-C-ammeter-final.png` — ampèremètre en série et lecture réelle.
- `screens/lot-C-generator-final.png` — réglages du GBF et sortie 3,000 V.
- `screens/lot-C-oscilloscope-final.png` — trace et statistiques CH1, −1 à +3 V, environ 100 Hz.

Les mesures géométriques constatées : desktop canvas 980 px de large, tablette 436 px, mobile 390 px ; `documentElement.scrollWidth` égale la largeur du viewport à ces trois résolutions. À 390 px, le panneau instruments reste sous l'en-tête et le bouton d'ajout de breadboard demeure cliquable. Les documents déjà présents avant le lot, dont les captures exploratoires non listées ci-dessus, n'ont pas été nettoyés.

## Vérifications

- Tests ciblés UI/instruments/breadboard/Arduino/mouvement/fils : **8 fichiers, 85 tests PASS**.
- Régression lot B : **13 tests PASS**, incluant B01–B10 et les gardes d'état.
- Ampèremètre transitoire : **3 tests PASS**, 18 autres cas du fichier ignorés par le filtre ciblé.
- Test dédié `ProbeOverlay.test.jsx` : **1 test PASS** (drag vers une broche et synchronisation de la mesure).
- Build TypeScript/Vite final : **PASS** (`tsc -b` + Vite, 282 modules), chunk principal 663,84 kB avec avertissement de taille. Le build a pris 3 min 46 s ; son résultat a été livré par le terminal avec retard, mais l'exécution s'est terminée avec succès.
- ESLint complet : **FAIL, 153 erreurs et 4 avertissements**, même total que la baseline documentée dans le rapport B. Le lint ciblé des nouveaux fichiers `ProbeOverlay.jsx` et `ProbeOverlay.test.jsx` : **PASS**. Le lint ciblé des fichiers historiques touchés remonte leurs imports React inutilisés déjà connus.
- CSS ignoré par la configuration ESLint (avertissement « no matching configuration »), sans erreur CSS rapportée.

## Fichiers du lot

- `frontend/src/instruments/ProbeOverlay.jsx` et son test : marqueurs colorés, sélection par glisser vers une broche, raccordés au store d'instruments existant.
- `frontend/src/instruments/InstrumentsPanel.jsx` : Voltmètre raccordé au store partagé des sondes.
- `frontend/src/instruments/InstrumentsPanel.css` : marqueurs et placement du panneau selon la largeur.
- `frontend/src/canvas/SimulationCanvas.jsx` : montage de la couche des sondes.
- `frontend/src/components/Navbar.jsx` : commandes Undo/Redo visibles, réutilisant History.
- `frontend/src/App.css` : disposition tablette/mobile, canvas, palette, breadboard et inspecteur accessibles.
- Captures finales citées dans `screens/`.

Un commit local contrôlé est créé dans le worktree isolé ; aucun push ni merge. Le SHA est donné dans le compte-rendu final de session. **Arrêt avant le lot D.**