# ADR-013 — Modèle de signal PWM (architecture et contrat)

**Statut:** PROPOSED
**Date:** 2026-08-18
**Auteur:** Claude (Documentation Lead — MB-SIM-013)
**Statut de validation:** En attente de validation par le Chief Software Architect

## Contexte

MYBlab simule aujourd'hui des signaux numériques discrets via l'énumération
`Signal` (`UNKNOWN`, `LOW`, `HIGH`, `FLOATING`, `frontend/src/simulator/signals.js`).
MB-SIM-011 a introduit un point d'intégration Runtime↔Simulation dédié
(`simulationRuntimeIntegration.js`), et MB-SIM-012 a fait en sorte que les
signaux produits par le Runtime (`externalSignals`) participent réellement à
la résolution du circuit, en amont de `propagate()`, via
`resolveSignals(components, prepared, externalSignals)` dans `resolution.js`.

`ArduinoSimulator.analogWrite(pin, value)` existe déjà comme stub (aucune
logique PWM) et `ArduinoSimulator.tick(deltaMs)` ignore actuellement son
paramètre `deltaMs`. `canonicalRegistry.js` déclare une entrée `SERVO` mais
avec `modelAvailable: false` — SERVO a été explicitement exclu de
MB-SIM-008 v2 en raison de sa dépendance à PWM/Scheduler, non résolue avant
ce ticket.

La seule source de temps déterministe existante est `SimulatedClock`
(`clock.js`, MB-SIM-009) : `getCurrentTime()` / `advance(dt)` /
`reset()`, en millisecondes, sans dépendance à une horloge système
(`Date.now`, `setTimeout`, `setInterval`, `performance.now`,
`requestAnimationFrame` sont tous explicitement exclus par sa documentation
et par INV-SIM009-001).

MB-SIM-013 doit définir, sans l'implémenter complètement, comment un signal
PWM (fréquence + rapport cyclique) peut être représenté, validé et évalué à
un instant donné, de façon compatible avec ce pipeline existant — en
particulier sans dégrader ni contourner le contrat introduit par
MB-SIM-012, et sans créer de seconde source de temps.

## Problème

Comment représenter un signal PWM de façon :

- déterministe (même entrée + même instant ⇒ même résultat) ;
- immuable / traitée comme une valeur (pas d'état mutable partagé) ;
- validable indépendamment de toute évaluation (rejet explicite des
  configurations invalides) ;
- indépendante du DOM, de React, et de toute horloge réelle ;
- compatible à 100 % avec l'énumération `Signal` existante et ses
  consommateurs actuels (`resolution.js`, `production.js`, tests) ;
- compatible avec le contrat `externalSignals` introduit par MB-SIM-012,
  sans modifier `resolution.js` ;

et comment définir le contrat de `analogWrite(pin, value)` (conversion
0–255 → rapport cyclique) et la relation PWM↔Scheduler (source de temps
unique), sans construire l'implémentation complète (câblage dans
`ArduinoSimulator.tick()`, décision de capacité PWM par broche dans
`canonicalRegistry.js`) ?

## Décision

### Option retenue : **Option B — type `PwmSignal` parallèle**

Nous confirmons explicitement la recommandation initiale du CSA (§7 du
ticket) : `PwmSignal` est un type de valeur autonome, distinct de `Signal`.
L'énumération `Signal` (`UNKNOWN` / `LOW` / `HIGH` / `FLOATING`,
`signals.js`) **n'est pas modifiée** — ni structurellement, ni par ajout
d'un membre `PWM`.

#### Représentation

```js
// frontend/src/simulator/pwmSignal.js
PwmSignal = Object.freeze({
  frequencyHz: number,   // fini, > 0, obligatoire (aucune valeur par défaut)
  dutyCycle: number,     // ratio [0, 1] (0 = toujours LOW, 1 = toujours HIGH)
  startTime: number,     // ms, référence de phase, défaut 0
})
```

- `dutyCycle` est représenté comme un **ratio `[0, 1]`**, et non comme un
  pourcentage `[0, 100]`. Ce choix suit le précédent déjà établi dans
  `canonicalRegistry.js` pour `POTENTIOMETER.position`
  (`parameterType: 'ratio'`, `minimum: 0`, `maximum: 1`) — la codebase a
  déjà une convention pour représenter un rapport continu, et PWM
  `dutyCycle` est structurellement le même genre de grandeur.
- `frequencyHz` **n'a pas de valeur par défaut**. Le ticket interdit
  explicitement (§9, §11) d'inventer une fréquence arbitraire ; toute
  fréquence doit être fournie explicitement par l'appelant (le futur
  câblage `analogWrite()` de MB-SIM-014). Une fréquence omise, nulle,
  négative, non finie ou non numérique est une erreur de validation, pas
  une valeur par défaut silencieuse.
- L'objet est gelé (`Object.freeze`) : un `PwmSignal` est traité comme une
  valeur immuable, jamais muté après construction.

#### Contrat de validation et de construction

- `validatePwmSignal(config) -> { valid: boolean, errors: string[] }` —
  fonction non levante, inspectable, suivant l'idiome déjà établi par
  `canonicalRegistry.js#validateCanonicalEntry`.
- `createPwmSignal(config)` — appelle `validatePwmSignal` en interne, lève
  un `RangeError` descriptif si invalide, sinon retourne l'objet gelé.

#### Contrat `analogWrite` (conversion 0–255)

- `analogValueToDutyCycle(value)` : valide que `value` est un entier dans
  `[0, 255]` (convention canonique Arduino), lève un `RangeError` sinon ;
  retourne `value / 255` — conversion linéaire, déterministe
  (`0 → 0`, `255 → 1.0`).
- Cette fonction ne fixe **aucune fréquence** : `analogWrite(pin, value)`
  détermine uniquement le rapport cyclique. La fréquence associée à un
  `PwmSignal` reste un paramètre distinct et obligatoire, à fournir par le
  futur appelant (MB-SIM-014) — conformément à l'interdiction du ticket
  d'inventer une fréquence par défaut.

#### Relation PWM ↔ Scheduler (source de temps unique)

- `evaluatePwmSignal(pwmSignal, currentTimeMs)` est une **fonction pure**
  qui ne lit jamais le temps elle-même : `currentTimeMs` doit toujours
  provenir explicitement de `SimulatedClock.getCurrentTime()` (via le
  `Scheduler`), jamais lu implicitement.
- Aucune horloge réelle n'est introduite : `Date.now()`, `setTimeout()`,
  `setInterval()`, `performance.now()`, ou toute boucle temps réel
  indépendante sont explicitement exclus de `pwmSignal.js` — vérifié par un
  test d'architecture statique (T9).
- Le module `pwmSignal.js` n'importe que `./signals.js` (pour réutiliser
  `Signal.HIGH`/`Signal.LOW`) ; il n'importe ni `clock.js`, ni
  `runtimeOrchestrator.js`, ni `ArduinoSimulator.js` — il reste un module de
  fonctions pures sur des valeurs, sans dépendance au Scheduler lui-même.
  C'est au futur appelant (MB-SIM-014) de récupérer `currentTime` via le
  Scheduler et de le transmettre.

#### Formule d'évaluation temporelle

```
period       = 1000 / frequencyHz                       (ms)
elapsed      = currentTimeMs - startTime
phase        = ((elapsed % period) + period) % period    // toujours dans [0, period)
dutyBoundary = dutyCycle * period
result       = phase < dutyBoundary ? Signal.HIGH : Signal.LOW
```

`evaluatePwmSignal` retourne toujours une valeur de l'énumération `Signal`
existante (`HIGH` ou `LOW`) — jamais un nouvel état. C'est un point de
conception central : le résultat évalué se comporte comme n'importe quel
autre signal `HIGH`/`LOW` pour tout le reste du pipeline.

#### Règles de bord explicitement tranchées (§14 du ticket)

| Cas | Comportement défini |
|---|---|
| `dutyCycle = 0` | Toujours `LOW` (`dutyBoundary = 0`, donc `phase < 0` n'est jamais vrai) |
| `dutyCycle = 1` | Toujours `HIGH` (`dutyBoundary = period`, `phase` est toujours `< period`) |
| `dutyCycle` intermédiaire | `HIGH` sur `[0, dutyBoundary)`, `LOW` sur `[dutyBoundary, period)` |
| `frequencyHz = 0` ou négatif | Rejeté à la construction (`RangeError`), jamais évalué |
| `frequencyHz` très élevée | Acceptée si finie et `> 0` ; `period` tend vers 0, comportement mathématiquement défini (pas de cas spécial) |
| `t = 0` | `phase = ((0 - startTime) % period + period) % period` — dépend de `startTime`, formule symétrique, pas de cas spécial |
| `t < startTime` (`elapsed < 0`) | Géré par l'extension périodique arrière du modulo normalisé (`((x % n) + n) % n`) — pas un état « non démarré » distinct. **Hypothèse documentée, révisable** : ce choix privilégie la continuité mathématique de la formule plutôt qu'un état spécial ; il est explicitement signalé comme un point ouvert pour MB-SIM-014 si un besoin différent apparaît. |
| `t = period` exactement | `phase = 0` (le modulo ramène exactement à la borne inférieure de la période suivante) — comportement identique à `t = 0` |
| `t > period` | Géré par périodicité : `evaluatePwmSignal(p, t) === evaluatePwmSignal(p, t + n·period)` pour tout entier `n` |
| `t = dutyBoundary` exactement | `LOW` — la borne `dutyBoundary` elle-même appartient à l'intervalle `LOW` (front descendant inclus dans LOW, intervalle `HIGH` semi-ouvert `[0, dutyBoundary)`) |
| broche valide / invalide / non-PWM | **Hors périmètre de ce ticket, question ouverte pour MB-SIM-014.** `PwmSignal`/`evaluatePwmSignal` sont volontairement agnostiques de toute broche — ce sont des fonctions pures sur valeur/temps. La validation de capacité PWM par broche nécessiterait une décision dans `canonicalRegistry.js` (fichier protégé dans MB-SIM-013), donc explicitement différée. |

#### Déterminisme

- `evaluatePwmSignal` ne dépend que de ses trois arguments effectifs
  (`frequencyHz`, `dutyCycle`, `startTime` portés par `pwmSignal`, et
  `currentTimeMs`) : mêmes entrées ⇒ même résultat, à tout instant,
  vérifié explicitement aux instants remarquables `t=0`, `t=période`,
  `t=dutyBoundary`, `t=n×période` (T5–T8).
- Périodicité garantie par construction : le résultat ne dépend que de
  `phase`, elle-même toujours ramenée dans `[0, period)`.

#### Résultat de simulation — préservation stricte de MB-SIM-012

`resolution.js` et le contrat `externalSignals` (`Map<string, Signal>`)
introduits par MB-SIM-012 **restent strictement inchangés**. Le Runtime ne
transmettrait jamais un `PwmSignal` brut à la résolution : un futur
`ArduinoSimulator.tick()` (MB-SIM-014) évaluerait chaque `PwmSignal` interne
via `evaluatePwmSignal(pwmSignal, currentTime)` et n'inclurait dans le
`SignalMap` retourné que le résultat déjà évalué (`Signal.HIGH`/`LOW`),
exactement comme un pin piloté par `digitalWrite()` aujourd'hui. Ce
`SignalMap` alimenterait `externalSignals` dans
`simulationRuntimeIntegration.js` sans aucun changement de ce contrat.
`resolution.js` ne voit donc jamais la différence entre un pin PWM évalué
et un pin `digitalWrite()` classique — c'est un point de conception
délibéré qui satisfait directement l'exigence du ticket (§17) de ne pas
contourner ou réécrire le mécanisme de MB-SIM-012.

### Preuve de suffisance du contrat (Gate G2)

Avec ce contrat, une future implémentation complète (MB-SIM-014) pourrait
se limiter à modifier **uniquement `ArduinoSimulator.js`** :

```
RuntimeOrchestrator.advance(dt)  [inchangé]
  -> Scheduler.advance(dt)  [inchangé]
  -> Scheduler.getCurrentTime()
  -> ArduinoSimulator.tick(dt)  [extension future : pour chaque pin configurée
                                 PWM, appelle evaluatePwmSignal(pwmSignal,
                                 currentTime) et inclut HIGH/LOW dans le
                                 SignalMap retourné, aux côtés des pins
                                 digitalWrite()]
  -> simulationRuntimeIntegration.js  [inchangé, construit externalSignals
                                        exactement comme aujourd'hui]
  -> resolveSignals(..., externalSignals)  [inchangé, MB-SIM-012]
```

Aucun autre fichier du pipeline établi n'aurait besoin d'être modifié — ce
qui constitue la preuve concrète que le contrat est « suffisamment précis
pour qu'un développeur puisse implémenter PWM sans nouvelle décision
architecturale majeure » (Gate G2).

## Alternatives étudiées

| Alternative | Raison du rejet |
|---|---|
| **Option A — étendre `Signal` avec un membre `PWM`** | Nécessiterait que chaque consommateur existant de `Signal` (`resolution.js`, `production.js`, tests, comparaisons `=== Signal.HIGH`) apprenne à distinguer un « type » de signal en plus de sa valeur logique, alors qu'aucun consommateur en aval de l'évaluation n'a besoin de savoir qu'un pin était piloté en PWM — seul l'état HIGH/LOW résultant compte. Rayon d'impact bien plus large que nécessaire, pour aucun bénéfice fonctionnel. |
| **Option C — objet de signal composite (état discret ou forme temporelle)** | Même problème qu'Option A (complexité de branchement pour tout consommateur), avec en plus une complexité de modélisation inutile : un signal composite polymorphe n'apporte rien que `PwmSignal` + évaluation explicite en `Signal` n'apporte déjà, de façon plus simple et plus proche des idiomes existants du code (valeurs immuables, fonctions pures). |
| **Option B — type `PwmSignal` parallèle (retenue)** | Isole le rayon d'impact : `signals.js` reste inchangé à l'octet près ; tout consommateur existant continue de fonctionner sans modification ; le nouveau module est totalement inerte tant qu'aucun code ne l'importe, ce qui correspond exactement à la nature « architecture et contrat, pas implémentation complète » de ce ticket. |

## Conséquences positives

✅ `signals.js` reste inchangé — zéro risque de régression sur l'énumération `Signal` existante et ses consommateurs (satisfait §15 du ticket).
✅ `resolution.js` et le contrat `externalSignals` de MB-SIM-012 restent intacts — aucun risque de dégrader MB-SIM-012 (satisfait §17).
✅ `pwmSignal.js` est un module autonome, non importé ailleurs dans ce ticket — aucune implémentation PWM complète n'est introduite (satisfait la Definition of Done du ticket : architecture verrouillée, pas fonctionnalité livrée).
✅ Contrat suffisamment précis pour qu'une future implémentation (MB-SIM-014) se limite à `ArduinoSimulator.js`, sans nouvelle décision architecturale (Gate G2, démontré ci-dessus).
✅ Cohérent avec les conventions déjà présentes dans la codebase (`ratio [0,1]` façon `POTENTIOMETER.position`, `{valid, errors}` façon `validateCanonicalEntry`, temps explicite façon `SimulatedClock`) — aucune convention nouvelle inventée.
✅ Déterminisme et absence de seconde horloge garantis et testables statiquement (T9).

## Conséquences négatives

❌ Le comportement pour `t < startTime` (extension périodique arrière plutôt qu'un état « non démarré » explicite) est une hypothèse de conception, pas une exigence du ticket — elle devra être reconfirmée ou révisée lors de MB-SIM-014 si un besoin fonctionnel différent apparaît.
❌ La validation de capacité PWM par broche (broche valide/invalide/non-PWM) est différée à MB-SIM-014, ce qui signifie que `pwmSignal.js` seul ne peut pas empêcher un appel incorrect sur une broche non-PWM — cette responsabilité reposera entièrement sur le futur câblage dans `ArduinoSimulator.js`/`canonicalRegistry.js`.
❌ Deux modules distincts (`Signal` et `PwmSignal`) à comprendre pour tout développeur travaillant sur le sous-système de signaux — coût de charge cognitive additionnel, jugé acceptable au vu du rayon d'impact minimal.

## Impact sur les développements futurs

- **MB-SIM-014 (implémentation)** : câblage de `analogWrite(pin, value)` dans `ArduinoSimulator.js` pour construire un `PwmSignal` par broche (via `createPwmSignal` + `analogValueToDutyCycle`), extension de `tick(deltaMs)` pour évaluer chaque `PwmSignal` actif via `evaluatePwmSignal(pwmSignal, currentTime)` et l'inclure dans le `SignalMap` retourné ; décision `canonicalRegistry.js` sur les broches PWM-capables (fichier protégé dans MB-SIM-013, à traiter dans ce futur ticket).
- **MB-SIM-015 (SERVO)** : pourra s'appuyer sur ce même contrat `PwmSignal`/`evaluatePwmSignal` si le modèle SERVO nécessite un signal PWM à fréquence fixe (~50 Hz) — décision explicitement hors périmètre ici.
- Aucun impact sur `engine.js`, `preparation.js`, `resolution.js`, `production.js`, `canonicalRegistry.js`, ni sur aucun des autres fichiers protégés listés au §20 du ticket MB-SIM-013 — tous restent inchangés par cette ADR et son contrat.

## Références ADR liées

ADR-004 : Architecture du moteur de simulation hybride

ADR-006 : Registry des modèles de simulation

ADR-010 : Validation Engine Architecture (idiome `{valid, errors}` réutilisé pour `validatePwmSignal`)
