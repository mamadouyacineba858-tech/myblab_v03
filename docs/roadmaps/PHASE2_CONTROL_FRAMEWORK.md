# MYBlab v0.3 — PHASE 2 — CONTROL FRAMEWORK

**Statut :** cadre CSA complémentaire à `PHASE2_LEVEL1_EXECUTION_ROADMAP.md`
**Date :** 2026-08-22
**Objet :** rendre la Phase 2 pilotable, mesurable, traçable et résistante aux dérives de roadmap.
**Règle :** ce document n'autorise aucune implémentation à lui seul.

---

## 1. Pourquoi ce cadre est nécessaire

La roadmap Phase 2 définit déjà la direction vers le Niveau 1. Ce cadre ajoute ce qui manque pour éviter trois échecs récurrents :

1. choisir un ticket parce qu'il est disponible plutôt que parce qu'il ferme un gap produit ;
2. considérer une capacité technique comme une capacité produit alors qu'elle n'est pas observable de bout en bout ;
3. avancer plusieurs tickets sans mettre à jour la mémoire de projet.

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

Un ticket qui ne peut pas être relié à un scénario Level 1 ou à une dépendance indispensable est **secondaire** jusqu'à justification CSA.

---

## 3. Matrice de maturité Level 1

Une capacité n'est pas simplement « faite / pas faite ».

| Niveau | Signification |
|---|---|
| L0 | absent ou non démontré |
| L1 | prototype technique démontré |
| L2 | workflow utilisateur fonctionnel |
| L3 | workflow robuste + tests + intégration |
| L4 | capacité validée dans le scénario Level 1 |

**Règle de certification :** un scénario Level 1 ne peut être déclaré acquis que si toutes ses capacités critiques atteignent au minimum L3 et si le scénario complet est démontré de bout en bout.

---

## 4. Les cinq preuves obligatoires

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

Un ticket peut être techniquement vert tout en restant **non clos** si P3 ou P5 manque.

---

## 5. Score de priorité des candidats

Lorsqu'il existe plusieurs candidats raisonnables, le CSA les compare avec cette grille :

| Critère | Poids |
|---|---:|
| Ferme un gap Level 1 critique | 30 |
| Débloque plusieurs capacités futures | 20 |
| Réutilise l'architecture existante | 15 |
| Produit une preuve utilisateur claire | 15 |
| Risque technique maîtrisable | 10 |
| Coût / portée raisonnable | 10 |
| **Total** | **100** |

Seuils :

- **80–100 :** candidat prioritaire ;
- **65–79 :** candidat valable, dépendances à vérifier ;
- **50–64 :** candidat secondaire ;
- **<50 :** ne doit pas devenir le prochain ticket sans arbitrage explicite.

Ce score n'est pas une décision automatique : il sert à rendre la décision explicable.

---

## 6. Graphe de dépendances plutôt que simple liste

La roadmap doit maintenir au minimum :

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

Le graphe est prioritaire sur la numérotation. Une branche bloquée doit afficher explicitement son bloqueur.

---

## 7. Fenêtre de planification obligatoire

À tout instant, la roadmap doit connaître au minimum :

- **NOW** : ticket/capacité actuellement intégrée ou en clôture ;
- **NEXT** : prochain ticket autorisé après les gates ;
- **NEXT+1** : ticket immédiatement suivant, sous réserve des résultats de NEXT ;
- **LATER** : trajectoire ultérieure ;
- **BLOCKED** : éléments bloqués et raison.

Exemple cible :

```text
NOW      → clôture / réconciliation Phase 2
NEXT     → MB-OBS-001
NEXT+1   → MB-MEASURE-001
LATER    → MB-OBS-002 / waveform
BLOCKED  → éléments dépendant d'un contrat non stabilisé
```

Cette fenêtre doit être mise à jour après chaque intégration.

---

## 8. GATE du premier ticket fonctionnel

`MB-OBS-001` ne doit passer en implémentation que si les questions suivantes ont une réponse documentée :

1. source exacte de la grandeur ;
2. granularité (pin/net/branche/composant) ;
3. unité ;
4. validité et indisponibilité ;
5. instantané vs temporel ;
6. origine du temps simulé ;
7. frontière Simulation/Presentation ;
8. comportement déterministe ;
9. API de consommation par futurs instruments ;
10. stratégie de test ;
11. impact sur les contrats CF3 existants ;
12. absence de duplication d'un canal de mutation existant.

**Condition GO :** aucun point critique ne doit rester implicite.

---

## 9. Observation et mesure : distinction fondamentale

La Phase 2 ne doit pas confondre :

```text
OBSERVATION = obtenir une grandeur simulée qualifiée
MEASUREMENT = présenter cette grandeur comme un instrument ayant
              une sémantique de mesure
```

Ainsi, le contrat commun doit précéder l'interface du multimètre.

Cette distinction permettra ensuite de réutiliser le même socle pour :

- multimètre ;
- oscilloscope ;
- sondes ;
- indicateurs ;
- diagnostics ;
- instrumentation pédagogique.

---

## 10. Déterminisme temporel : règle absolue

Toute observation dynamique doit utiliser le temps simulé officiel.

Le code ne doit introduire pour la simulation aucune dépendance à :

- `Date.now()` ;
- `performance.now()` ;
- `setTimeout()` ;
- `setInterval()` ;
- horloge système implicite.

Le module PWM actuel confirme déjà cette orientation : son évaluation reçoit explicitement `currentTimeMs` et ne lit pas lui-même l'horloge. Cette propriété doit être conservée pour les futures waveforms. fileciteturn502file0L2-L2

---

## 11. Breadboard : ne pas reproduire le piège du « joli canvas »

Le breadboard doit être traité comme un **modèle de connectivité et d'assemblage**, avec une représentation visuelle au-dessus.

Avant implémentation, le ticket devra définir :

- rails d'alimentation ;
- groupes de trous électriquement connectés ;
- insertion/retrait ;
- règles de connectivité ;
- relation entre position physique et connectivité logique ;
- projection vers le Document ;
- comportement de la Simulation ;
- erreurs de montage ;
- compatibilité avec les instruments.

Une simple grille ressemblant à une breadboard n'est pas considérée comme la capacité Level 1.

---

## 12. Embedded : critère de réussite réaliste

Le workflow embedded Level 1 doit pouvoir être démontré sous une forme minimale :

```text
COMPOSANTS
   ↓
CÂBLAGE
   ↓
PROGRAMME
   ↓
EXÉCUTION
   ↓
CHANGEMENT DE COMPORTEMENT
   ↓
OBSERVATION / MESURE
```

Ajouter des APIs Arduino sans démontrer cette chaîne complète ne suffit pas.

---

## 13. Save / Reopen et récupération : portes transversales

Ces fonctions ne doivent pas attendre la fin de Level 1 pour être considérées.

Pour chaque capacité importante, vérifier au minimum :

```text
créer → modifier → sauvegarder → rouvrir → simuler → observer
```

et, lorsqu'une erreur est attendue :

```text
erreur → message exploitable → état cohérent → reprise possible
```

---

## 14. Protection contre la dérive de scope

Un ticket Level 1 ne doit pas absorber automatiquement :

- refonte générale du Core ;
- nettoyage legacy non nécessaire ;
- nouvelle architecture non justifiée ;
- redesign visuel complet ;
- 3D ;
- nouveaux composants sans scénario ;
- migration d'un autre sous-système sans dépendance démontrée.

Tout élargissement doit être enregistré comme **scope additionnel**, **nouveau ticket** ou **décision CSA**.

---

## 15. Règle spéciale pour la 3D

La 3D reste explicitement Level 3.

Cependant, la Phase 2 doit éviter de créer des contrats qui empêcheraient ultérieurement une représentation 3D.

Donc :

**préparer les contrats, ne pas construire la 3D.**

Les données métier (Document, connectivité, géométrie logique, instrumentation) doivent rester indépendantes de la projection 2D ou 3D.

---

## 16. Certification Level 1 — tableau de sortie

Le Niveau 1 ne sera déclaré que lorsque le tableau suivant pourra être rempli avec des preuves :

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

Aucune ligne ne peut être remplacée par un simple « tests verts ».

---

## 17. Journal de décision obligatoire

Chaque changement important de trajectoire doit enregistrer :

```text
DATE
ÉTAT AVANT
DÉCISION
RAISON
ALTERNATIVES ÉCARTÉES
IMPACT ROADMAP
NEXT
NEXT+1
PREUVES
```

Le journal doit permettre, six mois plus tard, de comprendre **pourquoi** une décision a été prise, et pas seulement **ce qui** a été codé.

---

## 18. Règle de clôture d'un ticket

Un ticket n'est pas réellement « terminé » à son commit.

La clôture Phase 2 exige :

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
TRACE NEXT / NEXT+1
```

Le dernier commit doit donc toujours laisser la roadmap dans un état permettant au prochain agent de reprendre sans reconstruire l'historique.

---

## 19. Décision actuelle

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

## 20. Principe directeur

> **Nous ne cherchons plus seulement à faire fonctionner MYBlab. Nous construisons progressivement la preuve qu'il devient un véritable laboratoire électronique.**

Et à chaque étape :

> **Où sommes-nous ? → Où allons-nous ? → Pourquoi ? → Quelle preuve ? → Quel ticket après ?**
