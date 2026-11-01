# MYBLAB-TINKERCAD-004 — Rapport final

**Verdict : PARTIAL** (pas CLOSED_PASS : des critères obligatoires ne sont pas démontrés, voir §5).

## 1. Livré (code)
| Élément | Fichier | Preuve |
|---|---|---|
| Référence GND Arduino (registre Open/Closed, sans branche de type) | `simulator/groundReferenceRegistry.js`, `resolution.js` | `arduinoGndReference.integration.test.js` (2), `arduinoGpioFallback.test.js` |
| Solveur DC nodal (MNA) : sources, R, potentiomètre, LED/diode (itération on/off), interrupteurs/boutons (via nets), Thévenin des sorties D0–D13, court-circuit, nœud flottant | `simulator/nodalDcSolver.js` | `nodalDcSolver.test.js` : 11 tests contre calculs à la main |
| Instruments : voltmètre, ampèremètre, multimètre (V/A), oscilloscope (échantillon par pas de simulation de 16 ms, fenêtres 160 ms–10 s) | `instruments/InstrumentsPanel.jsx/.css`, `Navbar.jsx` | navigateur, §3 |
| Correctif : boucle « Maximum update depth » provoquée par l'oscilloscope (setState dans l'effet) → acquisition en ref + rafraîchissement 100 ms | `InstrumentsPanel.jsx` | 0 erreur console après correctif |

## 2. Tests automatisés (journaux dans ce dossier)
- Vitest complet (`--pool=forks --maxWorkers=2 --minWorkers=1`) : **371 fichiers, 7085 tests, tous réussis**, 1021 s (`tests-full.log`).
- ESLint complet : exit 0 (`eslint.log`). Build de production : exit 0 (`build.log`).

## 3. Mesures navigateur (réelles, lues dans le panneau, issues du solveur)
Scénario A (pile 9 V → 220 Ω → LED ; Vf 2 V, Ron 10 Ω supposés) :
| Grandeur | Mesuré | Calcul |
|---|---|---|
| I(R) = I(LED) | 30,435 mA | 30,435 mA |
| V(R) | 6,696 V | 6,696 V |
| V(LED) | 2,304 V | 2,304 V |
| V pile | 9 V | 9 V |

Scénario D (Arduino Blink, D2 → 220 Ω → LED → **GND Arduino**, 500 ms) :
- LED observée alternant « allumée/éteinte » ; GND Arduino sert de retour (avant correctif : indéterminé).
- Oscilloscope sur D2 : Vmin 0,00 V, Vmax 4,706 V. Calcul : 5 − 25 Ω × (5−2)/(25+220+10) = 4,706 V ✔.
- Oscilloscope sur l'anode LED : Vmax 2,118 V ; calcul 2 + 10 × 11,76 mA = 2,118 V ✔.
- Captures : `screens/A-led-multimeter-1440.png`, `screens/D-blink-scope.png`.

## 4. Scénarios
| Scén. | Résultat | Preuve |
|---|---|---|
| A LED | PASS (mesures ci-dessus) | navigateur |
| B Interrupteur | PASS (003 navigateur) + solveur ouvert/fermé testé | 003, `nodalDcSolver.test.js` |
| C Breadboard | PASS (003 navigateur, continuité) ; non re-mesuré avec instruments | 003 |
| D Arduino Blink | PASS (LED + oscilloscope) ; temps du scope = temps simulé (pas 16 ms) | ci-dessus |
| E Mesure | PASS sur A et D ; instruments par sélecteur de broches | ci-dessus |
| F Sauvegarde/réouverture | PASS (003 navigateur) ; paramètres de l'instrument non persistés (état d'UI) | 003 |
| G Undo/Redo | PASS composants (navigateur 003) ; fils/suppression : couverts par tests automatisés (AddWire/DeleteCommand/HistoryManager), non rejoués en navigateur | tests |
| H Responsive 5 tailles | PARTIEL : métriques mesurées (aucun débordement horizontal de page, panneau dans la fenêtre à 1024/768/414/320) ; navbar défile horizontalement sous 768 px (design existant) | `screens/resp-*.png` |

Réserve : le harnais navigateur a rétréci le viewport (477×298) pendant le 1440×900 ; les captures responsive ne sont donc pas des preuves visuelles fiables, seules les métriques DOM le sont.

## 5. Critères non démontrés / limitations
- Instruments par **sélecteurs**, pas de sondes placées sur le canvas ni ampèremètre inséré en série (Tinkercad : sondes).
- Modèles supposés : LED Vf 2 V / Ron 10 Ω, diode 0,7 V, potentiomètre (sens du curseur supposé), sortie Arduino 25 Ω. Non qualifiés physiquement.
- Transitoires non résolus : condensateur ouvert en DC ; pas de RC/RL temporel, transistors, ampli-op, logique dans le solveur (listés `unqualifiedTypes`).
- Arduino : 5V non modélisé comme source ; 3,3V, VIN, A0–A5 visuels ; pas de PWM/analogRead ; compilateur = sous-ensemble (pinMode, digitalWrite/Read, delay).
- Pas de générateur de signaux. Oscilloscope 1 voie.
- Undo/Redo fils/suppression et responsive visuel non rejoués en navigateur.
- Équivalence Tinkercad **non** démontrée.

## 6. Comparaison Tinkercad Circuits
| Fonction | Statut |
|---|---|
| Palette 60 composants, recherche, familles | FONCTIONNEL |
| Câblage broche à broche, breadboard, rails | FONCTIONNEL |
| Simulation LED/R/pile/interrupteur avec tensions et courants | FONCTIONNEL (modèles simples) |
| Multimètre/voltmètre/ampèremètre | PARTIEL (sélecteurs, pas de sondes) |
| Oscilloscope | PARTIEL (1 voie, DC/numérique, pas de transitoires analogiques) |
| Arduino UNO Blink + éditeur | FONCTIONNEL (sous-ensemble) |
| Arduino PWM / analogRead / Serial / bibliothèques | ABSENT |
| Transistors, ampli-op, condensateur transitoire | PARTIEL / NON TESTÉ dans le solveur |
| Générateur de fonctions | ABSENT |
| Sauvegarde/réouverture, Undo/Redo | FONCTIONNEL |
| Responsive tablette/mobile | PARTIEL |

## 7. Dernier grand bloc recommandé
Solveur transitoire (RC/RL, transistors, ampli-op) + sondes placées sur le canvas + PWM/analogRead + générateur de signaux.

## 8. Git
Voir `git-commits.txt`. Aucun push/merge. Les ~355 entrées historiques sont conservées intactes, non indexées.
Sauvegarde préalable : `session-state/.../files/MYBLAB-TINKERCAD-003-baseline`.
