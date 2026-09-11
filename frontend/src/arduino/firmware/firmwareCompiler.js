import { mapArduinoPin } from "./boardPinMap.js"
import { DiagnosticCode, createDiagnostic } from "./firmwareDiagnostics.js"

/**
 * MB-L1-ARD-002 — Firmware Compiler V1 (§17 du ticket).
 *
 * PUR : aucun import de simulator/*, React, Document, ni History (§21,
 * verrouillé structurellement par firmwareCompiler.architecture.test.js).
 * Input : une chaîne source. Output : `{ ok: true, ir }` ou
 * `{ ok: false, diagnostics }` — jamais d'exception pour un source
 * syntaxiquement invalide (seule une entrée non-string produit une
 * exception de garde, cas défensif).
 *
 * Subset V1 strict (§5, étendu par MB-L1-ARD-003 §21) :
 *   void setup() { ... }
 *   void loop() { ... }
 *   pinMode(2|3, OUTPUT);
 *   digitalWrite(2|3, HIGH|LOW);
 *   delay(<littérale numérique finie >= 0>);
 *
 * Aucune interprétation directe du texte (§8) : `eval`/`new Function`/
 * recherche de sous-chaîne littérale sont interdits et absents de ce
 * fichier — chaque instruction est reconnue par un motif structurel
 * (nom de fonction + arguments), jamais par une comparaison du texte
 * entier de l'instruction à une chaîne candidate.
 */

const VALID_PIN_MODES = new Set(["OUTPUT"])
const VALID_LEVELS = new Set(["HIGH", "LOW"])

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
}

function lineAt(source, index) {
  if (index == null) return null
  return source.slice(0, index).split("\n").length
}

/**
 * Localise `void <name>() { ... }` et extrait son corps par comptage
 * d'accolades (jamais une simple regex non-gourmande, qui échouerait sur un
 * corps contenant sa propre accolade). Exactement une occurrence attendue.
 */
function findFunctionBody(source, name) {
  const headerRe = new RegExp(`void\\s+${name}\\s*\\(\\s*\\)\\s*{`, "g")
  const matches = [...source.matchAll(headerRe)]

  if (matches.length !== 1) {
    return { found: matches.length, body: null, bodyStartOffset: null, headerIndex: matches[0]?.index ?? null, malformed: false }
  }

  const match = matches[0]
  const openBraceIndex = match.index + match[0].length - 1
  let depth = 1
  let i = openBraceIndex + 1
  while (i < source.length && depth > 0) {
    if (source[i] === "{") depth++
    else if (source[i] === "}") depth--
    i++
  }

  if (depth !== 0) {
    return { found: 1, body: null, bodyStartOffset: null, headerIndex: match.index, malformed: true }
  }

  const bodyStartOffset = openBraceIndex + 1
  const body = source.slice(bodyStartOffset, i - 1)
  return { found: 1, body, bodyStartOffset, headerIndex: match.index, malformed: false }
}

/** Découpe un corps de fonction en instructions `;`-terminées, avec leur offset absolu dans le source (pour les numéros de ligne). */
function splitStatementsWithOffsets(body, bodyStartOffset) {
  const statements = []
  let start = 0
  for (let i = 0; i < body.length; i++) {
    if (body[i] === ";") {
      const raw = body.slice(start, i)
      const trimmed = raw.trim()
      if (trimmed.length > 0) {
        const leadingWhitespace = raw.length - raw.trimStart().length
        statements.push({ text: trimmed, offset: bodyStartOffset + start + leadingWhitespace })
      }
      start = i + 1
    }
  }
  const trailing = body.slice(start).trim()
  if (trailing.length > 0) {
    statements.push({ text: trailing, offset: bodyStartOffset + start })
  }
  return statements
}

/** Reconnaît une instruction unique par motif structurel — jamais par comparaison de texte entier (§8). */
function parseStatement(text, source, offset, diagnostics) {
  const line = lineAt(source, offset)

  const pinModeMatch = text.match(/^pinMode\s*\(\s*(\d+)\s*,\s*(\w+)\s*\)$/)
  if (pinModeMatch) {
    const [, pinStr, mode] = pinModeMatch
    const pin = mapArduinoPin(Number(pinStr))
    if (!pin) {
      diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_PIN, `pin ${pinStr} is not supported in V1 (only 2, 3)`, line))
      return null
    }
    if (!VALID_PIN_MODES.has(mode)) {
      diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_MODE, `pinMode "${mode}" is not supported in V1 (only OUTPUT)`, line))
      return null
    }
    return Object.freeze({ op: "PIN_MODE", pin, mode })
  }

  const digitalWriteMatch = text.match(/^digitalWrite\s*\(\s*(\d+)\s*,\s*(\w+)\s*\)$/)
  if (digitalWriteMatch) {
    const [, pinStr, level] = digitalWriteMatch
    const pin = mapArduinoPin(Number(pinStr))
    if (!pin) {
      diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_PIN, `pin ${pinStr} is not supported in V1 (only 2, 3)`, line))
      return null
    }
    if (!VALID_LEVELS.has(level)) {
      diagnostics.push(createDiagnostic(DiagnosticCode.INVALID_LEVEL, `digitalWrite level "${level}" is not supported (only HIGH, LOW)`, line))
      return null
    }
    return Object.freeze({ op: "DIGITAL_WRITE", pin, value: level })
  }

  // MB-L1-ARD-003 §5/§21 : delay(<literal numérique>) — seule extension du
  // subset V1 apportée par ce ticket. Arité et type stricts : exactement un
  // argument, une littérale numérique finie >= 0 (jamais une variable, un
  // nom, ou plusieurs arguments — §26 D3-D6).
  const delayMatch = text.match(/^delay\s*\(([^)]*)\)$/)
  if (delayMatch) {
    const arg = delayMatch[1].trim()
    const isNumericLiteral = /^\d+(\.\d+)?$/.test(arg)
    const durationMs = isNumericLiteral ? Number(arg) : NaN
    if (!isNumericLiteral || !Number.isFinite(durationMs) || durationMs < 0) {
      diagnostics.push(createDiagnostic(DiagnosticCode.INVALID_DELAY_DURATION, `delay() requires exactly one finite numeric literal argument >= 0, got "${arg}"`, line))
      return null
    }
    return Object.freeze({ op: "DELAY", durationMs })
  }

  // Catch-all déterministe pour toute instruction hors subset V1 — inclut
  // explicitement Serial.*, analogWrite(), digitalRead(), analogRead() et
  // tout appel inconnu (§19/§27) : aucun de ces cas n'est implémenté
  // silencieusement, tous produisent le même diagnostic explicite.
  diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, `unsupported statement: "${text}"`, line))
  return null
}

function compileBody(body, bodyStartOffset, source) {
  const statements = splitStatementsWithOffsets(body, bodyStartOffset)
  const diagnostics = []
  const ir = []
  for (const { text, offset } of statements) {
    const node = parseStatement(text, source, offset, diagnostics)
    if (node) ir.push(node)
  }
  return { ir, diagnostics }
}

/**
 * @param {string} source Le firmware source (component.firmware.source).
 * @returns {{ ok: true, ir: { setup: object[], loop: object[] } } | { ok: false, diagnostics: object[] }}
 */
export function compileFirmware(source) {
  if (typeof source !== "string") {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.MALFORMED_BRACES, "firmware source must be a string")] }
  }

  const clean = stripComments(source)

  const setupResult = findFunctionBody(clean, "setup")
  if (setupResult.malformed) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.MALFORMED_BRACES, "setup() has unbalanced braces", lineAt(clean, setupResult.headerIndex))] }
  }
  if (setupResult.found !== 1) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.MISSING_SETUP, "expected exactly one \"void setup() { }\" function")] }
  }

  const loopResult = findFunctionBody(clean, "loop")
  if (loopResult.malformed) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.MALFORMED_BRACES, "loop() has unbalanced braces", lineAt(clean, loopResult.headerIndex))] }
  }
  if (loopResult.found !== 1) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.MISSING_LOOP, "expected exactly one \"void loop() { }\" function")] }
  }

  const setupCompiled = compileBody(setupResult.body, setupResult.bodyStartOffset, clean)
  const loopCompiled = compileBody(loopResult.body, loopResult.bodyStartOffset, clean)
  const diagnostics = [...setupCompiled.diagnostics, ...loopCompiled.diagnostics]

  if (diagnostics.length > 0) {
    // Atomicité (§20/T35) : un seul diagnostic suffit à invalider TOUT le
    // résultat — aucun IR partiel n'est jamais retourné aux côtés de
    // diagnostics, même si d'autres instructions du même source étaient
    // individuellement valides.
    return { ok: false, diagnostics }
  }

  return {
    ok: true,
    ir: Object.freeze({
      setup: Object.freeze(setupCompiled.ir),
      loop: Object.freeze(loopCompiled.ir),
    }),
  }
}
