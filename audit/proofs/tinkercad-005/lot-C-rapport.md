# MYBLAB-TINKERCAD-005-C — Rapport de clôture

**Verdict : `PARTIAL` — ne pas déclarer `CLOSED_PASS`.**
**Base vérifiée :** `895208b` (`copilot/myblab-tinkercad-005-c`).
**Branche :** `copilot/myblab-tinkercad-005-c`.
**Serveur vérifié :** `http://127.0.0.1:4175` (frontend de ce worktree).

Le lot C a été repris depuis son commit existant, sans repartir de zéro. Aucun push, merge ni travail du lot D n'a été exécuté. Les captures non suivies qui existaient au début de la mission ont été préservées.

## Critères C01–C10

| Critère | Résultat et preuve |
|---|---|
| C01 — Sondes interactives | **PASS.** Dans l'interface, la sonde V+ a été glissée de la broche +5 V à la broche A de la résistance ; l'étiquette a suivi et la lecture est restée à 5,000 V. |
| C02 — Voltmètre et multimètre | **PASS.** Lectures issues du solveur DC : 5,000 V entre +5 V et GND, puis 2,130 V entre l'anode et la cathode de la LED allumée. |
| C03 — Ampèremètre en série | **PARTIEL.** Après ouverture du fil LED-cathode/GND, les bornes A et B ont été affectées à ces deux extrémités. Le solveur transitoire a déclaré le branchement valide et mesuré 13,043 mA. La LED reste toutefois visuellement éteinte alors que l'ampèremètre virtuel est censé refermer le circuit : la mesure est réelle, mais l'état visuel et la fermeture virtuelle ne sont pas cohérents. |
| C04 — Oscilloscope | **PASS.** Sur le circuit RC piloté en direct, CH1 a acquis les échantillons du solveur : 0,000024–1,999976 V, fréquence estimée à 2,000 Hz ; 2 073 pixels de trace verte ont été observés dans le canvas oscilloscope. |
| C05 — Générateur de signaux | **PASS.** Générateur activé dans l'interface, onde carrée, 2 Hz, amplitude crête 1 V et offset 1 V ; sa sortie réelle a alimenté le circuit RC et produit la courbe observée. |
| C06 — Breadboard et câblage | **PASS.** Breadboard ajoutée dans le navigateur. Circuit DC assemblé par clics de broches : alimentation 5 V → résistance 220 Ω → LED → GND, trois fils ; la LED s'est allumée en simulation. Un circuit RC distinct a aussi été câblé sur breadboard. |
| C07 — Annuler/Rétablir | **PASS.** Annuler a retiré le dernier fil (3 → 2) et éteint la LED ; Rétablir a restauré le fil (2 → 3) et rallumé la LED. |
| C08 — Sauvegarde et réouverture | **PARTIEL.** Les contrôles Sauvegarder/Ouvrir et les chemins export/import sont couverts par les tests d'interface. Le navigateur intégré n'a pas exposé de fichier enregistré sélectionnable ni de téléchargement exploitable ; une réouverture réelle du même fichier n'a donc pas été démontrée. |
| C09 — Interface responsive | **PASS.** Contrôle en navigateur à 1 440 px et à 390 × 844 px. Sur mobile, le canvas fait 390 px, le panneau instruments 378 px et `scrollWidth` reste à 390 px ; aucun débordement horizontal constaté. |
| C10 — Tests fonctionnels et non-régression | **PARTIEL.** 127 tests ciblés Lot C/régression passent (9 fichiers), ainsi que 3 tests ciblés du composant. La suite complète compte 7 110 tests réussis et 22 échecs dans 14 fichiers, portant notamment sur intégrité/budgets d'assets figés, attentes de pins Arduino, zoom de composants et rendu POWER ; ces fichiers ne sont pas touchés par le correctif C. |

## Preuves navigateur

Manipulations faites sur le serveur Vite de ce worktree, pas sur une instance du lot B. Les mesures et la courbe proviennent de l'application et de ses solveurs, pas d'une animation ou de valeurs injectées.

- `screens/lot-C-desktop-final.png` — preuve desktop antérieure du lot C.
- `screens/lot-C-ammeter-final.png` — preuve antérieure de l'ampèremètre série.
- `screens/lot-C-generator-final.png` — réglages du générateur.
- `screens/lot-C-oscilloscope-final.png` — trace et statistiques de l'oscilloscope.

Les captures de la session (circuit DC, mesures et charge/décharge RC en largeur desktop et mobile) ont été affichées directement dans le navigateur intégré et dans la conversation. Elles ne sont pas ajoutées au dépôt ; les captures antérieures suivies ci-dessus restent intactes.

## Correctif et vérifications

- `frontend/src/canvas/CircuitComponent.css` : les éléments `<picture>` des assets raster ne capturent plus les clics destinés aux broches. Le style calculé a été vérifié dans le navigateur ; le circuit a ensuite été câblé avec les contrôles de broche.
- Tests Lot C ciblés : **9 fichiers, 127 tests PASS**.
- Tests ciblés `CircuitComponent.interaction.test.jsx` : **3 tests PASS**.
- Suite complète : **375 fichiers ; 361 PASS, 14 en échec ; 7 110 PASS, 22 en échec sur 7 132**.
- Build `tsc -b && vite build` : **PASS**, 282 modules. Avertissement non bloquant : bundle principal 663,84 kB (seuil d'avertissement 500 kB).
- `git diff --check` : **PASS**.
- ESLint complet non relancé : le correctif est CSS-only ; le rapport antérieur signale 153 erreurs et 4 avertissements de baseline.

**Reste à lever pour `CLOSED_PASS` :** cohérence visuelle de la LED quand l'ampèremètre virtuel referme une coupure, round-trip fichier démontré dans un navigateur contrôlable, et résolution/qualification des 22 tests hors périmètre. Aucun changement de géométrie électrique canonique ni rotation n'a été introduit.
