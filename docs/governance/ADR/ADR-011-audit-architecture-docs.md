# ADR-011 — Audit documentaire des références architecturales

**Statut :** ACCEPTED  
**Date :** 2026-08-20  
**Auteur :** Équipe Architecture MYBlab  
**Décideur :** Project Lead  
**Ticket associé :** MB-DOC-ARCH-001  
**Fondement :** Constitution (Articles 5, 14 et 15), Tome I (`MYBLAB_VISION_2030.md`, Engagement E4)

**Nature de cette ADR :** audit suivi d'une décision de gouvernance. L'audit a établi la recommandation ; la décision d'adoption a été prise par le Project Lead le 2026-08-20 après autorisation explicite de réviser l'Article 14 de la Constitution.

---

## Contexte

L'audit documentaire mené dans le cadre de MB-DOC-ARCH-001 a révélé que le dépôt contient trois documents distincts portant sur l'architecture de MYBlab, produits à des moments différents et à des niveaux de détail différents :

- `docs/architecture/01-ARCHITECTURE.md`
- `docs/governance/ARCHITECTURE.md`
- `docs/architecture/PLATFORM_ARCHITECTURE.md`

L'Article 14 de la Constitution établissait auparavant un niveau 3 nommé `ARCHITECTURE.md`, ce qui ne permettait pas d'identifier sans ambiguïté le document de référence.

## Constats de l'audit

- `01-ARCHITECTURE.md` décrit une couche d'implémentation toujours utile mais ne couvre pas à lui seul l'architecture plateforme actuelle.
- `governance/ARCHITECTURE.md` conserve des éléments de gouvernance et des décisions techniques historiques utiles.
- `PLATFORM_ARCHITECTURE.md` fournit le niveau plateforme le plus large et le plus explicitement structuré pour les invariants et frontières architecturales du projet.

L'audit a donc recommandé `PLATFORM_ARCHITECTURE.md` comme meilleur candidat pour le niveau 3.

## Décision

Le Project Lead autorise et adopte la révision de l'Article 14 de la Constitution afin que :

> **`docs/architecture/PLATFORM_ARCHITECTURE.md` devienne le document d'architecture de référence de niveau 3 de MYBlab.**

Cette décision est désormais inscrite dans la Constitution `docs/governance/MYBLAB-CONSTITUTION.md`.

La hiérarchie applicable est donc :

1. `MYBLAB-CONSTITUTION.md`
2. `GOVERNANCE.md`
3. `docs/architecture/PLATFORM_ARCHITECTURE.md`
4. `CONVENTIONS.md`
5. ADR / RFC
6. Documentation technique
7. Code source

Les documents `docs/governance/ARCHITECTURE.md` et `docs/architecture/01-ARCHITECTURE.md` sont conservés pour la traçabilité et l'historique. Ils ne peuvent pas prévaloir sur `PLATFORM_ARCHITECTURE.md` lorsqu'une décision concerne l'architecture plateforme de niveau 3.

## Conséquences

- Les futures décisions d'architecture plateforme doivent utiliser `PLATFORM_ARCHITECTURE.md` comme référence de niveau 3.
- Les documents historiques ne sont pas supprimés.
- Les décisions historiques encore valides peuvent être reprises progressivement dans la référence plateforme lorsque cela est nécessaire.
- Une modification future de cette hiérarchie doit suivre la gouvernance et, si elle touche à la Constitution, l'Article 15.
- Cette ADR ne constitue aucune autorisation d'implémentation logicielle.

## Alternatives écartées

- Faire coexister les trois documents sans hiérarchie explicite : écarté, car l'ambiguïté persisterait.
- Supprimer les deux documents historiques : écarté, car cela casserait la traçabilité.

## Traçabilité de la décision

- Audit initial ADR-011.
- Autorisation explicite du Project Lead le 2026-08-20.
- Révision de `docs/governance/MYBLAB-CONSTITUTION.md`, Article 14, le 2026-08-20.
- Présente décision ADR-011 rendue `ACCEPTED`.
