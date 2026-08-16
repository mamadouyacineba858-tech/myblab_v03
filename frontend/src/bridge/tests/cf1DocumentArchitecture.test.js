import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-CF1-001 v3.1/final — Tests architecturaux (Ticket §9, §11 « Tests
 * architecturaux », AC-001, AC-002, AC-004, AC-006, AC-009, AC-011).
 *
 * Preuves par inspection statique du source (même méthode que
 * runtimeArchitecture.test.js / resolutionArchitecture.test.js) que les
 * invariants INV-CF1-001 à INV-CF1-012 sont respectés à l'issue de ce
 * ticket, SANS qu'aucune modification n'ait été apportée à
 * ReactDocumentMapper.js, useCircuitState.js, CommandBus.js ou tout autre
 * fichier de production.
 *
 * [CORRECTION CSA v3.1 — AC-009] Ces tests n'interdisent PAS l'état React
 * historique (useState pour components/wires dans useCircuitState.js).
 * Ils interdisent uniquement : un second Document Core dérivé persistant,
 * une source métier parallèle indépendante, une synchronisation parallèle
 * permanente, une API Document ad hoc, un contournement de la frontière
 * Core. Un test positif (et non une simple absence) confirme explicitement
 * que l'état React historique reste présent et n'est pas traité comme une
 * violation (cf. describe « état transitoire CF1 » ci-dessous).
 *
 * [AMENDEMENT CSA-CF3-001-A — MB-CF3-001] Trois verrous CF1 ont été levés
 * explicitement par le CSA pour permettre l'activation contrôlée du canal
 * de mutation Core depuis useCircuitState.js (addComponent uniquement) :
 *   - AC-011 : useCircuitState.js peut désormais importer CommandBus.js et
 *     HistoryService.js (c'était l'objet même de CF3 : activer un canal que
 *     CF1 avait délibérément laissé « établi et testé, mais pas activé »).
 *   - AC-006 : documentApi peut exposer des méthodes au-delà des 6 méthodes
 *     granulaires de CF1, à condition qu'elles soient un contrat démontré à
 *     partir d'API Core déjà existantes (ici getDocument/applyDocument,
 *     dérivés de ReactDocumentMapper.toCore/.toReact) — aucune API ad hoc.
 *   - CF1-003-E : useCircuitState.js peut désormais appeler
 *     ReactDocumentMapper.toReact(), sans faire de React une source de
 *     vérité (le Document Core n'est pas dupliqué en un second état
 *     persistant — INV-CF1-011/012 ci-dessous restent pleinement vérifiés).
 * Cet amendement est additif : il ne supprime ni n'affaiblit aucun autre
 * invariant CF1 de ce fichier. Voir
 * docs/pmo/specifications/MB-CF3-001-mutation-channel-cartography-and-contract.md
 * §8-9 pour le constat empirique complet et le texte intégral de l'arbitrage.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const mapperPath = path.join(dir, "..", "ReactDocumentMapper.js")
const bridgePath = path.join(dir, "..", "ReactCoreBridge.js")
const adapterPath = path.join(dir, "..", "DocumentAdapter.js")
const diffEnginePath = path.join(dir, "..", "DiffEngine.js")
const useCircuitStatePath = path.join(dir, "..", "..", "hooks", "useCircuitState.js")
const historyManagerPath = path.join(dir, "..", "..", "history", "HistoryManager.js")
const commandBusPath = path.join(dir, "..", "..", "core", "command", "CommandBus.js")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

describe("MB-CF1-001 — INV-CF1-007 : ReactDocumentMapper reste un adaptateur sans état", () => {
  it("ReactDocumentMapper.js ne déclare aucun constructor() ni propriété d'instance mutable", () => {
    const source = readSourceWithoutComments(mapperPath)
    expect(source).not.toMatch(/constructor\s*\(/)
    // Toutes les méthodes doivent être statiques (préfixées `static`) ; aucun `this.` d'instance.
    expect(source).not.toMatch(/\bthis\.\w+\s*=/)
  })

  it("ReactDocumentMapper.js ne contient aucun état de module (pas de let/const mutable au niveau module en dehors de la classe)", () => {
    const source = readSourceWithoutComments(mapperPath)
    // Seule la déclaration de la classe est attendue au niveau module.
    const moduleLevelDeclarations = source.match(/^(let|var)\s+\w+/gm) || []
    expect(moduleLevelDeclarations).toEqual([])
  })
})

describe("MB-CF1-001 — INV-CF1-011 : pas de Document Core dérivé persistant indépendant", () => {
  it("aucun fichier du bridge layer ne stocke un Document Core dans une variable de module persistante", () => {
    for (const sourcePath of [mapperPath, bridgePath, adapterPath, diffEnginePath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas déclarer de cache de document au niveau module`)
        .not.toMatch(/^(let|const|var)\s+_?(cached)?[Dd]ocument\s*=/m)
    }
  })

  it("useCircuitState.js ne construit aucun état React supplémentaire pour un « Document Core » dérivé (aucun useState/useRef nommé document/coreDocument)", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/useState\s*\(\s*.*\)\s*.*\b(coreDocument|documentCore)\b/i)
    expect(source).not.toMatch(/\bcoreDocument\b\s*,\s*set(CoreDocument|Document)\b/)
  })
})

describe("MB-CF1-001 — INV-CF1-012 : pas de synchronisation parallèle permanente", () => {
  it("useCircuitState.js n'introduit aucune boucle de synchronisation continue (setInterval/useEffect polling) vers le Core", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/setInterval/)
    // Aucun useEffect ne doit référencer ReactCoreBridge ou toReact (synchronisation active interdite).
    const useEffectBlocks = source.match(/useEffect\s*\([\s\S]*?\}\s*,\s*\[[^\]]*\]\s*\)/g) || []
    for (const block of useEffectBlocks) {
      expect(block).not.toMatch(/ReactCoreBridge/)
      expect(block).not.toMatch(/\.toReact\(/)
    }
  })
})

describe("MB-CF1-001 — CF1-003-E / GATE 3 [AMENDÉ par CSA-CF3-001-A pour MB-CF3-001] : la projection Core → React est activée, de façon contrôlée, via documentApi.applyDocument uniquement", () => {
  it("useCircuitState.js n'importe toujours pas ReactCoreBridge.js (chemin non composable avec HistoryService, écarté — cf. cartographie MB-CF3-001 §2.7, hors périmètre)", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/from\s+["'].*ReactCoreBridge\.js["']/)
  })

  it("[CSA-CF3-001-A] useCircuitState.js appelle désormais ReactDocumentMapper.toReact(), mais uniquement à l'intérieur de documentApi.applyDocument (pas dans un useEffect de synchronisation continue — INV-CF1-012 reste vérifié séparément ci-dessus)", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).toMatch(/ReactDocumentMapper\.toCore\(/)
    expect(source).toMatch(/ReactDocumentMapper\.toReact\(/)

    const applyDocumentBlock = source.match(/applyDocument:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n {4}\},/)
    expect(applyDocumentBlock, "applyDocument doit être défini comme méthode de documentApi").not.toBeNull()
    expect(applyDocumentBlock[0]).toMatch(/ReactDocumentMapper\.toReact\(/)

    // toReact() ne doit apparaître nulle part ailleurs que dans ce bloc.
    const toReactOccurrences = (source.match(/\.toReact\(/g) || []).length
    const toReactInApplyDocument = (applyDocumentBlock[0].match(/\.toReact\(/g) || []).length
    expect(toReactOccurrences).toBe(toReactInApplyDocument)
  })
})

describe("MB-CF1-001 — AC-011 [AMENDÉ par CSA-CF3-001-A pour MB-CF3-001] : branchement CommandBus ↔ UI activé, mais borné à addComponent", () => {
  it("[CSA-CF3-001-A] useCircuitState.js importe désormais CommandBus.js et HistoryService.js (activation du canal — c'était l'objet de CF3)", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).toMatch(/from\s+["'].*core\/command\/CommandBus\.js["']/)
    expect(source).toMatch(/from\s+["'].*core\/history\/HistoryService\.js["']/)
  })

  it("[CSA-CF3-001-A] le canal reste borné à ADD_COMPONENT : aucun AddWireHandler n'existe, aucun autre type de commande n'est enregistré dans useCircuitState.js", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    const registerCalls = source.match(/\.register\(\s*["'][A-Z_]+["']/g) || []
    expect(registerCalls).toEqual(['.register("ADD_COMPONENT"'])

    const wireHandlerPath = path.join(dir, "..", "..", "core", "handlers", "component", "AddWireHandler.js")
    expect(fs.existsSync(wireHandlerPath), "AddWireHandler ne doit pas exister (hors périmètre MB-CF3-001)").toBe(false)
  })

  it("CommandBus.js n'a pas été modifié pour ce ticket : dispatch() ignore toujours this._validators (écart CF4, hors périmètre)", () => {
    const source = readSourceWithoutComments(commandBusPath)
    expect(source).toMatch(/this\._validators\s*=\s*validators/)
    // dispatch() ne doit pas référencer _validators : si ce test échoue, CommandBus a été modifié hors périmètre CF1.
    const dispatchMatch = source.match(/dispatch\(command, document\)\s*\{[\s\S]*?\n {2}\}/)
    expect(dispatchMatch).not.toBeNull()
    expect(dispatchMatch[0]).not.toMatch(/_validators/)
  })
})

describe("MB-CF1-001 — état transitoire CF1 (CSA-CF1-003-B) : l'état React historique EST attendu et n'est PAS une violation", () => {
  it("[CORRECTION CSA v3.1 — AC-009] useCircuitState.js conserve intentionnellement useState pour components et wires : ce n'est pas une violation architecturale pendant CF1", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).toMatch(/const\s*\[\s*components\s*,\s*setComponents\s*\]\s*=\s*useState/)
    expect(source).toMatch(/const\s*\[\s*wires\s*,\s*setWires\s*\]\s*=\s*useState/)
  })

  it("[AMENDÉ par CSA-CF3-001-A — AC-006] documentApi conserve les 6 méthodes granulaires CF1 et gagne exactement getDocument/applyDocument, dérivés d'API Core existantes (ReactDocumentMapper) — pas d'API ad hoc", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    const documentApiBlock = source.match(/const documentApi = useMemo\(\(\) => \(\{[\s\S]*?\}\), \[[^\]]*\]\)/)
    expect(documentApiBlock).not.toBeNull()
    const block = documentApiBlock[0]

    for (const method of [
      "updateComponentPositions",
      "updateComponentState",
      "removeComponents",
      "removeWires",
      "restoreComponents",
      "restoreWires",
      "getDocument",
      "applyDocument",
    ]) {
      expect(block).toMatch(new RegExp(`\\b${method}\\b`))
    }

    // getDocument/applyDocument doivent être des dérivations directes de
    // ReactDocumentMapper (aucune API inventée), pas une implémentation ad hoc.
    expect(block).toMatch(/getDocument:\s*\(\)\s*=>\s*ReactDocumentMapper\.toCore\(/)
    expect(block).toMatch(/ReactDocumentMapper\.toReact\(/)
  })
})

describe("MB-CF1-001 — HistoryManager.js reste agnostique du Document (non modifié)", () => {
  it("history/HistoryManager.js ne référence ni getDocument, ni applyDocument, ni documentApi", () => {
    const source = readSourceWithoutComments(historyManagerPath)
    expect(source).not.toMatch(/getDocument/)
    expect(source).not.toMatch(/applyDocument/)
    expect(source).not.toMatch(/documentApi/)
  })
})
