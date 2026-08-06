import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Découvre automatiquement tous les tests du projet
    include: [
      'src/**/*.test.{js,ts}',
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