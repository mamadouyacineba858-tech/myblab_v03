# MB-CF4-001 — Arbitrage du contrat de Validation

## 0. Statut

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-CF4-001` |
| Programme | Core Foundation |
| Épic | CF4 — Stabilisation de la Validation |
| Type | ARCHITECTURE / ARBITRAGE |
| Statut | **GATE 1 PASS — GATE 2 EN ATTENTE** |
| Baseline main | `a4b2aec2638c705490a5ecf62299bbd94bd24965` |
| Branche | `docs/cf4-arbitration` |

Ce document ne lance aucune implémentation de production. Il formalise le contrat CF4 et consigne les vérifications factuelles effectuées directement sur le dépôt.

---

## 1. Objet

CF4 doit stabiliser la responsabilité de `Validation` dans le Core et préciser son interaction avec le canal de mutation activé par CF3.

La roadmap définit CF4 comme la stabilisation de la Validation afin qu'elle puisse servir de fondation aux consommateurs dépendant de résultats de validation.

ADR-010 est l'artefact normatif de référence. Il définit le positionnement de Validation entre la commande et le Handler, ainsi que la distinction `ERROR` / `WARNING` / `INFO`. fileciteturn224file0L2-L2

Le présent document ne reconstruit pas Validation. Il formalise les décisions existantes et identifie les adaptations minimales réellement nécessaires à l'intégration.

---

## 2. Référence normative — ADR-010

Artefact canonique :

`docs/governance/ADR/ADR-010-validation-engine-architecture.md`

ADR-010 établit explicitement :

1. Validation intervient avant l'exécution du Handler pour la validation pré-exécution.
2. `ValidationEngine` analyse la commande et le Document courant.
3. `ValidationEngine` produit un `ValidationReport` et ne modifie jamais le Document.
4. `ValidationEngine` ne décide pas de l'exécution.
5. `CommandBus` appelle Validation et interprète le rapport.
6. `ERROR` est bloquant.
7. `WARNING` et `INFO` autorisent l'exécution.
8. La validation porte sur `Document + Command`.
9. Une validation post-exécution existe comme capacité distincte.
10. Validation ne dépend ni de l'interface ni de la simulation.

Ces éléments sont confirmés directement par l'ADR présent sur `main`. fileciteturn224file0L2-L2

---

## 3. GATE 1 — Cartographie factuelle

### 3.1 ValidationEngine — PASS

`frontend/src/core/validation/ValidationEngine.js` existe et expose exactement :

```js
validate(document, command = null)
validateDocument(document)
```

Le moteur récupère les règles du `ValidationRegistry`, appelle `rule.validate(document, command)`, construit un `ValidationReport`, et ne modifie pas le Document. Les erreurs internes de règle sont transformées en problèmes `ERROR`. fileciteturn226file0L2-L2

**Verdict Q2 : PASS.** Le contrat `validate(document, command)` existe réellement.

### 3.2 ValidationRegistry — PASS

`ValidationRegistry` possède une API extensible avec `add`, `getAll`, `getByCategory`, `getByLevel`, `count` et `has`. Une règle doit fournir `id`, `category`, `level` et `validate`. fileciteturn229file0L2-L2

### 3.3 CommandBus — PASS avec écart d'intégration

`frontend/src/core/command/CommandBus.js` possède bien un constructeur :

```js
constructor(registry, validators = {})
```

et stocke `this._validators = validators`. Cependant, le `dispatch()` réel n'appelle actuellement **aucun** validateur : il récupère directement le Handler, exécute les middlewares puis le Handler. fileciteturn225file0L2-L2

**Verdict Q1 : PASS factuel / intégration INCOMPLÈTE.** Le mécanisme d'injection existe mais est actuellement inutilisé.

### 3.4 AddComponentHandler — PASS

`AddComponentHandler` reçoit une commande et un Document, valide son payload `componentType`, puis construit le nouveau Document via son chemin historique existant. Il ne dépend pas de ValidationEngine. fileciteturn227file0L2-L2

**Verdict Q3 : PASS.** Aucune adaptation du Handler n'est requise pour fournir une commande candidate au ValidationEngine.

### 3.5 Tests CommandBus — PASS comme baseline, mais couverture CF4 absente

La suite `CommandBus.test.js` couvre dispatch, commandes invalides, Handler absent, erreurs Handler et middleware. Elle ne vérifie pas encore l'appel du ValidationEngine ni la politique `ERROR/WARNING/INFO`. fileciteturn230file0L2-L2

### 3.6 Conclusion GATE 1

**GATE 1 : PASS.**

Les composants nécessaires existent. Le point précis à résoudre est désormais connu : **CommandBus stocke le validateur mais ne l'exécute pas encore.**

---

## 4. Contexte CF3 et frontière de responsabilité

CF3 a activé, de manière bornée, le canal :

`CommandBus → AddComponentHandler → HistoryService → Document API`.

CF4 doit s'insérer dans ce canal sans en créer un second :

```text
Commande candidate
      │
      ▼
CommandBus
      │
      ▼
ValidationEngine.validate(document, command)
      │
      ▼
ValidationReport
      │
      ├── ERROR ──► refus
      │
      └── aucun ERROR ──► Handler
                              │
                              ▼
                       HistoryService
                              │
                              ▼
                          Document
```

Cette architecture est directement conforme au flux d'ADR-010. fileciteturn224file0L2-L2

---

## 5. GATE 2 — Contrat et décision d'intégration

### 5.1 Ce qui est déjà compatible

- `ValidationEngine.validate(document, command)` existe.
- `ValidationEngine` est indépendant de React et de Simulation.
- `ValidationRegistry` fournit les règles.
- `AddComponentHandler` accepte la commande et le Document sans dépendre de Validation.
- Le CommandBus possède déjà un point d'injection `validators`.

### 5.2 Ce qui manque réellement

Le CommandBus doit encore :

1. appeler le ValidationEngine avant le Handler ;
2. interpréter le `ValidationReport` ;
3. refuser une commande en présence d'un `ERROR` ;
4. autoriser `WARNING` et `INFO` ;
5. rendre le résultat de validation accessible au résultat du dispatch, conformément à ADR-010.

Ce manque est **une intégration de la capacité déjà présente**, pas une création d'un nouveau moteur ou d'un nouveau Registry.

### 5.3 Q4 — Gestion du résultat

Le `dispatch()` actuel retourne un objet :

```js
{
  success: true,
  commandId,
  commandType,
  result
}
```

Il n'existe actuellement aucun champ de rapport de validation dans ce résultat. ADR-010 demande toutefois que les warnings/infos soient transmis via le résultat. fileciteturn224file0L2-L2

**Décision de travail :** la forme minimale du résultat doit être déterminée par le contrat réel du dépôt avant modification. Aucun champ ou API supplémentaire ne doit être inventé à ce stade.

### 5.4 Verdict GATE 2

**GATE 2 : PARTIEL — STOP contrôlé sur Q4.**

Il n'y a pas de conflit architectural. En revanche, la forme exacte du transport du `ValidationReport` dans le résultat de `CommandBus.dispatch()` n'est pas encore établie par un contrat existant.

**Aucune modification de production ne doit commencer tant que Q4 n'est pas résolue factuellement.**

---

## 6. Décisions héritées — ne pas ré-arbitrer

### D1 — Moment de validation

Pré-validation avant le Handler, conformément à ADR-010. fileciteturn224file0L2-L2

### D2 — Politique de blocage

`ERROR` bloque ; `WARNING` et `INFO` autorisent.

### D3 — Autorité de blocage

CommandBus applique la politique ; ValidationEngine produit uniquement le rapport.

### D4 — Forme de validation

`validate(document, command)`.

### D5 — Responsabilité ValidationEngine

Analyse et rapporte ; ne modifie pas le Document et ne décide pas de l'exécution.

### D6 — Historisation

Les `ValidationReport` ne sont pas historisés par défaut.

### D7 — Premier consommateur

`addComponent` uniquement pour la première intégration CF4.

---

## 7. Questions restantes

### Q4 — Forme du résultat de validation

**Question bloquante actuelle :** existe-t-il déjà dans le dépôt un contrat de résultat ou un adaptateur permettant de transporter le `ValidationReport` sans inventer une nouvelle API ?

**Méthode obligatoire :** rechercher dans CommandBus, handlers, tests, intégrateurs et usages de `ValidationReport` avant toute conception.

### Q5 — Source des règles pour le premier consommateur

Le `ValidationRegistry` est vide par défaut. Avant de prétendre démontrer `ERROR/WARNING/INFO` sur `addComponent`, il faut identifier les règles effectivement enregistrées dans l'intégration cible. La présence du moteur seul ne constitue pas une validation métier active.

**Méthode obligatoire :** cartographier les enregistrements de règles et leurs tests.

---

## 8. Périmètre proposé

### Inclus

- intégrer le ValidationEngine au CommandBus existant ;
- respecter la politique ADR-010 ;
- rendre le résultat de validation accessible selon un contrat déjà existant ou explicitement arbitré ;
- couvrir `addComponent` uniquement ;
- ajouter les tests contractuels nécessaires ;
- démontrer la non-régression CF1/CF2/CF3.

### Exclus

- réécriture de ValidationEngine ;
- migration générale des mutations ;
- modification du Registry canonique CF2 ;
- modification de HistoryService sans nécessité démontrée ;
- validation de la simulation ;
- historisation des rapports ;
- création d'une nouvelle couche de politique ;
- création de règles métier supplémentaires sans contrat séparé.

---

## 9. Invariants CF4

- **INV-CF4-001** — `addComponent` est pré-validé avant son Handler.
- **INV-CF4-002** — Un `ERROR` empêche la mutation.
- **INV-CF4-003** — `WARNING` et `INFO` n'empêchent pas la mutation.
- **INV-CF4-004** — ValidationEngine ne modifie jamais le Document.
- **INV-CF4-005** — CommandBus applique la politique de blocage.
- **INV-CF4-006** — ValidationReport n'est pas un état persistant du Document.
- **INV-CF4-007** — Aucun canal de mutation parallèle n'est créé.
- **INV-CF4-008** — CF4 ne déplace aucune responsabilité CF2.
- **INV-CF4-009** — Les tests existants ne sont ni supprimés ni affaiblis.
- **INV-CF4-010** — Le périmètre reste limité à `addComponent`.

---

## 10. STOP conditions

- **STOP-01** — invention d'une API de transport du rapport sans preuve dans le dépôt ;
- **STOP-02** — `validate(document, command)` incompatible avec le modèle réel ;
- **STOP-03** — ValidationEngine modifie le Document ;
- **STOP-04** — politique ADR-010 `ERROR/WARNING/INFO` modifiée ;
- **STOP-05** — modification non nécessaire de HistoryService ;
- **STOP-06** — canal de mutation parallèle ;
- **STOP-07** — levée d'un invariant CF1/CF2/CF3 sans nouvel arbitrage ;
- **STOP-08** — migration au-delà de `addComponent` ;
- **STOP-09** — test supprimé ou affaibli ;
- **STOP-10** — ajout de règles métier non couvert par le contrat.

---

## 11. GATES

### GATE 0 — Baseline

`main == origin/main == a4b2aec2638c705490a5ecf62299bbd94bd24965`.

### GATE 1 — Cartographie

**PASS** — ValidationEngine, ValidationRegistry, CommandBus, AddComponentHandler et tests identifiés.

### GATE 2 — Contrat

**EN ATTENTE** — résoudre Q4 et Q5 factuellement avant modification de production.

### GATE 3 — Intégration minimale

Brancher Validation sur `addComponent` uniquement après GATE 2 PASS.

### GATE 4 — Tests

Couvrir ERROR bloquant, WARNING/INFO autorisés, ordre de validation, Document inchangé au rejet, succès via CF3/HistoryService, Undo/Redo et non-régression.

### GATE 5 — Audit de périmètre

Diff, fichiers, tests et invariants.

### GATE 6 — Livraison

Commit, patch autonome, SHA-256, apply-check, reverse-check et rapport final.

---

## 12. Critères d'acceptation

1. `CommandBus → ValidationEngine → Handler` est démontré.
2. `ERROR` empêche effectivement `addComponent`.
3. `WARNING` et `INFO` n'empêchent pas `addComponent`.
4. Le Document reste inchangé lorsqu'une commande est rejetée.
5. Une commande acceptée continue par `AddComponentHandler → HistoryService → Document`.
6. Undo/Redo restent fonctionnels.
7. Aucune responsabilité CF1/CF2/CF3 n'est déplacée.
8. Les tests existants restent verts.
9. Aucun test n'est supprimé ou affaibli.
10. Le patch est reconstructible et son reverse-check est PASS.

---

## 13. Statut final de l'arbitrage

**🟡 GATE 1 PASS — GATE 2 EN ATTENTE.**

Le point bloquant n'est plus l'existence de ValidationEngine ou sa compatibilité avec `AddComponentHandler`. Le seul point d'intégration architectural restant à établir avant le code est le **contrat réel de transport du `ValidationReport` par le CommandBus**, ainsi que la présence effective des règles enregistrées pour `addComponent`.

Aucune modification de production ne doit être engagée avant résolution factuelle de Q4/Q5.
