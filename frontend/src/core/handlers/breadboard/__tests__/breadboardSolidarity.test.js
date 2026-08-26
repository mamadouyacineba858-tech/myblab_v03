import { describe, it, expect } from 'vitest';
import { resolveSolidaryComponentIds } from '../breadboardSolidarity.js';

// MB-BREADBOARD-006 (CSA Ruling — Option B, §4) : RESISTOR (pins A dx=0/dy=14,
// B dx=84/dy=14 — componentDefinitions.js) est utilisé comme composant de
// référence : dx=84 est un multiple exact de BREADBOARD_PITCH (12), ce qui
// évite toute dépendance à la tolérance d'insertion de holeAt() (±2px) et
// rend les positions attendues déductibles sans ambiguïté. breadboard.position
// = {0,0} pour une arithmétique directe (column = x/12, row = y/12).
const breadboard = { id: 'BB1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' };

describe('resolveSolidaryComponentIds — MB-BREADBOARD-006 (CSA Ruling §4)', () => {
  it('retourne un Set vide si breadboard est null', () => {
    const components = [{ id: 'R1', type: 'RESISTOR', position: { x: 0, y: 22 } }];
    expect(resolveSolidaryComponentIds(null, components)).toEqual(new Set());
  });

  it('un composant dont les deux pins résolvent sur un trou (STRIP top) est solidaire', () => {
    // Voir dérivation en tête de fichier : position.y=22 place les deux pins
    // (dy=14 identique) sur la rangée 3 (STRIP top, colonnes 0 et 7).
    const components = [{ id: 'R1', type: 'RESISTOR', position: { x: 0, y: 22 } }];
    expect(resolveSolidaryComponentIds(breadboard, components)).toEqual(new Set(['R1']));
  });

  it('un composant hors empreinte (aucune pin sur un trou) n\'est pas solidaire', () => {
    const components = [{ id: 'R1', type: 'RESISTOR', position: { x: 1000, y: 1000 } }];
    expect(resolveSolidaryComponentIds(breadboard, components)).toEqual(new Set());
  });

  it('un composant dont une seule pin résout un trou reste solidaire (critère "au moins une pin", disclosed)', () => {
    // A (dx=0) : colonne (300+0)/12=25 (valide, dans [0,29]).
    // B (dx=84) : colonne (300+84)/12=32 (>=30, hors grille -> holeAt()
    // retourne null pour B uniquement). Un seul pin résout, le composant
    // reste solidaire (critère "au moins une pin", disclosed en tête de
    // breadboardSolidarity.js).
    const partial = [{ id: 'R3', type: 'RESISTOR', position: { x: 300, y: 22 } }];
    expect(resolveSolidaryComponentIds(breadboard, partial)).toEqual(new Set(['R3']));
  });

  it('plusieurs composants : seuls ceux réellement sur le breadboard sont retenus', () => {
    const components = [
      { id: 'R1', type: 'RESISTOR', position: { x: 0, y: 22 } }, // solidaire
      { id: 'R2', type: 'RESISTOR', position: { x: 24, y: 22 } }, // solidaire
      { id: 'R3', type: 'RESISTOR', position: { x: 1000, y: 1000 } }, // non solidaire
    ];
    expect(resolveSolidaryComponentIds(breadboard, components)).toEqual(new Set(['R1', 'R2']));
  });

  it('accepte la forme Presentation ({uid, x, y}) tout comme la forme Core ({id, position})', () => {
    const presentationForm = [{ uid: 'R1', type: 'RESISTOR', x: 0, y: 22 }];
    expect(resolveSolidaryComponentIds(breadboard, presentationForm)).toEqual(new Set(['R1']));
  });

  it('ignore un composant de type inconnu (getComponentDef renvoie undefined) sans lever d\'erreur', () => {
    const components = [{ id: 'X1', type: 'NOT_A_REAL_TYPE', position: { x: 0, y: 22 } }];
    expect(() => resolveSolidaryComponentIds(breadboard, components)).not.toThrow();
    expect(resolveSolidaryComponentIds(breadboard, components)).toEqual(new Set());
  });

  it('components null/undefined/vide -> Set vide, sans erreur', () => {
    expect(resolveSolidaryComponentIds(breadboard, null)).toEqual(new Set());
    expect(resolveSolidaryComponentIds(breadboard, undefined)).toEqual(new Set());
    expect(resolveSolidaryComponentIds(breadboard, [])).toEqual(new Set());
  });
});
