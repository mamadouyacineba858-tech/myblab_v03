# ADR-014 — Source de vérité des pins

## Statut

Accepté — MB-CF2-009

## Contexte

MB-CF2-005 a établi une séparation explicite entre le **Registry canonique** et la **Presentation**.

Une décision complémentaire est nécessaire afin de définir précisément la responsabilité de chaque couche concernant les données des pins et d'éviter toute duplication de responsabilité susceptible de créer des divergences.

L'objectif de MB-CF2-009 est donc de formaliser la source de vérité des pins avant toute éventuelle modification du code.

---

## Décision

### Option C — Séparation stricte Registry / Presentation

L'architecture retient une séparation stricte des responsabilités :

```text
                    PIN
                     │
          ┌──────────┴──────────┐
          │                     │
   CANONICAL REGISTRY      PRESENTATION
          │                     │
   identité / sémantique    représentation
          │                     │
          └──────────┬──────────┘
                     │
                  pin.id
                     │
                  JOINTURE
```

### 1. `canonicalRegistry.js` — source de vérité canonique

`canonicalRegistry.js` est la source unique de vérité pour les propriétés qui définissent **l'identité et la sémantique du pin** :

- `id` ;
- `role` ;
- existence du pin ;
- cardinalité ;
- ordre logique/canonique des pins.

Ces propriétés constituent le contrat fonctionnel du composant.

Aucune autre couche ne doit redéclarer ces informations comme une seconde source de vérité.

### 2. `componentDefinitions.js` — source de vérité de présentation

`componentDefinitions.js` est la source unique de vérité pour les propriétés qui définissent **la représentation visuelle du pin** :

- `label` ;
- `dx` ;
- `dy` ;
- propriétés purement visuelles associées à la représentation du pin.

Ces propriétés ne doivent pas être promues au rang de données canoniques du Registry.

---

## Jointure

La relation entre les deux couches est établie **exclusivement par `pin.id`**.

```text
canonicalRegistry.pins[].id
             │
             │ correspondance
             ▼
componentDefinitions.pins[].id
```

`pin.id` constitue donc la **clé de jointure** entre identité/sémantique et présentation.

La présentation ne doit pas dépendre de la position du pin dans un tableau pour identifier celui-ci.

Aucune jointure parallèle par index, ordre de déclaration ou autre convention implicite ne doit être introduite.

---

# Invariants architecturaux

Les invariants suivants sont désormais applicables.

### INV-PIN-001 — Unicité de l'identité

Chaque pin canonique possède un `id` unique dans le composant concerné.

### INV-PIN-002 — Identité canonique

L'identité et la sémantique d'un pin sont définies exclusivement par `canonicalRegistry.js`.

### INV-PIN-003 — Présentation dérivée par jointure

Les propriétés de présentation sont associées au pin canonique par son `id`.

### INV-PIN-004 — Pas de duplication de responsabilité

Une propriété ne doit pas être déclarée comme donnée canonique dans `canonicalRegistry.js` et simultanément comme donnée canonique indépendante dans `componentDefinitions.js`.

### INV-PIN-005 — Séparation des responsabilités

Une modification purement visuelle ne doit pas nécessiter de modifier le Registry canonique.

Inversement, une modification de l'identité ou de la sémantique d'un pin ne doit pas être effectuée uniquement dans la couche de présentation.

### INV-PIN-006 — Jointure explicite

La correspondance Registry → Presentation doit rester explicite et fondée sur `pin.id`.

### INV-PIN-007 — Pas de troisième source de vérité

Aucun troisième registre, wrapper, adaptateur ou fichier de configuration ne doit devenir une source concurrente de vérité pour les propriétés couvertes par cet ADR.

---

# Alternatives rejetées

## Option A — `canonicalRegistry.js` maître de tout

**Rejetée.**

Cette option ferait porter au Registry canonique des propriétés de présentation.

Elle réduirait la séparation des responsabilités et couplerait inutilement le Registry à la représentation visuelle.

Elle est également incompatible avec la frontière établie par **MB-CF2-005**.

---

## Option B — `componentDefinitions.js` maître de tout

**Rejetée.**

Cette option ferait dépendre l'identité et la sémantique des composants de leur représentation.

Elle inverse la dépendance architecturale attendue et transforme la couche de présentation en source de vérité du domaine.

Elle est donc également incompatible avec la décision de séparation établie par **MB-CF2-005**.

---

# Compatibilité avec MB-CF2-005

Cette décision **consolide** et ne remet pas en cause MB-CF2-005.

MB-CF2-005 a établi la jointure explicite entre les données canoniques du Registry et les données de présentation.

MB-CF2-009 précise désormais **le contrat de responsabilité** derrière cette séparation :

```text
MB-CF2-005
    │
    ├── séparation Registry / Presentation
    └── jointure explicite par id
              │
              ▼
MB-CF2-009
    │
    ├── identité/sémantique → canonicalRegistry
    ├── présentation → componentDefinitions
    └── jointure → pin.id
```

Aucune modification de l'architecture validée par MB-CF2-005 n'est donc requise par le présent ADR.

---

# Conséquences

## Conséquences positives

- Le Registry reste indépendant de la présentation.
- La présentation reste indépendante de l'implémentation interne du Registry.
- Les responsabilités des propriétés de pin sont explicites.
- `pin.id` constitue une clé de jointure stable et identifiable.
- Les risques de duplication sémantique sont réduits.
- Les futurs changements visuels peuvent être effectués sans modifier les données canoniques.
- Les futurs changements de sémantique peuvent être effectués sans transformer la Presentation en source de vérité.

## Conséquence de gouvernance

Toute future modification qui introduirait une nouvelle source de vérité pour les propriétés couvertes par cet ADR devra être considérée comme une **déviation architecturale** et être explicitement justifiée.

---

# Périmètre de MB-CF2-009

MB-CF2-009 est un **ticket d'arbitrage et de formalisation architecturale**.

Il ne constitue pas un ticket de refactoring.

### Aucune modification de code n'est requise dans MB-CF2-009.

En particulier, ce ticket ne demande pas de modifier :

- `canonicalRegistry.js` ;
- `componentDefinitions.js` ;
- `registry.js` ;
- `simulationRegistry.js` ;
- le moteur de simulation ;
- le Bridge ;
- History ;
- B2, déjà supprimé par MB-CF2-008.

---

# Condition pour un futur ticket d'implémentation

Un ticket d'implémentation distinct ne pourra être créé que si un audit du code réel démontre une **déviation effective** par rapport aux invariants de cet ADR.

Le futur ticket devra alors :

1. identifier précisément la déviation ;
2. démontrer son impact ;
3. modifier uniquement les fichiers nécessaires ;
4. préserver les frontières établies par MB-CF2-005 ;
5. ne pas introduire de nouvelle source de vérité ;
6. ajouter ou adapter uniquement les tests nécessaires à la correction ;
7. vérifier que les invariants `INV-PIN-001` à `INV-PIN-007` restent satisfaits.

**Si l'audit démontre que le code actuel respecte déjà ce contrat, aucun ticket d'implémentation ne devra être créé.**

---

# Décision finale du CSA

**MB-CF2-009 adopte l'Option C : séparation stricte Registry / Presentation avec jointure exclusivement par `pin.id`.**

```text
canonicalRegistry.js
        │
        ├── identité
        ├── sémantique
        ├── existence
        ├── cardinalité
        └── ordre logique
                │
                │ pin.id
                ▼
        componentDefinitions.js
                │
                ├── label
                ├── dx
                ├── dy
                └── présentation
```

**Aucun code n'est modifié dans MB-CF2-009.**

La création d'un éventuel ticket d'implémentation est **conditionnée à la découverte d'une déviation réelle** par rapport au présent contrat.

**MB-CF2-009 est donc un ADR de décision, pas un ticket de refactoring.**
