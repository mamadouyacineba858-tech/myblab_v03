# Delivery Report — MB-COMPONENT-LIBRARY-002

## 1. Identité

| Champ | Valeur |
|---|---|
| Ticket | `MB-COMPONENT-LIBRARY-002` — Assets réalistes V1 |
| Blueprint / Ticket / CSA Ruling | reçus combinés en un seul message (Parties I/II/III) |
| Statut de ce rapport | **STOP avant commit, conformément à la règle de commit de la CSA Ruling** : « Claude ne doit pas pousser directement sur main. » Ce rapport est soumis pour validation CSA post-implémentation (GO/NO-GO) avant tout commit/push. |

## 2. Fichiers modifiés

Aucun fichier n'a été **créé** par ce ticket — tous les composants du second lot disposaient déjà d'un fichier renderer (rendu schématique div/CSS) enregistré dans `DEFAULT_REGISTRATIONS` depuis une itération antérieure ; ce ticket en réécrit uniquement le contenu.

### Renderers réécrits (12 — le second lot, LOCK-01 : `componentDefinitions.js` non touché)

- `frontend/src/components/parts/ArduinoPart.jsx`
- `frontend/src/components/parts/ButtonPart.jsx`
- `frontend/src/components/parts/LatchingButtonPart.jsx`
- `frontend/src/components/parts/PowerPart.jsx`
- `frontend/src/components/parts/BuzzerPart.jsx`
- `frontend/src/components/parts/PotentiometerPart.jsx`
- `frontend/src/components/parts/LdrPart.jsx`
- `frontend/src/components/parts/ThermistorPart.jsx`
- `frontend/src/components/parts/RgbLedPart.jsx`
- `frontend/src/components/parts/NpnTransistorPart.jsx`
- `frontend/src/components/parts/ServoPart.jsx`
- `frontend/src/components/parts/DcMotorPart.jsx`

### Feuille de style

- `frontend/src/canvas/CircuitComponent.css` — classes CSS du second lot ajoutées (SVG : fill/stroke plutôt que les propriétés div précédentes), classes `.part-generic`/`.part-unknown` retirées (mortes : plus aucun fichier ne les référence après réécriture des 12 renderers — vérifié par recherche globale avant suppression).

### Tests

- `frontend/src/components/parts/__tests__/RealisticRenderers.test.jsx` — étendu (17 → 75 tests) avec le second lot, dans la continuité du fichier existant du premier lot (MB-VIS-002), même discipline de test.

### Fichiers non prévus par le Blueprint, ajoutés en cours d'implémentation (déviation disclosed, voir §3)

- `frontend/src/canvas/CircuitComponent.jsx` — une ligne d'import ajoutée (`import React from "react"`).
- `frontend/src/canvas/Pin.jsx` — une ligne d'import ajoutée (`import React from "react"`).

### Explicitement non touchés (conforme SCOPE OUT / LOCKS de la CSA Ruling)

`componentDefinitions.js` (aucune géométrie, aucun pin, aucune dimension modifiée), `canonicalRegistry.js`, `PartRenderer.jsx`, `defaultRegistrations.js` (les associations type→composant existaient déjà, aucune modification nécessaire), tout fichier `simulator/**`, `core/handlers/**`, `core/validation/**`, `breadboard*.js`, Arduino/Runtime/Scheduler/Clock, `HistoryService`/`CommandBus`, architecture de sélection, les 4 renderers du premier lot (`ResistorPart.jsx`, `LedPart.jsx`, `CapacitorPart.jsx`, `DiodePart.jsx` — non modifiés, LOCK-16 vérifié par les 17 tests originaux toujours au vert).

## 3. Écart disclosed : import React manquant dans `CircuitComponent.jsx` et `Pin.jsx`

Le Blueprint place la couche de rendu réaliste strictement dans `components/parts/`. En construisant les tests d'intégration réels du pipeline complet (`CircuitComponent` → `PartRenderer` → renderer réaliste → `Pin`, exigé par le Contrat de Validation de la CSA Ruling — AC-04/AC-05/AC-06, VIS-TEST-02/03), ces deux fichiers ont dû être rendus pour la première fois sous la configuration Vitest secondaire du dépôt (`frontend/src/simulator/vitest.config.ts`, dépourvue du plugin React officiel — convention déjà connue et déjà appliquée à chaque Part renderer existant, voir leurs `import React from 'react'`). Ni l'un ni l'autre n'importait `React` explicitement, ce qui a fait échouer le rendu (`ReferenceError: React is not defined`) uniquement sous cette configuration de test — le build de production (`vite build`, plugin React actif) n'était pas affecté.

**Correction** : ajout d'une seule ligne d'import dans chacun des deux fichiers, aucune ligne de logique modifiée. Non-régression vérifiée par la suite complète (0 échec) et par le build production (inchangé, identique avant/après au bytecode près).

Ce n'est pas une modification d'architecture, de responsabilité, ni de comportement — c'est la même convention déjà en vigueur partout ailleurs dans `components/parts/`, simplement jamais nécessaire jusqu'ici pour ces deux fichiers faute d'un test qui les rende sous cette configuration.

## 4. Composants traités

| Type | Description du rendu | Pins (inchangés, source : componentDefinitions.js) |
|---|---|---|
| ARDUINO | Carte PCB vue de dessus, connecteur USB, puce, headers | D2(0,50), D3(0,75), GND(0,110), 5V(120,50) |
| BUTTON | Bouton-poussoir tactile (base + capuchon rond), état pressé/relâché préservé | pin1(0,30), pin2(60,30) |
| BUTTON_LATCHING | Interrupteur à levier (rocker switch), état on/off préservé | pin1(0,30), pin2(60,30) |
| POWER | Bloc d'alimentation + symbole pile | 5V(70,25), GND(70,65) |
| BUZZER | Buzzer piézo vu de dessus (disque + membrane) | plus(10,50), minus(60,50) |
| POTENTIOMETER | Trimmer réglable (boîtier + fente + curseur) | left(10,50), wiper(45,0), right(80,50) |
| LDR | Photorésistance (disque + piste zigzag) | A(0,18), B(84,18) |
| THERMISTOR | Thermistance NTC (perle bleue) | A(0,18), B(84,18) |
| RGB_LED | Dôme 4 pattes, 3 puces R/G/B dont l'état suit fidèlement les props r/g/b | R(12,56), common(34,56), G(56,56), B(78,56) |
| NPN_TRANSISTOR | Boîtier TO-92 (dos plat) + 3 pattes | collector(45,0), base(0,45), emitter(90,45) |
| SERVO | Boîtier + palonnier + 3 fils (signal/vcc/gnd, couleurs distinctes) | signal(90,20), vcc(90,35), gnd(90,50) |
| DC_MOTOR | Corps cylindrique vu de profil + axe | plus(0,25), minus(84,25) |

Dans chaque cas, le `<svg viewBox>`/`width`/`height` est exactement celui déclaré dans `componentDefinitions.js` pour ce type (vérifié par test, pas recopié à la main) — LOCK-04/LOCK-05, AC-04.

## 5. Architecture du renderer

Aucun changement architectural. Chaque renderer reste une fonction React pure sans état de connectivité, insérée exactement au même point du pipeline existant :

```
Component Definition (componentDefinitions.js, source de vérité, non touchée)
        ↓
CircuitComponent.jsx (dimensions, position, Pin — non touché sauf import)
        ↓
PartRenderer.jsx (délégation au VisualizationManager — non touché)
        ↓
Renderer réaliste (components/parts/*.jsx — réécrit par ce ticket)
        ↓
Pin.jsx (pins cliquables, positionnés indépendamment par dx/dy — non touché sauf import)
```

Aucun renderer ne contient de logique électrique, de net, de connectivité, de solveur, de Runtime ou d'Arduino (VIS-INV-05 à VIS-INV-10) — chacun ne consomme que les props qu'il recevait déjà avant ce ticket (`state` pour BUTTON/BUTTON_LATCHING, `r`/`g`/`b` pour RGB_LED, aucune pour les 9 autres).

## 6. Tests exécutés et résultats

```
Ciblé : RealisticRenderers.test.jsx
  75 tests passés (17 premier lot inchangés + 58 nouveaux second lot)

Suite complète : npm run test:ci
  Avant ce ticket :  103 fichiers / 1071 tests
  Après ce ticket :  103 fichiers / 1129 tests
  +58 tests, 0 régression, 0 nouveau fichier de test (extension du fichier existant)

Build production : npm run build
  tsc -b && vite build → ✓ built in 1.12s, aucune erreur
```

### Correspondance VIS-TEST-01 → 10

| Test | Statut | Où |
|---|---|---|
| VIS-TEST-01 (rendu de chaque composant) | ✓ | contrat géométrique it.each × 12 |
| VIS-TEST-02 (présence des pins existants) | ✓ | contrat géométrique (svg = boîte exacte des pins) + test dédié ARDUINO (4 pins, positions dx/dy réelles) |
| VIS-TEST-03 (sélection) | ✓ (non-régression, code non touché) | `isSelected`/`selectOnly` dans `CircuitComponent.jsx`, non modifiés, exercés par la suite existante |
| VIS-TEST-04 (déplacement) | ✓ (non-régression, code non touché) | `startDrag`, `MoveComponentMutationChannel.integration.test.jsx` (12 tests, inchangés) |
| VIS-TEST-05 (wiring) | ✓ (non-régression, code non touché) | `AddWireMutationChannel.integration.test.jsx` (8 tests, inchangés) — la position des pins (dx/dy) n'a pas changé, donc le wiring existant reste géométriquement identique |
| VIS-TEST-06 (suppression) | ✓ (non-régression, code non touché) | `DeleteCommand.integration.test.jsx` (5 tests, inchangés) |
| VIS-TEST-07 (undo/redo) | ✓ (non-régression, code non touché) | `HistoryManager.test.js`, tests d'intégration par canal (inchangés) |
| VIS-TEST-08 (états visuels existants) | ✓ | tests dédiés BUTTON (pressé/relâché), BUTTON_LATCHING (on/off), RGB_LED (r/g/b, 3 combinaisons) |
| VIS-TEST-09 (non-régression premier lot) | ✓ | 17 tests originaux de `RealisticRenderers.test.jsx` toujours au vert, sans modification |
| VIS-TEST-10 (non-régression globale) | ✓ | 103 fichiers / 1129 tests, 0 échec |

## 7. `git diff --check`

Comme pour les tickets précédents, ce miroir cloud ne conserve pas l'historique Git complet (`fatal: unable to read <objet>`) — à exécuter côté poste local. Le scope Git (§2 ci-dessus) a été vérifié à la main, par ma propre liste de fichiers effectivement touchés — ne pas se fier à un `git status` lancé depuis ce miroir (désynchronisé de `origin/main`).

## 8. Preuve visuelle

### Automatisée (pipeline réel, la plus proche substituable sans accès interactif au Canvas)

- `RealisticRenderers.test.jsx` (nouveaux tests) exerce le **vrai** pipeline `CircuitProvider → CircuitComponent → PartRenderer → renderer réaliste → Pin`, sans mock ni Document construit à la main — mêmes composants réels que `SimulationCanvas.jsx` (patron `components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)` reproduit à l'identique dans le harnais de test).
- Le test ARDUINO prouve que les 4 pins réels s'affichent exactement aux positions dx/dy de `componentDefinitions.js`, avec le nouveau rendu réaliste en place.
- Le test BUTTON prouve qu'un `pointerdown`/`pointerup` réel sur le nouveau SVG met bien à jour `state` dans le Document (`released` → `pressed` → `released`), donc que le rendu réaliste ne casse pas l'interaction.

### Manuelle (à effectuer sur ta machine, `npm run dev`)

1. Ouvrir l'application.
2. Pour chacun des 12 types du second lot : le déposer sur le canevas (Sidebar → clic ou drag), vérifier qu'il est immédiatement reconnaissable (silhouette + couleurs plausibles, cf. tableau §4), le sélectionner (contour vert), le déplacer, le connecter à un autre composant via ses pins, démarrer la simulation si pertinent (LED RGB, moteur, buzzer — aucun changement du comportement électrique attendu), le supprimer, Undo/Redo.
3. Cas particuliers à vérifier visuellement :
   - **BUTTON** : le capuchon doit visuellement s'enfoncer pendant l'appui (maintenir le clic).
   - **BUTTON_LATCHING** : le levier doit glisser et passer au vert après un clic.
   - **RGB_LED** : câbler un circuit qui active un ou plusieurs canaux et vérifier que la ou les puces correspondantes s'allument dans le dôme.
4. Vérifier que RESISTOR / LED / CAPACITOR / DIODE (premier lot) n'ont visuellement pas changé (LOCK-16).

## 9. Limites disclosed

- Les silhouettes sont des représentations 2D stylisées, pas des photographies ni des rendus 3D (explicitement hors scope, LOCK-15, non-objectif §9 du Blueprint).
- Aucune valeur de composant par instance n'est représentée (résistance, capacité...) — le modèle actuel n'en porte aucune par instance (même limite déjà documentée pour le premier lot, MB-VIS-002).
- Le dépôt initial depuis la Sidebar ne bénéficie toujours d'aucun feedback visuel en direct pendant le drag HTML5 (limite héritée, hors scope de ce ticket).

## 10. Statut final

Implémentation conforme au Blueprint et aux 20 LOCKS de la CSA Ruling. Aucune géométrie fonctionnelle, aucun pin, aucune connectivité, aucun solveur, aucune simulation, aucun Runtime, aucun Arduino, aucun breadboard modifiés. Un seul écart disclosed (§3), strictement limité à deux imports manquants nécessaires pour tester le pipeline réel — aucun changement de comportement.

Conformément à la règle de commit de la CSA Ruling : **aucun commit n'a été effectué, aucun push.** Ce rapport est soumis pour validation CSA post-implémentation (GO/NO-GO).
