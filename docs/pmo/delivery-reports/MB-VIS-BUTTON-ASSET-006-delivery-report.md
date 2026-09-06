# MB-VIS-BUTTON-ASSET-006 — Rapport de livraison

**Titre** : Simplification visuelle Tinkercad-style de BUTTON et BUTTON_LATCHING
**Statut** : Implémentation terminée, validée (tests automatisés + navigateur réel + QA visuelle), commit + push effectués.
**CSA GO** : Ce rapport ne déclare **aucun** CSA GO. Le CSA effectuera la validation finale.

---

## Baseline

- **HEAD avant intervention** : `c94c5d2dfed02f6a3c85de41e75d322029c62f81`
- **Branche** : `feat/MB-VIS-LED-V16-leads-thicker-realistic`
- **Dépôt** : `mamadouyacineba858-tech/myblab_v03`
- Audit initial (`git status --short` / `git branch --show-current` / `git rev-parse HEAD` / `git diff --check`) : branche et HEAD conformes au mandat. Le paquet d'assets officiel était déjà extrait dans `frontend/public/assets/components/button/` et `.../button-latching/` avant intervention (fichiers modifiés en working tree, non commités) — inspecté et validé avant toute autre action (voir §Assets). `.claude/` non suivi, préexistant, non lié à ce ticket, non touché.

## Assets

**Fichiers remplacés** (contenu binaire, mêmes noms de fichiers — convention inchangée) :
- `button/` : `button.released.{1x,3x}.{png,webp}`, `button.pressed.{1x,3x}.{png,webp}` (8 fichiers image)
- `button-latching/` : `button-latching.off.{1x,3x}.{png,webp}`, `button-latching.on.{1x,3x}.{png,webp}` (8 fichiers image)

**Dimensions** — vérifiées par pixel-probe réel (`createImageBitmap` + lecture des dimensions natives), pas seulement déclarées : les 16 fichiers PNG/WebP mesurent exactement 60×60 (1x) et 180×180 (3x), conformément au contrat.

**Formats** : PNG + WebP confirmés présents pour chaque état/échelle. Fond transparent confirmé par inspection visuelle (Read tool) et par bounding-box alpha (bbox opaque strictement à l'intérieur du canevas, aucun pixel opaque en bordure).

**ASSET-INTEGRITY.json** : les deux fichiers ont été vérifiés — **pour chaque entrée**, taille en octets ET SHA-256 recalculés indépendamment (PowerShell `Get-FileHash`) et comparés au contenu réel des fichiers sur disque. Résultat initial : les 18 entrées (9 par composant, images + manifest.json) correspondaient exactement aux fichiers livrés. Aucune entrée n'a été validée sur la seule foi de son nom.

**manifest.json — anomalie détectée et corrigée** (voir §Code, `renderQualityGate.test.jsx`) : le paquet livré remplaçait le schéma `variants[]` (énumération explicite fichier/état/échelle/format/largeur/hauteur, attendu par le test de garde-fou T10 existant) par un schéma compact `states`/`formats`/`scales`/`dimensions`/`visualContract` sans énumération par fichier. Cette différence de schéma est passée inaperçue tant que les hashes eux-mêmes étaient corrects (§16 du mandat : « ne jamais déclarer un asset validé uniquement parce que son nom est correct » — ici c'est la STRUCTURE, pas le nom, qui était en cause). Corrigé en **fusionnant** les deux schémas (le `variants[]` restauré + le `visualContract` conservé) plutôt qu'en choisissant l'un au détriment de l'autre — voir détail §Code. Les entrées ASSET-INTEGRITY.json pour `manifest.json` (bytes + sha256) ont été recalculées et mises à jour en conséquence, puis toutes les entrées re-vérifiées une seconde fois après cette correction (18/18 conformes).

**Anomalie de métadonnée disclosed, non corrigée par choix** : le `manifest.json` livré pour `button-latching/` déclarait `"physicalLeads": 2`, alors que l'inspection visuelle directe de l'asset (`button-latching.off/on.3x.png`) montre sans ambiguïté **4 pattes physiques** (même housing que BUTTON), conformément à l'intention du mandat (§2 : « même boîtier et pattes »). Recherche de code confirmant que ce champ n'est lu par aucun consommateur (`componentAssetValidation.js` ne le référence pas) : purement documentaire. **Corrigé** à `4` dans le cadre de la réécriture du fichier pour restaurer `variants[]` (pas une modification isolée et arbitraire — faite en même temps que la correction de schéma déjà nécessaire).

## Code

**`frontend/src/config/componentDefinitions.js`** — seul fichier de code applicatif modifié. Remesure complète des `dx`/`dy` de présentation de BUTTON et BUTTON_LATCHING (voir §Géométrie) ; ancien commentaire remplacé par un commentaire documentant la méthode et les valeurs. Aucune autre entrée du fichier touchée. `canonicalRegistry.js` (pins/rôles/cardinalité), `Pin.jsx`, `geometry.js`, `circuitSelectors.js`, `wirePath`, moteur de simulation : **non touchés**, conformément à l'interdiction.

**`frontend/src/components/parts/ButtonPart.jsx` / `LatchingButtonPart.jsx`** — inspectés en détail (mandat §5), **non modifiés** : les deux fichiers dérivent déjà dynamiquement les chemins d'assets depuis l'état (`released`/`pressed`, `off`/`on`) et les dimensions depuis `getComponentDef()`, sans jamais recopier de valeur en dur. La convention de nommage de fichiers du nouveau paquet (`button.<state>.<scale>.<format>`, `button-latching.<state>.<scale>.<format>`) est strictement identique à l'ancienne — aucun changement de code n'était nécessaire pour que le nouveau paquet soit correctement résolu.

**Tests directement liés à BUTTON/BUTTON_LATCHING modifiés** (uniquement pour refléter les nouvelles valeurs dx/dy mesurées — recherche exhaustive par grep de toute occurrence des anciennes valeurs 8/51/7/52 dans `frontend/src`, dix fichiers candidats examinés un par un, six effectivement modifiés) :
- `components/parts/__tests__/ButtonPart.raster.test.jsx` (test 9 + docstring)
- `components/parts/__tests__/LatchingButtonPart.raster.test.jsx` (test 9 + docstring)
- `canvas/__tests__/ButtonDragInteraction.integration.test.jsx` (assertion d'extrémité de fil + commentaire de coordonnée documentaire)
- `config/__tests__/componentInstanceState.test.js` (assertions dx/dy)
- `__tests__/A1ButtonModel.test.js` (assertion `button.pins`)
- `__tests__/latchingButton.test.jsx` (assertion `button.pins`)
- `__tests__/ContactFoundationPinWireCoherence.integration.test.jsx` (une seule assertion hardcodée ; le reste du fichier dérive dynamiquement via `getPinPresentationPosition`, donc reste correct sans modification)
- `utils/__tests__/geometryPinCanonical.test.js` (fixture de régression TEST 10)

Quatre autres fichiers candidats (`pinFootprintContract.test.js`, `MoveComponentMutationChannel.integration.test.jsx`, `BreadboardInsertionMutationChannel.integration.test.jsx`, et les occurrences dans `componentDefinitions.js` lui-même pour d'autres composants) ont été examinés et confirmés **sans rapport** avec BUTTON/BUTTON_LATCHING (faux positifs du grep large) — non touchés.

## Géométrie

**Méthode** : pixel-probe navigateur réel (Chromium, via le serveur de dev Vite), `canvas.getImageData()` sur `button.released.3x.png` et `button-latching.off.3x.png` (résolution 3x = mesure la plus précise disponible, croisée avec 1x pour cohérence d'échelle). Centre de masse pondéré par le canal alpha calculé séparément pour chaque patte (colonnes isolées aux lignes situées strictement au-dessus/en-dessous du boîtier, où seule la patte est opaque — pas le corps), ce qui élimine le bruit de quantification d'une simple bounding-box. Vérifié stable sur plusieurs profondeurs d'échantillonnage (3/6/9/18 px depuis le bord).

**BUTTON** : pattes gauche/droite mesurées à x≈40.69/139.27 (échelle 3x) → ≈13.56/46.42 en 1x. Somme ≈179.96 (3x) / ≈60 (1x) : symétrie quasi parfaite. dy (centre de masse vertical) ≈90.67 (3x) / ≈30.22 (1x) — quasiment identique à l'ancienne valeur (30).
→ **Retenu : pin1 = (14, 30), pin2 = (46, 30)** (arrondi à l'entier le plus proche en conservant la symétrie 14+46=60).

**BUTTON_LATCHING** : pattes gauche/droite mesurées à x≈37.95/140.67 (3x) → ≈12.65/46.89 en 1x. Somme ≈178.62 (3x) / ≈59.5 (1x) — légère asymétrie réelle (pas une erreur de mesure), cohérente avec l'observation déjà faite par MB-VIS-CONTACT-FOUNDATION-001 sur l'ancien asset (« le rocker diffère physiquement » de BUTTON). dy ≈90.65 (3x) / ≈30.22 (1x), identique à BUTTON.
→ **Retenu : pin1 = (13, 30), pin2 = (47, 30)**.

**Comparaison avec les anciennes valeurs** : BUTTON passait de (8,30)/(51,30) à (14,30)/(46,30) ; BUTTON_LATCHING de (7,30)/(52,30) à (13,30)/(47,30) — écarts de 5 à 6 unités canvas, confirmant que les anciennes valeurs (mesurées sur un asset visuellement différent) n'étaient effectivement plus valides pour le nouveau paquet, exactement comme le mandat l'anticipait. `dy` reste, dans les deux cas, à 30 (variation mesurée <1 unité — dans le bruit, aucune modification requise).

**Aucune incertitude bloquante** : la mesure a convergé de façon stable et cohérente entre 1x et 3x, aucune valeur n'a été inventée.

**Toujours exactement 2 pins logiques** par composant (`canonicalRegistry.js` inspecté, non modifié : `BUTTON`/`BUTTON_LATCHING` déclarent chacun `pin1`/`pin2`, rôle `switch`). Les 4 pattes visibles restent une représentation physique pure, jamais transformées en pins électriques.

## Interaction

**BUTTON** (momentané) : `ButtonPart.jsx` reçoit toujours `onPointerDown`/`onPointerUp`/`onPointerCancel`/`onLostPointerCapture` depuis `CircuitComponent.jsx` (code interaction **non touché** par ce ticket — voir MB-VIS-BUTTON-INTERACTION-003). Sélection/drag confirmés fonctionnels en navigateur réel avec le nouvel asset (voir §Browser QA). État initial `released`, `pressed` accessible via l'état applicatif (`component.state`), tests automatisés C (`fireEvent.pointerDown`/`pointerUp`) toujours au vert.

**BUTTON_LATCHING** (verrouillage) : `onClick` inchangé (`ToggleLatchingButtonCommand`). État initial `off` confirmé, toggle off→on→off confirmé en navigateur réel (classe `is-on` apparaît/disparaît, rendu visuel tête rouge distinct — voir §Browser QA).

**Anomalies pré-existantes disclosed par MB-VIS-BUTTON-INTERACTION-003, revérifiées avec le nouvel asset (comportement inchangé, ni aggravé ni corrigé — hors périmètre de ce ticket)** :
- **A. BUTTON** : un drag démarré directement sur un pin après un premier drag réussi sur le corps ne bloque plus systématiquement (Pointer Capture). Non retesté en profondeur ici (déjà documenté et hors scope ; ce ticket ne modifie aucun code d'interaction pouvant l'affecter).
- **B. BUTTON_LATCHING** : chaque drag réussi bascule aussi l'état ON/OFF en effet de bord (le `click` natif suit tout `mouseup` sur le même nœud DOM). **Reconfirmé en navigateur réel avec le nouvel asset** (§Browser QA : chaque drag effectué a fait basculer `is-on`) — comportement identique à avant, `handleLatchingButtonClick` n'ayant pas été touché. Le déplacement lui-même reste correct dans les deux états (exigence du mandat satisfaite), l'effet de bord persiste et reste hors périmètre.

Ces deux points restent non traités par ce ticket, conformément à la consigne « ne pas lancer spontanément une refonte de l'interaction » (mandat §10).

## Wiring

**BUTTON** : pin1 câblé vers RESISTOR.A, pin2 câblé vers LED.cathode (session navigateur réelle) — 2 fils créés, alignement visuel confirmé exact sur les pattes métalliques (aucun flottement, aucun chevauchement du boîtier). Drag après câblage : composant déplacé, les deux fils suivent, alignement conservé, aucun clipping.

**BUTTON_LATCHING** : pin2 câblé vers RESISTOR.A — 1 fil créé, alignement confirmé exact sur la patte. Drag après câblage : composant déplacé (avec bascule ON/OFF en effet de bord, cf. anomalie disclosed ci-dessus), fil conservé, alignement correct, aucun clipping.

## Browser QA

Session Chromium réelle (serveur de dev Vite, `http://localhost:5173`), viewport 1280×800.

**BUTTON** : ajout ✅ · sélection (contour vert) ✅ · drag réel (position changée) ✅ · câblage pin1→RESISTOR.A et pin2→LED.cathode ✅ (alignement exact confirmé visuellement) · drag après câblage (les deux fils suivent) ✅. *Presser/maintenir/relâcher* : non revérifiable de façon fiable avec l'outillage de ce Browser pane (aucune action « mousedown sans mouseup immédiat » exposée par le tool `computer` — un `left_click` complet un cycle down/up en un seul appel atomique, impossible d'observer un état intermédiaire "pressed" par capture d'écran) ; cette transition d'état est déjà verrouillée par les tests automatisés à dispatch réel (`fireEvent.pointerDown`/`pointerUp`, MB-VIS-BUTTON-INTERACTION-003, test C, toujours au vert) — le code de transition d'état n'a de toute façon pas été modifié par ce ticket. Différence visuelle released/pressed confirmée par inspection directe des deux fichiers PNG (cap légèrement plus plat/sombre en `pressed`).

**BUTTON_LATCHING** : ajout ✅ · OFF (tête rouge « O » visible, rendu clair) ✅ · clic → ON (classe `is-on`, tête rouge « I » visible, rendu plus sombre) ✅ · clic → OFF ✅ · drag en OFF (position changée) ✅ · drag en ON (position changée) ✅ · câblage pin2→RESISTOR.A ✅ · drag après câblage (fil conservé, alignement correct) ✅.

**Non-régression générique** : non retestée dans cette session navigateur (déjà couverte par la suite automatisée complète, RESISTOR/LED/NPN_TRANSISTOR non touchés par ce ticket — aucun asset ni code de ces types modifié).

**Zoom / focus (MB-VIS-CANVAS-052)** : zoom global (`+`/`Ajuster au contenu`) ✅ · `Enter` sur composant sélectionné → focus (`data-focused`, `transform: scale(1.5)`) ✅ · drag pendant le focus/échelle locale (position changée sous transform) ✅ · `Escape` → sortie de focus (`data-focused` retiré, transform retiré, sélection conservée) ✅. Rendu du nouvel asset sous échelle locale : aucun clipping, aucune distorsion visible.

## Tests

**Suite ciblée** (fichiers directement liés à BUTTON/BUTTON_LATCHING, avant remesure géométrique) : `npx vitest --config src/simulator/vitest.config.ts --run` sur 10 fichiers → **88/88 PASS** après mise à jour des assertions dx/dy.

**Suite complète — 1ʳᵉ exécution** (avant correction du schéma `manifest.json`) : `npm run test:ci` → **21 failed | 1958 passed (1979)**, soit **2 échecs de plus que la baseline connue (19)**. Diagnostic : `renderQualityGate.test.jsx` TEST T10 (2 échecs, un par composant) — `imageEntries.length` attendu 8, obtenu 0 : le schéma `manifest.json` livré (sans `variants[]`) était incompatible avec ce test de garde-fou existant. **Corrigé** (voir §Assets/§Code : restauration du `variants[]`, fusion avec `visualContract`).

**Suite complète — 2ᵉ exécution** (après correction) : **19 failed | 1960 passed (1979)** — retour exact à la baseline. Les 19 échecs restants sont tous dans des périmètres BREADBOARD/RgbLed/circuitSelectors/componentDefinitions/pinPresentationGeometry/breadboardWireConnectivity/breadboardPlacementAdapter, **identiques** à la baseline documentée avant ce ticket, aucun lié à BUTTON.

**`tsc -b`** : exit 0, aucune erreur (exécuté deux fois, avant et après la correction du manifest).
**`npm run build`** : succès, exit 0 (`✓ built in ~2s`, 170 modules transformés), exécuté deux fois.
**`git diff --check`** : exit 0 à chaque exécution, aucun conflit de fin de ligne/espace bloquant (avertissements LF→CRLF bénins uniquement).

## Régressions

- **RESISTOR** : non modifié (aucun asset ni code touché) ; suite automatisée complète confirme 0 régression sur ce type.
- **LED** : non modifié ; suite automatisée complète confirme 0 régression sur ce type. Utilisé comme cible de câblage réelle en session navigateur (pin cathode connectée à BUTTON.pin2) sans incident.
- **NPN_TRANSISTOR** : non modifié ; suite automatisée complète confirme 0 régression sur ce type.

## Anomalies hors scope

1. **Schéma `manifest.json` incompatible avec `renderQualityGate.test.jsx`** — détecté et **corrigé** dans le cadre de ce ticket (nécessaire pour respecter « aucun nouvel échec »), documenté ci-dessus en détail (§Assets/§Tests). Ce n'est pas une anomalie laissée ouverte, mais je la mentionne ici pour traçabilité complète du écart entre le paquet livré et l'infrastructure de test existante.
2. **`physicalLeads: 2` erroné dans le `manifest.json` de `button-latching/`** (l'asset réel montre 4 pattes) — **corrigé** en même temps que la restauration du schéma (pas une intervention isolée), documenté §Assets.
3. **[Disclosed, non corrigé] Pointer Capture / BUTTON — pin ne bloque plus le drag après un premier drag réussi sur le corps** (MB-VIS-BUTTON-INTERACTION-003, §10). Non retesté en profondeur dans ce ticket (aucun code d'interaction modifié, risque de régression nul par construction) — reste ouvert, nécessite mandat CSA dédié.
4. **[Disclosed, non corrigé, reconfirmé] BUTTON_LATCHING — chaque drag bascule aussi l'état ON/OFF** (MB-VIS-BUTTON-INTERACTION-003, §10). Reconfirmé identique avec le nouvel asset en session navigateur réelle de ce ticket. Reste ouvert, nécessite mandat CSA dédié.

Aucune décision de correction n'a été prise unilatéralement sur les points 3 et 4 : ils sont transmis pour arbitrage CSA.

## Git

- `git status --short` avant commit : 29 fichiers modifiés (20 assets, 1 code applicatif, 8 tests), tous dans le périmètre autorisé ; `.claude/` non suivi non inclus.
- Commit : `feat(button): simplify button visuals to tinkercad style` — SHA : `91d24ce107bac13c8818853353f289294b41a468`
- Branche : `feat/MB-VIS-LED-V16-leads-thicker-realistic`
- Push confirmé : `origin/feat/MB-VIS-LED-V16-leads-thicker-realistic` identique (`91d24ce107bac13c8818853353f289294b41a468`)
- État final : `git status --short` propre (seul `.claude/` non suivi, préexistant, non lié à ce ticket, non touché)

## STOP

Conformément au mandat : commit + push + ce rapport livrés. **Aucun CSA GO n'est déclaré, aucune progression vers MB-VIS-COMP-036 (POWER) ou tout autre ticket de la roadmap.** Le CSA effectuera la validation finale, y compris l'arbitrage des anomalies disclosed en section « Anomalies hors scope ».
