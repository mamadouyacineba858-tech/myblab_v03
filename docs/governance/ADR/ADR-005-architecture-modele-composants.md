
ADR-005 — Architecture du modèle de composants électroniques 
Statut : ACCEPTED
Date : 2026-08-04
Auteur : Équipe Architecture MYBlab
Statut de validation : Validé par le Chief Software Architect

Contexte
Le projet MYBlab manipule des circuits électroniques composés d'éléments variés : résistances, condensateurs, transistors, sources, etc. Ces composants doivent être représentés dans le Document Circuit (ADR-001) d'une manière qui permette à la fois leur affichage (ADR-003) et leur simulation (ADR-004).

Actuellement, la structure des composants n'est pas formellement définie. Sans modèle clair, les risques sont :

Incohérence entre les représentations utilisées par l'interface, la simulation et le rendu.

Difficulté à ajouter de nouveaux types de composants.

Couplage implicite entre le modèle et les autres couches.

Absence de validation des données du composant.

Problème
Comment concevoir un modèle de composants électroniques qui :

Soit indépendant de l'interface, du rendu et de la simulation ;

Permette l'extension à de nouveaux types sans modifier le noyau ;

Garantisse l'intégrité des données (validation) ;

Soit compatible avec le Document Circuit (ADR-001) ;

Supporte les paramètres, les bornes et les propriétés spécifiques à chaque type ;

Facilite la sérialisation pour la persistance et l'échange ?

Décision
Nous adoptons un modèle de composant unifié structuré comme suit :

Structure fondamentale du composant
Chaque composant est une entité métier qui possède :

Identifiant unique : permet de référencer le composant dans le Document, les connexions et les résultats de simulation.

Type : identifie la catégorie du composant (ex: résistance, condensateur, transistor, source). Le type détermine le comportement attendu par les visualiseurs (ADR-003) et les modèles de simulation (ADR-006).

Propriétés communes : attributs partagés par tous les composants (ex: position, orientation, nom affiché).

Paramètres spécifiques : attributs propres à chaque type (ex: résistance en ohms, capacité en farads, tension de seuil). La structure et la validation de ces paramètres sont définies par le type.

Bornes (pins) : points de connexion du composant (ex: anode/cathode, collecteur/émetteur/base). Chaque borne possède un identifiant et peut être connectée à d'autres bornes.

Principe de séparation
Le modèle de composant :

Ne connaît pas l'interface utilisateur.

Ne connaît pas le moteur de rendu.

Ne connaît pas le moteur de simulation.

Expose des données accessibles en lecture.

Les autres couches (interface, visualisation, simulation) lisent le modèle et l'utilisent sans le modifier.

Gestion des types
Les types de composants sont définis par un registre de types (ou dictionnaire) qui associe :

L'identifiant du type (ex: 'resistor')

La définition des paramètres attendus (noms, types, valeurs par défaut, contraintes)

La liste des bornes avec leurs noms

Ce registre permet :

De valider qu'un composant est bien formé.

De savoir quels paramètres afficher dans l'interface.

De connaître la structure des bornes.

L'ajout d'un nouveau type se fait en enregistrant sa définition dans ce registre. Aucune modification du noyau du modèle n'est nécessaire.

Validation
Le modèle est soumis à des mécanismes de validation définis par l'architecture :

Validation structurelle : le composant a-t-il tous les champs requis ?

Validation sémantique : les paramètres respectent-ils leurs contraintes (ex: résistance positive) ?

Validation contextuelle : les connexions sont-elles cohérentes avec les bornes disponibles ?

La validation est effectuée :

À la création du composant.

À chaque modification.

Avant toute simulation.

Alternatives étudiées
Alternative	Raison du rejet
Modèle unique avec tous les paramètres	Mélange des responsabilités ; chaque composant aurait des champs inutilisés ; validation complexe.
Héritage par sous-classes	Couplage fort ; difficile à sérialiser ; ajout d'un type nécessite une nouvelle classe.
Type comme chaîne sans registre	Aucune validation ; risque d'erreurs ; impossible de connaître la structure attendue.
Modèle partagé entre métier et vue	Violation de la séparation des couches (ADR-002).
Conséquences positives
✅ Indépendance : le modèle ne dépend d'aucune autre couche.
✅ Extensibilité : ajouter un composant = ajouter une définition dans le registre.
✅ Validabilité : les données sont vérifiées à chaque étape.
✅ Sérialisabilité : le modèle est purement structuré (objets imbriqués).
✅ Lisibilité : chaque composant contient uniquement ce dont il a besoin.
✅ Testabilité : chaque type peut être validé indépendamment.

Conséquences négatives
❌ Complexité initiale : mise en place du registre des types et des validateurs.
❌ Redondance : les définitions de types doivent être synchronisées avec les visualiseurs et les modèles de simulation.
❌ Rigidité : un composant ne peut pas changer de type (mais cela n'est pas prévu).
❌ Surcoût de validation : la validation à chaque modification peut ralentir les gros circuits (à surveiller).

Impact sur les développements futurs
L'ajout d'un nouveau type de composant nécessitera : définition du modèle + visualiseur (ADR-003) + modèle de simulation (ADR-006).

L'évolution des paramètres d'un type se fait dans sa définition, sans toucher aux composants existants.

La persistance du Document bénéficie d'une sérialisation naturelle du modèle.

L'interface pourra générer dynamiquement des formulaires à partir des définitions de types.

Références ADR liées
ADR-001 : Document State comme Source Unique de Vérité

ADR-002 : Séparation UI / Modèle / Simulation

ADR-003 : VisualizationManager + Registry Pattern

ADR-004 : Architecture du moteur de simulation hybride

ADR-006 : Registry des modèles de simulation