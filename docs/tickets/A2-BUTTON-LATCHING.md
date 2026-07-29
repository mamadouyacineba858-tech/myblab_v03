# A2 - BUTTON_LATCHING

## Statut

**VALIDÉ - CLÔTURÉ**

- Ticket : A2
- Composant : `BUTTON_LATCHING`
- Commit : `8eb723f`
- Branche : `main`
- Tests : **40/40 passants**
- Tests A2 : **5/5 passants**
- Build production : **SUCCÈS**
- Push GitHub : **SUCCÈS**
- Non-régression A1 : **VALIDÉE**

## Objectif

Implémenter un bouton à verrouillage (`BUTTON_LATCHING`) permettant de maintenir
un état électrique stable après activation.

États supportés :

- `off` : circuit ouvert
- `on` : circuit fermé

## Fonctionnalités validées

- Affichage du composant dans la palette.
- Placement sur le canvas.
- État initial `OFF`.
- Toggle `OFF` vers `ON`.
- Toggle `ON` vers `OFF`.
- Rendu visuel distinct entre `ON` et `OFF`.
- Interaction avec le composant sans déplacement parasite.
- Déplacement volontaire du composant.
- Sélection du composant.
- Suppression du composant.
- Simulation électrique cohérente avec l'état du bouton.
- Historisation de l'action.
- Undo fonctionnel.
- Redo fonctionnel.
- Invalidation du Redo après nouvelle action.
- Non-régression du bouton momentané `BUTTON` (A1).

## Architecture

Le composant est intégré aux systèmes existants :

- Document System comme source de vérité.
- HistoryManager pour l'historique.
- `ToggleLatchingButtonCommand` pour les transitions d'état.
- Simulation Engine pour le comportement électrique.
- `PartRenderer` pour le rendu.
- `CircuitComponent` pour la gestion des interactions.
- `normalizeComponent()` pour la normalisation de l'état.
- `componentDefinitions.js` pour la définition et l'intégration du composant.

## Commande d'historique

La commande :

`ToggleLatchingButtonCommand`

gère :

- `apply()` : applique le nouvel état.
- `undo()` : restaure l'ancien état.

Les mutations passent par le Document System.

## Validation électrique

### État ON

Lorsque `BUTTON_LATCHING.state === "on"` :

- les deux pins du bouton sont électriquement connectés ;
- le signal est propagé entre les deux pins ;
- le circuit est considéré comme fermé.

### État OFF

Lorsque `BUTTON_LATCHING.state === "off"` :

- les deux pins sont isolés ;
- le signal n'est pas propagé entre les deux pins ;
- le circuit est considéré comme ouvert.

## Tests automatisés A2

Les tests couvrent :

1. Création du composant avec pins hydratés.
2. État initial `off`.
3. Normalisation de l'état `on`.
4. Normalisation d'un état invalide vers `off`.
5. Comportement électrique `on`.
6. Comportement électrique `off`.

Résultat :

**5 tests A2 passants.**

## Validation globale

Suite complète exécutée avec :

`npm test -- --run`

Résultat :

- Test Files : **9 passed**
- Tests : **40 passed**
- Échec : **0**

Build exécuté avec :

`npm run build`

Résultat :

**Build production réussi sans erreur.**

## Versioning

Commit de clôture du code A2 :

`8eb723f feat: implement A2 latching button (BUTTON_LATCHING)`

Synchronisation distante :

`origin/main` est à jour avec le commit de clôture A2.

## Décision

Le ticket **A2 - BUTTON_LATCHING est officiellement clôturé**.

Aucune modification supplémentaire du code A2 n'est requise.

Toute évolution future du comportement du bouton à verrouillage devra faire
l'objet d'un nouveau ticket ou d'une évolution explicitement identifiée.

---

**Statut final : A2 - CLÔTURÉ**