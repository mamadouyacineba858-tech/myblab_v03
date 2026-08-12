# ADR-011 — Audit documentaire des références architecturales

**Statut :** PROPOSED
**Date :** 2026-08-10
**Auteur :** Équipe Architecture MYBlab
**Statut de validation :** En attente de validation par le Chief Software Architect
**Ticket associé :** MB-DOC-ARCH-001
**Fondement :** Constitution (Article 5), Tome I (`MYBLAB_VISION_2030.md`, Engagement E4)

**Nature de cette ADR :** audit et recommandation. Elle constate, analyse et recommande — elle ne reclasse, ne remplace, ni ne modifie aucune hiérarchie documentaire déjà établie par la Constitution. Toute évolution de l'Article 14 relève d'une décision distincte, conformément à l'Article 15 de la Constitution.

---

## Contexte

L'audit documentaire mené dans le cadre de MB-DOC-ARCH-001 a révélé que le dépôt contient trois documents distincts portant sur l'architecture de MYBlab, produits à des moments différents et à des niveaux de détail différents :

- `docs/architecture/01-ARCHITECTURE.md` (19/07/2026, statut interne « VALIDÉ Partiel »)
- `docs/governance/ARCHITECTURE.md` (introduit dans le même commit que `MYBLAB-CONSTITUTION.md`, se déclare lui-même conforme à la Constitution et à `GOVERNANCE.md`)
- `docs/architecture/PLATFORM_ARCHITECTURE.md` (structure gelée, dérivée du Tome I)

Aucun des trois ne fait référence aux deux autres. L'Article 14 de la Constitution mentionne un niveau 3 nommé `ARCHITECTURE.md`, sans lever l'ambiguïté sur lequel des trois documents il désigne — les trois portent, sous une forme ou une autre, ce nom.

Cette situation contredit l'Article 5 de la Constitution (« la documentation doit rester cohérente avec l'état réel du projet ») dans la mesure où elle ne l'enfreint pas activement, mais échoue à la garantir : sans hiérarchie explicite, rien n'empêche deux documents de continuer à diverger silencieusement.

## Problème

Trois questions restent sans réponse formelle :
1. Lequel de ces documents fait autorité en cas de contradiction ?
2. Quel niveau d'abstraction chacun est-il censé couvrir ?
3. Quand un document existant devrait-il être modifié, plutôt que d'en créer un nouveau ?

## Constats de l'audit

- `01-ARCHITECTURE.md` décrit fidèlement une couche du système (édition UI, historique, Command Pattern) toujours en service, mais sa description du « Document » comme source unique de vérité est dépassée par l'architecture Bridge construite depuis (dualité React / Document Core).
- `governance/ARCHITECTURE.md` converge, de façon indépendante et non concertée, avec plusieurs invariants du Tome II (dépendance strictement unidirectionnelle, indépendance de la Simulation vis-à-vis de l'UI). Son domaine Arduino (§5) reste directement pertinent et n'est contredit par rien de plus récent.
- `PLATFORM_ARCHITECTURE.md` est le seul des trois dont chaque élément est explicitement dérivé et tracé jusqu'au Tome I (piliers, principes, valeurs), conformément à l'Engagement E4.
- Le processus RFC, cité comme obligatoire par les deux documents antérieurs, n'a pas de procédure documentée dans le dépôt (`RFC-GUIDE.md` absent). Ce constat est factuel : cette ADR documente cette absence, elle ne crée ni ne remplace de procédure.

## Conclusions et recommandations

Cette ADR n'a pas autorité pour trancher la hiérarchie documentaire de la Constitution. Elle formule les recommandations suivantes, à faire valider séparément :

1. **L'audit conclut que `PLATFORM_ARCHITECTURE.md` est le meilleur candidat pour devenir le document d'architecture de référence** au niveau 3 de l'Article 14 — c'est le seul des trois dont chaque décision est explicitement justifiée par le Tome I. Cette évolution nécessite une révision distincte de l'Article 14, conformément à l'Article 15 de la Constitution, et ne peut être actée par la présente ADR.

2. **Il est recommandé que `docs/governance/ARCHITECTURE.md` et `docs/architecture/01-ARCHITECTURE.md` soient reclassés en documentation technique historique** une fois cette révision effectuée, plutôt que supprimés — leurs décisions encore valides (Command System, domaine Arduino, règle de dépendance unidirectionnelle) ont vocation à être reprises dans `PLATFORM_ARCHITECTURE.md`. Il est recommandé que les décisions encore valides soient reprises dans `PLATFORM_ARCHITECTURE.md` lors de sa rédaction ou de sa révision.

3. **Principe recommandé pour la suite** : un document n'est modifié, plutôt que remplacé par un nouveau, que s'il reste le document de référence de son niveau au moment de la modification. Un nouveau document d'architecture ne devrait être créé que pour un domaine ou un niveau d'abstraction non encore couvert par un document faisant déjà autorité.

## Alternatives envisagées

- **Faire coexister les trois documents sans hiérarchie explicite** — l'audit ne recommande pas cette option, car elle maintient l'ambiguïté documentaire identifiée et ne répond pas à l'Article 5.
- **Recommander la suppression pure et simple des deux documents historiques** — l'audit ne recommande pas cette option, car ils contiennent des décisions encore valides, et leur suppression romprait la traçabilité qu'exige l'Article 5.

## Suite recommandée, hors périmètre de cette ADR

1. Décision distincte du Project Lead sur la révision de l'Article 14 (Article 15 de la Constitution).
2. Si cette révision est engagée : une seconde ADR (`ADR-012`, par exemple « Adoption de `PLATFORM_ARCHITECTURE.md` comme référence architecturale ») pour en tirer les conséquences opérationnelles — reclassement effectif des deux documents historiques, mise à jour de la hiérarchie.
3. Reprise de la rédaction de la section 1 (Introduction) de `PLATFORM_ARCHITECTURE.md`, une fois ces deux étapes closes.

## Conséquences

Cette ADR n'introduit aucune modification du dépôt. Elle documente un état documentaire observé et formule des recommandations destinées à éclairer des décisions ultérieures relevant de la gouvernance du projet.