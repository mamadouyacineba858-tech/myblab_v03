import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { UpdateArduinoFirmwareHandler } from '../component/UpdateArduinoFirmwareHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('MB-L1-ARD-001 — UpdateArduinoFirmwareHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  beforeEach(() => {
    const doc = createTestDocument({
      components: [
        { id: 'ARD1', type: 'ARDUINO', position: { x: 0, y: 0 }, parameters: {}, firmware: { source: 'void setup() {}\nvoid loop() {}' } },
        { id: 'R1', type: 'resistor', position: { x: 100, y: 100 }, parameters: { resistance: 1000 } },
      ],
    });
    const ctx = createHandlerTestContext(doc);
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new UpdateArduinoFirmwareHandler({ historyService, documentApi });
  });

  it('T3 — met à jour component.firmware, sans modifier aucun autre champ (T11/T12/T13/T14)', () => {
    const before = documentApi.getDocument().components.find((c) => c.id === 'ARD1');
    const command = {
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: {
        componentId: 'ARD1',
        beforeFirmware: before.firmware,
        afterFirmware: { source: 'void setup() { pinMode(2, OUTPUT); }\nvoid loop() {}' },
      },
    };
    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);

    const updated = documentApi.getDocument().components.find((c) => c.id === 'ARD1');
    expect(updated.firmware).toEqual({ source: 'void setup() { pinMode(2, OUTPUT); }\nvoid loop() {}' });
    expect(updated.position).toEqual({ x: 0, y: 0 });
    expect(updated.parameters).toEqual({});
    expect(updated.type).toBe('ARDUINO');
    expect(updated.id).toBe('ARD1');

    const resistor = documentApi.getDocument().components.find((c) => c.id === 'R1');
    expect(resistor).toEqual({ id: 'R1', type: 'resistor', position: { x: 100, y: 100 }, parameters: { resistance: 1000 } });
  });

  it('ne mute pas le document snapshot passé à execute()', () => {
    const snapshot = documentApi.getDocument();
    const originalFirmware = { ...snapshot.components.find((c) => c.id === 'ARD1').firmware };
    const command = {
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'ARD1', beforeFirmware: originalFirmware, afterFirmware: { source: 'changed' } },
    };
    handler.execute(command, snapshot);
    expect(snapshot.components.find((c) => c.id === 'ARD1').firmware).toEqual(originalFirmware);
  });

  it('T4 — cible inexistante -> reject, sans mutation', () => {
    const command = {
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'NONEXISTENT', beforeFirmware: { source: '' }, afterFirmware: { source: 'x' } },
    };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow();
  });

  it('T5 — cible non-ARDUINO (RESISTOR) -> reject, sans mutation', () => {
    const command = {
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'R1', beforeFirmware: { source: '' }, afterFirmware: { source: 'x' } },
    };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(/not an ARDUINO/);
    expect(documentApi.getDocument().components.find((c) => c.id === 'R1').parameters).toEqual({ resistance: 1000 });
  });

  it('T6 — firmware { source: 123 } (type invalide) -> reject', () => {
    const command = {
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'ARD1', beforeFirmware: { source: 'void setup() {}\nvoid loop() {}' }, afterFirmware: { source: 123 } },
    };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(/valid firmware structure/);
  });

  it('T7 — firmware null -> reject', () => {
    const command = {
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'ARD1', beforeFirmware: { source: 'void setup() {}\nvoid loop() {}' }, afterFirmware: null },
    };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow();
  });

  it('T8 — Undo restaure exactement beforeFirmware', () => {
    const before = documentApi.getDocument().components.find((c) => c.id === 'ARD1').firmware;
    const command = {
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'ARD1', beforeFirmware: before, afterFirmware: { source: 'AFTER' } },
    };
    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().components.find((c) => c.id === 'ARD1').firmware).toEqual({ source: 'AFTER' });

    historyService.undo();
    expect(documentApi.getDocument().components.find((c) => c.id === 'ARD1').firmware).toEqual(before);
  });

  it('T9 — Redo réapplique exactement afterFirmware', () => {
    const before = documentApi.getDocument().components.find((c) => c.id === 'ARD1').firmware;
    const command = {
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'ARD1', beforeFirmware: before, afterFirmware: { source: 'AFTER' } },
    };
    handler.execute(command, documentApi.getDocument());
    historyService.undo();
    historyService.redo();
    expect(documentApi.getDocument().components.find((c) => c.id === 'ARD1').firmware).toEqual({ source: 'AFTER' });
  });

  it('T10 — un nouveau dispatch après Undo invalide l\'ancien Redo', () => {
    const before = documentApi.getDocument().components.find((c) => c.id === 'ARD1').firmware;
    handler.execute({
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'ARD1', beforeFirmware: before, afterFirmware: { source: 'FIRST' } },
    }, documentApi.getDocument());
    historyService.undo();
    expect(historyService.canRedo()).toBe(true);

    handler.execute({
      type: 'UPDATE_ARDUINO_FIRMWARE',
      payload: { componentId: 'ARD1', beforeFirmware: before, afterFirmware: { source: 'SECOND' } },
    }, documentApi.getDocument());
    expect(historyService.canRedo()).toBe(false);
    expect(documentApi.getDocument().components.find((c) => c.id === 'ARD1').firmware).toEqual({ source: 'SECOND' });
  });

  it('T20 — Handler n\'importe aucun module Simulator/Arduino runtime', () => {
    // Commentaires exclus (l'en-tête du fichier nomme volontairement ces
    // identifiants pour documenter ce qu'il NE faut PAS importer) — seul le
    // CODE compte, même patron stripComments que les autres gardes
    // architecturales de ce dépôt (componentLibraryRolloutGate.test.js, etc.).
    const codeOnly = readFileSync(resolve(__dirname, '..', 'component', 'UpdateArduinoFirmwareHandler.js'), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeOnly).not.toMatch(/ArduinoSimulator/);
    expect(codeOnly).not.toMatch(/runtimeOrchestrator/);
    expect(codeOnly).not.toMatch(/simulationRuntimeIntegration/);
    expect(codeOnly).not.toMatch(/from\s+["'][^"']*\/simulator\//);
  });
});
