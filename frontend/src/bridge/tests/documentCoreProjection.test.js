import { describe, it, expect } from 'vitest';
import { ReactDocumentMapper } from '../ReactDocumentMapper.js';

/**
 * MB-CF1-001 v3.1/final — Tests de la capacité de projection Core → React
 * (Ticket §5.1.C, §7.3, §11 « Tests du Mapper (Core → React) »).
 *
 * Ces tests établissent et testent explicitement, comme capacité de
 * frontière à part entière, la direction Core → React de
 * ReactDocumentMapper.toReact() — déjà implémentée et déjà couverte
 * indirectement par bridge/tests/ReactDocumentMapper.test.js (T2, T6, T11),
 * mais formalisée ici comme exigence de premier rang du Ticket, conformément
 * au principe de conservation de GATE 2 : AUCUNE modification n'a été
 * apportée à ReactDocumentMapper.js pour produire ces tests.
 *
 * Catégories couvertes (Ticket §11) :
 * - conversion correcte
 * - conservation des identifiants
 * - conservation des composants
 * - conservation des wires
 * - absence de mutation involontaire
 * - déterminisme
 * - projection dérivée (pas d'état persistant)
 *
 * IMPORTANT (CF1-003-E / GATE 3) : ces tests prouvent que la capacité de
 * projection Core → React FONCTIONNE. Ils ne l'activent PAS comme source
 * opérationnelle unique — aucun appelant de production n'est introduit ici.
 */
describe('MB-CF1-001 — capacité de projection Core → React (toReact)', () => {
  it('conversion correcte : un Document Core complet produit un document React structurellement correct', () => {
    const coreDoc = {
      components: [
        { id: 'c1', type: 'LED', position: { x: 5, y: 7 }, parameters: { color: 'red' } },
      ],
      wires: [
        { pinA: { componentId: 'c1', pinId: 'anode' }, pinB: { componentId: 'c2', pinId: 'out' } },
      ],
    };

    const reactDoc = ReactDocumentMapper.toReact(coreDoc);

    expect(reactDoc.components).toHaveLength(1);
    expect(reactDoc.wires).toHaveLength(1);
    expect(reactDoc.components[0]).toMatchObject({ uid: 'c1', type: 'LED', x: 5, y: 7 });
    expect(reactDoc.wires[0]).toMatchObject({ fromUid: 'c1', fromPin: 'anode', toUid: 'c2', toPin: 'out' });
  });

  it('conservation des identifiants : id (composant) et componentId (wire) sont préservés sans altération', () => {
    const coreDoc = {
      components: [
        { id: 'unique-id-42', type: 'RESISTOR', position: { x: 0, y: 0 } },
      ],
      wires: [
        { pinA: { componentId: 'unique-id-42', pinId: 'p1' }, pinB: { componentId: 'other-id', pinId: 'p2' } },
      ],
    };

    const reactDoc = ReactDocumentMapper.toReact(coreDoc);

    expect(reactDoc.components[0].uid).toBe('unique-id-42');
    expect(reactDoc.wires[0].fromUid).toBe('unique-id-42');
    expect(reactDoc.wires[0].toUid).toBe('other-id');
  });

  it('conservation des composants : le nombre et les propriétés additionnelles de chaque composant sont préservés', () => {
    const coreDoc = {
      components: [
        { id: 'a', type: 'T1', position: { x: 1, y: 2 }, state: 'on', custom: { nested: true } },
        { id: 'b', type: 'T2', position: { x: 3, y: 4 } },
      ],
      wires: [],
    };

    const reactDoc = ReactDocumentMapper.toReact(coreDoc);

    expect(reactDoc.components).toHaveLength(2);
    expect(reactDoc.components[0].state).toBe('on');
    expect(reactDoc.components[0].custom).toEqual({ nested: true });
  });

  it('conservation des wires : le nombre et les propriétés additionnelles de chaque wire sont préservés', () => {
    const coreDoc = {
      components: [],
      wires: [
        { pinA: { componentId: 'x' }, pinB: { componentId: 'y' }, metadata: { color: 'blue' } },
        { pinA: { componentId: 'y' }, pinB: { componentId: 'z' } },
      ],
    };

    const reactDoc = ReactDocumentMapper.toReact(coreDoc);

    expect(reactDoc.wires).toHaveLength(2);
    expect(reactDoc.wires[0].metadata).toEqual({ color: 'blue' });
  });

  it('absence de mutation involontaire : le document Core source n\'est jamais modifié par toReact()', () => {
    const coreDoc = {
      components: [{ id: 'c1', type: 'LED', position: { x: 5, y: 7 }, parameters: { color: 'red' } }],
      wires: [{ pinA: { componentId: 'c1' }, pinB: { componentId: 'c2' } }],
    };
    const frozenSnapshot = JSON.stringify(coreDoc);

    ReactDocumentMapper.toReact(coreDoc);

    expect(JSON.stringify(coreDoc)).toBe(frozenSnapshot);
  });

  it('déterminisme : deux appels successifs avec le même document Core produisent un résultat structurellement identique', () => {
    const coreDoc = {
      components: [{ id: 'c1', type: 'LED', position: { x: 5, y: 7 } }],
      wires: [{ pinA: { componentId: 'c1' }, pinB: { componentId: 'c2' } }],
    };

    const first = ReactDocumentMapper.toReact(coreDoc);
    const second = ReactDocumentMapper.toReact(coreDoc);

    expect(first).toEqual(second);
  });

  it('projection dérivée : deux appels successifs ne partagent aucune référence (pas d\'état persistant, pas de cache)', () => {
    const coreDoc = {
      components: [{ id: 'c1', type: 'LED', position: { x: 5, y: 7 }, parameters: { a: 1 } }],
      wires: [],
    };

    const first = ReactDocumentMapper.toReact(coreDoc);
    const second = ReactDocumentMapper.toReact(coreDoc);

    expect(first).not.toBe(second);
    expect(first.components[0]).not.toBe(second.components[0]);
    expect(first.components[0].parameters).not.toBe(second.components[0].parameters);
  });

  it('ReactDocumentMapper est un pur adaptateur sans état : deux instances de document Core traitées indépendamment ne s\'influencent pas', () => {
    const coreDocA = { components: [{ id: 'a', type: 'T', position: { x: 0, y: 0 } }], wires: [] };
    const coreDocB = { components: [{ id: 'b', type: 'T', position: { x: 9, y: 9 } }], wires: [] };

    const reactA = ReactDocumentMapper.toReact(coreDocA);
    const reactB = ReactDocumentMapper.toReact(coreDocB);

    expect(reactA.components[0].uid).toBe('a');
    expect(reactB.components[0].uid).toBe('b');
    // Un appel intermédiaire ne doit pas avoir laissé de trace récupérable via un nouvel appel.
    const reactAAgain = ReactDocumentMapper.toReact(coreDocA);
    expect(reactAAgain.components[0].uid).toBe('a');
    expect(reactAAgain).not.toBe(reactA);
  });
});
