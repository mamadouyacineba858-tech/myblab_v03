# A17 — Arduino Core Real Sketch — livraison incrémentale 1

**Statut : IMPLEMENTED / PENDING LOCAL QA / FULL PROGRAM NO-GO.**

## Implémenté
- `frontend/src/arduino/firmware/firmwareCompiler.js` : constante Arduino UNO `LED_BUILTIN` reconnue dans `pinMode` et `digitalWrite`, mappée vers D13 via `mapArduinoPin` existant; aucun `eval`, aucune nouvelle VM.
- `frontend/src/arduino/ui/ArduinoCodeWorkspace.jsx` : exemple sélectionnable « LED intégrée D13 » en complément du Blink D2.
- `frontend/src/arduino/firmware/__tests__/firmwareBuiltinLed.integration.test.js` : vérifie compilation, IR D13, séquence runtime HIGH/LOW/HIGH et refus de Serial/identifiants inconnus.
- Conservation du zoom initial 200 % et de la topologie breadboard.

## Périmètre restant
Ce premier lot ne livre **pas** encore les variables, fonctions C++, if/for/while, digitalRead, analogRead, PWM depuis sketch, Serial ou bibliothèques. Le rapport A16 reste NO-GO pour les sketches complets. Il est interdit de déclarer A17 clôturé.

## Vérification
Depuis `frontend`, exécuter le test nouveau avec les tests Arduino/Breadboard, puis `npm run build`, puis l'essai navigateur. Vérifier LED intégrée D13 (sans LED externe) et Blink D2 (LED câblée). Sur erreur, STOP et retour CSA. Le statut reste PENDING tant que les preuves locales ne sont pas retournées.

## Prochain bloc de développement
A17.2 : frontend syntaxique/IR borné et explicite pour expressions, variables, conditions, boucles et fonctions, runtime à budget d'instructions et diagnostics d'exécution. Puis GPIO bidirectionnel avec sémantique UNKNOWN et tests bouton + LED. Cette étape exige une conception sécurisée avant de modifier le scheduler.
