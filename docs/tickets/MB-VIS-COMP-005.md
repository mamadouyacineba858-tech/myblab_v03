# MB-VIS-COMP-005 — Component Registry Completeness & Contract Guards

## Statut

**PROPOSED — P1**

## Objectif

Empêcher qu'un composant déclaré soit partiellement enregistré dans les différents registres nécessaires.

## Travail demandé

1. Identifier les registres obligatoires pour les composants actuels.
2. Ajouter un test de complétude entre les types déclarés et les registrations requises.
3. Distinguer les composants statiques des composants nécessitant modèle électrique, état ou resolver visuel.
4. Faire échouer explicitement le test en cas d'enregistrement manquant.
5. Ne pas imposer artificiellement un modèle ou un resolver à un composant qui n'en a pas besoin.

## Critères d'acceptation

- un nouveau type incomplet produit un échec de test explicite ;
- les composants actuels satisfont le contrat ;
- le test décrit clairement quel registre manque ;
- aucune logique de production n'est ajoutée uniquement pour satisfaire le test ;
- tous les tests existants restent verts.
