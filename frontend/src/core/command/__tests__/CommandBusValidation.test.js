import { describe, it, expect } from 'vitest'
import { CommandBus } from '../CommandBus.js'
import { CommandRegistry } from '../CommandRegistry.js'
import { Command } from '../Command.js'
import { CommandHandler } from '../CommandHandler.js'
import { TestCommandHandler } from './fixtures/TestCommandHandler.js'
import { ValidationEngine } from '../../validation/ValidationEngine.js'
import { ValidationRegistry } from '../../validation/ValidationRegistry.js'
import { alwaysErrorRule } from '../../validation/__tests__/fixtures/rules/alwaysErrorRule.js'
import { alwaysWarningRule } from '../../validation/__tests__/fixtures/rules/alwaysWarningRule.js'
import { alwaysInfoRule } from '../../validation/__tests__/fixtures/rules/alwaysInfoRule.js'

function busWithRule(rule) {
  const registry = new CommandRegistry()
  let executed = false
  class TrackingHandler extends TestCommandHandler {
    execute(cmd, doc) {
      executed = true
      return super.execute(cmd, doc)
    }
  }
  registry.register('TEST_COMMAND', new TrackingHandler())

  const validationRegistry = new ValidationRegistry()
  if (rule) validationRegistry.add(rule)
  const validationEngine = new ValidationEngine(validationRegistry)

  const bus = new CommandBus(registry, { validationEngine })
  return { bus, wasHandlerExecuted: () => executed }
}

describe('MB-CF4-001 — CommandBus x ValidationEngine (ADR-010)', () => {
  it('1. sans ValidationEngine → comportement historique préservé', () => {
    const registry = new CommandRegistry()
    registry.register('TEST_COMMAND', new TestCommandHandler())
    const bus = new CommandBus(registry) // pas de validators, comme avant CF4

    const command = new Command('TEST_COMMAND', { value: 42 })
    const document = { components: [] }
    const result = bus.dispatch(command, document)

    expect(result).toEqual({
      success: true,
      commandId: command.id,
      commandType: command.type,
      result: { success: true, value: 42, document },
    })
    expect(result.validationReport).toBeUndefined()
    expect(result.rejected).toBeUndefined()
  })

  it('2. validation OK (aucune règle) → le handler est exécuté', () => {
    const { bus, wasHandlerExecuted } = busWithRule(null)
    const command = new Command('TEST_COMMAND', { value: 1 })
    const result = bus.dispatch(command, { components: [] })

    expect(wasHandlerExecuted()).toBe(true)
    expect(result.success).toBe(true)
    expect(result.rejected).toBeUndefined()
  })

  it('3. ERROR → le handler n\'est jamais exécuté, commande rejetée explicitement', () => {
    const { bus, wasHandlerExecuted } = busWithRule(alwaysErrorRule)
    const command = new Command('TEST_COMMAND', { value: 1 })
    const result = bus.dispatch(command, { components: [] })

    expect(wasHandlerExecuted()).toBe(false)
    expect(result).toEqual({
      success: false,
      commandId: command.id,
      commandType: command.type,
      rejected: true,
      validationReport: result.validationReport,
    })
    expect(result.validationReport.hasErrors()).toBe(true)
  })

  it('4. WARNING → le handler est exécuté, la commande réussit', () => {
    const { bus, wasHandlerExecuted } = busWithRule(alwaysWarningRule)
    const command = new Command('TEST_COMMAND', { value: 7 })
    const result = bus.dispatch(command, { components: [] })

    expect(wasHandlerExecuted()).toBe(true)
    expect(result.success).toBe(true)
    expect(result.rejected).toBeUndefined()
    expect(result.validationReport.getWarnings()).toHaveLength(1)
  })

  it('5. INFO → le handler est exécuté, la commande réussit', () => {
    const { bus, wasHandlerExecuted } = busWithRule(alwaysInfoRule)
    const command = new Command('TEST_COMMAND', { value: 7 })
    const result = bus.dispatch(command, { components: [] })

    expect(wasHandlerExecuted()).toBe(true)
    expect(result.success).toBe(true)
    expect(result.validationReport.getInfos()).toHaveLength(1)
  })

  it('6. le ValidationReport est bien transporté dans le résultat (succès et rejet)', () => {
    const { bus: okBus } = busWithRule(alwaysWarningRule)
    const okResult = okBus.dispatch(new Command('TEST_COMMAND', {}), { components: [] })
    expect(okResult.validationReport).toBeDefined()
    expect(okResult.validationReport.getStatus()).toBe('WARNING')

    const { bus: errBus } = busWithRule(alwaysErrorRule)
    const errResult = errBus.dispatch(new Command('TEST_COMMAND', {}), { components: [] })
    expect(errResult.validationReport).toBeDefined()
    expect(errResult.validationReport.getStatus()).toBe('ERROR')
  })

  it('7. les middlewares existants sont préservés (exécutés uniquement si la commande n\'est pas rejetée)', () => {
    const { bus } = busWithRule(alwaysWarningRule)
    const log = []
    bus.use((cmd, doc, next) => {
      log.push('mw1')
      return next(cmd, doc)
    })
    bus.dispatch(new Command('TEST_COMMAND', {}), { components: [] })
    expect(log).toEqual(['mw1'])

    const { bus: rejectingBus } = busWithRule(alwaysErrorRule)
    const log2 = []
    rejectingBus.use((cmd, doc, next) => {
      log2.push('mw1')
      return next(cmd, doc)
    })
    rejectingBus.dispatch(new Command('TEST_COMMAND', {}), { components: [] })
    // Rejeté avant le handler : le middleware qui enveloppe l'exécution du
    // handler ne s'exécute pas non plus (cohérent avec "Handler jamais appelé").
    expect(log2).toEqual([])
  })

  it('8. les erreurs de Handler restent préservées (comportement inchangé) quand la validation est OK', () => {
    class FailingHandler extends CommandHandler {
      execute() {
        throw new Error('Something went wrong in handler')
      }
    }
    const registry = new CommandRegistry()
    registry.register('FAILING', new FailingHandler())
    const validationRegistry = new ValidationRegistry()
    const validationEngine = new ValidationEngine(validationRegistry)
    const bus = new CommandBus(registry, { validationEngine })

    expect(() => bus.dispatch(new Command('FAILING', {}), {})).toThrow(
      'Something went wrong in handler'
    )
  })

  it('préserve le comportement "no handler registered" même avec un ValidationEngine configuré', () => {
    const registry = new CommandRegistry()
    const validationEngine = new ValidationEngine(new ValidationRegistry())
    const bus = new CommandBus(registry, { validationEngine })
    const unknownCommand = new Command('UNKNOWN_TYPE', {})
    expect(() => bus.dispatch(unknownCommand, {})).toThrow(
      'No handler registered for command type "UNKNOWN_TYPE"'
    )
  })

  it('dispatchAsync() reste compatible et applique la même logique de validation', async () => {
    const { bus, wasHandlerExecuted } = busWithRule(alwaysErrorRule)
    const result = await bus.dispatchAsync(new Command('TEST_COMMAND', {}), { components: [] })
    expect(wasHandlerExecuted()).toBe(false)
    expect(result.rejected).toBe(true)
  })
})
