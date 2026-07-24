import { describe, it, expect, vi } from 'vitest'
import { MoveCommand } from '../history/commands/MoveCommand.js'

describe('MoveCommand', () => {
  it('should apply the after positions through the Document API', () => {
    const documentApi = {
      updateComponentPositions: vi.fn()
    }

    const before = new Map([
      ['comp-1', { x: 100, y: 100 }]
    ])

    const after = new Map([
      ['comp-1', { x: 150, y: 120 }]
    ])

    const command = new MoveCommand(documentApi, before, after)

    command.do()

    expect(documentApi.updateComponentPositions).toHaveBeenCalledTimes(1)
    expect(documentApi.updateComponentPositions).toHaveBeenCalledWith(after)
  })

  it('should undo to before positions and redo to after positions', () => {
    const documentApi = {
      updateComponentPositions: vi.fn()
    }

    const before = new Map([
      ['comp-1', { x: 100, y: 100 }]
    ])

    const after = new Map([
      ['comp-1', { x: 150, y: 120 }]
    ])

    const command = new MoveCommand(documentApi, before, after)

    command.do()
    command.undo()
    command.redo()

    expect(documentApi.updateComponentPositions).toHaveBeenNthCalledWith(1, after)
    expect(documentApi.updateComponentPositions).toHaveBeenNthCalledWith(2, before)
    expect(documentApi.updateComponentPositions).toHaveBeenNthCalledWith(3, after)
  })
})
