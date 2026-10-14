# A16 — Audit complet de préparation Arduino UNO R3 à un programme Arduino de type Tinkercad

**Date : 2026-10-13. Statut : AUDIT STATIQUE EFFECTUÉ — FULL-SKETCH NOT READY.**
**Branche :** `codex/A13-VISUAL-CORR-004`. Aucune exécution navigateur, aucun nouveau test Vitest ni build revendiqué pour cet audit. La réussite de qualification Blink est rapportée par le fondateur; elle ne couvre pas le langage Arduino complet.

## 1. Verdict et critère produit
**NO-GO** pour annoncer « programme Arduino complet comme Tinkercad ». **GO** pour le sous-ensemble Blink, et pour une mission d'industrialisation Arduino ciblée. « Recevoir un programme complet » exige à la fois syntaxe Arduino/C++, compilation sûre, exécution déterministe, GPIO bidirectionnels, analogique/PWM, Serial, interruptions, timers, bibliothèques et intégration des périphériques électriques; la couverture Tinkercad exacte doit être évaluée séparément, sans promesse de parité intégrale.

## 2. Inventaire vérifié du dépôt
| Domaine | Preuve code | État |
|---|---|---|
| Éditeur, compiler/appliquer, exemple Blink D2 | `frontend/src/arduino/ui/ArduinoCodeWorkspace.jsx` | Présent, éditeur textarea; diagnostic de compilation; pas IDE complet |
| Persistance, Undo/Redo | `frontend/src/arduino/firmwareDefaults.js`, `frontend/src/core/handlers/component/UpdateArduinoFirmwareHandler.js` | Firmware source string par Arduino, historique |
| Parsing | `frontend/src/arduino/firmware/firmwareCompiler.js` | Parser à motifs d'instructions séparées par point-virgule, pas de grammaire C++ ni AST général |
| Fonctions | même fichier | Uniquement `void setup()` et `void loop()`; autres fonctions non exécutables |
| Instructions | même fichier | `pinMode(pin, OUTPUT)`, `digitalWrite(pin,HIGH/LOW)`, `delay(nombre littéral)` |
| Modes GPIO | même fichier | `INPUT`, `INPUT_PULLUP` refusés |
| Lecture GPIO | même fichier | `digitalRead()` refusé |
| Analogique | même fichier | `analogRead()` et `analogWrite()` refusés |
| Variables et structures | même fichier | Déclarations, affectations, expressions, if/else, for/while, fonctions utilisateur non compilées |
| Sérial | même fichier et `frontend/src/components/parts/ArduinoPart.jsx` | `Serial.*` refusé, LEDs TX/RX décoratives éteintes; pas de moniteur série dans cet éditeur |
| Bibliothèques | même fichier | `#include`, `Servo`, `Wire`, `SPI`, `LiquidCrystal` etc. hors subset |
| Mapping pins | `frontend/src/arduino/boards/boardCapabilities.js` et `frontend/src/arduino/firmware/boardPinMap.js` | D0..D13 déclarés DIGITAL_OUTPUT; aucune capacité analogique/input/PWM exposée au compilateur |
| Runtime IR | `frontend/src/arduino/firmware/firmwareExecutor.js` | PIN_MODE, DIGITAL_WRITE, DELAY; sorties seules |
| Temps | `frontend/src/arduino/firmware/firmwareRuntimeController.js` | Scheduler déterministe, delay suspend/reprend |
| Simulation bas niveau | `frontend/src/simulator/arduino/ArduinoSimulator.js` | digitalWrite + primitive analogWrite PWM conditionnée à une fréquence configurée; cette API ne signifie PAS prise en charge dans les sketches |
| Couplage électrique | `frontend/src/simulator/simulationRuntimeIntegration.js` et `frontend/src/utils/breadboardConnectivity.js` | GPIO et propagation électrique, Blink à travers breadboard testé |
| Surface visuelle | `frontend/src/components/parts/ArduinoPart.jsx` | UNO raster et broches D0..D13; seules certaines broches physiques sont actuellement des contacts électriques (D0..D13, 5V, GND) |

## 3. Écarts bloquants pour des programmes réalistes
**P0 — Compilateur/VM** : adopter un véritable frontend Arduino/C++ ou un sous-ensemble explicitement versionné beaucoup plus riche. Éviter `eval` / `new Function` et l'exécution directe de code utilisateur sur le thread UI. Découpler compilation, IR/bytecode, exécution sandboxée avec quotas d'instructions et watchdog.
**P0 — Entrées** : relier les niveaux du solveur à `digitalRead`, gérer `INPUT`, `INPUT_PULLUP`, état flottant/UNKNOWN, boutons et capteurs; ne pas inventer HIGH/LOW si le signal est indéterminé.
**P0 — GPIO/temps** : variables, constantes, opérateurs, conditions, boucles, fonctions, `millis()`, `micros()`, `delay()`, cadence et reprise déterministes. Tester absence de gel Canvas avec sketch infini.
**P1 — Analogique/PWM** : A0..A5 et ADC; PWM sur broches admissibles et fréquence/timers, exploiter la primitive existante sans déclarer une capacité sketch avant câblage complet.
**P1 — Serial** : Serial.begin/print/println/read/available, terminal avec buffers bornés, séparation RX/TX et logs d'erreur.
**P1 — Périphériques** : Servo, I2C/Wire, SPI, LCD, capteurs courants; qualification progressive par contrat de périphérique, pas acceptation fictive de bibliothèques.
**P1 — Expérience IDE** : affichage erreurs avec ligne, console, exemples multiples, sélection carte, état compilation/exécution, boutons Start/Stop/Reset, persistance de sketch.
**P2 — Fidélité UNO** : alimentation, courant/limites électriques, pullups, interruptions, EEPROM, timers, mémoire, baud, erreurs de câblage; documenter approximations.

## 4. Ordre de mission recommandé : grands blocs de bout en bout
**A17 — ARDUINO-CORE-REAL-SKETCH-001** : matrice de 10 sketches représentatifs (Blink, bouton, bouton+LED, PWM dimmer, potentiomètre, Serial, feu tricolore, fonctions/variables, boucle conditionnelle, servo) avec verdict réel par fonctionnalité; architecture compilateur/VM isolée, GPIO bidirectionnels et temps déterministe; premier lot de programmes réellement exécutables de bout en bout; tests anti-régression, build, Canvas.
**A18 — ARDUINO-IO-PERIPHERALS-001** : ADC/PWM, Serial Monitor, périphériques et bibliothèques qualifiés par scénarios.
**A19 — ARDUINO-PROGRAM-COMPAT-001** : corpus de sketches Tinkercad-like, diagnostics de compatibilité, limites documentées, tests sous charge et robustesse.

## 5. Critères de GO de la cible immédiate
- Aucun sketch accepté si des instructions sont ignorées; erreurs explicites et traçables.
- Tests fonctionnels complets sketch -> GPIO/ADC/Serial -> solveur -> composant -> rendu.
- Aucun gel du navigateur, quotas d'exécution, gestion des boucles infinies, démarrage/arrêt/reprise propres.
- Pas de régression Blink, breadboard, multi-Arduino, sauvegarde, Undo/Redo, 200 % initial.
- Documentation publique des capacités et des limites; ne pas promettre l'ensemble des bibliothèques Arduino/Tinkercad sans preuves.

## 6. Décision CSA
**Arduino UNO R3 : NON PRÊT pour un programme Arduino complet.** Architecture existante intéressante et réutilisable, mais son compilateur V1 constitue le verrou majeur. La prochaine mission doit être une **extension structurante du moteur de programmation**, non une retouche cosmétique de l'éditeur. Aucun changement de source/runtime réalisé dans cet audit.


## 7. A17-FULL — mandat consolidé CSA (2026-10-14)

**Décision utilisateur : arrêter les micro-missions Arduino.** La cible devient un **unique chantier de livraison Arduino UNO de bout en bout**, sans annoncer une compatibilité Arduino/C++ ou Tinkercad non démontrée. Les validations intermédiaires ne constituent plus des missions produit autonomes.

### Périmètre de livraison intégrée

1. **Surface et circuit** : placement UNO, contacts physiques D0–D13 et alimentation, connexions filaires, LED/résistance/bouton, sélection, déplacement, interaction momentanée et bistable, sauvegarde/Undo/Redo, Stop/Restart.
2. **IDE** : édition, exemples fonctionnels, diagnostic compile/runtime, état appliqué, instructions utilisateur, réouverture de l'éditeur, erreurs explicites, absence de succès trompeur.
3. **Langage et exécution** : setup/loop, pinMode, digitalWrite/digitalRead, INPUT_PULLUP, variables et portée, expressions, conditions/boucles, delay, quotas d'exécution, reprise temporelle et isolation entre sessions.
4. **I/O étendues** : PWM/analogRead et Serial/terminal seulement après preuve complète jusqu'au circuit ou à l'interface ; sinon marquage explicite « non pris en charge ».
5. **Qualification intégrée** : 10 sketches représentatifs de la section 4, matrice PASS/FAIL/UNSUPPORTED argumentée, tests UI+runtime+électrique+Canvas, build, régression, essai manuel dans le navigateur.
6. **Exploitation** : un bloc PowerShell unique, avec STOP sur échec, Git → tests → build → VS Code → Vite → ouverture automatique de la plateforme après disponibilité HTTP.

### Critères de clôture obligatoires

- Aucun échec de tests inclus dans la qualification globale n'est écarté silencieusement.
- Les scénarios déclarés supportés passent de la saisie du sketch jusqu'à la réponse visible des composants.
- Les scénarios non supportés échouent avec diagnostic clair ; ils ne sont jamais présentés comme réussis.
- Aucun gel navigateur, court-circuit inventé, HIGH artificiel en INPUT flottant, ni régression du bouton.
- Le build et l'ouverture locale passent ; le fondateur confirme l'essai visuel réel.
- La matrice finale liste les fonctionnalités supportées, partielles et absentes ; seul ce verdict clôt A17-FULL.

### État initial vérifié au 2026-10-14

- **PASS rapporté par le fondateur** : 20/20 tests ciblés Arduino et build, commit `ccd839a`, ouverture automatique de MYBlab.
- **OUVERT** : 5 échecs des tests historiques `ButtonInteraction008.integration.test.jsx` lors d'une qualification élargie ; la structure DOM actuelle distingue actionneur et corps du bouton. Il faut qualifier ces tests sans supprimer les assertions.
- **OUVERT** : matrice de 10 sketches, capacités ADC/PWM/Serial, fidélité du langage Arduino et essai visuel complet.
- **Verdict** : **A17-FULL OPEN / NO-GO pour annoncer Arduino terminé**. Les travaux déjà validés restent conservés.

Ce mandat remplace les propositions de nouvelles sous-missions A17.7-H, A17.7-I, etc. Toute correction à venir appartient à la même livraison consolidée A17-FULL.
