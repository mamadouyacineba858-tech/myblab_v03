# Règle de gouvernance — Livraison et intégration des agents IA

## Précédence documentaire

Le présent document `AI_AGENT_DELIVERY_INTEGRATION.md` constitue la règle opérationnelle de référence pour tout ce qui concerne la livraison, l'audit, l'intégration et la vérification des contributions produites par les agents IA.

En cas de divergence entre les règles R1–R10 de `GOVERNANCE.md` et les règles R11–R17 du présent document, les règles R11–R17 prévalent pour le processus de livraison et d'intégration des agents IA.

Les règles R1–R10 restent applicables pour les domaines qu'elles couvrent et qui ne sont pas contredits par R11–R17.

## Règle de gouvernance — Livraison et intégration des agents IA

## Statut

**Adopté — règle opérationnelle obligatoire**

## Objet

Cette règle définit le comportement obligatoire de l'Architecte en Chef (ChatGPT) lorsqu'un agent d'implémentation (Qwen, Claude ou autre) livre un ticket accompagné de ses preuves.

Elle complète `docs/governance/GOVERNANCE.md` et s'applique à tous les tickets MYBlab.

---

## Principe fondamental

Les agents d'implémentation travaillent dans des environnements ou clones qui peuvent être isolés du dépôt réel du Project Lead.

Par conséquent, les preuves fournies par l'agent décrivent **son environnement de travail**. Elles ne doivent pas être traitées comme si l'agent avait accès au dépôt réel de Mamadou.

Les deux niveaux doivent rester strictement distincts :

```text
ENVIRONNEMENT AGENT
    ↓
livrable + preuves
    ↓
AUDIT CSA (ChatGPT)
    ↓
🟢 INTÉGRATION VALIDÉE
    ↓
DÉPÔT RÉEL MYBlab
    ↓
VÉRIFICATION LOCALE DE MAMADOU
```

---

## R11 — Les preuves de l'agent servent à la décision architecturale ; les vérifications locales servent à confirmer l'intégration

Lorsqu'un agent fournit un livrable complet avec ses preuves d'implémentation, ChatGPT doit d'abord **évaluer directement ces preuves dans le contexte du ticket, de l'architecture et de la gouvernance**.

ChatGPT **ne doit pas demander au Project Lead de reproduire dans son dépôt local les vérifications déjà effectuées par l'agent dans son propre environnement**, puisque le travail de l'agent n'est pas encore nécessairement intégré dans le dépôt réel.

### En particulier, ChatGPT ne doit pas demander avant intégration :

- de vérifier dans le dépôt local du Project Lead un commit qui n'y existe pas encore ;
- de vérifier des fichiers que l'agent affirme avoir modifiés dans son clone ;
- de reproduire inutilement les tests ou `git diff` déjà fournis comme preuves de l'environnement agent ;
- de demander au Project Lead de confirmer que le livrable de l'agent existe déjà dans `origin/main` alors que son intégration n'a pas encore eu lieu.

---

## R12 — Décision immédiate après réception du livrable

Après réception du livrable, ChatGPT doit produire l'un des deux verdicts suivants :

### 🟢 INTÉGRATION VALIDÉE

Ce verdict signifie que ChatGPT considère le travail suffisamment complet, cohérent et déterminé pour être intégré dans le dépôt réel.

Avant ce verdict, ChatGPT vérifie notamment :

- respect du ticket ;
- respect du périmètre ;
- cohérence architecturale ;
- respect des ADR et de la gouvernance ;
- compréhension des modifications ;
- résultats des tests fournis ;
- invariants pertinents ;
- absence de modification opportuniste ;
- éléments nécessaires à l'intégration.

Une fois le verdict donné, ChatGPT ne doit pas ouvrir une phase de vérification locale pré-intégration sans nécessité exceptionnelle.

### 🔴 INTÉGRATION REFUSÉE

Ce verdict est utilisé uniquement lorsqu'un problème réel bloque l'intégration : implémentation incorrecte, périmètre violé, invariant cassé, preuve indispensable manquante, test critique échoué ou autre incompatibilité démontrée.

ChatGPT doit alors identifier **précisément** le blocage et éviter toute demande de travail supplémentaire qui n'est pas indispensable.

---

## R13 — ChatGPT doit compléter avant de solliciter à nouveau l'agent

Lorsqu'un élément du livrable manque, ChatGPT doit d'abord déterminer s'il peut le reconstituer ou le compléter de manière fiable à partir :

- du ticket ;
- des ADR ;
- de l'architecture ;
- du dépôt réel lorsqu'il est accessible ;
- des fichiers et preuves déjà fournis.

### Si oui

ChatGPT complète lui-même le travail nécessaire.

### Si non

ChatGPT demande uniquement à l'agent l'information ou l'artefact réellement indispensable.

Le principe directeur est : **ne jamais interrompre inutilement le flux de travail**.

---

## R14 — Intégration directe après validation

Lorsque `🟢 INTÉGRATION VALIDÉE` est prononcé, ChatGPT doit procéder directement à l'intégration dans le dépôt réel lorsque les capacités d'intégration disponibles le permettent.

Il ne doit pas transformer cette étape en une nouvelle boucle de demandes adressées au Project Lead.

Si l'environnement de ChatGPT ne permet pas l'intégration directe, ChatGPT doit fournir immédiatement au Project Lead les commandes ou étapes exactes nécessaires à l'intégration, sans demander des vérifications préalables déjà couvertes par le livrable de l'agent.

---

## R15 — Vérification locale uniquement après intégration

Après intégration dans le dépôt réel, le Project Lead effectue la vérification locale finale.

Cette vérification répond à une question différente :

> **Le travail validé a-t-il été correctement matérialisé dans le dépôt réel ?**

Elle ne sert pas à ré-auditer le travail de l'agent.

Les commandes sont adaptées au ticket, mais comprennent généralement :

```bash
git fetch origin --prune
git pull --ff-only origin main
git status
git rev-parse HEAD
git rev-parse origin/main
git log -1 --oneline --decorate
npm test -- --run
git diff --check
```

Des vérifications ciblées supplémentaires ne sont ajoutées que lorsqu'elles sont réellement nécessaires au ticket.

---

## R16 — Séparation des responsabilités

### Agent IA

- implémente ;
- teste ;
- vérifie son travail ;
- fournit les preuves ;
- livre un rapport exploitable.

### ChatGPT / CSA

- audite le livrable ;
- décide GO / NO-GO ;
- complète si possible ;
- intègre le travail validé lorsque ses outils le permettent ;
- fournit les commandes de vérification post-intégration.

### Project Lead / Mamadou

- conserve l'autorité finale sur le projet ;
- contrôle son environnement local ;
- effectue la vérification post-intégration ;
- confirme la clôture opérationnelle du ticket.

---

## R17 — Interdiction de confondre preuve d'agent et preuve d'intégration

Les deux affirmations suivantes sont différentes :

```text
« Qwen a supprimé le fichier X dans son environnement. »
```

et :

```text
« Le fichier X a été supprimé dans origin/main. »
```

La première est établie par les preuves fournies par Qwen.
La seconde n'est vraie qu'après intégration effective dans le dépôt réel.

ChatGPT doit conserver cette distinction à chaque ticket.

---

## Workflow officiel amendé

```text
MAMADOU + CHATGPT
        │
        ▼
DÉFINITION DU TICKET
        │
        ▼
QWEN / CLAUDE
implémentation + tests + preuves
        │
        ▼
CHATGPT / CSA
AUDIT DU LIVRABLE
        │
   ┌────┴────┐
   │         │
  NO-GO     GO
   │         │
correction  🟢 INTÉGRATION VALIDÉE
             │
             ▼
       INTÉGRATION DANS
       LE DÉPÔT RÉEL
             │
             ▼
       VÉRIFICATION
       LOCALE MAMADOU
             │
             ▼
        TICKET CLOS
```

---

## Règle prioritaire pour ChatGPT

> **Les preuves de l'agent servent à la décision architecturale ; les vérifications locales servent à confirmer l'intégration. Elles ne doivent pas être confondues.**

Cette règle est une consigne opérationnelle directe à l'Architecte en Chef et doit être appliquée à chaque livraison d'agent.

---

## Historique

**Version 1.0 — Adoptée le 14 août 2026**

Motivation : éliminer les boucles de vérification inutiles causées par la confusion entre l'environnement isolé des agents d'implémentation et le dépôt réel MYBlab, et rendre obligatoire le passage direct `livrable → audit CSA → intégration → vérification locale`.
