import { describe, it, expect, beforeEach } from 'vitest';
import { CommandRegistry, CommandHandler } from '../../index.js';

class MockHandler extends CommandHandler {
  execute(command) {
    return { success: true };
  }
}

describe('CommandRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  it('should register a handler', () => {
    const handler = new MockHandler();
    registry.register('TEST_TYPE', handler);
    expect(registry.hasHandler('TEST_TYPE')).toBe(true);
  });

  it('should retrieve a registered handler', () => {
    const handler = new MockHandler();
    registry.register('TEST_TYPE', handler);
    const retrieved = registry.getHandler('TEST_TYPE');
    expect(retrieved).toBe(handler);
  });

  it('should throw if handler is not a CommandHandler', () => {
    expect(() => registry.register('TEST_TYPE', {})).toThrow('Handler must be an instance of CommandHandler');
  });

  it('should throw if registering same type twice', () => {
    const handler = new MockHandler();
    registry.register('TEST_TYPE', handler);
    expect(() => registry.register('TEST_TYPE', handler)).toThrow('Handler for command type "TEST_TYPE" already registered');
  });

  it('should throw when getting unregistered handler', () => {
    expect(() => registry.getHandler('UNKNOWN')).toThrow('No handler registered for command type "UNKNOWN"');
  });

  it('should list registered types', () => {
    registry.register('TYPE_A', new MockHandler());
    registry.register('TYPE_B', new MockHandler());
    expect(registry.getRegisteredTypes()).toEqual(['TYPE_A', 'TYPE_B']);
  });
});
