# MB-VIS-BUTTON-INTERACTION-003 — Rapport de livraison

**Titre du ticket** : Correction du conflit interaction BUTTON / drag Canvas
**Statut** : Implémentation terminée, validée (tests automatisés + navigateur réel), commit + push effectués.
**CSA GO** : Ce rapport ne déclare **aucun** CSA GO. Le CSA analysera le résultat.

---

## 1. Baseline

- **HEAD avant intervention** : `4e3cc8f9cfdaeeddd8d2b47dacac8bb716371a4f`
- **Branche** : `feat/MB-VIS-LED-V16-leads-thicker-realistic`
- **Dépôt** : `mamadouyacineba858-tech/myblab_v03`
- `git status --short` avant intervention : arbre propre (hors `.claude/` non suivi, préexistant, hors périmètre de ce ticket, non touché).

## 2. Cause racine (rappel, diagnostiquée par MB-VIS-CONTACT-AUDIT-002)

`e.preventDefault()` appelé sur l'événement `pointerdown` de BUTTON/BUTTON_LATCHING supprime entièrement l'événement `mousedown` de compatibilité que le navigateur dispatche normalement juste après (spec Pointer Events, comportement Chromium confirmé empiriquement, **non reproductible sous jsdom**). Or c'est uniquement ce `mousedown`, reçu par `.circuit-component` (`onMouseDown={handleBodyMouseDown}`), qui déclenche `selectOnly()` / `startDrag()`. Sans lui, ni BUTTON ni BUTTON_LATCHING ne pouvaient être sélectionnés ni déplacés en cliquant sur leur corps.

BUTTON possédait en plus son propre `handleButtonMouseDown` (`onMouseDown` avec `preventDefault()` + `stopPropagation()`) posé sur `ButtonPart.jsx`, qui aurait de toute façon neutralisé le correctif en interceptant le `mousedown` avant qu'il n'atteigne le wrapper.

## 3. Fichiers modifiés

1. **`frontend/src/canvas/CircuitComponent.jsx`** (priorité #1)
   - Retrait de `e.preventDefault()` dans `handleButtonPointerDown` (BUTTON) et `handleLatchingButtonPointerDown` (BUTTON_LATCHING). `e.stopPropagation()` conservé dans les deux (aucun ancêtre n'écoute `pointerdown`, sans effet fonctionnel, mais n'est pas la cause du bug).
   - Suppression complète de `handleButtonMouseDown` (devenu contre-productif) et de son branchement `onMouseDown` dans le spread de props `isButton` passé à `<PartRenderer>`.
   - `handleButtonPointerUp`, `handleButtonPointerCancel`, `handleButtonLostPointerCapture`, `handleLatchingButtonClick` : **inchangés**.
   - Chaque suppression documentée par un commentaire in situ référençant ce ticket et l'audit-002.

2. **`frontend/src/components/parts/ButtonPart.jsx`** (priorité #2)
   - Signature de fonction : retrait du paramètre `onMouseDown`.
   - Retrait de `onMouseDown={onMouseDown}` sur le `<div>` racine.
   - Docstring mise à jour (contrat de props, rationale).

3. **`frontend/src/components/parts/LatchingButtonPart.jsx`** (priorité #3) — **non modifié**. Confirmé par lecture : aucun `onMouseDown` n'y a jamais existé ; le correctif pour BUTTON_LATCHING vit entièrement dans `CircuitComponent.jsx`.

4. **`frontend/src/components/parts/__tests__/ButtonPart.raster.test.jsx`**
   - Test 6 : retrait de `onMouseDown`/`fireEvent.mouseDown` (n'est plus dans le contrat de props).
   - Ajout du test 6bis : vérifie qu'`onMouseDown` n'est plus intercepté localement et remonte bien à un ancêtre.

5. **`frontend/src/canvas/__tests__/ButtonDragInteraction.integration.test.jsx`** (nouveau fichier, 12 tests) — harnais de test d'intégration avec dispatch d'événements DOM réels (bubbling, `PointerEvent` + `MouseEvent` séparés, pas de synthèse React) reproduisant fidèlement le conflit d'origine et sa correction.

Aucun autre fichier du périmètre autorisé n'a nécessité de modification. Aucun fichier de la liste interdite (`useCircuitState.js`, `clientToCanvas`, `geometry.js`, `circuitSelectors.js`, `wirePath`, `Pin.jsx`, `canonicalRegistry.js`, `componentDefinitions.js`, `pinPresentationGeometry.js`, assets, CSS globale, MB-VIS-CANVAS-052) n'a été touché.

## 4. Pourquoi le correctif préserve le comportement momentary / latching

- `handleButtonPointerDown`/`handleButtonPointerUp`/`handleButtonPointerCancel`/`handleButtonLostPointerCapture` restent attachés à la racine de `ButtonPart` via `onPointerDown`/`onPointerUp`/`onPointerCancel`/`onLostPointerCapture` — **jamais affectés** par le retrait du seul `preventDefault()` sur `pointerdown` (qui ne bloquait que le `mousedown` de compatibilité, pas les autres événements pointer). Presser/relâcher fonctionne à l'identique.
- `handleLatchingButtonClick` (toggle ON/OFF) reste inchangé et attaché via `onClick`, indépendant du `mousedown`.
- Le `stopPropagation()` sur `pointerdown` est conservé dans les deux handlers : aucun comportement fonctionnel du bouton n'est réinterprété comme un clic Canvas générique.

## 5. Pourquoi le correctif préserve Pin / câblage

- `Pin.jsx` (non modifié) appelle `e.stopPropagation()` dans son propre `onMouseDown`, indépendamment de tout changement apporté à BUTTON. Le pin reste un sibling de `.part-button`/`.part-latching-button` (jamais un descendant) : un clic sur le pin ne traverse jamais le sous-arbre du corps du bouton.
- Câblage (`onPinClick`) inchangé, non affecté par ce ticket.

## 6. Tests automatisés (A–G)

Commande ciblée exécutée :
```
npx vitest --config src/simulator/vitest.config.ts --run src/canvas/__tests__/ButtonDragInteraction.integration.test.jsx src/components/parts/__tests__/ButtonPart.raster.test.jsx src/components/parts/__tests__/LatchingButtonPart.raster.test.jsx src/canvas/__tests__/CircuitComponent.interaction.test.jsx src/canvas/__tests__/circuitComponentRasterChrome.test.jsx
```
**Résultat : 5 fichiers, 55 tests, 55 PASS.**

- **A** — BUTTON ne perd plus le drag : PASS (sélection + drag réel end-to-end + second drag consécutif).
- **B** — BUTTON_LATCHING ne perd plus le drag : PASS.
- **C/D** — comportements momentary/latching non régressés : PASS.
- **E** — câblage BUTTON/BUTTON_LATCHING non régressé (extrémité de wire recalculée après drag post-câblage) : PASS.
- **F** — le Pin continue de bloquer le drag (dispatch direct sur le pin, sans interaction préalable) : PASS.
- **G** — non-régression d'un composant passif (RESISTOR) : PASS.

*(Note méthodologique disclosed : les deltas de `movePointer()` du fichier de test ont dû être alignés sur des multiples de `GRID_SIZE=20` (`frontend/src/utils/grid.js`) — la position finale d'un drag passe par `snapToGrid()`, comportement préexistant non lié à ce ticket. Correction purement arithmétique du test, aucun changement de code produit.)*

## 7. Suite de tests complète

Commande : `npm run test:ci` (= `vitest --config src/simulator/vitest.config.ts --run`, seule config utilisée pour tout le dépôt).

**Résultat : 159 fichiers de test, 1979 tests — 1960 PASS, 19 FAIL.**

Les 19 échecs correspondent **exactement** à la baseline préexistante connue (mémoire projet : *"`npm run build` + 16 tests fail on the VIS branch"* — écart de dénombrement clarifié ci-dessous), tous dans des périmètres BREADBOARD/RgbLed/circuitSelectors/componentDefinitions/pinPresentationGeometry, **aucun lié à BUTTON** :

| Fichier | Tests en échec |
|---|---|
| `AddComponentBreadboardPlacement.integration.test.jsx` | 1 |
| `BreadboardInsertionMutationChannel.integration.test.jsx` | 4 |
| `BreadboardMovementDeletion.integration.test.jsx` | 1 |
| `canvas/__tests__/Breadboard.test.jsx` | 1 |
| `config/__tests__/componentDefinitions.test.js` | 1 |
| `simulator/__tests__/breadboardSimulationIntegration.test.js` | 2 |
| `utils/__tests__/breadboardPlacementAdapter.test.js` | 1 |
| `utils/__tests__/breadboardWireConnectivity.test.js` | 2 |
| `utils/__tests__/circuitSelectors.test.js` | 2 |
| `utils/__tests__/pinPresentationGeometry.test.js` | 1 |
| `components/parts/__tests__/RgbLedPart.raster.test.jsx` | 3 |

**Total : 19.** Aucune régression, aucun nouvel échec par rapport à la baseline.

## 8. `tsc -b` / build / diff-check

- `npx tsc -b` : sortie vide, exit 0 — aucune erreur.
- `npm run build` : succès, exit 0 (`✓ built in 2.29s`, 170 modules transformés).
- `git diff --check` : exit 0, aucun conflit de fin de ligne/espace bloquant (seul un avertissement Git bénin LF→CRLF sur `ButtonPart.jsx`, non bloquant).

## 9. Tests navigateur réel (session live, `npm run dev` via Vite, Chromium)

### BUTTON
- Ajout ✅ · clic sur le corps → sélection (contour vert) ✅ · drag réel → `left`/`top` changent ✅ · second drag consécutif sur le même composant ✅ · aucun état "pressed" résiduel après un cycle clic complet (pas de blocage de capture) ✅.
- Câblage pin1 → RESISTOR.A : fil créé ✅. Drag après câblage : composant déplacé, le fil suit (extrémité recalculée) ✅.
- Zoom global (`+`/`−`) ✅. `Enter` sur composant sélectionné → focus (`data-focused`, `transform: scale(1.5)` par défaut) ✅. Molette scopée sur le composant focalisé → `localScale` 1.5→1.7 (2 crans × `LOCAL_SCALE_STEP=0.1`), événement `wheel` confirmé ciblé sur `.part-button__picture` du composant focalisé ✅. Drag pendant le focus/zoom local : fonctionne ✅. `Escape` → sortie de focus (`data-focused` retiré, transform retiré, sélection conservée) ✅. Drag après `Escape` : fonctionne ✅.

### BUTTON_LATCHING
- Ajout ✅ · sélection ✅ · drag → position change ✅ · clic → ON (`is-on`) ✅ · clic → OFF ✅ · drag après ON → position change (état bascule en effet de bord, voir §10.2) ✅ · drag après OFF → position change (idem) ✅.
- Câblage pin1 → RESISTOR.A : fil créé ✅. Drag après câblage : composant déplacé, fil conservé ✅.

### Non-régression générique
- RESISTOR : sélection, drag, câblage — tous ✅ (aucun changement de comportement).
- LED : sélection, drag — ✅.
- NPN_TRANSISTOR : sélection, drag — ✅.

## 10. Constats disclosed (hors périmètre de correction de ce ticket, non corrigés)

Deux comportements latents ont été mis en évidence lors des tests navigateur réels **au-delà du périmètre de tests explicitement mandaté** (tests supplémentaires que j'ai effectués par diligence). Aucun des deux n'est causé par les modifications de ce ticket ; les deux étaient **techniquement inatteignables avant ce correctif** puisque le drag du corps de BUTTON/BUTTON_LATCHING ne fonctionnait pas du tout auparavant.

### 10.1 — FAIT OBSERVÉ : le Pin de BUTTON (momentary) ne bloque plus le drag après un premier drag réussi sur le corps

Séquence de reproduction (navigateur réel uniquement, non reproductible sous jsdom) :
1. BUTTON fraîchement ajouté → drag depuis un pin → **bloqué correctement** (position inchangée).
2. Le **même** BUTTON, drag réussi sur le corps (sélection + déplacement) → drag depuis un pin → **le composant se déplace** (devrait être bloqué).

**DÉDUCTION** : instrumentation (`addEventListener` natif + `hasPointerCapture`) montre que lors de la 2ᵉ séquence, `pointerdown`/`mousedown` ciblent correctement le pin, mais `pointerup`/`mouseup` sont **retargetés** vers `.part-button` — signature d'une capture de pointeur (Pointer Capture) mal libérée ou ré-appliquée par les handlers `setPointerCapture`/`releasePointerCapture` de `handleButtonPointerDown`/`handleButtonPointerUp` (code **non modifié** par ce ticket). Testé et **confirmé absent** sur :
- RESISTOR (composant générique sans pointer capture) dans la même séquence exacte ;
- BUTTON_LATCHING (aucun appel `setPointerCapture` dans son code) dans la même séquence exacte.

Ceci isole la cause à la logique de capture de pointeur propre à BUTTON (momentary), logique explicitement listée comme "laissée inchangée" dans le mandat. Aucun des tests automatisés/navigateur explicitement requis par ce mandat ne couvre cette séquence précise (le test F automatisé teste le pin sur un composant sans interaction préalable, et passe). **Non corrigé ici** — nécessiterait de modifier `handleButtonPointerUp`/`handleButtonPointerCancel`/`handleButtonLostPointerCapture`, hors du périmètre strictement autorisé sans mandat explicite complémentaire.

### 10.2 — FAIT OBSERVÉ : chaque drag réussi sur BUTTON_LATCHING bascule aussi son état ON/OFF

**DÉDUCTION** : `mousedown` et `mouseup` d'un geste de drag ciblent le **même nœud DOM** (React ne remonte jamais un nouveau nœud, seul le style `left/top` change) ; le navigateur émet donc un `click` natif après **tout** `mouseup` sur ce nœud, quelle que soit la distance parcourue (sémantique standard du DOM — le `click` dépend de l'identité de la cible, pas de la distance). `handleLatchingButtonClick` (code **non modifié**) n'a pas de garde de distance et bascule l'état à chaque fois. Le déplacement lui-même fonctionne correctement dans les deux états (exigence du mandat "drag après ON / drag après OFF" satisfaite), mais l'état bascule en effet de bord à chaque drag. Pré-existant, invisible avant ce ticket puisque BUTTON_LATCHING n'était pas déplaçable du tout. **Non corrigé ici** — nécessiterait d'ajouter une garde de distance/mouvement au handler `onClick`, hors périmètre strictement autorisé.

Ces deux constats sont transmis pour analyse et arbitrage CSA ; aucune décision de correction n'a été prise unilatéralement.

## 11. Git — état final

```
git status --short
 M frontend/src/canvas/CircuitComponent.jsx
 M frontend/src/components/parts/ButtonPart.jsx
 M frontend/src/components/parts/__tests__/ButtonPart.raster.test.jsx
?? frontend/src/canvas/__tests__/ButtonDragInteraction.integration.test.jsx
```
(`.claude/` non suivi, préexistant à ce ticket, non touché, non inclus dans le commit.)

- Commit : `fix(button): restore drag interaction for interactive buttons` — SHA : *(voir section suivante, complété après commit)*
- Push : branche `feat/MB-VIS-LED-V16-leads-thicker-realistic`

## 12. STOP

Conformément au mandat : commit + push + ce rapport livrés. **Aucun CSA GO n'est déclaré.** Aucun ticket géométrique ne sera entamé. Le CSA analysera ce résultat, y compris les deux constats disclosed en section 10.
