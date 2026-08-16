# MB-CF4-001 — GATE 2 Arbitration Addendum

## Statut

- Baseline : `a4b2aec2638c705490a5ecf62299bbd94bd24965`
- Branche : `docs/cf4-gate2`
- Parent documentaire : `MB-CF4-001-validation-contract-arbitration.md`
- Objet : résolution factuelle de Q4/Q5

## Q4 — Transport du ValidationReport

Inspection directe de `CommandBus.js` montre que `dispatch()` retourne actuellement :

```js
{
  success: true,
  commandId,
  commandType,
  result,
}
```

ADR-010 exige explicitement que les warnings/infos soient attachés au résultat de la commande. `ValidationReport` expose déjà `toJSON()`, `getStatus()`, `hasErrors()` et les collections ERROR/WARNING/INFO.

**Arbitrage :** le rapport de validation devient un champ explicite `validationReport` du résultat de `CommandBus.dispatch()`. Ce n'est pas une API inventée : c'est la matérialisation directe de l'exigence normative d'ADR-010 dans la structure de résultat existante.

Le rapport lui-même reste un objet `ValidationReport`; sa sérialisation reste disponible via `toJSON()`.

## Q5 — Règles réellement disponibles

Inspection directe du répertoire `frontend/src/core/validation/` : le dépôt contient `ValidationEngine`, `ValidationRegistry`, `ValidationReport`, `ValidationProblem`, les constantes et les tests, mais **aucun module de règles métier de production n'est enregistré dans le Registry** sur `main`.

Les tests utilisent des règles de fixture (`alwaysErrorRule`, `alwaysWarningRule`, `alwaysInfoRule`) pour démontrer le comportement du moteur.

**Arbitrage :** CF4 ne doit pas prétendre que la validation métier est déjà active. La stabilisation du canal et la démonstration ERROR/WARNING/INFO seront séparées :

1. le CommandBus intégrera réellement le ValidationEngine ;
2. le premier consommateur restera `addComponent` ;
3. les tests contractuels injecteront des règles contrôlées afin de démontrer les trois niveaux sans inventer un nouveau catalogue de composants ;
4. aucune duplication du ComponentRegistry canonique CF2 ne sera créée dans Validation.

La création d'un catalogue complet de règles métier est hors périmètre de cette stabilisation et devra faire l'objet d'un contrat/ticket dédié si nécessaire.

## GATE 2

**PASS CONDITIONNELLE — contrat d'intégration résolu.**

Le flux retenu est :

```text
Command
  ↓
CommandBus
  ↓
ValidationEngine.validate(document, command)
  ↓
ValidationReport
  ├─ ERROR → rejet
  └─ WARNING/INFO/OK → Handler
                         ↓
                   HistoryService
                         ↓
                     Document
```

Aucune modification de `AddComponentHandler`, `HistoryService`, ComponentRegistry ou Simulation n'est requise par ce contrat.

## STOP maintenus

- aucune invention d'un second moteur de validation ;
- aucune duplication du Registry CF2 ;
- aucun déplacement de responsabilité vers React/Simulation ;
- aucun affaiblissement de test ;
- aucune migration au-delà de `addComponent` ;
- aucune historisation du `ValidationReport`.

## Prochaine étape

GATE 3 peut commencer sur une branche d'implémentation dédiée, avec modification minimale de `CommandBus` et tests contractuels ciblés avant toute intégration dans `main`.
