# Amendement — Validation formelle de l'axe EXP-VIS

**Date :** 2026-08-25
**Statut :** APPLIQUÉ — amendement documentaire de référence
**Portée :** valider formellement `EXP-VIS` comme sous-axe de l'Épic Experience de `ROADMAP_PLATFORM.md`.

## 1. Contexte

`docs/roadmaps/amendments/2026-08-20-MB-VIS-002.md` avait proposé `EXP-VIS — Réalisme et fidélité de représentation` comme rattachement stratégique du travail déjà livré sous `MB-VIS-002`, en le marquant explicitement « proposition d'amendement de roadmap » soumise à validation PMO/CSA — pas encore un Épic officiel.

L'amendement `2026-08-22-P2-0-reconciliation.md` a ensuite recensé ce point comme resté ouvert (§3 : « `EXP-VIS` | rattachement stratégique non définitivement validé | décision PMO/CSA »), et `2026-08-22-platform-roadmap-reconciliation.md` a explicitement rappelé qu'il « ne valide pas EXP-VIS ».

Depuis le 2026-08-20, aucun document n'a ni confirmé ni rejeté ce rattachement — `docs/pmo/tickets/MB-VIS-002.md` et son Delivery Report le décrivent toujours comme provisoire.

## 2. Décision

`EXP-VIS — Réalisme et fidélité de représentation` est désormais validé comme sous-axe officiel de l'Épic **Experience** de `ROADMAP_PLATFORM.md`, au même titre que `EXP1` et `EXP2`.

Statut stratégique retenu : **Réalisé techniquement** (premier jalon), par cohérence avec le traitement déjà appliqué à `EXP2` par `2026-08-22-platform-roadmap-reconciliation.md` §2 — un état technique intégré et attesté (ici, `MB-VIS-002`, régularisé par son propre Delivery Report) ne doit pas rester invisible dans la roadmap.

## 3. Portée du rattachement

`EXP-VIS` couvre les travaux visant à faire progresser la représentation visuelle des composants et de l'environnement de circuit depuis la représentation schématique vers le seuil de référence Tinkercad, puis vers des capacités propres à MYBlab — périmètre inchangé par rapport à la proposition du 2026-08-20.

Premier jalon rattaché : `MB-VIS-002` (premier lot de renderers réalistes : RESISTOR, LED, CAPACITOR, DIODE), déjà régularisé documentairement.

## 4. Ce que cet amendement ne fait PAS

- Il ne crée aucun nouveau Ticket PMO et n'autorise aucune implémentation.
- Il ne remplace pas `EXP2` (visualisation des fils), qui reste un axe distinct.
- Il ne constitue pas une décision de passage à la 3D.
- Il ne modifie pas les responsabilités du Core ou de la Simulation.
- Il ne transforme pas les benchmarks externes (Tinkercad) en spécifications techniques à reproduire — cf. `docs/roadmaps/PHASE2_CONTROL_FRAMEWORK.md` §7.
- Il ne préjuge pas du périmètre d'un éventuel second lot de renderers réalistes.

## 5. Mise à jour de la chaîne de traçabilité

```text
ROADMAP_PLATFORM.md — Programme Experience
        │
        ├── EXP1 — Formalisation/clôture MB-VIS-001
        ├── EXP2 — Visualisation des fils (MB-VIS-004, MB-VIS-005)
        └── EXP-VIS — Réalisme et fidélité de représentation (ce document)
                    │
                    └── MB-VIS-002 — premier lot de renderers réalistes (régularisé)
```

Toute future extension du réalisme visuel (au-delà du premier lot RESISTOR/LED/CAPACITOR/DIODE) reste soumise à un nouveau Ticket PMO rattaché à `EXP-VIS`, sans réouverture de la présente validation.

## 6. Conséquence

`docs/pmo/tickets/MB-VIS-002.md` et `docs/pmo/delivery-reports/MB-VIS-002-delivery-report.md` peuvent désormais considérer leur rattachement à `EXP-VIS` comme définitif, et non plus provisoire. Aucune modification de ces deux documents n'est requise par le présent amendement : leur texte descriptif reste exact, seul le statut de validation de l'axe change, ici, en amont.
