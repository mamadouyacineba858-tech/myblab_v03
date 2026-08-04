# ADR-010 — Architecture du moteur de validation métier (Validation Engine) 

**Statut :** PROPOSED  
**Date :** 2026-08-04  
**Auteur :** Équipe Architecture MYBlab  
**Statut de validation :** Validé par le Chief Software Architect

---

## Contexte

MYBlab possède désormais un modèle de composants (ADR-005), un modèle de connexions (ADR-008) et un système de commandes (ADR-009) qui permettent aux utilisateurs de créer et modifier des circuits électroniques.

Cependant, rien ne garantit actuellement que les circuits ainsi créés sont **électriquement cohérents** ou **exploitables par la simulation** (ADR-004). Sans validation, les situations suivantes peuvent se produire :

- Des valeurs de composants invalides (résistance négative, capacité nulle).
- Des connexions impossibles (deux sorties connectées entre elles).
- Des circuits incomplets (aucune source d'alimentation).
- Des composants flottants (pins non connectées).
- Des courts-circuits directs entre alimentation et masse.

Ces incohérences conduisent à des échecs de simulation silencieux ou à des erreurs techniques incompréhensibles, particulièrement problématiques dans un contexte pédagogique où les utilisateurs sont des étudiants en apprentissage.

Le système de validation doit agir comme un **gardien** qui préserve l'intégrité du Document Circuit (ADR-001) tout en guidant l'utilisateur avec des messages clairs et pédagogiques.

---

## Problème

Comment concevoir un système de validation qui :

1. **Garantit l'intégrité** du Document Circuit à tout moment ;
2. **Prévient les incohérences** avant qu'elles n'atteignent la simulation ;
3. **Guide l'utilisateur** avec des messages clairs et pédagogiques ;
4. Soit **extensible** à de nouvelles règles (Open/Closed) ;
5. **Ne bloque pas** la créativité (distinction erreurs / warnings / infos) ;
6. **Respecte** ADR-001 (Document State) et ADR-002 (séparation des couches) ;
7. **S'intègre** avec le Command Bus (ADR-009) ;
8. **Ne dépend pas** de l'interface ni de la simulation ;
9. **N'applique jamais** de modifications au Document (seulement analyse) ?

---

## Décision

Nous adoptons une architecture de **Validation Engine** organisée autour d'un **registre de règles extensible**.

### Architecture globale

```
Command (ADR-009)
       |
       ↓
Validation Engine
       |
       ↓
Validation Report
       |
       ↓
 Command Handler
       |
       ↓
Nouveau Document (si validation OK ou WARNING)
```

### Positionnement dans le flux

Le Validation Engine s'insère entre la réception d'une commande et son exécution par le Handler :

1. L'interface émet une commande (ADR-009).
2. Le Command Bus reçoit la commande.
3. **Le Validation Engine analyse la commande et le Document courant.**
4. Il produit un **Rapport de Validation**.
5. Si le rapport contient des **erreurs bloquantes**, la commande est rejetée et l'erreur est renvoyée à l'interface.
6. Si le rapport contient uniquement des **warnings** ou des **infos**, la commande est exécutée (le rapport est attaché au résultat).
7. Le Command Handler applique la transformation.
8. Le Document est mis à jour (ADR-001).
9. L'interface affiche le résultat et les éventuels warnings/infos.

**Le Validation Engine possède deux modes d'utilisation :**

1. **Validation pré-exécution** : analyse d'une commande avant son application. Objectif : empêcher les modifications impossibles.
2. **Validation post-exécution** : analyse du nouveau Document produit par le Handler. Objectif : garantir que le nouvel état respecte les invariants métier.

Le Command Bus peut utiliser ces deux validations selon la criticité de l'opération.

---

### 1. Validation Engine

Le Validation Engine est le **composant central** du système de validation.

**Responsabilités :**

- Recevoir une commande et le Document courant (état avant exécution).
- Consulter le **Registry des règles**.
- Exécuter toutes les règles de validation pertinentes.
- Produire un **Rapport de Validation** structuré.
- Retourner le rapport (sans modifier aucun état).

**Ce que le Validation Engine ne fait pas :**

- Il n'applique pas de modifications au Document.
- Il ne stocke pas d'état persistant.
- Il ne connaît pas l'interface ni la simulation.
- Il ne décide pas de l'exécution de la commande (il produit un rapport, le Command Bus décide).

---

### 2. Registry des règles de validation

Les règles de validation sont organisées dans un **Registre extensible**.

**Principe :**

- Chaque règle est une fonction ou module indépendant.
- Chaque règle est enregistrée dans le Registre avec :
  - Un identifiant unique.
  - Une catégorie (structurelle, électrique, pédagogique).
  - Un niveau par défaut (ERROR, WARNING, INFO).
  - Une fonction de validation (reçoit Document + commande → retourne un problème ou rien).

**Extensibilité (Open/Closed) :**

- Pour ajouter une nouvelle règle : on crée le module et on l'enregistre.
- **Aucune modification** du Validation Engine ou des autres règles n'est nécessaire.

Une règle est ajoutée au registre par enregistrement de son identifiant, sa catégorie, son niveau et sa fonction d'analyse.

---

### 3. Rapport de validation

Le Rapport de Validation est la **sortie unique** du Validation Engine.

**Structure :**

```
ValidationReport
  ├─ status: "OK" | "WARNING" | "ERROR"
  ├─ timestamp: horodatage
  ├─ errors: [Problem, ...]       (bloquants)
  ├─ warnings: [Problem, ...]     (non bloquants)
  └─ infos: [Problem, ...]        (suggestions)
```

**Chaque problème contient :**

```
Problem
  ├─ id: identifiant unique de la règle
  ├─ level: "ERROR" | "WARNING" | "INFO"
  ├─ message: "La résistance R1 a une valeur négative (-100 Ω)."
  ├─ explanation: "Une résistance doit avoir une valeur positive ou nulle."
  ├─ suggestion: "Modifiez la valeur de R1 pour qu'elle soit supérieure à 0 Ω."
  ├─ context:
  │   ├─ componentId: (si applicable)
  │   ├─ wireId: (si applicable)
  │   └─ pinId: (si applicable)
  └─ ruleId: "resistor_positive_value"
```

Le rapport est sérialisable, traçable et affichable par l'interface.

---

### 4. Niveaux de validation

Le système distingue **trois niveaux** :

| Niveau   | Signification                         | Impact sur l'exécution |
| -------- | ------------------------------------- | ---------------------- |
| **ERROR** | Problème bloquant, circuit invalide   | Commande rejetée       |
| **WARNING** | Problème potentiel, circuit valide | Commande autorisée     |
| **INFO**   | Suggestion pédagogique                | Commande autorisée     |

**Exemples :**

- **ERROR** : valeur négative, pin inexistante, court-circuit direct.
- **WARNING** : composant flottant, valeur inhabituelle.
- **INFO** : suggestion d'optimisation, nom non unique.

Cette distinction est essentielle pour un outil pédagogique : l'étudiant doit pouvoir expérimenter (warnings autorisés), mais pas produire des circuits physiquement impossibles (erreurs bloquantes).

---

### 5. Intégration avec le Command Bus (ADR-009)

Le Validation Engine s'intègre **avant** l'exécution des commandes.

**Flux :**

```text
Commande entrante
        ↓
Validation Engine (valide Commande + Document)
        ↓
   (ERROR) → Rejet de la commande, retour de l'erreur
   (WARNING) → Exécution de la commande avec warnings attachés
   (OK) → Exécution normale
```

Le Command Bus (ADR-009) est responsable de :

- Appeler le Validation Engine avant chaque commande.
- Interpréter le statut du rapport.
- Rejeter les commandes avec des erreurs bloquantes.
- Transmettre les warnings/infos à l'interface via le résultat.

---

### 6. Règles de validation principales

Le système définit au minimum les règles suivantes :

**Règles structurelles (intégrité du Document) :**

- Un composant doit avoir un type valide (référencé dans ADR-005).
- Un composant doit avoir au moins un pin.
- Une connexion doit référencer des pins existants (ADR-008).
- Un wire ne peut pas être connecté deux fois à la même extrémité (boucle sur soi-même).

**Règles électriques (cohérence physique) :**

- Une résistance doit avoir une valeur positive.
- Un condensateur doit avoir une capacité positive.
- Une source de tension doit avoir une valeur définie.
- Une source de courant doit avoir une valeur définie.
- Aucune connexion directe entre VCC et GND (court-circuit).
- Deux sorties ne peuvent pas être connectées ensemble.
- Le circuit doit comporter au moins une source d'alimentation.

**Règles pédagogiques (qualité du circuit) :**

- Chaque pin d'entrée doit être connectée (warning).
- Les noms des composants devraient être uniques (info).
- Les valeurs devraient être dans une plage réaliste (warning).

---

### 7. Extensibilité et registre

Le Registre des règles permet l'extension sans modification du noyau.

L'ajout d'une nouvelle règle consiste à :

1. Définir la fonction de validation.
2. Définir son identifiant, sa catégorie et son niveau.
3. Enregistrer la règle dans le Registre.
4. **Aucune modification** du Validation Engine ou du Command Bus n'est nécessaire.

---

### 8. Messages pédagogiques

Les messages produits par le moteur de validation doivent être :

- **Clairs** : "La résistance R1 a une valeur négative."
- **Expliqués** : "Une résistance doit avoir une valeur positive ou nulle."
- **Actionnables** : "Modifiez la valeur de R1 pour qu'elle soit supérieure à 0 Ω."
- **Contextualisés** : référencer le composant/connexion concerné.

Les messages sont rédigés dans un langage compréhensible par des étudiants, pas par des ingénieurs en électronique.

---

## Alternatives étudiées

| Alternative | Raison du rejet |
|-------------|-----------------|
| **Validation uniquement au moment de la simulation** | L'utilisateur découvre les erreurs trop tard ; messages techniques incompréhensibles ; non pédagogique. |
| **Validation dans l'interface utilisateur** | Violation ADR-002 (logique métier dans l'UI) ; non réutilisable ; tests difficiles. |
| **Validation parfaite bloquante (erreur = rejet)** | Trop rigide ; empêche l'exploration pédagogique ; pas de distinction erreur/warning. |
| **Pas de validation** | Simulation échoue silencieusement ; données corrompues ; incompatible avec un outil éducatif. |
| **Validation qui modifie le Document** | Crée un deuxième acteur modifiant l'état (ADR-001) ; conflit avec Command Bus. |

---

## Conséquences positives

✅ **Intégrité garantie** : le Document est toujours cohérent.  
✅ **Feedback immédiat** : l'utilisateur sait immédiatement si son circuit est valide.  
✅ **Messages pédagogiques** : les erreurs sont expliquées et accompagnées de suggestions.  
✅ **Prévention des erreurs** : les circuits invalides n'atteignent pas la simulation.  
✅ **Extensible** : on peut ajouter des règles sans modifier le noyau (Open/Closed).  
✅ **Compatibilité Command Bus** : s'intègre naturellement dans le flux ADR-009.  
✅ **Niveaux de validation** : distinction erreurs/warnings adaptée à l'enseignement.  
✅ **Indépendance** : le Validation Engine ne dépend ni de l'UI ni de la simulation.  

---

## Conséquences négatives

❌ **Complexité** : le système ajoute une couche supplémentaire à l'architecture.  
❌ **Coût computationnel** : validation à chaque commande peut ralentir l'interface (à surveiller).  
❌ **Bibliothèque de règles** : nécessite un effort de rédaction des règles et des messages.  
❌ **Rédaction pédagogique** : les messages doivent être adaptés à différents niveaux d'étudiants.  
❌ **Risque de frustration** : si trop restrictif, les warnings peuvent décourager l'expérimentation.  

---

## Impact sur les développements futurs

- **Simulation (ADR-004)** : reçoit un Document déjà validé → moins d'erreurs à gérer.
- **Command Bus (ADR-009)** : intègre la validation avant exécution.
- **Interface utilisateur** : affiche les erreurs/warnings en temps réel.
- **Pédagogie** : le système de validation devient une aide à l'apprentissage.
- **Export** : validation avant export de netlist pour garantir la conformité.
- **Collaboration** : validation des modifications distantes avant intégration.
- **Plugins** : les extensions peuvent enregistrer leurs propres règles de validation.

---

## Références ADR liées

- **ADR-001** : Document State comme Source Unique de Vérité
- **ADR-002** : Séparation UI / Modèle / Simulation
- **ADR-005** : Architecture du modèle de composants électroniques
- **ADR-008** : Architecture du modèle de connexion électrique (Netlist / Nodes)
- **ADR-009** : Architecture du système de commandes utilisateur (Command Bus)


