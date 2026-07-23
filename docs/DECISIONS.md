## Décision — Audit Git (21 juillet 2026)

- Branche active : main
- Dernier commit : 5d00ef6 chore: initialize MYBlab v0.3.0 architecture
- Working tree : non propre (13 fichiers modifiés, 2 non suivis)
- Tag v0.3.0 absent

### Action obligatoire
- Commit/restauration des fichiers modifiés
- Décision sur fichiers non suivis (`CircuitContext.js`, `useCircuit.js`)
- Création du tag v0.3.0 une fois l’état stabilisé

### Invariant
Aucune nouvelle fonctionnalité ne doit être ouverte tant que le dépôt n’est pas propre et tagué.
## Décision — Audit Git (21 juillet 2026)
... contenu déjà consigné ...

---

## Décision — Audit Lint (22 juillet 2026)
- Erreurs: 16, Warnings: 2
- P0: doublons CircuitContext, hooks non conformes
- P1: ArduinoSimulator.js, SimulationCanvas.jsx
- P2: incohérences de style
ACTION: Ticket MB-004.6 pour correction P0/P1
## Décision — Audit Tests (22 juillet 2026)

- Commande exécutée : npm --prefix frontend run test
- Objectif : valider la logique métier et la cohérence des modules
- Risques : erreurs P0/P1 du lint susceptibles d’impacter les tests
- Action : consigner résultats (succès/échecs) et ouvrir tickets correctifs si nécessaire
## Décision — Audit Tests (22 juillet 2026)

- Commande "npm run test" absente
- Aucun framework de tests configuré (Jest/Vitest)
- Risque: absence de validation fonctionnelle malgré build réussi
- Action: Ticket MB-004.7 pour mise en place de Vitest et écriture des premiers tests unitaires
## Décision — Audit Tests (22 juillet 2026)

- Vitest installé et configuré
- Script "test" ajouté dans package.json
- Premiers tests unitaires exécutés avec succès :
  - App.test.js → ✓ passed
  - KeyboardSystem.test.js → ✓ passed
- Action : Ticket MB‑004.7 pour extension des tests unitaires aux modules critiques (P0/P1)

### Ticket MB‑004.7 — Mise en place et extension des tests unitaires

**Objectif :**
Garantir la validation fonctionnelle de MYBlab v0.3.0 par une couverture de tests unitaires et d’intégration.

**Modules concernés :**
- Keyboard : useKeyboardSystem (déjà validé), gestion des événements clavier
- Circuit : CircuitContext, useCircuitState (ajout/suppression de composants)
- Arduino : ArduinoSimulator (exécution de code, gestion des erreurs)
- Canvas : SimulationCanvas (rendu initial, interactions drag/drop)
- History : HistoryManager (undo/redo)

**Classification :**
- P0 → Tests indispensables pour la stabilité (Keyboard, Circuit, Arduino)
- P1 → Tests importants pour l’ergonomie et la fiabilité (Canvas, History)
- P2 → Tests complémentaires (UI secondaire, composants non critiques)

**Décision :**
Étendre progressivement la suite de tests Vitest aux modules P0/P1, consigner les résultats dans `DECISIONS.md`, et ouvrir tickets correctifs si des échecs sont détectés.
## Décision — Audit Documentation (22 juillet 2026)

- Documentation existante : README.md, DECISIONS.md
- Documentation manquante ou incomplète : ARCHITECTURE.md
- Risque : absence de continuité architecturale et de guide d’installation clair
- Action : Ticket MB-004.8 pour audit et mise à jour de la documentation
  - Compléter README.md (installation, usage, exemples)
  - Créer/mettre à jour ARCHITECTURE.md (modules, flux, schémas)
  - Maintenir DECISIONS.md comme journal de gouvernance
## Décision — Audit Documentation (22 juillet 2026)

- La section Documentation existe déjà
- Fichiers identifiés : README.md, DECISIONS.md, ARCHITECTURE.md (à confirmer)
- Risque : documentation partielle ou insuffisante pour assurer continuité architecturale
- Action : Ticket MB-004.8 pour audit et mise à jour de la documentation
  - Vérifier README.md (installation, usage, dépendances)
  - Vérifier/compléter ARCHITECTURE.md (modules, flux, schémas)
  - Maintenir DECISIONS.md comme journal de gouvernance
## Décision — Audit Déploiement (22 juillet 2026)

- Aucun script de déploiement identifié (Dockerfile, vercel.json, netlify.toml, CI/CD)
- Risque : impossibilité de livrer MYBlab v0.3.0 en environnement de production
- Action : Ticket MB-004.9 pour audit et mise en place du déploiement
  - Vérifier présence de Dockerfile ou configuration Vercel/Netlify
  - Définir pipeline CI/CD (GitHub Actions ou équivalent)
  - Documenter la procédure de déploiement dans ARCHITECTURE.md
## Décision — Audit Sécurité (22 juillet 2026)

- Aucun mécanisme de sécurité identifié (npm audit, eslint-plugin-security, configuration HTTPS)
- Risque : vulnérabilités non détectées dans les dépendances et absence de protection côté frontend
- Action : Ticket MB-004.10 pour audit et mise en place des règles de sécurité
  - Intégrer npm audit et corriger les vulnérabilités
  - Ajouter eslint-plugin-security pour détecter les patterns dangereux
  - Vérifier configuration HTTPS et Content Security Policy (CSP)
  - Documenter les pratiques de sécurité dans ARCHITECTURE.md
## Décision — Audit Sécurité (22 juillet 2026)

- Vérification effectuée :
  - npm audit → 0 vulnérabilités détectées ✅
  - eslint-plugin-security absent → à installer
  - Pas de configuration CSP/HTTPS → à ajouter
- Risque : dépendances saines mais exposition possible à des attaques XSS ou mauvaises pratiques
- Action : Ticket MB-004.10 pour mise en place des règles de sécurité
  - Maintenir audit régulier des dépendances
  - Ajouter eslint-plugin-security
  - Configurer CSP et HTTPS
  - Documenter pratiques de sécurité dans ARCHITECTURE.md
## Décision — Audit Performance (22 juillet 2026)

- Vérification effectuée :
  - Build avec Vite → rapide et optimisé par défaut
  - Tests unitaires → temps d’exécution très court (< 60 ms)
- Risque : absence de pratiques avancées (lazy loading, code splitting, monitoring)
- Action : Ticket MB-004.11 pour audit et mise en place des optimisations de performance
  - Activer lazy loading pour les composants lourds
  - Configurer code splitting pour réduire la taille du bundle
  - Vérifier utilisation de cache et compression (gzip/brotli)
  - Intégrer un outil de monitoring (Lighthouse, Web Vitals)
  - Documenter les optimisations dans ARCHITECTURE.md
## Décision — Audit Maintenabilité (22 juillet 2026)

- Vérification effectuée :
  - Architecture modulaire → ✅
  - ESLint présent → ✅
  - Tests unitaires en place mais couverture limitée → ⚠️
  - Documentation technique partielle (ARCHITECTURE.md à compléter) → ⚠️
  - Pas de Prettier ou règles de formatage globales → ⚠️
- Risque : maintenabilité correcte à court terme mais insuffisante à long terme sans conventions strictes
- Action : Ticket MB-004.12 pour renforcer la maintenabilité
  - Étendre la couverture de tests aux modules P0/P1
  - Compléter ARCHITECTURE.md avec flux et dépendances
  - Ajouter Prettier pour formatage cohérent
  - Documenter conventions de code et pratiques de développement
## Décision — Audit Évolutivité (22 juillet 2026)

- Vérification effectuée :
  - Architecture modulaire → ✅
  - Séparation logique/UI → ✅
  - Tests unitaires présents mais couverture limitée → ⚠️
  - Documentation technique partielle (ARCHITECTURE.md à compléter) → ⚠️
  - Pas de stratégie avancée de gestion d’état → ⚠️
- Risque : évolutivité correcte à court terme mais insuffisante à long terme sans gestion d’état robuste et documentation complète
- Action : Ticket MB-004.13 pour renforcer l’évolutivité
  - Étendre la couverture de tests pour sécuriser les évolutions
  - Compléter ARCHITECTURE.md avec flux et dépendances
  - Définir une stratégie de gestion d’état (Redux, Zustand, ou Context optimisé)
  - Documenter les pratiques d’évolution et de scalabilité
## Décision — Consolidation de l'état fonctionnel (23 juillet 2026)

- Branche active : main
- Dernier commit de référence : 7400301
- Tag stable précédent : v0.3.0
- ESLint : succès
- Vite : démarrage réussi
- componentDefinitions.js : état restauré et validé
- signals.js : état restauré et validé
- engine.js : état restauré et validé
- Tests conservés :
  - App.test.js
  - KeyboardSystem.test.js
- Nouveaux fichiers racine :
  - package.json
  - package-lock.json

Décision :
Consolider l'état fonctionnel actuel avant toute nouvelle évolution.
Aucune nouvelle fonctionnalité ne doit être ouverte avant validation complète de cet état.

Prochaine étape :
- Exécuter la suite de tests Vitest
- Vérifier la cohérence de package.json et package-lock.json
- Auditer App.test.js et KeyboardSystem.test.js
- Valider le working tree
- Créer un commit de consolidation