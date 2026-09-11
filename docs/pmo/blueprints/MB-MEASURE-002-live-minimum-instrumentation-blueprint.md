# Blueprint — MB-MEASURE-002 : Live Minimum Instrumentation Integration

## A. Contexte

Le gate `MB-VIS-TINKERCAD-048` (Level-1 Comparative Gate) a identifié un P2 : aucun instrument de mesure n'est disponible dans l'application MYBlab réelle, bien que `MeasurementPanel`/`TemporalObservationPanel` existent déjà en source.

L'audit CSA a établi que la capacité technique existe intégralement :

- `MB-OBS-001` (`observationContract.js`) — frontière canonique Simulation → futurs consommateurs.
- `MB-OBS-002` (`temporalObservationContract.js`) — observation temporelle (hors scope ici).
- `MB-OBS-003` (`TemporalObservationPanel.jsx`) — démonstrateur temporel (hors scope ici).
- `MB-MEASURE-001` (`measurementContract.js` + `MeasurementPanel.jsx`) — instrument de référence VOLTAGE/CURRENT, déjà validé par ses propres suites de tests, mais **jamais monté dans `App.jsx`**.

Il ne s'agit donc pas d'un manque de capacité technique, mais d'une absence pure d'intégration produit : le moteur existe, l'utilisateur ne peut pas l'atteindre.

## B. Architecture

```text
Live Presentation (Navbar → LiveMeasurementPanel)
      ↓
MeasurementPanel        (MB-MEASURE-001, inchangé)
      ↓
measurementContract     (MB-MEASURE-001, inchangé)
      ↓
Observation             (MB-OBS-001, inchangé)
      ↓
Simulation               (preparation.js/resolution.js, inchangés)
```

`LiveMeasurementPanel.jsx` est une couche d'adaptation Presentation pure : elle ne fait que dériver la liste de targets utilisateur à partir du circuit réel et la transmettre à `MeasurementPanel` sans aucun calcul.

## C. Source de vérité

Le Document courant (`useCircuitState.js`, exposé via `CircuitContext`/`CircuitInteractionContext`) reste l'unique source de vérité. `LiveMeasurementPanel` ne recopie jamais durablement `components`/`wires`/`parameters` — il les lit à chaque rendu depuis le contexte React, et ne les persiste dans aucun état local. Le seul état local du parcours (mode, target sélectionné, dernier résultat) appartient déjà à `MeasurementPanel` (MB-MEASURE-001, inchangé).

## D. Targets

Dérivées exclusivement des composants réellement présents (`useCircuitInteraction().components`) et de leur schéma de pins Presentation (`config/componentDefinitions.js`, **jamais** `canonicalRegistry.js`) : pour chaque composant, pour chaque pin déclaré, une target `{kind:"PIN", componentUid, pinId, label}`. Aucune liste statique, aucun UID de démonstration.

## E. Lifecycle

```text
Open panel (bouton "Mesures" du Navbar)
  ↓
Select mode (VOLTAGE | CURRENT)
  ↓
Select target (dérivée du circuit réel)
  ↓
Measure (measure() -> observe() -> Simulation)
  ↓
Display result (value, unit, status, reason?)
  ↓
Close panel
```

## F. Performance

`LiveMeasurementPanel` n'est monté que lorsque `measurementOpen === true` (état local à `Navbar.jsx`, même patron que `SettingsPanel`). Tant que le panneau est fermé, aucun composant ne souscrit à `useCircuitInteraction()` pour les besoins de l'instrumentation — le coût de lecture du contexte haute fréquence n'existe que pendant l'ouverture effective. `wires` est lu depuis le contexte **stable** (`useCircuit()`), déjà exposé sans coût additionnel. Aucun champ n'a été déplacé entre `CircuitContext` et `CircuitInteractionContext` : l'isolation `MB-VIS-CANVAS-051` reste intacte (reconfirmé par la suite `CanvasPerformanceIsolation.test.jsx`, 4/4 PASS, inchangée).

## G. Error handling

`MeasurementPanel` (inchangé) affiche déjà `VALID`/`UNAVAILABLE`/`INVALID` et le champ `reason` lorsqu'il existe — vocabulaire réutilisé tel quel depuis `MB-OBS-001`, aucune nouvelle catégorie de statut introduite par ce ticket.

## H. Scope

`VOLTAGE` + `CURRENT` uniquement (modes déjà supportés par `MeasurementMode`, MB-MEASURE-001). Aucun ajout de RESISTANCE/POWER/CAPACITANCE/OSCILLOSCOPE/FREQUENCY.

## I. Non-scope

`TemporalObservationPanel` reste non monté. Aucune capacité oscilloscope/waveform/trigger/FFT/curseurs/autoscale/multi-canal/acquisition continue/historique/export n'est introduite — appartiennent à un futur niveau MYBlab.

## J. Validation

- Tests unitaires/d'intégration : `frontend/src/measurement/__tests__/LiveMeasurementPanel.test.jsx` (11 tests, T1-T12).
- Suites existantes Measurement/Observation : 147/147 PASS (aucune modification de ces fichiers).
- Suite complète canonique : baseline 50 FAIL / 2709 PASS (12 fichiers) strictement préservée.
- Build, typecheck, `git diff --check` : PASS.
- Navigateur réel : scénario complet §16 du ticket, VOLTAGE/CURRENT VALID démontrés sur un circuit POWER→RESISTOR→GND réel, UNAVAILABLE démontré sur une LED (type non enregistré dans `dcContributionRegistry`), Component Values croisé (220 Ω → 1000 Ω → courant mesuré change réellement, 0 calcul dans l'UI), thèmes clair/sombre, 0 erreur console.

## K. Limitation connue (documentée, non corrigée dans ce ticket)

Le scénario **POWER → RESISTOR → LED → GND** (3 composants en chaîne) ne permet **pas** de mesurer une tension/courant `VALID` sur la RESISTOR : le mécanisme `propagatePassiveConduction` de `resolution.js` (MB-SIM-015), conçu pour propager l'état logique HIGH à travers un composant passif afin que la LED en aval voie correctement `anode=HIGH`, propage également ce HIGH vers `RESISTOR.B` — rendant `RESISTOR.A` et `RESISTOR.B` tous deux `HIGH` du point de vue de `computeDcAnalysis()`. `resistorDc()` exige une paire HIGH/LOW (`isSimplePoweredLoop`) pour produire une contribution DC ; avec A=HIGH et B=HIGH, elle retourne `null`, et `observePinElectrical()` retourne `UNAVAILABLE`. Ce comportement est **antérieur à ce ticket**, découle d'une décision architecturale déjà en production (ruling CSA MB-SIM-015), et n'a pas été modifié : le scénario alternatif **POWER → RESISTOR → GND** (2 composants, déjà la fixture canonique de `measurementContract.test.js`/`observationContract.test.js`) a été utilisé pour la preuve VOLTAGE/CURRENT VALID, conformément à l'instruction explicite du ticket §10/§16 (« utiliser un scénario de mesure déjà supporté par le moteur »). Aucune falsification de résultat, aucune modification de `resolution.js`/`dcContributionRegistry.js`.
