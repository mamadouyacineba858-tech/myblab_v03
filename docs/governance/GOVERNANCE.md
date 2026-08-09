Amendement de gouvernance — Validation des livraisons externes
Principe
Les propositions d'implémentation produites par un agent externe (Claude, Qwen, DeepSeek, Copilot, Gemini, etc.) sont considérées comme des propositions de patch, et non comme des livraisons définitives.

Une livraison n'est validée qu'après intégration et vérification sur le dépôt officiel MYBlab.

Processus obligatoire
Agent IA
      │
      ▼
Proposition de patch
      │
      ▼
Revue Architecturale (ChatGPT)
      │
      ▼
Intégration locale (Project Lead)
      │
      ▼
Vérification Git
      │
      ▼
Tests + Build
      │
      ▼
Commit officiel
      │
      ▼
Push GitHub
      │
      ▼
Ticket validé
Règles
R1 — Aucun hash externe n'est considéré comme une preuve
Un hash annoncé par un agent n'a aucune valeur tant qu'il n'existe pas dans le dépôt officiel.

Validation :

git show <hash>
R2 — Les rapports sont des propositions
Un rapport peut annoncer :

des fichiers modifiés

des diffs

des explications

mais jamais qu'un ticket est terminé tant que le dépôt officiel ne le confirme pas.

R3 — Validation Git obligatoire
Avant toute validation :

git status
git diff --stat
git grep ...
git log --oneline -5
R4 — Validation technique obligatoire
Toujours exécuter :

npm test -- --run
npm run build
R5 — Validation architecturale
L'Architecte en Chef vérifie :

le respect du ticket

le respect des ADR

le respect de la gouvernance

l'absence de dette technique inutile

la cohérence de l'architecture

R6 — Le Project Lead garde le contrôle
Le Project Lead :

applique les patchs

lance les tests

crée le commit officiel

pousse sur GitHub

Aucun agent IA ne décide qu'un ticket est terminé.                                                                                                    R7 — Toute affirmation technique doit être vérifiable
Un agent peut affirmer qu'une modification est réalisée uniquement si cette affirmation peut être vérifiée sur le dépôt officiel.

Par exemple :

Affirmation :
✓ le fichier existe

→ vérification :

git ls-files <fichier>
Affirmation :
✓ la fonction a disparu

→ vérification :

git grep "nomDeLaFonction"
Affirmation :
✓ aucun changement supplémentaire

→ vérification :

git diff
Affirmation :
✓ commit créé

→ vérification :

git show HASH
Ainsi, on ne débat plus des affirmations : on les valide par des commandes reproductibles.

J'ajouterais aussi une règle qui nous a énormément aidés
R8 — Les preuves priment sur les rapports
Une livraison est évaluée dans l'ordre suivant :

état Git ;

diff ;

tests ;

build ;

rapport.

Le rapport est le dernier élément, pas le premier.

R9 (version finale)
Avant chaque nouvelle mission :

audit

implémentation

revue

correction

refactoring

l'agent doit :

synchroniser son clone avec le dépôt officiel (ou re-cloner s'il préfère) ;

annoncer le HEAD utilisé ;

produire son travail uniquement sur cette base.

Ainsi, il n'existe jamais de notion de "clone courant".

Il existe uniquement :

la dernière version officielle du dépôt.


R10 — Aucune hypothèse sur l'état du dépôt
Un agent ne doit jamais écrire :

"je suppose que..."

"je pense que..."

"probablement..."

concernant un fichier du dépôt.

Il doit d'abord vérifier.

Par exemple :

git grep ...
git show ...
git diff ...
git ls-files ...
Puis seulement conclure.                                                                                                                                            Gouvernance R1–R10
À partir de maintenant, nous avons un workflow clair :

Synchronisation obligatoire avec le dépôt officiel.

Annonce du HEAD de référence.

Aucune hypothèse sur le contenu du dépôt.

Chaque affirmation est prouvée (git grep, git show, git diff, etc.).

Production d'un patch, jamais d'une "livraison".

Revue architecturale.

Intégration sur ton dépôt.

Tests.

Build.

Commit officiel + Push.

# Amendement de gouvernance — Validation des livraisons externes

## Statut

**Adopté**

## Objet

Cet amendement définit le processus officiel de validation des contributions produites par des agents IA externes (Claude, Qwen, DeepSeek, Copilot, Gemini, etc.).

À compter de son adoption, il complète `GOVERNANCE.md` et s'applique à tous les tickets du projet MYBlab.

---

# Principe fondamental

Toute implémentation produite par un agent IA est considérée comme une **proposition de patch**.

Elle ne devient une livraison officielle qu'après validation sur le dépôt Git officiel de MYBlab.

Le dépôt officiel constitue l'unique source de vérité.

---

# Workflow officiel

```text
Agent IA
      │
      ▼
Proposition de patch
      │
      ▼
Revue Architecturale
      │
      ▼
Intégration locale (Project Lead)
      │
      ▼
Vérification Git
      │
      ▼
Tests
      │
      ▼
Build
      │
      ▼
Commit officiel
      │
      ▼
Push GitHub
      │
      ▼
Ticket validé
```

---

# R1 — Aucun hash externe n'est une preuve

Un hash communiqué par un agent IA n'a aucune valeur tant qu'il n'existe pas dans le dépôt officiel.

Validation :

```bash
git show <hash>
```

---

# R2 — Les rapports sont des propositions

Un rapport peut contenir :

* des explications ;
* des diffs ;
* des propositions de patch ;
* des analyses.

En revanche, un agent IA ne peut jamais déclarer qu'un ticket est terminé tant que celui-ci n'a pas été validé sur le dépôt officiel.

---

# R3 — Validation Git obligatoire

Avant toute validation officielle :

```bash
git status
git diff --stat
git grep ...
git log --oneline -5
```

---

# R4 — Validation technique obligatoire

Avant toute intégration :

```bash
npm test -- --run
npm run build
```

Aucune exception.

---

# R5 — Validation architecturale

L'Architecte en Chef vérifie notamment :

* le respect du ticket ;
* le respect des ADR ;
* le respect de la gouvernance ;
* l'absence de dette technique inutile ;
* la cohérence globale de l'architecture.

---

# R6 — Le Project Lead conserve le contrôle

Le Project Lead est le seul responsable de :

* l'intégration des patchs ;
* l'exécution des vérifications ;
* la création du commit officiel ;
* le push vers GitHub.

Aucun agent IA ne peut déclarer un ticket terminé.

---

# R7 — Toute affirmation doit être vérifiable

Toute affirmation technique doit pouvoir être démontrée par une commande reproductible.

Exemples :

Fichier présent :

```bash
git ls-files <fichier>
```

Fonction supprimée :

```bash
git grep "NomDeLaFonction"
```

Aucune modification restante :

```bash
git diff
```

Commit existant :

```bash
git show <hash>
```

Les preuves priment sur les affirmations.

---

# R8 — Les preuves priment sur les rapports

Une livraison est évaluée dans l'ordre suivant :

1. état Git ;
2. diff ;
3. tests ;
4. build ;
5. rapport.

Le rapport constitue la dernière étape du processus.

---

# R9 — Synchronisation obligatoire

Avant **chaque** nouvelle mission :

* audit ;
* implémentation ;
* revue ;
* correction ;
* refactoring.

L'agent IA doit :

1. synchroniser son environnement avec le dépôt officiel (re-clone ou mise à jour complète) ;
2. annoncer explicitement le HEAD utilisé ;
3. produire son travail uniquement à partir de cette base.

Il n'existe pas de "clone courant".

La seule référence est la dernière révision officielle du dépôt.

---

# R10 — Aucune hypothèse sur l'état du dépôt

Un agent IA ne doit jamais conclure sur l'état d'un fichier sans vérification préalable.

Les formulations du type :

* "je suppose…"
* "je pense…"
* "probablement…"

sont interdites lorsqu'elles concernent le contenu du dépôt.

Toute conclusion doit être précédée d'une vérification (`git grep`, `git show`, `git diff`, `git ls-files`, lecture directe du fichier, etc.).

---

# Conséquence

À compter de cet amendement :

* tous les agents IA produisent des **propositions de patch** ;
* le dépôt Git officiel est la seule source de vérité ;
* aucune livraison n'est considérée comme valide avant intégration, vérification, tests, build, commit officiel et push.

---

## Je te propose une dernière amélioration

J'ajouterais à la fin une petite section **"Historique"** :

```text
## Historique

Version 1.0
Adoptée après l'intégration de MB-SIM-005.

Motivation :
Formaliser le processus de validation des contributions des agents IA afin d'éviter tout déphasage entre les environnements de travail et le dépôt Git officiel.
```

