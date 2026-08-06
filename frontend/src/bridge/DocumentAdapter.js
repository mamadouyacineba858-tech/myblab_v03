/**
 * DocumentAdapter
 *
 * Applique un DiffResult (produit par DiffEngine) au documentApi de l'UI.
 *
 * RESPONSABILITÉS :
 * - Applique les opérations atomiques dans l'ordre correct
 * - Ne modifie jamais le diffResult reçu en entrée
 * - Ne connaît pas React directement (reçoit documentApi en paramètre)
 * - Ne contient pas de logique métier
 * - Utilise les `changes` du DiffResult pour optimiser les mises à jour
 *
 * ORDRE D'APPLICATION (critique) :
 * 1. removeWires  → supprimer les wires obsolètes
 * 2. removeComponents → supprimer les composants obsolètes
 * 3. updateComponentState → mettre à jour les paramètres
 * 4. updateComponentPositions → mettre à jour les positions
 * 5. restoreComponents → ajouter les nouveaux composants
 * 6. restoreWires → ajouter les nouvelles wires
 *
 * RÉFÉRENCES : MB-BRIDGE-003
 */
export class DocumentAdapter {
  /**
   * Liste des méthodes requises sur documentApi.
   */
  static REQUIRED_API_METHODS = [
    'removeWires',
    'removeComponents',
    'updateComponentState',
    'updateComponentPositions',
    'restoreComponents',
    'restoreWires',
  ];

  /**
   * @param {Object} documentApi - API de manipulation du document (UI)
   */
  constructor(documentApi) {
    if (!documentApi) {
      throw new Error('DocumentAdapter: documentApi is required');
    }
    if (typeof documentApi !== 'object') {
      throw new Error('DocumentAdapter: documentApi must be an object');
    }

    for (const method of DocumentAdapter.REQUIRED_API_METHODS) {
      if (typeof documentApi[method] !== 'function') {
        throw new Error(
          `DocumentAdapter: documentApi.${method} must be a function`
        );
      }
    }

    this._documentApi = documentApi;
  }

  /**
   * Applique un DiffResult au documentApi.
   * @param {Object} diffResult - Résultat de DiffEngine
   * @throws {Error} Si le diffResult est invalide
   */
  apply(diffResult) {
    // Validation du diffResult
    if (!diffResult) {
      throw new Error('DocumentAdapter.apply: diffResult is required');
    }
    if (typeof diffResult !== 'object') {
      throw new Error('DocumentAdapter.apply: diffResult must be an object');
    }

    const requiredFields = [
      'componentsAdded',
      'componentsRemoved',
      'componentsModified',
      'wiresAdded',
      'wiresRemoved',
      'wiresModified',
    ];

    for (const field of requiredFields) {
      if (!(field in diffResult)) {
        throw new Error(
          `DocumentAdapter.apply: diffResult missing field "${field}"`
        );
      }
      if (!Array.isArray(diffResult[field])) {
        throw new Error(
          `DocumentAdapter.apply: diffResult.${field} must be an array`
        );
      }
    }

    const api = this._documentApi;

    // 1. Supprimer les wires obsolètes
    if (diffResult.wiresRemoved.length > 0) {
      api.removeWires(diffResult.wiresRemoved);
    }

    // 2. Supprimer les composants obsolètes
    if (diffResult.componentsRemoved.length > 0) {
      api.removeComponents(diffResult.componentsRemoved);
    }

    // 3. Mettre à jour les paramètres (state) — uniquement si parameters a changé
    const stateUpdates = diffResult.componentsModified
      .filter(item => {
        // Vérifier si des propriétés commençant par "parameters." ont changé
        const hasParameterChanges = Object.keys(item.changes || {}).some(
          key => key.startsWith('parameters.')
        );
        return hasParameterChanges && item.current && item.current.parameters;
      })
      .map(item => ({
        id: item.id,
        state: item.current.parameters,
      }));
    if (stateUpdates.length > 0) {
      api.updateComponentState(stateUpdates);
    }

    // 4. Mettre à jour les positions — uniquement si position a changé
    const positionUpdates = diffResult.componentsModified
      .filter(item => {
        const hasPositionChanges = Object.keys(item.changes || {}).some(
          key => key.startsWith('position.')
        );
        return hasPositionChanges && item.current && item.current.position;
      })
      .map(item => ({
        id: item.id,
        position: item.current.position,
      }));
    if (positionUpdates.length > 0) {
      api.updateComponentPositions(positionUpdates);
    }

    // 5. Ajouter les nouveaux composants
    if (diffResult.componentsAdded.length > 0) {
      api.restoreComponents(diffResult.componentsAdded);
    }

    // 6. Ajouter les nouvelles wires
    if (diffResult.wiresAdded.length > 0) {
      api.restoreWires(diffResult.wiresAdded);
    }
  }
}