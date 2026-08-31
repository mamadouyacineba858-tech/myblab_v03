# MB-VIS-RENDER-009 — Contrat de qualité de rendu & baseline visuelle

**Statut :** Baseline établie (audit + verrouillage par tests). Ne constitue pas une refonte visuelle.
**Portée :** `frontend/src/components/parts/`, `frontend/src/canvas/CircuitComponent.jsx`, `frontend/src/canvas/Pin.jsx`, `frontend/src/components/parts/PartRenderer.jsx`, `frontend/src/visualization/`.
**Base Git de cet audit :** commit `75e6777ea0318c6365a0b498792c67c70687d9e5`.
**Ne remplace pas** les contrats déjà verrouillés par MB-VIS-COMP-002 à 008 (dimensions, pins, états, registres) — ce document s'appuie dessus et ne les redéfinit pas.

Ce document a deux fonctions : (1) formaliser un **contrat de qualité** (Q1-Q14) que les tickets EXP3 suivants (MB-VIS-LED-010 → MB-VIS-TINKERCAD-030) devront respecter et faire progresser ; (2) documenter l'**état actuel mesuré** (baseline) pour permettre une comparaison objective "avant / après" à chaque futur ticket.

---

## 1. Méthode

Toute affirmation ci-dessous est un **FAIT OBSERVÉ** (code lu et vérifié directement, ou test exécuté) sauf mention explicite `[RECOMMANDATION]` ou `[RISQUE]`. Les futurs tickets peuvent reproduire cette baseline en relisant les fichiers cités, ou en exécutant `frontend/src/__tests__/renderQualityGate.test.jsx` (voir §5), qui vérifie mécaniquement les propriétés structurelles plutôt que des valeurs graphiques figées.

---

## 2. Contrat de qualité (Q1-Q14)

Pour chaque dimension : définition, état actuel constaté, et si le contrat est aujourd'hui tenu par une garantie architecturale (test existant ou nouveau) ou seulement par convention non vérifiée.

| # | Dimension | Définition | État constaté | Garanti par test ? |
|---|---|---|---|---|
| Q1 | Identité | Le composant doit être immédiatement identifiable. | Hétérogène : LED (rendu détaillé, gradients, glow) est identifiable au premier coup d'œil ; les 14 autres types sont des silhouettes schématiques simples (rect/line/path plats). | Non testable objectivement sans référence humaine — hors périmètre d'un test automatisé. |
| Q2 | Proportions | Le rendu doit respecter les dimensions canoniques. | Vérifié : les 16 `*Part.jsx` dérivent `width`/`height` de `getComponentDef()` (contrat MB-VIS-COMP-006). Étendu par ce ticket au conteneur `CircuitComponent.jsx` (`div.circuit-component` style `width/height`), non testé jusqu'ici à ce niveau précis. | Oui — `partDimensionsCanonical.test.jsx`/`partDimensionsGuard.test.js` (COMP-006) + nouveau test T2 (§5). |
| Q3 | Échelle | Échelle relative cohérente entre composants. | Les dimensions canoniques (`componentDefinitions.js`) fixent des tailles relatives cohérentes (ex. RESISTOR 84×28, ARDUINO 120×140). Aucune incohérence détectée dans l'échantillon audité. | Indirectement, par Q2. |
| Q4 | Pins | Les pins graphiques doivent rester cohérents avec les positions électriques canoniques. | Vérifié : `getPinPresentationPosition()` délègue au cas générique `getPinPosition()` pour tous les types sauf LED (table `LED_VISUAL_PINS` dans `utils/pinPresentationGeometry.js`), qui projette uniquement l'affichage, jamais la géométrie électrique (déjà verrouillé COMP-005/007). Le positionnement du `<Pin>` dans `CircuitComponent.jsx` (ligne 191-194) n'était pas testé à ce niveau précis avant ce ticket. | Oui — contrats existants (COMP-005/007) + nouveau test T3 (§5). |
| Q5 | Matériaux | Distinguer plastique / métal / céramique / cuivre / etc. | **Non tenu aujourd'hui hors LED/Capacitor.** 14 des 16 renderers utilisent des couleurs plates sans intention de matière (voir §4.F). Aucune convention ni token de matériau n'existe. | Non — aucun mécanisme à tester ; `[RISQUE]` documenté §6. |
| Q6 | Volume | Lumière / relief / profondeur / ombres-reflets, sans toucher à la géométrie électrique. | Seul LED en dispose (gradients + glow conditionnel). Le reste du catalogue est plat. Le découplage géométrie/rendu est structurellement garanti (aucun `*Part.jsx` n'importe `simulator/`, voir Q13/T5) : un futur travail de volume ne risque donc pas la géométrie électrique. | Découplage garanti par T5 ; le rendu de volume lui-même n'est pas testé (hors périmètre COMP-009). |
| Q7 | États | Les états visuels doivent rester découplés du modèle électrique. | Vérifié : `visualStateRegistry.js` est un registre pur (`Map<type, resolver>`), consulté génériquement par `PartRenderer.jsx` (`getVisualState(type, context)` → `{}` si absent). Seuls LED et RGB_LED ont un resolver aujourd'hui (`defaultVisualStateRegistrations.js`). | Oui — déjà verrouillé (COMP-002), confirmé par lecture directe. |
| Q8 | Sélection | Perceptible sans détruire le réalisme. | Sélection rendue par style inline (`outline: '2px solid #22c55e'`) dans `CircuitComponent.jsx` (ligne 156) — mécanisme unique et cohérent pour tous les types (n'entre pas en conflit avec le SVG interne du composant, qui n'est jamais modifié par la sélection). | Non testé explicitement avant ce ticket ; jugé stable (mécanisme générique, non spécifique par type). |
| Q9 | Interaction (survol) | Cohérent entre composants. | **Incohérent aujourd'hui** : les pins ont un `:hover` riche (`Pin.css` — scale, halo) mais le corps du composant (`.circuit-component`) n'a **aucune règle `:hover`** — seul `cursor: grab/grabbing` change. `[RISQUE]` documenté §6. | Non garanti — absence de contrat, pas de test possible sans définir d'abord la convention. |
| Q10 | Lisibilité au zoom | Rester identifiable aux différents niveaux de zoom. | Le zoom (`SimulationCanvas.jsx`) applique un unique `transform: scale(zoom)` sur l'ensemble du canvas ; **aucun LOD, aucune simplification** — les composants scalent uniformément. Aucune dégradation de lisibilité mesurée dans ce ticket (pas d'infrastructure de mesure visuelle demandée pour COMP-009). | Non testé (mesure de lisibilité hors périmètre automatisable ici). |
| Q11 | Cohérence inter-familles | Sembler appartenir au même laboratoire. | **Non tenu.** Deux strates visuelles coexistent : LED (réaliste, gradients) vs le reste (schématique plat), sans convention partagée. `[RISQUE]` documenté §6, `[RECOMMANDATION]` d'un design system minimal en `MB-VIS-COMP-011`+ plutôt que dans ce ticket. | Non — pas de convention à tester. |
| Q12 | Performance | Pas d'explosion inutile de nœuds SVG/DOM. | Échantillon mesuré (§4.F) : de 5 primitives (Resistor, NpnTransistor) à 27 (LED, le plus détaillé). Aucune explosion constatée aujourd'hui. | Oui — nouveau garde-fou T9 (§5), plafond généreux (40 primitives), n'empêche pas un futur réalisme raisonnable. |
| Q13 | Découplage | La présentation ne doit pas modifier simulation/connectivité/géométrie/résolution/préparation/canonicalRegistry. | Vérifié : aucun fichier de `components/parts/` n'importe quoi que ce soit de `simulator/` (grep exhaustif, résultat vide). `componentDefinitions.test.js` verrouille déjà la non-mutation des objets pin canoniques. | Oui — nouveau test T5 (§5) + tests existants (COMP-004/007/008). |
| Q14 | Déterminisme | Un même état logique doit produire le même rendu. | Vérifié par ce ticket : aucun `Math.random()`/`Date.now()` trouvé dans `components/parts/*.jsx`. **Exception notable** : `CapacitorPart.jsx` utilise un id de gradient SVG statique non namespacé (`id="capacitor-disk"`, ligne 21) — deux instances de CAPACITOR produisent deux éléments `<radialGradient>` de même id dans le DOM (violation mineure de l'unicité SVG ; sans conséquence visuelle actuelle car les deux gradients sont strictement identiques, mais un `[RISQUE]` documenté §6 pour tout futur travail qui différencierait les instances). | Oui — nouveau test T8 (§5, rendu deux fois → sortie identique) pour les 16 types ; le cas capacitor-disk est documenté mais **non corrigé** dans ce ticket (modification de `CapacitorPart.jsx` hors périmètre autorisé — voir CSA GO). |

---

## 3. Cartographie (Phase 1 — synthèse)

Cartographie complète effectuée sans modification sur : `components/parts/`, `components/`, `canvas/`, `visualization/`, `utils/`, CSS associés, `PartRenderer.jsx`, `CircuitComponent.jsx`, `Pin.jsx`, `visualStateRegistry.js`, `defaultVisualStateRegistrations.js`, ainsi que les contrats MB-VIS-COMP-002 à 008.

**Chaîne de rendu (FAIT OBSERVÉ)** :
`CircuitComponent.jsx` lit `getComponentDef(type)` → rend un `div.circuit-component` dimensionné puis délègue à `PartRenderer.jsx` → `PartRenderer` enrichit les props via `getVisualState(type, ctx)` (registre pur, `{}` par défaut) → délègue à `VisualizationManager.render(type, props)` → résout le composant React via `RendererRegistry`/`DEFAULT_REGISTRATIONS` → le `XPart.jsx` retourné dessine son propre `<svg>`. En parallèle, `CircuitComponent.jsx` itère `def.pins` et rend un `<Pin>` HTML (pas SVG — un `<button>` circulaire stylé CSS) positionné via `getPinPresentationPosition()`.

**Constat central** : le pipeline de rendu est déjà génériquement découplé par type (aucun branchement `type === "X"` dans `PartRenderer.jsx` ni `VisualizationManager.js` ; exactement 2 occurrences légitimes et documentées dans `CircuitComponent.jsx`, toutes deux pour LED et purement présentationnelles — masquage du fond du wrapper et du marqueur de pin natif, puisque le SVG de LED dessine lui-même ses pattes). Ce pipeline **n'a pas besoin d'être modifié** pour que les tickets suivants améliorent le réalisme des composants un par un.

**Deux strates de qualité visuelle coexistent** (FAIT OBSERVÉ, détail §4) : LED (et dans une moindre mesure Capacitor) avec gradients/relief, contre 14 renderers en couleurs plates pilotées par classes CSS. Aucun design system (tokens de couleur, convention de matériau, de stroke, de sélection, de survol) n'existe pour unifier ces strates (§6).

---

## 4. Baseline technique mesurée (Phase 3)

### 4.A — Inventaire

- 16 renderers `components/parts/*Part.jsx` (704 lignes cumulées), + `PartRenderer.jsx` (orchestrateur générique, 63 lignes).
- Familles représentées : LED/RGB_LED (émetteurs lumineux), passifs 2 pins (Resistor/Capacitor/LDR/Thermistor/Diode/Inductance-non présente), interaction (Button/ButtonLatching), actif 3 pins (NpnTransistor/Potentiometer), cartes (Arduino), sortie (Buzzer/Servo/DcMotor/Power), et le Breadboard (`canvas/Breadboard.jsx`, hors dossier `parts/` mais dans le même périmètre visuel).

### 4.B — Nombre de primitives SVG par composant (échantillon représentatif, comptage direct dans le `<svg>` racine)

| Composant | rect | circle | line | path | ellipse | `<defs>` | gradients | Total primitives |
|---|---|---|---|---|---|---|---|---|
| LedPart | 2 | 4 | 0 | 20 | 1 | 1 | 6 (4 linear + 2 radial) | 27 |
| CapacitorPart | 0 | 0 | 2 | 1 | 2 | 1 | 1 radial | 5 |
| ResistorPart | 3 | 0 | 2 | 0 | 0 | 0 | 0 | 5 |
| ButtonPart | 1 | 2 | 2 | 0 | 0 | 0 | 0 | 5 |
| NpnTransistorPart | 0 | 0 | 4 | 1 | 0 | 0 | 0 | 5 |
| PotentiometerPart | 1 | 1 | 4 | 0 | 0 | 0 | 0 | 6 |
| ArduinoPart | 6 | 0 | 4 | 0 | 0 | 0 | 0 | 10 |
| Breadboard | 1 corps + N trous/rails générés dynamiquement (`.map`) | — | — | — | — | 0 | 0 | variable (proportionnel au nombre de trous) |

Plage observée hors Breadboard (dynamique par nature) : **5 à 27 primitives**. Aucune explosion.

### 4.C — Gestion des états, dimensions, pins (rappel des contrats déjà établis, non modifiés par ce ticket)

- Dimensions : `getComponentDef(type).width/height`, contrat COMP-006, zéro exception.
- Pins : `getPinPosition()`/`getPinPresentationPosition()`, contrat COMP-005/007, une seule exception présentationnelle (LED).
- États visuels : `visualStateRegistry.js`, 2 types sur 16 enregistrés (LED, RGB_LED) ; les 14 autres sont des composants sans prop dynamique électrique.

### 4.D — Comportement au zoom

`SimulationCanvas.jsx` applique `transform: scale(zoom)` sur l'ensemble du canvas. Aucun LOD, aucune simplification conditionnelle au zoom, aucun composant ne change de représentation SVG selon le niveau de zoom.

### 4.E — Sélection / survol

Sélection : style inline uniforme (`outline`), calculé une fois dans `CircuitComponent.jsx`, indépendant du type. Survol : riche sur les pins (`Pin.css`), **absent** sur le corps du composant (`CircuitComponent.css` ne définit aucun `:hover` pour `.circuit-component`).

### 4.F — Duplication identifiée

- Couleurs codées en dur répétées entre classes CSS distinctes sans registre central (ex. `#9ca3af` répété dans au moins 7 règles CSS de pattes différentes ; `#1f2937` répété comme couleur de corps sombre dans 4 classes distinctes).
- `CapacitorPart.jsx` : id de `<radialGradient>` non namespacé par instance (`"capacitor-disk"`), contrairement à `LedPart.jsx` qui préfixe ses ids par `uid`.

### 4.G — Design system

**Absent.** Aucun fichier de tokens graphiques (couleur, matériau, stroke, sélection, survol, pin) n'existe dans le dépôt à ce commit. Toutes les couleurs/effets sont codés en dur, dispersés entre `CircuitComponent.css` et les `*Part.jsx` individuels.

---

## 5. Tests de garde ajoutés (Phase 4/8)

Fichier : `frontend/src/__tests__/renderQualityGate.test.jsx`.

Ces tests valident des **propriétés structurelles** (contrat), jamais une implémentation graphique précise, pour ne pas bloquer les tickets EXP3 suivants qui amélioreront le réalisme :

- **T1** — le présent contrat existe et documente Q1-Q14 (garde contre suppression accidentelle).
- **T2** — pour tous les types réels, le conteneur `CircuitComponent` (`div.circuit-component`) a `width`/`height` strictement égaux à `getComponentDef(type).width/height` (étend Q2 au niveau du wrapper, jamais testé jusqu'ici).
- **T3** — pour tous les types réels et tous leurs pins, la position du `<Pin>` rendu par `CircuitComponent` correspond exactement à `getPinPresentationPosition()` (étend Q4 au niveau du wrapper).
- **T5** — aucun fichier de `components/parts/*.jsx` n'importe quoi que ce soit de `simulator/` (garde Q13/Q7 : la présentation ne peut pas se coupler directement à l'électrique).
- **T6** — aucune comparaison de type non répertoriée dans `CircuitComponent.jsx`, `Pin.jsx`, `PartRenderer.jsx` au-delà des 2 exceptions LED déjà connues et documentées (étend la méthode de garde générique introduite par MB-VIS-COMP-008 à la couche de rendu).
- **T8** — pour chacun des 16 types, deux rendus successifs avec les mêmes props produisent un HTML strictement identique (déterminisme, Q14).
- **T9** — pour chacun des 16 types, le nombre de primitives SVG du `<svg>` racine reste sous un plafond généreux de 40 (garde-fou performance Q12, non bloquant pour un futur réalisme raisonnable — LED, le plus détaillé aujourd'hui, en compte 27).

**Déjà couverts par des tickets antérieurs (non dupliqués ici)** : T4 (non-mutation de la géométrie électrique — `componentDefinitions.test.js`), une grande partie de T2/T3 au niveau des `*Part.jsx` eux-mêmes (`partDimensionsCanonical.test.jsx`, `partDimensionsGuard.test.js`, `pinFootprintContract.test.js`), et le principe général de séparation état/présentation (`visualStateRegistry.js`, COMP-002).

**Non couvert par un test (limite assumée)** : T7 (cohérence des matériaux/conventions) — aucune convention n'existe encore à vérifier ; Q1/Q3/Q10/Q11 (identité, échelle perçue, lisibilité au zoom, cohérence inter-familles) relèvent d'un jugement visuel humain, pas d'une assertion automatisable sans infrastructure de comparaison d'images (explicitement hors périmètre de ce ticket, §9 "Design System : audit, pas refonte").

---

## 6. Risques et recommandations pour les tickets EXP3 suivants

- `[RISQUE]` Absence de design system : chaque futur ticket de composant (LED-010, COMP-011…) risque de réinventer sa propre convention de matériau/couleur/ombre, reproduisant la fragmentation déjà observée. `[RECOMMANDATION]` : introduire des tokens graphiques minimaux (palette de couleurs de matériaux de base) au moment du premier ticket qui en a réellement besoin (probablement MB-VIS-LED-010 ou MB-VIS-COMP-011), pas de manière spéculative ici.
- `[RISQUE]` `CapacitorPart.jsx` : id de gradient SVG dupliqué entre instances (`"capacitor-disk"`). Sans conséquence visible aujourd'hui (gradients identiques), mais latent. `[RECOMMANDATION]` : corriger par namespacing (`${uid}-capacitor-disk`, sur le modèle de LED) lors du ticket qui touchera Capacitor (MB-VIS-COMP-014).
- `[RISQUE]` Absence de `:hover` sur le corps des composants (incohérence avec le `:hover` riche des pins). `[RECOMMANDATION]` : à traiter explicitement dans un ticket Canvas/interaction (MB-VIS-CANVAS-026, "Profondeur, ombres et feedback d'interaction"), pas dans COMP-009.
- `[RECOMMANDATION]` Les futurs tickets qui amélioreront le réalisme d'un composant peuvent légitimement faire grimper son nombre de primitives SVG au-delà de la moyenne actuelle : le plafond T9 (40) est délibérément généreux et ne doit pas être interprété comme une limite de qualité visuelle, seulement comme un garde-fou anti-explosion accidentelle.
