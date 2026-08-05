import { createDiffResult } from './DiffResult.js';

/**
 * DiffEngine
 *
 * Moteur de comparaison générique pour les documents Core.
 *
 * PRINCIPES :
 * - Aucune mutation : ne modifie jamais les documents d'entrée.
 * - Déterministe : même entrée → même sortie.
 * - Sans état : aucune variable interne persistante.
 * - Sans dépendances : aucun import React, CommandBus, etc.
 * - Sans logique métier : ne connaît aucun type de composant.
 * - Sans génération de données : ne crée pas d'identifiants.
 *
 * CONTRAT DE COMPARAISON DÉCLARATIF :
 * - Les chemins ignorés sont passés via options.ignoredPaths.
 * - Aucun chemin ignoré par défaut (le moteur est purement générique).
 *
 * API : compare(previousDocument, currentDocument, options) → DiffResult
 *
 * RÉFÉRENCES : MB-BRIDGE-002 V3
 */
export class DiffEngine {
  /**
   * Options par défaut.
   * Aucun chemin ignoré par défaut — le moteur est totalement générique.
   */
  static DEFAULT_OPTIONS = {
    ignoredPaths: [],
  };

  /**
   * Compare deux documents Core et retourne un DiffResult.
   * @param {Object} previousDocument - Document précédent (Core)
   * @param {Object} currentDocument - Document courant (Core)
   * @param {Object} options - Options de comparaison
   * @param {Array} options.ignoredPaths - Chemins à ignorer
   * @returns {Object} DiffResult immutable
   * @throws {Error} Si les documents sont invalides ou mal formés
   */
  static compare(previousDocument, currentDocument, options = {}) {
    // Validation des entrées
    DiffEngine._validateDocument(previousDocument, 'previousDocument');
    DiffEngine._validateDocument(currentDocument, 'currentDocument');

    const mergedOptions = {
      ...DiffEngine.DEFAULT_OPTIONS,
      ...options,
    };

    const ignoredPaths = mergedOptions.ignoredPaths || [];

    // 1. Comparer les composants
    const componentsDiff = DiffEngine._compareComponents(
      previousDocument.components || [],
      currentDocument.components || [],
      ignoredPaths
    );

    // 2. Comparer les wires
    const wiresDiff = DiffEngine._compareWires(
      previousDocument.wires || [],
      currentDocument.wires || [],
      ignoredPaths
    );

    // 3. Calculer les statistiques
    const hasChanges = componentsDiff.hasChanges || wiresDiff.hasChanges;
    const statistics = DiffEngine._computeStatistics(componentsDiff, wiresDiff);

    // 4. Créer le DiffResult (DTO pur)
    return createDiffResult({
      componentsAdded: componentsDiff.added,
      componentsRemoved: componentsDiff.removed,
      componentsModified: componentsDiff.modified,
      wiresAdded: wiresDiff.added,
      wiresRemoved: wiresDiff.removed,
      wiresModified: wiresDiff.modified,
      statistics,
      hasChanges,
    });
  }

  // ============================================================
  // Comparaison des composants
  // ============================================================

  static _compareComponents(previousComponents, currentComponents, ignoredPaths) {
    // Validation des IDs
    for (const comp of previousComponents) {
      DiffEngine._validateComponent(comp);
    }
    for (const comp of currentComponents) {
      DiffEngine._validateComponent(comp);
    }

    const previousMap = new Map();
    for (const comp of previousComponents) {
      previousMap.set(comp.id, comp);
    }

    const currentMap = new Map();
    for (const comp of currentComponents) {
      currentMap.set(comp.id, comp);
    }

    const added = [];
    const removed = [];
    const modified = [];
    let hasChanges = false;

    // Composants ajoutés
    for (const [id, comp] of currentMap) {
      if (!previousMap.has(id)) {
        added.push(comp);
        hasChanges = true;
      }
    }

    // Composants supprimés
    for (const [id, comp] of previousMap) {
      if (!currentMap.has(id)) {
        removed.push(comp);
        hasChanges = true;
      }
    }

    // Composants modifiés
    for (const [id, previousComp] of previousMap) {
      const currentComp = currentMap.get(id);
      if (currentComp) {
        const diff = DiffEngine._deepCompareObjects(
          previousComp,
          currentComp,
          ignoredPaths
        );
        if (diff.hasChanges) {
          modified.push({
            id,
            previous: previousComp,
            current: currentComp,
            changes: diff.changes,
          });
          hasChanges = true;
        }
      }
    }

    return { added, removed, modified, hasChanges };
  }

  // ============================================================
  // Comparaison des wires
  // ============================================================

  static _compareWires(previousWires, currentWires, ignoredPaths) {
    // Validation des IDs (ADR-008)
    for (const wire of previousWires) {
      DiffEngine._validateWire(wire);
    }
    for (const wire of currentWires) {
      DiffEngine._validateWire(wire);
    }

    const previousMap = new Map();
    for (const wire of previousWires) {
      previousMap.set(wire.id, wire);
    }

    const currentMap = new Map();
    for (const wire of currentWires) {
      currentMap.set(wire.id, wire);
    }

    const added = [];
    const removed = [];
    const modified = [];
    let hasChanges = false;

    for (const [id, wire] of currentMap) {
      if (!previousMap.has(id)) {
        added.push(wire);
        hasChanges = true;
      }
    }

    for (const [id, wire] of previousMap) {
      if (!currentMap.has(id)) {
        removed.push(wire);
        hasChanges = true;
      }
    }

    for (const [id, previousWire] of previousMap) {
      const currentWire = currentMap.get(id);
      if (currentWire) {
        const diff = DiffEngine._deepCompareObjects(
          previousWire,
          currentWire,
          ignoredPaths
        );
        if (diff.hasChanges) {
          modified.push({
            id,
            previous: previousWire,
            current: currentWire,
            changes: diff.changes,
          });
          hasChanges = true;
        }
      }
    }

    return { added, removed, modified, hasChanges };
  }

  // ============================================================
  // Comparaison profonde d'objets
  // ============================================================

  static _deepCompareObjects(a, b, ignoredPaths, path = '') {
    const changes = {};
    let hasChanges = false;

    if (a === undefined && b === undefined) {
      return { hasChanges: false, changes: {} };
    }

    if (a === undefined || b === undefined) {
      return { hasChanges: true, changes: { [path || 'value']: { from: a, to: b } } };
    }

    if (typeof a !== typeof b) {
      return { hasChanges: true, changes: { [path || 'value']: { from: a, to: b } } };
    }

    if (typeof a !== 'object' || a === null || b === null) {
      if (a !== b) {
        return { hasChanges: true, changes: { [path || 'value']: { from: a, to: b } } };
      }
      return { hasChanges: false, changes: {} };
    }

    // Vérifier si le chemin courant est ignoré
    if (ignoredPaths.some(ignoredPath => path.startsWith(ignoredPath))) {
      return { hasChanges: false, changes: {} };
    }

    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;

      if (ignoredPaths.some(ignoredPath => newPath.startsWith(ignoredPath))) {
        continue;
      }

      const aValue = a[key];
      const bValue = b[key];

      if (aValue === undefined && bValue === undefined) {
        continue;
      }

      if (aValue === undefined || bValue === undefined) {
        changes[newPath] = { from: aValue, to: bValue };
        hasChanges = true;
        continue;
      }

      if (typeof aValue !== typeof bValue) {
        changes[newPath] = { from: aValue, to: bValue };
        hasChanges = true;
        continue;
      }

      if (typeof aValue === 'object' && aValue !== null && bValue !== null) {
        const nestedDiff = DiffEngine._deepCompareObjects(
          aValue,
          bValue,
          ignoredPaths,
          newPath
        );
        if (nestedDiff.hasChanges) {
          Object.assign(changes, nestedDiff.changes);
          hasChanges = true;
        }
        continue;
      }

      if (aValue !== bValue) {
        changes[newPath] = { from: aValue, to: bValue };
        hasChanges = true;
      }
    }

    return { hasChanges, changes };
  }

  // ============================================================
  // Statistiques
  // ============================================================

  static _computeStatistics(componentsDiff, wiresDiff) {
    return {
      components: {
        added: componentsDiff.added.length,
        removed: componentsDiff.removed.length,
        modified: componentsDiff.modified.length,
      },
      wires: {
        added: wiresDiff.added.length,
        removed: wiresDiff.removed.length,
        modified: wiresDiff.modified.length,
      },
      total: {
        added: componentsDiff.added.length + wiresDiff.added.length,
        removed: componentsDiff.removed.length + wiresDiff.removed.length,
        modified: componentsDiff.modified.length + wiresDiff.modified.length,
      },
    };
  }

  // ============================================================
  // Validation
  // ============================================================

  static _validateDocument(doc, name) {
    if (doc === null || doc === undefined) {
      throw new Error(`Invalid ${name}: document is null or undefined`);
    }
    if (typeof doc !== 'object') {
      throw new Error(`Invalid ${name}: document must be an object`);
    }
    if (doc.components !== undefined && !Array.isArray(doc.components)) {
      throw new Error(`Invalid ${name}: "components" must be an array`);
    }
    if (doc.wires !== undefined && !Array.isArray(doc.wires)) {
      throw new Error(`Invalid ${name}: "wires" must be an array`);
    }
  }

  /**
   * Valide qu'un composant possède un identifiant valide.
   * @param {Object} component - Composant à valider
   * @throws {Error} Si le composant est invalide
   */
  static _validateComponent(component) {
    if (!component || typeof component !== 'object') {
      throw new Error('Invalid component: component must be an object');
    }
    if (!component.id) {
      throw new Error('Invalid component: missing "id"');
    }
    if (typeof component.id !== 'string') {
      throw new Error('Invalid component: "id" must be a string');
    }
  }

  /**
   * Valide qu'une wire possède un identifiant valide.
   * @param {Object} wire - Wire à valider
   * @throws {Error} Si la wire est invalide
   */
  static _validateWire(wire) {
    if (!wire || typeof wire !== 'object') {
      throw new Error('Invalid wire: wire must be an object');
    }
    if (!wire.id) {
      throw new Error('Invalid wire: missing "id" (ADR-008)');
    }
    if (typeof wire.id !== 'string') {
      throw new Error('Invalid wire: "id" must be a string');
    }
  }
}