import { describe, it, expect, beforeEach } from 'vitest';
import { CommandBus, CommandRegistry, Command, CommandHandler } from '../../index.js';
import { ValidationEngine } from '../../validation/ValidationEngine.js';
import { ValidationRegistry } from '../../validation/ValidationRegistry.js';
import { TestCommandHandler } from './fixtures/TestCommandHandler.js';
import { alwaysErrorRule } from '../../validation/__tests__/fixtures/rules/alwaysErrorRule.js';
import { alwaysWarningRule } from '../../validation/__tests__/fixtures/rules/alwaysWarningRule.js';
import { alwaysInfoRule } from '../../validation/__tests__/fixtures/rules/alwaysInfoRule.js';

describe('CommandBus', () => {
  let registry;
  let bus;
  let testHandler;

  beforeEach(() => {
    registry = new CommandRegistry();
    testHandler = new TestCommandHandler();
    registry.register('TEST_COMMAND', testHandler);
    bus = new CommandBus(registry);
  });

  it('should dispatch a command successfully', () => {
    const command = new Command('TEST_COMMAND', { value: 42 });
    const document = { components: [] };

    const result = bus.dispatch(command, document);

    expect(result.success).toBe(true);
    expect(result.commandType).toBe('TEST_COMMAND');
    expect(result.result).toEqual({ success: true, value: 42, document });
  });

  it('should throw if command is not an instance of Command', () => {
    expect(() => bus.dispatch({ type: 'TEST_COMMAND' }, {})).toThrow('Command must be an instance of Command');
  });

  it('should throw if no handler is registered', () => {
    const unknownCommand = new Command('UNKNOWN_TYPE', {});
    expect(() => bus.dispatch(unknownCommand, {})).toThrow('No handler registered for command type "UNKNOWN_TYPE"');
  });

  it('should wrap handler errors in CommandExecutionError', () => {
    class FailingHandler extends CommandHandler {
      execute() {
        throw new Error('Something went wrong in handler');
      }
    }
    const failingRegistry = new CommandRegistry();
    failingRegistry.register('FAILING', new FailingHandler());
    const failingBus = new CommandBus(failingRegistry);

    const command = new Command('FAILING', {});
    expect(() => failingBus.dispatch(command, {})).toThrow('Something went wrong in handler');
  });

  it('should execute middlewares in order', () => {
    const executionLog = [];
    bus.use((cmd, doc, next) => {
      executionLog.push('middleware1');
      return next(cmd, doc);
    });
    bus.use((cmd, doc, next) => {
      executionLog.push('middleware2');
      return next(cmd, doc);
    });

    const command = new Command('TEST_COMMAND', {});
    bus.dispatch(command, {});

    expect(executionLog).toEqual(['middleware1', 'middleware2']);
  });

  it('should reject the command before the handler when validation returns ERROR', () => {
    let handlerCalled = false;
    class TrackingHandler extends CommandHandler {
      execute() {
        handlerCalled = true;
        return { success: true };
      }
    }

    const validationRegistry = new ValidationRegistry();
    validationRegistry.add(alwaysErrorRule);
    const validationEngine = new ValidationEngine(validationRegistry);
    const validationRegistryForCommands = new CommandRegistry();
    validationRegistryForCommands.register('TEST_COMMAND', new TrackingHandler());
    const validatedBus = new CommandBus(validationRegistryForCommands, { validationEngine });

    const error = (() => {
      try {
        validatedBus.dispatch(new Command('TEST_COMMAND', {}), { components: [] });
        return null;
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).not.toBeNull();
    expect(error.message).toBe('Command rejected by validation');
    expect(error.validationReport.hasErrors()).toBe(true);
    expect(handlerCalled).toBe(false);
  });

  it('should allow WARNING and attach the validation report to the result', () => {
    const validationRegistry = new ValidationRegistry();
    validationRegistry.add(alwaysWarningRule);
    const validationEngine = new ValidationEngine(validationRegistry);
    const validatedBus = new CommandBus(registry, { validationEngine });

    const result = validatedBus.dispatch(new Command('TEST_COMMAND', { value: 7 }), { components: [] });

    expect(result.success).toBe(true);
    expect(result.validationReport.getStatus()).toBe('WARNING');
    expect(result.result.value).toBe(7);
  });

  it('should allow INFO and attach the validation report to the result', () => {
    const validationRegistry = new ValidationRegistry();
    validationRegistry.add(alwaysInfoRule);
    const validationEngine = new ValidationEngine(validationRegistry);
    const validatedBus = new CommandBus(registry, { validationEngine });

    const result = validatedBus.dispatch(new Command('TEST_COMMAND', { value: 8 }), { components: [] });

    expect(result.success).toBe(true);
    expect(result.validationReport.getStatus()).toBe('OK');
    expect(result.validationReport.getInfos()).toHaveLength(1);
    expect(result.result.value).toBe(8);
  });
});
