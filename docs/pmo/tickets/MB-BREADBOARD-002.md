# MB-BREADBOARD-002 — Implémentation Breadboard Connectivity V1

**Type:** Implementation Ticket  
**Parent:** MB-BREADBOARD-001  
**Phase:** 2 — Physical Assembly / Vague P2-4 / GAP-04  
**CSA Ruling:** GO — implémentation autorisée strictement selon ce ticket  
**Commit:** interdit jusqu'à validation CSA post-tests

---

## 1. Mission

Implémenter le modèle logique V1 du breadboard défini par `MB-BREADBOARD-001` et son Blueprint.

L'objectif est de faire du breadboard une **source réelle de connectivité électrique**, et non un décor.

---

## 2. Scope autorisé

### Domaine / Core
- modèle Document breadboard ;
- règles de validation breadboard ;
- commandes/mutations nécessaires, gouvernées par CF3 ;
- adaptateur de connectivité breadboard.

### Connectivité
- génération des arêtes virtuelles breadboard ;
- intégration additive au pipeline `buildNets()` ;
- aucun remplacement du solveur.

### Presentation
- rendu fonctionnel minimal nécessaire pour :
  - afficher le breadboard ;
  - afficher les trous ;
  - sélectionner/identifier un trou ;
  - visualiser une insertion ;
  - positionner les composants.

Le rendu est subordonné au modèle de domaine.

### Tests
- tests unitaires du modèle ;
- tests d'invariants ;
- tests de connectivité ;
- tests mutations/CF3 ;
- tests simulation ;
- tests observation ;
- tests non-régression Canvas/wires.

---

## 3. Fichiers

Le périmètre exact des fichiers doit être déterminé après inspection du dépôt.

**Autorisé :**
- fichiers existants du Document/Core nécessaires ;
- fichiers existants de validation nécessaires ;
- fichiers existants de connectivité nécessaires ;
- fichiers Presentation nécessaires au rendu V1 ;
- tests associés ;
- documentation du Delivery Report.

**Interdit :**
- modification du solveur électrique ;
- modification des contrats MB-OBS-001 ;
- modification du Runtime Arduino ;
- modification des clocks/schedulers ;
- modification de CF3 hors extension strictement nécessaire ;
- toute fonctionnalité hors V1.

Tout fichier non prévu par le périmètre constaté doit être signalé avant modification.

---

## 4. Contraintes architecturales

### LOCK-01
Un seul breadboard par Document.

### LOCK-02
La position d'insertion détermine la connectivité.

### LOCK-03
Les wires libres continuent de fonctionner.

### LOCK-04
Les relations breadboard sont converties en arêtes virtuelles.

### LOCK-05
`buildNets()` reste le mécanisme de fusion des composantes connexes.

### LOCK-06
Le solveur n'est pas modifié.

### LOCK-07
Aucun net calculé n'est persisté comme source de vérité.

### LOCK-08
Aucune logique de connectivité n'est propriétaire du rendu Presentation.

### LOCK-09
La rainure centrale reste isolante.

### LOCK-10
Les rails `+` et `−` restent indépendants.

### LOCK-11
Les composants à deux broches seulement sont supportés en V1.

### LOCK-12
Aucun timer, scheduler ou horloge nouvelle n'est introduit.

---

## 5. Critères d'acceptation

### AC-01 — Document
Un Document peut représenter un breadboard V1 sans casser les Documents existants.

### AC-02 — Grille
Le breadboard utilise une grille dédiée correspondant au pas 0,1″ et non `GRID_SIZE`.

### AC-03 — Groupes de cinq
Chaque groupe de cinq trous est électriquement connecté.

### AC-04 — Isolation
Les groupes voisins et les groupes opposés par la rainure restent isolés.

### AC-05 — Rails
Chaque rail est continu et `+` reste indépendant de `−`.

### AC-06 — Insertion
Une patte insérée rejoint automatiquement le groupe du trou.

### AC-07 — Retrait
Après retrait, aucune connexion résiduelle ne subsiste.

### AC-08 — Patte unique
Une même patte ne peut pas être présente dans deux trous.

### AC-09 — Wires libres
Les wires existants fonctionnent sans régression.

### AC-10 — Fusion
Une connexion wire vers un trou fusionne correctement avec le groupe breadboard.

### AC-11 — buildNets
La connectivité breadboard est consommée par le mécanisme de construction des nets existant.

### AC-12 — Solveur
Aucune modification du solveur n'est nécessaire pour résoudre un circuit équivalent.

### AC-13 — Simulation
Un circuit assemblé sur breadboard produit le même résultat qu'un circuit topologiquement équivalent câblé explicitement.

### AC-14 — Observation
Les nets issus du breadboard sont observables par le contrat existant.

### AC-15 — Validation
Les erreurs de montage V1 sont détectées.

### AC-16 — CF3
Toutes les mutations passent par le canal gouverné.

### AC-17 — Reconstruction
La connectivité est reconstruisible à partir du Document seul.

### AC-18 — Presentation
Le rendu ne contient aucune seconde source de vérité électrique.

### AC-19 — Non-régression
Toutes les suites existantes restent vertes.

### AC-20 — Scope
Aucun changement hors périmètre n'est introduit.

---

## 6. Tests obligatoires

### TB-01
Deux pins dans le même groupe de cinq → même net.

### TB-02
Deux groupes voisins → nets différents.

### TB-03
Deux pins de part et d'autre de la rainure → nets différents.

### TB-04
Deux positions éloignées sur le même rail `+` → même net.

### TB-05
Rail `+` et rail `−` → nets différents.

### TB-06
Breadboard + wire explicite → fusion correcte.

### TB-07
Retrait d'une insertion → net reconstruit sans l'insertion.

### TB-08
Déplacement d'une insertion → ancien groupe libéré, nouveau groupe utilisé.

### TB-09
Insertion invalide → mutation refusée.

### TB-10
Patte déjà insérée → mutation refusée.

### TB-11
Circuit LED/résistance minimal assemblé par breadboard → simulation correcte.

### TB-12
Circuit équivalent par wires explicites → même résultat.

### TB-13
Observation d'un net breadboard → résultat conforme au contrat existant.

### TB-14
Document sans breadboard → comportement strictement inchangé.

### TB-15
Canvas libre sans breadboard → comportement strictement inchangé.

---

## 7. Preuve end-to-end minimale

```text
5V
 │
wire
 │
breadboard rail +
 │
resistance
 │
terminal group
 │
LED
 │
terminal group
 │
GND
```

La preuve doit démontrer :

- insertion ;
- formation automatique des nets ;
- simulation ;
- observation ;
- retrait ;
- reconstruction ;
- absence de régression.

---

## 8. Gouvernance d'exécution

### Étape 1
Audit lecture seule du dépôt.

### Étape 2
Identifier les fichiers réellement nécessaires.

### Étape 3
Implémenter strictement le modèle et la connectivité.

### Étape 4
Ajouter les tests obligatoires.

### Étape 5
Exécuter :

```powershell
npm test
npm run build
git diff --check
```

et toute suite ciblée pertinente.

### Étape 6
Rapport Delivery avec :

- fichiers touchés ;
- tests ;
- résultats ;
- invariants ;
- limites ;
- écarts éventuels.

### Étape 7
**STOP avant commit.**

Le CSA valide les résultats.

### Étape 8
Après GO CSA seulement :

```powershell
git add <scope exact>
git diff --cached --check
git commit -m "feat(breadboard): implement V1 connectivity model"
git push origin main
```

---

## 9. Interdictions

Ne pas :

- construire uniquement une grille visuelle ;
- contourner CF3 ;
- stocker des nets calculés ;
- modifier le solveur ;
- introduire une seconde logique de connectivité dans React ;
- introduire une horloge ;
- introduire Arduino/runtime ;
- implémenter les IC à cheval sur la rainure ;
- implémenter plusieurs breadboards ;
- élargir le ticket sans ruling CSA.

---

## 10. Definition of Done

Le ticket n'est terminé que si :

- [ ] modèle Document validé ;
- [ ] groupes/rails validés ;
- [ ] insertion/retrait validés ;
- [ ] connectivité virtuelle validée ;
- [ ] `buildNets()` intégré sans rupture ;
- [ ] simulation validée ;
- [ ] observation validée ;
- [ ] CF3 validé ;
- [ ] Canvas libre non régressé ;
- [ ] tests obligatoires verts ;
- [ ] build vert ;
- [ ] diff-check vert ;
- [ ] Delivery Report produit ;
- [ ] CSA post-implémentation GO ;
- [ ] commit/push effectués uniquement après GO.

---

## 11. Note de correction de périmètre (2026-08-25, post-audit lecture seule)

L'audit lecture seule (Étape 1/2) a établi que `buildNets()` (LOCK-05, AC-11) n'est consommé que par `PowerGroundShortCircuitRule` et n'alimente PAS le solveur réel : `engine.js`/`simulationRuntimeIntegration.js` appellent un second mécanisme indépendant, `simulator/preparation.js::prepareCircuit()`. Le CSA a confirmé (2026-08-25) que la connectivité breadboard doit être branchée sur **les deux** mécanismes pour que AC-13 soit atteignable, sans modifier l'algorithme interne d'aucun des deux (LOCK-06 préservé). Détail technique complet : `docs/pmo/blueprints/MB-BREADBOARD-001-breadboard-connectivity-blueprint.md` §1 et §5, qui fait désormais foi pour le contenu concret (schéma, algorithme, fichiers) requis avant écriture de code, en complément — et non en remplacement — des LOCK/AC/TB ci-dessus.

---

# CSA RULING

**GO — MB-BREADBOARD-002 est autorisé à être implémenté.**

Conditions :

1. respect intégral du Blueprint MB-BREADBOARD-001 (`docs/pmo/blueprints/MB-BREADBOARD-001-breadboard-connectivity-blueprint.md`), y compris la correction de périmètre §11 ci-dessus ;
2. respect des LOCK-01 à LOCK-12 ;
3. respect des AC-01 à AC-20 ;
4. aucune extension de périmètre sans nouveau ruling CSA ;
5. aucun commit avant validation post-implémentation.

**Ruling : GO IMPLÉMENTATION V1.**

---

## 12. Note de clôture des points ouverts (2026-08-25, feu vert CSA post-lot-1)

Le premier lot d'implémentation (cf. `docs/pmo/delivery-reports/MB-BREADBOARD-002-delivery-report.md` §1-§4, tel que livré avant cette note) couvrait AC-01→13/15→20 mais laissait deux points explicitement ouverts (§5.1/§5.2 du rapport à cette date) : AC-14/TB-13 (observation des nets breadboard) et la Presentation (`Breadboard.jsx`, §8 du Blueprint). Le CSA a donné son feu vert le 2026-08-25 pour corriger les deux dans le même lot (« tu as mon feu vert sur les Deux points ouverts, non traités par ce lot tu peux les corriger »).

Résolution, détaillée dans le Delivery Report mis à jour (§3 point 4, §5.1, §5.2) :
- AC-14/TB-13 : prouvé sans modifier aucun contrat `MB-OBS-001` (`observe`/`measure`/`observeTemporal` inchangés), via `breadboardMeasurementIntegration.test.js`.
- Presentation : `frontend/src/canvas/Breadboard.jsx` (+ `.css`) créé et monté dans `SimulationCanvas.jsx`, conformément au Blueprint §8, LOCK-08 respecté.
- Un bug réel du premier lot a été trouvé et corrigé au passage : `useCircuitState.js` n'avait aucun état React dédié à `document.breadboard` (`getDocument()`/`applyDocument()` ne le portaient pas) — sans ce correctif, la Presentation n'aurait jamais eu de breadboard à afficher en pratique, et LOCK-01 n'était opérant qu'au niveau du Handler isolé (jamais exercé par le canal réel avant ce lot).

Portée non couverte par ce feu vert, disclosed pour arbitrage séparé si souhaité : TB-10 comme preuve explicite (au lieu d'une déduction structurelle), et une affordance UI pour déclencher `addBreadboard()` depuis l'interface (aucune n'existe à ce jour — hors périmètre du feu vert du 2026-08-25, AC-20).

Aucun commit n'a été effectué à l'issue de ce second lot — Étape 7 toujours en vigueur, décision de commit/push laissée au CSA.
