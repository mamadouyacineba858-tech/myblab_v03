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
| `Statut` | **DRAFT — bloqué par la section H (Questions ouvertes)** |

---

## B. SYNTHÈSE POUR L'AGENT CONCEPTEUR

**Résumé de la zone concernée.** Le simulateur MYBlab dispose déjà d'un moteur
de propagation de niveaux logiques (`engine.js`) et d'une couche de rendu
React/SVG (`canvas/`, `components/parts/`). Une **première visualisation
existe déjà** pour deux types de composants (LED, LED RGB) : leur rendu
change visuellement selon l'état calculé par le moteur. Il n'existe en
revanche **aucune visualisation** pour les fils (courant/signal) ni pour les
autres composants (résistance, bouton, condensateur, etc.), qui ont un rendu
statique indépendant de la simulation.

**Point d'entrée recommandé.** `frontend/src/components/parts/PartRenderer.jsx`
— c'est le point de bascule actuel entre état de simulation et rendu visuel.
Toute nouvelle visualisation de composant doit s'y intégrer, pas créer un
mécanisme parallèle.

**Pattern existant à réutiliser.** Le pattern `getXxxState(uid, pinSignals) → props visuelles` (voir `getLedState`, `getRgbLedState` dans `engine.js`) est le pattern établi de MYBlab pour dériver un état visuel depuis les signaux de simulation. Toute nouvelle visualisation de composant devrait suivre ce même pattern plutôt qu'en inventer un autre.

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

### Fils — aucune visualisation d'état
`WiresLayer.jsx` dessine les fils en SVG avec une couleur fixe (`p.color ?? "#f97316"`) ou verte si sélectionné — **aucun lien avec `pinSignals`**. Le composant `WiresLayer` ne reçoit même pas `pinSignals` en prop actuellement.

### Interfaces / types publics touchés
- `PartRenderer(props)` — reçoit déjà `pinSignals`, `uid`, `type` : signature stable, ne nécessite pas de modification de contrat pour étendre la logique interne
- `WiresLayer(props: { wirePaths })` — **ne reçoit pas `pinSignals`** ; l'ajouter est un changement d'interface à faire consciemment
- `getLedState(uid, pinSignals)`, `getRgbLedState(uid, pinSignals)` — pattern à répliquer pour d'autres composants

---

## D. DÉPENDANCES & IMPACT — `[FAIT]`

### Fichiers directement concernés par une extension de la visualisation
| Fichier | Rôle actuel | Impact probable |
|---|---|---|
| `frontend/src/components/parts/PartRenderer.jsx` | Sélectionne le rendu par type | Point d'ajout des nouveaux `getXxxState` |
| `frontend/src/simulator/engine.js` | Contient `getLedState`/`getRgbLedState` | Ajout de fonctions `getXxxState` supplémentaires |
| `frontend/src/wires/WiresLayer.jsx` | Rendu SVG des fils, statique | Doit recevoir `pinSignals` si les fils doivent réagir à l'état |
| `frontend/src/canvas/SimulationCanvas.jsx` | Assemble `WiresLayer` + composants | Doit transmettre `pinSignals` à `WiresLayer` si modifié |
| `frontend/src/components/parts/*.jsx` (12 fichiers de rendu statique) | Rendu visuel par composant | Candidats à une extension similaire à `LedPart`, selon le périmètre retenu |

### Tests existants sur la zone
- `frontend/src/__tests__/rgbLed.test.js` — teste `getRgbLedState` directement (logique pure), pas de test de rendu React pour `RgbLedPart`/`LedPart`
- **Aucun test trouvé** pour `PartRenderer.jsx`, `LedPart.jsx`, `WiresLayer.jsx`, `SimulationCanvas.jsx`
- `@testing-library/react` est présente dans les devDependencies (`frontend/package.json`) — utilisable pour tester le rendu, mais pas encore exploitée sur cette zone

### Configuration de tests dupliquée — `[FAIT]`
Deux configurations Vitest coexistent :
- `frontend/vitest.config.js` (racine, environnement `jsdom`, pour les tests `.jsx`/`.js`)
- `frontend/src/simulator/vitest.config.ts` (environnement `node`, seuils de couverture 80%, restreint à `src/simulator/**/*.ts`)

Le script `npm test` du `package.json` pointe uniquement vers la config `src/simulator/vitest.config.ts` (`"test": "vitest --config src/simulator/vitest.config.ts"`) — **les tests `.jsx` du dossier `__tests__` à la racine de `src/` ne semblent pas exécutés par `npm test`/`npm run test:ci`**.

---

## E. SIGNAUX D'ATTENTION — `[ANALYSE]`

Section incluse : plusieurs modules interagissent (moteur + 12 composants de rendu + fils), plusieurs stratégies de conception sont possibles, et une question d'architecture reste ouverte (voir section H).

- **Risque de couplage** : le Ticket exige que "l'architecture permette l'ajout futur de nouvelles formes de visualisation" (critère d'acceptation #5). Le pattern actuel (`getXxxState` codé en dur dans `engine.js`, appelé nommément dans `PartRenderer.jsx` via un `switch`) fonctionne mais n'est pas généralisé — ajouter un état visuel par composant nécessite de modifier `engine.js` ET le `switch` de `PartRenderer.jsx` à chaque fois. Une conception qui généraliserait ce pattern (ex : un état visuel dérivé de façon uniforme pour tout composant) répondrait mieux au critère #5, mais representerait plus qu'une simple extension incrémentale.
- **Risque de régression sur `npm test`** : si les tests `.jsx` (`rgbLed.test.js` notamment) ne sont effectivement pas exécutés par le pipeline CI actuel (`test:ci`), une régression sur `getRgbLedState` ou le rendu ne serait pas détectée automatiquement. À vérifier avant de considérer que "l'absence de régression" (condition de refus du Ticket) est garantie par la CI existante.
- **Dette technique locale** : `runSimulation` contient des `console.log`/`console.table` de diagnostic (`useCircuitState.js`, lignes ~87-89) actifs en permanence quand `simulationActive` est vrai — pas bloquant pour ce ticket, mais à ne pas reproduire dans le nouveau code.

---

## F. CONTRAINTES DE CONCEPTION

| Champ | Valeur |
|---|---|
| `Niveau de liberté` | CONCEPTION (repris du Ticket) |
| `Mode d'exécution recommandé` | **Blueprint** (proposition) — le sujet est une extension de patterns existants, pas un algorithme nouveau nécessitant une implémentation complète par DeepSeek. Décision finale à l'Architecte. |
| `Contraintes issues du contexte technique` | La solution doit rester compatible avec le modèle de signaux discrets `HIGH/LOW/UNKNOWN/FLOATING` (pas de valeurs analogiques). Elle doit réutiliser le pattern `getXxxState(uid, pinSignals)` déjà établi plutôt qu'introduire un mécanisme parallèle, sauf justification explicite en cas de généralisation du pattern (cf. section E). |

---

## G. GESTION PMO

| Champ | Valeur |
|---|---|
| `Statut Blueprint` | DRAFT |
| `Historique de régénération` | — (première version) |

---

## H. QUESTIONS OUVERTES — `[QUESTION OUVERTE]`

Ce Blueprint est **bloqué** tant que ces points n'ont pas été arbitrés par l'Architecte. L'agent concepteur ne doit faire aucune hypothèse à leur sujet.

### Q1 — Le problème du Ticket est partiellement déjà résolu dans le dépôt
Le Ticket B ("Problème à résoudre") énonce : *"l'utilisateur ne dispose pas d'une représentation visuelle claire des phénomènes électriques en cours d'exécution"*. C'est **partiellement inexact au regard du dépôt actuel** : LED et LED RGB ont déjà un retour visuel dynamique fonctionnel et fonctionnel (`getLedState`, `getRgbLedState`, branchés dans `PartRenderer.jsx`).

**Arbitrage demandé** : le périmètre réel de MB-VIS-001 est-il —
(a) étendre la visualisation existante aux composants qui n'en ont pas encore (résistance, boutons, fils, etc.), ou
(b) généraliser/refondre le mécanisme de visualisation pour qu'il soit extensible par design (répond mieux au critère d'acceptation #5, mais périmètre plus large que ce que "Périmètre exclu" du Ticket semble suggérer), ou
(c) autre chose ?

### Q2 — Les fils doivent-ils faire partie du périmètre ?
Le Ticket cite en cas d'usage : *"Visualiser le passage du courant"*. Actuellement, `WiresLayer.jsx` n'a **aucun accès** à `pinSignals`. L'inclure change une interface de composant (`WiresLayer` devrait recevoir `pinSignals` en prop, et `SimulationCanvas.jsx` devrait le lui transmettre).

**Arbitrage demandé** : les fils sont-ils dans le périmètre inclus de ce ticket, ou seuls les composants le sont ?

### Q3 — Fiabilité de la non-régression via la CI existante
Si `rgbLed.test.js` (et les autres tests `.jsx` sous `frontend/src/__tests__/`) ne sont pas exécutés par `npm run test:ci` (voir section D), le critère de "conditions de refus : régressions fonctionnelles" du Ticket ne peut pas être garanti automatiquement par la CI actuelle.

**Arbitrage demandé** : faut-il inclure, dans le périmètre de ce ticket ou en préalable, la réunification des deux configurations Vitest — ou ce point relève-t-il d'un ticket `MAINTENANCE` séparé ?

---

## Historique

| Date | Auteur | Action |
|---|---|---|
| 2026-08-02 | Claude (Repository Analyst) | Production initiale, statut DRAFT, bloqué par section H |
