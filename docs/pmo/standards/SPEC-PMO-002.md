# SPEC-PMO-002 — Standard officiel du Contrat d'Exécution (Execution Contract / Ticket)

**Statut :** 🟢 STANDARD OFFICIEL
**Version :** 1.0
**Date d'entrée en vigueur :** 2026-08-02
**Auteur :** DeepSeek (Lead Solution Designer)
**Validation :** ChatGPT (Chief Software Architect & PMO Director) — ✅ APPROUVÉ
**Validation :** Claude (Repository Integration Manager) — ✅ APPROUVÉ

---

## Préambule

Le Ticket est le **Contrat d'Exécution et de Validation** de MYBlab 2030.

Il constitue l'unité opérationnelle fondamentale du PMO IA. Chaque développement,
correction ou évolution est formalisé dans un Ticket.

> Le Ticket formalise un engagement entre le PMO et les acteurs du développement
> concernant un objectif mesurable de la Vision MYBlab 2030.

Le Ticket décrit **ce qui doit être réalisé** et **pourquoi**, sans jamais entrer
dans des détails techniques dépendant de l'état du dépôt Git. Les informations
techniques (fichiers, interfaces, dépendances, conventions, impacts, tests
existants) relèvent exclusivement de l'**Execution Blueprint** (SPEC-PMO-003),
produit par Claude.

Le Ticket est un **artefact stratégique et fonctionnel**, conçu pour rester
stable et pertinent indépendamment des évolutions du code.

### Règle de stabilité

Le Ticket ne dépend **jamais** de l'état du dépôt Git. Il reste valable même si
le code évolue significativement entre sa rédaction et son exécution.

### Règle d'autonomie

Le Ticket est un artefact **autonome**. Il ne contient aucune référence à une
conversation. Il peut être compris et exploité indépendamment de son contexte
de création.

---

## A. IDENTITÉ

Identifie de manière unique le Ticket et le situe dans la hiérarchie stratégique.

**Champs obligatoires**

| Champ | Type | Règle de remplissage |
|---|---|---|
| `Ticket-ID` | Chaîne | Format `DOMAINE-FAMILLE-NNN` (ex : `MB-SIM-001`, `MB-ARD-012`, `MB-GOV-002`) |
| `Titre` | Chaîne | Court, unique, explicite, orienté objectif |
| `Pilier` | Chaîne | Doit correspondre à un Pilier officiel de la Vision 2030 |
| `Programme` | Chaîne | Doit correspondre à un Programme officiel du Pilier |
| `Épic` | Chaîne | Doit correspondre à un Épic officiel du Programme |
| `Type` | Énum | `FEATURE`, `BUGFIX`, `REFACTOR`, `MAINTENANCE`, `RESEARCH`, `DOCUMENTATION`, `SECURITY`, `STUDY` |
| `Importance` | Énum | `CRITICAL`, `HIGH`, `NORMAL`, `LOW` |
| `Urgence` | Énum | `IMMEDIATE`, `THIS_RELEASE`, `NEXT_RELEASE`, `BACKLOG` |

**Champs optionnels** : `Sous-tickets` (liste de Ticket-ID), `Tags`

**Règles de validation**
- `Ticket-ID` unique dans l'ensemble du projet.
- `Titre` compréhensible sans connaissance du code.
- `Pilier` / `Programme` / `Épic` doivent exister dans la feuille de route officielle.
- `Importance = CRITICAL` ne peut être attribuée que par le Project Lead.

**Informations interdites** : fichiers, fonctions, classes, modules spécifiques ; détails d'implémentation ; noms d'IA/agent.

---

## B. MISSION

Explique **pourquoi** le Ticket existe.

**Champs obligatoires**

| Champ | Type | Règle |
|---|---|---|
| `Problème à résoudre` | Texte (≤500c) | Formulation fonctionnelle, sans référence au code |
| `Contexte stratégique` | Texte (≤300c) | Lien explicite avec la Vision MYBlab 2030 |
| `Bénéfice attendu` | Texte (≤200c) | Mesurable ou qualifiable |

**Champs optionnels** : `Utilisateurs concernés`, `Cas d'usage`

**Informations interdites** : solution technique, référence à une implémentation, pseudo-code.

---

## C. CONTRAT D'EXÉCUTION

Définit **ce qui doit être fait**, **ce qui est exclu**, et le degré de liberté accordé.

**Champs obligatoires**

| Champ | Type | Règle |
|---|---|---|
| `Périmètre inclus` | Texte (≤500c) | Description fonctionnelle précise |
| `Périmètre exclu` | Texte (≤500c) | Limites claires, même si évidentes |
| `Niveau de liberté` | Énum | `DIRECTIVE` (solution imposée) / `CONCEPTION` (solution libre) / `RESEARCH` (étude comparative) |
| `Performances attendues` | Texte (≤200c) | Termes mesurables, sans techno imposée |
| `Livrables attendus` | Liste | `CODE`, `TESTS`, `DOCUMENTATION`, `EXAMPLES`, `STUDY_REPORT`, `ARCHITECTURE`, `NONE` |

**Champs optionnels** : `Zones fonctionnelles interdites`, `Spécifications complémentaires`

**Règles de validation**
- Si `Niveau de liberté = DIRECTIVE`, une spécification détaillée doit être fournie.
- `Livrables attendus = NONE` autorisé uniquement pour `STUDY` / `RESEARCH`.

**Informations interdites** : fichiers, fonctions, classes, modules, packages, dépendances techniques, interfaces/API spécifiques, conventions de code.

---

## D. CONTRAT DE VALIDATION

Définit **quand** le Ticket est terminé et **comment** le vérifier.

**Champs obligatoires**

| Champ | Type | Règle |
|---|---|---|
| `Critères d'acceptation` | Liste | Chaque critère testable et binaire (réussi/échoué) |
| `Tests obligatoires` | Liste | Termes fonctionnels, sans code |
| `Conditions de refus` | Liste | Explicites, sans ambiguïté |
| `Preuves de validation` | Liste | `Logs`, `Captures d'écran`, `Rapports de test`, `Démonstration` |

**Champs optionnels** : `Métriques de qualité`, `Scénarios de validation`

**Informations interdites** : commandes de test spécifiques, détails d'implémentation des tests.

---

## E. CONTEXTE STRATÉGIQUE

**Champ obligatoire** : `Justification de priorité` (≤200c)

**Champs optionnels** : `Tickets bloquants`, `Tickets bloqués`, `Jalon / Version`, `Échéance stratégique`

**Règle de validation** : les `Tickets bloquants` doivent être `CLOS`/`VALIDÉ` avant passage en `EN COURS`.

**Informations interdites** : toute information technique ou d'implémentation.

---

## F. GESTION PMO

**Champs obligatoires** : `Date de création` (ISO `AAAA-MM-JJ`), `Cycle PMO`

**Cycle PMO** : `DRAFT → VALIDÉ → EN COURS → EN AUDIT → EN INTÉGRATION → TERMINÉ → CLOS`
(avec possibilité de retour `EN AUDIT → REJETÉ`)

**Champs optionnels** : `Date souhaitée`, `Date de clôture`, `Notes internes`, `Historique des statuts`

**Règle** : un Ticket ne peut être `CLOS` que si un Delivery Report est associé.

**Informations interdites** : information technique/fonctionnelle, appréciation qualitative non mesurable.

---

## G. HISTORIQUE DES DÉCISIONS

Aucun champ obligatoire.

**Champ optionnel** : `Décisions` — liste de (Date, Auteur, Décision, Justification)

Toute décision ajoutée après validation initiale doit être datée et justifiée.

**Informations interdites** : information technique/d'implémentation (→ Delivery Report), commentaire informel ou subjectif.

---

## Principes transversaux

**Règle d'or** : Le Ticket décrit le problème. Le Blueprint décrit le terrain.

---

## Historique de validation

| Rôle | Validation | Date |
|---|---|---|
| DeepSeek (Lead Solution Designer) | ✅ Proposition soumise | 2026-08-02 |
| ChatGPT (Chief Software Architect & PMO Director) | ✅ APPROUVÉ | 2026-08-02 |
| Claude (Repository Integration Manager) | ✅ APPROUVÉ | 2026-08-02 |
