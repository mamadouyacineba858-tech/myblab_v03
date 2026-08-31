/**
 * CapacitorPart.uid.test.jsx — MB-VIS-COMP-011 (§8 / §11)
 *
 * Verrouille le nouveau contrat de namespace SVG du CAPACITOR : chaque
 * instance dérive TOUS ses ids de `<defs>` de sa prop `uid` (sanitizée),
 * de sorte que deux condensateurs sur le même canvas ne partagent aucun
 * id — l'ancien id statique `capacitor-disk` provoquait une collision
 * (les gradients de la 2ᵉ instance étaient écrasés par ceux de la 1ʳᵉ dans
 * le même document SVG).
 *
 * Les gardes existants ne couvrent pas cette propriété :
 *  - renderQualityGate T8 vérifie le déterminisme (mêmes props -> même
 *    HTML) mais jamais l'unicité entre uids différents ;
 *  - RealisticRenderers / partDimensions* vérifient aria-label + dimensions.
 * Ce fichier est donc l'unique garde du contrat UID (§11 : pas de
 * redondance).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { CapacitorPart } from '../CapacitorPart.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = resolve(__dirname, '../CapacitorPart.jsx')

function svgIds(container) {
  return [...container.querySelectorAll('svg [id]')].map((el) => el.getAttribute('id'))
}

describe('MB-VIS-COMP-011 — CAPACITOR : namespace SVG dérivé de uid', () => {
  it('A. uid absent : rendu valide, ids sur le fallback déterministe "capacitor"', () => {
    const { container } = render(<CapacitorPart />)
    expect(container.querySelector('[aria-label="Condensateur"]')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => v.startsWith('capacitor-'))).toBe(true)
    // Les formes référencent bien ces gradients namespacés.
    expect(container.innerHTML).toContain('url(#capacitor-face)')
    expect(container.innerHTML).toContain('url(#capacitor-metal)')
  })

  it('B. uid="capacitor-a" : tous les ids SVG sont préfixés par "capacitor-a-"', () => {
    const { container } = render(<CapacitorPart uid="capacitor-a" />)
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => v.startsWith('capacitor-a-'))).toBe(true)
    expect(container.innerHTML).toContain('url(#capacitor-a-face)')
  })

  it('C. uid="capacitor-a" et uid="capacitor-b" dans le même document : aucun id partagé', () => {
    const { container } = render(
      <>
        <CapacitorPart uid="capacitor-a" />
        <CapacitorPart uid="capacitor-b" />
      </>
    )
    const ids = svgIds(container)
    const a = ids.filter((v) => v.startsWith('capacitor-a-'))
    const b = ids.filter((v) => v.startsWith('capacitor-b-'))
    expect(a.length).toBeGreaterThan(0)
    expect(b.length).toBe(a.length)
    // Aucune intersection, et aucune collision globale (Set == total).
    expect(a.some((v) => b.includes(v))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('D. aucun id SVG statique : "capacitor-disk" absent du rendu, aucun id="..." littéral dans la source', () => {
    const { container } = render(<CapacitorPart uid="capacitor-a" />)
    expect(container.querySelector('#capacitor-disk')).toBeNull()
    const source = readFileSync(SOURCE_PATH, 'utf-8')
    expect(source).not.toMatch(/id="capacitor-disk"/)
    // Tout id de <defs> dans la source passe par l'interpolation `${id}-...`
    // (aucun attribut `id="literal"` — forme JSX `id={` uniquement).
    expect(source).not.toMatch(/\bid="/)
    expect(source).toMatch(/const id = String\(uid \?\? 'capacitor'\)\.replace\(/)
  })

  it('E. uid avec caractères spéciaux : sanitizé, aucun caractère non [A-Za-z0-9_-] dans les ids', () => {
    const { container } = render(<CapacitorPart uid="cap #1/α" />)
    const ids = svgIds(container)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((v) => /^cap__1__-/.test(v))).toBe(true)
    expect(ids.every((v) => /^[A-Za-z0-9_-]+$/.test(v))).toBe(true)
    expect(container.querySelector('#cap__1__-face')).not.toBeNull()
  })

  it('déterminisme préservé : deux rendus identiques pour un même uid', () => {
    const first = render(<CapacitorPart uid="capacitor-a" />)
    const html1 = first.container.innerHTML
    first.unmount()
    const second = render(<CapacitorPart uid="capacitor-a" />)
    const html2 = second.container.innerHTML
    second.unmount()
    expect(html2).toBe(html1)
  })
})
