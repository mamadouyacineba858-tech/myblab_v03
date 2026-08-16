# MB-CF4-001 — Arbitrage du contrat de Validation

## 0. Statut

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-CF4-001` |
| Programme | Core Foundation |
| Épic | CF4 — Stabilisation de la Validation |
| Type | ARCHITECTURE / ARBITRAGE |
| Statut | DRAFT — soumission au CSA |
| Baseline | `a4b2aec2638c705490a5ecf62299bbd94bd24965` |
| Branche de travail | `docs/cf4-arbitration` |

Ce document ne lance aucune implémentation. Il transforme les faits observés sur `main` en questions d'arbitrage explicites afin qu'aucune décision implicite ne soit introduite dans CF4.

---

## 1. Objet

CF4 doit stabiliser la responsabilité de `Validation` dans le Core et préciser son interaction avec le canal de mutation déjà activé par CF3.

La roadmap définit CF4 comme la stabilisation de la Validation afin qu'elle puisse servir de fondation aux consommateurs dépendant de résultats de validation. Elle maintient également ADR-010 au statut `PROPOSED` tant qu'une décision explicite ultérieure ne le modifie.

Le présent document ne reconstruit donc pas Validation. Il cherche à arbitrer son contrat d'utilisation.

---

## 2. Faits établis sur la baseline

### 2.1 Validation existe déjà

Le dépôt contient :

- `ValidationEngine.js` ;
- `ValidationRegistry.js` ;
- `ValidationReport.js` ;
- `ValidationProblem.js` ;
- constantes et erreurs dédiées ;
- une suite de tests unitaires dédiée.

### 2.2 Responsabilité actuelle du ValidationEngine

`ValidationEngine` :

- reçoit un Document et une commande optionnelle ;
- exécute les règles du Registry ;
- transforme les résultats en `ValidationProblem` ;
- produit un `ValidationReport` ;
- ne modifie jamais le Document ;
- ne stocke aucun état persistant ;
- ne décide pas lui-même de l'exécution.

Cette séparation constitue une contrainte de référence pour CF4.

### 2.3 Contrat actuel du ValidationReport

Le rapport distingue trois niveaux :

- `ERROR` ;
- `WARNING` ;
- `INFO`.

Le statut global est calculé selon la priorité :

`ERROR > WARNING > OK`.

Le contrat actuel indique également qu'un rapport contenant uniquement des warnings reste `isValid() === true`.

### 2.4 CommandBus

`CommandBus` accepte déjà une injection optionnelle nommée `validators` et sa documentation indique que la validation métier est déléguée au Validation Engine via ADR-010.

Cependant, dans l'implémentation observée sur la baseline, `dispatch()` ne consomme pas encore `this._validators` pour appeler le Validation Engine.

Le flux réellement exécuté reste donc :

`Command → CommandRegistry → Handler → résultat`

et non encore :

`Command → Validation → CommandRegistry/Handler → résultat`.

Ce point est une lacune d'intégration observée, pas encore une décision de correction.

---

## 3. Contexte CF3

CF3 a activé, de manière bornée, le canal :

`CommandBus → AddComponentHandler → HistoryService → Document API`.

L'amendement CSA-CF3-001-A a explicitement levé certains verrous CF1 pour cette activation, uniquement pour `addComponent`.

CF4 doit donc préserver les décisions CF3 et ne pas élargir silencieusement le périmètre du canal de mutation.

La présence de Validation dans ou autour du CommandBus ne doit pas modifier les responsabilités déjà établies de `HistoryService`, `Document`, `Registry` ou `Presentation`.

---

## 4. Questions d'arbitrage CSA

### Q1 — Moment de la validation

**Question :** la validation d'une commande candidate doit-elle être effectuée avant l'exécution du Handler ?

**Option A — Pré-validation obligatoire**

`Command → ValidationEngine → décision de politique → Handler`

Avantage : une commande invalide ne déclenche pas la mutation.

Risque : nécessite de définir précisément la politique de blocage et la représentation de la commande candidate.

**Option B — Validation post-exécution uniquement**

`Command → Handler → Document → ValidationEngine`

Avantage : utile pour contrôler l'état produit.

Risque : ne protège pas le Document contre une mutation invalide déjà appliquée.

**Option C — Double validation**

Pré-validation de la commande puis validation de l'état résultant.

Avantage : couverture maximale.

Risque : complexité et coût supplémentaires ; nécessite un contrat clair sur les deux rapports.

**Recommandation CSA provisoire :** ne pas retenir C sans besoin démontré. La première décision à stabiliser est la pré-validation d'une commande candidate si CF4 doit constituer une porte de sécurité du canal Mutation.

---

### Q2 — Politique ERROR / WARNING / INFO

**Question :** quels niveaux bloquent une mutation ?

Le contrat actuel du `ValidationReport` établit déjà que `WARNING` n'est pas une erreur bloquante au niveau de `isValid()`.

Options :

- **P1 :** seul `ERROR` bloque ; `WARNING` et `INFO` permettent l'exécution.
- **P2 :** `ERROR` et certains `WARNING` peuvent bloquer selon une politique externe.
- **P3 :** chaque règle déclare explicitement sa politique de blocage indépendamment de son niveau.

**Point de vigilance :** ne pas changer la sémantique de `ValidationReport.isValid()` simplement pour résoudre le besoin du CommandBus. Si une politique supplémentaire est nécessaire, elle doit être explicitement contractualisée.

**Recommandation CSA provisoire :** P1 pour le premier contrat CF4, sauf preuve architecturale contraire. Cela conserve la sémantique déjà matérialisée et évite de transformer `WARNING` en erreur implicite.

---

### Q3 — Qui décide du blocage ?

`ValidationEngine` indique explicitement qu'il « ne décide pas de l'exécution ».

La décision ne doit donc pas être déplacée dans `ValidationEngine`.

Deux possibilités principales :

- `CommandBus` applique la politique à partir du `ValidationReport` ;
- un composant de politique dédié, consommé par `CommandBus`, applique cette décision.

**Recommandation CSA provisoire :** pour le premier périmètre CF4, `CommandBus` peut appliquer un contrat minimal fondé sur `report.hasErrors()` sans introduire prématurément un nouveau sous-système de politique.

Cette recommandation devra être confirmée par le CSA avant implémentation.

---

### Q4 — Validation du Document ou de la paire Document + Command ?

Le `ValidationEngine` accepte déjà :

`validate(document, command = null)`.

Cela permet à une règle d'examiner la modification candidate sans que Validation devienne elle-même un moteur de mutation.

**Recommandation CSA provisoire :** la pré-validation du canal Mutation doit fournir la commande candidate au ValidationEngine :

`validate(document, command)`.

La validation postérieure d'un Document seul reste une capacité distincte et déjà supportée par `validateDocument()`.

---

## 5. Contrat cible proposé pour arbitrage

Sans constituer encore une décision acquise, le contrat minimal proposé est :

```text
Command candidate
      │
      ▼
ValidationEngine.validate(document, command)
      │
      ▼
ValidationReport
      │
      ├── ERROR ──► mutation refusée
      │
      └── aucun ERROR ──► CommandBus poursuit le dispatch
                                │
                                ▼
                              Handler
                                │
                                ▼
                         HistoryService / Document
```

Contraintes :

1. Validation ne modifie jamais le Document.
2. Validation ne possède aucun état métier persistant.
3. Validation ne décide pas elle-même de l'exécution.
4. CommandBus applique explicitement la politique de blocage.
5. `ERROR` est le seul niveau bloquant dans le contrat minimal proposé.
6. Les warnings restent observables dans le rapport.
7. Le Handler ne doit pas contourner Validation lorsque le chemin passe par le canal Mutation contractualisé.
8. Aucun nouveau canal parallèle de mutation ne doit être créé par CF4.

---

## 6. Questions restant ouvertes

### O1 — Statut d'ADR-010

La roadmap référence ADR-010 comme `PROPOSED`, mais le répertoire `docs/adr/` actuellement observé ne contient pas de fichier `ADR-010`.

**Décision requise :** retrouver l'artefact de référence s'il existe ailleurs, ou formaliser explicitement l'ADR avant toute implémentation CF4 dépendante de celui-ci.

### O2 — Portée du premier consommateur

CF3 a activé `addComponent` uniquement.

**Décision requise :** CF4 doit-il intégrer Validation au seul chemin `addComponent` comme preuve minimale, ou définir d'abord un contrat générique du CommandBus sans brancher immédiatement toutes les mutations ?

**Recommandation :** contrat générique, intégration minimale sur le chemin déjà activé par CF3.

### O3 — Nature des règles bloquantes

Le Registry possède actuellement une notion de niveau (`ERROR`, `WARNING`, `INFO`).

**Décision requise :** confirmer qu'aucune seconde notion de « blocking » n'est nécessaire dans CF4.

---

## 7. Périmètre proposé pour MB-CF4-001

### Inclus

- formaliser le contrat Validation ↔ CommandBus ;
- définir la politique de blocage ;
- définir le comportement avec `ValidationReport` ;
- clarifier le rôle de `ValidationEngine`, `ValidationRegistry` et `ValidationReport` ;
- établir la traçabilité avec ADR-010 ;
- définir les tests contractuels nécessaires à l'intégration future.

### Exclus

- réécriture de `ValidationEngine` ;
- migration générale de toutes les mutations ;
- nouvelle architecture de Registry ;
- modification de `HistoryService` ;
- nouvelle couche Presentation ;
- validation de la simulation analogique ;
- implémentation du firmware ;
- création d'un nouveau sous-système de politique sans décision CSA explicite.

---

## 8. Critères de décision

Le dossier ne sera considéré comme prêt pour implémentation que si :

- [ ] le statut et le contenu de référence d'ADR-010 sont établis ;
- [ ] le point d'insertion de Validation dans le flux de mutation est décidé ;
- [ ] la politique ERROR/WARNING/INFO est décidée ;
- [ ] la responsabilité de la décision de blocage est décidée ;
- [ ] la portée du premier consommateur est décidée ;
- [ ] aucun invariant CF1/CF3 n'est implicitement levé ;
- [ ] les tests contractuels nécessaires sont définis ;
- [ ] aucun travail d'implémentation n'est lancé avant le GO CSA.

---

## 9. Décision CSA

### Q1 — Moment de validation

**Décision : À ARBITRER**

### Q2 — Politique de blocage

**Décision : À ARBITRER**

### Q3 — Autorité de blocage

**Décision : À ARBITRER**

### Q4 — Forme de la validation candidate

**Décision : À ARBITRER**

### Q5 — ADR-010

**Décision : À ARBITRER**

### Q6 — Portée du premier consommateur

**Décision : À ARBITRER**

---

## 10. Conclusion

CF4 dispose déjà d'une fondation Validation substantielle. Le risque principal n'est donc pas l'absence de code, mais l'absence d'un contrat explicite entre Validation et le canal de mutation.

La prochaine étape doit être une décision architecturale courte et contrôlée, puis seulement ensuite un ticket d'implémentation si le contrat est approuvé.

**Statut final du présent document : DRAFT — PRÊT POUR REVUE QWEN, puis arbitrage CSA.**
