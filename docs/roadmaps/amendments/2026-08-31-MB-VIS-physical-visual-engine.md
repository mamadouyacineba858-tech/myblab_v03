# Amendement — Réévaluation de la trajectoire visuelle (MYBlab Physical/Realistic Visual Engine)

**Date :** 2026-08-31
**Statut :** APPLIQUÉ — amendement documentaire de référence
**Portée :** acter la mise en pause de la progression composant-par-composant de l'Épic **EXP3** de `ROADMAP_PLATFORM.md` après le premier lot expérimental, et inscrire la trajectoire de réévaluation architecturale visuelle qui la précède désormais.
**Autorité :** CSA / Architecte en Chef — directive `MB-VIS-REVIEW-001`.

## 1. Contexte

Entre le 2026-08-30 et le 2026-08-31, cinq renderers de composants ont été portés à un langage visuel « volumétrique SVG » (gradients namespacés par `uid`, pattes métalliques, tranche de profondeur, faible compte de primitives, rendu déterministe), chacun sous Blueprint + Ticket + CSA GO, avec périmètre strict (un renderer par ticket) :

| Ticket | Composant | Commit |
| --- | --- | --- |
| MB-VIS-LED-010 | RESISTOR | `b964a86` |
| MB-VIS-COMP-011 | CAPACITOR | `697f50e` |
| MB-VIS-LED-012 | DIODE | `43db4ef` |
| MB-VIS-LED-013 | LDR | `f31ef3b` |
| MB-VIS-LED-014 | THERMISTOR | `6c2b5f1` |

Le CSA a ensuite fourni une **nouvelle référence visuelle d'ambition** : une interface de laboratoire électronique où les composants doivent donner l'impression d'être de véritables objets physiques posés sur un plan de travail, et non des icônes SVG améliorées. Cette référence n'est pas à reproduire pixel par pixel ; elle fixe le niveau d'ambition.

Le CSA a jugé que l'approche « amélioration composant par composant avec des gradients SVG » est **insuffisante** pour atteindre ce niveau d'ambition, et a émis la directive `MB-VIS-REVIEW-001` (audit global lecture seule + mise à jour de roadmap).

## 2. Décision

1. La progression composant-par-composant de l'Épic **EXP3** (séquence PMO §7.2, entrées V2 à V12) est **mise en pause** après le premier lot ci-dessus.
2. Ce premier lot (RESISTOR / CAPACITOR / DIODE / LDR / THERMISTOR) constitue désormais une **base expérimentale validée techniquement**, et **non** le standard visuel final de MYBlab. Ses commits ne sont ni réécrits, ni annulés, ni déplacés.
3. La référence visuelle fournie par le CSA devient la **référence d'ambition artistique** de la trajectoire visuelle (EXP3 → EXP4 → EXP5), au même titre de « benchmark et source d'inspiration » que Tinkercad (cf. `ROADMAP_PLATFORM.md` §1.1, R8) — pas une spécification à copier.
4. Avant toute reprise des renderers restants, MYBlab effectue une **réévaluation globale de son architecture visuelle** : inventaire, matrice de maturité, audit de la breadboard, audit technologique (SVG enrichi / SVG + raster / 2.5D / Canvas 2D / WebGL / Three.js / React Three Fiber / hybride), audit architectural, nouveau contrat visuel, prototypes de validation.

## 3. Nouvelle trajectoire obligatoire

```text
PHASE V0 — Baseline actuelle (premier lot volumétrique SVG)
    ↓
MB-VIS-REVIEW-001 — Global Renderer & Visual Architecture Audit
    ↓
Technology Review — SVG enrichi / SVG+raster / 2.5D / Canvas 2D / WebGL / Three.js / RTF / hybride
    ↓
MB-VIS-RENDER-010 — Physical Component Visual Contract (nouveau contrat visuel)
    ↓
Prototype visuel contrôlé
    ↓
MB-VIS-PROTOTYPE-001/002/003 — RESISTOR + LED + SERVO ou DC MOTOR
    ↓
CSA Visual GO — validation du langage visuel ET de la technologie de rendu
    ↓
Architecture visuelle validée
    ↓
MB-VIS-INDUSTRIAL-001 — Industrialisation du renderer visuel
    ↓
Bibliothèque physique réaliste (tickets composants restants, re-séquencés)
    ↓
Évolution vers laboratoire virtuel immersif (EXP5)
```

Cette trajectoire s'insère **avant** la reprise de la séquence PMO EXP3 §7.2 pour les composants ; elle ne supprime aucune entrée de cette séquence. Les entrées V13 et suivantes (fils, breadboard, canvas, états, cohérence globale, QA visuelle, gate Tinkercad) restent valides et seront re-priorisées à la sortie de `MB-VIS-REVIEW-001` et de `MB-VIS-RENDER-010`.

## 4. Règle de gouvernance

**Aucun nouveau Ticket PMO d'amélioration visuelle composant-par-composant ne doit être lancé avant la validation CSA explicite du nouveau langage visuel (`MB-VIS-RENDER-010`) et de la technologie de rendu retenue (Technology Review).**

Cette règle complète, sans la remplacer, la règle §7.3.1 de `ROADMAP_PLATFORM.md` (« Audit avant implémentation »).

## 5. Ce que cet amendement ne fait PAS

- Il ne crée aucun nouveau Ticket PMO dans le dépôt et n'autorise aucune implémentation de renderer.
- Il ne réécrit, n'annule et ne déplace aucun ticket déjà terminé ni aucun de leurs commits.
- Il ne supprime aucune entrée de la séquence EXP3 §7.2 ni aucun jalon (J6, J7 inchangés).
- Il ne constitue pas une décision de passage à la 3D ni un choix de technologie de rendu : le choix relève de la Technology Review de `MB-VIS-REVIEW-001` puis d'une décision CSA/ADR.
- Il ne modifie aucune responsabilité du Core, de la Simulation, ni aucun contrat fonctionnel (dimensions canoniques, pins, connexions, sélection, drag, câblage — cf. `ROADMAP_PLATFORM.md` §7.3.4 et Tome II).
- Il ne transforme pas la référence visuelle fournie en spécification technique à reproduire.

## 6. Mise à jour de la chaîne de traçabilité

```text
ROADMAP_PLATFORM.md — Programme Experience
        │
        ├── EXP1 — Formalisation/clôture MB-VIS-001
        ├── EXP2 — Visualisation des fils
        ├── EXP-VIS — Réalisme et fidélité de représentation (amendement 2026-08-25)
        │        └── MB-VIS-002 → MB-VIS-RENDER-009 → premier lot volumétrique SVG
        │                                              (MB-VIS-LED-010 … MB-VIS-LED-014)  ← PHASE V0
        └── EXP3 — Parité visuelle composants & expérience — seuil Tinkercad
                 └── §7.4 (nouveau) — MYBlab Physical/Realistic Visual Engine (ce document)
                          └── MB-VIS-REVIEW-001 → MB-VIS-RENDER-010 → MB-VIS-PROTOTYPE-00x
                                   → CSA Visual GO → MB-VIS-INDUSTRIAL-001 → composants restants
```

## 7. Conséquence

`ROADMAP_PLATFORM.md` reçoit une nouvelle sous-section **§7.4** consacrée à cette trajectoire, placée à l'intérieur du Programme Experience après §7.3, sans modification des sections existantes autres que l'ajout d'un renvoi depuis §7.3 et §17. Les Tickets PMO du premier lot et leurs Delivery Reports restent exacts et ne sont pas modifiés par le présent amendement.
