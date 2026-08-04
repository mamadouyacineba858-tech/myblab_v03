ADR-006 — Registry des modèles de simulation
Statut : ACCEPTED
Date : 2026-08-04
Auteur : Équipe Architecture MYBlab
Statut de validation : Validé par le Chief Software Architect

Contexte
Le moteur de simulation (ADR-004) doit résoudre des circuits contenant des composants de types variés. Chaque type de composant a un comportement électronique différent : une résistance suit la loi d'Ohm, un condensateur a une relation courant-tension dépendante du temps, un transistor est un modèle non-linéaire, etc.

Le solveur a besoin de savoir, pour chaque composant, comment il contribue aux équations du circuit. Sans système d'extension, le solveur devrait connaître tous les composants possibles, ce qui violerait le principe Open/Closed et rendrait l'ajout de nouveaux composants difficile.

De plus, le même composant peut avoir plusieurs modèles de simulation (ex: modèle linéaire vs. non-linéaire pour un transistor) selon l'analyse demandée.

Problème
Comment concevoir un mécanisme qui :

Permette d'associer un comportement de simulation à chaque type de composant ;

Permette l'ajout de nouveaux composants sans modifier le solveur ni le noyau du moteur ;

Supporte plusieurs modèles pour un même type de composant ;

Soit indépendant des autres couches (modèle, interface, rendu) ;

Garantisse que le solveur reçoit toujours les bonnes contributions ?

Décision
Nous adoptons un Registry des modèles de simulation (ou registre de comportements).

Principe
Le registre est un mécanisme central qui associe :

Clé : l'identifiant du type de composant (ex: 'resistor', 'transistor').

Valeur : une fonction de contribution ou un modèle qui définit comment ce composant participe aux équations du circuit.

Fonctionnement
Enregistrement : Chaque type de composant enregistre son ou ses modèles dans le registre. L'enregistrement a lieu à l'initialisation.

Interrogation : Lors de la préparation de la simulation, le moteur consulte le registre pour chaque composant du circuit.

Récupération : Le registre retourne le modèle approprié (ou une fonction) pour le type demandé.

Utilisation : Le moteur utilise ce modèle pour construire les équations du circuit.

Modèles multiples
Un même type de composant peut enregistrer plusieurs modèles :

Un modèle pour l'analyse DC (statique).

Un modèle pour l'analyse Transitoire (dynamique).

Un modèle pour l'analyse AC (fréquentielle).

Le registre peut alors associer une paire (type, analyse) à un modèle, ou le moteur peut demander un modèle spécifique.

Responsabilités
Le registre est responsable de :

Stocker les associations type → modèle.

Vérifier qu'un modèle existe pour un type donné.

Retourner le modèle demandé.

Permettre l'ajout ou le remplacement de modèles conformément au cycle d'initialisation retenu par l'application.

Le registre n'est pas responsable de :

Exécuter la simulation.

Valider les composants.

Connaître l'interface utilisateur ou le rendu.

Extensibilité
Pour ajouter un nouveau composant :

Ajouter sa définition dans le registre des types (ADR-005).

Ajouter son ou ses modèles de simulation dans le registre des modèles.

Aucune modification du solveur ou du moteur central n'est nécessaire.

Open/Closed Principle
Le registre respecte le principe Open/Closed :

Ouvert à l'extension : on peut enregistrer de nouveaux modèles.

Fermé à la modification : le solveur n'a pas besoin d'être modifié pour supporter un nouveau composant.

Alternatives étudiées
Alternative	Raison du rejet
Solveur connaissant tous les composants	Violation Open/Closed ; ajout d'un composant nécessite de modifier le solveur.
Héritage et polymorphisme	Couplage fort entre le modèle et le solveur ; difficile à étendre.
Fichier de configuration externe	Moins flexible à l'exécution ; nécessite de recharger la configuration.
Usine de modèles	Bien mais moins adapté à la multiplicité des modèles par type.
Conséquences positives
✅ Extensibilité : ajouter un composant ne touche pas au solveur.
✅ Séparation : les modèles sont découplés du moteur de simulation.
✅ Flexibilité : plusieurs modèles par type sont possibles.
✅ Testabilité : chaque modèle peut être testé indépendamment.
✅ Remplacement : on peut remplacer un modèle existant sans toucher au solveur.

Conséquences négatives
❌ Indirection : pour comprendre la simulation, il faut consulter le registre.
❌ Risque d'oubli : un composant sans modèle enregistré ne peut pas être simulé.
❌ Complexité de coordination : les modèles doivent être synchronisés avec les définitions de types (ADR-005).
❌ Surcharge d'enregistrement : l'initialisation doit enregistrer tous les modèles.

Impact sur les développements futurs
L'ajout d'un nouveau type de composant nécessitera trois étapes : définition du type (ADR-005), visualiseur (ADR-003), et modèle de simulation.

L'ajout d'une nouvelle analyse pourra s'appuyer sur des modèles dédiés (ex: modèle thermique).

Les modèles pourront être optimisés indépendamment (ex: version simplifiée pour des circuits pédagogiques).

Le registre pourra supporter la sélection dynamique du modèle en fonction du contexte (ex: adaptatif).

Références ADR liées
ADR-001 : Document State comme Source Unique de Vérité

ADR-002 : Séparation UI / Modèle / Simulation

ADR-004 : Architecture du moteur de simulation hybride

ADR-005 : Architecture du modèle de composants électroniques