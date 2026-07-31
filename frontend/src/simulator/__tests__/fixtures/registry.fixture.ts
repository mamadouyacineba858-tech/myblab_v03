import { allValidModels } from './components.fixture';

// NOTE: ComponentRegistry will be imported from '../../core/ComponentRegistry' in B2
// For B1, we use a placeholder type
// @ts-ignore - ComponentRegistry doesn't exist yet (TDD Red phase)
import { ComponentRegistry } from '../../core/ComponentRegistry';

/**
 * Creates an empty ComponentRegistry instance
 * Used for tests that need a clean starting state
 */
export function createEmptyRegistry(): ComponentRegistry {
  return new ComponentRegistry();
}

/**
 * Creates a ComponentRegistry pre-populated with all valid models
 * Used for tests that require existing registered components
 */
export function createPopulatedRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry();
  registry.registerAll(allValidModels);
  return registry;
}

/**
 * Creates a registry with invalid models (for negative testing)
 * Note: Some models may fail registration - this function handles that
 */
export function createRegistryWithInvalidModels(): ComponentRegistry {
  const registry = new ComponentRegistry();
  
  // Try to register valid models
  try {
    registry.registerAll(allValidModels);
  } catch (_) {
    // Ignore - we want to test mixed state
  }
  
  // Try to register invalid models (should fail gracefully)
  try {
    registry.register('INVALID_PINS', {
      type: 'INVALID_PINS',
      label: 'Test',
      category: 'test',
      pins: [], // Empty pins - invalid
      params: [],
      symbol: 'test.svg',
      description: 'Test'
    });
  } catch (_) {
    // Expected to fail
  }
  
  return registry;
}

/**
 * Factory function to create registry with specific models
 */
export function createRegistryWithModels(models: Record<string, any>): ComponentRegistry {
  const registry = new ComponentRegistry();
  registry.registerAll(models);
  return registry;
}