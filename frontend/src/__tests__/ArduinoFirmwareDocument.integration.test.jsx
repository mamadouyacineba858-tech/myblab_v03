/**
 * ArduinoFirmwareDocument.integration.test.jsx — MB-L1-ARD-001 (§27/§28,
 * TEST T1-T2, T15-T19, cycle de vie complet).
 *
 * Pipeline réel (CircuitProvider, vraies actions addComponent/
 * updateArduinoFirmware/undo/redo/exportCircuit/importCircuit/clearCircuit)
 * — aucune mutation directe d'objet, même patron que
 * ComponentValueEditing.integration.test.jsx (MB-L1-CVE-001).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { DEFAULT_FIRMWARE_SOURCE } from '../arduino/firmwareDefaults.js'

const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

function renderApi() {
  const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
  return result
}

describe('MB-L1-ARD-001 — TEST T1/T2 : firmware par défaut à la création', () => {
  it('T1 — un nouvel ARDUINO possède firmware.source === DEFAULT_FIRMWARE_SOURCE', () => {
    const result = renderApi()
    act(() => { result.current.addComponent('ARDUINO', 100, 100) })
    const arduino = result.current.components.find((c) => c.type === 'ARDUINO')
    expect(arduino.firmware).toEqual({ source: DEFAULT_FIRMWARE_SOURCE })
  })

  it('T2 — un nouveau RESISTOR n\'acquiert aucun champ firmware', () => {
    const result = renderApi()
    act(() => { result.current.addComponent('RESISTOR', 100, 100) })
    const resistor = result.current.components.find((c) => c.type === 'RESISTOR')
    expect(resistor.firmware).toBeUndefined()
    expect(Object.hasOwn(resistor, 'firmware')).toBe(false)
  })
})

describe('MB-L1-ARD-001 — §28 : cycle de vie complet via les vrais canaux', () => {
  it('add -> read default -> update -> undo -> redo -> export -> clear/import -> read same firmware', () => {
    const result = renderApi()

    // add ARDUINO
    act(() => { result.current.addComponent('ARDUINO', 100, 100) })
    const uid = result.current.components.find((c) => c.type === 'ARDUINO').uid

    // read default firmware
    expect(result.current.components.find((c) => c.uid === uid).firmware).toEqual({ source: DEFAULT_FIRMWARE_SOURCE })

    // update firmware
    const undoCountBeforeEdit = result.current.getUndoCount()
    const newSource = 'void setup() { pinMode(2, OUTPUT); }\nvoid loop() {}'
    act(() => { result.current.updateArduinoFirmware(uid, newSource) })
    expect(result.current.getUndoCount()).toBe(undoCountBeforeEdit + 1)
    expect(result.current.components.find((c) => c.uid === uid).firmware).toEqual({ source: newSource })

    // undo
    act(() => { result.current.undo() })
    expect(result.current.components.find((c) => c.uid === uid).firmware).toEqual({ source: DEFAULT_FIRMWARE_SOURCE })

    // redo
    act(() => { result.current.redo() })
    expect(result.current.components.find((c) => c.uid === uid).firmware).toEqual({ source: newSource })

    // export
    const exported = result.current.exportCircuit()
    const exportedArduino = exported.components.find((c) => c.uid === uid)
    expect(exportedArduino.firmware).toEqual({ source: newSource })

    // T18 — aucun état runtime dans l'export (seul `source` existe)
    expect(Object.keys(exportedArduino.firmware)).toEqual(['source'])
    const exportedJson = JSON.stringify(exported)
    expect(exportedJson).not.toMatch(/pinOutputs|_pwmSignals|currentTime|running|RuntimeOrchestrator|ArduinoSimulator/)

    // clear + import
    act(() => { result.current.clearCircuit() })
    expect(result.current.components).toHaveLength(0)

    act(() => { result.current.importCircuit(JSON.parse(JSON.stringify(exported))) })
    const reimported = result.current.components.find((c) => c.uid === uid)
    expect(reimported.firmware).toEqual({ source: newSource })
  })
})

describe('MB-L1-ARD-001 — TEST T15/T16/T17 : export/import round-trip strict', () => {
  it('round-trip préserve exactement firmware.source', () => {
    const result = renderApi()
    act(() => { result.current.addComponent('ARDUINO', 50, 50) })
    const uid = result.current.components[0].uid
    act(() => { result.current.updateArduinoFirmware(uid, 'CUSTOM SOURCE') })

    const exported = result.current.exportCircuit()
    expect(exported.components[0].firmware).toEqual({ source: 'CUSTOM SOURCE' })

    act(() => { result.current.importCircuit(JSON.parse(JSON.stringify(exported))) })
    expect(result.current.components[0].firmware).toEqual({ source: 'CUSTOM SOURCE' })
  })
})

describe('MB-L1-ARD-001 — TEST T19 : clear circuit supprime Arduino + firmware', () => {
  it('clearCircuit ne laisse aucun firmware orphelin', () => {
    const result = renderApi()
    act(() => { result.current.addComponent('ARDUINO', 50, 50) })
    expect(result.current.components).toHaveLength(1)
    act(() => { result.current.clearCircuit() })
    expect(result.current.components).toHaveLength(0)
  })

  it('supprimer l\'Arduino (deleteComponent) supprime naturellement son firmware avec le composant', () => {
    const result = renderApi()
    act(() => { result.current.addComponent('ARDUINO', 50, 50) })
    const uid = result.current.components[0].uid
    act(() => { result.current.deleteComponent(uid) })
    expect(result.current.components.find((c) => c.uid === uid)).toBeUndefined()
  })
})

describe('MB-L1-ARD-001 — updateArduinoFirmware : garde-fous applicatifs', () => {
  it('cible non-ARDUINO ignorée silencieusement (aucun dispatch)', () => {
    const result = renderApi()
    act(() => { result.current.addComponent('RESISTOR', 50, 50) })
    const uid = result.current.components[0].uid
    const before = result.current.getUndoCount()
    act(() => { result.current.updateArduinoFirmware(uid, 'anything') })
    expect(result.current.getUndoCount()).toBe(before)
  })

  it('source identique -> idempotence, aucune nouvelle commande History', () => {
    const result = renderApi()
    act(() => { result.current.addComponent('ARDUINO', 50, 50) })
    const uid = result.current.components[0].uid
    const before = result.current.getUndoCount()
    act(() => { result.current.updateArduinoFirmware(uid, DEFAULT_FIRMWARE_SOURCE) })
    expect(result.current.getUndoCount()).toBe(before)
  })
})
