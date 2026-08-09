/**
 * ReactDocumentMapper
 *
 * Couche de traduction PUREMENT STRUCTURELLE ET GÉNÉRIQUE
 * entre le modèle React et le modèle Core.
 *
 * Les transformations et validations sont définies de manière DÉCLARATIVE
 * via des contrats de mapping centralisés.
 *
 * CONTRAT : Voir la documentation du contrat.
 * HYPOTHÈSE : Les documents sont sérialisables en JSON.
 *
 * RÉFÉRENCES : ADR-005, ADR-008, MB-CORE-ADAPTER-ADR V4
 */
export class ReactDocumentMapper {
  // ============================================================
  // CONTRATS DE MAPPING DÉCLARATIFS
  // ============================================================

  /**
   * Contrat de mapping : React → Core pour un composant.
   * 
   * Chaque entrée : [sourceKey, targetPath, isRequired, transformFn]
   * - sourceKey: clé dans l'objet source (peut être un chemin)
   * - targetPath: chemin dans l'objet cible
   * - isRequired: true si le champ doit être présent
   * - transformFn: fonction optionnelle de transformation
   */
  static _COMPONENT_MAPPING_RC = [
    // Champs obligatoires
    ['uid', 'id', true],
    ['type', 'type', true],
    ['x', 'position.x', true],
    ['y', 'position.y', true],
  ];

  /**
   * Contrat de mapping : Core → React pour un composant.
   */
  static _COMPONENT_MAPPING_CR = [
    // Champs obligatoires
    ['id', 'uid', true],
    ['type', 'type', true],
    ['position.x', 'x', true],
    ['position.y', 'y', true],
  ];

  /**
   * Contrat de mapping : React → Core pour une wire.
   * fromPinId et toPinId sont optionnels.
   */
  static _WIRE_MAPPING_RC = [
    // Champs obligatoires
    ['fromUid', 'pinA.componentId', true],
    ['toUid', 'pinB.componentId', true],
    // Champs optionnels
    ['fromPin', 'pinA.pinId', false, (v) => v !== undefined ? v : undefined],
    ['toPin', 'pinB.pinId', false, (v) => v !== undefined ? v : undefined],
  ];

  /**
   * Contrat de mapping : Core → React pour une wire.
   */
  static _WIRE_MAPPING_CR = [
    // Champs obligatoires
    ['pinA.componentId', 'fromUid', true],
    ['pinB.componentId', 'toUid', true],
    // Champs optionnels
    ['pinA.pinId', 'fromPin', false, (v) => v !== undefined ? v : undefined],
    ['pinB.pinId', 'toPin', false, (v) => v !== undefined ? v : undefined],
  ];

  // ============================================================
  // API PUBLIQUE
  // ============================================================

  static toCore(reactDocument) {
    ReactDocumentMapper._validateReactDocument(reactDocument);

    const components = (reactDocument.components || []).map(comp =>
      ReactDocumentMapper._applyMapping(
        comp,
        ReactDocumentMapper._COMPONENT_MAPPING_RC,
        ['uid', 'x', 'y', 'type'] // clés structurelles à ne pas copier automatiquement
      )
    );

    const wires = (reactDocument.wires || []).map(wire =>
      ReactDocumentMapper._applyMapping(
        wire,
        ReactDocumentMapper._WIRE_MAPPING_RC,
        ['fromUid', 'toUid', 'fromPin', 'toPin']
      )
    );

    const result = { components, wires };
    ReactDocumentMapper._copyUnknownProperties(reactDocument, result, ['components', 'wires']);
    return result;
  }

  static toReact(coreDocument) {
    ReactDocumentMapper._validateCoreDocument(coreDocument);

    const components = (coreDocument.components || []).map(comp =>
      ReactDocumentMapper._applyMapping(
        comp,
        ReactDocumentMapper._COMPONENT_MAPPING_CR,
        ['id', 'type', 'position']
      )
    );

    const wires = (coreDocument.wires || []).map(wire =>
      ReactDocumentMapper._applyMapping(
        wire,
        ReactDocumentMapper._WIRE_MAPPING_CR,
        ['pinA', 'pinB']
      )
    );

    const result = { components, wires };
    ReactDocumentMapper._copyUnknownProperties(coreDocument, result, ['components', 'wires']);
    return result;
  }

  /**
   * Convertit un Document Core vers le format attendu par le moteur legacy.
   * Les entrées incomplètes sont ignorées afin de ne pas transmettre de
   * composant ou de fil invalide au moteur de simulation.
   *
   * @param {Object} coreDocument - Document au format Core
   * @returns {{ components: Array, wires: Array }} Document au format engine
   */
 

  // ============================================================
  // MOTEUR DE MAPPING DÉCLARATIF AVEC VALIDATION
  // ============================================================

  /**
   * Applique un mapping déclaratif à un objet.
   * @param {Object} source - Objet source
   * @param {Array} mapping - Tableau de mapping [sourceKey, targetPath, isRequired, transformFn]
   * @param {Array} structuralKeys - Clés structurelles à ne pas copier automatiquement
   * @returns {Object} Nouvel objet mappé
   * @throws {Error} Si un champ obligatoire est manquant
   */
  static _applyMapping(source, mapping, structuralKeys) {
    if (!source || typeof source !== 'object') {
      throw new Error('Invalid source object for mapping: source must be an object');
    }

    const result = {};
    const mappedSourceKeys = new Set();
    const mappedTargetPaths = new Set();

    // 1. Valider et appliquer le mapping
    for (const entry of mapping) {
      const [sourceKey, targetPath, isRequired, transformFn] = entry;
      const value = ReactDocumentMapper._getNestedValue(source, sourceKey);

      // Validation des champs obligatoires
      if (isRequired && (value === undefined || value === null)) {
        throw new Error(`Missing required field: "${sourceKey}" for mapping to "${targetPath}"`);
      }

      if (value !== undefined && value !== null) {
        const finalValue = transformFn ? transformFn(value) : value;
        ReactDocumentMapper._setNestedValue(result, targetPath, finalValue);
        mappedSourceKeys.add(sourceKey);
        mappedTargetPaths.add(targetPath);
      }
    }

    // 2. Copier automatiquement toutes les propriétés non structurelles
    for (const [key, value] of Object.entries(source)) {
      // Ne pas copier les clés structurelles
      if (structuralKeys.includes(key)) {
        continue;
      }

      // Ne pas copier si déjà mappée
      if (mappedSourceKeys.has(key)) {
        continue;
      }

      if (value !== undefined && value !== null) {
        // Ne pas écraser les valeurs déjà définies par le mapping
        if (!(key in result)) {
          result[key] = ReactDocumentMapper._deepClone(value);
        }
      }
    }

    return result;
  }

  // ============================================================
  // UTILITAIRES D'ACCÈS AUX PROPRIÉTÉS
  // ============================================================

  static _getNestedValue(obj, path) {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  static _setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  // ============================================================
  // COPIE DES PROPRIÉTÉS INCONNUES
  // ============================================================

  static _copyUnknownProperties(source, target, knownKeys) {
    const knownSet = new Set(knownKeys);
    for (const [key, value] of Object.entries(source)) {
      if (!knownSet.has(key) && value !== undefined && value !== null) {
        target[key] = ReactDocumentMapper._deepClone(value);
      }
    }
  }

  // ============================================================
  // CLONAGE PROFOND
  // ============================================================

  static _deepClone(value) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(value);
      } catch (_) {
        // Fallback
      }
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      if (Array.isArray(value)) {
        return [...value];
      }
      return { ...value };
    }
  }

  // ============================================================
  // VALIDATION DES DOCUMENTS
  // ============================================================

  static _validateReactDocument(doc) {
    if (doc === null || doc === undefined) {
      throw new Error('Invalid ReactDocument: document is null or undefined');
    }
    if (typeof doc !== 'object') {
      throw new Error('Invalid ReactDocument: document must be an object');
    }
    if (doc.components !== undefined && !Array.isArray(doc.components)) {
      throw new Error('Invalid ReactDocument: "components" must be an array');
    }
    if (doc.wires !== undefined && !Array.isArray(doc.wires)) {
      throw new Error('Invalid ReactDocument: "wires" must be an array');
    }
  }

  static _validateCoreDocument(doc) {
    if (doc === null || doc === undefined) {
      throw new Error('Invalid CoreDocument: document is null or undefined');
    }
    if (typeof doc !== 'object') {
      throw new Error('Invalid CoreDocument: document must be an object');
    }
    if (doc.components !== undefined && !Array.isArray(doc.components)) {
      throw new Error('Invalid CoreDocument: "components" must be an array');
    }
    if (doc.wires !== undefined && !Array.isArray(doc.wires)) {
      throw new Error('Invalid CoreDocument: "wires" must be an array');
    }
  }
}
