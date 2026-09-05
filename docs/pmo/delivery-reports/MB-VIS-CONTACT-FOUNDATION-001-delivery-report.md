# MB-VIS-CONTACT-FOUNDATION-001 — Delivery Report
## Audit et correction des points de contact physique (pins/fils)

Statut : **Implémentation livrée sous autorisation CSA directe (mission d'implémentation) — commit(s) et push directs effectués sous cette même autorisation. Aucune déclaration de CSA Technical/Visual GO — cette décision reste au CSA.**

---

## 0. Méthode et portée

Mission d'AUDIT d'abord, correction ensuite — jamais l'inverse. Aucune cause n'a été supposée avant mesure réelle. La mesure a été effectuée par un pixel-probe exécuté dans un navigateur réel (Chromium, `canvas.getImageData()` sur les fichiers PNG réellement présents dans le dépôt, jamais sur les manifests déclaratifs), pour les 16 types du catalogue, aux résolutions 1x et 3x. La méthode et ses limites sont documentées intégralement dans `frontend/scripts/lead-anchor-probe.md` (nouveau, Phase 6 — garde-fou futur).

Conformément à ADR-014 (§Décision, INV-PIN-001 à 007) : **aucune modification de `canonicalRegistry.js`** (identité/sémantique/pins électriques), **aucun troisième registre**, **aucune modification du solveur/de la simulation/de l'historique**. Toute correction reste exclusivement dans la couche de présentation (`componentDefinitions.js`) ou dans le harnais de validation qui la consulte (`componentAssetValidation.js`) — jamais l'inverse.

---

## 1. CAUSE RACINE CONFIRMÉE

**Les `dx`/`dy` de présentation de `PIN_PRESENTATION_BY_TYPE` (`componentDefinitions.js`) ont été fixés, pour la majorité des types, en reprenant directement les coordonnées ÉLECTRIQUES canoniques (bords de la boîte : `dx∈{0,largeur}` ou `dy∈{0,hauteur}`), sous l'hypothèse implicite « le fil/la patte visuelle atteint le bord de la boîte canonique » — hypothèse **valide** pour les passifs axiaux à pattes fines qui traversent effectivement toute la boîte (RESISTOR, CAPACITOR, LDR, THERMISTOR, DC_MOTOR, DIODE, SERVO — fils/pattes qui rejoignent réellement le bord de l'asset livré, confirmé par mesure), mais **invalide** pour les composants dont le contact est une patte/broche en retrait de la base d'un boîtier qui, lui, n'occupe pas toute la boîte canonique (`fillFactor` `BOXED` = 0.9, `visualContract.js`) — confirmé par mesure sur **BUTTON** et **BUTTON_LATCHING**, dont les deux pattes métalliques réelles sont mesurées à ~7-9 unités canvas en retrait du bord déclaré, de façon reproductible et cohérente entre 1x et 3x.

Cette hypothèse n'a jamais été vérifiée contre l'asset réellement livré pour ces deux types — contrairement à RESISTOR (QA harnais complet, `docs/pmo/delivery-reports/MB-VIS-RESISTOR-CONSOLIDATED.md`, CSA VISUAL GO) et à LED/NPN_TRANSISTOR/POWER/ARDUINO (override dédié déjà présent dans `pinPresentationGeometry.js`, avec commentaire de traçabilité pixel-probe).

## 2. Causes secondaires (identifiées, non corrigées dans ce ticket — voir §6/§9)

- **BUZZER** : mesure incohérente entre 1x et 3x (delta ~10.5→19.4 en x, ~26.7→41.7 en y selon la résolution) — indice d'un problème PLUS PROFOND que de simples `dx/dy` erronés : l'asset natif (60×60 px) n'a pas le même rapport d'aspect que la boîte canonique (70×50, ratio 1.4), donc l'étirement CSS non uniforme (`width:100%;height:100%`) déforme la géométrie et rend toute correction `dx/dy` instable. **Cause probable : cadrage/aspect de l'asset (catégorie B), pas un simple dx/dy.** Non corrigé — nécessite un ticket dédié à l'asset, hors périmètre de cette mission (interdiction de « refonte esthétique du catalogue »).
- **DIODE** : mesure incohérente entre 1x (Δ≈1.5-2.5) et 3x (Δ≈31.6-33.6) — le corps en verre (matériau `GLASS`, semi-transparent, `visualContract.js`) confond la détection par seuil alpha selon la résolution. **Cause probable : limite de la méthode de mesure sur un matériau semi-transparent (catégorie G — mesure, pas géométrie)**, pas nécessairement un défaut réel. Non corrigé — nécessite une confirmation visuelle humaine avant toute correction (Phase 2 : « ne pas inventer de coordonnées »).
- **RGB_LED** : 3 pins sur 4 mesurés proches (Δ≈0.3-8.5), le pin `G` nettement écarté (Δ≈17-22, mais lui-même incohérent entre 1x/3x). Non corrigé — écart isolé à un seul pin, insuffisamment fiable pour une correction chiffrée sans confirmation visuelle.
- **ARDUINO / POWER** (override déjà en place) : la sonde rapporte un delta nul, mais la méthode « recherche du pixel opaque le plus proche » est peu discriminante sur un corps plein/opaque (carte PCB, façade) — un delta nul ne peut pas être interprété comme une précision sub-pixel confirmée sur ces deux types. **Aucune preuve de défaut, mais aucune confirmation indépendante forte non plus** — disclosed, non modifiés (aucune contre-preuve ne justifie d'y toucher).
- **LED** (override déjà en place) : delta mesuré ≈4.2-5.7 unités canvas, cohérent entre 1x/3x. Le CSA a explicitement déclaré ce contact « visuellement acceptable et cohérent » (mandat de cette mission) — **non corrigé, sciemment, pour respecter ce jugement déjà rendu** et l'interdiction de refonte esthétique (Phase 10).

## 3. Tableau des 16 composants (mesure réelle, pixel-probe navigateur)

Delta exprimé en unités canvas (boîte canonique). Tolérance cible : ≤ 0.75 (`visualContract.js::LEAD_ANCHORING.tolerancePx`), assouplie ici en pratique à ≤ 1 pour absorber l'arrondi au pixel entier de la mesure au format 1x.

| Composant | Pin(s) | Déclaré (avant) | Mesuré (réel) | Correction | Résultat |
|---|---|---|---|---|---|
| RESISTOR (référence) | A / B | (0,14) / (84,14) | (0,14.25) / (83.51,14.25) | aucune | **PASS** Δ≤0.55 |
| LED (override existant) | anode / cathode | (28,62) / (52,62) | (32,58) / (48,58) | aucune (CSA : déjà acceptable) | ACCEPTABLE, Δ≈5.7 disclosed |
| ARDUINO (override existant) | D2/D3/GND/5V | (3,50)/(15,75)/(15,108)/(115,50) | Δ=0 mesuré | aucune | INCONCLUSIF (corps plein, méthode peu discriminante) |
| **BUTTON** | pin1 / pin2 | (0,30) / (60,30) | (8,30) / (51,30) | **dx 0→8, 60→51** | **CORRIGÉ**, Δ<1 après |
| **BUTTON_LATCHING** | pin1 / pin2 | (0,30) / (60,30) | (7,30) / (52,30) | **dx 0→7, 60→52** | **CORRIGÉ**, Δ<1 après |
| POWER (override existant) | 5V / GND | (35,67) / (22,67) | Δ=0 mesuré | aucune | INCONCLUSIF (corps plein) |
| CAPACITOR | pinA / pinB | (0,20) / (70,20) | (0,20) / (69.67,20) | aucune | **PASS** Δ≤0.33 |
| BUZZER | plus / minus | (10,50) / (60,50) | incohérent 1x/3x (asset non isotrope) | aucune | **DÉFECT CONFIRMÉ, NON CORRIGÉ** (asset, hors périmètre) |
| POTENTIOMETER | left/wiper/right | (10,50)/(45,50)/(80,50) | ≈ inchangé, Δ≤1 | aucune | **PASS** |
| LDR | A / B | (0,18) / (84,18) | (0,18) / (83.67,18) | aucune | **PASS** Δ≤0.33 |
| THERMISTOR | A / B | (0,18) / (84,18) | (0,18) / (83.67,18) | aucune | **PASS** Δ≤0.33 |
| DIODE | anode / cathode | (0,15) / (84,15) | incohérent 1x/3x (matériau verre) | aucune | **MESURE INCERTAINE**, non corrigé |
| RGB_LED | R/common/G/B | (19,56)/(35,56)/(53,56)/(71,56) | R≈6.6-7 / common≈0.33 / G≈17-22 / B≈7.5-8.5 | aucune | PARTIEL, disclosed, non corrigé |
| NPN_TRANSISTOR (override existant) | collector/base/emitter | (42,60)/(32,60)/(51,60) | Δ≤1 | aucune | **PASS** |
| SERVO | signal/vcc/gnd | (90,20)/(90,35)/(90,50) | Δ≤1 | aucune | **PASS** |
| DC_MOTOR | plus / minus | (0,25) / (84,25) | Δ≤0.33 | aucune | **PASS** |

**2 types corrigés** (BUTTON, BUTTON_LATCHING — cause racine confirmée et fixe stable). **9 types déjà conformes** sans modification (RESISTOR, CAPACITOR, POTENTIOMETER, LDR, THERMISTOR, NPN_TRANSISTOR, SERVO, DC_MOTOR, +ARDUINO/POWER en observation prudente). **1 type accepté tel quel sur décision CSA déjà rendue** (LED). **3 types identifiés en défaut ou en incertitude de mesure, sciemment non corrigés dans ce ticket** (BUZZER — asset non isotrope ; DIODE — mesure non fiable sur matériau semi-transparent ; RGB_LED — écart isolé au pin G, non confirmé).

## 4. Solution architecturale appliquée

- **Cause racine → correction en couche de présentation uniquement** (`frontend/src/config/componentDefinitions.js`, `PIN_PRESENTATION_BY_TYPE.BUTTON`/`BUTTON_LATCHING`) — exactement la couche qu'ADR-014 attribue aux `dx`/`dy`. `canonicalRegistry.js` (identité, rôles, cardinalité) **non touché**. Pin IDs, références de wires, données de simulation **non touchés**.
- **Garde-fou futur (Phase 6)** : `componentAssetValidation.js` gagne `validateLeadAnchors(spec, measuredPins)` — fonction PURE, jamais une nouvelle source de vérité (elle ne fait que comparer un `measuredPins` fourni de l'extérieur à `spec.pinAnchors`, lui-même déjà dérivé de `componentDefinitions.js`/`getPinPresentationPosition()`). Corrige au passage une divergence latente : `deriveComponentAssetSpec()` lisait jusqu'ici `p.dx`/`p.dy` bruts pour construire `spec.pinAnchors`, ignorant tout override de présentation (LED/NPN_TRANSISTOR/POWER/ARDUINO) — désormais dérivé de `getPinPresentationPosition()`, la même résolution qu'utilisent réellement `CircuitComponent.jsx`/`circuitSelectors.js` en production.
- **Outil de mesure réutilisable** (Phase 6) : `frontend/scripts/lead-anchor-probe.md` documente la méthode et fournit le script navigateur exact utilisé pour cet audit, avec ses limites connues (matériaux semi-transparents, corps opaques pleins) — pour qu'un futur asset puisse être audité de la même façon, sans jamais devenir lui-même une source de coordonnées attendues.

## 5. Fichiers modifiés

| Fichier | Nature |
|---|---|
| `frontend/src/config/componentDefinitions.js` | modifié — `dx` de BUTTON/BUTTON_LATCHING corrigés (mesure réelle), commentaire de traçabilité |
| `frontend/src/visualization/assetValidation/componentAssetValidation.js` | modifié — `pinAnchors` dérivé de `getPinPresentationPosition()` (corrige la divergence latente ci-dessus) ; nouvelle fonction `validateLeadAnchors()` |
| `frontend/src/utils/__tests__/geometryPinCanonical.test.js` | modifié — TEST 10 : valeurs BUTTON/BUTTON_LATCHING attendues mises à jour |
| `frontend/src/config/__tests__/componentInstanceState.test.js` | modifié — TEST 10 : idem |
| `frontend/src/__tests__/A1ButtonModel.test.js` | modifié — assertion `button.pins` mise à jour |
| `frontend/src/__tests__/latchingButton.test.jsx` | modifié — assertion `button.pins` mise à jour |
| `frontend/src/components/parts/__tests__/ButtonPart.raster.test.jsx` | modifié — assertions dérivées de `getComponentDef()` (jamais réécrites en dur), résilientes à un futur ajustement documenté |
| `frontend/src/components/parts/__tests__/LatchingButtonPart.raster.test.jsx` | modifié — idem |
| `frontend/src/visualization/assetValidation/__tests__/componentAssetValidation.test.jsx` | modifié — +11 tests (`pinAnchors` avec override, `validateLeadAnchors`) |

## 6. Nouveaux fichiers

| Fichier | Nature |
|---|---|
| `frontend/scripts/lead-anchor-probe.md` | **nouveau** — méthode + script de mesure réutilisable (Phase 6, garde-fou futur), limites disclosed |
| `frontend/src/__tests__/ContactFoundationPinWireCoherence.integration.test.jsx` | **nouveau** — 5 tests d'intégration (pipeline réel) verrouillant `contact physique == Pin de présentation == extrémité de fil` pour BUTTON, à travers focus/échelle locale/zoom global/drag/câblage |

Aucun asset modifié. Aucune modification de `canonicalRegistry.js`, `geometry.js`, `CircuitComponent.jsx`, `Pin.jsx`, `Pin.css`, `CircuitComponent.css`, `PartRenderer.jsx`, `visualContract.js`, `defaultRegistrations.js`, `registry.js`, du solveur, de l'historique, ou de tout fichier 053+.

`git diff --stat` (hors `.claude/`) : `9 fichiers modifiés` + 2 nouveaux fichiers, `213 insertions(+), 35 deletions(-)` (avant ajout des 2 nouveaux fichiers).

## 7. Tests exécutés et résultats

- **Tests ciblés** (`ContactFoundationPinWireCoherence.integration.test.jsx`, `geometryPinCanonical.test.js`, `componentInstanceState.test.js`, `componentAssetValidation.test.jsx`, `ComponentFocusLocalZoom.integration.test.jsx`) : **76/76 verts**.
- **Suite complète** (`npm run test:ci`) : **1947/1966 verts (19 échecs / 11 fichiers)** — exactement la même baseline pré-existante que HEAD avant ce ticket (vérifié : liste des 19 échecs identique nom pour nom, y compris le même échec LED `pinPresentationGeometry.test.js`/`circuitSelectors.test.js` déjà documenté comme pré-existant et sans rapport). **0 régression nouvelle.** Une première passe avait initialement introduit 6 échecs supplémentaires dans des tests qui affirmaient en dur les anciennes valeurs `dx` de BUTTON/BUTTON_LATCHING (`A1ButtonModel.test.js`, `latchingButton.test.jsx`, `ButtonPart.raster.test.jsx`, `LatchingButtonPart.raster.test.jsx`) — tous corrigés (§5), la suite est revenue exactement à la baseline.
- **`tsc -b`** : exit 0.
- **`npm run build`** : exit 0, vert.
- **`git diff --check`** : exit 0.

## 8. Preuve navigateur (Chromium réel, dev server réel, session fraîche)

| Scénario | Résultat observé |
|---|---|
| Mesure pixel-probe (16 types, 1x+3x, PNG réels) | Exécutée en direct dans la console DevTools contre le dev server servant `frontend/public/assets/components/` — voir §3 |
| BUTTON ajouté, inspection DOM des `<Pin>` | `pin1` à `(8,30)`, `pin2` à `(51,30)` relatifs au wrapper — conforme à la correction |
| Câblage BUTTON.pin1 → RESISTOR.A | Fil créé (`Fils : 0→1`), extrémité du tracé SVG mesurée à `M 208 210` — soit exactement `(200+8, 180+30)`, la position corrigée du composant (`x=200,y=180`) + `pin1(8,30)` | 
| Câblage visuel | Le fil part visuellement de la patte métallique réelle du bouton (capture d'écran), plus du bord vide de son boîtier comme avant la correction |
| Focus + échelle locale (052) | Vérifié fonctionnel sur un composant du circuit (RESISTOR) : `transform: scale()` appliqué, sortie Escape propre |
| Marquee | Sélection groupée des deux composants confirmée (contour vert) |
| Console (tout au long de la session) | **Propre** — 0 erreur |

**Limite disclosed (méthode, pas produit)** : la démonstration manuelle en direct du focus/de l'échelle locale spécifiquement sur le BUTTON a buté sur une particularité PRÉ-EXISTANTE et non liée à ce ticket — `ButtonPart.jsx`/`CircuitComponent.jsx` applique `stopPropagation()` sur `mousedown` de l'image du bouton pour distinguer « presser le bouton » de « sélectionner/déplacer le composant », ce qui empêche un clic direct sur son corps de le sélectionner (la sélection reste possible par marquee, ou par clic direct pour tout autre type de composant). Ce comportement existe indépendamment de ce ticket et n'a pas été modifié. La combinaison focus + échelle locale + drag + câblage POUR BUTTON est en revanche prouvée précisément et de façon reproductible par `ContactFoundationPinWireCoherence.integration.test.jsx` (dispatch réel via le pipeline `CircuitProvider`, contournant cette particularité DOM en appelant directement les fonctions exposées par le hook, exactement comme le fait déjà `ComponentFocusLocalZoom.integration.test.jsx` pour les 16 types).

## 9. Compatibilité MB-VIS-CANVAS-052

- `LOCAL_SCALE_MIN/MAX/STEP/DEFAULT` : **non modifiés**.
- Le mécanisme de mise à l'échelle locale (`transform: scale()` CSS + `getPinPresentationPosition(component, pin, { scale })` pour l'extrémité de fil) est **totalement indépendant** de la valeur `dx`/`dy` d'un pin donné — la correction de BUTTON/BUTTON_LATCHING n'a nécessité AUCUNE modification de `CircuitComponent.jsx`, `circuitSelectors.js`, `pinPresentationGeometry.js` (formule), ou `SimulationCanvas.jsx`. Vérifié explicitement par un test dédié (`ContactFoundationPinWireCoherence.integration.test.jsx`, 4ᵉ test) : la même projection centre-échelle s'applique à la position corrigée sans écart supplémentaire.
- Le point visuel du `<Pin>` et l'extrémité du `<Wire>` subissent la même projection lors du zoom local — vérifié par assertion directe (`scaledPin1.x === centre + (position - centre) * scale`, comparé à `path.d`).

## 10. Garde-fou futur ajouté (Phase 6)

- `validateLeadAnchors(spec, measuredPins)` (`componentAssetValidation.js`) : un futur composant/asset peut désormais être contrôlé automatiquement contre `spec.pinAnchors` (dérivé de `componentDefinitions.js`) à partir d'une mesure réelle fournie par n'importe quelle sonde externe — sans jamais devenir lui-même la source des coordonnées attendues (ADR-014, INV-PIN-007 respecté : le probe mesure, il ne définit pas).
- `frontend/scripts/lead-anchor-probe.md` : méthode et script réutilisables pour produire cette mesure, avec limites disclosed (matériaux semi-transparents, corps opaques pleins) — pour qu'un futur auditeur ne répète pas les deux impasses méthodologiques rencontrées pendant cet audit (Profiler-like faux-positifs sur corps plein, incohérence 1x/3x sur assets non isotropes ou matériaux translucides).
- Correction de la divergence latente de `deriveComponentAssetSpec()` (pinAnchors désormais basé sur `getPinPresentationPosition()`, jamais `p.dx`/`p.dy` brut) : tout futur type avec un override de présentation sera désormais validé contre sa position RÉELLEMENT rendue, pas contre une valeur canonique inutilisée.

## 11. Limites des mesures (disclosed)

- La méthode « recherche du pixel opaque le plus proche » (utilisée pour les pins hors bord de boîte, ex. overrides POWER/ARDUINO) ne peut pas distinguer un contact électrique précis d'un point quelconque sur un corps plein/opaque — un delta nul sur ces types ne doit pas être lu comme une confirmation de précision sub-pixel.
- Les matériaux semi-transparents (verre — DIODE ; lentille — LED) produisent une détection par seuil alpha sensible à la résolution ; les deltas mesurés à 3x pour DIODE ne sont pas jugés fiables et n'ont motivé aucune correction.
- La mesure porte sur les fichiers PNG (alpha non ré-encodé avec perte) ; les WebP correspondants n'ont pas été ré-audités séparément pixel par pixel dans cette passe (jugés visuellement/structurellement équivalents par la même origine de production, mais non re-mesurés indépendamment).
- Aucune coordonnée n'a été inventée : chaque type non corrigé dans ce ticket (BUZZER, DIODE, RGB_LED, LED, ARDUINO, POWER) l'est resté explicitement faute de mesure suffisamment fiable ou par décision CSA déjà rendue — jamais par choix arbitraire.

## 12. Traçabilité Git

- Branche : `feat/MB-VIS-LED-V16-leads-thicker-realistic`
- HEAD de référence donné par le CSA : `e349b373ae764bb05a7084526165159504ba495f`
- Commit d'implémentation : `8c194d3` — `fix(visual): align physical contacts with presentation pins`
- Commit de ce Delivery Report : voir SHA distant final ci-dessous une fois poussé

## 13. Suite

**Aucune déclaration de CSA GO (Technical ou Visual).** Aucun travail sur les tickets 053+. Aucune clôture PMO. Le CSA effectue la validation finale, y compris sur les 3 types laissés en observation (BUZZER, DIODE, RGB_LED) et les 2 en confirmation prudente (ARDUINO, POWER).
