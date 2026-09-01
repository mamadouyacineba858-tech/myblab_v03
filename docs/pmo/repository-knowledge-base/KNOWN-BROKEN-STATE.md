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

## 2. Build `vite build` / `npm run build` — ROUGE (pré-existant, hors périmètre)

```
✗ [lightningcss minify] Unexpected token Semicolon
  at …/node_modules/lightningcss/node/index.js:56:14
```

**Cause :** `frontend/src/canvas/Breadboard.css` contient, autour de la ligne 11, des séquences d'échappement **littérales** `` `r`n `` (résidu d'un edit PowerShell antérieur) et un `;` mal placé. `lightningcss` (utilisé par `vite build`) refuse de parser le fichier et **avorte le build entier**.

**Vérification d'isolement (Node, sans dépendance ajoutée) :**
```js
const l = require('lightningcss'); const fs = require('fs');
for (const f of ['src/canvas/CircuitComponent.css','src/canvas/Breadboard.css']) {
  try { l.transform({ filename: f, code: fs.readFileSync(f), minify: true }); console.log('OK   '+f) }
  catch (e) { console.log('FAIL '+f+' -> '+e.message) }
}
// OK   src/canvas/CircuitComponent.css
// FAIL src/canvas/Breadboard.css -> Unexpected token Semicolon
```

**Périmètre :** correctif renvoyé à `MB-VIS-INDUSTRIAL-001` (cf. `MB-VIS-RENDER-010` §6). **Ne pas corriger** dans un ticket visuel de composant. `tsc -b` reste **exit 0** — le typecheck n'est pas affecté.

## 3. Tests en échec — pré-existants (16), au commit `6759e18` + livrable RESISTOR consolidé

Suite complète (`npx vitest run --config src/simulator/vitest.config.ts`) : **1609 passed / 16 failed** (1625 total), **10 fichiers** en échec. Tous concernent la géométrie **breadboard** / **MB-VIS-LED-V5** (projection de pins de présentation LED, snapping, connectivité de fils breadboard) — **aucun** ne concerne le rendu des composants ni le RESISTOR raster.

| Fichier | Suite / test | Nb |
|---|---|---|
| `src/__tests__/AddComponentBreadboardPlacement.integration.test.jsx` | MB-BREADBOARD-003 (correctif ciblé) | 1 |
| `src/__tests__/BreadboardInsertionMutationChannel.integration.test.jsx` | MB-BREADBOARD-003 — insertion | 4 |
| `src/__tests__/BreadboardMovementDeletion.integration.test.jsx` | MB-BREADBOARD-006 — Breadboard objet Canvas | 1 |
| `src/canvas/__tests__/Breadboard.test.jsx` | MB-BREADBOARD-002 — « deux trous occupés par les pins d'une LED (écart 80px) » (`expected +0 to be 2`) | 1 |
| `src/config/__tests__/componentDefinitions.test.js` | canonical pin integration — « does not … » | 1 |
| `src/simulator/__tests__/breadboardSimulationIntegration.test.js` | MB-BREADBOARD-002 — preuve end-to-end | 2 |
| `src/utils/__tests__/breadboardPlacementAdapter.test.js` | `computeBreadboardPlacement` — snapping LED (UI-03) | 1 |
| `src/utils/__tests__/breadboardWireConnectivity.test.js` | breadboard explicit wire connectivity | 2 |
| `src/utils/__tests__/circuitSelectors.test.js` | MB-VIS-LED-V5 — wire endpoint projection | 2 |
| `src/utils/__tests__/pinPresentationGeometry.test.js` | MB-VIS-LED-V5 — presentation-only pin geometry | 1 |
| **Total** | | **16** |

### Distinguer FAIL pré-existant et régression

- **Pré-existant :** l'un des 16 ci-dessus, avec le même message. Un ticket visuel de composant **confirme** qu'ils sont identiques et ne les corrige pas.
- **Régression :** tout FAIL hors de cette liste, ou un 17ᵉ, ou un changement de message sur l'un des 16. → **STOP + analyse**. Ne jamais supprimer / affaiblir un test pour repasser au vert.
- **Preuve d'indépendance vis-à-vis d'une modif CSS/JSX de composant** (méthode utilisée en 001C.2) : `git stash push -- <fichier suspect>` → relancer le fichier de test → si le FAIL persiste à l'identique, il est pré-existant → `git stash pop`.

## 4. Environnement — Bash cassé

Le tool Bash de l'agent échoue (`fork: Resource temporarily unavailable`) dans cet environnement. Utiliser **PowerShell** pour les commandes shell, et les tools dédiés (Read / Grep / Glob) pour fichiers et recherche.
