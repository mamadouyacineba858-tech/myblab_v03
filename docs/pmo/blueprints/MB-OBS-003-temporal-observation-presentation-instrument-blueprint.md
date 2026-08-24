# Blueprint — MB-OBS-003

**Titre :** Temporal Observation Presentation Instrument
**Statut :** CSA CONDITIONAL GO
**Dépendance :** MB-OBS-002
**Nature :** présentation/UI uniquement

## 1. Objectif

Construire le premier instrument visuel permettant de présenter une série temporelle produite par `MB-OBS-002`.

MB-OBS-003 ne produit aucune donnée temporelle.

Flux obligatoire :

```text
Utilisateur
   ↓
MB-OBS-003
   ↓
MB-OBS-002
   ↓
TemporalObservationResult
   ↓
Waveform renderer
```

Le renderer consomme exclusivement `TemporalObservationResult`.

## 2. Responsabilités

MB-OBS-003 peut :

* sélectionner une cible ;
* sélectionner une grandeur ;
* définir `startTime` ;
* définir `endTime` ;
* définir `samplePeriod` ;
* déclencher l'observation ;
* afficher les `samples[]` ;
* afficher l'unité ;
* afficher les statuts ;
* représenter graphiquement les points temporels.

MB-OBS-003 ne peut pas :

* calculer une nouvelle mesure ;
* générer des samples ;
* modifier les timestamps ;
* modifier les valeurs ;
* modifier les statuts ;
* accéder directement au PWM ;
* accéder directement au Scheduler ;
* accéder directement à la Clock ;
* accéder directement à `ArduinoSimulator` ;
* accéder directement à `resolution.js` ;
* modifier `components` ou `wires`.

## 3. Contrat de données

La source unique est :

```text
TemporalObservationResult
```

Le renderer doit traiter chaque sample comme une donnée déjà validée :

```text
{
  time,
  value,
  status,
  reason?
}
```

Aucune transformation physique n'est autorisée.

**Verrou CSA**

MB-OBS-003 MUST NOT introduce a new waveform/time-series data contract.

La waveform est uniquement une représentation graphique de `samples[]`.

## 4. Échantillonnage

MB-OBS-003 transmet :

```text
startTime
endTime
samplePeriod
```

à MB-OBS-002.

Il ne construit jamais :

```text
[startTime, startTime + samplePeriod, ...]
```

Cette responsabilité appartient exclusivement à MB-OBS-002.

## 5. Rendu

Le renderer représente :

```text
x = sample.time
y = sample.value
```

Les timestamps et valeurs sont utilisés tels quels.

**Interpolation**

Aucune interpolation de données n'est autorisée en V1.

Une ligne graphique reliant deux points est uniquement une primitive visuelle. Elle ne constitue pas une mesure intermédiaire.

## 6. Statuts

Le statut de chaque sample est conservé.

Exemple :

```text
VALID
VALID
UNAVAILABLE
VALID
```

Le renderer ne transforme jamais `UNAVAILABLE` en `0`.

Le renderer ne recalcule pas le statut global.

Le statut global fourni par MB-OBS-002 reste la source de vérité.

## 7. Interface V1

Interface minimale obligatoire :

```text
Target
Quantity
Start
End
Sample period

[ Observe ]

-------------------------
Waveform
-------------------------

Value
Unit
Status
```

**Hors périmètre V1**

* zoom avancé ;
* pan ;
* trigger ;
* autoscale intelligent ;
* curseurs ;
* FFT ;
* analyse fréquentielle ;
* export ;
* historique ;
* comparaison de séries ;
* multi-channel ;
* persistence ;
* acquisition continue ;
* oscilloscope temps réel.

## 8. PWM de référence

Le scénario de référence est un signal PWM déjà supporté par le runtime.

La preuve attendue est une waveform montrant l'évolution déterministe du signal :

```text
t0 → HIGH
t1 → HIGH
t2 → LOW
t3 → LOW
t4 → HIGH
```

Les valeurs doivent provenir de MB-OBS-002.

MB-OBS-003 ne connaît pas la formule PWM.

## 9. Architecture

Architecture obligatoire :

```text
Presentation
     │
     ▼
MB-OBS-003
     │
     ▼
MB-OBS-002
     │
     ▼
TemporalObservationResult
     │
     ▼
Renderer
```

Interdiction :

```text
Presentation
     │
     ├──→ ArduinoSimulator       ❌
     ├──→ Scheduler              ❌
     ├──→ SimulatedClock         ❌
     ├──→ PwmSignal              ❌
     ├──→ resolution.js          ❌
     └──→ Document mutation      ❌
```

## 10. Temps

MB-OBS-003 ne possède aucune horloge.

Interdit :

```text
Date.now()
performance.now()
setTimeout()
setInterval()
requestAnimationFrame()
```

comme mécanisme de temps de simulation.

`requestAnimationFrame`, s'il est nécessaire uniquement pour le rafraîchissement graphique, ne doit jamais produire ou modifier les timestamps des samples.

## 11. Measurement

`MB-MEASURE-001` reste indépendant.

MB-OBS-003 ne transforme pas Measurement en contrat temporel.

Aucune modification de :

```text
measurementContract.js
```

n'est autorisée sauf nécessité explicitement démontrée et approuvée par CSA.

## 12. Non-mutation

L'instrument est strictement read-only vis-à-vis du circuit.

Aucune mutation de :

```text
components
wires
Document
HistoryManager
simulation state
```

## 13. Tests obligatoires

**Architecture**

Prouver :

* absence de Clock ;
* absence de Scheduler ;
* absence d'ArduinoSimulator ;
* absence de PwmSignal ;
* absence de résolution physique ;
* absence de mutation du Document ;
* consommation de `TemporalObservationResult`.

**Comportement**

Tester :

1. sélection valide ;
2. requête valide ;
3. affichage de samples ;
4. conservation des timestamps ;
5. conservation des valeurs ;
6. conservation des unités ;
7. conservation des statuts ;
8. `UNAVAILABLE` correctement représenté ;
9. série vide ;
10. série contenant des valeurs invalides ;
11. PWM de référence ;
12. déterminisme du rendu ;
13. absence d'interpolation de données.

## 14. Tests utilisateur

Une démonstration minimale doit prouver :

```text
Circuit PWM
   ↓
Observe
   ↓
TemporalObservationResult
   ↓
Waveform visible
```

La démonstration doit être reproductible.

## 15. Fichiers

Le Blueprint ne fixe pas artificiellement les noms de fichiers.

L'agent doit d'abord inspecter l'architecture existante et proposer le plus petit périmètre compatible.

Aucun fichier de simulation ne doit être modifié sans nécessité démontrée.

## 16. Verrous CSA

**LOCK-OBS003-01**
MB-OBS-002 reste l'unique producteur de séries temporelles.

**LOCK-OBS003-02**
MB-OBS-003 ne crée aucune donnée temporelle.

**LOCK-OBS003-03**
Aucune interpolation de données en V1.

**LOCK-OBS003-04**
Aucune nouvelle horloge.

**LOCK-OBS003-05**
Aucune nouvelle physique.

**LOCK-OBS003-06**
Aucune mutation du circuit.

**LOCK-OBS003-07**
Aucun nouveau contrat `Waveform`/`TimeSeries`.

**LOCK-OBS003-08**
Aucun élargissement vers un oscilloscope avancé.

---

*Document matérialisé à partir du texte validé transmis par le PMO/CSA dans le fil d'implémentation MB-OBS-003 (aucune modification de fond apportée lors de la matérialisation).*
