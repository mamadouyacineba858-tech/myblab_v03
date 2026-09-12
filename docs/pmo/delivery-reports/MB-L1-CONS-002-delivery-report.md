# MB-L1-CONS-002 — Renderer Contract Consolidation

Base: `9452a2a0b2b935124fbfb366428c1c29caf2e6fd`
Branch: `feat/MB-L1-CONS-002-renderer-contract`
Commit message: `test(level1): consolidate renderer contracts`

## Objectif du ticket

Fermer les 30 derniers échecs historiques (Cluster B, 6 fichiers) et atteindre
`FAIL = 0` sur la suite canonique, en réconciliant le renderer réel de
CAPACITOR/THERMISTOR (CSS/DOM), la métadonnée de présentation
(`defaultRegistrations.js`) et le contrat de test — sans jamais restaurer le
raster abandonné et sans modifier `CapacitorPart.jsx`/`ThermistorPart.jsx`.

## Root cause

`CapacitorPart.jsx` et `ThermistorPart.jsx` avaient déjà été réécrits (avant
ce ticket) en renderers CSS/DOM purs : un `<div>` racine dimensionné
dynamiquement depuis `componentDefinitions.js`, un `<div>` interne stylé
(`radial-gradient`, marquage "104" pour CAPACITOR ; "NTC"/"100-9" pour
THERMISTOR) — **aucun `<img>`, aucun `<picture>`, aucun `<svg>`**.
`visualization/defaultRegistrations.js` déclarait pourtant encore
`visual: { backend: 'raster' }` pour ces deux types : une pure dette de
métadonnée, confirmée fausse par lecture directe des deux renderers avant
toute modification.

## CAPACITOR renderer truth

Corps CSS/DOM : disque radial orange/marron avec le marquage "104" (valeur
céramique standard), aucun marqueur de polarité (composant non polarisé,
distinct de `POLARIZED_CAPACITOR`). Dimensions du `<div>` racine dérivées
dynamiquement de `getComponentDef('CAPACITOR')` (70×40). Pins électriques
`pinA`/`pinB` inchangés (0,20)/(70,20) ; géométrie physique réelle des
contacts (23,62)/(47,62), consolidée par MB-L1-CONS-001, non affectée par ce
ticket. Pattes dessinées par `AssemblyLeadsLayer` (root mécanique du profil
`assemblyProfiles.js`, non modifié).

## THERMISTOR renderer truth

Corps CSS/DOM : perle NTC sombre verticale avec identité visible "NTC" /
"100-9". Dimensions du `<div>` racine dérivées dynamiquement de
`getComponentDef('THERMISTOR')` (84×36). Pins électriques `A`/`B` inchangés
(0,18)/(84,18) ; géométrie physique réelle des contacts (30,62)/(54,62),
consolidée par MB-L1-CONS-001, non affectée. Pattes dessinées par
`AssemblyLeadsLayer`.

## Réconciliation de la métadonnée

`frontend/src/visualization/defaultRegistrations.js` — pour CAPACITOR et
THERMISTOR uniquement :

```diff
- visual: { backend: 'raster' }
+ visual: { bareBody: true, markerless: true }
```

`backend` retombe donc sur `svg` (valeur par défaut de `resolvePresentation()`
— **aucun nouveau backend `"css"` inventé**, conformément à l'interdiction du
ticket). `bareBody`/`markerless` sont déclarés **explicitement** à `true`
(plutôt que de laisser `visual` totalement absent) : vérifié réellement en
rendu (`CircuitComponent.css` `[data-bare-body]`) que sans cette déclaration
explicite, `bareBody`/`markerless` retomberaient à `false` (défaut du backend
`svg`), ce qui aurait réintroduit l'habillage « carte » générique (fond,
bordure, coins arrondis, ombre) derrière le corps CSS déjà stylé, et aurait
fait réapparaître le disque visuel du `<Pin>` par-dessus l'extrémité de patte
déjà dessinée par `AssemblyLeadsLayer` — une régression visuelle réelle,
évitée. Ce mécanisme (`bareBody`/`markerless` indépendants de `backend`) est
le contrat **existant** de `resolvePresentation()` (`visualContract.js`,
NON modifié) — même schéma que LED (backend raster, mêmes drapeaux) appliqué
ici à un backend `svg`.

## Tests migrés (invariant remplacé, jamais affaibli ni supprimé)

- **`CapacitorPart.raster.test.jsx`** / **`ThermistorPart.raster.test.jsx`** —
  réécriture complète du contrat : aucun `<img>`/`<picture>` exigé, aria-label
  réel vérifié ("Condensateur céramique non polarisé" / "Thermistance NTC"),
  identité visible ("104" / "NTC"+"100-9"), dimensions du `<div>` racine
  dérivées dynamiquement, backend résolu `svg` + `bareBody`/`markerless` à
  `true` vérifiés via `getComponentPresentation()`, positions `<Pin>` au
  PhysicalContact réel consolidé par MB-L1-CONS-001 ((23,62)/(47,62) et
  (30,62)/(54,62) — plus les anciennes coordonnées `pin.dx/dy`), interaction
  pointeur sur le wrapper `.circuit-component` inchangée.
- **`partDimensionsCanonical.test.jsx`** — trois familles désormais
  distinguées explicitement (au lieu du seul clivage SVG/raster) :
  `PHYSICAL_DOM_PARTS` (CAPACITOR/THERMISTOR : le `<div>` racine EST la boîte
  canonique, dynamique) ; `WRAPPER_DIMENSIONED_RASTER_PARTS` (LDR : le `<div>`
  racine est dynamique, l'`<img>` interne reste à sa taille NATIVE fixe) ;
  `PARENT_DELEGATED_RASTER_PARTS` (RGB_LED : ni le `<div>` racine — toujours
  `100%`/`100%` — ni l'`<img>` ne consomment la boîte canonique au rendu
  standalone ; le dimensionnement réel est délégué au parent
  `.circuit-component__body`, déjà verrouillé par `renderQualityGate.test.jsx`
  TEST T2/T3, inchangé et PASS). Les 2 échecs LDR/RGB_LED de ce fichier
  n'étaient donc pas liés à CAPACITOR/THERMISTOR : root-cause distincte
  (mélange dimensions d'asset / boîte canonique que le ticket demandait
  explicitement de ne pas réintroduire), migrée avec la même rigueur.
- **`partDimensionsGuard.test.js`** — nouvelle branche pour les renderers
  CSS/DOM physiques (aucun `<svg>`, aucun `<img>`, import `getComponentDef`
  requis). Le 3ᵉ échec pré-existant (`RgbLedPart.jsx` n'importe pas
  `getComponentDef`, déjà noté classe A distincte dans
  `KNOWN-BROKEN-STATE.md` §3.2 avant ce ticket) est migré vers une vérification
  RUNTIME : les dimensions codées en dur (90×56) sont comparées à
  `getComponentDef('RGB_LED')` plutôt que d'exiger un import qui n'existe
  légitimement pas (pipeline multi-état dédié, 8 états r/g/b).
- **`RealisticRenderers.test.jsx`** — CAPACITOR/THERMISTOR exclus des lots
  `!isRaster`/`isRaster` génériques (ils ne satisfont ni l'un ni l'autre) et
  couverts par un test dédié « renderer CSS/DOM physique » ; aria-labels
  corrigés pour refléter le texte réel.
- **`renderQualityGate.test.jsx`** — TEST T9 (garde-fou primitives SVG) :
  le repli `if (!svg)` acceptait auparavant uniquement "raster avec `<img>`" ;
  étendu pour accepter aussi "CSS/DOM physique sans `<img>`" (0 primitive SVG
  dans les deux cas, sous le plafond par construction) tout en exigeant qu'un
  élément racine réel ait été rendu (jamais un rendu vide). Aucune autre
  section de ce fichier n'a nécessité de changement : T2/T3/T5/T6/T8/T10 sont
  déjà pilotés génériquement par le registre (`getComponentPresentation`),
  donc auto-adaptatifs.

### Fichier adjacent migré (anticipé explicitement par le ticket, §RASTER CATALOG INVARIANT)

`src/visualization/__tests__/visualContract.test.js` affirmait littéralement
que « les composants du catalogue sont désormais raster, plus aucun type ne
reste en svg » et énumérait CAPACITOR/THERMISTOR comme raster dans 3
assertions. Ce fichier n'est pas l'un des 6 fichiers Cluster B, mais le
ticket anticipait explicitement cette exacte casse dans sa section RASTER
CATALOG INVARIANT (« ces commentaires ne sont plus exacts... corriger
uniquement les documents/métadonnées directement concernés, ne pas réécrire
toute la roadmap »). Corrigé au minimum : les 3 assertions passent
CAPACITOR/THERMISTOR à `backend: 'svg'`, et la liste des types raster déclarés
exclut désormais ces deux types (18 raster + 2 svg = 20, catalogue toujours
intégralement couvert). Consigné explicitement : **le catalogue visuel reste
entièrement implémenté ; l'usage du backend raster n'est plus une obligation
technique uniforme pour chaque composant — c'est un choix de présentation par
type, jamais un critère de qualité/réalisme.**

## Garde-fous de qualité préservés

Aucun garde-fou n'a été affaibli : les renderers CSS/DOM physiques doivent
toujours prouver un rendu déterministe (test dédié conservé), les dimensions
canoniques exactes (nouveau test dédié, dynamique), l'absence de logique
électrique et de branchement `type === "…"` central (TEST T5/T6, inchangés,
génériques), un comportement pointeur compatible (wrapper `.circuit-component`
capte les événements, corps CSS ne les capte pas — testé explicitement), un
corps physique identifiable (aria-label + identité visuelle textuelle
vérifiés), et les contacts/pattes gérés par l'architecture établie
(`AssemblyLeadsLayer` + PhysicalContact CONS-001, testé explicitement).

## MB-L1-CONS-001 : régression

Ré-exécuté explicitement : `contactModel.test.js`, `resolveComponentContactHoles.test.js`,
`assemblyGeometry.test.js`, `src/components/assembly`, `src/visualization`,
`src/canvas` — **14 fichiers, 277/277 PASS**. Contacts CAPACITOR/THERMISTOR,
insertion breadboard, `AssemblyLeadsLayer` : tous verrouillés et inchangés.

## Résultats ciblés

- Les 6 fichiers Cluster B, exécutés ensemble : **319/319 PASS** (0 échec,
  contre 30 échecs avant migration).
- Régression élargie (`src/components/parts`, `src/utils/__tests__`,
  `src/config`, `src/hooks`) : **63 fichiers, 1047/1047 PASS**, zéro
  régression sur l'ensemble du catalogue de renderers (BUTTON, LED, LDR,
  RGB_LED, POWER, ARDUINO, etc. tous re-vérifiés).

## Résultat suite complète

Commande : `npm --prefix frontend run test:ci -- --reporter=default --reporter=json --outputFile=cons002-full.json`

**2897 PASS / 0 FAIL / 2897 TOTAL**, 216 fichiers, **exit code 0**.

Le total est passé de 2899 (fin CONS-001) à 2897 (-2) : `renderQualityGate.test.jsx`
TEST T10 (intégrité des paquets d'assets raster) génère un test par type
RÉELLEMENT raster — CAPACITOR/THERMISTOR n'ayant plus d'assets raster à
vérifier, leurs 2 tests d'intégrité disparaissent naturellement (boucle
générique pilotée par le registre `getComponentPresentation`, comportement
voulu et auto-adaptatif, pas une suppression manuelle). Aucun test n'a été
supprimé pour atteindre 0 FAIL ; plusieurs assertions ont été ajoutées/scindées
pour verrouiller le nouvel invariant (dimensions canoniques par famille de
renderer) sans jamais affaiblir un invariant existant.

## Browser smoke

Circuit réel dans le Browser pane (serveur de dev réel) :

1. CAPACITOR placé — corps orange radial visible, marquage "104" lisible,
   deux pattes dessinées jusqu'aux pins.
2. THERMISTOR placé — corps sombre visible, identité "NTC"/"100-9" lisible,
   deux pattes dessinées jusqu'aux pins.
3. Les deux corps sont rendus **sans habillage « carte »** générique (pas de
   fond/bordure/ombre autour du disque ou de la perle) — confirme `bareBody:true`
   réellement appliqué.
4. Sélection : CAPACITOR puis THERMISTOR sélectionnés individuellement
   (panneau Propriétés à jour dans chaque cas — capacité 0,0001 F pour
   CAPACITOR, résistance 10000 Ω pour THERMISTOR).
5. Déplacement : les deux composants déplacés par glisser-déposer sans erreur,
   les pattes suivent la nouvelle position.
6. Câblage : un fil créé entre le contact `A` de CAPACITOR et le contact `A`
   de THERMISTOR (`Fils : 1` confirmé), tracé visible reliant exactement les
   deux extrémités de patte.
7. Console navigateur : **0 erreur** relevée à tout moment de la séquence.

Aucun benchmark visuel complet n'a été requis (réservé à la reprise de
MB-VIS-TINKERCAD-048).

## Build / Typecheck / Diff-check

- Build (`npm --prefix frontend run build`) : **PASS**.
- Typecheck (`cd frontend; npx tsc -b`) : **PASS**.
- `git diff --check` : **PASS** (seuls avertissements CRLF/LF bénins).

## Fichiers modifiés

Production (1 fichier, seul changement autorisé par le ticket) :

- `frontend/src/visualization/defaultRegistrations.js`

Tests (7 fichiers — les 6 fichiers Cluster B du périmètre principal, plus
1 fichier adjacent explicitement anticipé par la section RASTER CATALOG
INVARIANT du ticket, cf. section dédiée ci-dessus) :

- `frontend/src/components/parts/__tests__/CapacitorPart.raster.test.jsx`
- `frontend/src/components/parts/__tests__/ThermistorPart.raster.test.jsx`
- `frontend/src/components/parts/__tests__/partDimensionsCanonical.test.jsx`
- `frontend/src/components/parts/__tests__/partDimensionsGuard.test.js`
- `frontend/src/components/parts/__tests__/RealisticRenderers.test.jsx`
- `frontend/src/__tests__/renderQualityGate.test.jsx`
- `frontend/src/visualization/__tests__/visualContract.test.js`

Documentation :

- `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` — Cluster B
  marqué CLOSED, baseline canonique mise à jour à 0 FAIL, historique QA-047
  préservé tel quel (non réécrit).
- `docs/pmo/delivery-reports/MB-L1-CONS-002-delivery-report.md` (ce fichier).

## Fichiers de production NON modifiés

`CapacitorPart.jsx`, `ThermistorPart.jsx`, `componentDefinitions.js`,
`contactModel.js`, `breadboardGeometry.js`, `assemblyProfiles.js`,
`AssemblyLeadsLayer.jsx`, `CircuitComponent.jsx`, `Pin.jsx`,
`visualContract.js`, `simulation/*`, `core/*`, `history/*`, `arduino/*` —
tous strictement inchangés, confirmé par `git status --short`.

## Échecs connus restants

**Aucun.** La suite canonique complète est à 0 FAIL / 2897 PASS / 2897 total.
Cluster A (MB-L1-CONS-001) et Cluster B (MB-L1-CONS-002) sont tous deux
fermés. `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` reflète
cette baseline.
