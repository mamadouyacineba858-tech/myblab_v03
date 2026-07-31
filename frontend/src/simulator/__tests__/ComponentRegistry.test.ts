import { describe, it, expect, vi } from 'vitest';
import { 
  validResistorModel, 
  validCapacitorModel, 
  validInductorModel,
  validVSourceModel,
  validIsourceModel,
  validDiodeModel,
  invalidModelNoPins,
  invalidModelDuplicatePins,
  invalidModelEmptyType,
  invalidModelInvalidParam,
  invalidModelNegativeValue,
  invalidModelMissingDefault
} from './fixtures/components.fixture';
import { 
  createEmptyRegistry,
  createPopulatedRegistry 
} from './fixtures/registry.fixture';

// ============================================
// ÉTAT ATTENDU APRÈS INTÉGRATION B1 :
// ❌ TOUS LES TESTS ÉCHOUENT (RED - TDD Phase)
// ✅ npm run build DOIT PASSER
// ============================================

// NOTE: ComponentRegistry will be implemented in B2
// These tests define the contract that B2 must satisfy
// @ts-ignore - ComponentRegistry doesn't exist yet (TDD Red phase)
import { ComponentRegistry } from '../../core/ComponentRegistry';

describe('ComponentRegistry', () => {
  // ============================================
  // GROUP 1: Registration (REG)
  // ============================================
  describe('Registration', () => {
    it('REG-001: should register a valid component', () => {
      const registry = createEmptyRegistry();
      registry.register('R', validResistorModel);
      expect(registry.has('R')).toBe(true);
      expect(registry.size()).toBe(1);
    });

    it('REG-002: should throw when registering duplicate type', () => {
      const registry = createEmptyRegistry();
      registry.register('R', validResistorModel);
      expect(() => {
        registry.register('R', validResistorModel);
      }).toThrow(/already registered/i);
    });

    it('REG-003: should throw when registering empty type', () => {
      const registry = createEmptyRegistry();
      expect(() => {
        registry.register('', validResistorModel);
      }).toThrow(/type cannot be empty/i);
    });

    it('REG-004: should throw when registering null model', () => {
      const registry = createEmptyRegistry();
      expect(() => {
        // @ts-ignore - Testing runtime validation
        registry.register('R', null);
      }).toThrow(/model is required/i);
    });

    it('REG-005: should register multiple models with registerAll', () => {
      const registry = createEmptyRegistry();
      registry.registerAll({
        R: validResistorModel,
        C: validCapacitorModel,
        L: validInductorModel
      });
      expect(registry.size()).toBe(3);
      expect(registry.has('R')).toBe(true);
      expect(registry.has('C')).toBe(true);
      expect(registry.has('L')).toBe(true);
    });

    it('REG-006: should throw if registerAll contains invalid model', () => {
      const registry = createEmptyRegistry();
      expect(() => {
        registry.registerAll({
          R: validResistorModel,
          INVALID: invalidModelNoPins
        });
      }).toThrow(/invalid model/i);
    });

    it('REG-007: should not register anything if registerAll fails', () => {
      const registry = createEmptyRegistry();
      try {
        registry.registerAll({
          R: validResistorModel,
          INVALID: invalidModelNoPins
        });
      } catch (_) {
        // Expected
      }
      expect(registry.size()).toBe(0);
    });

    it('REG-008: should normalize type to uppercase on registration', () => {
      const registry = createEmptyRegistry();
      registry.register('r', validResistorModel);
      expect(registry.has('R')).toBe(true);
      expect(registry.has('r')).toBe(false);
    });
  });

  // ============================================
  // GROUP 2: Retrieval (GET)
  // ============================================
  describe('Retrieval', () => {
    it('GET-001: should get registered model by type', () => {
      const registry = createPopulatedRegistry();
      const model = registry.get('R');
      expect(model).toBeDefined();
      expect(model?.type).toBe('R');
    });

    it('GET-002: should return undefined for unregistered type', () => {
      const registry = createPopulatedRegistry();
      const model = registry.get('XYZ');
      expect(model).toBeUndefined();
    });

    it('GET-003: should be case-insensitive for type lookup', () => {
      const registry = createPopulatedRegistry();
      const model1 = registry.get('R');
      const model2 = registry.get('r');
      expect(model1).toEqual(model2);
    });

    it('GET-004: should return a deep copy of model, not reference', () => {
      const registry = createPopulatedRegistry();
      const model = registry.get('R');
      expect(model).not.toBe(validResistorModel);
      expect(model).toEqual(validResistorModel);
    });

    it('GET-005: should return undefined when registry is empty', () => {
      const registry = createEmptyRegistry();
      expect(registry.get('R')).toBeUndefined();
    });

    it('GET-006: should handle whitespace in type string', () => {
      const registry = createPopulatedRegistry();
      expect(registry.get(' R ')).toBeDefined();
      expect(registry.get('R ')).toBeDefined();
    });
  });

  // ============================================
  // GROUP 3: Existence (HAS)
  // ============================================
  describe('Existence', () => {
    it('HAS-001: should return true for registered type', () => {
      const registry = createPopulatedRegistry();
      expect(registry.has('R')).toBe(true);
    });

    it('HAS-002: should return false for unregistered type', () => {
      const registry = createPopulatedRegistry();
      expect(registry.has('XYZ')).toBe(false);
    });

    it('HAS-003: should be case-insensitive', () => {
      const registry = createPopulatedRegistry();
      expect(registry.has('r')).toBe(true);
    });

    it('HAS-004: should return false when registry is empty', () => {
      const registry = createEmptyRegistry();
      expect(registry.has('R')).toBe(false);
    });
  });

  // ============================================
  // GROUP 4: Listing (LIST)
  // ============================================
  describe('Listing', () => {
    it('LIST-001: should return empty array when registry is empty', () => {
      const registry = createEmptyRegistry();
      expect(registry.list()).toEqual([]);
    });

    it('LIST-002: should list all registered types', () => {
      const registry = createPopulatedRegistry();
      const types = registry.list();
      expect(types).toContain('R');
      expect(types).toContain('C');
      expect(types).toContain('L');
      expect(types).toContain('V');
      expect(types).toContain('I');
      expect(types).toContain('D');
    });

    it('LIST-003: should return types in alphabetical order', () => {
      const registry = createEmptyRegistry();
      registry.register('Z', validResistorModel);
      registry.register('A', validResistorModel);
      registry.register('M', validResistorModel);
      expect(registry.list()).toEqual(['A', 'M', 'Z']);
    });

    it('LISTALL-001: should return empty array when registry is empty', () => {
      const registry = createEmptyRegistry();
      expect(registry.listAll()).toEqual([]);
    });

    it('LISTALL-002: should list all models', () => {
      const registry = createPopulatedRegistry();
      const models = registry.listAll();
      expect(models).toHaveLength(6);
      expect(models[0].type).toBe('C');
      expect(models[1].type).toBe('D');
      expect(models[2].type).toBe('I');
      expect(models[3].type).toBe('L');
      expect(models[4].type).toBe('R');
      expect(models[5].type).toBe('V');
    });

    it('LISTALL-003: should return deep copies of models', () => {
      const registry = createPopulatedRegistry();
      const models = registry.listAll();
      expect(models[0]).not.toBe(validCapacitorModel);
      expect(models[0]).toEqual(validCapacitorModel);
    });
  });

  // ============================================
  // GROUP 5: Validation (VAL)
  // ============================================
  describe('Validation', () => {
    it('VAL-001: should validate correct component parameters', () => {
      const registry = createPopulatedRegistry();
      const result = registry.validate('R', { resistance: 1000 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('VAL-002: should reject missing required parameters', () => {
      const registry = createPopulatedRegistry();
      const result = registry.validate('R', {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('resistance is required');
    });

    it('VAL-003: should reject parameters below minimum', () => {
      const registry = createPopulatedRegistry();
      const result = registry.validate('R', { resistance: -10 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('resistance must be >= 0');
    });

    it('VAL-004: should return error for unregistered type', () => {
      const registry = createPopulatedRegistry();
      expect(() => {
        registry.validate('XYZ', {});
      }).toThrow(/unregistered type/i);
    });

    it('VAL-005: should validate all components in batch', () => {
      const registry = createPopulatedRegistry();
      const components = [
        { type: 'R', params: { resistance: 1000 } },
        { type: 'R', params: { resistance: -10 } }, // Invalid
        { type: 'C', params: { capacitance: 1e-6 } }
      ];
      const results = registry.validateAll(components);
      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
    });

    it('VAL-006: should return all errors for invalid parameters', () => {
      const registry = createPopulatedRegistry();
      const result = registry.validate('R', { 
        resistance: -10,
        unknown: 'extra'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('resistance must be >= 0');
      expect(result.errors).toContain('unknown is not a valid parameter');
    });

    it('VAL-007: should handle string resistance values by parsing', () => {
      const registry = createPopulatedRegistry();
      const result = registry.validate('R', { resistance: '1000' });
      expect(result.valid).toBe(true);
    });

    it('VAL-008: should reject non-numeric resistance values', () => {
      const registry = createPopulatedRegistry();
      const result = registry.validate('R', { resistance: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('resistance must be a number');
    });

    it('VAL-009: should validate all registered models', () => {
      const registry = createPopulatedRegistry();
      const results = registry.validateAllRegistered();
      expect(results).toHaveLength(6);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('VAL-010: should support custom validators in models', () => {
      const registry = createEmptyRegistry();
      const customModel = {
        ...validResistorModel,
        customValidator: (params: any) => {
          if (params.resistance > 1e6) {
            return 'resistance too high';
          }
          return null;
        }
      };
      registry.register('R', customModel);
      const result1 = registry.validate('R', { resistance: 1e9 });
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('resistance too high');
      
      const result2 = registry.validate('R', { resistance: 1000 });
      expect(result2.valid).toBe(true);
    });
  });

  // ============================================
  // GROUP 6: Events (EVT)
  // ============================================
  describe('Events', () => {
    it('EVT-001: should trigger onRegister when component is registered', () => {
      const registry = createEmptyRegistry();
      const callback = vi.fn();
      registry.onRegister(callback);
      registry.register('R', validResistorModel);
      expect(callback).toHaveBeenCalledWith('R', validResistorModel);
    });

    it('EVT-002: should not trigger offRegister callback', () => {
      const registry = createEmptyRegistry();
      const callback = vi.fn();
      registry.onRegister(callback);
      registry.offRegister(callback);
      registry.register('R', validResistorModel);
      expect(callback).not.toHaveBeenCalled();
    });

    it('EVT-003: should support multiple callbacks', () => {
      const registry = createEmptyRegistry();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      registry.onRegister(cb1);
      registry.onRegister(cb2);
      registry.register('R', validResistorModel);
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('EVT-004: should not call removed callback in loop', () => {
      const registry = createEmptyRegistry();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      registry.onRegister(cb1);
      registry.onRegister(cb2);
      registry.offRegister(cb1);
      registry.register('R', validResistorModel);
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });

    it('EVT-005: should handle unregistration during event firing', () => {
      const registry = createEmptyRegistry();
      const cb1 = vi.fn(() => {
        registry.offRegister(cb1);
      });
      registry.onRegister(cb1);
      registry.register('R', validResistorModel);
      registry.register('C', validCapacitorModel);
      expect(cb1).toHaveBeenCalledTimes(1);
    });

    it('EVT-006: should pass model in event callback', () => {
      const registry = createEmptyRegistry();
      let capturedType = '';
      let capturedModel: any = null;
      registry.onRegister((type, model) => {
        capturedType = type;
        capturedModel = model;
      });
      registry.register('R', validResistorModel);
      expect(capturedType).toBe('R');
      expect(capturedModel).toEqual(validResistorModel);
    });
  });

  // ============================================
  // GROUP 7: State (CLR / SIZ)
  // ============================================
  describe('State Management', () => {
    it('CLR-001: should clear all registered models', () => {
      const registry = createPopulatedRegistry();
      expect(registry.size()).toBe(6);
      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.list()).toEqual([]);
    });

    it('CLR-002: should handle clear when empty', () => {
      const registry = createEmptyRegistry();
      expect(() => registry.clear()).not.toThrow();
      expect(registry.size()).toBe(0);
    });

    it('SIZ-001: should return correct size after registration', () => {
      const registry = createEmptyRegistry();
      expect(registry.size()).toBe(0);
      registry.register('R', validResistorModel);
      expect(registry.size()).toBe(1);
      registry.register('C', validCapacitorModel);
      expect(registry.size()).toBe(2);
    });

    it('SIZ-002: should return 0 after clear', () => {
      const registry = createPopulatedRegistry();
      expect(registry.size()).toBeGreaterThan(0);
      registry.clear();
      expect(registry.size()).toBe(0);
    });

    it('SIZ-003: should not count invalid registration attempts', () => {
      const registry = createEmptyRegistry();
      try {
        registry.register('', validResistorModel);
      } catch (_) {}
      expect(registry.size()).toBe(0);
    });

    it('SIZ-004: should maintain size accuracy with registerAll', () => {
      const registry = createEmptyRegistry();
      registry.registerAll({
        R: validResistorModel,
        C: validCapacitorModel,
        L: validInductorModel
      });
      expect(registry.size()).toBe(3);
    });
  });

  // ============================================
  // GROUP 8: Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('EDGE-001: should handle extremely large number of registrations', () => {
      const registry = createEmptyRegistry();
      for (let i = 0; i < 100; i++) {
        registry.register(`TYPE${i}`, { ...validResistorModel, type: `TYPE${i}` });
      }
      expect(registry.size()).toBe(100);
      expect(registry.has('TYPE99')).toBe(true);
    });

    it('EDGE-002: should handle special characters in type names', () => {
      const registry = createEmptyRegistry();
      registry.register('R_1', validResistorModel);
      expect(registry.has('R_1')).toBe(true);
    });

    it('EDGE-003: should handle unicode in type names', () => {
      const registry = createEmptyRegistry();
      registry.register('Résistor', validResistorModel);
      expect(registry.has('Résistor')).toBe(true);
    });

    it('EDGE-004: should prevent mutation of registered models', () => {
      const registry = createPopulatedRegistry();
      const model = registry.get('R');
      if (model) {
        // @ts-ignore - Trying to mutate
        model.type = 'MUTATED';
      }
      const modelAgain = registry.get('R');
      expect(modelAgain?.type).toBe('R');
    });

    it('EDGE-005: should handle empty string in validate', () => {
      const registry = createPopulatedRegistry();
      const result = registry.validate('', {});
      expect(result.valid).toBe(false);
    });

    it('EDGE-006: should provide meaningful error messages', () => {
      const registry = createPopulatedRegistry();
      const result = registry.validate('R', { resistance: -1 });
      expect(result.errors[0]).toMatch(/resistance must be >= 0/);
    });

    it('EDGE-007: should not leak internal state', () => {
      const registry = createPopulatedRegistry();
      const types = registry.list();
      // @ts-ignore - Trying to mutate list
      types.push('HACKED');
      expect(registry.list()).not.toContain('HACKED');
    });

    it('EDGE-008: should handle registerAll with empty object', () => {
      const registry = createEmptyRegistry();
      registry.registerAll({});
      expect(registry.size()).toBe(0);
    });

    it('EDGE-009: should handle whitespace in type on validation', () => {
      const registry = createPopulatedRegistry();
      expect(() => {
        registry.validate(' R ', { resistance: 1000 });
      }).not.toThrow();
    });

    it('EDGE-010: should handle register with model containing extra fields', () => {
      const registry = createEmptyRegistry();
      const model = {
        ...validResistorModel,
        extraField: 'should be ignored or accepted'
      };
      registry.register('R_EXTRA', model);
      const retrieved = registry.get('R_EXTRA');
      expect(retrieved).toBeDefined();
      // Extra fields may be preserved or stripped depending on design
    });
  });
});