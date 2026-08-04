ADR-004 — Architecture du moteur de simulation hybride
Statut : ACCEPTED
Date : 2026-08-04
Auteur : Équipe Architecture MYBlab
Statut de validation : Validé par le Chief Software Architect

Contexte
MYBlab doit fournir une simulation électronique pédagogique, comprenant :

Des analyses statiques (calcul du point de polarisation, courant continu) ;

Des analyses dynamiques (transitoire, fréquentielle, etc.) ;

Une interactivité (modification du circuit pendant la simulation ou entre deux simulations).

Le moteur doit être :

Précis pour des circuits éducatifs (composants passifs, semi-conducteurs simples) ;

Réactif pour une utilisation en temps réel ou quasi-réel ;

Extensible pour ajouter de nouveaux modèles ou analyses.

Les contraintes liées à ADR-001 et ADR-002 imposent que le moteur :

Ne modifie pas le Document Circuit ;

Reçoive le document en lecture seule ;

Retourne un résultat séparé ;

Soit découplé de l'interface utilisateur.

Problème
Comment concevoir un moteur de simulation qui :

Respecte la séparation des couches définie dans ADR-002 ;

Supporte différents types d'analyses (DC, AC, Transitoire, etc.) ;

Permette l'ajout de nouveaux modèles de composants sans toucher au moteur central ;

Offre des performances suffisantes pour une utilisation interactive ;

Soit pédagogique : les erreurs, les warnings et les résultats doivent être compréhensibles par des étudiants ;

Permette une évolutivité future vers une simulation en temps réel ?

Décision
Nous adoptons une architecture modulaire organisée autour de trois responsabilités distinctes :

1. Préparation des données pour la simulation
Responsabilité : transformer le Document Circuit en une représentation interne exploitable par les solveurs.

Actions :

Vérifier la cohérence du circuit (composants connectés, pas de court-circuit, etc.).

Construire la structure de données nécessaire à l'analyse demandée.

Identifier le type d'analyse et préparer les paramètres associés.

Résultat : un modèle d'analyse prêt à être résolu.

2. Résolution numérique
Responsabilité : résoudre les équations du circuit pour une analyse donnée.

Composition : modules de résolution spécialisés par type d'analyse (statique, dynamique, fréquentielle).

Règles :

Reçoit le modèle d'analyse en lecture seule.

Retourne les valeurs numériques brutes (points de courbe, valeurs nodales, etc.).

Ne conserve aucun état entre deux appels.

3. Production des résultats
Responsabilité : formater les résultats en un objet utilisable par l'interface.

Actions :

Ajouter des métadonnées (unités, seuils de précision, convergence).

Générer des alertes ou messages pédagogiques (ex: "Attention : résistance négative détectée").

Produire un objet structuré pour affichage ou export.

Flux de simulation
text
[Document Circuit] → [Préparation] → [Modèle d'analyse] → [Résolution] → [Résultats bruts]
                                                                              ↓
                                                                     [Production] → [Résultat structuré]
                                                                              ↓
                                                                 [Interface (lecture seule)]
Extensibilité
L'architecture est conçue pour être extensible à trois niveaux :

Nouvelle analyse : ajout d'un module de préparation et d'un module de résolution correspondant.

Nouveau composant : extension du modèle de données et adaptation de la préparation (sans toucher à la résolution ni à la production).

Nouveau format de résultat : extension du module de production.

Ces extensions se font sans modification des modules existants, respectant le principe Open/Closed.

Alternatives étudiées
Alternative	Raison du rejet
Moteur monolithique	Trop lourd, difficile à maintenir et à étendre ; pas adapté à une évolution fréquente.
Simulation purement fonctionnelle	Précise mais complexe à stabiliser ; manque de flexibilité pour différents types d'analyse.
Solveur unique capable de tout faire	Code complexe et peu maintenable ; difficile à tester.
API externe de simulation	Latence ; dépendance réseau ; ne permet pas le hors-ligne ni l'interactivité en temps réel.
Conséquences positives
✅ Séparation stricte : chaque module a une responsabilité unique, facile à tester.
✅ Extensibilité : on peut ajouter des analyses, des modèles ou des formats sans toucher au noyau.
✅ Performances optimisables : chaque module de résolution peut être optimisé indépendamment.
✅ Pédagogique : le module de production peut enrichir les résultats avec des explications.
✅ Sérialisable : le résultat structuré peut être sauvegardé, partagé ou exporté.
✅ Parallélisable : plusieurs simulations peuvent s'exécuter dans des environnements isolés.

Conséquences négatives
❌ Complexité initiale : mise en place des trois modules et de leurs interactions avant d'avoir un résultat visible.
❌ Surcharge mémoire : le modèle d'analyse peut être volumineux pour de gros circuits (à surveiller).
❌ Coût de préparation : la transformation Document → modèle d'analyse est effectuée à chaque simulation.
❌ Courbe d'apprentissage : les développeurs doivent comprendre les trois modules.

Impact sur les développements futurs
L'ajout d'une nouvelle analyse se fait par extension des modules de préparation et de résolution.

L'optimisation des performances peut se faire module par module (ex: spécialisation d'un solveur).

L'exportation des résultats (CSV, graphique) est naturelle via le module de production.

Une simulation en temps réel peut s'appuyer sur la même architecture en l'exécutant à intervalle régulier.

L'ajout d'un nouveau type de composant se fait au niveau du modèle et de la préparation, sans toucher à la résolution ni à la production.

Références ADR liées
ADR-001 : Document State comme Source Unique de Vérité

ADR-002 : Séparation UI / Modèle / Simulation

ADR-003 : VisualizationManager + Registry Pattern