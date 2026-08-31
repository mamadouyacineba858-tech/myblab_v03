/**
 * DiodePart.uid.test.jsx — MB-VIS-LED-012 (§5 / §10)
 *
 * MB-VIS-LED-012 introduit des `<defs>` (4 gradients) dans DiodePart : ce
 * fichier verrouille le contrat de namespace SVG correspondant — chaque
 * instance dérive TOUS ses ids de sa prop `uid` (sanitizée), de sorte que
 * deux diodes sur le même canvas ne partagent aucun id (cf. audit
 * MB-VIS-RENDER-009 §4.F : id non namespacé = collision latente entre
 * instances dans un même document SVG).
 *
 * Aucun garde existant ne couvre cette propriété pour DIODE (renderQualityGate
 * T8 = déterminisme mêmes props ; RealisticRenderers / partDimensions* =
 * aria-label + dimensions). Ce fichier est donc l'unique garde du contrat UID
 * de DiodePart (§10 : pas de redondance).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DiodePart } from '../DiodePart.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = resolve(__dirname, '../DiodePart.jsx')

function svgIds(container) {
  return [...container.querySelectorAll('svg [id]')].map((el) => el.getAttribute('id'))
}

describe('MB-VIS-LED-012 — DIODE : namespace SVG dérivé de uid', () => {
  it('A. uid absent : rendu valide, ids sur le fallback déterministe "diode"', () => {
    const { container } = render(<DiodePart />)
    expect(container.querySelector('[aria-label="Diode"]')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => v.startsWith('diode-'))).toBe(true)
    expect(container.innerHTML).toContain('url(#diode-metal)')
    expect(container.innerHTML).toContain('url(#diode-body)')
  })

  it('B. uid="diode-a" : tous les ids SVG sont préfixés par "diode-a-"', () => {
    const { container } = render(<DiodePart uid="diode-a" />)
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => v.startsWith('diode-a-'))).toBe(true)
    expect(container.innerHTML).toContain('url(#diode-a-body)')
  })

  it('C. uid="diode-a" et uid="diode-b" dans le même document : aucun id partagé', () => {
    const { container } = render(
      <>
        <DiodePart uid="diode-a" />
        <DiodePart uid="diode-b" />
      </>
    )
    const ids = svgIds(container)
    const a = ids.filter((v) => v.startsWith('diode-a-'))
    const b = ids.filter((v) => v.startsWith('diode-b-'))
    expect(a.length).toBeGreaterThan(0)
    expect(b.length).toBe(a.length)
    expect(a.some((v) => b.includes(v))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('D. aucun id SVG statique dans la source (forme JSX `id={` uniquement)', () => {
    const source = readFileSync(SOURCE_PATH, 'utf-8')
    expect(source).not.toMatch(/\bid="/)
    expect(source).toMatch(/const id = String\(uid \?\? 'diode'\)\.replace\(/)
  })

  it('E. uid avec caractères spéciaux : sanitizé, aucun caractère non [A-Za-z0-9_-] dans les ids', () => {
    const { container } = render(<DiodePart uid="dio #1/α" />)
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => /^dio__1__-/.test(v))).toBe(true)
    expect(ids.every((v) => /^[A-Za-z0-9_-]+$/.test(v))).toBe(true)
    expect(container.querySelector('#dio__1__-band')).not.toBeNull()
  })

  it('déterminisme préservé : deux rendus identiques pour un même uid', () => {
    const first = render(<DiodePart uid="diode-a" />)
    const html1 = first.container.innerHTML
    first.unmount()
    const second = render(<DiodePart uid="diode-a" />)
    const html2 = second.container.innerHTML
    second.unmount()
    expect(html2).toBe(html1)
  })
})
