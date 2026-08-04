import { describe, it, expect } from 'vitest';
import { ValidationRegistry } from '../ValidationRegistry.js';
import { CATEGORIES, LEVELS } from '../constants.js';
import { alwaysErrorRule } from './fixtures/rules/alwaysErrorRule.js';
import { alwaysWarningRule } from './fixtures/rules/alwaysWarningRule.js';

describe('ValidationRegistry', () => {
  it('should add a rule', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysErrorRule);
    expect(registry.count()).toBe(1);
    expect(registry.has('always_error')).toBe(true);
  });

  it('should throw if adding rule without id', () => {
    const registry = new ValidationRegistry();
    expect(() => registry.add({
      category: CATEGORIES.STRUCTURAL,
      level: LEVELS.ERROR,
      validate: () => {},
    })).toThrow('ValidationRegistry: rule must have an id');
  });

  it('should throw if adding rule with invalid category', () => {
    const registry = new ValidationRegistry();
    expect(() => registry.add({
      id: 'test',
      category: 'invalid',
      level: LEVELS.ERROR,
      validate: () => {},
    })).toThrow('ValidationRegistry: invalid category "invalid"');
  });

  it('should throw if adding rule with invalid level', () => {
    const registry = new ValidationRegistry();
    expect(() => registry.add({
      id: 'test',
      category: CATEGORIES.STRUCTURAL,
      level: 'INVALID',
      validate: () => {},
    })).toThrow('ValidationRegistry: invalid level "INVALID"');
  });

  it('should throw if adding rule without validate function', () => {
    const registry = new ValidationRegistry();
    expect(() => registry.add({
      id: 'test',
      category: CATEGORIES.STRUCTURAL,
      level: LEVELS.ERROR,
    })).toThrow('ValidationRegistry: rule must have a validate function');
  });

  it('should throw if adding rule with duplicate id', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysErrorRule);
    expect(() => registry.add(alwaysErrorRule))
      .toThrow('ValidationRegistry: rule with id "always_error" already exists');
  });

  it('should get all rules', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysErrorRule);
    registry.add(alwaysWarningRule);
    expect(registry.getAll()).toHaveLength(2);
  });

  it('should get rules by category', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysErrorRule);
    registry.add(alwaysWarningRule);
    const structural = registry.getByCategory(CATEGORIES.STRUCTURAL);
    expect(structural).toHaveLength(1);
    expect(structural[0].id).toBe('always_error');
  });

  it('should get rules by level', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysErrorRule);
    registry.add(alwaysWarningRule);
    const errors = registry.getByLevel(LEVELS.ERROR);
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe('always_error');
  });
});
