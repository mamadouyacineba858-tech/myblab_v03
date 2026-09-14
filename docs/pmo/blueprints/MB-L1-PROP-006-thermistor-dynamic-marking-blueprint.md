# MB-L1-PROP-006 — Thermistor dynamic nominal marking

## Contexte

Le renderer THERMISTOR affichait une pastille noire CSS/DOM avec les textes fixes `NTC` / `100-9`, alors que la source de vérité persistante existe déjà dans `component.parameters.resistance` (défaut canonique 10 kΩ, plage 100 Ω..1 MΩ).

## Décision CSA

- Réutiliser la silhouette physique CAPACITOR V2 déjà validée au Canvas, sans nouvelle R&D asset.
- Recaler cette silhouette dans la boîte THERMISTOR 84×36 avec un décalage +7 px X / +4 px Y : les pieds du corps coïncident avec les racines mécaniques THERMISTOR x=30/54, y=31.
- Rendre le corps noir par filtre visuel, sans modifier l'asset CAPACITOR partagé.
- Réutiliser le style de pattes `metallic-wire` déjà validé.
- Dériver un marquage EIA 3 chiffres depuis `parameters.resistance` via une primitive pure.
- Aucun modèle température → résistance dans ce ticket.

## Projection nominale

100 Ω→101, 1 kΩ→102, 10 kΩ→103, 47 kΩ→473, 100 kΩ→104, 220 kΩ→224, 470 kΩ→474, 1 MΩ→105.

Une valeur non représentable exactement (ex. 12 345 Ω) reste électriquement inchangée et ne reçoit aucun faux code.

## Invariants

- `parameters.resistance` reste l'unique source de vérité.
- Le marquage n'est jamais persisté.
- PhysicalContacts inchangés : A(30,62), B(54,62).
- Racines mécaniques inchangées : A(30,31), B(54,31).
- Aucune logique THERMISTOR dans PartRenderer/CircuitComponent/Pin.
- Aucun changement solver, History, Core, Scheduler ou environnemental.

## Gate Canvas

Vérifier 103 par défaut, puis 102 / 473 / 104 / 474, valeur 12 345 Ω neutre, pattes métalliques visibles, drag/wire/breadboard/zoom.
