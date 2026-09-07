# FT-A-001 — 16/16 Component Capability Matrix & Gap Closure

Baseline : `6587dbe27d73803466dfb8f7098b7c17104bd709` · branche `feat/MB-VIS-LED-V16-leads-thicker-realistic`
Périmètre FT-A : **utilisabilité fonctionnelle** des 16 composants avant FT-B. Aucune campagne d'assets, aucune
modification de production. La seule modification de ce ticket : conformité d'un test (`RgbLedPart.raster.test.jsx`).

---

## Lecture de la matrice — DEUX registres distincts

| Registre | Ce qu'il garantit | Autorité |
|--|--|--|
| **FUNCTIONAL CAPABILITY** (colonnes VISUAL…TEST/QA) | Le composant se rend, se sélectionne, se déplace ; ses pins existent, sont atteignables, démarrent un fil, se connectent ; le fil suit le composant ; zoom/localScale cohérents ; états interactifs corrects là où ils existent. | **FT-A** (ce ticket) |
| **PHYSICAL / VISUAL FIDELITY** | Le point de contact **dessiné** est exactement l'extrémité physique de la patte de l'asset ; la silhouette/pose des pattes correspond à la référence physique réelle ; contrat transversal contact visible = hit target = pin de présentation = endpoint. | **FT-B** (MB-VIS-CONTACT-038 + 039 + 040) |

> **`VISUAL = PASS` dans cette matrice signifie : renderer actif, asset réel chargé, wrapper neutralisé,
> rendu visible et cohérent, non bloquant.** Cela **ne** signifie **pas** « réalisme physique final validé
> Product Owner ». FT-A valide l'utilisabilité fonctionnelle 16/16. Les écarts de fidélité physique / de
> contact listés plus bas sont **transférés à FT-B**, non corrigés ici.

---

## Méthode / preuves

- **Code** : `canonicalRegistry.js`, `componentDefinitions.js`, `PartRenderer.jsx`, `CircuitComponent.jsx`,
  `Pin.jsx`, `circuitSelectors.js` (`buildWirePaths`), `WiresLayer.jsx`, `useCircuitState.js`,
  `defaultRegistrations.js`. Constat : le pipeline d'interaction (`startDrag`, `startWireGesture`,
  `buildWirePaths`, `focusComponent`/`adjustLocalScale`) est **entièrement générique**, clé `uid`/`pinId`,
  sans branche par type. Varient par type uniquement : la projection de présentation
  (`getPinPresentationPosition` : LED / NPN / POWER / ARDUINO / BUTTON / BUTTON_LATCHING) et la couche STATE
  (interaction momentary/latching + Visual State Registry LED/RGB_LED).
- **Tests ciblés** : `src/components/parts/__tests__/` + `src/canvas/__tests__/` + `src/wires/__tests__/`
  + `WireGesture` + `ContactFoundationPinWireCoherence` + `ComponentFocusLocalZoom` + `renderQualityGate`.
- **QA navigateur** (Vite dev, scène réelle) : 16 composants ; pour chacun — rendu, comptage/positions des pins,
  sélection, drag, **drag-to-wire depuis chaque pin** (preview + connexion), déplacement du composant câblé,
  zoom ×2. Endpoint mesuré par `getScreenCTM()` inverse (unités SVG). Console : **0 erreur**. Aucun black
  screen sur toute la session (~60 fils, drags, zooms, 2 simulations). BUTTON/LATCHING/LED : états vérifiés
  en navigateur (swap d'asset). RGB_LED : mécanisme Visual State Registry partagé avec LED.

---

## Matrice FUNCTIONAL CAPABILITY — 16 / 16

| # | Composant | Pins (canon.) | VISUAL | SELECT | DRAG | PIN | WIRE | MOVE+WIRE | ZOOM / LOCAL_SCALE | STATE | TEST/QA | EVIDENCE |
|--|--|--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|--|
| 1 | LED | anode, cathode | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS (gap 0 @×2) | PASS (off→on, sim nav) | PASS | code + `LedPart.raster` + `RealisticRenderers` + `ContactFoundation` + QA nav |
| 2 | RESISTOR | A, B | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A (passif) | PASS | `ResistorPart.raster` + `ContactFoundation` + QA nav |
| 3 | ARDUINO | D2, D3, GND, 5V | PASS | PASS | PASS | PASS | PASS 4/4 | PASS (gap 0) | PASS (gap 0 @×2) | N/A | PASS | `ArduinoPart.raster` + QA nav (4/4 pins fil+preview) |
| 4 | BUTTON | pin1, pin2 | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | PASS (pressed/released, asset) | PASS | MB-VIS-BUTTON-INTERACTION-008 (CLOSED) + `ButtonInteraction008` + QA nav |
| 5 | BUTTON_LATCHING | pin1, pin2 | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | PASS (toggle off/on, asset) | PASS | 008 (CLOSED) + `latchingButton` + `ButtonInteraction008` + QA nav |
| 6 | POWER | 5V, GND | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | N/A | PASS | `PowerPart.raster` + QA nav |
| 7 | CAPACITOR | pinA, pinB | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | N/A (DC ouvert) | PASS | `CapacitorPart.raster` + QA nav |
| 8 | BUZZER | plus, minus | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | N/A (pas d'état visuel exposé) | PASS | `BuzzerPart.raster` + QA nav |
| 9 | POTENTIOMETER | left, wiper, right | PASS | PASS | PASS | PASS | PASS 3/3 | PASS (gap 0) | PASS (gap 0 @×2) | N/A (état = paramètre) | PASS | `PotentiometerPart.raster` + QA nav (3/3) |
| 10 | LDR | A, B | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | N/A (R fixe, MB-SIM-008) | PASS | `LdrPart.raster` + QA nav |
| 11 | THERMISTOR | A, B | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | N/A (R fixe, MB-SIM-008) | PASS | `ThermistorPart.raster` + QA nav |
| 12 | DIODE | anode, cathode | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | N/A | PASS | `DiodePart.raster` + QA nav |
| 13 | RGB_LED | R, common, G, B | PASS | PASS | PASS | PASS (positions (19/35/53/71, 56) OK) | PASS 4/4 | PASS (gap 0) | PASS (gap 0 @×2) | PASS (Visual State Registry, cf. LED) | **PASS** (test remis en conformité, 13/13) | `RgbLedPart.raster` 13/13 + QA nav (4/4) |
| 14 | NPN_TRANSISTOR | collector, base, emitter | PASS | PASS | PASS | PASS (3 pins, chacun câblable individuellement) | PASS 3/3 | PASS (gap 0) | PASS (gap 0 @×2) | N/A (commande logique BASE, pas d'état visuel) | PASS | `NpnTransistorPart.raster` + QA nav (3/3) |
| 15 | SERVO | signal, vcc, gnd | PASS | PASS | PASS | PASS (3 pins bord droit x=90) | PASS 3/3 | PASS (gap 0) | PASS (gap 0 @×2) | N/A (position servo non pilotée par le pipeline actuel) | PASS | `ServoPart.raster` + QA nav (3/3) |
| 16 | DC_MOTOR | plus, minus | PASS | PASS | PASS | PASS | PASS | PASS (gap 0) | PASS | N/A (R bobinage, MB-SIM-008) | PASS | `DcMotorPart.raster` + QA nav |

**FUNCTIONAL CAPABILITY : 16 / 16 PASS. Aucun P0. Aucun P1. Aucune correction de production requise.**
Multi-pins (POT/NPN/SERVO 3 pins ; ARDUINO/RGB_LED 4 pins) : chaque pin démarre un fil et se connecte
individuellement en navigateur, malgré les espacements serrés (NPN x 32/42/51 ; RGB_LED x 19/35/53/71).

---

## PHYSICAL / VISUAL FIDELITY — écarts transférés à FT-B (NON corrigés ici)

### Observations Product Owner
| Composant | Rendu global | Écart de fidélité physique |
|--|--|--|
| **LED** | silhouette / rendu réussi | points de connexion visuels **pas exactement au bout des pattes** — cohérent avec la dette historique « LED pins to the physical feet » (échec de test attendu, voir §Validation) |
| **CAPACITOR** | rendu réussi | pattes actuellement **horizontales** ; référence physique attendue : **pattes verticales** |
| **THERMISTOR** | rendu réussi | pattes actuellement **horizontales** ; référence physique attendue : **pattes verticales** |
| **LDR** | rendu réussi | pattes actuellement **horizontales** ; référence physique attendue : **pattes verticales** |

### Observations audit
| Composant | Point à qualifier FT-B |
|--|--|
| **NPN_TRANSISTOR** | alignement fin contacts dessinés / vraies pattes de l'asset (pins projetées à y=60, bord bas) |
| **SERVO** | pins fonctionnels au bord droit (x=90) ; **aucune projection** sur le câble 3 fils de l'asset — à projeter FT-B |
| **POWER** | exactitude contact physique de la projection existante (`POWER_VISUAL_PINS`) |
| **ARDUINO** | exactitude contact physique de la projection existante (`ARDUINO_VISUAL_PINS`) |

### Dette architecturale (propriété FT-B)
Divergence **ADR-014** (« componentDefinitions = source de présentation ») vs les projections `*_VISUAL_PINS`
codées dans `pinPresentationGeometry.js` (LED/NPN/POWER/ARDUINO/BUTTON/BUTTON_LATCHING). Enregistrée pour
traitement transversal dans **FT-B / MB-VIS-CONTACT-038**. Aucune troisième source de coordonnées à introduire.

---

## Classification des écarts (règle FT-A : reste dans FT-A, pas de micro-ticket)

| Écart | Classe | Orientation |
|--|--|--|
| RGB_LED : assertions de test périmées (design « 5 crops ») | P3 (test) | **FIX FT-A — FAIT** (`RgbLedPart.raster.test.jsx`, 13/13, couverture renforcée sur le `<source>` WebP) |
| LED : connexions visuelles pas au bout des pattes | P2 | REPORT FT-B (= dette « LED physical feet ») |
| CAPACITOR / THERMISTOR / LDR : pattes horizontales vs verticales attendues | P2 | REPORT FT-B |
| NPN_TRANSISTOR : alignement fin contacts/pattes | P2 | REPORT FT-B |
| SERVO : pas de projection sur le câble 3 fils | P2 | REPORT FT-B |
| POWER / ARDUINO : exactitude contact | P2/P3 | REPORT FT-B |
| Divergence ADR-014 / `*_VISUAL_PINS` | — | FT-B (MB-VIS-CONTACT-038) |
| Pas de test d'intégration wire par type (12 non-BUTTON) | P3 | note FT-A : pipeline générique + QA navigateur = preuve suffisante ; test paramétré possible ultérieurement |

---

## Validation finale

- **RGB_LED ciblé** : `RgbLedPart.raster.test.jsx` → **13/13 PASS** (avant : 10/13 ; les 3 échecs « 5 images » supprimés).
- **Tests FT-A ciblés** (`parts` + `canvas` + `wires` + `WireGesture` + `ContactFoundation` + `ComponentFocusLocalZoom` + `renderQualityGate`) : voir rapport terminal.
- **Full suite officielle** : voir rapport terminal.
- **`npm run build`** : voir rapport terminal.
- **`git diff --check`** : voir rapport terminal.

Échec historique **« pinPresentationGeometry : projects LED pins to the physical feet »** : **attendu de rester
présent** — il exprime précisément l'écart de fidélité LED transféré à FT-B ci-dessus. **Non corrigé dans FT-A.**

---

## Conclusion

**FT-A-001 : 16 / 16 composants qualifiés fonctionnellement.** Aucun P0/P1. Aucune modification de production.
Dette de test RGB_LED résorbée. Écarts de fidélité physique/contact (LED, CAPACITOR, THERMISTOR, LDR, NPN,
SERVO, POWER, ARDUINO) et divergence ADR-014 **explicitement transférés à FT-B**. FT-B non démarré.
