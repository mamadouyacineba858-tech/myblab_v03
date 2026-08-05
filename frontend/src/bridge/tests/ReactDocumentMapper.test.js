import { describe, it, expect } from 'vitest';
import { ReactDocumentMapper } from '../ReactDocumentMapper.js';

function normalizeRoundTrip(doc) {
  return JSON.parse(JSON.stringify(doc));
}

describe('ReactDocumentMapper', () => {
  // ============================================================
  // Tests de base
  // ============================================================

  it('T1: should convert empty React document to empty Core document', () => {
    const reactDoc = { components: [], wires: [] };
    const coreDoc = ReactDocumentMapper.toCore(reactDoc);
    expect(coreDoc).toEqual({ components: [], wires: [] });
    expect(coreDoc).not.toBe(reactDoc);
  });

  it('T2: should convert empty Core document to empty React document', () => {
    const coreDoc = { components: [], wires: [] };
    const reactDoc = ReactDocumentMapper.toReact(coreDoc);
    expect(reactDoc).toEqual({ components: [], wires: [] });
    expect(reactDoc).not.toBe(coreDoc);
  });

  // ============================================================
  // Tests de conversion standard
  // ============================================================

  it('T3: should convert a generic React component to Core format', () => {
    const reactDoc = {
      components: [
        {
          uid: 'comp_123',
          type: 'any_type',
          x: 10,
          y: 20,
          parameters: { customProp: 'value' },
          state: 'active',
          extraField: 'should be preserved',
        },
      ],
      wires: [],
    };

    const coreDoc = ReactDocumentMapper.toCore(reactDoc);

    expect(coreDoc.components).toHaveLength(1);
    expect(coreDoc.components[0]).toEqual({
      id: 'comp_123',
      type: 'any_type',
      position: { x: 10, y: 20 },
      parameters: { customProp: 'value' },
      state: 'active',
      extraField: 'should be preserved',
    });
  });

  it('T4: should convert a generic React wire to Core format', () => {
    const reactDoc = {
      components: [],
      wires: [
        {
          fromUid: 'comp_A',
          toUid: 'comp_B',
          fromPinId: 'output',
          toPinId: 'input',
          extraWireProp: 'preserved',
        },
      ],
    };

    const coreDoc = ReactDocumentMapper.toCore(reactDoc);

    expect(coreDoc.wires).toHaveLength(1);
    expect(coreDoc.wires[0]).toEqual({
      pinA: { componentId: 'comp_A', pinId: 'output' },
      pinB: { componentId: 'comp_B', pinId: 'input' },
      extraWireProp: 'preserved',
    });
  });

  // ============================================================
  // Tests de document complet
  // ============================================================

  it('T5: should convert a complete generic document', () => {
    const reactDoc = {
      components: [
        { uid: 'A', type: 'type1', x: 10, y: 20, propA: 'valueA' },
        { uid: 'B', type: 'type2', x: 30, y: 40, propB: 42 },
      ],
      wires: [
        { fromUid: 'A', toUid: 'B', fromPinId: 'out', toPinId: 'in' },
      ],
      metadata: { version: '1.0', author: 'test' },
    };

    const coreDoc = ReactDocumentMapper.toCore(reactDoc);

    expect(coreDoc.components).toHaveLength(2);
    expect(coreDoc.wires).toHaveLength(1);
    expect(coreDoc.metadata).toEqual({ version: '1.0', author: 'test' });
    expect(coreDoc.components[0].propA).toBe('valueA');
    expect(coreDoc.components[1].propB).toBe(42);
  });

  // ============================================================
  // Test du round-trip
  // ============================================================

  it('T6: round-trip should preserve full data equivalence', () => {
    const originalReact = {
      components: [
        {
          uid: 'C1',
          type: 'generic',
          x: 10,
          y: 20,
          parameters: { a: 1, b: 2 },
          customProp: 'value',
          nested: { deep: 'data' },
        },
      ],
      wires: [
        {
          fromUid: 'C1',
          toUid: 'C2',
          fromPinId: 'a',
          toPinId: 'b',
          metadata: { type: 'wire' },
        },
      ],
    };

    const coreDoc = ReactDocumentMapper.toCore(originalReact);
    const roundTripReact = ReactDocumentMapper.toReact(coreDoc);

    const normalizedOriginal = normalizeRoundTrip(originalReact);
    const normalizedRoundTrip = normalizeRoundTrip(roundTripReact);

    expect(normalizedRoundTrip).toEqual(normalizedOriginal);

    // Vérification des références
    expect(roundTripReact).not.toBe(originalReact);
    expect(roundTripReact.components[0]).not.toBe(originalReact.components[0]);
    expect(roundTripReact.components[0].parameters).not.toBe(originalReact.components[0].parameters);
    expect(roundTripReact.components[0].nested).not.toBe(originalReact.components[0].nested);
  });

  // ============================================================
  // Test : pas de mutation
  // ============================================================

  it('T7: should not mutate the source object', () => {
    const reactDoc = {
      components: [{ uid: 'R1', type: 'generic', x: 10, y: 20 }],
      wires: [],
    };

    const frozenCopy = JSON.stringify(reactDoc);
    ReactDocumentMapper.toCore(reactDoc);
    expect(JSON.stringify(reactDoc)).toBe(frozenCopy);
  });

  // ============================================================
  // Tests de validation des documents
  // ============================================================

  it('T8: should throw for invalid React document structure', () => {
    expect(() => ReactDocumentMapper.toCore(null)).toThrow(
      'Invalid ReactDocument: document is null or undefined'
    );

    expect(() => ReactDocumentMapper.toCore('not an object')).toThrow(
      'Invalid ReactDocument: document must be an object'
    );

    expect(() => ReactDocumentMapper.toCore({ components: 'not an array' })).toThrow(
      'Invalid ReactDocument: "components" must be an array'
    );
  });

  // ============================================================
  // Tests de validation des champs obligatoires
  // ============================================================

  it('T9: should throw when React component is missing required fields', () => {
    // Cas : uid manquant
    const docMissingUid = {
      components: [{ type: 'generic', x: 10, y: 20 }],
      wires: [],
    };

    expect(() => ReactDocumentMapper.toCore(docMissingUid)).toThrow(
      'Missing required field: "uid" for mapping to "id"'
    );

    // Cas : type manquant
    const docMissingType = {
      components: [{ uid: 'C1', x: 10, y: 20 }],
      wires: [],
    };

    expect(() => ReactDocumentMapper.toCore(docMissingType)).toThrow(
      'Missing required field: "type" for mapping to "type"'
    );

    // Cas : x manquant
    const docMissingX = {
      components: [{ uid: 'C1', type: 'generic', y: 20 }],
      wires: [],
    };

    expect(() => ReactDocumentMapper.toCore(docMissingX)).toThrow(
      'Missing required field: "x" for mapping to "position.x"'
    );
  });

  // ============================================================
  // Tests de validation des wires
  // ============================================================

  it('T10: should throw when React wire is missing required fields', () => {
    const docMissingFromUid = {
      components: [],
      wires: [{ toUid: 'B' }],
    };

    expect(() => ReactDocumentMapper.toCore(docMissingFromUid)).toThrow(
      'Missing required field: "fromUid" for mapping to "pinA.componentId"'
    );

    const docMissingToUid = {
      components: [],
      wires: [{ fromUid: 'A' }],
    };

    expect(() => ReactDocumentMapper.toCore(docMissingToUid)).toThrow(
      'Missing required field: "toUid" for mapping to "pinB.componentId"'
    );
  });

  // ============================================================
  // Test : préservation des propriétés supplémentaires
  // ============================================================

  it('T11: should preserve additional properties in Core→React conversion', () => {
    const coreDoc = {
      components: [
        {
          id: 'C1',
          type: 'generic',
          position: { x: 10, y: 20 },
          layer: 'top',
          rotation: 45,
          metadata: { locked: true },
        },
      ],
      wires: [],
    };

    const reactDoc = ReactDocumentMapper.toReact(coreDoc);
    const result = reactDoc.components[0];

    expect(result.uid).toBe('C1');
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
    expect(result.layer).toBe('top');
    expect(result.rotation).toBe(45);
    expect(result.metadata).toEqual({ locked: true });
  });

  // ============================================================
  // Test : copie profonde des objets imbriqués
  // ============================================================

  it('T12: should deeply clone nested objects', () => {
    const reactDoc = {
      components: [
        {
          uid: 'C1',
          type: 'generic',
          x: 10,
          y: 20,
          nested: {
            level1: {
              level2: { value: 'deep' },
            },
          },
        },
      ],
      wires: [],
    };

    const coreDoc = ReactDocumentMapper.toCore(reactDoc);
    const result = coreDoc.components[0];

    expect(result.nested).not.toBe(reactDoc.components[0].nested);
    expect(result.nested.level1).not.toBe(reactDoc.components[0].nested.level1);
    expect(result.nested.level1.level2).not.toBe(reactDoc.components[0].nested.level1.level2);
    expect(result.nested.level1.level2.value).toBe('deep');
  });

  // ============================================================
  // Tests : documents sans champs (acceptés)
  // ============================================================

  it('T13: should accept document without components (treat as empty)', () => {
    const reactDoc = { wires: [] };
    const coreDoc = ReactDocumentMapper.toCore(reactDoc);
    expect(coreDoc.components).toEqual([]);
    expect(coreDoc.wires).toEqual([]);
  });

  it('T14: should accept document without wires (treat as empty)', () => {
    const reactDoc = { components: [] };
    const coreDoc = ReactDocumentMapper.toCore(reactDoc);
    expect(coreDoc.components).toEqual([]);
    expect(coreDoc.wires).toEqual([]);
  });

  // ============================================================
  // Test : wire avec uid conservé (propriété générique)
  // ============================================================

  it('T15: should preserve wire uid as generic property', () => {
    const reactDoc = {
      components: [],
      wires: [
        {
          uid: 'W1',
          fromUid: 'A',
          toUid: 'B',
          fromPinId: 'p1',
          toPinId: 'p2',
        },
      ],
    };

    const coreDoc = ReactDocumentMapper.toCore(reactDoc);
    const result = coreDoc.wires[0];

    // uid est copié comme propriété générique (non structurelle)
    expect(result.uid).toBe('W1');
    // Les champs structurels sont transformés
    expect(result.pinA.componentId).toBe('A');
    expect(result.pinB.componentId).toBe('B');
    expect(result.pinA.pinId).toBe('p1');
    expect(result.pinB.pinId).toBe('p2');
  });
});