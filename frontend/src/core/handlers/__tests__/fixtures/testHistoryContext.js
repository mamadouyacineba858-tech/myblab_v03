import { HistoryManager } from '../../../../history/HistoryManager.js';
import { HistoryService } from '../../../history/HistoryService.js';

/**
 * Mock minimal du Document API, avec deep clone pour détecter les mutations
 * accidentelles (cohérent avec MB-HISTORY-001-A).
 */
export class MockDocumentApi {
  constructor(initialDocument) {
    this._document = this._deepClone(initialDocument);
  }

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  getDocument() {
    return this._deepClone(this._document);
  }

  setDocument(document) {
    this._document = this._deepClone(document);
  }

  applyDocument(newDocument) {
    this._document = this._deepClone(newDocument);
  }
}

/**
 * Construit un contexte de test complet (documentApi + vrai HistoryManager
 * + HistoryService) pour tester les handlers dans les mêmes conditions
 * qu'en intégration réelle (MB-HISTORY-001-A).
 *
 * @param {object} initialDocument - Document de départ
 * @returns {{ documentApi: MockDocumentApi, historyManager: HistoryManager, historyService: HistoryService }}
 */
export function createHandlerTestContext(initialDocument) {
  const documentApi = new MockDocumentApi(initialDocument);
  const historyManager = new HistoryManager();
  const historyService = new HistoryService(historyManager, documentApi);
  return { documentApi, historyManager, historyService };
}
