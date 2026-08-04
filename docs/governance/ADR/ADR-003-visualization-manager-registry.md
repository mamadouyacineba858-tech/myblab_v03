ADR-002 — Séparation UI / Modèle / Simulation
Statut : ACCEPTED
Date : 2026-08-04
Auteur : Équipe Architecture MYBlab
Statut de validation : Validé par le Chief Software Architect

Contexte
Le projet MYBlab repose sur une architecture où le Document Circuit est l'unique source de vérité (ADR-001). L'interface utilisateur et le moteur de simulation interagissent tous deux avec ce document, mais sans coordination explicite, des risques d'incohérence apparaissent :

L'interface pourrait modifier le document d'une manière non prévue par le moteur de simulation.

La simulation pourrait générer des résultats qui ne sont pas reflétés dans l'affichage.

Les responsabilités respectives de chaque couche ne sont pas clairement délimitées.

Cette absence de séparation claire complexifie la maintenance, les tests et l'évolution future du projet.

Problème
Comment organiser les interactions entre l'interface utilisateur, le modèle de données (Document Circuit) et le moteur de simulation pour garantir :

Une séparation stricte des responsabilités ;

Une cohérence permanente entre affichage, données et simulation ;

Une évolutivité permettant d'ajouter de nouvelles fonctionnalités sans régression ;

Une testabilité de chaque couche de manière isolée ?

Décision
Nous adoptons une architecture en trois couches strictement séparées :

1. Couche Modèle (Document Circuit)
Responsabilité : stocker et valider l'état complet du circuit.

Composition : objet contenant la liste des composants, leurs connexions, les paramètres de simulation, et les métadonnées.

Accès : accessible en lecture par l'interface et la simulation. Toute modification est effectuée via des fonctions de transformation pures qui produisent un nouveau Document.

Référence : strictement conforme à ADR-001.

2. Couche Interface Utilisateur
Responsabilité : afficher le circuit, capturer les interactions utilisateur, et déclencher des transformations sur le Document.

Composition : composants d'interface sans état métier interne. L'état local se limite à l'état de présentation pur (élément sélectionné, menu ouvert, zoom, etc.).

Règles :

Ne lit le Document qu'à travers des fonctions d'accès (lecture seule).

Ne modifie jamais le Document directement : émet des intentions ou commandes (ex: ajouterComposant, connecterNoeuds, lancerSimulation).

Ne stocke aucun état métier en dehors du Document.

Affiche les résultats de simulation comme des données dérivées, en lecture seule.

3. Couche Simulation
Responsabilité : exécuter des analyses électroniques sur le Document.

Composition : modules indépendants (préparation, résolution, rapport).

Règles :

Reçoit le Document à simuler (en lecture seule).

Retourne un résultat de simulation (objet séparé, non persistant).

Ne modifie jamais le Document ni directement ni indirectement.

Ne connaît pas l'interface utilisateur.

Flux de données (Unidirectionnel)
text
[Action utilisateur] → [Interface] → [Transformation] → [Document modifié]
                                                         ↓
                                              [Déclenchement simulation]
                                                         ↓
                                              [Résultat de simulation]
                                                         ↓
                                     [Interface affiche document + résultats]
Alternatives étudiées
Alternative	Raison du rejet
État partagé entre interface et métier	Violation ADR-001 ; mélange des responsabilités ; risque de divergence.
Simulation modifiant le Document en place	Contraire à ADR-001 ; perte de traçabilité ; impossible d'annuler/rejouer.
Interface possédant son propre modèle de données	Désynchronisation garantie ; double maintenance ; tests complexes.
Architecture MVC classique	Trop couplée ; difficile à tester isolément ; inadaptée aux interfaces modernes.
Conséquences positives
✅ Cohérence garantie : le Document est la seule source de vérité.
✅ Testabilité accrue : chaque couche se teste isolément (simulation sans interface, interface sans simulation réelle).
✅ Évolutivité : on peut remplacer la technologie d'interface sans toucher au modèle ni à la simulation.
✅ Traçabilité : toutes les modifications du Document passent par des transformations bien identifiées.
✅ Débogage facilité : on peut rejouer une séquence de transformations sur le Document hors de l'interface.
✅ Parallélisation possible : la simulation peut s'exécuter dans un environnement isolé (ex: Worker) sans impact sur l'interface.

Conséquences négatives
❌ Courbe d'apprentissage : les développeurs doivent maîtriser le pattern de transformations immuables.
❌ Verbiosité : chaque modification du Document nécessite une transformation explicite (pas de mutation directe).
❌ Performance : la gestion immuable du Document peut être coûteuse si le circuit est très grand (à surveiller).
❌ Complexité initiale : mise en place du système de transformation avant de coder des fonctionnalités.

Impact sur les développements futurs
Toute nouvelle fonctionnalité devra passer par une transformation explicite du Document.

La simulation pourra être enrichie avec de nouvelles analyses sans toucher à l'interface.

L'historique (undo/redo) sera facile à implémenter via la conservation des transformations.

La persistance (sauvegarde/chargement) sera naturelle : sérialisation du Document.

Références ADR liées
ADR-001 : Document State comme Source Unique de Vérité

ADR-003 : VisualizationManager + Registry Pattern

ADR-004 : Architecture du moteur de simulation hybride