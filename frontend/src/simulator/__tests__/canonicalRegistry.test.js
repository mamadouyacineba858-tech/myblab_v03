import { describe, it, expect } from 'vitest';
import {
  getCanonicalEntry,
  hasCanonicalType,
  getAllCanonicalTypes,
  getAllCanonicalEntries,
  validateCanonicalEntry,
  validateCanonicalEntrySet,
} from '../canonicalRegistry.js';
import * as CanonicalRegistry from '../canonicalRegistry.js';
import { COMPONENT_TYPES } from '../../config/componentDefinitions.js';

describe('canonicalRegistry — contract shape', () => {
  it('exposes all 37 declared types', () => {
    // A3-SW2 : 21 -> 22 (DIP_SWITCH ajouté). A6-OUT1 : 22 -> 23 (VIBRATION_MOTOR ajouté).
    // A6-OUT2 : 23 -> 24 (LIGHT_BULB ajouté). A6-OUT3 : 24 -> 25 (HOBBY_GEARMOTOR ajouté).
    // A7-C1 : 25 -> 26 (TMP36 ajouté). A7-C2 : 26 -> 28 (FORCE_SENSOR + FLEX_SENSOR ajoutés).
    // A7-C3 : 28 -> 29 (SOIL_MOISTURE_SENSOR ajouté). A7-C4-PIR : 29 -> 30
    // (PIR_MOTION_SENSOR ajouté). A7-C4-TILT : 30 -> 31 (TILT_SENSOR ajouté).
    // A7-C4-IR : 31 -> 32 (IR_RECEIVER ajouté). A7-C5 : 32 -> 33 (HC_SR04 ajouté).
    // A4-INDUCTOR : 33 -> 34 (INDUCTOR ajouté). A5-ZENER_DIODE : 34 -> 35
    // (ZENER_DIODE ajouté).
    expect(getAllCanonicalTypes()).toHaveLength(37);
    expect(getAllCanonicalTypes()).toContain('LED');
    expect(getAllCanonicalTypes()).toContain('POWER');
    expect(getAllCanonicalTypes()).toContain('RESISTOR');
    expect(getAllCanonicalTypes()).toContain('POLARIZED_CAPACITOR');
    expect(getAllCanonicalTypes()).toContain('INDUCTOR');
  });

  it('POWER entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('POWER');
    expect(entry.type).toBe('POWER');
    expect(entry.pins).toEqual(COMPONENT_TYPES.POWER.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      { key: 'voltage', parameterType: 'voltage', unit: 'V', minimum: 0.001, maximum: 1000, defaultValue: 5, description: 'Tension de sortie de la source en Volts' },
    ]);
    expect(entry.defaultParameters).toEqual({ voltage: 5 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('RESISTOR entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('RESISTOR');
    expect(entry.pins).toEqual(COMPONENT_TYPES.RESISTOR.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      { key: 'resistance', parameterType: 'resistance', unit: 'Ω', minimum: 0.001, maximum: 1e9, defaultValue: 220, description: 'Valeur de la résistance en Ohms' },
    ]);
    expect(entry.defaultParameters).toEqual({ resistance: 220 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('LDR entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('LDR');
    expect(entry.pins).toEqual(COMPONENT_TYPES.LDR.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      {
        key: 'resistance',
        parameterType: 'resistance',
        unit: 'Ω',
        minimum: 100,
        maximum: 10000000,
        defaultValue: 10000,
        description: expect.stringMatching(/fallback historique/i),
      },
    ]);
    // MB-L1-ENV-001 : le texte déclaratif reflète désormais le nouveau
    // modèle (résistance persistante = fallback historique sans LIGHT actif,
    // résistance EFFECTIVE calculée par le Registry environnemental sous
    // LIGHT) — seul ce texte a changé (§15 du ticket), jamais minimum/
    // maximum/defaultValue/pins/capabilities/modelAvailable, déjà vérifiés
    // ci-dessus et ci-dessous.
    expect(entry.parameterSchema[0].description).toMatch(/résistance fixe/i);
    expect(entry.parameterSchema[0].description).toMatch(/LIGHT/);
    expect(entry.defaultParameters).toEqual({ resistance: 10000 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('THERMISTOR entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('THERMISTOR');
    expect(entry.pins).toEqual(COMPONENT_TYPES.THERMISTOR.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      {
        key: 'resistance',
        parameterType: 'resistance',
        unit: 'Ω',
        minimum: 100,
        maximum: 1000000,
        defaultValue: 10000,
        description: expect.stringMatching(/mode simplifié/i),
      },
    ]);
    expect(entry.parameterSchema[0].description).toMatch(/résistance fixe|constante/i);
    expect(entry.parameterSchema[0].description).toMatch(/NTC/);
    expect(entry.parameterSchema[0].description).toMatch(/température/i);
    expect(entry.defaultParameters).toEqual({ resistance: 10000 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('MB-SIM-008 v2 : DIODE entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('DIODE');
    expect(entry.pins).toEqual(COMPONENT_TYPES.DIODE.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      { key: 'forwardVoltage', parameterType: 'voltage', unit: 'V', minimum: 0, maximum: 5, defaultValue: 0.7, description: expect.stringMatching(/simplifié/i) },
      { key: 'onResistance', parameterType: 'resistance', unit: 'Ω', minimum: 0.001, maximum: 1e9, defaultValue: 10, description: expect.stringMatching(/simplifié/i) },
    ]);
    expect(entry.defaultParameters).toEqual({ forwardVoltage: 0.7, onResistance: 10 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('MB-SIM-008 v2 : DC_MOTOR entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('DC_MOTOR');
    expect(entry.pins).toEqual(COMPONENT_TYPES.DC_MOTOR.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      { key: 'resistance', parameterType: 'resistance', unit: 'Ω', minimum: 0.001, maximum: 1e6, defaultValue: 20, description: expect.stringMatching(/simplifié/i) },
    ]);
    expect(entry.parameterSchema[0].description).toMatch(/vitesse|couple|inertie/i);
    expect(entry.defaultParameters).toEqual({ resistance: 20 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('MB-SIM-008 v2 / MB-L1-PROP-005 : CAPACITOR entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('CAPACITOR');
    expect(entry.pins).toEqual(COMPONENT_TYPES.CAPACITOR.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      { key: 'capacitance', parameterType: 'capacitance', unit: 'F', minimum: 1e-12, maximum: 1, defaultValue: 1e-7, description: expect.stringMatching(/DC établi/i) },
    ]);
    expect(entry.parameterSchema[0].description).toMatch(/circuit ouvert/i);
    expect(entry.defaultParameters).toEqual({ capacitance: 1e-7 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('FT-C-COMP-002 : POLARIZED_CAPACITOR entry exposes the complete declarative contract (pins plus/minus, capacitance 0.0001 F, modèle DC disponible)', () => {
    const entry = getCanonicalEntry('POLARIZED_CAPACITOR');
    expect(entry.type).toBe('POLARIZED_CAPACITOR');
    expect(entry.pins).toEqual(COMPONENT_TYPES.POLARIZED_CAPACITOR.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.pins.map((p) => p.id)).toEqual(['plus', 'minus']);
    expect(entry.parameterSchema).toEqual([
      { key: 'capacitance', parameterType: 'capacitance', unit: 'F', minimum: 1e-12, maximum: 1, defaultValue: 0.0001, description: expect.stringMatching(/DC établi/i) },
    ]);
    expect(entry.parameterSchema[0].description).toMatch(/circuit ouvert/i);
    expect(entry.defaultParameters).toEqual({ capacitance: 0.0001 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('FT-C-COMP-002 / MB-L1-PROP-005 : CAPACITOR (céramique 104, non polarisé) reste distinct de POLARIZED_CAPACITOR — pinA/pinB, aucune polarité', () => {
    const entry = getCanonicalEntry('CAPACITOR');
    expect(entry.pins.map((p) => p.id)).toEqual(['pinA', 'pinB']);
    expect(entry.pins.some((p) => p.id === 'plus' || p.id === 'minus')).toBe(false);
    expect(entry.defaultParameters).toEqual({ capacitance: 1e-7 });
  });

  it('MB-SIM-008 v2 : POTENTIOMETER entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('POTENTIOMETER');
    expect(entry.pins).toEqual(COMPONENT_TYPES.POTENTIOMETER.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      { key: 'resistance', parameterType: 'resistance', unit: 'Ω', minimum: 1, maximum: 1e7, defaultValue: 10000, description: expect.stringMatching(/simplifié/i) },
      { key: 'position', parameterType: 'ratio', unit: '', minimum: 0, maximum: 1, defaultValue: 0.5, description: expect.stringMatching(/curseur/i) },
    ]);
    expect(entry.defaultParameters).toEqual({ resistance: 10000, position: 0.5 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('MB-SIM-008 v2 : NPN_TRANSISTOR entry exposes the complete declarative contract', () => {
    const entry = getCanonicalEntry('NPN_TRANSISTOR');
    expect(entry.pins).toEqual(COMPONENT_TYPES.NPN_TRANSISTOR.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.parameterSchema).toEqual([
      { key: 'onResistance', parameterType: 'resistance', unit: 'Ω', minimum: 0.001, maximum: 1e6, defaultValue: 1, description: expect.stringMatching(/simplifié/i) },
    ]);
    expect(entry.parameterSchema[0].description).toMatch(/β réel/);
    expect(entry.defaultParameters).toEqual({ onResistance: 1 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });

  it('MB-SIM-008 v2 : SERVO reste un type déclaré sans modèle disponible (exclusion explicite, dépendance PWM/MB-SIM-009)', () => {
    const entry = getCanonicalEntry('SERVO');
    expect(entry).not.toBeNull();
    expect(entry.modelAvailable).toBe(false);
    expect(entry.parameterSchema).toBeNull();
    expect(entry.defaultParameters).toBeNull();
    expect(entry.capabilities).toBeNull();
  });

  it('LED is a known declared type with no model — no model-specific contract', () => {
    const entry = getCanonicalEntry('LED');
    expect(entry).not.toBeNull();
    expect(entry.type).toBe('LED');
    expect(entry.pins).toEqual(COMPONENT_TYPES.LED.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.modelAvailable).toBe(false);
    expect(entry.parameterSchema).toBeNull();
    expect(entry.defaultParameters).toBeNull();
    expect(entry.capabilities).toBeNull();
  });

  it('an undeclared type still returns null', () => {
    expect(getCanonicalEntry('NOT_A_REAL_TYPE')).toBeNull();
    expect(hasCanonicalType('NOT_A_REAL_TYPE')).toBe(false);
  });

  it('every declared pin (20 types) matches componentDefinitions.js exactly', () => {
    for (const type of Object.keys(COMPONENT_TYPES)) {
      const entry = getCanonicalEntry(type);
      expect(entry, `entry missing for ${type}`).not.toBeNull();
      expect(entry.pins).toEqual(COMPONENT_TYPES[type].pins.map(({ id, role }) => ({ id, role })));
    }
  });

  it('getAllCanonicalEntries returns all 37 entries', () => {
    expect(getAllCanonicalEntries()).toHaveLength(37);
  });

  it('A6-OUT3 : HOBBY_GEARMOTOR entry exposes the complete declarative contract (reuses DC_MOTOR family)', () => {
    const entry = getCanonicalEntry('HOBBY_GEARMOTOR');
    expect(entry.type).toBe('HOBBY_GEARMOTOR');
    expect(entry.pins).toEqual(COMPONENT_TYPES.HOBBY_GEARMOTOR.pins.map(({ id, role }) => ({ id, role })));
    expect(entry.pins.map((p) => p.id)).toEqual(['plus', 'minus']);
    expect(entry.parameterSchema).toEqual([
      { key: 'resistance', parameterType: 'resistance', unit: 'Ω', minimum: 0.001, maximum: 1e6, defaultValue: 20, description: expect.stringMatching(/simplifié/i) },
    ]);
    expect(entry.defaultParameters).toEqual({ resistance: 20 });
    expect(entry.capabilities).toEqual(['digital', 'dc']);
    expect(entry.modelAvailable).toBe(true);
  });
});

describe('canonicalRegistry — case sensitivity (Q2 casing left open)', () => {
  it('does not normalize casing on lookup', () => {
    expect(hasCanonicalType('POWER')).toBe(true);
    expect(hasCanonicalType('power')).toBe(false);
    expect(getCanonicalEntry('power')).toBeNull();
  });
});

describe('canonicalRegistry — immutability', () => {
  it('throws when mutating a top-level field of a returned entry', () => {
    const entry = getCanonicalEntry('POWER');
    expect(() => { entry.type = 'HACKED'; }).toThrow(TypeError);
  });

  it('throws when attempting to push into a returned pins array', () => {
    const entry = getCanonicalEntry('LED');
    expect(() => { entry.pins.push({ id: 'X', role: 'input' }); }).toThrow(TypeError);
  });

  it('throws when mutating a pin object inside a returned entry', () => {
    const entry = getCanonicalEntry('RESISTOR');
    expect(() => { entry.pins[0].role = 'output'; }).toThrow(TypeError);
  });

  it('throws when mutating defaultParameters or capabilities', () => {
    const entry = getCanonicalEntry('POWER');
    expect(() => { entry.defaultParameters.voltage = 12; }).toThrow(TypeError);
    expect(() => { entry.capabilities.push('analog'); }).toThrow(TypeError);
  });
});

describe('canonicalRegistry — A/B separation', () => {
  it('does not export a validate(type, params) style function', () => {
    expect(Object.keys(CanonicalRegistry)).not.toContain('validate');
  });
});

describe('validateCanonicalEntry — per-invariant checks', () => {
  const baseEntry = () => ({
    type: 'TEST',
    pins: [{ id: 'A', role: 'passive' }],
    parameterSchema: [{ key: 'x', minimum: 0, maximum: 10, defaultValue: 5 }],
    defaultParameters: { x: 5 },
    capabilities: ['dc'],
    modelAvailable: true,
  });

  it('accepts a well-formed entry with parameterSchema', () => {
    expect(validateCanonicalEntry(baseEntry())).toEqual({ valid: true, errors: [] });
  });

  it('accepts an entry with model-specific metadata set to null (no model)', () => {
    const entry = { type: 'TEST', pins: [{ id: 'A', role: 'passive' }], parameterSchema: null, defaultParameters: null, capabilities: null, modelAvailable: false };
    expect(validateCanonicalEntry(entry)).toEqual({ valid: true, errors: [] });
  });

  it('rejects an empty pin id', () => {
    const entry = baseEntry();
    entry.pins = [{ id: '', role: 'passive' }];
    const result = validateCanonicalEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('pins[0].id must be a non-empty string');
  });

  it('rejects duplicate pin ids', () => {
    const entry = baseEntry();
    entry.pins = [{ id: 'A', role: 'passive' }, { id: 'A', role: 'passive' }];
    const result = validateCanonicalEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('duplicate pin id "A"');
  });

  it('rejects minimum > maximum', () => {
    const entry = baseEntry();
    entry.parameterSchema = [{ key: 'x', minimum: 10, maximum: 0 }];
    const result = validateCanonicalEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('parameterSchema[0] minimum (10) must be <= maximum (0)');
  });

  it('does NOT reject a parameter with no defaultValue when required is not declared', () => {
    const entry = baseEntry();
    entry.parameterSchema = [{ key: 'x', minimum: 0, maximum: 10 }];
    expect(validateCanonicalEntry(entry)).toEqual({ valid: true, errors: [] });
  });

  it('rejects a missing defaultValue only when required: true is explicit', () => {
    const entry = baseEntry();
    entry.parameterSchema = [{ key: 'x', minimum: 0, maximum: 10, required: true }];
    const result = validateCanonicalEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('parameterSchema[0] is declared required but has no defaultValue');
  });

  it('rejects an out-of-bounds defaultValue whenever defaultValue is present', () => {
    const entry = baseEntry();
    entry.parameterSchema = [{ key: 'x', minimum: 0, maximum: 10, defaultValue: 999 }];
    const result = validateCanonicalEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('parameterSchema[0] defaultValue (999) is above maximum (10)');
  });
});

describe('validateCanonicalEntrySet', () => {
  it('rejects duplicate types across the set', () => {
    const entry = { type: 'DUP', pins: [{ id: 'A', role: 'passive' }], parameterSchema: null, defaultParameters: null, capabilities: null, modelAvailable: false };
    expect(validateCanonicalEntrySet([entry, { ...entry }]).errors.some((e) => e.includes('duplicate type'))).toBe(true);
  });

  it('accepts the real canonical entry set (non-regression / self-consistency)', () => {
    expect(validateCanonicalEntrySet(getAllCanonicalEntries())).toEqual({ valid: true, errors: [] });
  });
});
