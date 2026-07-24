import { describe, it, expect } from 'vitest'
import { HistoryManager } from '../history/HistoryManager.js'
import { HistoryCommand } from '../history/HistoryCommand.js'

class TestCommand extends HistoryCommand {
  constructor(documentApi) {
    super(documentApi)
    this.applyCount = 0
    this.undoCount = 0
  }

  apply() {
    this.applyCount++
  }

  undo() {
    this.undoCount++
  }
}

describe('HistoryManager', () => {
  it('should execute, undo and redo a command', () => {
    const documentApi = {}
    const command = new TestCommand(documentApi)
    const history = new HistoryManager()

    history.execute(command)

    expect(command.applyCount).toBe(1)
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)

    history.undo()

    expect(command.undoCount).toBe(1)
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(true)

    history.redo()

    expect(command.applyCount).toBe(2)
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
  })

  it('should clear redo history after a new command', () => {
    const documentApi = {}
    const commandA = new TestCommand(documentApi)
    const commandB = new TestCommand(documentApi)
    const history = new HistoryManager()

    history.execute(commandA)
    history.undo()

    expect(history.canRedo()).toBe(true)

    history.execute(commandB)

    expect(history.canRedo()).toBe(false)
    expect(history.canUndo()).toBe(true)
    expect(commandB.applyCount).toBe(1)
  })

  it('should limit the undo history to maxHistory', () => {
    const documentApi = {}
    const commandA = new TestCommand(documentApi)
    const commandB = new TestCommand(documentApi)
    const commandC = new TestCommand(documentApi)
    const history = new HistoryManager(2)

    history.execute(commandA)
    history.execute(commandB)
    history.execute(commandC)

    expect(history.getUndoCount()).toBe(2)
    expect(history.canUndo()).toBe(true)

    history.undo()

    expect(commandC.undoCount).toBe(1)

    history.undo()

    expect(commandB.undoCount).toBe(1)
    expect(history.canUndo()).toBe(false)
  })
})
