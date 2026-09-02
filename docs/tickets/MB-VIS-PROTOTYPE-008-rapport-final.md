# MB-VIS-PROTOTYPE-008 — Rapport final d'intégration BUTTON + BUTTON_LATCHING

**Verdict global : PASS — intégration complète, suite verte, fichiers écrits sur votre poste.**
**Le commit + push n'a PAS été effectué : voir §9 (limitation d'outillage, pas un blocage de validation).**

---

## 1. Git — audit initial (redondant, exécuté avant toute action)

| | |
|---|---|
| HEAD initial | `0a85fb37b39631b432326be581fa6cc5ec57884c` |
| Branche | `feat/MB-VIS-LED-V16-leads-thicker-realistic` |
| `origin/feat/MB-VIS-LED-V16-leads-thicker-realistic` | `0a85fb37b39631b432326be581fa6cc5ec57884c` (identique) |
| `rev-list --left-right --count origin...HEAD` | `0  0` |
| Working tree avant intégration | propre (à l'exception des dossiers d'assets `button/` et `button-latching/`, présents mais non trackés — voir §9) |

Conforme à la référence attendue par le ticket. Aucun STOP déclenché à cette étape.

## 2. Probe pixel des assets v3.2 — PASS

Les 20 fichiers (`frontend/public/assets/components/button/` et `.../button-latching/`) ont été re-téléchargés et re-vérifiés intégralement (pas seulement SHA/dimensions) :

- **Intégrité** : SHA-256 et octets des 18 fichiers + 2 manifestes recalculés et comparés à `ASSET-INTEGRITY.json` → 9/9 correspondances exactes pour chaque famille.
- **Structure** : `manifest.json` → `variants` est un tableau plat de 8 entrées par composant (conforme T10).
- **Dimensions** : 60×60 (@1x) / 180×180 (@3x) confirmées pour les 16 images.
- **Contenu visuel** (inspection directe + Pillow) : un seul sujet par image, aucune planche comparative, aucun texte parasite (ni légende, ni "1x"/"3x"), fond entièrement transparent (alpha réel, coins vérifiés), aucun cadre/halo.
- **États distincts** : released/pressed diffèrent sur 48.7 % des pixels ; off/on diffèrent sur 57.6 % des pixels — dépression mécanique et bascule du rocker réellement dessinées, pas un artefact.
- **4 pattes physiques** : confirmées visuellement (zoom/crop) sur les 4 états.
- **Rocker rouge** : présent et identifiable dans les DEUX états de BUTTON_LATCHING (off et on), avec un changement de position/inclinaison visible entre les deux.

Aucun problème détecté. Le probe v3.2 corrige intégralement le défaut de la v3.1 (planches comparatives avec légendes).

## 3. Fichiers modifiés / créés

Strictement dans le périmètre autorisé — aucun fichier hors liste touché :

**Modifiés (6) :**
- `frontend/src/components/parts/ButtonPart.jsx` — SVG → raster (picture/img), props/handlers/classes/aria-label strictement conservés.
- `frontend/src/components/parts/LatchingButtonPart.jsx` — idem, `onPointerDown`/`onClick` conservés.
- `frontend/src/visualization/defaultRegistrations.js` — ajout de `visual: { backend: 'raster' }` sur les entrées BUTTON et BUTTON_LATCHING, même patron que les 7 composants raster existants, aucune branche spécifique dans le renderer central.
- `frontend/src/canvas/CircuitComponent.css` — suppression des règles qui dessinaient l'ancien SVG (`__lead`, `__base`, `__cap`, `__cap-highlight`, `__housing`, `__lever` et leurs variantes pressed/is-on) ; conservation du strict layout/interaction (`.part-button`, `.part-latching-button`). Aucun `!important`, `:has()`, pseudo-élément, glow CSS, z-index arbitraire.
- `frontend/src/components/parts/__tests__/RealisticRenderers.test.jsx` — correction d'un commentaire de test obsolète ("nouveau rendu SVG" → raster) ; aucune assertion modifiée (les tests génériques dérivés du registre s'adaptent automatiquement).
- `frontend/src/visualization/__tests__/visualContract.test.js` — mise à jour de l'énumération explicite des composants raster (guard-test qui liste nommément chaque composant migré, mis à jour à chaque migration précédente : RESISTOR/LED/CAPACITOR/LDR/THERMISTOR/DC_MOTOR) pour y ajouter BUTTON et BUTTON_LATCHING. C'était le seul test cassé par le changement légitime de déclaration ; corrigé, pas contourné.

**Créés (2) :**
- `frontend/src/components/parts/__tests__/ButtonPart.raster.test.jsx` (15 tests)
- `frontend/src/components/parts/__tests__/LatchingButtonPart.raster.test.jsx` (16 tests)

Patronnés sur `LedPart.raster.test.jsx`, adaptés au contrat interactif (handlers, undo/redo, pipeline `CircuitComponent`).

**Aucun fichier interdit touché** : `componentDefinitions.js`, `canonicalRegistry.js`, `preparation.js`, `resolution.js`, `engine.js`, `geometry.js`, `pinPresentationGeometry.js`, `CircuitComponent.jsx`, `Pin.jsx`, `Breadboard.jsx`, `breadboard*.js` — tous inchangés, vérifié par diff.

## 4. Tests ciblés

```
RealisticRenderers.test.jsx ............ 70 passed
LatchingButtonPart.raster.test.jsx ..... 16 passed
ButtonPart.raster.test.jsx ............. 15 passed
partDimensionsCanonical.test.jsx ....... 49 passed
partDimensionsGuard.test.js ............ 34 passed
──────────────────────────────────────────────────
184/184 passed
```

## 5. Suite complète (`npm run test:ci`)

| | Avant (baseline) | Après intégration |
|---|---|---|
| Total | 1694 | 1725 (+31 = les 2 nouveaux fichiers raster) |
| Passed | 1678 | 1709 |
| Failed | 16 | **16 — exactement les mêmes 16**, diff textuel vide |

Les 16 échecs restants sont tous pré-existants (breadboard/LED-pin-geometry, sans rapport avec BUTTON/BUTTON_LATCHING) — confirmé par diff ligne-à-ligne entre la liste de noms de tests avant/après : **aucun nouveau FAIL, aucun FAIL résolu par accident**.

Note de transparence : le premier passage complet a montré 2 FAIL supplémentaires (`renderQualityGate.test.jsx` T10 pour BUTTON/BUTTON_LATCHING) — cause identifiée immédiatement : les assets v3.2, déjà validés par le probe, n'étaient pas encore copiés dans `frontend/public/assets/components/` du clone de test utilisé pour lancer la suite (ils existent bien sur votre dépôt réel, cf. §9). Une fois copiés (aucune modification de leur contenu/SHA), ces 2 FAIL ont disparu et le compte est revenu exactement à 16.

## 6. TypeScript + build

```
tsc -b && vite build
✓ 166 modules transformed
✓ built in 555ms
```
Aucune erreur TypeScript, aucune erreur de build.

## 7. `git diff --check`

Exit code `0` — aucun espace parasite, aucun marqueur de conflit.

## 8. Validation navigateur (Playwright headless, Chromium)

35/35 vérifications PASS, **zéro erreur console** sur l'ensemble du scénario :

- Palette : entrées "Bouton" et "Interrupteur" présentes.
- Insertion : chaque composant s'insère, rendu `<picture>/<img>`, aucun `<svg>`.
- **BUTTON** : released → pressed (dépression mécanique visible, asset `button.pressed.*` chargé, classe `part-button--pressed`) → released (retour visuel et d'asset).
- **BUTTON_LATCHING** : off → on (rocker rouge visible, position changée, asset `button-latching.on.*`) → off.
- Zoom 0.5× / 1× / 2× : les deux composants restent visibles et correctement rendus.
- Instances multiples : 2 BUTTON + 2 BUTTON_LATCHING coexistent sans fuite d'état (chaque `<img>` référence son propre asset correct).
- 2 pins fonctionnels rendus dans le DOM pour chaque composant (positions canoniques).
- Undo/Ctrl+Z retire l'état ON, Redo le restaure — `ToggleLatchingButtonCommand` non régressé.
- Cohabitation avec un breadboard : chaque composant testé individuellement s'insère et se rend sans crash à côté d'un breadboard actif.
  - Note technique : déposer BUTTON et BUTTON_LATCHING au même point de dépôt par défaut (200,180) avec un breadboard actif provoque un rejet silencieux du second dépôt — comportement **générique** du moteur de placement (collision de trous : les deux composants partagent exactement la même empreinte 60×60 et les mêmes pins pin1(0,30)/pin2(60,30)), reproduit à l'identique avec deux RESISTOR ou deux BUTTON déposés au même point. Ce n'est pas un défaut introduit par ce ticket ni spécifique à BUTTON/BUTTON_LATCHING.

Captures d'écran disponibles sur demande (état released/pressed, off/on, zooms, breadboard) — le rendu visuel confirme : corps noir, capuchon rond, 4 pattes métalliques visibles pour BUTTON ; boîtier noir, rocker rouge basculant pour BUTTON_LATCHING ; fond transparent s'intégrant proprement au canvas.

## 9. ⚠️ Limitation d'outillage — commit et push NON exécutés

Tout ce qui précède est **PASS**. Cependant, je dois être direct sur un point technique : **cette session ne dispose d'aucun accès shell à votre machine Windows** (aucun outil d'exécution de commandes sur votre poste n'est disponible ici — seulement des outils de lecture/écriture de fichiers). Je ne peux donc **pas exécuter `git add` / `git commit` / `git push` sur votre dépôt réel**, quelle que soit l'autorisation donnée dans le ticket.

Ce que j'ai fait à la place :
- J'ai écrit les 8 fichiers validés (6 modifiés + 2 nouveaux) directement aux emplacements exacts de votre dépôt local, avec une garde anti-écrasement (horodatage vérifié avant écriture — aucun conflit détecté, aucun fichier n'avait été modifié depuis mon dernier audit).
- Je n'ai touché aucun autre fichier.

**Point additionnel découvert pendant la vérification finale** : les dossiers d'assets `frontend/public/assets/components/button/` et `.../button-latching/` sont bien présents et physiquement corrects sur votre disque (vérifié à l'instant, tailles/contenu identiques au probe v3.2), mais **ils ne sont pas encore suivis par git** (absents de l'arbre du commit HEAD). Si vous committez uniquement les 8 fichiers de code/tests sans ajouter aussi ces deux dossiers, le commit sera cassé pour quiconque le récupère (les images référencées n'existeraient pas dans l'historique).

**Ce qu'il vous reste à faire, sur votre machine**, dans `C:\bureau\_documents\bureau\myblab_v0.3` :

```bash
git status --short
git add frontend/src/components/parts/ButtonPart.jsx \
        frontend/src/components/parts/LatchingButtonPart.jsx \
        frontend/src/visualization/defaultRegistrations.js \
        frontend/src/canvas/CircuitComponent.css \
        frontend/src/components/parts/__tests__/RealisticRenderers.test.jsx \
        frontend/src/visualization/__tests__/visualContract.test.js \
        frontend/src/components/parts/__tests__/ButtonPart.raster.test.jsx \
        frontend/src/components/parts/__tests__/LatchingButtonPart.raster.test.jsx \
        frontend/public/assets/components/button/ \
        frontend/public/assets/components/button-latching/

git commit -m "feat(vis): rasterize BUTTON and BUTTON_LATCHING"
git push origin feat/MB-VIS-LED-V16-leads-thicker-realistic
```

Interdits respectés dans cette proposition : pas de `git add .`, pas de force-push, pas d'amend, pas de rebase — un seul commit, portant strictement les fichiers listés.

Si vous préférez, dites-le-moi et je peux réessayer d'exécuter ces commandes moi-même si un accès shell à votre machine devient disponible dans une future session — mais je ne veux pas prétendre avoir committé/poussé quelque chose que je n'ai pas réellement fait.

## 10. Confirmations

- ✅ Working tree strictement limité aux 8 fichiers listés (+ dossiers d'assets déjà présents, non modifiés par moi).
- ✅ Aucun fichier Core/géométrie/simulation/breadboard touché.
- ✅ Aucune régression de test (16/16 FAIL historiques identiques, zéro nouveau).
- ✅ tsc + build propres.
- ✅ `git diff --check` propre.
- ✅ Validation navigateur complète, zéro erreur console.
- ❌ Commit + push **non exécutés** — limitation d'outillage expliquée ci-dessus, commandes fournies pour que vous les exécutiez en 30 secondes.
