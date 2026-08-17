/**
 * CF4ValidationIntegration.test.js
 * MB-CF4-001 — Intégration réelle du flux :
 *   Command -> ValidationEngine -> (ERROR: REJECT | WARNING/INFO: continue)
 *   -> Command Handler -> Document -> HistoryService
 *
 * Test au niveau Core (CommandBus + AddComponentHandler + HistoryService +
 * HistoryManager + ValidationEngine), indépendant de React, pour isoler et
 * vérifier précisément le contrat de rejet ADR-010 : un ERROR ne doit
 * jamais atteindre le Handler, ne doit créer aucune mutation du Document,
 * ni aucune entrée d'historique.
 *
 * La non-régression CF3 (addComponent via le hook React : création, deux
 * addComponent consécutifs, Undo, Redo, invalidation du redo après une
 * nouvelle action, pile History partagée, type inconnu) est couverte par
 * la ré-exécution de la suite déjà existante et inchangée
 * frontend/src/__tests__/AddComponentMutationChannel.integration.test.jsx,
 * désormais exécutée avec le ValidationEngine câblé dans useCircuitState.js
 * (principe de conservation : pas de duplication de tests déjà existants
 * et toujours valides).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { Command } from '../core/command/Command.js'
import { CommandBus } from '../core/command/CommandBus.js'
import { CommandRegistry } from '../core/command/CommandRegistry.js'
import { AddComponentHandler } from '../core/handlers/component/AddComponentHandler.js'
import { HistoryService } from '../core/history/HistoryService.js'
import { HistoryManager } from '../history/HistoryManager.js'
import { ValidationEngine } from '../core/validation/ValidationEngine.js'
import { createDefaultValidationRegistry } from '../core/validation/createValidationRegistry.js'

function buildStack() {
  let currentDocument = { components: [], wires: [] }
  const documentApi = {
    getDocument: () => currentDocument,
    applyDocument: (doc) => {
      currentDocument = doc
    },
  }

  const historyManager = new HistoryManager()
  const historyService = new HistoryService(historyManager, documentApi)

  const registry = new CommandRegistry()
  registry.register('ADD_COMPONENT', new AddComponentHandler({ historyService, documentApi }))

  const validationEngine = new ValidationEngine(createDefaultValidationRegistry())
  const commandBus = new CommandBus(registry, { validationEngine })

  return {
    commandBus,
    historyManager,
    getDocument: () => currentDocument,
  }
}

describe('MB-CF4-001 — flux Command -> ValidationEngine -> Handler -> Document -> HistoryService', () => {
  let stack

  beforeEach(() => {
    stack = buildStack()
  })

  it('OK (aucune erreur) : le Handler s\'exécute, le Document est muté, une entrée d\'historique est créée', () => {
    const command = new Command('ADD_COMPONENT', { componentType: 'LED', position: { x: 10, y: 10 } })
    const result = stack.commandBus.dispatch(command, stack.getDocument())

    expect(result.success).toBe(true)
    expect(result.rejected).toBeUndefined()
    expect(stack.getDocument().components).toHaveLength(1)
    expect(stack.getDocument().components[0].type).toBe('LED')
    expect(stack.historyManager.canUndo()).toBe(true)
  })

  it('WARNING/INFO (LED non connecté, aucun POWER) : rapport attaché, mais le Handler s\'exécute normalement', () => {
    const command = new Command('ADD_COMPONENT', { componentType: 'LED', position: { x: 10, y: 10 } })
    const result = stack.commandBus.dispatch(command, stack.getDocument())

    expect(result.success).toBe(true)
    expect(result.validationReport).toBeDefined()
    expect(result.validationReport.hasErrors()).toBe(false)
    expect(result.validationReport.getStatus()).not.toBe('OK') // PED-001 + ELE-006 déclenchées
    expect(stack.getDocument().components).toHaveLength(1)
  })

  it('ERROR (type de composant inconnu, STR-001) : rejet explicite, AUCUNE mutation, AUCUNE entrée d\'historique', () => {
    const command = new Command('ADD_COMPONENT', { componentType: 'NOT_A_REAL_TYPE', position: { x: 0, y: 0 } })
    const result = stack.commandBus.dispatch(command, stack.getDocument())

    expect(result.success).toBe(false)
    expect(result.rejected).toBe(true)
    expect(result.validationReport.hasErrors()).toBe(true)
    expect(stack.getDocument().components).toHaveLength(0)
    expect(stack.historyManager.canUndo()).toBe(false)
  })

  it('ERROR (paramètre explicite invalide, ELE-001) : rejet explicite, AUCUNE mutation, AUCUNE entrée d\'historique', () => {
    const command = new Command('ADD_COMPONENT', {
      componentType: 'RESISTOR',
      position: { x: 0, y: 0 },
      parameters: { resistance: -220 },
    })
    const result = stack.commandBus.dispatch(command, stack.getDocument())

    expect(result.success).toBe(false)
    expect(result.rejected).toBe(true)
    expect(result.validationReport.getErrors().some((e) => e.ruleId === 'ELE-001')).toBe(true)
    expect(stack.getDocument().components).toHaveLength(0)
    expect(stack.historyManager.canUndo()).toBe(false)
  })

  it('un rejet ERROR n\'empêche pas une commande suivante valide de s\'exécuter normalement', () => {
    const badCommand = new Command('ADD_COMPONENT', { componentType: 'GHOST_TYPE', position: { x: 0, y: 0 } })
    const rejected = stack.commandBus.dispatch(badCommand, stack.getDocument())
    expect(rejected.rejected).toBe(true)

    const goodCommand = new Command('ADD_COMPONENT', { componentType: 'LED', position: { x: 0, y: 0 } })
    const accepted = stack.commandBus.dispatch(goodCommand, stack.getDocument())
    expect(accepted.success).toBe(true)
    expect(stack.getDocument().components).toHaveLength(1)
    expect(stack.historyManager.canUndo()).toBe(true)
  })
})
