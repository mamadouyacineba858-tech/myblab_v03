/**
 * componentAssetValidation.test.jsx — MB-VIS-PROTOTYPE-001A
 *
 * Verrouille le harnais de validation d'asset :
 *  - dérivation des attendus RESISTOR depuis les sources de vérité
 *    (componentDefinitions.js + visualContract.js) — aucune valeur réécrite ;
 *  - fonction pure validateComponentAsset : cas PASS + chaque mode d'échec ;
 *  - attributs d'intégration <img> dérivés du contrat ;
 *  - PREUVE DOM de la forme d'intégration (§16 K/M/N/O) sans rendre
 *    CircuitComponent ni modifier aucun fichier de production.
 *
 * Environnement jsdom (fichier .test.jsx).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import {
  deriveComponentAssetSpec, validateComponentAsset, integrationImgAttrs,
  typeToKebab, RESISTOR_ASSET_SPEC,
} from '../componentAssetValidation.js'
import { getComponentDef } from '../../../config/componentDefinitions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MODULE_PATH = resolve(__dirname, '../componentAssetValidation.js')

const DIR = 'frontend/public/assets/components/resistor'
const P = (res, ext) => `${DIR}/resistor.default.${res}.${ext}`

/** Sonde synthétique d'un asset conforme (pas une vraie image). */
function goodProbe(overrides = {}) {
  const mk = (w, h) => ({ exists: true, bytes: 12 * 1024, width: w, height: h, hasAlpha: true, fullyOpaque: false, sha256: 'h' })
  const files = {
    [P('1x', 'webp')]: mk(170, 57),
    [P('3x', 'webp')]: mk(510, 171),
    [P('1x', 'png')]: mk(170, 57),
    [P('3x', 'png')]: mk(510, 171),
  }
  for (const [k, v] of Object.entries(overrides.files || {})) files[k] = { ...files[k], ...v }
  return { files, determinism: overrides.determinism }
}

describe('001A — deriveComponentAssetSpec(RESISTOR) : dérivée, non redéfinie', () => {
  const spec = deriveComponentAssetSpec('RESISTOR', { fillFactorKey: 'AXIAL_LEADED' })

  it('box === getComponentDef("RESISTOR").width/height (84×28)', () => {
    const def = getComponentDef('RESISTOR')
    expect(spec.box).toEqual([def.width, def.height])
    expect(spec.box).toEqual([84, 28])
  })

  it('pinAnchors === A(0,14) / B(84,14) depuis getComponentDef', () => {
    expect(spec.pinAnchors).toEqual([
      { id: 'A', x: 0, y: 14 },
      { id: 'B', x: 84, y: 14 },
    ])
  })

  it('fillFactor = FILL_FACTOR.AXIAL_LEADED = 0.62', () => {
    expect(spec.fillFactorKey).toBe('AXIAL_LEADED')
    expect(spec.fillFactor).toBe(0.62)
  })

  it('assetDir + 4 fichiers attendus (webp+png × 1x+3x), budget simple 30 Ko', () => {
    expect(spec.assetDir).toBe(DIR)
    expect(spec.expectedFiles.map((f) => f.path).sort()).toEqual([
      P('1x', 'png'), P('1x', 'webp'), P('3x', 'png'), P('3x', 'webp'),
    ].sort())
    expect(spec.budget.maxKbPerVariant).toBe(30)
    expect(spec.resolutions).toEqual(['1x', '3x'])
    expect(spec.leadAnchorTolerancePx).toBe(0.75)
  })

  it('spec gelée ; RESISTOR_ASSET_SPEC identique', () => {
    expect(Object.isFrozen(spec)).toBe(true)
    expect(RESISTOR_ASSET_SPEC.box).toEqual(spec.box)
    expect(RESISTOR_ASSET_SPEC.expectedFiles).toEqual(spec.expectedFiles)
  })

  it('type inconnu → throw', () => {
    expect(() => deriveComponentAssetSpec('NOPE')).toThrow(/inconnu/)
  })

  it('typeToKebab : DC_MOTOR -> dc-motor', () => {
    expect(typeToKebab('DC_MOTOR')).toBe('dc-motor')
    expect(typeToKebab('RESISTOR')).toBe('resistor')
  })
})

describe('001A — validateComponentAsset : cas PASS', () => {
  const spec = deriveComponentAssetSpec('RESISTOR', { fillFactorKey: 'AXIAL_LEADED' })

  it('asset conforme + hashes déterministes égaux → ok:true, tous les contrôles ok', () => {
    const probe = goodProbe({
      determinism: {
        [P('3x', 'webp')]: { sha256_a: 'x', sha256_b: 'x' },
      },
    })
    const r = validateComponentAsset(spec, probe)
    expect(r.ok).toBe(true)
    expect(r.checks.every((c) => c.ok)).toBe(true)
    expect(r.checks.map((c) => c.id)).toEqual(
      expect.arrayContaining(['A', 'G', 'K', 'F', 'D', 'I', 'E/J', 'B/C', 'H', 'L'])
    )
  })
})

describe('001A — validateComponentAsset : modes d\'échec isolés', () => {
  const spec = deriveComponentAssetSpec('RESISTOR', { fillFactorKey: 'AXIAL_LEADED' })
  const failing = (r, id) => r.checks.find((c) => c.id === id && !c.ok)

  it('A — fichier manquant', () => {
    const probe = goodProbe({ files: { [P('3x', 'webp')]: { exists: false } } })
    const r = validateComponentAsset(spec, probe)
    expect(r.ok).toBe(false)
    expect(failing(r, 'A')).toBeTruthy()
  })

  it('E/J — dépassement de budget', () => {
    const probe = goodProbe({ files: { [P('3x', 'webp')]: { bytes: 64 * 1024 } } })
    const r = validateComponentAsset(spec, probe)
    expect(r.ok).toBe(false)
    expect(failing(r, 'E/J')).toBeTruthy()
  })

  it('I — fond opaque cuit', () => {
    const probe = goodProbe({ files: { [P('1x', 'png')]: { fullyOpaque: true } } })
    expect(validateComponentAsset(spec, probe).ok).toBe(false)
    expect(failing(validateComponentAsset(spec, probe), 'I')).toBeTruthy()
  })

  it('D — alpha absent', () => {
    const probe = goodProbe({ files: { [P('3x', 'png')]: { hasAlpha: false } } })
    expect(failing(validateComponentAsset(spec, probe), 'D')).toBeTruthy()
  })

  it('B/C — @3x ≠ 3 × @1x', () => {
    const probe = goodProbe({ files: { [P('3x', 'webp')]: { width: 400, height: 171 } } })
    expect(failing(validateComponentAsset(spec, probe), 'B/C')).toBeTruthy()
  })

  it('B/C — dimension > maxDimensionPx (1024)', () => {
    const probe = goodProbe({
      files: {
        [P('1x', 'webp')]: { width: 400, height: 134 },
        [P('3x', 'webp')]: { width: 1200, height: 402 },
      },
    })
    expect(failing(validateComponentAsset(spec, probe), 'B/C')).toBeTruthy()
  })

  it('H — dérive de déterminisme', () => {
    const probe = goodProbe({ determinism: { [P('3x', 'webp')]: { sha256_a: 'x', sha256_b: 'y' } } })
    expect(failing(validateComponentAsset(spec, probe), 'H')).toBeTruthy()
  })

  it('H — non bloquant si non fourni', () => {
    const r = validateComponentAsset(spec, goodProbe())
    const h = r.checks.find((c) => c.id === 'H')
    expect(h.ok).toBe(true)
    expect(h.detail).toMatch(/non fourni/)
  })
})

describe('001A — integrationImgAttrs : attributs dérivés du contrat', () => {
  const spec = deriveComponentAssetSpec('RESISTOR', { fillFactorKey: 'AXIAL_LEADED' })
  const attrs = integrationImgAttrs(spec, { src: 'a.webp', srcset: 'a.webp 1x, b.webp 3x' })

  it('width/height = boîte canonique ; draggable=false ; pointer-events:none', () => {
    expect(attrs.width).toBe(84)
    expect(attrs.height).toBe(28)
    expect(attrs.draggable).toBe(false)
    expect(attrs.style.pointerEvents).toBe('none')
    expect(attrs['aria-hidden']).toBe('true')
  })

  it('ne porte AUCUN gestionnaire d\'événement', () => {
    for (const k of Object.keys(attrs)) {
      expect(k).not.toMatch(/^on[A-Z]/)
    }
  })
})

describe('001A — PREUVE DOM de la forme d\'intégration (sans CircuitComponent, sans modif prod)', () => {
  const spec = deriveComponentAssetSpec('RESISTOR', { fillFactorKey: 'AXIAL_LEADED' })

  function mountCandidate() {
    const wrapper = document.createElement('div')
    wrapper.className = 'circuit-component__body'
    const img = document.createElement('img')
    const a = integrationImgAttrs(spec, { src: 'r.3x.webp', srcset: 'r.1x.webp 1x, r.3x.webp 3x' })
    img.setAttribute('src', a.src)
    img.setAttribute('srcset', a.srcset)
    img.setAttribute('width', String(a.width))
    img.setAttribute('height', String(a.height))
    img.draggable = a.draggable
    img.setAttribute('alt', a.alt)
    img.setAttribute('aria-hidden', a['aria-hidden'])
    img.style.width = a.style.width
    img.style.height = a.style.height
    img.style.pointerEvents = a.style.pointerEvents
    wrapper.appendChild(img)
    document.body.appendChild(wrapper)
    return { wrapper, img, cleanup: () => wrapper.remove() }
  }

  it('l\'<img> occupe la boîte canonique (width/height = getComponentDef)', () => {
    const { img, cleanup } = mountCandidate()
    const def = getComponentDef('RESISTOR')
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
    expect(img.style.width).toBe('100%')
    expect(img.style.height).toBe('100%')
    cleanup()
  })

  it('draggable=false, pointer-events:none, aucun handler sur l\'<img>', () => {
    const { img, cleanup } = mountCandidate()
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
    cleanup()
  })

  it('un événement sur l\'<img> remonte au wrapper (l\'image est transparente à l\'interaction)', () => {
    const { wrapper, img, cleanup } = mountCandidate()
    let wrapperGot = 0
    wrapper.addEventListener('pointerdown', () => { wrapperGot += 1 })
    img.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(wrapperGot).toBe(1)
    cleanup()
  })

  it('le candidat ne crée aucun pin ni logique de pin', () => {
    const { wrapper, cleanup } = mountCandidate()
    expect(wrapper.querySelectorAll('.myblab-pin').length).toBe(0)
    expect(wrapper.querySelectorAll('button').length).toBe(0)
    cleanup()
  })
})

describe('001A — garde-fou : harnais découplé de la couche fonctionnelle', () => {
  const source = readFileSync(MODULE_PATH, 'utf-8')
  it('n\'importe rien de simulator/ , CircuitComponent, Pin, registry, PartRenderer', () => {
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(codeOnly).not.toMatch(/from\s+["'][^"']*\/simulator\//)
    expect(codeOnly).not.toMatch(/CircuitComponent/)
    expect(codeOnly).not.toMatch(/\bPin\.jsx\b/)
    expect(codeOnly).not.toMatch(/\bregistry\.js\b/)
    expect(codeOnly).not.toMatch(/PartRenderer/)
  })
  it('importe getComponentDef en lecture seule (dérivation d\'attendus)', () => {
    expect(source).toMatch(/import \{ getComponentDef \} from '\.\.\/\.\.\/config\/componentDefinitions\.js'/)
  })
})
