# MB-CF4-001 — Arbitrage du contrat de Validation

## 0. Statut

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-CF4-001` |
| Programme | Core Foundation |
| Épic | CF4 — Stabilisation de la Validation |
| Type | ARCHITECTURE / ARBITRAGE |
| Statut | DRAFT — consolidé après vérification ADR-010 |
| Baseline | `a4b2aec2638c705490a5ecf62299bbd94bd24965` |
| Branche de travail | `docs/cf4-arbitration` |

Ce document ne lance aucune implémentation. Il transforme les faits observés sur `main` et les décisions déjà explicites d'ADR-010 en contrat d'arbitrage pour CF4.

---

## 1. Objet

CF4 doit stabiliser la responsabilité de `Validation` dans le Core et préciser son interaction avec le canal de mutation déjà activé par CF3.

La roadmap définit CF4 comme la stabilisation de la Validation afin qu'elle puisse servir de fondation aux consommateurs dépendant de résultats de validation.

ADR-010 est l'artefact normatif de référence et porte le statut `PROPOSED`, avec validation CSA indiquée dans son en-tête. Il définit déjà le positionnement de Validation entre la commande et le Handler, ainsi que la distinction ERROR/WARNING/INFO.

Le présent document ne reconstruit donc pas Validation. Il formalise les décisions existantes d'ADR-010 et identifie uniquement les points d'intégration restant à contractualiser.

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
8. La validation candidate porte sur `Document + Command`.
9. Une validation post-exécution est également prévue comme capacité distincte.
10. Validation ne dépend ni de l'interface ni de la simulation.

**Conséquence :** ces éléments ne doivent pas être ré-arbitrés ni réinventés par MB-CF4-001 sauf découverte factuelle d'une contradiction avec l'implémentation actuelle.

---

## 3. Faits établis sur la baseline

### 3.1 Validation existe déjà

Le dépôt contient notamment :

- `ValidationEngine.js` ;
- `ValidationRegistry.js` ;
- `ValidationReport.js` ;
- `ValidationProblem.js` ;
- constantes et erreurs dédiées ;
- une suite de tests unitaires dédiée.

### 3.2 Responsabilité du ValidationEngine

Le contrat observé et l'ADR convergent sur les responsabilités suivantes :

- recevoir un Document et une commande optionnelle ;
- exécuter les règles du Registry ;
- produire un `ValidationReport` ;
- ne jamais modifier le Document ;
- ne pas stocker d'état métier persistant ;
- ne pas décider lui-même de l'exécution.

### 3.3 CommandBus

Le CommandBus possède une injection de validators et l'architecture ADR-010 prévoit que la validation soit appelée avant le Handler. L'objectif de CF4 est donc d'établir la connexion contractuelle manquante sans changer la responsabilité du ValidationEngine.

### 3.4 Contrat ValidationReport

Les niveaux sont :

- `ERROR` ;
- `WARNING` ;
- `INFO`.

Le contrat actuel distingue les erreurs bloquantes des warnings et informations. Un warning ne doit pas être transformé implicitement en erreur par CF4.

---

## 4. Contexte CF3 et frontière de responsabilité

CF3 a activé, de manière bornée, le canal :

`CommandBus → AddComponentHandler → HistoryService → Document API`.

CF4 ne remplace pas ce canal et ne crée pas de canal parallèle.

La responsabilité cible est :

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

Ce flux est cohérent avec ADR-010 et avec CF3. Il reste à vérifier contre le code réel avant toute modification.

---

## 5. Décisions déjà établies — ne pas ré-arbitrer

### D1 — Moment de validation

**Décision héritée ADR-010 : pré-validation avant le Handler.**

### D2 — Politique de blocage

**Décision héritée ADR-010 : `ERROR` bloque ; `WARNING` et `INFO` autorisent.**

### D3 — Autorité de blocage

**Décision héritée ADR-010 : CommandBus applique la politique.**

### D4 — Forme de la validation candidate

**Décision héritée ADR-010 : `validate(document, command)`.**

### D5 — Responsabilité de ValidationEngine

Validation analyse et rapporte ; elle ne modifie pas le Document et ne décide pas de l'exécution.

### D6 — Historisation

Les `ValidationReport` ne sont **pas historisés par défaut**. Ils décrivent un résultat de validation et ne constituent pas un nouvel état persistant du Document.

### D7 — Premier consommateur

Le premier chemin d'intégration CF4 reste limité à `addComponent`, déjà activé par CF3, afin de démontrer le contrat sans migration générale.

---

## 6. Questions restantes réellement ouvertes

Après prise en compte d'ADR-010, les questions précédemment ouvertes sont réduites à des vérifications d'implémentation :

### Q1 — Compatibilité du CommandBus réel

Le CommandBus de la baseline consomme-t-il déjà effectivement l'injection `validators` conformément au contrat ADR-010, ou cette capacité reste-t-elle inactive ?

**Action GATE 1 :** vérifier le code et les tests avant toute modification.

### Q2 — Compatibilité du ValidationEngine réel

Le chemin `validate(document, command)` existe-t-il exactement avec les types attendus par `addComponent` ?

**Action GATE 1 :** vérifier le code et les tests.

### Q3 — Représentation de la commande candidate

Le `AddComponentHandler` et le CommandBus fournissent-ils au ValidationEngine une commande candidate suffisante sans adaptation architecturale supplémentaire ?

**Action GATE 1 :** démontrer factuellement la compatibilité.

### Q4 — Gestion du résultat

Le résultat de validation peut-il être attaché au résultat de dispatch sans modifier la responsabilité du Document ou de HistoryService ?

**Action GATE 1 :** vérifier le contrat existant avant de créer une nouvelle structure.

Aucune de ces questions ne justifie à elle seule une nouvelle API. Elles doivent être résolues par inspection du code existant.

---

## 7. Périmètre proposé pour MB-CF4-001

### Inclus

- brancher le contrat Validation au canal CommandBus existant si les GATE le confirment ;
- utiliser `ValidationEngine.validate(document, command)` pour la pré-validation ;
- appliquer la politique `ERROR` bloquant / `WARNING` et `INFO` autorisés ;
- conserver Validation comme composant d'analyse sans mutation ;
- conserver CommandBus comme autorité de décision ;
- couvrir le premier consommateur `addComponent` ;
- ajouter les tests contractuels nécessaires ;
- démontrer la non-régression CF1/CF2/CF3.

### Exclus

- réécriture générale de `ValidationEngine` ;
- migration générale de toutes les mutations ;
- modification du Registry canonique CF2 ;
- modification de `HistoryService` sans nécessité démontrée ;
- nouvelle couche Presentation ;
- validation de la simulation analogique ;
- firmware ;
- historisation des `ValidationReport` ;
- création d'un nouveau sous-système de politique sans nécessité factuelle.

---

## 8. Invariants CF4 proposés

- **INV-CF4-001** — Toute commande `addComponent` passant par le canal CF3 est pré-validée avant son Handler.
- **INV-CF4-002** — Une validation contenant un `ERROR` empêche la mutation.
- **INV-CF4-003** — Uniquement des `WARNING` ou `INFO` n'empêche pas la mutation.
- **INV-CF4-004** — `ValidationEngine` ne modifie jamais le Document.
- **INV-CF4-005** — `CommandBus` reste l'autorité appliquant la politique de blocage.
- **INV-CF4-006** — `ValidationReport` n'est pas un état persistant du Document et n'est pas historisé par défaut.
- **INV-CF4-007** — CF4 n'introduit aucun canal de mutation parallèle à CF3.
- **INV-CF4-008** — CF4 ne modifie pas la responsabilité du Registry canonique, de Simulation ou de Presentation.
- **INV-CF4-009** — Le comportement `ERROR/WARNING/INFO` d'ADR-010 est conservé sans affaiblissement des tests existants.
- **INV-CF4-010** — Le périmètre initial reste limité à `addComponent` tant qu'une extension n'est pas explicitement décidée.

---

## 9. STOP conditions

Le ticket d'implémentation doit s'arrêter immédiatement si :

- **STOP-01** — le CommandBus réel ne peut pas intégrer Validation sans inventer une API non documentée ;
- **STOP-02** — `validate(document, command)` n'est pas compatible avec le modèle réellement utilisé ;
- **STOP-03** — la validation nécessite de modifier le Document ;
- **STOP-04** — la politique `ERROR/WARNING/INFO` d'ADR-010 doit être changée ;
- **STOP-05** — HistoryService doit être modifié sans nécessité architecturale démontrée ;
- **STOP-06** — une seconde source de vérité ou un canal parallèle de mutation apparaît ;
- **STOP-07** — un invariant CF1, CF2 ou CF3 doit être levé sans nouvel arbitrage CSA ;
- **STOP-08** — une migration au-delà de `addComponent` devient nécessaire pour satisfaire le contrat ;
- **STOP-09** — un test existant doit être supprimé ou affaibli pour obtenir le vert ;
- **STOP-10** — le périmètre réel dépasse celui explicitement défini ici.

---

## 10. GATES d'implémentation

### GATE 0 — Baseline

Confirmer `main == origin/main == a4b2aec...` et working tree compatible.

### GATE 1 — Cartographie

Vérifier directement :

- CommandBus ;
- ValidationEngine ;
- ValidationReport ;
- ValidationRegistry ;
- AddComponentHandler ;
- HistoryService ;
- tests existants.

### GATE 2 — Contrat

Démontrer que le flux cible est compatible sans inventer d'API.

### GATE 3 — Intégration minimale

Brancher Validation sur `addComponent` uniquement, si GATE 2 est PASS.

### GATE 4 — Tests

Ajouter les tests nécessaires pour :

- ERROR bloque ;
- WARNING autorise ;
- INFO autorise ;
- validation avant Handler ;
- Document inchangé en cas de rejet ;
- succès conserve le canal CF3 et HistoryService ;
- Undo/Redo restent cohérents ;
- non-régression CF1/CF2/CF3.

### GATE 5 — Audit de périmètre

Vérifier les fichiers modifiés, absence de modification hors contrat, `git diff --check`, absence de tests affaiblis.

### GATE 6 — Livraison

Produire commit, patch autonome, SHA-256, vérification `apply --check`, reverse-check et rapport final structuré.

---

## 11. Critères d'acceptation

Le ticket ne peut être déclaré PASS que si :

1. le flux `CommandBus → ValidationEngine → Handler` est démontré ;
2. `ERROR` empêche effectivement `addComponent` ;
3. `WARNING` et `INFO` n'empêchent pas `addComponent` ;
4. le Document n'est pas modifié lorsqu'une commande est rejetée ;
5. le chemin accepté continue par `AddComponentHandler → HistoryService → Document` ;
6. Undo/Redo restent fonctionnels ;
7. aucune responsabilité CF1/CF2/CF3 n'est déplacée ;
8. les tests existants restent verts ;
9. aucun test n'est supprimé ou affaibli ;
10. le patch est reconstructible et son reverse-check est PASS.

---

## 12. Rapport final obligatoire

Le rapport devra fournir :

- baseline exacte ;
- GATE 0 à 6 ;
- fichiers modifiés ;
- invariants CF4 vérifiés individuellement ;
- STOP conditions rencontrées ou non ;
- tests ciblés ;
- suite complète ;
- commit final et parent ;
- SHA-256 du patch ;
- résultat apply-check ;
- résultat reverse-check ;
- confirmation qu'aucun push hors procédure autorisée n'a été effectué pendant l'implémentation.

---

## 13. Statut

**🟢 CONTRAT CF4 CONSOLIDÉ — PRÊT POUR AUDIT FACTUEL QWEN.**

Aucune implémentation de production n'est autorisée par ce document avant passage des GATE 0–2 et confirmation de compatibilité factuelle.
