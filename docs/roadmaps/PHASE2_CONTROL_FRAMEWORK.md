# MYBlab v0.3 — PHASE 2 — CONTROL FRAMEWORK

**Statut :** cadre CSA complémentaire à `PHASE2_LEVEL1_EXECUTION_ROADMAP.md`
**Date :** 2026-08-22
**Objet :** rendre la Phase 2 pilotable, mesurable, traçable et résistante aux dérives de roadmap.
**Règle :** ce document n'autorise aucune implémentation à lui seul.

---

## 1. Pourquoi ce cadre est nécessaire

La roadmap Phase 2 définit la direction vers le Niveau 1. Ce cadre ajoute les mécanismes nécessaires pour éviter :

1. choisir un ticket parce qu'il est disponible plutôt que parce qu'il ferme un gap produit ;
2. considérer une capacité technique comme une capacité produit alors qu'elle n'est pas observable de bout en bout ;
3. avancer plusieurs tickets sans mettre à jour la mémoire du projet ;
4. déclarer un scénario « terminé » alors qu'une dépendance critique reste non démontrée ;
5. perdre la raison des décisions lorsque le projet change d'agent ou de session.

La Phase 2 est donc pilotée par **capacités démontrées**, pas par volume de code.

---

## 2. Unité de pilotage : la capacité produit

Chaque travail candidat doit être rattaché à une capacité observable :

```text
CAPACITÉ
  ↓
SCÉNARIO UTILISATEUR
  ↓
PREUVE ATTENDUE
  ↓
TICKETS NÉCESSAIRES
```

Un ticket qui ne peut pas être relié à un scénario Level 1 ou à une dépendance indispensable est secondaire jusqu'à justification CSA.

---

## 3. Registre des capacités — nouvelle source de vérité opérationnelle

La Phase 2 doit maintenir un registre unique des capacités, distinct de la liste des tickets.

Pour chaque capacité :

```text
ID
NOM
SCÉNARIOS SERVIS
MATURITÉ L0-L4
PREUVES DISPONIBLES
GAP RESTANT
DÉPENDANCES
TICKET ACTUEL
NEXT
NEXT+1
BLOQUEUR
DATE DE DERNIÈRE ÉVALUATION
```

**Règle :** un ticket peut être clôturé sans qu'une capacité soit certifiée ; inversement, une capacité ne peut être déclarée acquise uniquement parce que ses tickets sont clos.

---

## 4. Matrice Scénario × Capacité

Pour chaque scénario Level 1, la roadmap doit pouvoir répondre à :

| Scénario | Workspace | Wiring | Simulation | Observation | Measurement | Temporal | Physical | Embedded | Recovery | Save/Reopen |
|---|---|---|---|---|---|---|---|---|---|---|
| LED de base | — | — | — | — | — | — | — | — | — | — |
| Interaction | — | — | — | — | — | — | — | — | — | — |
| PWM/dynamique | — | — | — | — | — | — | — | — | — | — |
| Measurement | — | — | — | — | — | — | — | — | — | — |
| Waveform | — | — | — | — | — | — | — | — | — | — |
| Breadboard | — | — | — | — | — | — | — | — | — | — |
| Embedded E2E | — | — | — | — | — | — | — | — | — | — |

Les cellules doivent être alimentées par le registre des capacités et non par une appréciation subjective.

---

## 5. Matrice de maturité Level 1

| Niveau | Signification |
|---|---|
| L0 | absent ou non démontré |
| L1 | prototype technique démontré |
| L2 | workflow utilisateur fonctionnel |
| L3 | workflow robuste + tests + intégration |
| L4 | capacité validée dans le scénario Level 1 |

### Règle spéciale de preuve insuffisante

Les états suivants sont distincts :

- **ABSENT** : la capacité n'existe pas ;
- **NON DÉMONTRÉ** : elle peut exister techniquement, mais aucune preuve suffisante n'est disponible ;
- **TECHNIQUE SEULEMENT** : le moteur ou le code possède la capacité, mais pas le workflow utilisateur ;
- **PRODUIT** : le workflow utilisateur fonctionne ;
- **CERTIFIÉ** : le scénario complet satisfait les critères Level 1.

Une absence de métrique automatisée n'autorise pas à transformer une capacité visiblement insuffisante en « atteinte ». L'évaluation doit rester fondée sur les preuves disponibles.

**Certification :** un scénario Level 1 ne peut être déclaré acquis que si ses capacités critiques atteignent au minimum L3 et si le scénario complet est démontré de bout en bout.

---

## 6. Les cinq preuves obligatoires

Pour tout nouveau ticket fonctionnel important :

### P1 — Preuve architecture
Le contrat et les frontières entre sous-systèmes sont explicitement définis.

### P2 — Preuve comportement
Le comportement attendu est démontré par des tests déterministes.

### P3 — Preuve utilisateur
Un scénario réel peut être exécuté depuis l'interface, sans accès interne au moteur.

### P4 — Preuve intégration
Simulation, Document, Presentation et/ou Runtime impliqués dans le scénario communiquent par les contrats officiels.

### P5 — Preuve traçabilité
Ticket → ruling → code → tests → commit → Delivery Report → roadmap mise à jour.

Un ticket peut être techniquement vert tout en restant non clos si P3 ou P5 manque.

---

## 7. Benchmark produit : « atteindre Tinkercad » puis « dépasser Tinkercad »

Le Level 1 doit être évalué par des **scénarios comparables**, pas par le nombre de composants ou de lignes de code.

### Benchmark de référence

À terme, nous devons pouvoir comparer au minimum :

- création d'un circuit ;
- placement et déplacement ;
- câblage et correction du câblage ;
- simulation ;
- observation ;
- mesure ;
- signaux dynamiques ;
- montage physique/breadboard ;
- workflow embedded ;
- sauvegarde/réouverture ;
- récupération après erreur ;
- édition multi-objet et Undo/Redo.

### Règle « atteindre »

MYBlab ne sera pas déclaré au niveau benchmark tant que les scénarios essentiels comparables ne sont pas démontrés de manière suffisamment équivalente pour l'objectif défini.

### Règle « dépasser »

« Dépasser Tinkercad » doit correspondre à des **avantages démontrés**, par exemple :

- observation plus profonde ;
- déterminisme et reproductibilité ;
- instrumentation plus riche ;
- workflows pédagogiques ;
- architecture permettant une évolution vers le laboratoire virtuel spatial/3D.

Une fonctionnalité simplement différente n'est pas automatiquement un avantage.

---

## 8. Score de priorité des candidats

Lorsqu'il existe plusieurs candidats raisonnables :

| Critère | Poids |
|---|---:|
| Ferme un gap Level 1 critique | 30 |
| Débloque plusieurs capacités futures | 20 |
| Réutilise l'architecture existante | 15 |
| Produit une preuve utilisateur claire | 15 |
| Risque technique maîtrisable | 10 |
| Coût / portée raisonnable | 10 |
| **Total** | **100** |

- 80–100 : candidat prioritaire ;
- 65–79 : candidat valable, dépendances à vérifier ;
- 50–64 : candidat secondaire ;
- <50 : pas de prochain ticket sans arbitrage explicite.

Le score rend la décision explicable ; il ne la automatise pas.

---

## 9. Graphe de dépendances

La roadmap doit maintenir un graphe et non une simple liste :

```text
OBSERVATION CONTRACT
        │
        ├──→ MEASUREMENT
        │       │
        │       └──→ DEBUG / VALIDATION UX
        │
        └──→ TEMPORAL OBSERVATION
                │
                └──→ PWM / DYNAMIC CIRCUITS

SIMULATION
        │
        └──→ BREADBOARD CONNECTIVITY
                    │
                    └──→ EMBEDDED END-TO-END
```

Une dépendance bloquée doit afficher explicitement son bloqueur et la décision nécessaire pour le lever.

---

## 10. Fenêtre de planification obligatoire

À tout instant :

- **NOW** : état actuellement en clôture/intégration ;
- **NEXT** : prochain ticket autorisable ;
- **NEXT+1** : suivant, sous réserve des résultats de NEXT ;
- **LATER** : trajectoire ultérieure ;
- **BLOCKED** : éléments bloqués + raison + propriétaire de la décision.

Cette fenêtre est mise à jour après chaque intégration.

---

## 11. GATE du premier ticket fonctionnel

`MB-OBS-001` ne passe en implémentation que si sont documentés :

1. source exacte de la grandeur ;
2. granularité ;
3. unité ;
4. validité/indisponibilité ;
5. instantané vs temporel ;
6. origine du temps simulé ;
7. frontière Simulation/Presentation ;
8. déterminisme ;
9. API future des instruments ;
10. stratégie de test ;
11. impact CF3 ;
12. absence de duplication de mutation ;
13. scénario utilisateur de référence ;
14. critère de succès observable.

**GO seulement si aucun point critique n'est implicite.**

---

## 12. Observation ≠ Measurement

```text
OBSERVATION = obtenir une grandeur simulée qualifiée
MEASUREMENT = présenter cette grandeur comme un instrument avec
              une sémantique de mesure
```

Le contrat commun doit précéder les interfaces de multimètre et d'oscilloscope.

Il doit pouvoir servir également aux sondes, indicateurs, diagnostics et instrumentation pédagogique.

---

## 13. Déterminisme temporel

Toute observation dynamique utilise le temps simulé officiel.

Aucune dépendance de simulation à `Date.now()`, `performance.now()`, `setTimeout()`, `setInterval()` ou horloge système implicite.

Le PWM existant reçoit explicitement son temps d'évaluation ; cette propriété doit être conservée pour les futures waveforms. fileciteturn502file0L2-L2

---

## 14. Breadboard : modèle avant décor

Le breadboard est un **modèle de connectivité et d'assemblage** avec une projection visuelle au-dessus.

Avant implémentation : rails, groupes électriquement connectés, insertion/retrait, règles de connectivité, relation position/connectivité, Document, Simulation, erreurs de montage et instrumentation doivent être définis.

Une simple grille visuelle ne constitue pas la capacité Level 1.

---

## 15. Embedded : critère E2E

Le scénario minimal est :

```text
COMPOSANTS → CÂBLAGE → PROGRAMME → EXÉCUTION
→ CHANGEMENT DE COMPORTEMENT → OBSERVATION / MESURE
```

Ajouter des APIs sans démontrer cette chaîne ne suffit pas.

---

## 16. Save / Reopen et Recovery

Pour chaque capacité importante :

```text
créer → modifier → sauvegarder → rouvrir → simuler → observer
```

Et lorsqu'une erreur est attendue :

```text
erreur → message exploitable → état cohérent → reprise possible
```

Ces portes sont transversales et ne sont pas repoussées à la fin du Niveau 1.

---

## 17. Protection contre la dérive de scope

Un ticket Level 1 ne doit pas absorber automatiquement une refonte générale du Core, nettoyage legacy non nécessaire, nouvelle architecture non justifiée, redesign complet, 3D, composants sans scénario ou migration d'un autre sous-système sans dépendance démontrée.

Tout élargissement devient scope additionnel, nouveau ticket ou décision CSA.

---

## 18. Réserve architecturale 3D

La 3D reste Level 3 et n'est pas un objectif de Phase 2.

Mais les contrats métier doivent rester indépendants de la projection :

```text
DONNÉES MÉTIER / CONNECTIVITÉ / GÉOMÉTRIE LOGIQUE
                    ↓
              PRESENTATION
               ↙       ↘
             2D         3D (futur)
```

Toute décision Phase 2 qui rend cette séparation impossible doit être signalée comme risque architectural avant implémentation.

---

## 19. Certification Level 1

| Scénario | Technique | Produit | E2E | Traçabilité | Statut |
|---|---|---|---|---|---|
| LED de base | preuve | preuve | preuve | preuve | à certifier |
| Interaction | preuve | preuve | preuve | preuve | à certifier |
| PWM/dynamique | preuve | preuve | preuve | preuve | à certifier |
| Measurement | preuve | preuve | preuve | preuve | à certifier |
| Waveform | preuve | preuve | preuve | preuve | à certifier |
| Breadboard | preuve | preuve | preuve | preuve | à certifier |
| Embedded E2E | preuve | preuve | preuve | preuve | à certifier |
| Save/reopen | preuve | preuve | preuve | preuve | à certifier |
| Recovery | preuve | preuve | preuve | preuve | à certifier |
| Multi-edit + Undo/Redo | preuve | preuve | preuve | preuve | à certifier |

Aucune ligne ne peut être remplacée par « tests verts ».

---

## 20. Decision Ledger

Chaque changement important doit enregistrer :

```text
DATE
ÉTAT AVANT
DÉCISION
RAISON
ALTERNATIVES ÉCARTÉES
IMPACT ROADMAP
NOW
NEXT
NEXT+1
PREUVES
CONSÉQUENCE FUTURE
```

Le journal doit permettre, six mois plus tard, de comprendre pourquoi une décision a été prise et pas seulement ce qui a été codé.

---

## 21. Journal STOP / NE PAS FAIRE

Les décisions négatives sont conservées comme des décisions de gouvernance à part entière.

Exemples actuels :

- ne pas commencer la 3D avant les critères Level 1 ;
- ne pas construire un oscilloscope sans contrat d'observation ;
- ne pas construire une breadboard purement décorative ;
- ne pas multiplier les systèmes de mutation ;
- ne pas ajouter des composants sans scénario utilisateur ;
- ne pas reprendre d'anciens tickets uniquement pour remplir la documentation.

Chaque entrée doit comporter la condition qui permet éventuellement de lever le STOP.

---

## 22. Anti-dérive automatique après intégration

Après chaque ticket intégré, le cycle obligatoire devient :

```text
DÉPÔT
 ↓
AUDIT DELTA
 ↓
CAPACITÉS AFFECTÉES
 ↓
SCÉNARIOS AFFECTÉS
 ↓
ROADMAP
 ↓
DECISION LEDGER
 ↓
NOW / NEXT / NEXT+1 / BLOCKED
```

Si ce cycle n'est pas effectué, la livraison est techniquement intégrée mais **documentairement incomplète**.

---

## 23. Règle de clôture d'un ticket

```text
IMPLEMENTATION
 ↓
TESTS
 ↓
INTEGRATION
 ↓
DELIVERY REPORT
 ↓
ROADMAP UPDATE
 ↓
CAPABILITY UPDATE
 ↓
DECISION LEDGER
 ↓
TRACE NEXT / NEXT+1
```

Le dernier état du dépôt doit toujours permettre au prochain agent de reprendre sans reconstruire l'historique.

---

## 24. Décision actuelle

À la date du 2026-08-22 :

- **Direction :** Niveau 1 crédible avant Level 2/3 ;
- **3D :** Level 3, préparation architecturale seulement ;
- **P2-0 :** réconciliation de pilotage ;
- **NEXT candidat :** `MB-OBS-001` ;
- **NEXT+1 candidat :** `MB-MEASURE-001` ;
- **troisième capacité visible :** `MB-OBS-002` waveform ;
- **implémentation :** non autorisée par ce cadre ;
- **condition d'avancement :** gates + preuves + traçabilité.

---

## 25. Principe directeur

> **Nous ne cherchons plus seulement à faire fonctionner MYBlab. Nous construisons progressivement la preuve qu'il devient un véritable laboratoire électronique.**

À chaque étape :

> **Où sommes-nous ? → Où allons-nous ? → Pourquoi ? → Quelle preuve ? → Quel ticket après ?**
