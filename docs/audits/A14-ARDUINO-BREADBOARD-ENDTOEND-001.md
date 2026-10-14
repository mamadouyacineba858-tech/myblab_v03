# A14 — Arduino programmable + breadboard — audit de parcours

## État de qualification
Implémentation poussée sur `codex/A13-VISUAL-CORR-004`. Audit statique du dépôt effectué. Les tests Vitest, le build et l'essai Canvas réel **ne sont pas exécutés dans cette session** : statut `IMPLEMENTED / PENDING LOCAL QA`, jamais PASS implicite.

## Chaîne Arduino réellement présente
- `frontend/src/components/Navbar.jsx` : bouton Code activé uniquement quand un composant ARDUINO est sélectionné; bouton Simuler / Arrêter indépendant.
- `frontend/src/arduino/ui/ArduinoCodeWorkspace.jsx` : éditeur source du firmware du composant sélectionné; nouvel exemple Blink D2; compilation; application uniquement si `compileFirmware(draft).ok`. Un code invalide ne remplace plus le firmware valide via l'action UI.
- `frontend/src/arduino/firmware/firmwareCompiler.js` : compilateur limité aux fonctions setup/loop, pinMode(0..13, OUTPUT), digitalWrite(0..13, HIGH|LOW), delay(littéral numérique positif ou nul). **Ce n'est pas Arduino C++ complet** : pas de bibliothèques, analogRead, digitalRead, variables arbitraires, conditions ou boucles C++ générales.
- `frontend/src/arduino/firmware/firmwareExecutor.js` et `firmwareRuntimeController.js` : IR et exécution temporelle; `firmwareBlink.integration.test.js` vérifie la sortie D2 avec le vrai ArduinoSimulator/Scheduler, sans vérifier à lui seul le câblage visuel final.
- `frontend/src/core/handlers/component/UpdateArduinoFirmwareHandler.js` : mutation persistante, soumise à l'historique Document.

## Breadboard : constats et limites
- `frontend/src/utils/breadboardGeometry.js` fournit `holeAt` pour les positions physiques et `breadboardConnectivity.js` la topologie électrique.
- `frontend/src/canvas/Breadboard.jsx` dessine les trous et leur survol.
- `frontend/src/canvas/BreadboardWireEndpoints.jsx` ajoute une couche distincte de cercles de hit-test (rayon 5 unités Document) qui relaie `onPinClick` et marque la connexion en attente.
- `frontend/src/wires/BreadboardWiresLayer.jsx` dessine les connexions des trous. Cette superposition crée potentiellement plusieurs nœuds SVG par trou, à profiler sous charge avant toute refonte.
- Le zoom initial 200 % agrandit toutes les cibles de manière cohérente, sans modifier le pitch électrique.
- La présence de modèles de connexion et de tests d'intégration ne prouve pas encore l'absence de faux contacts ou de problèmes de survol en navigateur.

## Parcours manuel de qualification (Arduino → breadboard → LED)
1. Ajouter un Arduino UNO, une breadboard, une LED et une résistance appropriée; câbler D2 vers la résistance puis LED et GND selon les polarités.
2. Sélectionner Arduino, cliquer « Code », puis « Exemple : LED clignotante D2 ».
3. Cliquer « Compiler et appliquer » : attendre « Compilation réussie ».
4. Cliquer « ▶ Simuler » et vérifier l'alternance visuelle de la LED; arrêter et relancer; sauvegarder puis rouvrir et vérifier le sketch.
5. Remplacer le code par « invalid » : « Compiler et appliquer » doit afficher MISSING_SETUP sans écraser le dernier firmware enregistré.
6. Vérifier l'absence de perte de FPS pendant zoom/pan/drag et pendant la simulation, et la sélection précise des trous au zoom 200 %.

## Commandes de QA
Depuis `frontend` :
```powershell
npx vitest run src/arduino/ui/__tests__/ArduinoCodeWorkspace.test.jsx src/arduino/firmware/__tests__/firmwareBlink.integration.test.js src/arduino/firmware/__tests__/firmwareCircuitQualification.integration.test.js src/canvas/__tests__/Breadboard.test.jsx src/wires/__tests__/BreadboardWiresLayer.integration.test.jsx --maxWorkers=1 --minWorkers=1
npm run build
npm run dev -- --open
```
Si l'un des tests échoue, arrêter et qualifier l'anomalie; ne pas déclarer A14 PASS. La PR #21 reste soumise à Founder Canvas PASS.
