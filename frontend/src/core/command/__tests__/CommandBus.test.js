import { describe, it, expect, beforeEach } from 'vitest';
import { CommandBus, CommandRegistry, Command, CommandHandler } from '../../index.js';
import { TestCommandHandler } from './fixtures/TestCommandHandler.js';

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
    // Create handler that throws
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
});
