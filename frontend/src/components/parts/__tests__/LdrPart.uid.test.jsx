/**
 * LdrPart.uid.test.jsx — MB-VIS-LED-013 (§6 / §11)
 *
 * MB-VIS-LED-013 introduit des `<defs>` (3 gradients : metal / ceramic / face)
 * dans LdrPart : ce fichier verrouille le contrat de namespace SVG
 * correspondant — chaque instance dérive TOUS ses ids de sa prop `uid`
 * (sanitizée), de sorte que deux LDR sur le même canvas ne partagent aucun id
 * (cf. audit MB-VIS-RENDER-009 §4.F : id non namespacé = collision latente
 * entre instances dans un même document SVG).
 *
 * Aucun garde existant ne couvre cette propriété pour LDR (renderQualityGate
 * T8 = déterminisme mêmes props ; RealisticRenderers / partDimensions* =
 * aria-label + dimensions). Ce fichier est donc l'unique garde du contrat UID
 * de LdrPart (§6 : pas de redondance).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { LdrPart } from '../LdrPart.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = resolve(__dirname, '../LdrPart.jsx')

function svgIds(container) {
  return [...container.querySelectorAll('svg [id]')].map((el) => el.getAttribute('id'))
}

describe('MB-VIS-LED-013 — LDR : namespace SVG dérivé de uid', () => {
  it('A. uid absent : rendu valide, ids sur le fallback déterministe "ldr"', () => {
    const { container } = render(<LdrPart />)
    expect(container.querySelector('[aria-label="Photorésistance"]')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => v.startsWith('ldr-'))).toBe(true)
    expect(container.innerHTML).toContain('url(#ldr-metal)')
    expect(container.innerHTML).toContain('url(#ldr-face)')
  })

  it('B. uid="ldr-a" : tous les ids SVG sont préfixés par "ldr-a-"', () => {
    const { container } = render(<LdrPart uid="ldr-a" />)
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => v.startsWith('ldr-a-'))).toBe(true)
    expect(container.innerHTML).toContain('url(#ldr-a-ceramic)')
  })

  it('C. uid="ldr-a" et uid="ldr-b" dans le même document : aucun id partagé', () => {
    const { container } = render(
      <>
        <LdrPart uid="ldr-a" />
        <LdrPart uid="ldr-b" />
      </>
    )
    const ids = svgIds(container)
    const a = ids.filter((v) => v.startsWith('ldr-a-'))
    const b = ids.filter((v) => v.startsWith('ldr-b-'))
    expect(a.length).toBeGreaterThan(0)
    expect(b.length).toBe(a.length)
    expect(a.some((v) => b.includes(v))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('D. uid avec caractères spéciaux : sanitizé, aucun caractère non [A-Za-z0-9_-] dans les ids', () => {
    const { container } = render(<LdrPart uid="ldr #1/α" />)
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => /^ldr__1__-/.test(v))).toBe(true)
    expect(ids.every((v) => /^[A-Za-z0-9_-]+$/.test(v))).toBe(true)
    expect(container.querySelector('#ldr__1__-face')).not.toBeNull()
  })

  it('E. aucun id SVG statique dans la source (forme JSX `id={` uniquement)', () => {
    const source = readFileSync(SOURCE_PATH, 'utf-8')
    expect(source).not.toMatch(/\bid="/)
    expect(source).toMatch(/const id = String\(uid \?\? 'ldr'\)\.replace\(/)
  })

  it('F. déterminisme préservé : deux rendus identiques pour un même uid', () => {
    const first = render(<LdrPart uid="ldr-a" />)
    const html1 = first.container.innerHTML
    first.unmount()
    const second = render(<LdrPart uid="ldr-a" />)
    const html2 = second.container.innerHTML
    second.unmount()
    expect(html2).toBe(html1)
  })
})
