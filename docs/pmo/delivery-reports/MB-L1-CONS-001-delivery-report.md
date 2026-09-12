# MB-L1-CONS-001 — Contact/Pin Contract Consolidation

Base: `6889d7850381c237ca9abd29d1407f83be8fa5d7`
Branch: `feat/MB-L1-CONS-001-contact-pin-contract`
Commit message: `test(level1): consolidate contact geometry contract`

## Objectif du ticket

Éliminer exclusivement les 20 échecs historiques du Cluster A
(« Contact geometry vs legacy pin geometry », `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md`
§3.1) en migrant les assertions de test obsolètes vers l'invariant
architectural déjà en vigueur dans le code de production, sans toucher à
aucun fichier de production ni au Cluster B (30 échecs, hors périmètre,
réservé à `MB-L1-CONS-002`).

## Root cause

`componentDefinitions.js` déclare, pour plusieurs types, un tableau
`contacts:[{ id, dx, dy, wireConnectable, breadboardInsertable }]`
explicite sur chaque pin — la position physique RÉELLE d'insertion/connexion,
distincte de `pin.dx/pin.dy` (identité électrique/visuelle historique).
`contactModel.js` (`resolveContacts()`), `breadboardGeometry.js`
(`resolveComponentContactHoles()`) et le rendu `<Pin>` (via
`resolveWireConnectableContacts()`) lisent tous correctement `contacts[]`
quand il est déclaré — c'est le comportement de PRODUCTION, déjà validé et
inchangé par ce ticket. Les 20 tests en échec dataient d'avant l'ajout de
`contacts[]` à ces types et assertaient encore l'ancienne parité
`contact === pin` (legacy), désormais fausse par construction pour les types
concernés :

| Type | `pin.dx/dy` | `contacts[0].dx/dy` | Écart |
|---|---|---|---|
| CAPACITOR (pinA/pinB) | (0,20) / (70,20) | (23,62) / (47,62) | réel |
| LDR (A/B) | (0,18) / (84,18) | (30,62) / (54,62) | réel |
| THERMISTOR (A/B) | (0,18) / (84,18) | (30,62) / (54,62) | réel |
| RGB_LED (R/common/G/B) | dy=56 | dy=72 | réel (dx inchangé) |
| BUZZER (plus/minus) | (42,108) / (78,108) | identique | aucun (contacts[] déclaré mais coïncident) |
| POTENTIOMETER (left/wiper/right) | (36,60,84)@108 | identique | aucun (idem) |

Pour LED / RESISTOR / DIODE, aucun `contacts[]` n'est déclaré : le repli
mono-contact implicite (`contact = { id: pin.id, dx: pin.dx, dy: pin.dy }`)
s'applique toujours à l'identique — **delta ZÉRO confirmé, aucune
modification nécessaire pour ces trois types.**

Le fichier `assemblyGeometry.test.js` avait deux échecs d'une nature
légèrement différente mais dans le même esprit de dérive test/production :
- `LED.anode.root.dy` : le test attendait `36`, `assemblyProfiles.js` déclare
  `32` (profil mécanique déjà ajusté par un ticket visuel antérieur, jamais
  répercuté dans ce test).
- `CAPACITOR` : le test le traitait encore comme un « type sans profil
  d'assemblage » (héritage FT-C-001-A, avant que FT-C-001-B ne livre l'asset
  radial avec pattes fonctionnelles) ; `assemblyProfiles.js` **et**
  `componentDefinitions.js` déclarent désormais tous deux une géométrie
  through-hole réelle pour CAPACITOR.

Aucun des 20 échecs ne révélait une violation du contrat par le code de
production — confirmé fichier par fichier avant toute modification de test
(cf. tableau ci-dessus et lecture de `contactModel.js` / `breadboardGeometry.js`
/ `assemblyGeometry.js` / `assemblyProfiles.js` / `componentDefinitions.js`,
tous inchangés).

## Tests migrés (invariant remplacé, jamais affaibli ni supprimé)

- **`src/utils/__tests__/contactModel.test.js`** — le test unique
  « 9 types mono-contact » est scindé en trois : (1) LED/RESISTOR/DIODE
  (aucun `contacts[]`, invariant inchangé) ; (2) CAPACITOR/BUZZER/
  POTENTIOMETER/LDR/THERMISTOR/RGB_LED (la géométrie lue vient de
  `contacts[].dx/dy`, jamais de `pin.dx/dy`, `contactId === pinId` préservé) ;
  (3) preuve directe que CAPACITOR/LDR/THERMISTOR/RGB_LED divergent
  RÉELLEMENT de `pin.dx/dy` (BUZZER/POTENTIOMETER coïncident par
  coïncidence — documenté, pas supposé).
- **`src/utils/__tests__/resolveComponentContactHoles.test.js`** (TEST S3-C)
  — même scission : le delta-legacy strict (comparaison directe avec
  `resolveComponentPinHoles()`) reste exigé UNIQUEMENT pour
  RESISTOR/LED/DIODE (sans `contacts[]`) ; un nouveau describe
  `MB-L1-CONS-001` couvre RGB_LED/CAPACITOR/BUZZER/POTENTIOMETER/LDR/
  THERMISTOR avec `holeAt()` comme oracle direct (même patron que TEST
  S3-A/A7) appliqué à la géométrie RÉELLE du contact déclaré — la parité
  legacy n'est plus exigée pour ces 6 types (elle n'a plus de sens
  architectural), sans qu'aucune assertion existante n'ait été affaiblie.
  TEST S3-A, TEST S3-B (BUTTON/BUTTON_LATCHING) et FT-B-001-S5 restent
  **strictement inchangés**.
- **`src/utils/__tests__/assemblyGeometry.test.js`** — `LED.anode.root`
  attendu mis à jour à `{x:128,y:232}` (dy=32, valeur réelle du profil) ;
  le sous-test CAPACITOR de la section H (« type sans profil ») est
  remplacé par un nouveau describe L dédié qui verrouille sa géométrie
  through-hole réelle (root + target issus de `contacts[]`, 2 tests :
  libre et inséré) — RESISTOR reste l'exemple valide de « type sans
  profil » dans la section H, inchangé.
- **`src/components/assembly/__tests__/AssemblyLeadsLayer.test.jsx`** —
  `y1` (root local) attendu `36→32` ; `clipPath` attendu `26px→31px`
  (`assemblyProfiles.js` : `LED.bodyClip.bottom = 31`).
- **`src/components/parts/__tests__/LdrPart.raster.test.jsx`** — positions
  `<Pin>` attendues `(0,18)/(84,18) → (30,62)/(54,62)` (PhysicalContact réel),
  dans les 2 tests concernés (5 et 5b).
- **`src/components/parts/__tests__/RgbLedPart.raster.test.jsx`** —
  positions `<Pin>` attendues `dy=56 → dy=72` (dx inchangé).

## Invariant architectural préservé

- `pin.dx/dy` = identité électrique/visuelle canonique — **jamais modifié**.
- `contacts[].dx/dy`, quand déclaré, fait autorité pour la géométrie
  physique réelle (insertion breadboard, extrémité de patte, hit target
  `<Pin>`, endpoint de fil) — **jamais** requis d'être égal à `pin.dx/dy`.
- Sans `contacts[]` déclaré : repli mono-contact implicite en `pin.dx/dy`,
  `contactId === pinId` — comportement legacy strictement préservé
  (LED/RESISTOR/DIODE, verrouillé par TEST S3-C historique inchangé).
- `contactId != pinId` reste possible (BUTTON/BUTTON_LATCHING, `1a/1b` sur
  `pin1`, `2a/2b` sur `pin2`) mais la cartographie contact → pin canonique
  reste stable — **TEST S3-B et le describe BUTTON de `contactModel.test.js`
  non touchés, 0 régression confirmée.**
- 1 pin canonique peut exposer 1..N contacts physiques — modèle
  BUTTON/BUTTON_LATCHING intact, re-vérifié par la suite ciblée.

## Résultats ciblés

- Les 6 fichiers Cluster A, exécutés ensemble : **150/150 PASS** (0 échec,
  contre 20 échecs avant migration).
- Suites contacts/assembly/breadboard/parts/canvas élargies
  (`src/utils/__tests__`, `src/components/assembly`, `src/components/parts`,
  `src/canvas`) : seuls les 5 fichiers du Cluster B présents dans ce
  périmètre échouent, avec des comptes IDENTIQUES à la baseline
  (CapacitorPart.raster 6, partDimensionsCanonical 8, partDimensionsGuard 3,
  RealisticRenderers 3, ThermistorPart.raster 8) — **0 fichier Cluster A
  résiduel, 0 nouveau fichier en échec.**
- BUTTON / BUTTON_LATCHING / CAPACITOR / LDR / THERMISTOR / RGB_LED :
  vérifiés explicitement (TEST S3-B inchangé pour BUTTON*, nouveaux tests
  MB-L1-CONS-001 pour les 4 autres) — aucune régression du modèle
  multi-contact.

## Résultat suite complète

Commande : `npm --prefix frontend run test:ci -- --reporter=default --reporter=json --outputFile=cons001-full.json`

**2869 PASS / 30 FAIL / 2899 TOTAL**, 210 fichiers passants et 6 fichiers en
échec (216 fichiers) :

| Fichier Cluster B (hors périmètre, `MB-L1-CONS-002`) | Échecs |
|---|---:|
| `partDimensionsCanonical.test.jsx` | 8 |
| `ThermistorPart.raster.test.jsx` | 8 |
| `CapacitorPart.raster.test.jsx` | 6 |
| `partDimensionsGuard.test.js` | 3 |
| `RealisticRenderers.test.jsx` | 3 |
| `renderQualityGate.test.jsx` | 2 |
| **Total** | **30** |

Exactement les 30 échecs historiques du Cluster B, comptes identiques,
zéro nouveau FAIL, zéro fichier Cluster A résiduel.

**Écart transparent avec la prédiction du ticket (2859 PASS / 2889 TOTAL) :**
le total réel est 2899 (+10) et PASS est 2869 (+10), FAIL restant exactement
30. La prédiction du ticket supposait une migration à nombre de tests
constant ; la règle de migration explicite du ticket
(« Ne pas transformer les assertions en assertions faibles. Remplacer
l'ancien invariant par le nouvel invariant architectural ») a conduit à
scinder certains tests en plusieurs `it()` plus précis (ex. séparer
« lecture de `contacts[]` » de « preuve de divergence réelle vs `pin.dx/dy` »
pour CAPACITOR/LDR/THERMISTOR/RGB_LED, et ajouter 2 tests dédiés au nouveau
profil CAPACITOR dans `assemblyGeometry.test.js`) plutôt que de corriger des
valeurs en place sans documenter le nouvel invariant. Aucun test n'a été
supprimé ; aucune assertion existante n'a été affaiblie ou retirée — le
delta est net-positif (+10 tests, tous verts).

## Build / Typecheck / Diff-check

- Build (`npm --prefix frontend run build`) : **PASS**.
- Typecheck (`cd frontend; npx tsc -b`) : **PASS**.
- `git diff --check` : **PASS** (seuls avertissements CRLF/LF bénins).

## Fichiers modifiés

Tests uniquement (6 fichiers, conforme au scope maximal du ticket) :

- `frontend/src/utils/__tests__/contactModel.test.js`
- `frontend/src/utils/__tests__/resolveComponentContactHoles.test.js`
- `frontend/src/utils/__tests__/assemblyGeometry.test.js`
- `frontend/src/components/assembly/__tests__/AssemblyLeadsLayer.test.jsx`
- `frontend/src/components/parts/__tests__/LdrPart.raster.test.jsx`
- `frontend/src/components/parts/__tests__/RgbLedPart.raster.test.jsx`

Documentation :

- `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` — Cluster A
  marqué CLOSED, baseline courante mise à jour à 30 FAIL / 6 fichiers,
  historique QA-047 préservé tel quel (non réécrit).
- `docs/pmo/delivery-reports/MB-L1-CONS-001-delivery-report.md` (ce fichier).

## Fichiers de production

**Aucun.** `componentDefinitions.js`, `contactModel.js`,
`breadboardGeometry.js`, `assemblyProfiles.js`, `AssemblyLeadsLayer.jsx`,
les renderers de production, `simulation/*`, `core/*`, `history/*` — tous
strictement inchangés, confirmé par `git status --short` (6 fichiers de
test modifiés, 2 fichiers de documentation ajoutés, rien d'autre).

## Critères d'acceptation

Cluster A : 20/20 échecs résolus par migration de test, 0 régression.
Cluster B : 30/30 échecs strictement inchangés (comptes et fichiers
identiques). Build/typecheck/diff-check PASS. BUTTON/BUTTON_LATCHING
multi-contact : 0 régression. Scope production : 0 fichier. Scope tests :
6 fichiers (maximum autorisé). Aucun STOP condition déclenché.
