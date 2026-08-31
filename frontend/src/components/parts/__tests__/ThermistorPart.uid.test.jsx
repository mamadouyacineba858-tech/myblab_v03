/**
 * ThermistorPart.uid.test.jsx — MB-VIS-LED-014 (§5 / §11)
 *
 * MB-VIS-LED-014 introduit des `<defs>` (3 gradients : metal / bead / edge)
 * dans ThermistorPart : ce fichier verrouille le contrat de namespace SVG
 * correspondant — chaque instance dérive TOUS ses ids de sa prop `uid`
 * (sanitizée), de sorte que deux thermistances sur le même canvas ne
 * partagent aucun id (cf. audit MB-VIS-RENDER-009 §4.F : id non namespacé =
 * collision latente entre instances dans un même document SVG).
 *
 * Aucun garde existant ne couvre cette propriété pour THERMISTOR
 * (renderQualityGate T8 = déterminisme mêmes props ; RealisticRenderers /
 * partDimensions* = aria-label + dimensions). Ce fichier est donc l'unique
 * garde du contrat UID de ThermistorPart (§5 : pas de redondance).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ThermistorPart } from '../ThermistorPart.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = resolve(__dirname, '../ThermistorPart.jsx')

function svgIds(container) {
  return [...container.querySelectorAll('svg [id]')].map((el) => el.getAttribute('id'))
}

describe('MB-VIS-LED-014 — THERMISTOR : namespace SVG dérivé de uid', () => {
  it('A. uid absent : rendu valide, ids sur le fallback déterministe "thermistor"', () => {
    const { container } = render(<ThermistorPart />)
    expect(container.querySelector('[aria-label="Thermistance"]')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => v.startsWith('thermistor-'))).toBe(true)
    expect(container.innerHTML).toContain('url(#thermistor-metal)')
    expect(container.innerHTML).toContain('url(#thermistor-bead)')
  })

  it('B/C. uid="thermistor-a" : tous les ids SVG sont préfixés par "thermistor-a-"', () => {
    const { container } = render(<ThermistorPart uid="thermistor-a" />)
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => v.startsWith('thermistor-a-'))).toBe(true)
    expect(container.innerHTML).toContain('url(#thermistor-a-edge)')
  })

  it('D/E. uid="thermistor-a" et uid="thermistor-b" dans le même document : aucun id partagé', () => {
    const { container } = render(
      <>
        <ThermistorPart uid="thermistor-a" />
        <ThermistorPart uid="thermistor-b" />
      </>
    )
    const ids = svgIds(container)
    const a = ids.filter((v) => v.startsWith('thermistor-a-'))
    const b = ids.filter((v) => v.startsWith('thermistor-b-'))
    expect(a.length).toBeGreaterThan(0)
    expect(b.length).toBe(a.length)
    expect(a.some((v) => b.includes(v))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('F. uid avec caractères spéciaux : sanitizé, aucun caractère non [A-Za-z0-9_-] dans les ids', () => {
    const { container } = render(<ThermistorPart uid="th #1/α" />)
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => /^th__1__-/.test(v))).toBe(true)
    expect(ids.every((v) => /^[A-Za-z0-9_-]+$/.test(v))).toBe(true)
    expect(container.querySelector('#th__1__-bead')).not.toBeNull()
  })

  it('G. aucun id SVG statique dans la source (forme JSX `id={` uniquement)', () => {
    const source = readFileSync(SOURCE_PATH, 'utf-8')
    expect(source).not.toMatch(/\bid="/)
    expect(source).toMatch(/const id = String\(uid \?\? 'thermistor'\)\.replace\(/)
  })

  it('H. déterminisme préservé : deux rendus identiques pour un même uid', () => {
    const first = render(<ThermistorPart uid="thermistor-a" />)
    const html1 = first.container.innerHTML
    first.unmount()
    const second = render(<ThermistorPart uid="thermistor-a" />)
    const html2 = second.container.innerHTML
    second.unmount()
    expect(html2).toBe(html1)
  })
})
