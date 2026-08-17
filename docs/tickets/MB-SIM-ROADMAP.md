# Feuille de route — Programme MB-SIM

**Statut :** 🟢 VALIDÉ
**Validé par :** Chief Software Architect
**Fondement :** MB-SIM-002 (audit) et MB-SIM-003 (décision d'architecture, V1)

---

## Tableau de suivi

*Réconcilié avec l'état du dépôt jusqu'à MB-SIM-012.*

| Ticket | Statut documentaire | Référence |
|---|---|---|
| MB-SIM-002 | Audit réalisé (hors dépôt) | conversation |
| MB-SIM-003 | Décision architecturale (hors dépôt) | conversation |
| MB-SIM-004 | ✅ Intégré | `a0f1f23` |
| MB-SIM-005 | ✅ Intégré | `fb40a8a` |
| MB-SIM-006 | ✅ Intégré | `d70b738` |
| MB-SIM-007 | ✅ Intégré | `e0a4ef4` |
| MB-SIM-008 | 🟡 Intégré partiellement (7/8 — SERVO explicitement exclu) | `8516ec2` |
| MB-SIM-009 | ✅ Intégré | `e0f387b` |
| MB-SIM-010 | ✅ Intégré (v2) | `739d201` |
| MB-SIM-011 | ✅ Intégré | `96484ae` |
| MB-SIM-012 | ✅ Intégré | `b74b036` |

**Note :** Les tickets MB-SIM-002 et MB-SIM-003 ne disposent pas encore
d'un document officiel dans le dépôt. Leur contenu provient des travaux
préparatoires réalisés avant la mise en place de la gouvernance
documentaire actuelle.

**Note de réconciliation :** MB-SIM-008 v2 a intégré les contributions DC
génériques pour CAPACITOR, POTENTIOMETER, DIODE, NPN_TRANSISTOR et DC_MOTOR,
et a migré les contributions RESISTOR, LDR et THERMISTOR vers le registre
générique. SERVO a été explicitement exclu de ce ticket en raison de sa
dépendance à PWM/Scheduler. Le commit `8516ec2` confirme cette portée et
rapporte 354/354 tests verts.

MB-SIM-009 a introduit l'infrastructure Clock/Scheduler de temps simulé.
MB-SIM-010 v2 a établi la frontière d'intégration Scheduler / Runtime / Simulation.
MB-SIM-011 a établi l'intégration réelle via `simulationRuntimeIntegration.js`,
avec le flux Scheduler → ArduinoSimulator → SignalMap → fusion → résultat
Simulation. MB-SIM-012 a étendu cette intégration en permettant à
`externalSignals` d'être consommé par la résolution sans couplage direct de
`resolution.js` au Runtime.

La correspondance détaillée entre les tickets MB-SIM et les Épics SIM1,
SIM2 et SIM3 est désormais explicitement traçable par la séquence ci-dessous.

---

## Nature de ce document

Ce document n'est pas un Ticket au sens de SPEC-PMO-002 (il ne porte pas
d'engagement d'exécution unique et mesurable), ni un Execution Blueprint au
sens de SPEC-PMO-003, ni un Delivery Report au sens de SPEC-PMO-004. C'est
une **note de séquencement de programme** : elle ordonne les tickets MB-SIM
à venir et fixe leur périmètre relatif, sans se substituer aux Tickets
individuels qui seront rédigés pour chacun d'eux le moment venu.

Elle découle directement de la décision d'architecture MB-SIM-003 (V1,
validée) et de la réserve posée lors de sa validation : le chantier History
(coexistence de `history/HistoryManager.js` et
`core/history/HistoryService.js`) est retiré du programme MB-SIM, car il
concerne le Core et non le moteur de simulation. Il fera l'objet d'un
programme distinct (`MB-CORE-HIST-001` ou équivalent), non détaillé ici.

---

## Séquence

```text
MB-SIM-002
Audit
✅ Terminé

  ↓

MB-SIM-003
Décision d'architecture
✅ Validé (V1)

  ↓

MB-SIM-004
Migration du moteur
(Document → Préparation → Résolution → Production)

  ↓

MB-SIM-005
Migration ComponentRegistry

  ↓

MB-SIM-006
Extraction des modules

  ↓

MB-SIM-007
Premier solveur DC

  ↓

MB-SIM-008
Composants analogiques
🟡 7/8 — SERVO explicitement exclu

  ↓

MB-SIM-009
Scheduler / temps simulé
✅ Intégré

  ↓

MB-SIM-010
Arduino / frontière Scheduler ↔ Runtime ↔ Simulation
✅ Intégré (v2)

  ↓

MB-SIM-011
Intégration Simulation ↔ Runtime
✅ Intégré

  ↓

MB-SIM-012
Injection des signaux Runtime dans la résolution
✅ Intégré
```

Le chantier History est explicitement hors de cette branche. Son
positionnement dans le programme Core (`MB-CORE-HIST-001` ou `MB-CORE-005`)
reste à confirmer au moment de sa mise en Ticket ; ce choix n'a aucune
incidence sur la séquence ci-dessus, conformément à MB-SIM-003 section 5
(le Bridge/CommandBus et le moteur de simulation restent deux branches
parallèles consommant le même Document, sans dépendance directe de l'une
envers l'implémentation d'historique de l'autre).

---

## Portée de chaque étape (indicative, non contractuelle)

Cette section donne le périmètre relatif de chaque ticket tel qu'anticipé
à ce stade, pour orienter leur rédaction future. Elle ne constitue pas un
engagement — chaque ticket sera rédigé et arbitré individuellement le
moment venu, conformément à SPEC-PMO-002.

- **MB-SIM-004 — Migration du moteur.** Faire consommer à `runSimulation()`
  le Document Circuit (forme Core, via `ReactDocumentMapper.toCore()`)
  plutôt que la forme React locale actuelle (`safeComponents`/`safeWires`
  dans `useCircuitState.js`). Correspond aux étapes 1 et 2 de la stratégie
  de migration de MB-SIM-003.
- **MB-SIM-005 — Migration ComponentRegistry.** Faire converger
  `PowerModel.js`/`ResistorModel.js` (et tout modèle futur) vers
  `simulator/core/ComponentRegistry.ts`, retrait progressif de
  `simulator/registry.js`. Correspond à l'étape 3 de MB-SIM-003.
- **MB-SIM-006 — Extraction des modules.** Séparer physiquement, à
  l'intérieur du moteur, les trois responsabilités Préparation /
  Résolution / Production (ADR-004), sans changement de comportement
  observable. Correspond à l'étape finale de la stratégie de migration de
  MB-SIM-003.
- **MB-SIM-007 — Premier solveur DC.** Première implémentation d'un calcul
  électrique réel (tension/courant, loi d'Ohm) pour au moins la résistance
  et l'alimentation, dans le module Résolution issu de MB-SIM-006.
- **MB-SIM-008 — Composants analogiques.** Extension du solveur DC et des
  modèles de simulation aux composants traités par MB-SIM-008 v2 :
  RESISTOR, LDR, THERMISTOR, DC_MOTOR, DIODE, CAPACITOR, POTENTIOMETER et
  NPN_TRANSISTOR. SERVO est explicitement exclu de cette version en raison
  de sa dépendance PWM/Scheduler.
- **MB-SIM-009 — Scheduler.** Introduction d'une notion de temps simulé
  déterministe (horloge, pas de temps), prérequis pour PWM, capteurs
  temporels, et toute analyse dynamique/transitoire au sens architectural.
- **MB-SIM-010 — Arduino.** Raccordement du runtime Arduino au Scheduler
  et établissement de la frontière d'intégration avec Simulation (v2).
- **MB-SIM-011 — Intégration Simulation / Runtime.** Établissement du
  point d'intégration `simulationRuntimeIntegration.js` entre le moteur de
  simulation et `runtimeOrchestrator.js`, avec propagation des signaux
  Runtime vers le résultat de Simulation sans dépendance cyclique.
- **MB-SIM-012 — Injection des signaux Runtime.** Extension de la résolution
  pour consommer `externalSignals` comme donnée structurelle, permettant la
  propagation des signaux Runtime dans les nets sans importer le Runtime
  depuis `resolution.js`.

---

## Rappel de gouvernance

Conformément à SPEC-PMO-002, chaque étape de cette feuille de route devra
être formalisée par son propre Ticket au moment de sa mise en exécution,
indépendamment de l'état du dépôt à ce moment-là. Ce document fixe l'ordre
et le périmètre relatif ; il ne dispense pas de la rédaction de chaque
Ticket, ni de l'Execution Blueprint correspondant (SPEC-PMO-003) au moment
de son exécution.
