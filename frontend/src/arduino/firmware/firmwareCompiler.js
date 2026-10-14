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
 *   pinMode(0..13, OUTPUT);
 *   digitalWrite(0..13, HIGH|LOW);
 *   delay(<littérale numérique finie >= 0>);
 *
 * Aucune interprétation directe du texte (§8) : `eval`/`new Function`/
 * recherche de sous-chaîne littérale sont interdits et absents de ce
 * fichier — chaque instruction est reconnue par un motif structurel
 * (nom de fonction + arguments), jamais par une comparaison du texte
 * entier de l'instruction à une chaîne candidate.
 */

const VALID_PIN_MODES = new Set(["OUTPUT", "INPUT", "INPUT_PULLUP"])
const VALID_LEVELS = new Set(["HIGH", "LOW"])
// Arduino UNO R3 built-in LED is electrically attached to D13.
// Resolve this constant at compile time: no dynamic evaluation or VM changes.
function resolveDigitalPin(token, constants = new Map()) {
  const number = token === "LED_BUILTIN" ? 13 : constants.has(token) ? constants.get(token) : Number(token)
  return mapArduinoPin(number)
}

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
function parseStatement(text, source, offset, diagnostics, constants) {
  const line = lineAt(source, offset)

  // A17.3-B: bounded integer state and arithmetic. Expressions are compiled
  // to a small typed IR, never evaluated as JavaScript source.
  // Explicitly parsed two-operand integer expressions; never eval user code.
  const atom = String.raw`(?:-?\d+|[A-Za-z_]\w*)`
  const expression = new RegExp("^(" + atom + ")\\s*([+*%/-])\\s*(" + atom + ")$")
  const declarationExpression = text.match(/^int\s+([A-Za-z_]\w*)\s*=\s*(.+)$/)
  if (declarationExpression && expression.test(declarationExpression[2])) {
    const [, left, operator, right] = declarationExpression[2].match(expression)
    return Object.freeze({ op: "VAR_DECLARE_EXPR", name: declarationExpression[1], left, operator, right })
  }
  const assignmentExpression = text.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/)
  if (assignmentExpression && expression.test(assignmentExpression[2])) {
    const [, left, operator, right] = assignmentExpression[2].match(expression)
    return Object.freeze({ op: "VAR_ASSIGN_EXPR", name: assignmentExpression[1], left, operator, right })
  }
  // Digital input is a typed runtime read, never a compile-time constant.
  const readMatch = text.match(/^(?:(int)\s+)?([A-Za-z_]\w*)\s*=\s*digitalRead\s*\(\s*(\d+|LED_BUILTIN|[A-Za-z_]\w*)\s*\)$/)
  if (readMatch) {
    const pin = resolveDigitalPin(readMatch[3], constants)
    if (!pin) {
      diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_PIN, "unsupported digitalRead pin: " + readMatch[3], line))
      return null
    }
    return Object.freeze({ op: "DIGITAL_READ", pin, name: readMatch[2], declare: Boolean(readMatch[1]) })
  }
  const integerDeclaration = text.match(/^int\s+([A-Za-z_]\w*)\s*=\s*(-?\d+)$/)
  if (integerDeclaration) {
    return Object.freeze({ op: "VAR_DECLARE", name: integerDeclaration[1], value: Number(integerDeclaration[2]) })
  }
  const integerAssignment = text.match(/^([A-Za-z_]\w*)\s*(=|\+=|-=)\s*([A-Za-z_]\w*|-?\d+)$/)
  if (integerAssignment) {
    return Object.freeze({ op: "VAR_ASSIGN", name: integerAssignment[1], operator: integerAssignment[2], operand: integerAssignment[3] })
  }
  const integerIncrement = text.match(/^([A-Za-z_]\w*)(\+\+|--)$/)
  if (integerIncrement) {
    return Object.freeze({ op: "VAR_ASSIGN", name: integerIncrement[1], operator: integerIncrement[2] === "++" ? "+=" : "-=", operand: "1" })
  }

  const pinModeMatch = text.match(/^pinMode\s*\(\s*(\d+|LED_BUILTIN|[A-Za-z_]\w*)\s*,\s*(\w+)\s*\)$/)
  if (pinModeMatch) {
    const [, pinStr, mode] = pinModeMatch
    const pin = resolveDigitalPin(pinStr, constants)
    if (!pin) {
      diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_PIN, `pin ${pinStr} is not supported on the Arduino Uno digital surface (0..13)`, line))
      return null
    }
    if (!VALID_PIN_MODES.has(mode)) {
      diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_MODE, `pinMode "${mode}" is not supported (OUTPUT, INPUT, INPUT_PULLUP)`, line))
      return null
    }
    return Object.freeze({ op: "PIN_MODE", pin, mode })
  }

  const digitalWriteMatch = text.match(/^digitalWrite\s*\(\s*(\d+|LED_BUILTIN|[A-Za-z_]\w*)\s*,\s*(\w+)\s*\)$/)
  if (digitalWriteMatch) {
    const [, pinStr, level] = digitalWriteMatch
    const pin = resolveDigitalPin(pinStr, constants)
    if (!pin) {
      diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_PIN, `pin ${pinStr} is not supported on the Arduino Uno digital surface (0..13)`, line))
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


function compileBody(body, bodyStartOffset, source, constants) {
  const diagnostics = []
  const ir = []
  let pos = 0
  const fail = (message) => diagnostics.push(createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, message, lineAt(source, bodyStartOffset + pos)))
  const skip = () => { while (pos < body.length && /\s/.test(body[pos])) pos++ }
  const word = (value) => new RegExp("^" + value + "\\b").test(body.slice(pos))
  const readCondition = () => {
    skip()
    if (body[pos] !== "(") { fail("expected condition in parentheses"); return null }
    let depth = 1
    const begin = ++pos
    while (pos < body.length && depth > 0) {
      if (body[pos] === "(") depth++
      else if (body[pos] === ")") depth--
      pos++
    }
    if (depth !== 0) { fail("unclosed condition"); return null }
    const token = String.raw`(?:-?\d+|[A-Za-z_]\w*)`
    const pattern = new RegExp("^(" + token + ")\\s*(==|!=|<=|>=|<|>)\\s*(" + token + ")$")
    const match = body.slice(begin, pos - 1).trim().match(pattern)
    if (!match) { fail("unsupported condition"); return null }
    return Object.freeze({ left: match[1], operator: match[2], right: match[3] })
  }
  const block = (depth = 0) => {
    if (depth > 16) { fail("maximum block nesting exceeded"); return }
    while (pos < body.length && diagnostics.length === 0) {
      skip()
      if (pos >= body.length) break
      if (body[pos] === "}") {
        if (depth === 0) { fail("unexpected closing brace"); return }
        pos++
        return
      }
      if (word("for")) {
        pos += 3
        skip()
        if (body[pos] !== "(") { fail("expected for header"); return }
        const begin = ++pos
        while (pos < body.length && body[pos] !== ")") pos++
        if (pos >= body.length) { fail("unclosed for header"); return }
        const clauses = body.slice(begin, pos++).split(";").map(x => x.trim())
        if (clauses.length !== 3) { fail("for requires initialization, condition, update"); return }
        const initializer = parseStatement(clauses[0], source, bodyStartOffset + begin, diagnostics, constants)
        if (!initializer || !["VAR_DECLARE", "VAR_ASSIGN"].includes(initializer.op)) { fail("unsupported for initializer"); return }
        ir.push(initializer.op === "VAR_DECLARE" ? { ...initializer, op: "VAR_REINITIALIZE" } : initializer)
        const conditionMatch = clauses[1].match(/^(-?\d+|[A-Za-z_]\w*)\s*(==|!=|<=|>=|<|>)\s*(-?\d+|[A-Za-z_]\w*)$/)
        if (!conditionMatch) { fail("unsupported for condition"); return }
        const condition = Object.freeze({ left: conditionMatch[1], operator: conditionMatch[2], right: conditionMatch[3] })
        const update = parseStatement(clauses[2], source, bodyStartOffset + begin, diagnostics, constants)
        if (!update || update.op !== "VAR_ASSIGN") { fail("unsupported for update"); return }
        skip()
        if (body[pos] !== "{") { fail("expected braced for body"); return }
        pos++
        const head = ir.length
        ir.push({ op: "BRANCH_FALSE", condition, target: -1 })
        block(depth + 1)
        if (diagnostics.length) return
        ir.push(update, { op: "JUMP", target: head })
        ir[head].target = ir.length
      } else       if (word("if") || word("while")) {
        const loop = word("while")
        pos += loop ? 5 : 2
        const condition = readCondition()
        if (!condition) return
        skip()
        if (body[pos] !== "{") { fail("expected braced block"); return }
        pos++
        const head = ir.length
        ir.push({ op: "BRANCH_FALSE", condition, target: -1 })
        block(depth + 1)
        if (diagnostics.length) return
        if (loop) {
          ir.push({ op: "JUMP", target: head })
          ir[head].target = ir.length
        } else {
          skip()
          if (word("else")) {
            pos += 4
            skip()
            if (body[pos] !== "{") { fail("expected braced else"); return }
            pos++
            const jump = ir.length
            ir.push({ op: "JUMP", target: -1 })
            ir[head].target = ir.length
            block(depth + 1)
            if (diagnostics.length) return
            ir[jump].target = ir.length
          } else ir[head].target = ir.length
        }
      } else {
        const begin = pos
        while (pos < body.length && !";{}".includes(body[pos])) pos++
        if (body[pos] !== ";") { fail("expected semicolon or unsupported block"); return }
        const statement = body.slice(begin, pos++).trim()
        if (!statement) continue
        const node = parseStatement(statement, source, bodyStartOffset + begin, diagnostics, constants)
        if (node) ir.push(node)
      }
      if (ir.length > 1024) { fail("compiled instruction limit exceeded"); return }
    }
    if (depth !== 0 && diagnostics.length === 0) fail("unclosed block")
  }
  block()
  return { ir: ir.map(node => Object.freeze(node)), diagnostics }
}

/**
 * @param {string} source Le firmware source (component.firmware.source).
 * @returns {{ ok: true, ir: { setup: object[], loop: object[] } } | { ok: false, diagnostics: object[] }}
 */
export function compileFirmware(source) {
  if (typeof source !== "string") {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.MALFORMED_BRACES, "firmware source must be a string")] }
  }

  // A17.2: hard limits prevent oversized user sketches from monopolizing the UI
  // during regex scanning and IR construction. Reject explicitly, never truncate.
  const MAX_SOURCE_LENGTH = 64 * 1024
  if (source.length > MAX_SOURCE_LENGTH) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, `firmware exceeds the ${MAX_SOURCE_LENGTH}-character safety limit`)] }
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

  // Keep generated IR bounded independently of source byte length. This
  // avoids pathological sketches with thousands of tiny statements.
  const MAX_INSTRUCTIONS = 1024
  const statementCount = [setupResult, loopResult].reduce(
    (sum, result) => sum + splitStatementsWithOffsets(result.body, result.bodyStartOffset).length,
    0
  )
  if (statementCount > MAX_INSTRUCTIONS) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, `firmware exceeds the ${MAX_INSTRUCTIONS}-instruction safety limit`)] }
  }

  // A17.3: first bounded, statically resolved C++ declaration subset.
  // Only global const int pin aliases are accepted; no runtime expressions.
  const constants = new Map()
  const declarationPattern = /\bconst\s+int\s+([A-Za-z_]\w*)\s*=\s*(\d+)\s*;/g
  const outsideFunctions = clean.split("").map((character, index) => {
    const inSetup = index >= setupResult.bodyStartOffset && index < setupResult.bodyStartOffset + setupResult.body.length
    const inLoop = index >= loopResult.bodyStartOffset && index < loopResult.bodyStartOffset + loopResult.body.length
    return inSetup || inLoop ? " " : character
  }).join("")
  for (const match of outsideFunctions.matchAll(declarationPattern)) {
    if (constants.has(match[1]) || match[1] === "LED_BUILTIN") {
      return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, `duplicate or reserved constant: ${match[1]}`, lineAt(clean, match.index))] }
    }
    constants.set(match[1], Number(match[2]))
  }
  // Remove recognized declarations, setup and loop; any remaining nonspace
  // top-level token is rejected, not silently discarded.
  let topLevel = outsideFunctions.replace(declarationPattern, "")
  topLevel = topLevel.replace(/void\s+(setup|loop)\s*\(\s*\)\s*\{\s*\}/g, "")


  // A17.6: statically inline bounded void helper functions with no arguments.
  // Recursion, unknown calls and helpers with parameters remain rejected.
  const helperPattern = /\bvoid\s+([A-Za-z_]\w*)\s*\(\s*\)\s*\{/g
  const helpers = new Map()
  for (const match of clean.matchAll(helperPattern)) {
    const name = match[1]
    if (name === "setup" || name === "loop") continue
    if (helpers.has(name)) {
      return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, "duplicate helper function: " + name)] }
    }
    const result = findFunctionBody(clean, name)
    if (result.malformed || result.found !== 1 || helpers.size >= 16) {
      return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, "malformed or excessive helper functions")] }
    }
    helpers.set(name, result)
  }
  // Validate that helper definitions occupy all remaining top-level text.
  // A function name must be a single identifier; its body is replaced only
  // when the entire top-level declaration was recognized.
  let helperTopLevel = topLevel
  for (const [name, helper] of helpers) {
    const header = new RegExp("void\\s+" + name + "\\s*\\(\\s*\\)\\s*\\{")
    const original = clean.slice(helper.headerIndex, helper.bodyStartOffset + helper.body.length + 1)
    helperTopLevel = helperTopLevel.replace(original, "")
  }
  if (helperTopLevel.trim()) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, "unsupported global declaration or source outside setup()/loop()")] }
  }
  const expand = (body, stack = []) => {
    if (stack.length > 8) throw new Error("helper call depth exceeds 8")
    return body.replace(/\b([A-Za-z_]\w*)\s*\(\s*\)\s*;/g, (call, name) => {
      if (!helpers.has(name)) return call
      if (stack.includes(name)) throw new Error("recursive helper call: " + name)
      return expand(helpers.get(name).body, [...stack, name])
    })
  }
  let setupBody, loopBody
  try {
    setupBody = expand(setupResult.body)
    loopBody = expand(loopResult.body)
  } catch (error) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, error.message)] }
  }
  if (setupBody.length + loopBody.length > MAX_SOURCE_LENGTH) {
    return { ok: false, diagnostics: [createDiagnostic(DiagnosticCode.UNSUPPORTED_STATEMENT, "expanded helpers exceed source safety limit")] }
  }
  const setupCompiled = compileBody(setupBody, setupResult.bodyStartOffset, clean, constants)
  const loopCompiled = compileBody(loopBody, loopResult.bodyStartOffset, clean, constants)
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
