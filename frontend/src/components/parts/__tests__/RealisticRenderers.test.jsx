/**
 * RealisticRenderers.test.jsx — MB-VIS-002 (GATE 2, ruling CSA GATE 1 PASS).
 *
 * Couvre le premier lot (RESISTOR / LED / CAPACITOR / DIODE) :
 *  - structurel : le renderer existe, est enregistré dans
 *    DEFAULT_REGISTRATIONS, et se résout via RendererRegistry /
 *    VisualizationManager (exactement le mécanisme réel de production,
 *    utilisé par PartRenderer.jsx — aucune invention d'API) ;
 *  - rendu : chaque renderer produit un élément racine avec l'aria-label
 *    attendu, et un <svg> dont viewBox/width/height correspondent
 *    EXACTEMENT aux dimensions déclarées dans componentDefinitions.js
 *    (contrat géométrique §6 du ticket — non modifié par ce ticket, vérifié
 *    ici par comparaison directe avec la source de vérité réelle, pas par
 *    une valeur recopiée à la main) ;
 *  - dynamique (LED) : la classe part-led--on suit fidèlement la prop
 *    isOn, sans changement de comportement par rapport à la version
 *    précédente du composant.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ResistorPart } from '../ResistorPart.jsx'
import { LedPart } from '../LedPart.jsx'
import { CapacitorPart } from '../CapacitorPart.jsx'
import { DiodePart } from '../DiodePart.jsx'
import { DEFAULT_REGISTRATIONS, getComponentByType } from '../../../visualization/defaultRegistrations.js'
import { createDefaultVisualizationManager } from '../../../visualization/factory.js'
import { getComponentDef } from '../../../config/componentDefinitions.js'

const LOT = [
  { type: 'RESISTOR', Component: ResistorPart, label: 'Résistance' },
  { type: 'LED', Component: LedPart, label: null }, // aria-label dépend de isOn
  { type: 'CAPACITOR', Component: CapacitorPart, label: 'Condensateur' },
  { type: 'DIODE', Component: DiodePart, label: 'Diode' },
]

describe('MB-VIS-002 — premier lot de renderers réalistes (structurel)', () => {
  it.each(LOT.map((entry) => entry.type))(
    "%s est enregistré dans DEFAULT_REGISTRATIONS et s'y résout vers le bon composant",
    (type) => {
      const expected = LOT.find((entry) => entry.type === type).Component
      expect(getComponentByType(type)).toBe(expected)
      expect(DEFAULT_REGISTRATIONS.some((entry) => entry.type === type && entry.component === expected)).toBe(true)
    }
  )

  it.each(LOT.map((entry) => entry.type))(
    '%s se résout via VisualizationManager.render (mécanisme réel de PartRenderer.jsx)',
    (type) => {
      const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
      const element = manager.render(type, type === 'LED' ? { isOn: false } : {})
      expect(element).not.toBeNull()
    }
  )
})

describe('MB-VIS-002 — premier lot de renderers réalistes (rendu, contrat géométrique)', () => {
  it.each(LOT)('$type : le <svg> respecte exactement les dimensions de componentDefinitions.js', ({ type, Component }) => {
    const def = getComponentDef(type)
    const { container } = render(<Component isOn={false} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('width')).toBe(String(def.width))
    expect(svg.getAttribute('height')).toBe(String(def.height))
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${def.width} ${def.height}`)
  })

  it('RESISTOR : aria-label correct, aucune prop dynamique requise', () => {
    const { container } = render(<ResistorPart />)
    expect(container.querySelector('[aria-label="Résistance"]')).not.toBeNull()
  })

  it('CAPACITOR : aria-label correct, aucune prop dynamique requise', () => {
    const { container } = render(<CapacitorPart />)
    expect(container.querySelector('[aria-label="Condensateur"]')).not.toBeNull()
  })

  it('DIODE : aria-label correct, aucune prop dynamique requise', () => {
    const { container } = render(<DiodePart />)
    expect(container.querySelector('[aria-label="Diode"]')).not.toBeNull()
  })
})

describe('MB-VIS-002 — LED : état dynamique isOn préservé (comportement inchangé)', () => {
  it('isOn=false : pas de classe part-led--on, aria-label "LED éteinte"', () => {
    const { container } = render(<LedPart isOn={false} />)
    const root = container.querySelector('.part-led')
    expect(root.className).not.toMatch(/part-led--on/)
    expect(root.getAttribute('aria-label')).toBe('LED éteinte')
  })

  it('isOn=true : classe part-led--on présente, aria-label "LED allumée"', () => {
    const { container } = render(<LedPart isOn={true} />)
    const root = container.querySelector('.part-led')
    expect(root.className).toMatch(/part-led--on/)
    expect(root.getAttribute('aria-label')).toBe('LED allumée')
  })
})
