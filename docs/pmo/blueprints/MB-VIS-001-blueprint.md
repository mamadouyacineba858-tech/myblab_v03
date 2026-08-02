# Execution Blueprint — MB-VIS-001

Conforme à SPEC-PMO-003 v1.0.

---

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
|---|---|
| `Blueprint-ID` | MB-VIS-001-blueprint |
| `Ticket-ID` | MB-VIS-001 |
| `Commit analysé` | `6054d7f3a9d330e81035692150a1e1734d993336` |
| `Date de production` | 2026-08-02 |
| `Auteur` | Claude — Repository Analyst |
| `Statut` | **PRÊT_POUR_CONCEPTION** — arbitrages Q1/Q2/Q3 rendus par l'Architecte le 2026-08-02 |

---

## B. SYNTHÈSE POUR L'AGENT CONCEPTEUR

**Résumé de la zone concernée.** Le simulateur MYBlab dispose déjà d'un moteur
de propagation de niveaux logiques (`engine.js`) et d'une couche de rendu
React/SVG (`canvas/`, `components/parts/`). Une **première visualisation
existe déjà** pour deux types de composants (LED, LED RGB) : leur rendu
change visuellement selon l'état calculé par le moteur. Il n'existe en
revanche **aucune visualisation** pour les autres composants (résistance,
bouton, condensateur, etc.), qui ont un rendu statique indépendant de la
simulation.

**Périmètre arbitré (décision Architecte, 2026-08-02).** MB-VIS-001 n'est
**pas** une simple extension d'effets visuels composant par composant. Le
livrable attendu est une **infrastructure de visualisation généralisée et
extensible**, dont la visualisation LED existante constitue la première
implémentation de référence à généraliser — pas un cas particulier à
répliquer manuellement pour chaque composant. Les **fils sont explicitement
exclus** de ce ticket (cf. section F et historique des décisions) ; ils
feront l'objet d'un ticket dédié ultérieur (ex. `MB-VIS-002`).

**Point d'entrée recommandé.** `frontend/src/components/parts/PartRenderer.jsx`
— c'est le point de bascule actuel entre état de simulation et rendu visuel,
aujourd'hui un `switch` qui appelle nommément `getLedState`/`getRgbLedState`
par type. C'est ce mécanisme ponctuel qui doit être généralisé.

**Pattern existant à généraliser.** Le pattern `getXxxState(uid, pinSignals) → props visuelles` (voir `getLedState`, `getRgbLedState` dans `engine.js`) est le pattern établi de MYBlab pour dériver un état visuel depuis les signaux de simulation. L'objectif de ce ticket est de transformer ce pattern ponctuel (une fonction dédiée par type, appelée à la main dans un `switch`) en une architecture où l'ajout d'une visualisation pour un nouveau composant ne nécessite plus de modifier `PartRenderer.jsx` à chaque fois.

---

## C. CONTEXTE TECHNIQUE — `[FAIT]`

### Stack & versions
React 19.2.6, pas de librairie de rendu graphique tierce (pas de Canvas 2D natif utilisé, pas de Three.js, pas de D3) — le rendu actuel est **SVG + HTML/CSS** via composants React classiques. TypeScript 7 configuré mais la quasi-totalité du code applicatif est en `.jsx`/`.js` ; seul `simulator/core/ComponentRegistry.ts` (module distinct, non branché à l'app) est en TypeScript.

### Nature réelle du moteur de simulation
Le moteur (`frontend/src/simulator/engine.js`) est un **simulateur de niveaux logiques discrets** (`HIGH` / `LOW` / `UNKNOWN` / `FLOATING`), pas un simulateur électrique analogique. Il n'y a **aucun calcul de tension, courant ou puissance** — uniquement une propagation booléenne sur des "nets" (groupes de pins reliées par des fils, calculés via Union-Find).

```js
// engine.js — extrait représentatif de la fonction centrale
export function runSimulation(components, wires) {
  // Union-Find regroupe les pins connectées par des fils en "nets"
  // Sources : POWER met 5V=HIGH, GND=LOW
  // Propagation : si une pin d'un net est HIGH/LOW, tout le net hérite
  // Boutons : court-circuit interne pin1↔pin2 selon état "pressed"/"on"
  ...
  return pinSignals // Map<"uid:pinId", Signal>
}
```

**Conséquence directe pour la conception** : toute visualisation "temps réel" ne peut afficher que des **états discrets** (haut/bas/inconnu/flottant), pas des valeurs analogiques (pas de voltmètre, pas d'ampèremètre réalistes possibles avec ce moteur — cohérent avec le périmètre exclu du Ticket qui écarte les instruments virtuels).

### Déclenchement du calcul — pas de boucle temps réel
`runSimulation` est un **calcul synchrone pur**, ré-exécuté via `useMemo` à chaque changement de `components`/`wires`/`simulationActive` (`frontend/src/hooks/useCircuitState.js`, lignes ~81-97). Il n'existe **aucune boucle d'animation** (`requestAnimationFrame`, `setInterval`) dans le moteur. Le "temps réel" actuel du système est en réalité **réactif aux changements d'état** (React re-render), pas une simulation continue dans le temps.

### Infrastructure de simulation existante — déjà en place
- `simulationActive` (état booléen, `useState(false)` par défaut) contrôle si `runSimulation` s'exécute (`useCircuitState.js`)
- `startSimulation()` / `stopSimulation()` déjà exposés et déjà câblés dans `Navbar.jsx` (deux boutons, avec gestion `disabled`)
- `StatusBar.jsx` affiche déjà un indicateur textuel (`"▶ Simulation active"` / `"⏹ Simulation arrêtée"`)

→ **Le socle "activer/désactiver la simulation" du critère d'acceptation #4 du Ticket existe déjà**, avant même le début de ce ticket.

### Visualisation déjà existante — LED et LED RGB
```jsx
// PartRenderer.jsx — extrait
case "LED": {
  const { on } = getLedState(uid ?? "", signals)
  return <LedPart isOn={on} />
}
...
case "RGB_LED": {
  const { r, g, b } = getRgbLedState(uid ?? "", signals)
  return <RgbLedPart r={r} g={g} b={b} />
}
```
`LedPart.jsx` change de classe CSS (`part-led--on`) selon l'état calculé. C'est une vraie visualisation temps réel fonctionnelle, déjà en production dans le dépôt.

### Composants sans visualisation dynamique
Tous les autres types (`RESISTOR`, `ARDUINO`, `BUTTON` hors son propre état d'interaction, `POWER`, `CAPACITOR`, `BUZZER`, `POTENTIOMETER`, `LDR`, `THERMISTOR`, `DIODE`, `NPN_TRANSISTOR`, `SERVO`, `DC_MOTOR`) sont rendus par des composants qui **n'utilisent pas `pinSignals`** — leur apparence est statique, indépendante de la simulation.

### Fils — hors périmètre (décision Architecte)
`WiresLayer.jsx` dessine les fils en SVG avec une couleur fixe (`p.color ?? "#f97316"`) ou verte si sélectionné — **aucun lien avec `pinSignals`**. Le composant `WiresLayer` ne reçoit même pas `pinSignals` en prop actuellement. **Ce fichier est explicitement hors périmètre de MB-VIS-001** : il ne doit pas être modifié dans le cadre de ce ticket. La visualisation des conducteurs sera traitée par un ticket ultérieur dédié.

### Interfaces / types publics touchés
- `PartRenderer(props)` — reçoit déjà `pinSignals`, `uid`, `type` : signature stable côté appelant ; sa logique interne (le `switch` par type) est précisément ce que ce ticket doit généraliser
- `getLedState(uid, pinSignals)`, `getRgbLedState(uid, pinSignals)` — implémentations de référence du pattern à généraliser à une infrastructure applicable à tout composant

---

## D. DÉPENDANCES & IMPACT — `[FAIT]`

### Fichiers directement concernés par une extension de la visualisation
| Fichier | Rôle actuel | Impact probable |
|---|---|---|
| `frontend/src/components/parts/PartRenderer.jsx` | Sélectionne le rendu par type via `switch` codé en dur | Cœur de la généralisation attendue par le ticket |
| `frontend/src/simulator/engine.js` | Contient `getLedState`/`getRgbLedState` | Base de référence pour l'infrastructure généralisée |
| `frontend/src/components/parts/*.jsx` (12 fichiers de rendu actuellement statique) | Rendu visuel par composant | Doivent pouvoir être connectés à `pinSignals` via la nouvelle infrastructure, sans modification ponctuelle de `PartRenderer.jsx` à chaque ajout |
| `frontend/src/wires/WiresLayer.jsx` | Rendu SVG des fils, statique | **Hors périmètre — ne pas modifier dans ce ticket** |

### Tests existants sur la zone
- `frontend/src/__tests__/rgbLed.test.js` — teste `getRgbLedState` directement (logique pure), pas de test de rendu React pour `RgbLedPart`/`LedPart`
- **Aucun test trouvé** pour `PartRenderer.jsx`, `LedPart.jsx`, `WiresLayer.jsx`, `SimulationCanvas.jsx`
- `@testing-library/react` est présente dans les devDependencies (`frontend/package.json`) — utilisable pour tester le rendu, mais pas encore exploitée sur cette zone

---

## E. SIGNAUX D'ATTENTION — `[ANALYSE]`

Section incluse : plusieurs modules interagissent (moteur + 12 composants de rendu), et le périmètre implique une refonte d'architecture (généralisation), pas une simple extension incrémentale.

- **Complexité de conception** : le pattern actuel (`getXxxState` codé en dur dans `engine.js`, appelé nommément dans un `switch` de `PartRenderer.jsx`) fonctionne pour 2 composants mais n'est pas conçu pour en accueillir 14. La généralisation demandée par l'Architecte (arbitrage Q1) implique de concevoir un mécanisme d'association type-composant → état visuel qui ne nécessite plus de modifier `PartRenderer.jsx` à chaque nouveau composant visualisé — c'est le vrai risque de conception de ce ticket.
- **Dette technique tracée, non bloquante (arbitrage Q3)** : deux configurations Vitest coexistent (`frontend/vitest.config.js` en racine pour `jsdom`/`.jsx`, `frontend/src/simulator/vitest.config.ts` pour `node`/`.ts`). Le script `npm test` du `package.json` ne pointe que vers la seconde — les tests `.jsx` du dossier `__tests__` (dont `rgbLed.test.js`) ne semblent pas exécutés par `npm run test:ci`. **Décision de l'Architecte : ce point ne bloque pas MB-VIS-001**, il est tracé ici pour un futur ticket `MAINTENANCE`/`QUALITY` dédié à l'unification de l'infrastructure de tests. Conséquence pratique pour DeepSeek/Claude Phase 2 : la non-régression sur `getLedState`/`getRgbLedState` devra être vérifiée manuellement (exécution explicite des tests `.jsx` concernés) plutôt que via `npm run test:ci` seul.
- **Dette technique locale** : `runSimulation` contient des `console.log`/`console.table` de diagnostic (`useCircuitState.js`, lignes ~87-89) actifs en permanence quand `simulationActive` est vrai — pas bloquant pour ce ticket, mais à ne pas reproduire dans le nouveau code.

---

## F. CONTRAINTES DE CONCEPTION

| Champ | Valeur |
|---|---|
| `Niveau de liberté` | CONCEPTION (repris du Ticket) |
| `Mode d'exécution recommandé` | **Blueprint** (proposition, non re-tranchée par l'Architecte lors de l'arbitrage — la décision de généraliser le pattern renforce cependant l'intérêt d'un mode Blueprint : c'est une décision de conception à documenter, pas un simple copier-coller de pattern) |
| `Périmètre inclus (arbitré)` | Infrastructure de visualisation généralisée, applicable à tout composant, en partant de `getLedState`/`getRgbLedState` comme référence à généraliser. |
| `Périmètre exclu (arbitré)` | Fils / conducteurs (`WiresLayer.jsx`) — ticket dédié ultérieur. Unification des configurations de tests Vitest — ticket `MAINTENANCE`/`QUALITY` dédié. |
| `Contraintes issues du contexte technique` | La solution doit rester compatible avec le modèle de signaux discrets `HIGH/LOW/UNKNOWN/FLOATING` (pas de valeurs analogiques). Le comportement visuel de LED et LED RGB déjà en production ne doit pas régresser. |

---

## G. GESTION PMO

| Champ | Valeur |
|---|---|
| `Statut Blueprint` | PRÊT_POUR_CONCEPTION |
| `Historique de régénération` | — (première version, pas de nouvelle analyse du dépôt nécessaire — arbitrages purement de gouvernance/périmètre) |

---

## H. QUESTIONS OUVERTES — `[QUESTION OUVERTE]` — RÉSOLUES

Toutes les questions ci-dessous ont été arbitrées par l'Architecte le 2026-08-02. Conservées ici pour traçabilité, conformément au principe de vérifiabilité de SPEC-PMO-003. Le Blueprint n'est plus bloqué.

### Q1 — Le problème du Ticket est partiellement déjà résolu dans le dépôt — ✅ RÉSOLU
Constat : LED et LED RGB ont déjà un retour visuel dynamique fonctionnel (`getLedState`, `getRgbLedState`, branchés dans `PartRenderer.jsx`).

**Décision de l'Architecte** : le périmètre officiel de MB-VIS-001 est **(b) la généralisation du mécanisme de visualisation**, pas une simple extension composant par composant. La LED existante constitue la première implémentation de référence à généraliser. Le livrable recherché est une infrastructure de visualisation, pas une collection d'effets graphiques.

### Q2 — Les fils doivent-ils faire partie du périmètre ? — ✅ RÉSOLU
**Décision de l'Architecte** : **Non**, explicitement exclus de MB-VIS-001. Justification : le moteur actuel fonctionne sur des états logiques discrets, pas un modèle analogique ; visualiser le passage du courant dans les fils implique des choix de représentation (animation, intensité, propagation) qui relèvent d'un futur ticket dédié (ex. `MB-VIS-002`).

### Q3 — Fiabilité de la non-régression via la CI existante — ✅ RÉSOLU
**Décision de l'Architecte** : à traiter dans un ticket séparé (`MAINTENANCE`/`QUALITY`) — sujet d'outillage et de gouvernance technique, pas de visualisation. Ne bloque pas MB-VIS-001. La dette est tracée en section E (Signaux d'attention) pour rester visible.

---

## Historique

| Date | Auteur | Action |
|---|---|---|
| 2026-08-02 | Claude (Repository Analyst) | Production initiale, statut DRAFT, bloqué par section H |
| 2026-08-02 | ChatGPT (Chief Software Architect) | Arbitrage Q1 (périmètre = généralisation), Q2 (fils exclus), Q3 (tests → ticket séparé) |
| 2026-08-02 | Claude (Repository Analyst) | Intégration des arbitrages, statut → PRÊT_POUR_CONCEPTION |
| 2026-08-02 | ChatGPT (Chief Software Architect) | Validation finale — APPROUVÉ. Transmission autorisée à DeepSeek pour Phase Conception |
