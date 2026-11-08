# MYBLAB-TINKERCAD-005 — Rapport final unique

**Branche** : `safe-001/tinkercad-001-stabilisation` — **Verdict : PARTIAL** (justification section 7).

## 1. Livré (réellement exécuté)

| Élément | Fichiers principaux |
|---|---|
| Solveur transitoire (Euler implicite : R, C, L, source, GBF, LED/diode, NPN, LM358P, pins Arduino) | `simulator/transientSolver.js` (commit `639cd95`, 21 tests analytiques) |
| Arduino : `analogWrite` (PWM 3/5/6/9/10/11), `analogRead(A0..A5)` 10 bits / 5 V, broches A0–A5 réelles, 5 V | `arduino/firmware/firmwareCompiler.js`, `firmwareExecutor.js`, `simulator/arduino/arduinoPinTelemetry.js`, `simulationRuntimeIntegration.js`, `componentDefinitions.js`, `canonicalRegistry.js`, `manifest.json` |
| Session transitoire branchée à l'app + oscilloscope 2 voies | `instruments/liveSimulation.js`, `LiveSimulationDriver.jsx`, `InstrumentsLive.jsx` |
| Générateur de signaux (forme, fréquence, amplitude, offset, rapport cyclique) | onglet « Générateur » |
| Sondes : placement par clic sur une broche du canvas (🎯 Pointer) ou liste ; voltmètre différentiel ; ampèremètre série | onglet « Sondes », `instrumentsStore.js`, `useCircuitState.js` (`onPinClick`) |
| Persistance des instruments dans export/import, effacée par « Nouveau » | `useCircuitState.js` |
| CSS responsive du panneau | `InstrumentsPanel.css` |

## 2. Résultats physiques observés dans l'interface (Chrome, serveur Vite)

| Scénario | Mesuré (oscilloscope UI) | Référence analytique | Écart |
|---|---|---|---|
| RC, GBF sinus 1 kHz 2 V, 1 kΩ / 159 nF | CH1 ±1,37 V, CH2 ±2,00 V, f ≈ 1000 Hz | 1,414 V (|H| = 0,707) | −3 % (Euler implicite, 50 pas/période) |
| RL, 20 Hz carré ±2 V, 10 Ω / 0,1 H | VL ±3,66 V, VR ±1,69 V | transitoire L/R = 10 ms ; régime établi VR ≈ 1,7 V | cohérent |
| Blink D2→220 Ω→LED | 0–4,71 V, LED 2,12 V, f ≈ 1,0 Hz | 4,69 V ; Vf+Ron·I = 2,12 V | < 1 % |
| PWM D9 `analogWrite(9,64)` → 1 kΩ/10 µF | centre 1,255 V (bande 1,16–1,35 V), f ≈ 489,9 Hz | 1,255 V ; 490 Hz | < 0,1 % |
| analogRead, pont 1k/3k | A0 = 3,75 V ; pont bas : 1,25 V ; D13 5 V / 0 V | 3,75 V / 1,25 V | 0 |
| NPN commutateur Rb 10k Rc 1k | Vce = 0,205 V, Vbe = 0,704 V | saturation | cohérent |
| LM358P suiveur, 2,5 V | OUT = 2,4987 V | 2,5 V | −0,05 % |
| DC / pile → R → LED | solveur DC (mission 004) | — | qualifié en 004 |

0 erreur console sur la série finale. Les chiffres proviennent du panneau `[data-testid=scope-stats]`, alimenté par le moteur.

## 3. Persistance, ergonomie (navigateur)

- Sauvegarder → Nouveau (instruments vidés : « CH1 — ») → Ouvrir : composants (2), fils (1), générateur, sondes, base de temps (5 ms) restaurés ; la mesure ±1,37/±2,00 V se reproduit. Le JSON sauvegardé (1406 octets) a été capturé en mémoire via un hook sur `URL.createObjectURL` ; il n'est pas archivé en fichier.
- Pointer + clic sur broche B de la résistance → sonde CH1 affecte « Résistance · B ».
- Responsive (mesures DOM, 1440/1024/768/414/320) : pas de débordement horizontal du document ni du panneau, 0 cible tactile < 28 px. Le panneau fait 360 px (≥768) puis pleine largeur − 12 px.
- **Non démontré** : Annuler/Rétablir des modifications d'instruments (non branché à l'historique, voir limites). Les captures d'écran de ce banc sont peu fiables (fenêtre réelle ≈ 477×298) : la preuve responsive est métrique, pas visuelle (`screens/rc-scope-1khz.png` est tronquée).

## 4. Tests

- `npm run lint` : PASS. `npm run build` : PASS.
- Vitest complet (`--pool=forks --maxWorkers=2`) : **373 fichiers, 7116 tests PASS**, exit 0 (`tests-full.log`).
- Nouveaux tests : `instrumentsLive.test.js` (9) + `transientSolver.test.js` (21). Les tests unitaires ne sont pas présentés comme validation d'interface ; la validation UI est la section 2.

## 5. Sous-ensemble Arduino supporté

`pinMode`, `digitalWrite`, `digitalRead`, `analogWrite(broche PWM, 0..255 littéral ou variable)`, `analogRead(A0..A5)` vers un `int` (redéclaré à chaque `loop`), `delay(littéral)`, variables `int`, arithmétique à deux opérandes, `if/for/while` déjà pris en charge. Non supporté : Serial, bibliothèques, flottants, `millis`. Broche non PWM → `UNSUPPORTED_PIN`, valeur > 255 → `INVALID_LEVEL`.

## 6. Limites scientifiques

- Euler implicite : amortissement numérique, erreur ≈ 3 % à 50 pas/période ; échantillon scope ≥ 20 µs, tampon 131072 points (≈ 2,6 s).
- Temps réel : ≈ 14 ms de calcul par trame à 1 kHz ; au-delà la simulation ralentit.
- NPN/LM358P : modèles linéaires par morceaux (β 100, Vbe 0,7 V ; gain 1e5, saturation Vcc−1,5 V). Ni bande passante, ni slew-rate, ni courant d'alimentation.
- PWM exact uniquement dans la session transitoire ; le moteur numérique ne transporte que HIGH/LOW.
- Le GBF est un panneau, pas un composant posable ; les sondes passent par « armer puis cliquer ».
- Le panneau DC historique (Voltmètre/Ampèremètre/Multimètre) ignore le LM358P et l'indique.
- Les paramètres d'instruments ne sont pas dans la pile Annuler/Rétablir.

## 7. Verdict PARTIAL — raisons

Tous les scénarios obligatoires (DC, RC, RL, Blink, PWM, analogRead, transistor, LM358P) sont démontrés dans l'interface, tests/lint/build PASS. Restent non démontrés : Annuler/Rétablir des instruments, captures fiables par taille, générateur comme composant, déplacement de sondes par glisser-déposer (sélection par clic seulement). D'où PARTIAL, non CLOSED_PASS.

## 8. Comparaison MYBLAB / Tinkercad Circuits

| Fonction | État |
|---|---|
| Placement/câblage/breadboard | FONCTIONNEL (mission 003/004) |
| DC (tensions, courants) | FONCTIONNEL (domaine qualifié) |
| Transitoire RC/RL | FONCTIONNEL (−3 %) |
| Oscilloscope | FONCTIONNEL (2 voies, sans déclenchement avancé) |
| Générateur de signaux | PARTIEL (panneau, pas composant) |
| Multimètre/voltmètre/ampèremètre | FONCTIONNEL |
| Sondes sur canvas | PARTIEL (clic, pas de glisser) |
| Arduino Blink / PWM / analogRead | FONCTIONNEL (sous-ensemble) |
| Arduino complet (Serial, bibliothèques, millis) | ABSENT |
| Transistor / LM358P | PARTIEL (modèle statique) |
| Sauvegarde/réouverture avec instruments | FONCTIONNEL |
| Annuler/Rétablir instruments | ABSENT |
| Blocs de code, bibliothèque de 3000+ pièces, collaboration | ABSENT |
| Responsive visuel multi-tailles | PARTIEL (métriques seulement) |

MYBLAB n'est pas déclaré équivalent à Tinkercad.

## 9. Git

Voir `git-status-before.txt` / `git-status-after.txt`. Commits locaux : `639cd95` (solveur) + commits de cette session (voir `git-status-after.txt`). Fichiers historiques mêlés laissés non commités : `ArduinoCodeWorkspace*`, `ArduinoPinVisibility.test.jsx`, `ArduinoPart.raster.test.jsx` (hunks historiques + hunks A0–A5 mission), plus hunks historiques de `firmwareCompiler.js` / `ArduinoPart.jsx`. Aucun push, merge, reset ni clean.
