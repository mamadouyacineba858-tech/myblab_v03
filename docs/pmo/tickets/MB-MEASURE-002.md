# MB-MEASURE-002 — Live Minimum Instrumentation Integration

**Type :** Capability Integration / Level-1 Gate Closure

**Priorité :** P2 — obligatoire avant sortie du gate Level 1

**Dépendances :** MB-MEASURE-001, MB-OBS-001, MB-OBS-002, MB-OBS-003, MB-L1-CVE-001, MB-VIS-TINKERCAD-048

**Objectif :** rendre disponible dans le produit réel le dispositif minimal de mesure tension/courant déjà supporté par l'architecture Measurement/Observation, sans reconstruire ni dupliquer cette architecture.

## Périmètre

- Ouverture/fermeture d'un panneau d'instrumentation depuis le Navbar ("📊 Mesures").
- Modes `VOLTAGE`/`CURRENT` (exactement ceux déjà supportés par `MeasurementMode`).
- Targets `PIN` dérivées du circuit réel (composants + pins Presentation, `componentDefinitions.js`).
- Affichage `value` / `unit` / `status` / `reason`.

## Hors périmètre

`TemporalObservationPanel`, oscilloscope, waveform temps réel, trigger, FFT, curseurs, autoscale avancé, multi-canal, acquisition continue, historique de mesure, export waveform, RESISTANCE/POWER/CAPACITANCE/OSCILLOSCOPE/FREQUENCY comme nouveaux modes.

## Ruling architectural

```text
UI live
 ↓
LiveMeasurementPanel (Presentation, nouveau)
 ↓
MeasurementPanel (MB-MEASURE-001, inchangé)
 ↓
measurementContract.measure() (MB-MEASURE-001, inchangé)
 ↓
observationContract.observe() (MB-OBS-001, inchangé)
 ↓
Simulation (preparation.js/resolution.js, inchangés)
```

`measurementContract.js` reste la frontière utilisateur canonique. `observationContract.js` reste la frontière canonique vers Simulation. Aucun des deux n'a été modifié par ce ticket. `LiveMeasurementPanel.jsx` n'importe jamais `resolution.js`, `preparation.js`, `dcContributionRegistry.js`, `canonicalRegistry.js` ni `engine.js` (verrouillé par un test structurel, TEST T12).

## Fichiers créés

- `frontend/src/measurement/LiveMeasurementPanel.jsx`
- `frontend/src/measurement/LiveMeasurementPanel.css`
- `frontend/src/measurement/__tests__/LiveMeasurementPanel.test.jsx`
- `docs/pmo/blueprints/MB-MEASURE-002-live-minimum-instrumentation-blueprint.md`
- `docs/pmo/tickets/MB-MEASURE-002.md`
- `docs/pmo/delivery-reports/MB-MEASURE-002-delivery-report.md`

## Fichiers modifiés

- `frontend/src/components/Navbar.jsx` — bouton "Mesures" + montage conditionnel de `LiveMeasurementPanel`, même patron que `SettingsPanel`.
- `frontend/src/App.css` — surcharges `.theme-light` pour `.measurement-live-panel`, même patron que `.settings-panel`/`.component-inspector`.

`App.jsx` n'a **pas** été modifié : `LiveMeasurementPanel` est monté depuis `Navbar.jsx`, exactement comme `SettingsPanel` l'est déjà — ce patron déjà établi évite une modification d'`App.jsx` non nécessaire.

## Critères d'acceptation

Voir le Delivery Report — AC-01 à AC-20, tous statués.
