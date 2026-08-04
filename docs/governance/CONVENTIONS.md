# 📄 CONVENTIONS.md 

**Document:** Conventions de développement MYBlab   
**Statut:** ✅ VALIDÉ — Prêt pour intégration au dépôt  
**Version:** 2.0  
**Date:** 2026-08-04

---

## 📋 Table des matières

1. [Branches Git](#1-branches-git)
2. [Commits](#2-commits)
3. [Tickets](#3-tickets)
4. [Nommage](#4-nommage)
5. [Structure des dossiers](#5-structure-des-dossiers)
6. [Style TypeScript](#6-style-typescript)
7. [Workflow PR](#7-workflow-pr)
8. [Tests](#8-tests)
9. [Environnement et Configuration](#9-environnement-et-configuration)
10. [Outillage Automatisé](#10-outillage-automatisé)

---

## 1. Branches Git

### 1.1 Structure des branches

```
main                          ← Production (branche protégée)
  │
  ├── feature/*               ← Nouvelles fonctionnalités
  ├── fix/*                   ← Corrections de bugs
  ├── refactor/*              ← Refactorings
  └── docs/*                  ← Documentation
  │
  └── hotfix/*                ← Correctifs urgents sur main
```

**Note:** La stratégie de branches peut évoluer selon la maturité du projet. Toute modification majeure du workflow Git doit être validée par ADR.

### 1.2 Nommage des branches

| Type | Format | Exemple |
|------|--------|---------|
| **feature** | `feature/MB-XXX-description-courte` | `feature/MB-042-led-animation` |
| **fix** | `fix/MB-XXX-description-courte` | `fix/MB-089-build-error` |
| **refactor** | `refactor/MB-XXX-description-courte` | `refactor/MB-101-visualization-manager` |
| **docs** | `docs/description-courte` | `docs/api-documentation` |
| **hotfix** | `hotfix/vX.Y.Z-description` | `hotfix/v1.2.1-security-patch` |

### 1.3 Règles de protection

- `main` : Protégée, pas de push direct
- `feature/*` : Libre, supprimée après merge
- Les branches doivent être **rebased** sur `main` avant merge

### 1.4 Cycle de vie des branches

```
1. Créer depuis main → feature/MB-XXX
2. Développement → commits réguliers
3. Rebase sur main (nettoyage local)
4. PR → review → approbation
5. Merge : Squash and merge vers main
6. Supprimer la branche
```

### 1.5 Hotfix Flow

```
1. Créer depuis main → hotfix/vX.Y.Z-description
2. Corriger → commit
3. PR vers main → review → merge (squash)
4. Tag → git tag vX.Y.Z
5. Supprimer la branche
```

---

## 2. Commits

### 2.1 Format du message

```
<type>(<scope>): <sujet>

[Corps optionnel]

[Footer optionnel]
```

### 2.2 Types de commit

| Type | Description | Exemple |
|------|-------------|---------|
| **feat** | Nouvelle fonctionnalité | `feat(visualization): add LED animation` |
| **fix** | Correction de bug | `fix(simulator): fix voltage calculation` |
| **docs** | Documentation | `docs(api): update endpoint reference` |
| **style** | Formatage, style (pas de changement logique) | `style(ui): format with prettier` |
| **refactor** | Refactoring (pas de changement fonctionnel) | `refactor(renderer): extract registry` |
| **perf** | Amélioration de performance | `perf(simulator): cache solver results` |
| **test** | Ajout ou modification de tests | `test(arduino): add compile tests` |
| **chore** | Maintenance, build, CI | `chore(deps): update vite to v5` |

### 2.3 Scope recommandé

| Scope | Description |
|-------|-------------|
| `core` | Domaine métier central |
| `simulator` | Moteur de simulation |
| `arduino` | Compilation, communication |
| `ui` | Interface utilisateur |
| `visualization` | Rendu des composants |
| `api` | API publique |
| `infra` | CI/CD, configuration, outils système |
| `tests` | Tests |
| `docs` | Documentation |
| `deps` | Dépendances |

### 2.4 Règles

- **Sujet** : Impératif, présent, < 70 caractères
- **Corps** : < 72 caractères par ligne, expliquer le "pourquoi"
- **Footer** : Références aux tickets : `MB-XXX` (format numérique uniquement)
- **Un seul sujet par commit** (pas de commits hybrides)

### 2.5 Exemples

**Bon:**
```
feat(visualization): add registry for dynamic component rendering

- Implement RendererRegistry with Map-based storage
- Add register() and get() methods
- Support bulk registration via registerAll()
- Add type safety with JSDoc

MB-042
```

**Mauvais:**
```
fix and add feature and update docs
```

---

## 3. Tickets

### 3.1 Format du titre

```
<type>(<domaine>): <description>
```

| Type | Description |
|------|-------------|
| **FEAT** | Nouvelle fonctionnalité |
| **FIX** | Correction de bug |
| **REFACTOR** | Refactoring |
| **DOCS** | Documentation |
| **PERF** | Performance |
| **TEST** | Tests |
| **OPS** | Opérations, CI/CD |
| **ARCH** | Décision d'architecture |

**Exemple:** `FEAT(visualization): add dynamic component registry`

### 3.2 Format du corps (Standard)

```markdown
## Objectif
[But du ticket]

## Contexte
[Pourquoi cette modification est nécessaire]

## Périmètre
- Fichiers concernés
- Domaines impactés

## Critères d'acceptation
- [ ] Critère 1
- [ ] Critère 2

## Tests requis
- [ ] Test unitaire
- [ ] Test intégration

## Livrables
- [ ] Code
- [ ] Documentation
- [ ] Tests
```

### 3.3 Format "Light" (pour tickets mineurs)

```markdown
## Objectif
[But du ticket]

## Changements
- Changement 1
- Changement 2
```

### 3.4 ADR Requise

Une ADR est obligatoire si :

- Changement architectural
- Changement d'interface publique
- Changement de dépendance majeure
- Changement de workflow Git

### 3.5 Labels GitHub

| Label | Utilisation |
|-------|-------------|
| `priority:critical` | Bloquant, immédiat |
| `priority:high` | Important, rapide |
| `priority:medium` | Normal |
| `priority:low` | Si temps |
| `type:feat` | Fonctionnalité |
| `type:fix` | Bug |
| `type:refactor` | Refactoring |
| `type:docs` | Documentation |
| `domain:core` | Cœur métier |
| `domain:simulator` | Simulateur |
| `domain:arduino` | Arduino |
| `domain:ui` | Interface |
| `domain:visualization` | Visualisation |
| `status:ready` | Prêt pour développement |
| `status:in-progress` | En cours |
| `status:review` | En revue |
| `status:done` | Terminé |

---

## 4. Nommage

### 4.1 Conventions Générales

| Type | Format | Exemple |
|------|--------|---------|
| **Composant UI** | `PascalCase` | `LedPart` |
| **Module utilitaire** | `camelCase` | `mathUtils` |
| **Classe** | `PascalCase` | `VisualizationManager` |
| **Fonction** | `camelCase` | `calculateVoltage` |
| **Variable** | `camelCase` | `user` |
| **Constante** | `UPPER_SNAKE_CASE` | `MAX_VOLTAGE` |

### 4.2 Fichiers TypeScript

| Type | Format | Exemple |
|------|--------|---------|
| **Composant React** | `PascalCase.tsx` | `LedPart.tsx` |
| **Hook** | `camelCase.ts` | `useSimulator.ts` |
| **Classe** | `PascalCase.ts` | `VisualizationManager.ts` |
| **Module utilitaire** | `camelCase.ts` | `mathUtils.ts` |
| **Configuration** | `kebab-case.ts` | `vite.config.ts` |
| **Test** | `*.test.ts` ou `*.spec.ts` | `registry.test.ts` |
| **Types/Interfaces** | `PascalCase.ts` | `ComponentProps.ts` |
| **Barrel file** | `index.ts` | `domains/simulator/index.ts` |

### 4.3 Fonctions

```typescript
// ✅ Bon
function calculateVoltage(current: number, resistance: number): number { ... }
function getLedState(uid: string, pinSignals: Map<string, number>): LedState { ... }

// ❌ Mauvais
function calc(curr, res) { ... }
function getState(uid, signals) { ... }
```

### 4.4 Variables

```typescript
// ✅ Bon
const user: User = { ... };
const MAX_VOLTAGE = 5.0;
const partRenderer: PartRenderer = ...;

// ❌ Mauvais
const u = { ... };
const maxVoltage = 5.0;
const pr = ...;
```

### 4.5 Classes

```typescript
// ✅ Bon
class VisualizationManager { ... }
class RendererRegistry { ... }

// ❌ Mauvais
class VisualManager { ... }
class Registry { ... }
```

### 4.6 Types et Interfaces

```typescript
// ✅ Bon (sans préfixe "I")
type ComponentProps = { ... }
interface ComponentState { ... }
interface Renderer { ... }

// ❌ Mauvais (préfixe "I")
interface IComponent { ... }
interface IProps { ... }
```

---

## 5. Structure des dossiers

### 5.1 Structure orientée domaines

```
frontend/
├── src/
│   ├── core/                  # Cœur métier
│   │   ├── models/
│   │   ├── services/
│   │   └── index.ts
│   │
│   ├── simulation/            # Moteur de simulation
│   │   ├── engine/
│   │   ├── solvers/
│   │   └── index.ts
│   │
│   ├── arduino/               # Domaine Arduino
│   │   ├── compiler/
│   │   ├── communicator/
│   │   └── index.ts
│   │
│   ├── visualization/         # Visualisation (bibliothèque indépendante)
│   │   ├── registry.ts
│   │   ├── VisualizationManager.ts
│   │   ├── factory.ts
│   │   ├── defaultRegistrations.ts
│   │   └── index.ts
│   │
│   ├── ui/                    # Interface utilisateur (consomme visualization)
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── api/                   # API publique
│   │   ├── contracts/
│   │   └── index.ts
│   │
│   ├── infrastructure/        # Infrastructure technique
│   │   ├── config/
│   │   ├── logging/
│   │   └── index.ts
│   │
│   └── shared/                # Code partagé (transversal)
│       ├── types/
│       ├── utils/
│       └── index.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
├── scripts/
└── public/
```

### 5.2 Frontière UI ↔ Visualisation

- **`visualization/`** : Bibliothèque indépendante qui fournit des renderers
- **`ui/`** : Composants UI qui **consomment** `visualization`
- **Aucun couplage inverse** : `visualization` ne connaît pas `ui/`

### 5.3 Règles d'import

- **Imports entre domaines** : UNIQUEMENT via les points d'entrée publics (`index.ts`)
- **Imports profonds interdits** : `import { x } from '../domains/simulator/internal/utils'` → ❌
- **Imports partagés** : Depuis `shared/` uniquement
- **Barrel files obligatoires** : Chaque domaine doit avoir un `index.ts` exposant son API publique

### 5.4 Vérification automatique des imports

```json
// eslint.config.js
{
  "rules": {
    "import/no-restricted-paths": ["error", {
      "zones": [
        { "target": "./src/domains", "from": "./src/domains", "except": ["./index.ts"] }
      ]
    }]
  }
}
```

---

## 6. Style TypeScript

### 6.1 ESLint

**Configuration officielle :** Le fichier `eslint.config.js` du dépôt constitue la référence.

**Règles clés :**

| Règle | Niveau |
|-------|--------|
| `no-unused-vars` | Error |
| `no-console` | Warning (sauf debug) |
| `eqeqeq` | Error |
| `curly` | Error |
| `no-var` | Error |
| `prefer-const` | Error |
| `react-hooks/rules-of-hooks` | Error |
| `react-hooks/exhaustive-deps` | Warning |

### 6.2 Prettier

**Configuration officielle :** Le fichier `.prettierrc` du dépôt constitue la référence.

**Règles recommandées :**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 6.3 TypeScript Strict Mode (obligatoire)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 6.4 Types et Exports

```typescript
// ✅ Bon
export interface ComponentState { ... }
export type ComponentType = 'LED' | 'RESISTOR';
export function renderComponent(props: ComponentProps): ReactElement { ... }

// ❌ Mauvais
export default function renderComponent(props: any): any { ... }
```

### 6.5 JSDoc (obligatoire pour les APIs publiques)

```typescript
/**
 * Récupère l'état d'une LED
 * @param {string} uid - Identifiant unique du composant
 * @param {Map<string, number>} pinSignals - Signaux des pins
 * @returns {LedState} État de la LED
 */
function getLedState(uid: string, pinSignals: Map<string, number>): LedState { ... }
```

---

## 7. Workflow PR

### 7.1 Template PR

```markdown
## 🔍 Objectif
[Description courte]

## 📋 Changements
- [ ] Changement 1
- [ ] Changement 2

## 🧪 Tests
- [ ] Tests unitaires
- [ ] Tests intégration
- [ ] Test manuel

## 📎 Références
- Ticket : MB-XXX

## ✅ Checklist
- [ ] Code compilé
- [ ] ESLint OK
- [ ] Tests passants
- [ ] Documentation mise à jour
```

### 7.2 Processus

1. **Création** : Depuis `main` → `feature/MB-XXX`
2. **Développement** : Commits réguliers
3. **Rebase** : Sur `main` avant PR
4. **PR** : Créée sur GitHub avec template
5. **Review** : Suit les niveaux définis dans `GOVERNANCE.md`
6. **Merge** : **Squash and merge** vers `main`
7. **Clean** : Suppression de la branche

### 7.3 Règles

- **PR < 400 lignes** (recommandation, avec justification possible)
- **CI verte** obligatoire (lint + tests + build)
- **Review obligatoire** : Selon `CODEOWNERS` et `GOVERNANCE.md`
- **Pas de merge direct** sur `main`

---

## 8. Tests

### 8.1 Types de tests

| Type | Outil | Exécution |
|------|-------|-----------|
| **Unitaire** | Vitest | `npm test` |
| **Intégration** | Vitest | `npm test:integration` |
| **E2E** | Playwright | `npm test:e2e` |
| **Lint** | ESLint | `npm run lint` |
| **Format** | Prettier | `npm run format` |

### 8.2 Structure des tests

```
tests/
├── unit/
│   ├── core/
│   ├── simulation/
│   ├── arduino/
│   └── visualization/
├── integration/
│   ├── simulation-flow/
│   └── arduino-compilation/
└── e2e/
    └── circuit-editor/
```

### 8.3 Convention de nommage

```typescript
// ✅ Bon
describe('VisualizationManager', () => {
  it('should render LED component', () => { ... });
  it('should return null for unknown type', () => { ... });
});

// ❌ Mauvais
describe('VisualizationManager', () => {
  it('test1', () => { ... });
  it('test2', () => { ... });
});
```

### 8.4 Couverture minimale obligatoire

| Domaine | Couverture minimale | Type de tests obligatoires |
|---------|---------------------|----------------------------|
| **Core** | > 80% | Unitaires |
| **Simulation** | > 80% | Unitaires + Intégration |
| **Arduino** | > 70% | Unitaires + Simulation |
| **Visualisation** | > 80% | Unitaires |
| **UI** | > 60% | Composants critiques |
| **API** | > 90% | Contrat |
| **Utils** | > 90% | Unitaires |

---

## 9. Environnement et Configuration

### 9.1 Variables d'environnement

- **Fichiers** : `.env` (local), `.env.example` (template), `.env.production` (production)
- **Préfixe Vite** : `VITE_` pour les variables exposées au frontend
- **Validation** : Utiliser `zod` ou `t3-env` pour valider les variables au runtime

### 9.2 Template `.env.example`

```bash
# Vite
VITE_API_URL=http://localhost:3000

# App
VITE_APP_NAME=MYBlab
VITE_APP_VERSION=1.0.0

# Arduino
VITE_ARDUINO_PORT=/dev/ttyUSB0
VITE_ARDUINO_BAUDRATE=115200
```

### 9.3 Règles

- `.env` : Exclu de Git (`.gitignore`)
- `.env.example` : Inclu dans Git (documentation)
- `.env.production` : Inclu dans Git (serveur de CI/CD)
- **Aucun secret dans le code** : Tous les secrets passent par les variables d'environnement

---

## 10. Outillage Automatisé

### 10.1 Husky + Lint-Staged

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
npx lint-staged
```

### 10.2 CI/CD

| Étape | Outil | Commande |
|-------|-------|----------|
| Lint | GitHub Actions | `npm run lint` |
| Tests | GitHub Actions | `npm test` |
| Build | GitHub Actions | `npm run build` |
| Déploiement | GitHub Actions | `npm run deploy` |

### 10.3 Branch Protection Rules

- **main** : Requiert 1 review, CI verte
- **hotfix/\*** : Requiert 1 review, CI verte

---

## ✅ Checklist de validation

- [ ] Branches nommées selon convention
- [ ] Commits formatés selon convention (Conventional Commits)
- [ ] Tickets bien documentés (template standard ou light)
- [ ] ADR pour changements architecturaux
- [ ] Nommage cohérent (PascalCase, camelCase)
- [ ] Structure de dossiers orientée domaines
- [ ] TypeScript strict activé
- [ ] ESLint/Prettier configurés
- [ ] PR conforme aux templates
- [ ] Tests présents (couverture minimale)
- [ ] Variables d'environnement documentées
- [ ] Husky + Lint-Staged configurés

---

## 🔒 Clause de Cohérence

> **En cas de contradiction entre ce document et `GOVERNANCE.md`, c'est `GOVERNANCE.md` qui prévaut.**  
> **En cas de contradiction avec `MYBLAB-CONSTITUTION.md`, la Constitution prévaut.**

---

## 📚 Références

| Document | Relation |
|----------|----------|
| `MYBLAB-CONSTITUTION.md` | Principes fondateurs (prévaut en cas de conflit) |
| `GOVERNANCE.md` | Rôles et processus (prévaut en cas de conflit) |
| `ARCHITECTURE.md` | Organisation technique |
| `RFC-GUIDE.md` | Changements d'interface |
| `ADR/` | Décisions d'architecture |

