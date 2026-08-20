# MB-VIS-004 — Visualisation réactive des fils

## A. IDENTITÉ

| Champ | Valeur |
|---|---|
| **Ticket-ID** | `MB-VIS-004` |
| **Titre** | Visualisation réactive des fils |
| **Pilier** | Expérience utilisateur |
| **Programme** | Experience |
| **Épic** | EXP2 — Visualisation des fils |
| **Type** | FEATURE |
| **Importance** | HIGH |
| **Urgence** | THIS_RELEASE |

## B. MISSION

### Problème à résoudre
Les fils du circuit restent visuellement statiques et ne communiquent pas clairement leur état électrique ou leur état d'interaction. Cette restitution est insuffisante pour le premier seuil de référence Tinkercad.

### Contexte stratégique
Le ticket constitue la première étape d'EXP2 dans la trajectoire « atteindre Tinkercad → dépasser Tinkercad → laboratoire virtuel avancé ».

### Bénéfice attendu
Rendre les connexions immédiatement lisibles et réactives tout en conservant intacte la séparation entre topologie, simulation et présentation.

## C. CONTRAT D'EXÉCUTION

### Périmètre inclus
Améliorer la restitution des fils afin qu'ils présentent de manière cohérente leurs états visuels normaux, sélectionnés, survolés et réactifs aux états logiques disponibles, avec un comportement lisible pendant les interactions de connexion déjà supportées.

### Périmètre exclu
Aucune modification du contrat topologique du Wire, aucun stockage de géométrie dans le modèle, aucune tension ou intensité réelle non disponible par le contrat de simulation actuel, aucun routage utilisateur persistant, aucune physique de fil, aucun routage 3D, aucun pathfinding, aucune animation avancée de flux.

### Niveau de liberté
**CONCEPTION**

### Performances attendues
La restitution doit rester fluide pendant la manipulation normale du circuit et conserver une lisibilité stable aux niveaux de zoom pris en charge par l'application.

### Livrables attendus
- `CODE`
- `TESTS`
- `DOCUMENTATION`

## D. CONTRAT DE VALIDATION

### Critères d'acceptation
- Un fil normal possède une représentation visuelle clairement identifiable.
- Un fil sélectionné est visuellement distinguable.
- Un fil survolé ou engagé dans une interaction possède un feedback cohérent.
- Les états logiques disponibles sont représentés de manière déterministe et cohérente.
- La création, sélection et suppression existantes des fils ne sont pas régressées.
- Le contrat topologique du Wire reste inchangé.
- Aucun état visuel n'est persisté dans le modèle logique du circuit.
- Aucun comportement dépendant d'une tension ou d'un courant réel non fourni par le contrat actuel n'est ajouté.

### Tests obligatoires
- Validation des états visuels normal, sélectionné, survolé et interactif.
- Validation du mapping des états logiques HIGH, LOW, UNKNOWN et FLOATING lorsqu'ils sont disponibles.
- Validation des interactions existantes de sélection, création et suppression.
- Validation de l'absence de régression du contrat logique des wires.

### Conditions de refus
- Modification du schéma logique du Wire pour satisfaire une exigence visuelle.
- Introduction de coordonnées ou de waypoints persistants dans MB-VIS-004.
- Dépendance à une tension ou un courant réel non exposé par le contrat de simulation actuel.
- Introduction d'une capacité 3D ou de physique du fil.
- Régression des opérations existantes sur les wires.

### Preuves de validation
- Rapports de tests.
- Démonstration visuelle.
- Rapport d'audit et de validation PMO.

## E. CONTEXTE STRATÉGIQUE

### Justification de priorité
EXP2 est le prochain chantier Experience nécessaire pour rapprocher MYBlab du seuil Tinkercad, après les fondations visuelles déjà établies.

### Tickets bloquants
- `EXP1` — prérequis stratégique déjà satisfait selon la roadmap.

### Tickets bloqués
- `MB-VIS-005` — routage utilisateur des fils, qui devra faire l'objet d'une décision architecturale dédiée avant engagement.

### Jalon / Version
MYBlab v0.3 — Niveau 1, seuil Tinkercad.

## F. GESTION PMO

| Champ | Valeur |
|---|---|
| **Date de création** | 2026-08-20 |
| **Cycle PMO** | VALIDÉ |

## G. HISTORIQUE DES DÉCISIONS

| Date | Auteur | Décision | Justification |
|---|---|---|---|
| 2026-08-20 | Chief Software Architect | EXP2 est scindé en deux tickets de nature différente | La réactivité visuelle relève de Presentation ; le routage persistant peut modifier le contrat Core et nécessite une décision distincte. |
| 2026-08-20 | Project Lead | Validation de l'arbitrage CSA | Autorisation explicite de poursuivre selon le découpage EXP2-A / EXP2-B. |

## H. RÉFÉRENCES DE GOUVERNANCE

- `docs/roadmaps/ROADMAP_PLATFORM.md` — EXP2
- `docs/roadmaps/amendments/2026-08-20-EXP2-arbitrage.md`
- ADR-002 — séparation UI / Modèle / Simulation
- ADR-008 — modèle Pins / Wires / Nodes
- ADR-014 — source de vérité des pins
- Audits EXP2 — Qwen et Claude, 2026-08-20

## I. FRONTIÈRE AVEC MB-VIS-005

MB-VIS-004 ne décide pas comment seront persistés ou manipulés d'éventuels points intermédiaires de routage. Toute évolution de ce type appartient à MB-VIS-005 et sera soumise à une décision architecturale dédiée, notamment en raison de la référence documentaire caduque actuellement signalée entre ADR-008 et ADR-003.
