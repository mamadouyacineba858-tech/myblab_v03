import { describe, it, expect } from 'vitest';
import { CommandBus, CommandRegistry, Command } from '../../index.js';
import { AddComponentHandler } from '../../handlers/component/AddComponentHandler.js';
import { ValidationEngine } from '../../validation/ValidationEngine.js';
import { ValidationRegistry } from '../../validation/ValidationRegistry.js';
import { createHandlerTestContext } from '../../handlers/__tests__/fixtures/testHistoryContext.js';
import { createTestDocument } from '../../handlers/__tests__/fixtures/testDocument.js';
import { alwaysErrorRule } from '../../validation/__tests__/fixtures/rules/alwaysErrorRule.js';
import { alwaysWarningRule } from '../../validation/__tests__/fixtures/rules/alwaysWarningRule.js';
import { alwaysInfoRule } from '../../validation/__tests__/fixtures/rules/alwaysInfoRule.js';

function createValidatedAddComponentBus(rule) {
  const documentApi = createHandlerTestContext(createTestDocument()).documentApi;
  const historyService = createHandlerTestContext(createTestDocument()).historyService;
  const registry = new CommandRegistry();
  registry.register('ADD_COMPONENT', new AddComponentHandler({ historyService, documentApi }));

  const validationRegistry = new ValidationRegistry();
  validationRegistry.add(rule);
  const validationEngine = new ValidationEngine(validationRegistry);
  const bus = new CommandBus(registry, { validationEngine });

  return { bus, documentApi };
}

describe('CF4 — CommandBus → Validation → AddComponentHandler', () => {
  it('blocks addComponent mutation on ERROR before the Handler', () => {
    const { bus, documentApi } = createValidatedAddComponentBus(alwaysErrorRule);
    const before = documentApi.getDocument();

    expect(() => bus.dispatch(
      new Command('ADD_COMPONENT', { componentType: 'resistor' }),
      before
    )).toThrow('Command rejected by validation');

    expect(documentApi.getDocument().components).toHaveLength(before.components.length);
  });

  it('allows addComponent on WARNING and preserves the validation report', () => {
    const { bus, documentApi } = createValidatedAddComponentBus(alwaysWarningRule);
    const beforeLength = documentApi.getDocument().components.length;

    const result = bus.dispatch(
      new Command('ADD_COMPONENT', { componentType: 'resistor' }),
      documentApi.getDocument()
    );

    expect(result.success).toBe(true);
    expect(result.validationReport.getStatus()).toBe('WARNING');
    expect(documentApi.getDocument().components).toHaveLength(beforeLength + 1);
  });

  it('allows addComponent on INFO and preserves the validation report', () => {
    const { bus, documentApi } = createValidatedAddComponentBus(alwaysInfoRule);
    const beforeLength = documentApi.getDocument().components.length;

    const result = bus.dispatch(
      new Command('ADD_COMPONENT', { componentType: 'resistor' }),
      documentApi.getDocument()
    );

    expect(result.success).toBe(true);
    expect(result.validationReport.getStatus()).toBe('OK');
    expect(result.validationReport.getInfos()).toHaveLength(1);
    expect(documentApi.getDocument().components).toHaveLength(beforeLength + 1);
  });
});
