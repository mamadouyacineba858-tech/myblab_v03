/**
 * breadboardPhysicalReconciliation.test.jsx — MB-VIS-BREAD-041
 *
 * Réconciliation PRESENTATION ONLY de la breadboard (corps plastique clair,
 * relief léger, trous propres, rails fins, rainure crédible, repères discrets,
 * ombre courte). Ces tests VERROUILLENT que la présentation évolue SANS
 * toucher à la géométrie, aux trous, au snapping, au placement ni à la
 * connectivité (T1–T20 du ticket §26).
 *
 * Rendu isolé, contexte minimal (mêmes fakes que Breadboard.test.jsx).
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { render as renderRTL } from '@testing-library/react'
import { Breadboard } from '../Breadboard.jsx'
import { CircuitContext } from '../../context/CircuitContext.js'
import {
  BREADBOARD_PITCH,
  STANDARD_V1_LAYOUT,
  STANDARD_V1_TOTAL_ROWS,
  holeAt,
  resolveComponentContactHoles,
} from '../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../utils/breadboardPlacementAdapter.js'
import { getComponentDef } from '../../config/componentDefinitions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BB_JSX = readFileSync(resolve(__dirname, '../Breadboard.jsx'), 'utf-8')
const BB_CSS = readFileSync(resolve(__dirname, '../Breadboard.css'), 'utf-8')

const BREADBOARD = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

function makeCtx(overrides = {}) {
  return {
    selectOnly: vi.fn(),
    isSelected: () => false,
    startBreadboardDrag: vi.fn(),
    ...overrides,
  }
}

function render(ui, ctx = makeCtx()) {
  return {
    ...renderRTL(<CircuitContext.Provider value={ctx}>{ui}</CircuitContext.Provider>),
    ctx,
  }
}

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\S\r\n]*\/\/.*$/gm, '')

describe('MB-VIS-BREAD-041 — géométrie & topologie INCHANGÉES', () => {
  it('T1 — Breadboard.jsx utilise toujours BREADBOARD_PITCH importé de breadboardGeometry, sans pas local', () => {
    expect(BB_JSX).toMatch(/from ["'][^"']*breadboardGeometry\.js["']/)
    expect(BB_JSX).toMatch(/\bBREADBOARD_PITCH\b/)
    // aucune redéfinition locale d'un pas de grille
    expect(BB_JSX).not.toMatch(/const\s+BREADBOARD_PITCH\s*=/)
    expect(BB_JSX).not.toMatch(/const\s+\w*PITCH\w*\s*=\s*\d/)
    expect(BREADBOARD_PITCH).toBe(12)
  })

  it('T2 — centres des trous inchangés : cx/cy dérivés de column/row * BREADBOARD_PITCH (+ PADDING)', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    const circles = [...container.querySelectorAll('circle.breadboard__hole')]
    expect(circles.length).toBe(420)
    // PADDING == BREADBOARD_PITCH dans Breadboard.jsx ; position (0,0) ⇒
    // cx = column*12 + 12, cy = row*12 + 12 → tous multiples exacts de 12.
    for (const c of circles) {
      const cx = Number(c.getAttribute('cx'))
      const cy = Number(c.getAttribute('cy'))
      expect(cx % BREADBOARD_PITCH).toBe(0)
      expect(cy % BREADBOARD_PITCH).toBe(0)
      expect(cx).toBeGreaterThanOrEqual(BREADBOARD_PITCH)
      expect(cy).toBeGreaterThanOrEqual(BREADBOARD_PITCH)
    }
  })

  it('T2bis — le rayon change (présentation) mais reste piloté par la CSS `r:`, jamais par un attribut cx/cy modifié', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    const c = container.querySelector('circle.breadboard__hole')
    // le composant ne pose PAS d'attribut r inline autre que la constante de rendu
    expect(c.getAttribute('r')).toBe('1.6')
    // ...c'est la CSS qui le raffine
    expect(BB_CSS).toMatch(/\.breadboard__hole\s*\{[^}]*\br:\s*[\d.]+px/)
  })

  it('T3 — holeAt() non modifié : probes de référence conservent leur classification', () => {
    // rail haut + (row 0), rail haut - (row 1), strip haut (row 3).
    expect(holeAt(BREADBOARD, 0, 0).kind).toBe('RAIL')
    expect(holeAt(BREADBOARD, 0, 0).groupKey.endsWith(':+')).toBe(true)
    expect(holeAt(BREADBOARD, 0, BREADBOARD_PITCH).groupKey.endsWith(':-')).toBe(true)
    expect(holeAt(BREADBOARD, 0, 3 * BREADBOARD_PITCH).kind).toBe('STRIP')
    expect(STANDARD_V1_LAYOUT.columns).toBe(30)
    // 17 rangées balayées, dont 3 interstices sans trou → 14 rangées peuplées
    // (× 30 colonnes = 420 trous, cf. T2).
    expect(STANDARD_V1_TOTAL_ROWS).toBe(17)
  })

  it('T4 — aucune seconde grille de coordonnées : un seul appel holeAt() dans la boucle de rendu, cx/cy = expression column/row', () => {
    const code = stripComments(BB_JSX)
    expect((code.match(/holeAt\(/g) || []).length).toBe(1)
    expect(code).toMatch(/cx=\{hole\.x - breadboard\.position\.x \+ PADDING\}/)
    expect(code).toMatch(/cy=\{hole\.y - breadboard\.position\.y \+ PADDING\}/)
  })

  it('T13 — résolution PhysicalContacts inchangée (LED : anode col2/row6, cathode col4/row6)', () => {
    const def = getComponentDef('LED')
    const { results } = resolveComponentContactHoles(BREADBOARD, def.pins, { x: -2, y: 12 })
    const byPin = Object.fromEntries(results.map((r) => [r.pinId, r.hole]))
    expect(byPin.anode).toMatchObject({ column: 2, row: 6 })
    expect(byPin.cathode).toMatchObject({ column: 4, row: 6 })
  })

  it('T15 / T16 — placement & insertion composant inchangés (LED valid, 2 trous)', () => {
    const result = computeBreadboardPlacement(BREADBOARD, 'LED', { x: 1, y: 15 }, [])
    expect(result.breadboardActive).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.holes).toHaveLength(2)
  })

  it('T17 — connectivité inchangée : Breadboard.jsx n\'IMPORTE / n\'APPELLE PAS breadboardConnectivity (LOCK-08)', () => {
    // aucune ligne d'import ne tire breadboardConnectivity / deriveBreadboardVirtualWires
    expect(BB_JSX).not.toMatch(/import[\s\S]*?from\s+["'][^"']*breadboardConnectivity/)
    const code = stripComments(BB_JSX)
    expect(code).not.toMatch(/deriveBreadboardVirtualWires\s*\(/)
    expect(code).not.toMatch(/\bbreadboardConnectivity\b/)
  })

  it('T18 — aucun raster breadboard introduit (JSX ni CSS)', () => {
    for (const src of [BB_JSX, BB_CSS]) {
      expect(src).not.toMatch(/<img\b/i)
      expect(src).not.toMatch(/\.(png|webp|jpg|jpeg)\b/i)
      expect(src).not.toMatch(/url\(/i)
    }
  })

  it('T19 — aucun transform local modifiant les coordonnées', () => {
    // `.breadboard` reste explicitement `transform: none`
    expect(BB_CSS).toMatch(/\.breadboard\s*\{[^}]*transform:\s*none/)
    // le seul transform CSS toléré est la rotation -90deg des libellés de
    // colonne/rangée (pré-existant, cosmétique, sur du texte)
    const transforms = [...BB_CSS.matchAll(/transform:\s*([^;]+);/g)].map((m) => m[1].trim())
    for (const t of transforms) {
      expect(t === 'none' || t === 'rotate(-90deg)').toBe(true)
    }
    // le JSX ne pose aucun attribut transform sur le svg / g / circle
    expect(stripComments(BB_JSX)).not.toMatch(/\btransform=/)
  })

  it('T20 — aucune nouvelle dépendance d\'architecture dans Breadboard.jsx', () => {
    const imports = [...BB_JSX.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1])
    expect(new Set(imports)).toEqual(new Set([
      'react',
      '../config/componentDefinitions.js',
      '../utils/breadboardGeometry.js',
      '../context/useCircuit.js',
    ]))
    // le seul import "side-effect" reste la feuille de style
    expect(BB_JSX).toMatch(/import\s+["']\.\/Breadboard\.css["']/)
    // aucun import de simulation / mutation / core / connectivité
    expect(BB_JSX).not.toMatch(/from\s+["'][^"']*(simulator|core\/|mutation|breadboardConnectivity|assemblyGeometry)/i)
  })
})

describe('MB-VIS-BREAD-041 — repères visuels fonctionnels PRÉSERVÉS', () => {
  it('T5 — rails + / - toujours présents (60 trous + / 60 trous -, 2 lignes de bus chacune)', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    expect(container.querySelectorAll('.breadboard__hole--rail-plus').length).toBe(60)
    expect(container.querySelectorAll('.breadboard__hole--rail-minus').length).toBe(60)
    expect(container.querySelectorAll('.breadboard__rail-line--plus').length).toBe(2)
    expect(container.querySelectorAll('.breadboard__rail-line--minus').length).toBe(2)
  })

  it('T6 — rainure centrale toujours présente (élément unique)', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    expect(container.querySelectorAll('.breadboard__groove').length).toBe(1)
  })

  it('T7 — repères toujours rendus (colonnes, rangées, rails)', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    expect(container.querySelectorAll('.breadboard__column-label').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.breadboard__row-label').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.breadboard__rail-label').length).toBeGreaterThan(0)
  })

  it('T8 — état selected toujours représenté', () => {
    const ctx = makeCtx({ isSelected: (t) => t?.type === 'breadboard' && t?.id === 'bb1' })
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />, ctx)
    expect(container.querySelector('svg.breadboard').classList.contains('breadboard--selected')).toBe(true)
    expect(BB_CSS).toMatch(/\.breadboard--selected\s*\{/)
  })

  it('T9 — occupied toujours représenté', () => {
    const led = { uid: 'led1', type: 'LED', x: -2, y: 12 }
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[led]} />)
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(2)
    expect(BB_CSS).toMatch(/\.breadboard__hole--occupied\s*[,{]/)
  })

  it('T10 — bus-active toujours représenté', () => {
    const ra = { uid: 'ra', type: 'RESISTOR', x: 60, y: 22 }
    const rb = { uid: 'rb', type: 'RESISTOR', x: 60, y: 34 }
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[ra, rb]} />)
    expect(container.querySelectorAll('.breadboard__hole--bus-active').length).toBe(4)
    expect(BB_CSS).toMatch(/\.breadboard__hole--bus-active\s*\{/)
  })

  it('T11 — feedback-valid toujours représenté', () => {
    const r1 = { uid: 'r1', type: 'RESISTOR', x: -24, y: 22 }
    const feedback = { draggedIds: new Set(['r1']), valid: true }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[r1]} breadboardFeedback={feedback} />
    )
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(1)
    expect(BB_CSS).toMatch(/\.breadboard__hole--feedback-valid\s*\{/)
  })

  it('T12 — feedback-invalid toujours représenté', () => {
    const r1 = { uid: 'r1', type: 'RESISTOR', x: -24, y: 22 }
    const feedback = { draggedIds: new Set(['r1']), valid: false }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[r1]} breadboardFeedback={feedback} />
    )
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(1)
    expect(BB_CSS).toMatch(/\.breadboard__hole--feedback-invalid\s*\{/)
  })

  it('T14 — breadboard drag inchangé : mousedown bouton gauche → selectOnly + startBreadboardDrag', () => {
    const ctx = makeCtx()
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />, ctx)
    const svg = container.querySelector('svg.breadboard')
    svg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(ctx.selectOnly).toHaveBeenCalledWith({ type: 'breadboard', id: 'bb1' })
    expect(ctx.startBreadboardDrag).toHaveBeenCalledTimes(1)
  })
})

describe('MB-VIS-BREAD-041 — présentation réconciliée (corps clair, relief léger, ombre courte)', () => {
  it('corps plastique clair — plus de thème sombre résiduel (aucune définition #1e293b / #1f293b sur le body)', () => {
    const bodyBlocks = [...BB_CSS.matchAll(/\.breadboard__body\s*\{([^}]*)\}/g)].map((m) => m[1])
    expect(bodyBlocks.length).toBe(1) // une seule génération, plus d'empilement
    const fill = /fill:\s*(#[0-9a-fA-F]{3,8})/.exec(bodyBlocks[0])?.[1]?.toLowerCase()
    expect(fill).toBeTruthy()
    // clair : chaque canal RVB >= 0xC0
    const r = parseInt(fill.slice(1, 3), 16)
    const g = parseInt(fill.slice(3, 5), 16)
    const b = parseInt(fill.slice(5, 7), 16)
    expect(Math.min(r, g, b)).toBeGreaterThanOrEqual(0xc0)
  })

  it('trous : une seule définition de base, centre sombre, liseré fin (pas de halo épais)', () => {
    const holeBlocks = [...BB_CSS.matchAll(/\.breadboard__hole\s*\{([^}]*)\}/g)].map((m) => m[1])
    expect(holeBlocks.length).toBe(1)
    const fill = /fill:\s*(#[0-9a-fA-F]{6})/.exec(holeBlocks[0])[1].toLowerCase()
    const lum = parseInt(fill.slice(1, 3), 16) + parseInt(fill.slice(3, 5), 16) + parseInt(fill.slice(5, 7), 16)
    expect(lum).toBeLessThan(180) // centre nettement sombre
    const sw = parseFloat(/stroke-width:\s*([\d.]+)/.exec(holeBlocks[0])[1])
    expect(sw).toBeLessThanOrEqual(1) // liseré fin, pas un halo
  })

  it('ombre de contact : une seule, courte et discrète (offset y <= 4, pas de glow large)', () => {
    const bbBlock = /\.breadboard\s*\{([^}]*)\}/.exec(BB_CSS)[1]
    const ds = /filter:\s*drop-shadow\(([^)]+)\)/.exec(bbBlock)[1].trim().split(/\s+/)
    // format: 0 3px 4px rgba(...)
    const offY = parseFloat(ds[1])
    const blur = parseFloat(ds[2])
    expect(offY).toBeLessThanOrEqual(4)
    expect(blur).toBeLessThanOrEqual(6)
  })

  it('aucun filtre par trou (perf : ~420 trous) — .breadboard__hole ne porte pas de filter', () => {
    const holeBlocks = [...BB_CSS.matchAll(/\.breadboard__hole\s*\{([^}]*)\}/g)].map((m) => m[1])
    for (const b of holeBlocks) expect(b).not.toMatch(/filter:/)
  })

  it('repères plus discrets que les trous : rail-label <= 12px', () => {
    const rl = /\.breadboard__rail-label\s*\{([^}]*)\}/.exec(BB_CSS)[1]
    const fs = parseFloat(/font-size:\s*([\d.]+)px/.exec(rl)[1])
    expect(fs).toBeLessThanOrEqual(12)
  })
})
