# MB-HOOK-001 — CommandBus Integration Layer

**Projet :** MYBlab v0.3.0
**Ticket :** MB-HOOK-001 (V3)
**Statut :** **BLOQUÉ — Incompatibilité structurelle constatée**
**Référence :** MB-CMD-001, MB-VAL-001, MB-HANDLER-001, MB-HISTORY-001-A

---

## 1. Objectif du ticket

Brancher `useCircuitState.js` (hook React legacy) sur le CommandBus du Core
(`frontend/src/core/`), sans modifier les composants UI et sans inventer de
nouvelle méthode sur le Document API existant.

---

## 2. Vérifications préalables effectuées

Conformément à la section 2 de la spec MB-HOOK-001 V3, les contrats suivants
ont été vérifiés directement dans le dépôt avant toute implémentation.

### 2.1 Contrats Core — conformes

| Contrat | Résultat |
|---|---|
| `CommandBus.dispatch(command, document)` | ✅ confirmé (`core/command/CommandBus.js:43`) |
| `Command(type, payload, metadata)` | ✅ confirmé (`core/command/Command.js:14`) |
| `BaseCommandHandler._applyMutation / _applyRedo / _applyInverse` | ✅ confirmé (`core/handlers/BaseCommandHandler.js`) |

**Point mineur détecté :** `CommandBus.dispatch()` enveloppe le retour de
`handler.execute()` dans un champ `.result`, et `handler.execute()` (via
`HistoryService.execute()`, MB-HISTORY-001-A) enveloppe déjà le résultat de
mutation dans son propre `.result`. Le document final se trouve donc à
`dispatchResult.result.result.document` (triple imbrication), et non
`result.result.document` comme l'utilise le code d'exemple de la spec V3.
Corrigeable facilement — non bloquant en soi.

### 2.2 Document API — incompatibilité bloquante

Recherche de `applyDocument` / `updateDocument` dans tout le dépôt :

```
./core/history/HistoryService.js  (3 occurrences — notre propre code)
```

**Aucune occurrence ailleurs dans le dépôt.** `getDocument()` /
`applyDocument()` n'existent nulle part dans `useCircuitState.js` ni dans le
reste de l'application.

Le vrai `documentApi` exposé par `useCircuitState.js` (ligne 146, mémorisé
via `useMemo`) a une forme **granulaire, orientée-action** :

```js
const documentApi = useMemo(() => ({
  updateComponentPositions,
  updateComponentState: (uid, state) => { ... },
  removeComponents: (componentIds) => { ... },
  removeWires: (wireIds) => { ... },
  restoreComponents: (componentsToRestore) => { ... },
  restoreWires: (wiresToRestore) => { ... },
}), [updateComponentPositions])
```

Il n'y a **ni `getDocument()` ni `applyDocument(document)`** — l'API attend
des appels ciblés (`removeComponents(ids)`, `restoreWires(wires)`, etc.), pas
un remplacement de document complet.

### 2.3 Modèle de données — incompatibilité structurelle

| | Modèle Core (`core/handlers`, `core/validation`) | Modèle réel (`useCircuitState.js`, `circuitModel.js`) |
|---|---|---|
| Composant | `{ id, type, position: {x, y}, parameters }` | `{ uid, type, x, y, pins, state? }` |
| Fil | `{ id, pinA: {componentId, pinId}, pinB: {...} }` | `{ id, fromUid, fromPin, toUid, toPin }` |

Cet écart avait déjà été identifié lors de MB-HANDLER-001 (le Core suit le
modèle cible des ADR-001/005/008, distinct du modèle legacy actuel). Il
redevient bloquant ici car MB-HOOK-001 tente de faire cohabiter les deux
modèles dans le même hook.

---

## 3. Décision

**Le Core (CommandBus + Handlers + ValidationEngine + HistoryService)
construit sur les tickets MB-CMD-001 → MB-HISTORY-001-A n'est pas
branchable en l'état sur `useCircuitState.js` réel**, sans l'une des deux
options suivantes :

- **(a)** Inventer de nouvelles méthodes sur le Document API
  (`getDocument`/`applyDocument`) — explicitement interdit par les critères
  d'acceptation de la spec MB-HOOK-001 elle-même ("Pas d'invention de
  méthode Document API").
- **(b)** Écrire une couche de traduction complète entre les deux modèles
  de données (`id` ↔ `uid`, `position` ↔ `x`/`y`, `pinA`/`pinB` ↔
  `fromUid`/`toUid`) — un chantier plus large que ce que décrit ce ticket,
  avec un risque réel de régression sur l'application en production.

**Décision du Project Lead (05/08/2026) : ne pas intégrer `useCircuitState`
au Core pour l'instant.** Ce ticket reste ouvert/bloqué en attendant un
arbitrage sur (a), (b), ou une reformulation du périmètre du Core pour
qu'il adopte directement le modèle de données réel de l'application.

---

## 4. Fichiers livrés malgré le blocage

Aucun — `CommandBusFactory.js`, `HandlerRegistry.js` et la modification de
`useCircuitState.js` prévus par la spec n'ont **pas** été créés, pour éviter
de livrer une intégration non fonctionnelle ou de contourner l'interdiction
d'invention de méthode Document API.

Le Core existant (`frontend/src/core/`) reste inchangé et continue de
fonctionner de manière isolée (71 tests passent, cf. commits MB-CMD-001,
MB-VAL-001, MB-HANDLER-001, MB-HISTORY-001-A).

---

## 5. Recommandation pour la suite

Avant de retenter une intégration, clarifier :

1. Le Core doit-il être adapté pour consommer directement le modèle de
   données réel (`uid`/`x`/`y`/`fromUid`/`toUid`), plutôt que le modèle
   cible théorique des ADR ?
2. Ou bien le modèle de données réel de l'application doit-il migrer vers
   le modèle cible du Core (`id`/`position`/`pinA`/`pinB`) — migration plus
   large, hors périmètre de ce ticket ?
3. Dans les deux cas, quelle forme doit prendre l'intégration Document API
   (snapshot complet vs appels granulaires) ?

---

**MB-HOOK-001 — Bloqué, documenté le 05/08/2026.**
