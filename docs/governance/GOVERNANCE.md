# MYBlab — GOVERNANCE.md

> Ce document décrit les rôles, responsabilités et processus opérationnels du projet MYBlab.
> Il découle de `MYBLAB-CONSTITUTION.md` (source de vérité des principes immuables) et précède
> `ARCHITECTURE.md`, `CONVENTIONS.md`, `CODEOWNERS`, `RFC-GUIDE.md` et `ADR/`, qui en sont des
> déclinaisons opérationnelles.
>
> **Statut** : v2 — révisé après revue croisée (Qwen, DeepSeek, ChatGPT, Gemini, Copilot).
> **Auteur** : Claude — Historique des revues disponible dans `ADR/` une fois publié.

---

## 1. Principe fondateur

Ce projet est **piloté par un humain (le Project Lead)**, assisté par des agents IA consultés
comme experts spécialisés. Les rôles décrits ci-dessous sont des **fonctions**, pas des identités
figées : un rôle peut être occupé par différents agents ou personnes dans le temps, sans que la
gouvernance elle-même ne change. L'identité de la personne physique occupant le rôle de Project
Lead n'est pas fixée ici — elle vit dans un registre séparé (ex. `TEAM.md`), afin que ce document
reste valable indépendamment des personnes.

Toute règle de ce document doit, autant que possible, être **mécanisée** (intégration continue,
attribution de propriétaires de fichiers, modèles de tickets) plutôt que reposer sur la seule
bonne volonté des contributeurs.

**Sur l'autorité de l'automatisation** : l'automatisation constitue l'**autorité opérationnelle
immédiate** — c'est elle qui bloque ou autorise un merge au quotidien. Mais toute divergence
détectée entre ce document et ce que l'automatisation applique réellement est traitée comme une
**anomalie prioritaire**, à corriger soit en ajustant l'automatisation, soit en mettant à jour ce
document — jamais acceptée telle quelle sous prétexte qu'elle est "en place".

*(Note d'implémentation : ce document reste volontairement neutre vis-à-vis de l'outil de forge
utilisé — le terme générique "ticket du dépôt" est employé plutôt qu'un nom d'outil spécifique, ce
document devant rester valable si l'outil change.)*

---

## 2. Structure des rôles

### 2.1 Project Lead
- **Qui** : une personne physique désignée, référencée en dehors de ce document.
- **Décide seul** : la vision produit, la création/suppression/fusion d'un domaine, l'arbitrage
  final de tout désaccord structurant.
- **Ne fait pas** : review de code ligne par ligne, validation de PR internes à un domaine.
- **Mécanisme de décision** : voir §5. **Mécanisme en cas d'indisponibilité** : voir §5.1.

### 2.2 Propriétaire de domaine
- **Qui** : une IA (ou un humain, à terme) désigné par domaine dans `ARCHITECTURE.md` /
  `CODEOWNERS`. Le nom de l'agent occupant ce rôle **n'est jamais gravé dans ce document** — il vit
  dans `CODEOWNERS`, qui peut être mis à jour sans réviser la gouvernance.
- **Peut décider seul** :
  - Toute modification de fichiers dont il est l'unique propriétaire (`CODEOWNERS`).
  - Refactoring interne qui ne change pas un contrat d'interface exposé.
  - Priorisation du backlog de son domaine, exercée lors des sessions de travail ou sur directive
    du Project Lead — un propriétaire IA n'agit pas en continu entre deux sollicitations, et cette
    priorisation n'est donc pas une gestion autonome permanente.
- **Doit escalader au Project Lead** :
  - Toute modification d'un contrat d'interface consommé par un autre domaine (→ processus RFC,
    voir §4).
  - Toute modification d'un fichier partagé listé dans `CODEOWNERS`.
  - Tout changement de découpage du domaine lui-même.
- **Critère de bonne gouvernance du domaine** (indicatifs, non des règles rigides) : zéro merge
  sans passage par son propriétaire ; interface documentée et versionnée ; taux d'escalade
  raisonnable — un domaine jeune ou en forte évolution aura naturellement plus d'escalades qu'un
  domaine stabilisé, la valeur cible n'est donc qu'un point de repère, pas un couperet.

### 2.3 Expert consulté
- **Qui** : tout agent IA sollicité ponctuellement sur un sujet précis, sans ownership permanent
  d'un domaine.
- **Rôle** : produire une recommandation, un patch, une analyse — jamais fusionner directement sans
  passage par le propriétaire du domaine concerné.

### 2.4 Création, fusion et suppression d'un domaine
- Un nouveau domaine est créé lorsqu'un découpage améliore durablement la cohérence
  architecturale ou réduit les dépendances entre composants — décision réservée au Project Lead.
- En cas de suppression ou de fusion d'un domaine, l'ownership de tous ses fichiers est
  explicitement redéfini (dans `CODEOWNERS`) **avant** toute nouvelle évolution de ces fichiers.
  Un domaine ne disparaît jamais en laissant des fichiers orphelins.

---

## 3. Ownership des fichiers

- **Principe par défaut** : un fichier a un seul propriétaire (`CODEOWNERS`).
- **Exceptions acceptables** :
  - **Fichiers de contrat d'interface** (types partagés, schémas, constantes de domaine communes) :
    ownership partagé assumé, modification uniquement via le processus RFC (§4). Le partage n'est
    pas une anomalie ici, mais la nature même de ce type de fichier.
  - Fichiers de configuration globale (config racine du projet, outillage de lint global) :
    propriété du Project Lead lui-même.
- **Fichier qui devient transversal hors des deux cas ci-dessus** : si un fichier de logique
  métier (non-contrat) est modifié régulièrement par plus d'un domaine pendant plus de 2-3 cycles
  de travail, il doit être **scindé, ou refactorisé vers une bibliothèque commune avec un
  propriétaire clair** — pas laissé en ownership flou. Le problème à éviter est l'ambiguïté de
  décision, pas le partage de fichier en tant que tel.

---

## 4. Processus RFC (changement d'interface entre domaines)

Utilisé dès qu'un domaine veut modifier une interface consommée par un autre domaine. Deux
variantes existent, pour éviter qu'un ajustement mineur ne subisse le poids d'un changement majeur.

### 4.1 RFC standard (changement significatif ou "breaking")
1. **Proposition** — ticket du dépôt avec template dédié : quoi, pourquoi, impact.
2. **Validation du contrat** — le propriétaire du domaine qui possède l'interface valide ou
   contre-propose. En cas de désaccord → escalade au Project Lead.
3. **Implémentation** — par le propriétaire de l'interface, ou par le domaine consommateur si le
   propriétaire préfère déléguer — dans ce cas, la PR reste soumise à l'**approbation explicite**
   du propriétaire avant merge, qui garde le dernier mot sur son interface.
4. **Versionnage** — le changement est marqué (semver simple) avec un changelog court.
5. **Notification automatique** — un contrôle automatisé détecte les changements dans les fichiers
   de contrat et notifie les travaux en cours des domaines consommateurs. Pas de notification
   manuelle.
6. **Tests + documentation** — mise à jour obligatoire **avant** merge (bloquant en CI).
7. **Clôture** — le ticket RFC est fermé avec lien vers la PR qui l'implémente.

### 4.2 RFC légère (changement mineur, non-breaking)
Pour un ajout de champ optionnel, une correction n'affectant pas les consommateurs existants, ou
tout changement rétrocompatible : les étapes 1 et 2 sont fusionnées en une notification directe
au propriétaire de l'interface avec accord rapide, sans ticket formel obligatoire. Les étapes
5 et 6 restent obligatoires. En cas de doute sur la nature "mineure" du changement, le propriétaire
de l'interface tranche — et le processus standard s'applique par défaut.

Le détail procédural complet (formats, templates, cycle de vie) est spécifié dans `RFC-GUIDE.md`
(Phase 6).

---

## 5. Règle de décision par défaut

Les agents IA de ce projet n'opèrent pas en continu : ils interviennent lorsqu'ils sont sollicités.
En conséquence :

> **Tant que le Project Lead n'a pas explicitement arbitré un désaccord structurant, le contrat ou
> l'état actuel reste en vigueur. Aucun délai n'entraîne, à lui seul, une décision implicite.**

Cette règle prime sur toute notion de SLA classique. Elle est plus lente mais plus sûre : un
changement structurant ne doit jamais passer simplement parce qu'un délai s'est écoulé sans
réponse.

### 5.1 Indisponibilité prolongée du Project Lead ou d'un propriétaire de domaine

Cette règle porte sur *qui* peut décider en cas d'indisponibilité — elle ne crée jamais de décision
automatique par défaut, ce qui resterait contraire au principe ci-dessus.

- **Project Lead indisponible** au-delà d'un délai raisonnable (indicatif : 72h sans réponse pour
  un désaccord bloquant) : les propriétaires de domaine concernés peuvent constituer un **comité
  restreint temporaire** pour statuer, à condition que la décision soit explicitement documentée
  comme provisoire et revue par le Project Lead à son retour.
- **Propriétaire de domaine indisponible** : le Project Lead peut désigner un propriétaire
  temporaire pour le domaine concerné, le temps de la résolution du blocage, sans que cela ne
  modifie l'attribution permanente dans `CODEOWNERS`.

---

## 6. Validation et merge

| Niveau | Portée | Validateur |
|---|---|---|
| 1 | PR strictement interne à un domaine, sans impact sur un contrat public | Propriétaire du domaine, auto-merge autorisé **uniquement si** : CI complète verte (lint + tests), aucun test d'intégration existant cassé |
| 2 | PR touchant un fichier partagé ou un contrat d'interface | Project Lead (via processus RFC, §4) |
| 3 | Décision de découpage de domaine, création/suppression/fusion de domaine | Project Lead seul (§2.4) |

La CI est **toujours bloquante**, indépendamment du niveau de validation humaine. Les conventions
de branches et la gestion des conflits entre contributeurs travaillant sur un même domaine relèvent
de `CONVENTIONS.md`, pas de ce document.

---

## 7. Indicateurs de suivi

Retenus pour leur caractère actionnable — un indicateur qui ne change aucune décision n'a pas sa
place ici. Les valeurs numériques ci-dessous sont **indicatives**, destinées à être ajustées avec
l'expérience, et ne constituent pas des règles rigides du document :

1. **Tickets en attente de review au-delà d'un délai raisonnable** (indicatif : 48h) — signal
   d'attention, pas une anomalie processuelle en soi, dès lors que la règle §5 est respectée.
2. **Conflits Git par semaine** — doit tendre vers zéro si le découpage des domaines est correct.
3. **Taux d'escalade au Project Lead** (escalades / total des changements) — doit rester modéré ;
   la valeur cible dépend de la maturité du domaine (voir §2.2).
4. **Changements de contrat d'interface détectés a posteriori sans passage par le processus RFC** —
   doit être nul.
5. **PR qui cassent la CI d'un autre domaine** — mesure la stabilité des interfaces.
6. **Tickets RFC en attente de validation d'un propriétaire** — mesure préventive de la charge du
   processus RFC, avant qu'elle ne se traduise en blocage.
7. **Régressions détectées après fusion** — indicateur de qualité globale.

*(Le "temps moyen d'un ticket" est volontairement exclu : les tickets sont trop hétérogènes en
complexité pour que cette moyenne soit actionnable.)*

---

## 8. Gouvernance documentaire

Chaque document de gouvernance (`GOVERNANCE.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`,
`RFC-GUIDE.md`) possède un responsable, défini dans `CODEOWNERS`. Ce responsable garantit :
- la cohérence interne du document ;
- sa mise à jour lorsque la réalité du projet diverge de ce qu'il décrit ;
- sa conformité avec le document de niveau supérieur dans la hiérarchie
  (`MYBLAB-CONSTITUTION.md` → `GOVERNANCE.md` → `ARCHITECTURE.md` → ...).

---

## 9. Évolution de ce document

- `GOVERNANCE.md` peut être révisé sans réviser `MYBLAB-CONSTITUTION.md`, tant que les principes
  immuables de la constitution restent respectés.
- Toute révision significative de ce document passe par le processus RFC standard (§4.1), avec le
  Project Lead comme validateur final.
- Révision périodique recommandée à intervalle indicatif, ou dès qu'un problème de gouvernance
  concret est identifié — la périodicité n'est pas une contrainte rigide, une révision ad hoc est
  toujours possible si nécessaire.

---

## 10. Ce que ce document ne couvre pas

- L'organisation technique des domaines et interfaces → `ARCHITECTURE.md`.
- Les règles de code, de commit, de nommage, de gestion de branches et de conflits entre
  contributeurs → `CONVENTIONS.md`.
- L'attribution nominative des fichiers et des documents → `CODEOWNERS`.
- Le détail procédural complet des RFC → `RFC-GUIDE.md`.
- L'historique des décisions d'architecture → `ADR/`.
- L'identité des personnes physiques occupant les rôles → registre séparé (ex. `TEAM.md`).
