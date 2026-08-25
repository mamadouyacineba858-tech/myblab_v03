import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // MB-GOV-001 (2026-08-25) : le pattern historique `src/**/*.test.{js,ts}`
    // excluait silencieusement les fichiers `.test.jsx`/`.test.tsx` de
    // `npm run test`/`test:ci`/CI, alors que ces fichiers existent et
    // passent tous une fois exécutés (vérifié séparément via
    // `frontend/vitest.config.js`, qui les couvre déjà en environnement
    // jsdom). `environmentMatchGlobs` ci-dessous route uniquement ces
    // fichiers vers `jsdom` ; l'environnement par défaut `node` des tests
    // `.js`/`.ts` existants n'est pas modifié.
    environmentMatchGlobs: [
      ['src/**/*.test.{jsx,tsx}', 'jsdom'],
    ],

    // Découvre automatiquement tous les tests du projet, y compris .jsx/.tsx
    include: [
      'src/**/*.test.{js,jsx,ts,tsx}',
    ],

    coverage: {
      provider: 'v8',
      include: [
        'src/**/*.ts',
        'src/**/*.js',
      ],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.fixture.ts',
        'src/**/*.fixture.js',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    setupFiles: ['src/simulator/__tests__/setup.ts'],
  },
});