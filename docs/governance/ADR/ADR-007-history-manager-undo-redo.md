ADR-007 — Architecture Undo/Redo (History Manager) 
Statut : ACCEPTED
Date : 2026-08-04
Auteur : Équipe Architecture MYBlab
Statut de validation : Validé par le Chief Software Architect

Contexte
MYBlab est un outil de conception de circuits où les utilisateurs effectuent de nombreuses actions : ajout de composants, connexions, modifications de paramètres, etc. Ces actions sont souvent exploratoires : les utilisateurs expérimentent, testent, annulent, comparent.

Sans système d'annulation, l'utilisateur perd la capacité d'explorer librement et risque de perdre son travail. Le Document Circuit étant l'unique source de vérité (ADR-001), le système d'undo/redo doit agir sur ce document sans le corrompre.

De plus, le système doit respecter la séparation des couches (ADR-002) : il ne doit dépendre ni de l'interface ni de la simulation.

Problème
Comment concevoir un mécanisme d'undo/redo qui :

Préserve l'intégrité du Document Circuit (ADR-001) ;

Respecte la séparation des couches (ADR-002) ;

Permette d'annuler et de rétablir toute action utilisateur ;

Soit rejouable : chaque action peut être annulée puis refaite ;

Offre une traçabilité des modifications ;

Soit indépendant de l'interface et de la simulation ;

Supporte des actions complexes (ex: suppression multiple) ?

Décision
Nous adoptons une architecture basée sur un History Manager et le pattern Commande.

Principe général
Le système d'undo/redo repose sur trois éléments :

Les transformations du Document : toute modification du Document est une transformation pure (fonction document → document).

L'historique des transformations : une liste ordonnée des transformations appliquées.

Un curseur (pointeur) : indique la position courante dans l'historique.

History Manager
Le History Manager est responsable de :

Stockage : conserver la séquence des transformations.

Position : maintenir un curseur sur la transformation courante.

Annulation : déplacer le curseur vers l'arrière et appliquer les transformations inverses.

Rétablissement : déplacer le curseur vers l'avant et réappliquer les transformations.

Limitation : limiter la taille de l'historique (optionnel).

Rejouabilité : garantir que toute séquence de transformations peut être rejouée et annulée.

Principe d'invariance
Le système garantit deux invariants :

Après toute opération (annulation, rétablissement, nouvelle action) : le Document est dans un état valide et cohérent.

Après toute opération : la position du curseur reflète l'état courant du Document.

Intégration avec le flux unidirectionnel
Le système s'intègre au flux défini dans ADR-002 :

L'interface émet une intention (ex: ajouterComposant).

L'intention est transformée en une transformation sur le Document.

La transformation est appliquée → nouveau Document.

La transformation est enregistrée dans l'historique.

Le curseur avance.

Pour l'annulation :

L'interface demande l'annulation.

Le History Manager recule le curseur.

Le Document est restauré à l'état correspondant au curseur.

L'interface est mise à jour avec le nouveau Document.

Traçabilité
L'historique peut stocker, en plus des transformations, des métadonnées :

Horodatage

Type d'action

Identifiant de l'utilisateur (si multi-utilisateur)

Description lisible par l'humain

Ces métadonnées sont facultatives mais utiles pour le débogage et l'audit.

Alternatives étudiées
Alternative	Raison du rejet
Snapshot du document entier	Trop lourd ; inefficace pour des circuits importants.
Sauvegarde des états précédents	Même problème mémoire ; difficile à gérer.
Action inverse explicite	Chaque action devrait connaître son inverse ; complexe à maintenir.
Pas d'undo/redo	Inacceptable en conception interactive ; frustrant pour l'utilisateur.
Stockage côté interface	Violation de la séparation des couches ; risque de désynchronisation.
Conséquences positives
✅ Intégrité : l'historique agit sur le Document via transformations pures.
✅ Séparation : le History Manager ne dépend ni de l'interface ni de la simulation.
✅ Rejouabilité : toute séquence peut être rejouée pour reproduire des bugs.
✅ Traçabilité : on peut auditer toutes les modifications du circuit.
✅ Testabilité : l'historique peut être testé indépendamment.
✅ Compatibilité : facilement intégrable avec le flux unidirectionnel (ADR-002).

Conséquences négatives
❌ Mémoire : l'historique stocke toutes les transformations ; peut être lourd si les transformations sont volumineuses.
❌ Performance : les performances du système dépendent de la stratégie de stockage et de restauration retenue.
❌ Complexité : mise en place du pattern Commande et du gestionnaire de curseur.
❌ Limite : la profondeur de l'historique doit être limitée pour éviter l'épuisement mémoire.

Impact sur les développements futurs
Toute nouvelle action devra être exprimée comme une transformation pure (fonction document → document) pour être compatible avec l'undo/redo.

La simulation devra être rejouable sur un Document restauré (ce qu'elle permet déjà, ADR-004).

L'historique pourra être sérialisé pour permettre le "time travel" (déplacement dans le temps du circuit).

L'audit des modifications pourra être enrichi avec des métadonnées de traçabilité.

Références ADR liées
ADR-001 : Document State comme Source Unique de Vérité

ADR-002 : Séparation UI / Modèle / Simulation

ADR-003 : VisualizationManager + Registry Pattern

ADR-005 : Architecture du modèle de composants électroniques