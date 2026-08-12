# SPEC-PMO-003 — Standard officiel de l'Execution Blueprint

**Statut :** 🟢 STANDARD OFFICIEL
**Version :** 1.0
**Date d'entrée en vigueur :** 2026-08-02
**Auteur :** Claude (Repository Analyst)
**Validation :** ChatGPT (Chief Software Architect & PMO Director) — ✅ APPROUVÉ
**Validation :** DeepSeek (Lead Solution Designer) — ✅ APPROUVÉ

---

## Préambule

Le Blueprint est un **dossier d'expertise du dépôt**, produit par Claude
(Phase 1 — Repository Analyst) à partir de l'état réel du dépôt Git, à un
instant T, pour un Ticket donné.

> Le Blueprint doit fournir toutes les informations nécessaires pour permettre
> à l'agent concepteur de réaliser sa mission sans avoir à explorer lui-même
> le dépôt Git.

Cette formulation est volontairement générique : le standard doit survivre à
tout changement d'agent concepteur.

Contrairement au Ticket (stable), le Blueprint **dépend de l'état du dépôt** au
moment de sa rédaction. Il porte un horodatage et une référence au commit
exact analysé.

### Principe de vérifiabilité (obligatoire, transversal)

Chaque information du Blueprint appartient strictement à l'une de ces trois
catégories — aucune autre n'est autorisée :

| Étiquette | Signification | Origine |
|---|---|---|
| `[FAIT]` | Vérifiable directement dans le dépôt | Extraction (signatures, extraits, versions, dépendances) |
| `[ANALYSE]` | Interprétation argumentée de Claude | Jugement (risque, hypothèse, conseil, impact estimé) |
| `[QUESTION OUVERTE]` | Nécessite un arbitrage avant de pouvoir avancer | Ambiguïté, incohérence, décision architecturale manquante |

### Règle de sélection du contexte source

Claude fournit tout le contexte source nécessaire pour comprendre la zone
concernée, et rien de plus. Le critère est la **cohérence fonctionnelle**,
jamais un nombre de lignes.

---

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Description |
|---|---|
| `Blueprint-ID` | `{Ticket-ID}-blueprint` |
| `Ticket-ID` | Référence au Ticket source (doit exister dans `docs/pmo/tickets/`) |
| `Commit analysé` | SHA Git exact |
| `Date de production` | — |
| `Auteur` | Toujours `Claude — Repository Analyst` |
| `Statut` | `DRAFT`, `PRÊT_POUR_CONCEPTION`, `OBSOLÈTE` |

**Règle** : un Blueprint référençant un commit qui n'est plus la HEAD de `main`
doit être marqué `OBSOLÈTE` avant réutilisation.

---

## B. SYNTHÈSE POUR L'AGENT CONCEPTEUR

| Champ | Description |
|---|---|
| `Résumé de la zone concernée` | 2-3 phrases, situation dans l'architecture réelle |
| `Point d'entrée recommandé` | Fichier/module par lequel raisonner en premier |
| `Pattern existant à réutiliser` | Ex : mécanisme déjà en place à ne pas dupliquer |

---

## C. CONTEXTE TECHNIQUE — `[FAIT]`

- Stack & versions concernées
- Extraits de code source réels (verbatim, périmètre = cohérence fonctionnelle)
- Interfaces / types publics touchés (signatures exactes)
- Conventions locales observées (déduites du code réel du module)

---

## D. DÉPENDANCES & IMPACT — `[FAIT]` (Niveau 2, si pertinent)

- Dépendances entrantes / sortantes
- Tests existants sur la zone (contenu, pas juste liste)
- Fichiers potentiellement impactés

Cette section n'apparaît que si le Ticket touche du code existant et
interconnecté.

---

## E. SIGNAUX D'ATTENTION — `[ANALYSE]` (conditionnel)

- Zones fragiles ou interdites
- Décisions passées pertinentes (ex : approche similaire revert dans l'historique)
- Risques de régression identifiés

**Règle d'inclusion** : la présence de cette section dépend de la **complexité
du contexte analysé**, jamais du type administratif du Ticket.

Obligatoire lorsque : plusieurs modules interagissent · plusieurs stratégies
possibles · risque de régression réel · décision architecturale nécessaire.

Facultative lorsque : ticket local et isolé · impact évident · aucune ambiguïté.

---

## F. CONTRAINTES DE CONCEPTION

| Champ | Description |
|---|---|
| `Niveau de liberté` | Recopié du Ticket |
| `Mode d'exécution recommandé` | `Blueprint` ou `Implémentation` (proposition Claude, décision ChatGPT) |
| `Contraintes issues du contexte technique` | Ex : compatibilité avec un mécanisme existant |

---

## G. GESTION PMO

`Statut Blueprint`, `Historique de régénération`

---

## H. QUESTIONS OUVERTES — `[QUESTION OUVERTE]`

| Champ | Description |
|---|---|
| `Ambiguïtés observées` | Ce que le dépôt ne permet pas de trancher seul |
| `Décisions architecturales manquantes` | Choix non documentés/tranchés dans le code |
| `Informations absentes` | Ce qu'il faudrait pour lever une incertitude |
| `Arbitrage demandé` | À qui revient la décision |

**Règle de traitement** : une `QUESTION OUVERTE` non résolue **bloque** le
passage du Blueprint en statut `PRÊT_POUR_CONCEPTION`. L'agent concepteur ne
doit jamais supposer une réponse à une question classée ici.

**Exception — `QUESTION OUVERTE NON BLOQUANTE`** : le Chief Software Architect
peut, par un arbitrage explicite, daté et portant sur une question précise,
qualifier celle-ci de `NON BLOQUANTE`. Une question ainsi qualifiée reste non
résolue sur le fond, continue de figurer dans le Blueprint sous l'étiquette
`[QUESTION OUVERTE — NON BLOQUANTE]`, et ne bloque plus, à elle seule, le
passage en `PRÊT_POUR_CONCEPTION`. Cette qualification ne dispense d'aucun
arbitrage : elle **constitue** l'arbitrage exigé par le principe de
vérifiabilité. Elle ne s'applique qu'à la question expressément visée par
l'arbitrage et ne doit jamais être présumée, ni étendue par analogie à
d'autres questions, par l'agent rédacteur.

---

## Historique de validation

| Rôle | Validation | Date |
|---|---|---|
| Claude (Repository Analyst) | ✅ Proposition + intégration corrections | 2026-08-02 |
| ChatGPT (Chief Software Architect) | ✅ Approuvé (95% + ajustements) | 2026-08-02 |
| DeepSeek (Lead Solution Designer) | ✅ APPROUVÉ | 2026-08-02 |
