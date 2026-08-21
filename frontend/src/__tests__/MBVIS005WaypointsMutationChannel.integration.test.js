/**
 * MBVIS005WaypointsMutationChannel.integration.test.js — MB-VIS-005.
 *
 * Même patron que CF4ValidationIntegration.test.js : test au niveau Core
 * (CommandBus + UpdateWireWaypointsHandler + HistoryService + HistoryManager
 * + ValidationEngine), indépendant de React, avec un CommandRegistry
 * construit localement au test.
 *
 * IMPORTANT (MB-VIS-005 §5, G-09) : ce registre local N'EST PAS celui de
 * production. Il ne modifie ni n'amende frontend/src/hooks/useCircuitState.js
 * ni frontend/src/bridge/tests/cf1DocumentArchitecture.test.js, qui reste le
 * seul verrou faisant autorité sur les commandes enregistrées dans le
 * CommandRegistry réellement utilisé par l'application. Ce test prouve
 * uniquement que le canal CF3 (CommandBus -> Validation -> Handler ->
 * HistoryService -> Document) fonctionne correctement pour
 * UPDATE_WIRE_WAYPOINTS lorsqu'il est câblé — l'enregistrement en
 * production reste soumis au ruling CSA requis.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { Command } from '../core/command/Command.js'
import { CommandBus } from '../core/command/CommandBus.js'
import { CommandRegistry } from '../core/command/CommandRegistry.js'
import { UpdateWireWaypointsHandler } from '../core/handlers/wire/UpdateWireWaypointsHandler.js'
import { HistoryService } from '../core/history/HistoryService.js'
import { HistoryManager } from '../history/HistoryManager.js'
import { ValidationEngine } from '../core/validation/ValidationEngine.js'
import { createDefaultValidationRegistry } from '../core/validation/createValidationRegistry.js'

/**
 * Le Document doit contenir des composants/pins réels, résolus via
 * canonicalRegistry.js : ValidationEngine exécute TOUTES les règles
 * enregistrées, y compris STR-001/STR-002/STR-003 déjà existantes, qui
 * valident aussi le Document reçu tel quel (pas seulement la commande en
 * attente). Le fixture partagé core/handlers/__tests__/fixtures/
 * testDocument.js n'est PAS réutilisable ici : il a été conçu pour des
 * tests de Handler isolés qui n'exécutent jamais de ValidationEngine, et
 * ses types ('resistor'/'capacitor' en minuscules) ne correspondent pas
 * aux types canoniques réels ('RESISTOR'/'CAPACITOR') — le réutiliser
 * ferait échouer STR-001/STR-003 pour une raison étrangère à MB-VIS-005.
 * Document minimal, local à ce test, avec deux RESISTOR réels (types et
 * pins 'A'/'B' résolus par canonicalRegistry.js) reliés par un wire W1.
 */
function buildStack() {
  let currentDocument = {
    components: [
      { id: 'R1', type: 'RESISTOR', position: { x: 0, y: 0 }, parameters: { resistance: 220 } },
      { id: 'R2', type: 'RESISTOR', position: { x: 100, y: 0 }, parameters: { resistance: 220 } },
    ],
    wires: [
      { id: 'W1', pinA: { componentId: 'R1', pinId: 'A' }, pinB: { componentId: 'R2', pinId: 'A' } },
    ],
  }
  const documentApi = {
    getDocument: () => currentDocument,
    applyDocument: (doc) => {
      currentDocument = doc
    },
  }

  const historyManager = new HistoryManager()
  const historyService = new HistoryService(historyManager, documentApi)

  const registry = new CommandRegistry()
  registry.register('UPDATE_WIRE_WAYPOINTS', new UpdateWireWaypointsHandler({ historyService, documentApi }))

  const validationEngine = new ValidationEngine(createDefaultValidationRegistry())
  const commandBus = new CommandBus(registry, { validationEngine })

  return {
    commandBus,
    historyManager,
    historyService,
    getDocument: () => currentDocument,
  }
}

describe('MB-VIS-005 — flux Command -> ValidationEngine -> UpdateWireWaypointsHandler -> Document -> HistoryService (registre local, non-production)', () => {
  let stack

  beforeEach(() => {
    stack = buildStack()
  })

  it('OK (waypoints valides) : le Handler s\'exécute, le Document est muté, une entrée d\'historique est créée', () => {
    const command = new Command('UPDATE_WIRE_WAYPOINTS', { wireId: 'W1', waypoints: [{ x: 10, y: 20 }] })
    const result = stack.commandBus.dispatch(command, stack.getDocument())

    expect(result.success).toBe(true)
    expect(result.rejected).toBeUndefined()
    expect(stack.getDocument().wires[0].waypoints).toEqual([{ x: 10, y: 20 }])
    expect(stack.historyManager.canUndo()).toBe(true)
  })

  it('ERROR (STR-006, structure de waypoint invalide) : rejet explicite, AUCUNE mutation, AUCUNE entrée d\'historique', () => {
    const command = new Command('UPDATE_WIRE_WAYPOINTS', { wireId: 'W1', waypoints: [{ x: NaN, y: 1 }] })
    const result = stack.commandBus.dispatch(command, stack.getDocument())

    expect(result.success).toBe(false)
    expect(result.rejected).toBe(true)
    expect(result.validationReport.hasErrors()).toBe(true)
    expect(result.validationReport.getErrors().some((e) => e.ruleId === 'STR-006')).toBe(true)
    expect(stack.getDocument().wires[0].waypoints).toBeUndefined()
    expect(stack.historyManager.canUndo()).toBe(false)
  })

  it('ERROR (structure non-tableau) : rejet explicite avant application', () => {
    const command = new Command('UPDATE_WIRE_WAYPOINTS', { wireId: 'W1', waypoints: 'not-an-array' })
    const result = stack.commandBus.dispatch(command, stack.getDocument())

    expect(result.rejected).toBe(true)
    expect(stack.getDocument().wires[0].waypoints).toBeUndefined()
  })

  it('un rejet ERROR n\'empêche pas une commande suivante valide de s\'exécuter normalement', () => {
    const bad = new Command('UPDATE_WIRE_WAYPOINTS', { wireId: 'W1', waypoints: [{ x: Infinity, y: 0 }] })
    const rejected = stack.commandBus.dispatch(bad, stack.getDocument())
    expect(rejected.rejected).toBe(true)

    const good = new Command('UPDATE_WIRE_WAYPOINTS', { wireId: 'W1', waypoints: [{ x: 1, y: 1 }] })
    const accepted = stack.commandBus.dispatch(good, stack.getDocument())
    expect(accepted.success).toBe(true)
    expect(stack.getDocument().wires[0].waypoints).toEqual([{ x: 1, y: 1 }])
  })

  it('Undo/Redo à travers le CommandBus restaurent l\'état complet du tableau sans divergence du Document (AC-05)', () => {
    const first = new Command('UPDATE_WIRE_WAYPOINTS', { wireId: 'W1', waypoints: [{ x: 1, y: 1 }] })
    stack.commandBus.dispatch(first, stack.getDocument())

    const second = new Command('UPDATE_WIRE_WAYPOINTS', { wireId: 'W1', waypoints: [{ x: 2, y: 2 }, { x: 3, y: 3 }] })
    stack.commandBus.dispatch(second, stack.getDocument())

    expect(stack.getDocument().wires[0].waypoints).toEqual([{ x: 2, y: 2 }, { x: 3, y: 3 }])

    stack.historyService.undo()
    expect(stack.getDocument().wires[0].waypoints).toEqual([{ x: 1, y: 1 }])

    stack.historyService.undo()
    expect(stack.getDocument().wires[0].waypoints).toEqual([])

    stack.historyService.redo()
    expect(stack.getDocument().wires[0].waypoints).toEqual([{ x: 1, y: 1 }])
  })

  it('aucune mutation directe du Document n\'est nécessaire côté appelant : seul CommandBus.dispatch() modifie l\'état (AC-03)', () => {
    const before = stack.getDocument()
    const command = new Command('UPDATE_WIRE_WAYPOINTS', { wireId: 'W1', waypoints: [{ x: 7, y: 7 }] })
    stack.commandBus.dispatch(command, stack.getDocument())
    expect(stack.getDocument()).not.toBe(before)
    expect(stack.getDocument().wires[0].waypoints).toEqual([{ x: 7, y: 7 }])
  })
})
