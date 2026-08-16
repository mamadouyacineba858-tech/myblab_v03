# CSA-CF4-001 — Addendum d'arbitrage après audit Qwen

## 0. Statut

| Champ | Valeur |
|---|---|
| Programme | Core Foundation |
| Épic | CF4 — Stabilisation de la Validation |
| Type | ARBITRAGE CSA — ADDENDUM |
| Baseline | `a4b2aec2638c705490a5ecf62299bbd94bd24965` |
| Branche | `docs/cf4-arbitration` |
| Source de revue | Audit lecture seule MB-CF4-001 |
| Statut | PRÊT POUR ARBITRAGE CSA |

Ce document répond uniquement aux réserves formulées par l'audit Qwen. Il ne constitue pas encore un ticket d'implémentation et ne modifie aucun fichier de production.

## 1. Correction factuelle — ADR-010

L'audit Qwen a correctement signalé une ambiguïté de localisation.

La formulation « ADR-010 absent » est retirée.

La formulation normative retenue est :

> **ADR-010 existe dans `docs/governance/ADR/ADR-010-validation-engine-architecture.md`. Sa présence dans `docs/governance/ADR/` doit être considérée comme l'artefact de référence tant qu'une décision documentaire ultérieure n'en décide autrement. L'absence d'un doublon dans `docs/adr/` n'est pas une absence de l'ADR.**

CF4 ne déplace ni ne duplique ADR-010 dans le cadre de ce ticket.

## 2. Contraintes héritées obligatoires

Les invariants suivants deviennent des contraintes explicites à vérifier lors de la rédaction du ticket d'implémentation :

### CF1

- Validation ne devient pas une source de vérité du Document.
- Validation ne devient pas un store persistant.

### CF2

- Validation ne devient pas un moteur de calcul.
- Simulation reste propriétaire du calcul.
- Validation reste propriétaire de la validation.

### CF3

- Validation n'introduit aucun canal de mutation parallèle.
- Validation ne contourne pas `CommandBus → Handler → Document → HistoryService`.
- Validation ne traite pas les états UI/transitoires comme des mutations persistantes.
- Validation ne déplace aucune responsabilité vers Registry, Simulation ou Presentation.

Ces contraintes ne constituent pas de nouvelles décisions : elles rendent explicites les frontières déjà établies par CF1, CF2 et CF3.

## 3. Clarification de la frontière CF3 / CF4

CF3 est propriétaire du **canal de mutation**.

CF4 est propriétaire du **contrat de validation appliqué à ce canal**.

Le schéma cible proposé reste :

```text
Command candidate
      │
      ▼
CommandBus
      │
      ▼
ValidationEngine
      │
      ▼
ValidationReport
      │
      ├── politique de blocage ──► refus
      │
      └── autorisé
              │
              ▼
           Handler
              │
              ▼
      HistoryService / Document
```

Ce schéma est une proposition soumise à arbitrage, pas encore une architecture activée.

## 4. Point d'arbitrage supplémentaire — historisation

**Question :** les résultats de validation doivent-ils être historisés avec les mutations ?

**Proposition CSA : NON par défaut.**

Raison : le `ValidationReport` décrit le résultat d'une validation ; il ne constitue pas en lui-même un état métier persistant du Document. L'historisation relève de `HistoryService` et des changements de Document, pas du stockage des rapports de validation.

Si un besoin futur exige la reproductibilité temporelle d'un rapport, cela devra faire l'objet d'une décision et d'un ticket distincts.

## 5. Politique de premier consommateur

Pour éviter une migration massive, le contrat d'implémentation pourra être limité au chemin déjà activé par CF3 :

`addComponent`.

Les autres mutations restent hors périmètre tant qu'elles ne possèdent pas le canal Core contractualisé requis.

Cette limitation permet de tester le contrat Validation ↔ CommandBus sur un chemin réel sans transformer CF4 en migration générale.

## 6. Conditions de passage au ticket d'implémentation

Le ticket MB-CF4-001 ne doit être rédigé comme ticket d'implémentation qu'après décision explicite du CSA sur :

1. validation pré-dispatch ou autre stratégie ;
2. niveau bloquant (`ERROR` recommandé, sans changement implicite de `ValidationReport.isValid()`) ;
3. autorité appliquant la politique de blocage ;
4. utilisation de `validate(document, command)` pour la validation candidate ;
5. statut de référence d'ADR-010 ;
6. périmètre initial limité ou non à `addComponent` ;
7. absence d'historisation des `ValidationReport` par défaut.

## 7. Verdict après audit

**🟢 DOSSIER CORRIGÉ — PRÊT POUR ARBITRAGE CSA.**

Aucune modification de production n'est autorisée par le présent addendum.
