# MYBlab v0.3 — PHASE 2 — ROADMAP D'EXÉCUTION VERS LE NIVEAU 1

**Statut :** PLANIFICATION CSA — aucun ticket d'implémentation autorisé par ce document seul
**Date :** 2026-08-22
**Référence stratégique :** `ROADMAP_PLATFORM.md` §1.1 — Atteindre Tinkercad → Dépasser Tinkercad → laboratoire virtuel avancé
**Base factuelle :** Audit Phase 1 « Où sommes-nous ? » + `LEVEL_1_DEEP_AUDIT.md`

---

## 1. Décision stratégique

MYBlab ne doit pas chercher à « terminer les tickets restants » dans l'ordre documentaire existant.

L'objectif de la Phase 2 est de transformer l'état technique actuel en **chemin de construction mesurable vers le Niveau 1**.

Le Niveau 1 n'est pas défini par le nombre de composants, de tests ou de programmes terminés. Il est atteint lorsque les scénarios essentiels d'un environnement de conception et de simulation électronique peuvent être réalisés de manière cohérente, observable et suffisamment robuste.

La trajectoire reste :

```text
ÉTAT ACTUEL
fondations Core + simulation avancée + expérience partielle
        ↓
PHASE 2
fermer les dépendances et construire les capacités produit essentielles
        ↓
NIVEAU 1
expérience crédible de conception + câblage + simulation + observation
        ↓
NIVEAU 2
avantages propres à MYBlab
        ↓
NIVEAU 3
laboratoire virtuel avancé / spatial / 3D lorsque justifié
```

**Règle : la 3D n'est pas une condition du Niveau 1.** Elle doit être préparée architecturalement sans détourner les ressources de la fermeture du Niveau 1.

---

## 2. Où nous allons — cible produit

Les capacités Level 1 sont regroupées en huit blocs de construction :

| Bloc | Résultat attendu | Importance |
|---|---|---|
| L1-A Workspace | environnement stable de conception | indispensable |
| L1-B Components & wiring | placement, manipulation, connexions et feedback cohérents | indispensable |
| L1-C Simulation | circuits représentatifs exécutables | indispensable |
| L1-D Observation | états de simulation visibles et compréhensibles | indispensable |
| L1-E Measurement | interrogation crédible de tension/courant | indispensable |
| L1-F Temporal observation | observation des signaux variables dans le temps | indispensable pour dynamique |
| L1-G Physical assembly | premier workflow breadboard/workbench crédible | indispensable pour benchmark produit |
| L1-H Embedded workflow | circuit → programme → comportement observable | indispensable pour la trajectoire électronique complète |

Save/reopen, récupération d'erreurs, performance et cohérence UX constituent des **portes transversales** et non des fonctionnalités optionnelles.

---

## 3. Règle fondamentale de séquencement

Chaque candidat doit être évalué dans cet ordre :

```text
GAP PRODUIT
   ↓
SCÉNARIO UTILISATEUR
   ↓
CAPACITÉ TECHNIQUE EXISTANTE
   ↓
DÉPENDANCES ARCHITECTURALES
   ↓
DÉCISION DE GOUVERNANCE
   ↓
TICKET PMO
   ↓
IMPLEMENTATION
   ↓
PREUVE END-TO-END
```

Un ticket ne sera pas considéré comme « prochain » uniquement parce qu'il est le premier ticket numériquement disponible.

---

## 4. Ce que nous possédons déjà et que nous devons exploiter

### 4.1 Core / Mutation

CF3 a maintenant établi quatre mutations canoniques : `ADD_COMPONENT`, `ADD_WIRE`, `UPDATE_WIRE_WAYPOINTS` et `MOVE_COMPONENT`.

La conséquence stratégique est importante : **les nouveaux workflows doivent consommer ce canal au lieu de recréer des mutations UI parallèles**.

### 4.2 Simulation

Le dépôt contient déjà une base substantielle : architecture Préparation → Résolution → Production, temps simulé/Scheduler, intégration Runtime → Simulation et modèle PWM. Le module `pwmSignal.js` confirme notamment que le PWM est encore une capacité contractuelle à raccorder au workflow utilisateur, et non une preuve suffisante d'une expérience dynamique complète.

### 4.3 Experience

Les travaux VIS-004/VIS-005 ont établi une séparation importante entre aperçu de présentation et état persistant. Cette séparation doit être conservée pour les futurs instruments et interfaces d'observation.

---

## 5. Gaps critiques réellement structurants

### GAP-01 — Observation

Le moteur peut calculer des états/signes, mais la présence d'un résultat interne ne constitue pas une capacité d'observation utilisateur.

**Objectif :** définir une représentation utilisateur fiable des résultats de simulation sans contaminer le Core avec des responsabilités Presentation.

### GAP-02 — Measurement

Aucune preuve de workflow utilisateur complet de mesure tension/courant n'est établie dans l'audit Phase 1.

**Objectif :** établir le contrat architectural minimal permettant à un instrument de lire une grandeur électrique qualifiée issue de la simulation.

### GAP-03 — Temporal observation

Le PWM et le temps simulé existent techniquement, mais aucune preuve de workflow oscilloscope/forme d'onde utilisateur n'est établie.

**Objectif :** permettre à l'utilisateur d'observer une grandeur au cours du temps, sans introduire une horloge réelle dans le moteur déterministe.

### GAP-04 — Breadboard

Aucune preuve de workflow breadboard crédible n'a été trouvée pendant l'audit Phase 1.

**Objectif :** définir le modèle physique/logique d'assemblage avant de construire une simple imitation visuelle.

### GAP-05 — Embedded end-to-end

Le runtime et l'intégration Simulation existent partiellement, mais l'audit ne certifie pas encore le scénario complet circuit → programme → comportement observable.

**Objectif :** établir le scénario représentatif avant de multiplier les composants embarqués.

### GAP-06 — Project lifecycle / recovery

Save/reopen et récupération après erreur doivent être validés comme workflows et non comme fonctions isolées.

---

## 6. Ordre stratégique proposé

### Vague P2-0 — Réconciliation de pilotage

Avant toute nouvelle génération importante de tickets :

1. réconcilier `ROADMAP_PLATFORM.md` avec les intégrations VIS-004/VIS-005 et CF3-003 ;
2. réconcilier `MB-SIM-ROADMAP.md` jusqu'à SIM-015 ;
3. enregistrer explicitement les travaux historiques sans recréer artificiellement leurs tickets ;
4. établir les Delivery Reports manquants nécessaires à la chaîne de traçabilité ;
5. résoudre les ambiguïtés documentaires qui peuvent modifier une décision d'architecture.

Cette vague est **documentaire et gouvernance**, pas une nouvelle fonctionnalité.

### Vague P2-1 — Contrat d'observation et de mesure

**Premier chantier fonctionnel proposé :** architecture d'un mécanisme d'observation/measurement capable de consommer des résultats qualifiés de Simulation.

Pourquoi en premier :

- il transforme la puissance actuelle du moteur en capacité utilisateur ;
- il sert à la fois les scénarios statiques et dynamiques ;
- il fournit une frontière réutilisable par multimètre, oscilloscope et futurs instruments ;
- il évite de construire séparément plusieurs systèmes de lecture des résultats ;
- il prépare le Level 3 sans exiger la 3D.

**Attention :** cela ne signifie pas « coder immédiatement un multimètre ». Le premier ticket doit établir le **contrat architectural minimal d'observation**, puis un instrument de référence pourra l'utiliser.

### Vague P2-2 — Instrument de référence

Après stabilisation du contrat P2-1 :

- premier instrument de mesure de tension/courant ;
- scénarios de mesure reproductibles ;
- validation Presentation ↔ Simulation ;
- preuves end-to-end.

### Vague P2-3 — Observation temporelle

Étendre le même mécanisme aux valeurs temporelles :

- échantillonnage déterministe ;
- fenêtre temporelle ;
- représentation de waveform ;
- scénario PWM représentatif.

Le système ne doit pas créer une seconde horloge : le temps reste fourni par le Scheduler/SimulatedClock.

### Vague P2-4 — Breadboard / physical assembly

Seulement après définition des contrats nécessaires :

- modèle d'assemblage ;
- connectivité breadboard ;
- représentation Presentation ;
- compatibilité avec Document et Simulation ;
- migration progressive du canvas libre vers un workflow de montage crédible.

### Vague P2-5 — Embedded workflow

Une fois observation et simulation suffisamment visibles :

- scénario Arduino minimal ;
- programme ;
- exécution ;
- effet observable ;
- instrumentation si nécessaire.

### Vague P2-6 — Consolidation Level 1

Passage systématique des scénarios A à J du Deep Audit, avec preuve indépendante pour chaque capacité essentielle.

---

## 7. Premier ticket fonctionnel — définition de niveau roadmap

Le premier ticket fonctionnel de P2 ne doit pas être nommé « Multimètre » ni « Oscilloscope ».

**Nom proposé : `MB-OBS-001 — Contrat canonique d'observation des résultats de simulation`.**

### Mission

Définir et valider le contrat par lequel une capacité d'observation Presentation peut demander une grandeur simulée qualifiée sans accéder directement aux détails internes du solveur.

### Le ticket devra répondre au minimum à

1. Quelle donnée est observable ?
2. À quel niveau (composant, pin, net, branche) ?
3. Quelle unité et quelle convention ?
4. Comment distinguer valeur instantanée et série temporelle ?
5. Quelle source temporelle ?
6. Comment signaler une valeur indisponible ou invalide ?
7. Quelle frontière entre Simulation et Presentation ?
8. Comment garantir la déterminisme ?
9. Comment les instruments futurs consommeront-ils ce contrat sans dupliquer la logique ?
10. Quels tests de contrat rendent le système vérifiable ?

### Hors périmètre

- interface finale d'un multimètre ;
- interface finale d'un oscilloscope ;
- breadboard ;
- 3D ;
- modification arbitraire du solveur ;
- nouvelle horloge ;
- nouvelle commande de mutation sans justification architecturale.

**Statut : PROPOSITION DE TICKET — pas encore autorisé pour implémentation.**

---

## 8. Ticket immédiatement suivant déjà pré-identifié

Pour éviter de reproduire le problème « quel ticket vient après ? », Phase 2 doit conserver une fenêtre de visibilité d'au moins deux tickets.

```text
MB-OBS-001
Contrat canonique d'observation
        ↓
MB-MEASURE-001
Premier instrument de mesure de référence
        ↓
MB-OBS-002
Observation temporelle / waveform
        ↓
MB-VIS/EXP — intégration UX selon arbitrage
        ↓
Breadboard architecture / implementation
        ↓
Embedded end-to-end
        ↓
Level 1 certification scenarios
```

Ces identifiants sont des **candidats de planification**. Ils ne deviennent des Tickets PMO officiels qu'après rédaction et arbitrage conformes au cycle PMO.

---

## 9. Ce que nous ne devons PAS faire maintenant

### Ne pas commencer la 3D

La 3D appartient à la trajectoire Level 3. Elle ne résout pas les gaps fondamentaux du Level 1.

### Ne pas multiplier les renderers isolés

Un nouveau renderer n'est prioritaire que s'il ferme un scénario Level 1 identifié.

### Ne pas enrichir le solveur sans scénario utilisateur

Une amélioration du calcul qui ne devient pas observable dans un workflow produit doit être considérée comme secondaire, sauf nécessité architecturale.

### Ne pas construire le multimètre et l'oscilloscope séparément

Ils doivent partager un contrat d'observation commun.

### Ne pas construire la breadboard comme simple décor

La connectivité physique doit être pensée comme une capacité métier et simulationnelle.

### Ne pas reprendre les anciens tickets par simple numérotation

Les tickets historiques doivent être reliés à la nouvelle trajectoire sans être recréés inutilement.

---

## 10. Portes de décision

Avant chaque vague :

```text
GATE A — Gap confirmé
GATE B — Dépendances identifiées
GATE C — Architecture suffisante
GATE D — Ticket PMO précis
GATE E — Preuve end-to-end
```

Un ticket qui échoue à une porte ne doit pas être remplacé arbitrairement par un autre ticket plus visible ; la cause du blocage doit être enregistrée et le graphe de dépendances mis à jour.

---

## 11. Definition of Level 1

Le Niveau 1 ne sera déclaré atteint qu'après validation des scénarios essentiels :

- circuit LED de base ;
- circuit interactif ;
- circuit dynamique/PWM ;
- montage breadboard ;
- mesure ;
- waveform ;
- workflow embedded ;
- récupération d'erreur ;
- save/reopen ;
- édition multi-objet et undo/redo.

Pour chaque scénario, les trois axes doivent être suffisamment établis :

```text
Technique
Produit
Preuve
```

Le résultat final est une **décision produit**, pas une somme mécanique de tickets.

---

## 12. Traçabilité obligatoire de Phase 2

Chaque ticket nouveau doit être relié ainsi :

```text
Vision
  ↓
Roadmap / Épic
  ↓
Gap Level 1
  ↓
Scénario
  ↓
Dépendances
  ↓
Ruling CSA
  ↓
Ticket PMO
  ↓
Blueprint
  ↓
Implémentation
  ↓
Tests
  ↓
Delivery Report
  ↓
Audit
  ↓
Mise à jour Roadmap
```

La mise à jour de la roadmap après livraison devient une **étape obligatoire**, afin que l'état du dépôt ne puisse plus avancer de plusieurs tickets devant sa feuille de route.

---

## 13. État actuel de Phase 2

| Élément | État |
|---|---|
| Objectif Level 1 | défini |
| Gaps produit | cartographiés |
| Scénarios Level 1 | définis en Phase 1 |
| Dépendances générales | identifiées |
| Ordre stratégique | proposé ici |
| Premier ticket candidat | `MB-OBS-001` |
| Ticket suivant visible | `MB-MEASURE-001` |
| Implémentation | NON AUTORISÉE par ce document |
| 3D | explicitement Level 3 |
| Certification Level 1 | future |

---

## 14. Règle de continuité

Après chaque intégration, le CSA doit pouvoir répondre immédiatement à deux questions :

> **Où sommes-nous ?**
>
> État réel du dépôt + capacités réellement disponibles + preuves.

> **Où allons-nous ?**
>
> Prochain ticket + ticket suivant + raison + dépendances + contribution au Niveau 1.

Aucune nouvelle séquence de développement ne doit commencer si ces deux réponses ne peuvent pas être produites à partir des documents versionnés.

---

## 15. Conclusion

Phase 2 ne cherche pas à remplir une liste de tickets. Elle cherche à convertir les investissements déjà réalisés dans Core, Simulation et Experience en une **expérience électronique cohérente**.

La première priorité fonctionnelle proposée est donc le **contrat d'observation**, parce qu'il constitue la jonction la plus réutilisable entre le moteur de simulation déjà avancé et les capacités de laboratoire encore absentes.

La prochaine décision CSA doit porter sur la validation ou la modification de `MB-OBS-001` avant toute implémentation.
