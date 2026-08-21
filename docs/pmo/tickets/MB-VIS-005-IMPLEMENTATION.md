# MB-VIS-005-IMPLEMENTATION — Exécution du routage utilisateur des fils

**Ticket parent :** `docs/pmo/tickets/MB-VIS-005.md`  
**Programme :** Experience  
**Épic :** EXP2 — Visualisation des fils  
**Type :** Ticket PMO — Implémentation  
**Statut :** READY FOR IMPLEMENTATION  
**Priorité :** P1 — Seuil Tinkercad  
**Base contractuelle :** `a34ffc2f56c1b930128833ed6ea698c350db4e83`  

---

## 1. Autorité du ticket

Ce ticket est le **ticket d'exécution** de MB-VIS-005.

Le contrat fonctionnel, architectural, les invariants, les exclusions et les critères d'acceptation sont ceux du ticket parent `MB-VIS-005.md`, désormais audité et déclaré **PASS — TICKET CONTRACTUELLEMENT FERMÉ** par Qwen et Claude sur `a34ffc2`.

En cas de divergence entre ce ticket d'exécution et le ticket parent :

1. le ticket parent fait autorité pour le contrat ;
2. les ADR et décisions CSA verrouillées font autorité pour l'architecture ;
3. aucune interprétation de l'agent ne peut élargir le scope.

**Ce ticket n'autorise aucune réouverture architecturale.**

---

## 2. Mission d'implémentation

Implémenter MB-VIS-005 de bout en bout :

- persister `waypoints` dans le modèle `Wire` ;
- faire transiter toute modification par CF3 ;
- valider les waypoints avant mutation ;
- historiser les modifications avec Undo/Redo ;
- préserver les waypoints dans toutes les normalisations et tous les chemins documentaires concernés ;
- rendre les waypoints dans la géométrie du Wire ;
- permettre leur création, déplacement et suppression par l'utilisateur ;
- maintenir la rétrocompatibilité des documents existants ;
- préserver MB-VIS-004 et ADR-014.

L'implémentation doit aboutir à la satisfaction de **AC-01 à AC-14** du ticket parent.

---

## 3. Préconditions obligatoires

Avant toute modification de code, l'agent d'implémentation doit :

1. vérifier que le dépôt est propre ;
2. vérifier que `HEAD` correspond au commit de référence ou à un descendant explicitement autorisé ;
3. lire intégralement `docs/pmo/tickets/MB-VIS-005.md` ;
4. vérifier ADR-008 amendé, ADR-014, CF3 et les règles de gouvernance associées ;
5. inspecter l'état réel des fichiers impactés ;
6. identifier les tests existants pertinents avant de modifier le code.

Aucune implémentation ne doit commencer sur une base locale désynchronisée ou avec des modifications étrangères au ticket.

---

## 4. Périmètre technique d'exécution

### 4.1 Document / Wire

Étendre le contrat du Wire avec :

```javascript
waypoints: Array<{ x: number, y: number }>
```

Garantir :

- `waypoints: []` pour les Wire historiques dépourvus du champ ;
- conservation de `pinA` et `pinB` ;
- sérialisation/désérialisation sans perte ;
- absence de propriété de rendu arbitraire dans le Document.

### 4.2 Normalisation obligatoire

Modifier si nécessaire :

`frontend/src/utils/circuitModel.js::normalizeWire()`

pour préserver intégralement `waypoints`.

Vérifier les trois chemins identifiés dans le ticket parent :

- calcul de `safeWires` ;
- `documentApi.applyDocument` ;
- import de document.

Aucun de ces chemins ne doit supprimer, tronquer ou réinitialiser silencieusement les waypoints.

### 4.3 Mutation CF3

Introduire une seule mutation persistante pour les waypoints, conformément au contrat parent :

```text
UI → CommandBus → Handler → HistoryService → Document
```

Le nom exact de la commande et du Handler doit suivre les conventions CF3 existantes.

La mutation doit remplacer atomiquement le tableau complet des waypoints.

Aucune mutation directe du Document depuis Presentation n'est autorisée.

### 4.4 Validation

Implémenter la validation minimale définie par le parent :

- tableau ;
- coordonnées `x` et `y` numériques et finies ;
- rejet de `NaN`, `Infinity` et structures malformées ;
- conservation de l'intégrité topologique du Wire ;
- aucun waypoint dans le Registry des pins.

La validation doit intervenir avant toute application de la mutation via le mécanisme CF3 existant.

### 4.5 History / Undo / Redo

Réutiliser exclusivement l'infrastructure History existante.

Une mutation doit permettre :

- Undo de l'état complet précédent ;
- Redo de l'état complet suivant ;
- invalidation du Redo après une nouvelle action, selon le contrat History existant.

Aucun système parallèle d'historisation ne doit être créé.

### 4.6 Géométrie

Les fonctions explicitement identifiées par le contrat sont :

- `frontend/src/wires/wirePath.js::buildWirePath()` ;
- `frontend/src/utils/circuitSelectors.js::buildWirePaths()`.

Elles doivent consommer les waypoints persistants dans leur ordre.

Si `waypoints` est vide, le comportement de routage par défaut doit rester compatible avec l'existant.

Le choix précis de l'algorithme de géométrie doit rester cohérent avec le contrat existant et ne doit pas entraîner de refonte générale hors scope.

### 4.7 Interaction utilisateur

Fournir les comportements fonctionnels suivants :

1. sélectionner un Wire et éditer son routage ;
2. créer un waypoint ;
3. déplacer un waypoint ;
4. supprimer un waypoint ;
5. persister chaque modification via la mutation unique ;
6. mettre à jour immédiatement le tracé ;
7. rendre Undo/Redo opérationnels.

Le mécanisme UX précis reste libre dans les limites du ticket parent.

---

## 5. Verrou de gouvernance — CommandRegistry

`frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` est un verrou architectural existant.

Avant tout enregistrement de la nouvelle commande de waypoints :

- un **ruling CSA traçable** doit autoriser l'amendement du verrou ;
- le test ne doit pas être supprimé, affaibli ou contourné ;
- l'amendement doit autoriser explicitement la nouvelle commande et rien de plus.

**Interdiction :** enregistrer la commande puis tenter de régulariser le ruling après coup.

Si l'agent rencontre ce verrou sans ruling CSA disponible, il doit s'arrêter sur ce point et produire un rapport factuel plutôt que contourner le garde-fou.

---

## 6. Séquence d'exécution obligatoire

L'implémentation doit suivre cette séquence logique :

### Phase A — Préparation

- état Git propre ;
- lecture du contrat ;
- inspection des points d'impact ;
- identification des tests existants.

### Phase B — Document

- étendre le Wire ;
- rétrocompatibilité ;
- normalisation ;
- tests Document/normalisation.

### Phase C — Validation + mutation

- règle de validation ;
- Handler ;
- branchement CommandBus/registry selon gouvernance ;
- History ;
- tests unitaires et intégration.

### Phase D — Géométrie

- `buildWirePath()` ;
- `buildWirePaths()` ;
- consommation des waypoints ;
- non-régression du Wire sans waypoint ;
- tests géométriques.

### Phase E — Interaction

- création ;
- déplacement ;
- suppression ;
- mise à jour immédiate ;
- Undo/Redo ;
- tests d'intégration/E2E.

### Phase F — Vérification finale

- AC-01 à AC-14 ;
- tests ciblés ;
- suite pertinente complète ;
- `git diff --check` ;
- contrôle du scope ;
- rapport final d'implémentation.

---

## 7. Tests obligatoires

L'implémentation doit fournir au minimum :

### Document / rétrocompatibilité

- Wire sans waypoints ;
- `waypoints: []` ;
- plusieurs waypoints ;
- sérialisation/désérialisation ;
- document historique sans champ.

### Mutation / validation

- mutation valide ;
- mutation invalide ;
- Wire inexistant ;
- tableau vide ;
- plusieurs waypoints ;
- coordonnées invalides ;
- validation avant application ;
- absence de mutation directe.

### History

- Undo ;
- Redo ;
- nouvelle action après Undo ;
- modifications successives.

### Normalisation

- `normalizeWire()` préserve `[]` ;
- préserve un waypoint ;
- préserve plusieurs waypoints ;
- vérification des trois chemins documentés.

### Géométrie

- zéro waypoint ;
- un waypoint ;
- plusieurs waypoints ;
- ordre des waypoints ;
- déplacement ;
- suppression ;
- non-régression MB-VIS-004.

### Gouvernance

- `cf1DocumentArchitecture.test.js` reste vert après l'amendement autorisé ;
- aucune commande supplémentaire non autorisée n'est enregistrée.

---

## 8. Critères de sortie de l'implémentation

Le ticket d'exécution n'est considéré comme terminé que si :

- [ ] AC-01 à AC-14 sont satisfaits ;
- [ ] tous les tests pertinents passent ;
- [ ] aucun waypoint n'est perdu via `normalizeWire()` ;
- [ ] CF3 est le seul canal de mutation persistante ;
- [ ] Undo/Redo fonctionnent ;
- [ ] la géométrie utilise réellement les waypoints ;
- [ ] les trois opérations utilisateur sont fonctionnelles ;
- [ ] la rétrocompatibilité est démontrée ;
- [ ] MB-VIS-004 reste fonctionnel ;
- [ ] ADR-014 reste inchangé ;
- [ ] le verrou `cf1DocumentArchitecture.test.js` a été amendé uniquement sous ruling CSA ;
- [ ] aucun changement hors scope n'est présent dans le diff final ;
- [ ] `git diff --check` est propre ;
- [ ] le rapport final identifie précisément les fichiers modifiés, tests exécutés, résultats et commit produit.

---

## 9. Règles de gouvernance d'exécution

1. **Aucune nouvelle décision architecturale** n'est autorisée dans l'implémentation.
2. **Aucun élargissement de scope** sans nouveau ticket et arbitrage CSA.
3. Les exclusions du ticket parent restent obligatoires.
4. Aucun contournement de CF3.
5. Aucun contournement du verrou `cf1DocumentArchitecture.test.js`.
6. Aucun stockage persistant parallèle dans Presentation.
7. Aucun changement de `pin.id`, Registry canonique ou contrat ADR-014.
8. Aucun pathfinding, évitement d'obstacles ou détection de croisement.
9. Les choix UX non verrouillés peuvent être décidés par l'agent, mais doivent rester cohérents avec l'application et ne peuvent modifier le contrat fonctionnel.
10. Toute difficulté bloquante doit être remontée factuellement au CSA ; l'agent ne doit pas inventer une décision pour poursuivre.

---

## 10. Livrables attendus

L'agent d'implémentation doit fournir :

1. le code de MB-VIS-005 ;
2. les tests associés ;
3. le rapport de vérification AC-01 à AC-14 ;
4. la liste exacte des fichiers modifiés ;
5. les résultats des tests ;
6. le diff final vérifié ;
7. le commit d'implémentation local, conformément au protocole du projet.

**Push / intégration / fusion :** hors de ce ticket, sauf instruction CSA explicite ultérieure.

---

## 11. Interdiction explicite

Ce ticket n'autorise pas :

- une implémentation partielle présentée comme terminée ;
- un contournement des tests de gouvernance ;
- une modification silencieuse des ADR ;
- une modification de MB-VIS-004 pour compenser un problème de MB-VIS-005 ;
- une migration opportuniste d'autres mutations CF3 ;
- un commit mélangeant MB-VIS-005 et des travaux étrangers au ticket.

---

## 12. État attendu après exécution

Le résultat attendu est un **MB-VIS-005 implémenté, testé et localement commité**, mais pas encore intégré ou poussé sans validation CSA ultérieure.

Le prochain contrôle après implémentation sera un audit de conformité du diff et des tests, avant toute intégration finale.
