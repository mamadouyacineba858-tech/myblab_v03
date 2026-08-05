import { describe, it, expect } from 'vitest';
import { DiffEngine } from '../DiffEngine.js';

describe('DiffEngine', () => {
  // ============================================================
  // DIFF-001 : Documents vides
  // ============================================================

  it('DIFF-001: should return empty diff for two empty documents', () => {
    const doc1 = { components: [], wires: [] };
    const doc2 = { components: [], wires: [] };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.hasChanges).toBe(false);
    expect(result.componentsAdded).toEqual([]);
    expect(result.componentsRemoved).toEqual([]);
    expect(result.componentsModified).toEqual([]);
    expect(result.wiresAdded).toEqual([]);
    expect(result.wiresRemoved).toEqual([]);
    expect(result.wiresModified).toEqual([]);
    expect(result.statistics.components.added).toBe(0);
    expect(result.statistics.components.removed).toBe(0);
    expect(result.statistics.components.modified).toBe(0);
  });

  // ============================================================
  // DIFF-002 : Ajout composant
  // ============================================================

  it('DIFF-002: should detect added component', () => {
    const doc1 = { components: [], wires: [] };
    const doc2 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
      wires: [],
    };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.hasChanges).toBe(true);
    expect(result.componentsAdded).toHaveLength(1);
    expect(result.componentsAdded[0]).toEqual({ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } });
    expect(result.componentsRemoved).toEqual([]);
    expect(result.componentsModified).toEqual([]);
  });

  // ============================================================
  // DIFF-003 : Suppression composant
  // ============================================================

  it('DIFF-003: should detect removed component', () => {
    const doc1 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
      wires: [],
    };
    const doc2 = { components: [], wires: [] };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.hasChanges).toBe(true);
    expect(result.componentsRemoved).toHaveLength(1);
    expect(result.componentsRemoved[0]).toEqual({ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } });
  });

  // ============================================================
  // DIFF-004 : Modification composant
  // ============================================================

  it('DIFF-004: should detect modified component', () => {
    const doc1 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
      wires: [],
    };
    const doc2 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 30, y: 40 } }],
      wires: [],
    };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.hasChanges).toBe(true);
    expect(result.componentsModified).toHaveLength(1);
    expect(result.componentsModified[0].id).toBe('C1');
    expect(result.componentsModified[0].previous.position).toEqual({ x: 10, y: 20 });
    expect(result.componentsModified[0].current.position).toEqual({ x: 30, y: 40 });
    expect(result.componentsModified[0].changes['position.x']).toEqual({ from: 10, to: 30 });
    expect(result.componentsModified[0].changes['position.y']).toEqual({ from: 20, to: 40 });
  });

  // ============================================================
  // DIFF-005 : Ajout wire
  // ============================================================

  it('DIFF-005: should detect added wire', () => {
    const doc1 = { components: [], wires: [] };
    const doc2 = {
      components: [],
      wires: [{ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } }],
    };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.hasChanges).toBe(true);
    expect(result.wiresAdded).toHaveLength(1);
    expect(result.wiresAdded[0]).toEqual({ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } });
  });

  // ============================================================
  // DIFF-006 : Suppression wire
  // ============================================================

  it('DIFF-006: should detect removed wire', () => {
    const doc1 = {
      components: [],
      wires: [{ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } }],
    };
    const doc2 = { components: [], wires: [] };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.hasChanges).toBe(true);
    expect(result.wiresRemoved).toHaveLength(1);
    expect(result.wiresRemoved[0]).toEqual({ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } });
  });

  // ============================================================
  // DIFF-007 : Modification wire
  // ============================================================

  it('DIFF-007: should detect modified wire', () => {
    const doc1 = {
      components: [],
      wires: [{ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } }],
    };
    const doc2 = {
      components: [],
      wires: [{ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'C', pinId: 'p3' } }],
    };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.hasChanges).toBe(true);
    expect(result.wiresModified).toHaveLength(1);
    expect(result.wiresModified[0].id).toBe('W1');
    expect(result.wiresModified[0].changes['pinB.componentId']).toEqual({ from: 'B', to: 'C' });
    expect(result.wiresModified[0].changes['pinB.pinId']).toEqual({ from: 'p2', to: 'p3' });
  });

  // ============================================================
  // DIFF-008 : Aucun changement
  // ============================================================

  it('DIFF-008: should return no changes for identical documents', () => {
    const doc1 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 }, parameters: { value: 100 } }],
      wires: [{ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } }],
    };
    const doc2 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 }, parameters: { value: 100 } }],
      wires: [{ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } }],
    };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.hasChanges).toBe(false);
  });

  // ============================================================
  // DIFF-009 : Immutabilité
  // ============================================================

  it('DIFF-009: DiffResult should be deeply immutable', () => {
    const doc1 = { components: [], wires: [] };
    const doc2 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
      wires: [],
    };

    const result = DiffEngine.compare(doc1, doc2);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.componentsAdded)).toBe(true);

    if (result.componentsAdded.length > 0) {
      expect(Object.isFrozen(result.componentsAdded[0])).toBe(true);
      expect(Object.isFrozen(result.componentsAdded[0].position)).toBe(true);
    }
  });

  // ============================================================
  // DIFF-010 : Déterminisme
  // ============================================================

  it('DIFF-010: DiffEngine should be deterministic', () => {
    const doc1 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
      wires: [],
    };
    const doc2 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 30, y: 40 } }],
      wires: [],
    };

    const result1 = DiffEngine.compare(doc1, doc2);
    const result2 = DiffEngine.compare(doc1, doc2);

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  // ============================================================
  // DIFF-011 : Documents invalides
  // ============================================================

  it('DIFF-011: should throw for invalid documents', () => {
    const validDoc = { components: [], wires: [] };

    expect(() => DiffEngine.compare(null, validDoc)).toThrow(
      'Invalid previousDocument: document is null or undefined'
    );

    expect(() => DiffEngine.compare(validDoc, null)).toThrow(
      'Invalid currentDocument: document is null or undefined'
    );

    expect(() => DiffEngine.compare('not an object', validDoc)).toThrow(
      'Invalid previousDocument: document must be an object'
    );

    expect(() => DiffEngine.compare(validDoc, { components: 'not an array' })).toThrow(
      'Invalid currentDocument: "components" must be an array'
    );
  });

  // ============================================================
  // DIFF-012 : Préservation des objets d'entrée
  // ============================================================

  it('DIFF-012: should not mutate input documents', () => {
    const doc1 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
      wires: [],
    };
    const doc2 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 30, y: 40 } }],
      wires: [],
    };

    const frozenDoc1 = JSON.stringify(doc1);
    const frozenDoc2 = JSON.stringify(doc2);

    DiffEngine.compare(doc1, doc2);

    expect(JSON.stringify(doc1)).toBe(frozenDoc1);
    expect(JSON.stringify(doc2)).toBe(frozenDoc2);
  });

  // ============================================================
  // DIFF-013 : Contrat de comparaison (chemins ignorés)
  // ============================================================

  it('DIFF-013: should ignore specified paths via options', () => {
    const doc1 = {
      components: [
        {
          id: 'C1',
          type: 'typeA',
          position: { x: 10, y: 20 },
          metadata: { timestamp: 1000, author: 'test' },
        },
      ],
      wires: [],
    };
    const doc2 = {
      components: [
        {
          id: 'C1',
          type: 'typeA',
          position: { x: 10, y: 20 },
          metadata: { timestamp: 2000, author: 'test' },
        },
      ],
      wires: [],
    };

    // Sans ignorer metadata.timestamp, il y aurait une modification
    const result = DiffEngine.compare(doc1, doc2, {
      ignoredPaths: ['metadata.timestamp'],
    });

    // metadata.timestamp est ignoré, donc pas de modification
    expect(result.hasChanges).toBe(false);
    expect(result.componentsModified).toEqual([]);
  });

  // ============================================================
  // DIFF-014 : Validation des IDs
  // ============================================================

  it('DIFF-014: should throw for component without id', () => {
    const doc1 = { components: [{ type: 'typeA', position: { x: 10, y: 20 } }], wires: [] };
    const doc2 = { components: [], wires: [] };

    expect(() => DiffEngine.compare(doc1, doc2)).toThrow(
      'Invalid component: missing "id"'
    );
  });

  it('DIFF-014b: should throw for wire without id', () => {
    const doc1 = {
      components: [],
      wires: [{ pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } }],
    };
    const doc2 = { components: [], wires: [] };

    expect(() => DiffEngine.compare(doc1, doc2)).toThrow(
      'Invalid wire: missing "id" (ADR-008)'
    );
  });

  // ============================================================
  // DIFF-015 : Statistiques
  // ============================================================

  it('DIFF-015: should compute correct statistics', () => {
    const doc1 = {
      components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
      wires: [{ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } }],
    };
    const doc2 = {
      components: [
        { id: 'C1', type: 'typeA', position: { x: 30, y: 40 } },
        { id: 'C2', type: 'typeB', position: { x: 50, y: 60 } },
      ],
      wires: [],
    };

    const result = DiffEngine.compare(doc1, doc2);

    expect(result.statistics.components.added).toBe(1);
    expect(result.statistics.components.removed).toBe(0);
    expect(result.statistics.components.modified).toBe(1);
    expect(result.statistics.wires.removed).toBe(1);
    expect(result.statistics.total.added).toBe(1);
    expect(result.statistics.total.removed).toBe(1);
    expect(result.statistics.total.modified).toBe(1);
  });
});