import { vi } from 'vitest';

// Global test timeout
vi.setConfig({ testTimeout: 10000 });

// Note: console.error/warn are not suppressed to allow debugging