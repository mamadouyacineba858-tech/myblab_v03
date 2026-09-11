# État cassé pré-existant — branche `feat/MB-VIS-LED-V16-leads-thicker-realistic`

**But :** éviter la ré-investigation, à chaque ticket, de problèmes déjà connus et **hors périmètre**. Documente uniquement des défauts **pré-existants confirmés**, mesurés au commit `6759e18` (base de `MB-VIS-RESISTOR-CONSOLIDATION-001`).

Mise à jour obligatoire si le nombre ou la liste changent (un nouveau FAIL est une **régression**, pas un pré-existant).

---

## 1. Commande de test canonique

Vitest utilise deux configurations. La config **canonique** (celle de `npm test` / `test:ci`) est `frontend/src/simulator/vitest.config.ts` — elle route les `*.test.{jsx,tsx}` de `src/**` vers l'environnement **jsdom** via `environmentMatchGlobs`.

**À utiliser :**
```
npm --prefix frontend run test:ci
# ou, depuis frontend/ :
npx vitest run --config src/simulator/vitest.config.ts [chemins…]
```

**À NE JAMAIS utiliser :** `npm --prefix frontend exec vitest run …` (sans `--config`). `npm exec` s'exécute en cwd racine, où aucune config vitest n'existe → environnement `node` par défaut → `ReferenceError: document is not defined` sur tout test qui rend du DOM. Ce n'est **pas** un test cassé.

De même, `npm --prefix frontend exec tsc -b` n'exécute pas le typecheck attendu (npm parse `-b` comme `--b`). Utiliser : `cd frontend ; npx tsc -b`.

## 2. Build `vite build` / `npm run build` — CORRIGÉ par `MB-VIS-INDUSTRIAL-001` (`d3a3d1f`+1)

**Historique (base `d3a3d1f` et antérieures) :** `npm run build` était **ROUGE** :
```
✗ [lightningcss minify] Unexpected token Semicolon
  at …/node_modules/lightningcss/node/index.js:56:14
```
**Cause :** `frontend/src/canvas/Breadboard.css`, ligne 11, contenait des séquences d'échappement **littérales** `` `r`n `` (résidu d'un edit PowerShell antérieur), rendant le fichier non parsable par `lightningcss` (utilisé par `vite build`) → build entier avorté.

**Correctif (`MB-VIS-INDUSTRIAL-001`) :** remplacement des `` `r`n `` littéraux par de vrais retours à la ligne. **Déclarations inchangées** (`overflow: visible`, `transform: none`), commentaire préservé, `z-index: 1` intact — aucune modification de géométrie, de `holeAt()`, ni de comportement breadboard.

**État actuel :** `lightningcss.transform()` OK sur les 3 CSS de `canvas/` ; `npx tsc -b` exit 0 ; `npm run build` **exit 0**. Si le build redevient rouge sur `lightningcss`, c'est une **régression** à traiter, pas un pré-existant.

## 3. Tests en échec — pré-existants, RÉ-ÉTALONNÉS par MB-VIS-QA-047 (base `090285e`, branche `feat/MB-VIS-LAB-046-workspace-cohesion`)

**Mise à jour du 2026-09-11 (MB-VIS-QA-047).** La figure historique de la section ci-dessus (16 FAIL / 1609 PASS, commit `6759e18`) est **obsolète** : six tickets visuels consécutifs (MB-VIS-BREAD-042 → MB-VIS-LAB-046) ont fait évoluer intentionnellement deux zones d'architecture (§3.1/§3.2 ci-dessous) sans rétro-propager les tests plus anciens qui asserttaient l'ancien comportement. MB-VIS-QA-047 a recompté et **classifié avec preuve** (lecture directe du code source et des messages d'échec verbatim, jamais une supposition) chaque échec — aucun n'est une régression (classe D).

Suite complète (`npm --prefix frontend run test:ci`) : **2654 passed / 50 failed** (2704 total), **12 fichiers** en échec, mesuré **de façon identique sur six exécutions indépendantes** au fil des tickets 042 à 047.

### 3.1 Cluster A — scission Contact/Pin (« Assembly Geometry », FT-C-001-A) — 20 échecs, classe A

`componentDefinitions.js` déclare désormais, pour CAPACITOR/LDR/THERMISTOR/RGB_LED (+ profils LED dans `assemblyProfiles.js`), un tableau `contacts:[{dx,dy,...}]` dont la position diffère intentionnellement de l'ancien `pin.dx/pin.dy`, pour un rendu de pattes physiquement exact via `AssemblyLeadsLayer`. `resolveContacts()` / `resolveComponentContactHoles()` utilisent correctement la position de niveau contact ; les tests ci-dessous assertent encore l'ancienne position de niveau pin.

| Fichier | Nb |
|---|---|
| `src/utils/__tests__/resolveComponentContactHoles.test.js` (TEST S3-C, delta legacy mono-contact) | 12 |
| `src/utils/__tests__/assemblyGeometry.test.js` | 2 |
| `src/components/assembly/__tests__/AssemblyLeadsLayer.test.jsx` | 2 |
| `src/components/parts/__tests__/LdrPart.raster.test.jsx` | 2 |
| `src/components/parts/__tests__/RgbLedPart.raster.test.jsx` | 1 |
| `src/utils/__tests__/contactModel.test.js` | 1 |
| **Sous-total** | **20** |

### 3.2 Cluster B — migration raster → CSS-drawn de CapacitorPart/ThermistorPart — 30 échecs, classe A (tests) + classe B (métadonnée)

`CapacitorPart.jsx` et `ThermistorPart.jsx` ont été **réécrits** (commentaires en code citant explicitement la référence visuelle validée CSA) pour un corps CSS `radial-gradient` avec libellé intégré, au lieu d'un `<picture><img>` raster. Les tests ci-dessous assertent encore un contrat `<img>`/raster. **Confirmé en navigateur réel (pas jsdom)** le 2026-09-11 : les deux types rendent bien un `<div>` CSS pur, zéro `<img>`, zéro asset cassé, zéro erreur console — mais `visualization/defaultRegistrations.js` déclare toujours `visual:{backend:'raster'}` pour ces deux types (**classe B** : dette de métadonnée d'architecture, sans impact fonctionnel observé).

| Fichier | Nb |
|---|---|
| `src/components/parts/__tests__/partDimensionsCanonical.test.jsx` | 8 |
| `src/components/parts/__tests__/ThermistorPart.raster.test.jsx` | 8 |
| `src/components/parts/__tests__/CapacitorPart.raster.test.jsx` | 6 |
| `src/components/parts/__tests__/partDimensionsGuard.test.js` (dont 1/3 = RgbLedPart.jsx n'importe pas `getComponentDef`, cf. note) | 3 |
| `src/components/parts/__tests__/RealisticRenderers.test.jsx` | 3 |
| `src/__tests__/renderQualityGate.test.jsx` | 2 |
| **Sous-total** | **30** |

Note : sur les 3 échecs de `partDimensionsGuard.test.js`, 2 relèvent bien du cluster B (Capacitor/Thermistor `<img>` attendu, absent) ; le 3ᵉ est distinct — `RgbLedPart.jsx` n'importe pas `getComponentDef` depuis `componentDefinitions.js` (il gère son propre pipeline d'assets multi-état avec dimensions codées en dur 90×56) — classe A (le test suppose un contrat d'import universel antérieur à ce pipeline), avec une note classe B mineure (dimensions dupliquées à deux endroits, aucun défaut fonctionnel observé en six tickets de QA navigateur).

**Total : 20 + 30 = 50, réparti sur 12 fichiers — confirmé.**

### Distinguer FAIL pré-existant et régression

- **Pré-existant :** l'un des 50 ci-dessus (§3.1/§3.2), avec le même message. Un ticket visuel de composant **confirme** qu'ils sont identiques et ne les corrige pas.
- **Régression :** tout FAIL hors de cette liste, ou un 51ᵉ, ou un changement de message sur l'un des 50. → **STOP + analyse**. Ne jamais supprimer / affaiblir un test pour repasser au vert.
- **Preuve d'indépendance vis-à-vis d'une modif CSS/JSX de composant** (méthode utilisée en 001C.2) : `git stash push -- <fichier suspect>` → relancer le fichier de test → si le FAIL persiste à l'identique, il est pré-existant → `git stash pop`.

## 4. Environnement — Bash cassé

Le tool Bash de l'agent échoue (`fork: Resource temporarily unavailable`) dans cet environnement. Utiliser **PowerShell** pour les commandes shell, et les tools dédiés (Read / Grep / Glob) pour fichiers et recherche.
