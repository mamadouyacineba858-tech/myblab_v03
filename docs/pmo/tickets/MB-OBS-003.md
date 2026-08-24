# Ticket — MB-OBS-003

**Titre :** `MB-OBS-003 — Temporal Observation Presentation Instrument`
**Dépendance :** MB-OBS-002
**Statut :** Ready after CSA Blueprint correction
**Type :** Presentation / Instrument
**Niveau :** Phase 2 — Level 1

## Mission

Implémenter l'instrument de présentation permettant à l'utilisateur de visualiser une série temporelle produite par `MB-OBS-002`.

L'implémentation doit rester strictement au-dessus du contrat Observation temporelle existant.

## Objectif technique

Permettre :

```text
Target
Quantity
Start
End
Sample period
      ↓
MB-OBS-002
      ↓
TemporalObservationResult
      ↓
Waveform
```

Le résultat doit être lisible et déterministe.

## Contraintes absolues

**1. Ne pas modifier la physique**

Aucune modification de :

* calcul PWM ;
* résolution électrique ;
* modèle de composant ;
* simulation runtime.

**2. Ne pas créer d'horloge**

Aucune nouvelle source temporelle.

**3. Ne pas créer de waveform contract**

Utiliser directement `TemporalObservationResult`.

**4. Ne pas générer de samples**

Le module de présentation ne doit jamais construire lui-même une série.

**5. Ne pas interpoler**

Afficher les samples fournis.

**6. Ne pas muter le circuit**

Le circuit reste strictement read-only.

## Fonctionnalités V1

Implémenter uniquement :

* sélection de target ;
* sélection de quantity ;
* start time ;
* end time ;
* sample period ;
* action `Observe` ;
* affichage de la waveform ;
* affichage de la valeur/unité ;
* affichage des statuts.

## Hors périmètre

Ne pas implémenter :

* FFT ;
* analyse fréquentielle ;
* export ;
* historique ;
* comparaison ;
* trigger ;
* zoom avancé ;
* multi-channel ;
* acquisition continue ;
* oscilloscope avancé.

## Critères d'acceptation

**AC-01 — Appel du contrat**
L'instrument utilise MB-OBS-002 pour obtenir les données.

**AC-02 — Aucune génération locale**
Aucun sample n'est créé par le renderer.

**AC-03 — Timestamps**
Les timestamps affichés correspondent exactement aux timestamps fournis.

**AC-04 — Valeurs**
Les valeurs affichées correspondent exactement aux valeurs fournies.

**AC-05 — Statuts**
Les statuts sont conservés sans conversion silencieuse.

**AC-06 — Unavailable**
Une valeur `UNAVAILABLE` ne devient jamais `0`.

**AC-07 — Interpolation**
Aucune valeur intermédiaire n'est créée.

**AC-08 — Temps**
Aucune horloge n'est introduite.

**AC-09 — Simulation**
Aucun accès direct au runtime de simulation depuis le renderer.

**AC-10 — Mutation**
Le Document, les composants et les wires restent inchangés.

**AC-11 — PWM**
Le scénario PWM de référence produit une waveform correspondant aux samples retournés par MB-OBS-002.

**AC-12 — Déterminisme**
Une même entrée produit la même représentation.

## Required Evidence

Claude devra fournir :

```text
1. fichiers modifiés/créés
2. tests ajoutés
3. tests ciblés
4. suite complète
5. build
6. lint
7. git diff --check
8. preuve d'absence de dépendance à Clock/Scheduler/PWM
9. preuve de non-mutation
10. démonstration du scénario PWM
```

Et surtout :

Aucun commit ni push ne doit être effectué par Claude. Comme pour MB-OBS-002, Claude implémente et vérifie ; nous validons ensuite le dépôt et effectuons nous-mêmes le commit/push.

*Note de traçabilité (matérialisation) : la mission d'implémentation transmise séparément par le PMO a explicitement autorisé un commit local (non poussé) pour ce ticket — voir le Rapport de livraison MB-OBS-003 §H pour l'arbitrage exact entre cette clause du Ticket et l'autorisation de commit local donnée en Phase 3.*

## Décision CSA finale

MB-OBS-003 : GO conditionnel → Blueprint corrigé + Ticket prêt.

La chaîne est maintenant propre :

```text
MB-OBS-001
Observation instantanée
        ↓
MB-MEASURE-001
Measurement instantanée
        ↓
MB-OBS-002
Observation temporelle
        ↓
MB-OBS-003
Instrument de présentation temporelle
```

Et surtout, MB-OBS-003 ne doit pas devenir prématurément un "oscilloscope complet". C'est le verrou stratégique le plus important de cette étape.

---

*Document matérialisé à partir du texte validé transmis par le PMO/CSA dans le fil d'implémentation MB-OBS-003 (aucune modification de fond apportée lors de la matérialisation).*
