# Feuille de route — Programme MB-SIM

**Statut :** 🟢 VALIDÉ — réconcilié avec `main` jusqu'à MB-SIM-015
**Validé par :** Chief Software Architect
**Fondement :** MB-SIM-002 (audit) et MB-SIM-003 (décision d'architecture, V1)
**Dernière réconciliation :** 2026-08-22

---

## Tableau de suivi

*Réconcilié avec l'état du dépôt jusqu'à MB-SIM-015.*

| Ticket | Statut documentaire | Référence |
|---|---|---|
| MB-SIM-002 | Audit réalisé (hors dépôt) | historique pré-gouvernance |
| MB-SIM-003 | Décision architecturale V1 (hors dépôt) | historique pré-gouvernance |
| MB-SIM-004 | ✅ Intégré | `a0f1f23` |
| MB-SIM-005 | ✅ Intégré | `fb40a8a` |
| MB-SIM-006 | ✅ Intégré | `d70b738` |
| MB-SIM-007 | ✅ Intégré | `e0a4ef4` |
| MB-SIM-008 | 🟡 Intégré partiellement (7/8 — SERVO explicitement exclu) | `8516ec2` |
| MB-SIM-009 | ✅ Intégré | `e0f387b` |
| MB-SIM-010 | ✅ Intégré (v2) | `739d201` |
| MB-SIM-011 | ✅ Intégré | `96484ae` |
| MB-SIM-012 | ✅ Intégré | `b74b036` |
| MB-SIM-013 | ✅ Intégré — architecture PWM | `2b18227` |
| MB-SIM-014A | ✅ Intégré — configuration fréquence PWM | `ecb4263` |
| MB-SIM-014 | ✅ Intégré — implémentation runtime PWM | `ac437ec` |
| MB-SIM-015 | ✅ Intégré — réseau DC passif | `8f09042` |

**Note historique :** MB-SIM-002 et MB-SIM-003 ne disposent pas d'un Ticket PMO versionné dans le dépôt. Ils restent des antécédents documentaires de pré-gouvernance et ne doivent pas être recréés artificiellement.

**Note MB-SIM-008 :** SERVO reste explicitement exclu de cette version en raison de sa dépendance PWM/Scheduler. Cette exclusion demeure une contrainte historique à traiter dans un futur travail si elle devient nécessaire à un scénario Level 1.

MB-SIM-009 a introduit l'infrastructure Clock/Scheduler de temps simulé.
MB-SIM-010 v2 a établi la frontière d'intégration Scheduler / Runtime / Simulation.
MB-SIM-011 a établi l'intégration réelle via `simulationRuntimeIntegration.js`, avec le flux Scheduler → ArduinoSimulator → SignalMap → fusion → résultat Simulation.
MB-SIM-012 a étendu cette intégration en permettant à `externalSignals` d'être consommé par la résolution sans couplage direct de `resolution.js` au Runtime.
MB-SIM-013/014A/014 ont ensuite établi l'architecture, la configuration et l'exécution du PWM.
MB-SIM-015 a étendu la résolution au réseau DC passif.

La correspondance détaillée entre les tickets MB-SIM et les Épics SIM1, SIM2 et SIM3 reste traçable par la séquence ci-dessous.

---

## Nature de ce document

Ce document n'est pas un Ticket au sens de SPEC-PMO-002, ni un Execution Blueprint au sens de SPEC-PMO-003, ni un Delivery Report au sens de SPEC-PMO-004. C'est une **note de séquencement et de réconciliation de programme** : elle ordonne les tickets MB-SIM et maintient leur état par rapport au dépôt, sans se substituer aux Tickets individuels requis lors d'une nouvelle exécution.

Elle découle directement de la décision d'architecture MB-SIM-003 (V1, validée). Le chantier History (coexistence de `history/HistoryManager.js` et `core/history/HistoryService.js`) reste hors du programme MB-SIM car il concerne le Core ; il fera l'objet d'un programme distinct lorsqu'un besoin produit ou architectural le justifiera.

---

## Séquence réconciliée

```text
MB-SIM-002
Audit — historique pré-gouvernance

  ↓
MB-SIM-003
Décision d'architecture — historique pré-gouvernance

  ↓
MB-SIM-004 → MB-SIM-007
Migration / Registry / modules / premier solveur DC

  ↓
MB-SIM-008
Composants analogiques — 7/8, SERVO exclu

  ↓
MB-SIM-009
Scheduler / temps simulé

  ↓
MB-SIM-010 → MB-SIM-012
Arduino / Runtime / externalSignals

  ↓
MB-SIM-013
Architecture PWM

  ↓
MB-SIM-014A
Configuration fréquence PWM

  ↓
MB-SIM-014
Implémentation runtime PWM

  ↓
MB-SIM-015
Réseau DC passif
```

Cette séquence décrit l'historique intégré. Elle ne désigne pas automatiquement le prochain ticket fonctionnel : la Phase 2 choisit désormais le prochain travail selon le gap produit Level 1, les dépendances et les preuves attendues.

---

## Portée historique des étapes

- **MB-SIM-004 — Migration du moteur.** Document Core → Préparation → Résolution → Production.
- **MB-SIM-005 — Migration ComponentRegistry.** Convergence vers le registre canonique.
- **MB-SIM-006 — Extraction des modules.** Séparation Préparation / Résolution / Production.
- **MB-SIM-007 — Premier solveur DC.** Calcul électrique réel minimal.
- **MB-SIM-008 — Composants analogiques.** Extension du solveur DC et modèles analogiques ; SERVO exclu.
- **MB-SIM-009 — Scheduler.** Temps simulé déterministe.
- **MB-SIM-010 — Arduino.** Frontière Scheduler / Runtime / Simulation.
- **MB-SIM-011 — Intégration Simulation / Runtime.** Propagation des signaux Runtime vers Simulation.
- **MB-SIM-012 — externalSignals.** Injection structurelle des signaux Runtime dans la résolution.
- **MB-SIM-013 — PWM architecture.** Définition du modèle architectural du signal PWM.
- **MB-SIM-014A — PWM configuration.** Paramétrage de la fréquence PWM.
- **MB-SIM-014 — PWM runtime.** Production/évaluation du comportement PWM dans le temps simulé.
- **MB-SIM-015 — réseau DC passif.** Résolution de réseau DC passif multi-éléments.

Ces éléments sont des références historiques ; aucun d'eux ne constitue une autorisation automatique de modifier le moteur aujourd'hui.

---

## Programme MB-SIM après la réconciliation

Le programme ne doit plus continuer par simple incrémentation `MB-SIM-016`.

Le prochain travail Simulation doit être créé seulement s'il ferme un gap Level 1 ou une dépendance explicitement identifiée par la Phase 2.

À ce stade, les capacités d'observation et de mesure sont prioritaires dans la trajectoire Level 1 parce que le moteur possède déjà des résultats de simulation mais que leur restitution utilisateur n'est pas encore certifiée de bout en bout.

---

## Rappel de gouvernance

Chaque nouvelle étape d'exécution doit être formalisée par son propre Ticket PMO, puis par son Execution Blueprint et son Delivery Report conformément aux standards PMO applicables.

La présente feuille de route doit être mise à jour après chaque intégration significative afin que l'état documentaire ne puisse plus rester plusieurs tickets derrière `main`.
