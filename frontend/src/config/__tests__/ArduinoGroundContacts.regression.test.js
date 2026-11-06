import { describe, expect, it } from 'vitest'
import { getComponentDef } from '../componentDefinitions.js'
import { getPinPresentationPosition } from '../../utils/pinPresentationGeometry.js'

describe('MYBLAB-GND-FIX — physical UNO ground sockets', () => {
  it('exposes all three physical ground sockets as one electrical GND pin', () => {
    const board = getComponentDef('ARDUINO')
    const ground = board.pins.find((pin) => pin.id === 'GND')
    expect(ground).toBeDefined()
    expect(ground.contacts.map((contact) => contact.id)).toEqual(['GND', 'GND_POWER', 'GND_AREF'])
    for (const contact of ground.contacts) {
      expect(contact.wireConnectable).toBe(true)
      expect(getPinPresentationPosition({ uid: 'arduino-1', type: 'ARDUINO', x: 0, y: 0 }, ground, { contact }))
        .toEqual({ x: contact.dx, y: contact.dy })
    }
  })
  it('preserves the original default GND position for existing circuits', () => {
    const ground = getComponentDef('ARDUINO').pins.find((pin) => pin.id === 'GND')
    expect(ground.contacts[0]).toMatchObject({ id: 'GND', dx: 112.15, dy: 107.96 })
  })
})
