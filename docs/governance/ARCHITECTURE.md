# ARCHITECTURE.md — Révision V1.1 (Corrections issues de la revue croisée)

## Modifications retenues

### 1. Ajout d'un domaine **Core** (nouveau)

Le domaine **Core** constitue le cœur métier de MYBlab.

Il contient exclusivement :

* modèles métier ;
* composants électroniques ;
* circuits ;
* netlist ;
* document system ;
* types partagés ;
* événements métier.

Tous les autres domaines dépendent du Core. Le Core ne dépend d'aucun autre domaine.

---

### 2. Règle officielle des dépendances

Les dépendances sont strictement unidirectionnelles.

```text
Core
├── Simulation
├── Arduino
├── API
├── Visualisation
└── UI
```

Règles :

* Core ne dépend d'aucun domaine.
* Simulation dépend uniquement du Core.
* Arduino dépend uniquement du Core et des interfaces publiques de Simulation.
* API dépend uniquement des interfaces publiques des domaines.
* Visualisation dépend uniquement des interfaces publiques du Core et de la Simulation.
* UI dépend uniquement des interfaces publiques des autres domaines.
* Aucun domaine ne dépend des implémentations internes d'un autre domaine.
* Toute dépendance circulaire est interdite.

---

### 3. Contrats d'interface

Chaque domaine expose uniquement :

* interfaces publiques ;
* services publics ;
* types publics ;
* événements publics ;
* factories publiques.

Toutes les autres classes, fonctions et structures sont privées au domaine.

Toute évolution d'un contrat public suit obligatoirement le processus RFC.

---

### 4. Domaine Simulation

Le domaine Simulation est organisé autour des responsabilités suivantes :

* Netlist ;
* Models ;
* Solver ;
* Analysis ;
* Circuit State ;
* Events.

La Simulation ne dépend jamais de l'interface utilisateur.

---

### 5. Domaine Arduino

Le domaine Arduino est indépendant de l'interface utilisateur.

Il comprend :

* Compilation ;
* Runtime ;
* Pin Mapping ;
* Communication.

Toute communication avec les autres domaines s'effectue exclusivement via les contrats d'interface publics.

---

### 6. Domaine UI

La UI est responsable uniquement :

* des interactions utilisateur ;
* des commandes ;
* des outils ;
* de la navigation ;
* de l'expérience utilisateur.

La UI ne contient aucune logique métier de simulation.

---

### 7. Domaine Visualisation

La Visualisation est responsable uniquement :

* du rendu graphique ;
* des renderers ;
* des symboles électroniques ;
* des animations ;
* des représentations visuelles.

Elle ne contient aucune logique métier.

---

### 8. Domaine API

Le domaine API constitue la frontière publique entre les domaines.

Il expose uniquement :

* services ;
* interfaces ;
* contrats ;
* événements publics.

Il masque toutes les implémentations internes.

---

### 9. Principes de communication

Les domaines communiquent exclusivement via des contrats documentés.

Les implémentations internes ne sont jamais accessibles directement.

Les choix technologiques (Store, Event Bus, framework, moteur de rendu, bibliothèque) ne font pas partie de l'architecture et sont documentés séparément dans les ADR ou les documents techniques.

---

### 10. Principes d'évolutivité

Toute nouvelle fonctionnalité doit :

* respecter les dépendances définies ;
* préserver les contrats publics ;
* éviter les dépendances circulaires ;
* conserver l'indépendance des domaines ;
* être testable isolément.

---

### 11. Cohérence documentaire

Toute modification :

* d'une interface publique ;
* d'une dépendance entre domaines ;
* de la structure architecturale ;

est soumise au processus RFC défini dans `RFC-GUIDE.md`.

La présente architecture est conforme à :

* `MYBLAB-CONSTITUTION.md`
* `GOVERNANCE.md`
