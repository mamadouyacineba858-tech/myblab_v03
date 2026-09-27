/**
 * A10-DISP2 — projection de présentation du contrôleur ST7066U (LCD WH1602B).
 *
 * Fonction PURE, lecture seule : lit l'état runtime déjà calculé par le
 * producteur timed (timedDigitalContributionRegistry.js) et en extrait la
 * fenêtre visible 16x2. Aucune logique de contrôleur ici (aucune commande,
 * aucun front, aucune écriture) et aucune mémoire : sans état runtime
 * (simulation arrêtée, module non alimenté), l'écran est éteint.
 *
 * Fenêtre visible (display shift hors scope V1) : ligne 1 = DDRAM
 * 0x00..0x0F, ligne 2 = DDRAM 0x40..0x4F.
 */
export const LCD_COLUMNS = 16
export const LCD_LINE_START_ADDRESSES = Object.freeze([0x00, 0x40])

const BLANK = 0x20
const BLANK_CODES = Object.freeze(new Array(LCD_COLUMNS).fill(BLANK))

/**
 * Texte d'un code caractère de la ROM ST7066U (jeu standard) : ASCII pour
 * 0x20..0x7D sauf 0x5C (Yen), flèches en 0x7E/0x7F, degré 0xDF, pavé plein
 * 0xFF. CGRAM (0x00..0x0F) et les autres glyphes ROM ne sont pas modélisés
 * en V1 : rendus comme un espace.
 */
const SPECIAL_GLYPH_TEXT = Object.freeze({ 0x5c: '¥', 0x7e: '→', 0x7f: '←', 0xdf: '°', 0xff: '█' })
export function st7066uGlyphText(code) {
  if (SPECIAL_GLYPH_TEXT[code]) return SPECIAL_GLYPH_TEXT[code]
  return code >= 0x20 && code <= 0x7d ? String.fromCharCode(code) : ' '
}

const OFF_DISPLAY = Object.freeze({
  lines: Object.freeze([' '.repeat(LCD_COLUMNS), ' '.repeat(LCD_COLUMNS)]),
  codes: Object.freeze([BLANK_CODES, BLANK_CODES]),
  displayOn: false,
  cursorOn: false,
  blinkOn: false,
  cursor: null,
})

/**
 * @param {object | undefined} runtimeState état privé ST7066U (gelé) ou undefined
 * @returns {{ lines: string[], codes: number[][], displayOn: boolean, cursorOn: boolean, blinkOn: boolean, cursor: { line: number, column: number } | null }}
 */
export function projectSt7066uDisplay(runtimeState) {
  if (!runtimeState || !Array.isArray(runtimeState.ddram)) return OFF_DISPLAY
  const codes = LCD_LINE_START_ADDRESSES.map((start) =>
    Object.freeze(Array.from({ length: LCD_COLUMNS }, (_, column) => runtimeState.ddram[start + column] ?? BLANK)))
  const line = LCD_LINE_START_ADDRESSES.findIndex((start) =>
    runtimeState.addressCounter >= start && runtimeState.addressCounter < start + LCD_COLUMNS)
  const cursor = runtimeState.ramTarget === 'DDRAM' && line >= 0
    ? Object.freeze({ line, column: runtimeState.addressCounter - LCD_LINE_START_ADDRESSES[line] })
    : null
  return Object.freeze({
    lines: Object.freeze(codes.map((row) => row.map(st7066uGlyphText).join(''))),
    codes: Object.freeze(codes),
    displayOn: runtimeState.displayOn === true,
    cursorOn: runtimeState.cursorOn === true,
    blinkOn: runtimeState.blinkOn === true,
    cursor,
  })
}
