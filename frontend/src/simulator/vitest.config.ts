import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/simulator/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/simulator/**/*.ts'],
      exclude: [
        'src/simulator/__tests__/**',
        'src/simulator/**/*.fixture.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    setupFiles: ['src/simulator/__tests__/setup.ts']
  }
});