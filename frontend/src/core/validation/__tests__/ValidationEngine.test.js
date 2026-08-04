import { describe, it, expect } from 'vitest';
import { ValidationEngine } from '../ValidationEngine.js';
import { ValidationRegistry } from '../ValidationRegistry.js';
import { ValidationProblem } from '../ValidationProblem.js';
import { LEVELS, STATUSES } from '../constants.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { alwaysErrorRule } from './fixtures/rules/alwaysErrorRule.js';
import { alwaysWarningRule } from './fixtures/rules/alwaysWarningRule.js';
import { alwaysInfoRule } from './fixtures/rules/alwaysInfoRule.js';

describe('ValidationEngine', () => {
  it('should return OK report when no rules', () => {
    const registry = new ValidationRegistry();
    const engine = new ValidationEngine(registry);
    const document = createTestDocument();
    const report = engine.validate(document);
    expect(report.getStatus()).toBe(STATUSES.OK);
  });

  it('should execute a rule that returns an error', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysErrorRule);
    const engine = new ValidationEngine(registry);
    const document = createTestDocument();
    const report = engine.validate(document);
    expect(report.getStatus()).toBe(STATUSES.ERROR);
    expect(report.getErrors()).toHaveLength(1);
    expect(report.getErrors()[0].message).toBe('This rule always returns an error');
  });

  it('should execute a rule that returns a warning', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysWarningRule);
    const engine = new ValidationEngine(registry);
    const document = createTestDocument();
    const report = engine.validate(document);
    expect(report.getStatus()).toBe(STATUSES.WARNING);
    expect(report.getWarnings()).toHaveLength(1);
  });

  it('should execute a rule that returns an info', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysInfoRule);
    const engine = new ValidationEngine(registry);
    const document = createTestDocument();
    const report = engine.validate(document);
    expect(report.getStatus()).toBe(STATUSES.OK);
    expect(report.getInfos()).toHaveLength(1);
  });

  it('should aggregate multiple rules', () => {
    const registry = new ValidationRegistry();
    registry.add(alwaysErrorRule);
    registry.add(alwaysWarningRule);
    registry.add(alwaysInfoRule);
    const engine = new ValidationEngine(registry);
    const document = createTestDocument();
    const report = engine.validate(document);

    expect(report.getErrors()).toHaveLength(1);
    expect(report.getWarnings()).toHaveLength(1);
    expect(report.getInfos()).toHaveLength(1);
    expect(report.getStatus()).toBe(STATUSES.ERROR);
  });

  it('should handle custom rule returning ValidationProblem', () => {
    const registry = new ValidationRegistry();
    registry.add({
      id: 'custom_error',
      category: 'structural',
      level: LEVELS.ERROR,
      validate: () => new ValidationProblem({
        id: 'custom_problem',
        level: LEVELS.ERROR,
        message: 'Custom problem message',
        explanation: 'Custom explanation',
        suggestion: 'Custom suggestion',
      }),
    });
    const engine = new ValidationEngine(registry);
    const document = createTestDocument();
    const report = engine.validate(document);

    expect(report.getStatus()).toBe(STATUSES.ERROR);
    expect(report.getErrors()[0].message).toBe('Custom problem message');
  });

  it('should handle rule execution errors gracefully', () => {
    const registry = new ValidationRegistry();
    registry.add({
      id: 'failing_rule',
      category: 'structural',
      level: LEVELS.ERROR,
      validate: () => {
        throw new Error('Something went wrong in the rule');
      },
    });
    const engine = new ValidationEngine(registry);
    const document = createTestDocument();
    const report = engine.validate(document);

    expect(report.getStatus()).toBe(STATUSES.ERROR);
    expect(report.getErrors()).toHaveLength(1);
    expect(report.getErrors()[0].message).toContain('failing_rule');
    expect(report.getErrors()[0].message).toContain('Something went wrong');
  });

  it('should throw if registry is not provided', () => {
    expect(() => new ValidationEngine()).toThrow('ValidationEngine: registry is required');
  });

  it('should accept command parameter for command-aware rules', () => {
    const registry = new ValidationRegistry();
    registry.add({
      id: 'command_aware',
      category: 'structural',
      level: LEVELS.ERROR,
      validate: (document, command) => {
        if (command && command.type === 'BAD_COMMAND') {
          return { message: 'Bad command detected' };
        }
        return null;
      },
    });
    const engine = new ValidationEngine(registry);
    const document = createTestDocument();

    const reportWithBadCommand = engine.validate(document, { type: 'BAD_COMMAND' });
    expect(reportWithBadCommand.getStatus()).toBe(STATUSES.ERROR);

    const reportWithGoodCommand = engine.validate(document, { type: 'GOOD_COMMAND' });
    expect(reportWithGoodCommand.getStatus()).toBe(STATUSES.OK);
  });

  it('should validate document only (no command)', () => {
    const registry = new ValidationRegistry();
    registry.add({
      id: 'document_check',
      category: 'structural',
      level: LEVELS.ERROR,
      validate: (document) => {
        if (!document.components || document.components.length === 0) {
          return { message: 'No components found in document' };
        }
        return null;
      },
    });
    const engine = new ValidationEngine(registry);

    const emptyDocument = { components: [] };
    const report = engine.validateDocument(emptyDocument);
    expect(report.getStatus()).toBe(STATUSES.ERROR);

    const validDocument = createTestDocument();
    const okReport = engine.validateDocument(validDocument);
    expect(okReport.getStatus()).toBe(STATUSES.OK);
  });
});
