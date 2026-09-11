/**
 * ComponentPreview.test.jsx — MB-VIS-LAB-046 (§11).
 *
 * Verrouille le canal générique type -> renderer de la palette Sidebar
 * (ComponentPreview.jsx), qui remplace l'exception LED (Sidebar.jsx
 * historique) sans introduire de second registre ni de branche par type
 * (I-046-15/16/17/18). Réutilise strictement PartRenderer.jsx (donc
 * DEFAULT_REGISTRATIONS + VisualizationManager + VisualStateRegistry),
 * comme canvas/ComponentInsertGhost.jsx (BREAD-042) le fait déjà pour
 * l'aperçu de drag — jamais un second mécanisme de dessin.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { ComponentPreview } from '../ComponentPreview.jsx'
import { PALETTE_ITEMS } from '../../config/componentDefinitions.js'
import { CircuitProvider } from '../../context/CircuitContext.jsx'
import { useCircuit } from '../../context/useCircuit.js'
import { useCircuitInteraction } from '../../context/useCircuitInteraction.js'

describe('MB-VIS-LAB-046 — ComponentPreview.jsx (canal générique palette, F9/F10/F11)', () => {
  it('T2/T18 — TOUS les types de PALETTE_ITEMS (catalogue réel, aucune liste inventée) rendent sans erreur via le même mécanisme générique', () => {
    for (const item of PALETTE_ITEMS) {
      const { container, unmount } = render(<ComponentPreview type={item.id} />)
      const root = container.querySelector('.component-preview')
      expect(root, `type ${item.id} : .component-preview absent`).not.toBe(null)
      const stage = root.querySelector('.component-preview__stage')
      expect(stage, `type ${item.id} : .component-preview__stage absent`).not.toBe(null)
      unmount()
    }
  })

  it('T3 — LED : preview fonctionne, état neutre/off (F11 — aucune simulation)', () => {
    const { container } = render(<ComponentPreview type="LED" />)
    const led = container.querySelector('.part-led')
    expect(led).not.toBe(null)
    expect(led.className).not.toMatch(/part-led--on/)
    expect(led.getAttribute('aria-label')).toBe('LED éteinte')
  })

  it('T4 — RESISTOR : preview fonctionne', () => {
    const { container } = render(<ComponentPreview type="RESISTOR" />)
    expect(container.querySelector('[aria-label="Résistance"]')).not.toBe(null)
  })

  it('T5 — ARDUINO : preview fonctionne (backend raster, <img> réel)', () => {
    const { container } = render(<ComponentPreview type="ARDUINO" />)
    expect(container.querySelector('img')).not.toBe(null)
  })

  it('T6 — POWER : preview fonctionne (backend raster, <img> réel)', () => {
    const { container } = render(<ComponentPreview type="POWER" />)
    expect(container.querySelector('img')).not.toBe(null)
  })

  it('T7 — RGB_LED : preview fonctionne en état neutre/off (F11)', () => {
    const { container } = render(<ComponentPreview type="RGB_LED" />)
    const rgb = container.querySelector('.part-rgb-led')
    expect(rgb).not.toBe(null)
    expect(rgb.getAttribute('data-state')).toBe('off')
  })

  it('T8 — BUTTON : preview fonctionne en état neutre/released (dérivé de componentDefinitions.js#initialState, F11)', () => {
    const { container } = render(<ComponentPreview type="BUTTON" />)
    const btn = container.querySelector('.part-button')
    expect(btn).not.toBe(null)
    expect(btn.className).not.toMatch(/part-button--pressed/)
  })

  it('T9 — BUTTON_LATCHING : preview fonctionne en état neutre/off (dérivé de componentDefinitions.js#initialState, F11)', () => {
    const { container } = render(<ComponentPreview type="BUTTON_LATCHING" />)
    const btn = container.querySelector('.part-latching-button')
    expect(btn).not.toBe(null)
    expect(btn.className).not.toMatch(/is-on/)
    expect(btn.getAttribute('aria-label')).toBe('Interrupteur désactivé')
  })

  it('T10 — un composant petit/vertical (POLARIZED_CAPACITOR, boîte canonique 33×120) reste contenu dans le cadre de la cellule (F10, aucune dimension canonique modifiée)', () => {
    const { container } = render(<ComponentPreview type="POLARIZED_CAPACITOR" />)
    const stage = container.querySelector('.component-preview__stage')
    const scale = Number(stage.style.transform.match(/scale\(([\d.]+)\)/)?.[1])
    expect(scale).toBeGreaterThan(0)
    // Boîte canonique inchangée (componentDefinitions.js, non modifié) —
    // la mise à l'échelle DOIT tenir le contenu dans le cadre 42×38.
    expect(parseFloat(stage.style.width)).toBe(33)
    expect(parseFloat(stage.style.height)).toBe(120)
    expect(scale * 33).toBeLessThanOrEqual(42 + 0.01)
    expect(scale * 120).toBeLessThanOrEqual(38 + 0.01)
  })

  it('T11 — un composant large/complexe (ARDUINO, boîte canonique 120×140) reste contenu dans le cadre de la cellule (F10)', () => {
    const { container } = render(<ComponentPreview type="ARDUINO" />)
    const stage = container.querySelector('.component-preview__stage')
    const scale = Number(stage.style.transform.match(/scale\(([\d.]+)\)/)?.[1])
    expect(parseFloat(stage.style.width)).toBe(120)
    expect(parseFloat(stage.style.height)).toBe(140)
    expect(scale * 120).toBeLessThanOrEqual(42 + 0.01)
    expect(scale * 140).toBeLessThanOrEqual(38 + 0.01)
  })

  it('T12 — aucun <Pin> interactif : 0 bouton `.myblab-pin` dans une preview, quel que soit le nombre de pins du type (POTENTIOMETER, 3 contacts)', () => {
    const { container } = render(<ComponentPreview type="POTENTIOMETER" />)
    expect(container.querySelectorAll('.myblab-pin').length).toBe(0)
    // Aucun hit target de câblage générique non plus (aucun <button>).
    expect(container.querySelectorAll('button').length).toBe(0)
  })

  it("T13/T14/T15 — aucune entrée d'historique, aucune mutation Document, aucune Simulation déclenchée par le montage de previews (pipeline réel, CircuitProvider)", () => {
    let api = null
    function Probe() {
      api = { ...useCircuit(), ...useCircuitInteraction() }
      return null
    }
    const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
    render(<><Probe /><ComponentPreview type="LED" /><ComponentPreview type="RGB_LED" /><ComponentPreview type="BUTTON" /></>, { wrapper })

    expect(api.components.length).toBe(0)
    expect(api.getUndoCount()).toBe(0)
    expect(api.simulationActive).toBe(false)
  })

  it('T16 — la preview ne dépend ni du focus ni du localScale Canvas (sortie HTML rigoureusement identique, focus actif ailleurs ou non)', () => {
    const standalone = render(<ComponentPreview type="LED" />)
    const standaloneHtml = standalone.container.querySelector('.component-preview').outerHTML
    standalone.unmount()

    let api = null
    function Probe() {
      api = { ...useCircuit(), ...useCircuitInteraction() }
      return null
    }
    const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
    const { container } = render(<><Probe /><ComponentPreview type="LED" /></>, { wrapper })

    act(() => { api.addComponent('LED', 100, 100) })
    act(() => { api.focusComponent(api.components[0].uid) })
    act(() => { api.adjustLocalScale(0.4) })

    const previewHtml = container.querySelector('.component-preview').outerHTML
    // La preview (hors Canvas) ignore totalement le focus/localScale actifs
    // ailleurs dans l'application — aucune fuite d'état Canvas (I-046-24/25).
    expect(previewHtml).toBe(standaloneHtml)
  })

  it('T17 — un type sans état de Simulation (RESISTOR) reste affichable normalement aux côtés d\'un type avec état (LED)', () => {
    const { container } = render(<><ComponentPreview type="RESISTOR" /><ComponentPreview type="LED" /></>)
    expect(container.querySelectorAll('.component-preview').length).toBe(2)
    expect(container.querySelector('[aria-label="Résistance"]')).not.toBe(null)
    expect(container.querySelector('.part-led')).not.toBe(null)
  })

  it('type inconnu -> aucun rendu, aucun crash (repli symétrique de getComponentDef)', () => {
    const { container } = render(<ComponentPreview type="DOES_NOT_EXIST" />)
    expect(container.querySelector('.component-preview')).toBe(null)
  })
})
