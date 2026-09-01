/**
 * Sidebar.test.jsx — MB-UX-COMPONENT-LIBRARY-SCROLL-001
 *
 * Verrouille l'accessibilité de TOUS les composants de la bibliothèque
 * (bug observé : DIODE et les items suivants tombaient sous la zone visible,
 * sans possibilité de défilement) :
 *  - chaque entrée de PALETTE_ITEMS produit un bouton .myblab-palette__item ;
 *  - la liste est dans un conteneur défilant dédié
 *    (.myblab-sidebar__section--scroll > .myblab-palette) — scroll limité à
 *    la bibliothèque, pas à toute l'application ;
 *  - le clic et le drag & drop des items sont préservés.
 *
 * jsdom ne calcule pas le layout : ce test verrouille la STRUCTURE (présence
 * de tous les items + conteneur de scroll) et le COMPORTEMENT (clic/drag),
 * pas le rendu pixel du défilement.
 */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar.jsx'
import { PALETTE_ITEMS } from '../../config/componentDefinitions.js'
import { CircuitProvider } from '../../context/CircuitContext.jsx'
import { useCircuit } from '../../context/useCircuit.js'

const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

/** Rend la Sidebar + expose l'API circuit pour observer addComponent. */
function renderSidebar() {
  let api
  function Probe() {
    api = useCircuit()
    return <Sidebar />
  }
  const utils = render(<Probe />, { wrapper })
  return { ...utils, getApi: () => api }
}

describe('MB-UX-COMPONENT-LIBRARY-SCROLL-001 — bibliothèque de composants accessible', () => {
  it('rend un bouton pour CHAQUE composant de PALETTE_ITEMS (aucun item masqué), DIODE inclus', () => {
    const { container } = renderSidebar()
    const items = [...container.querySelectorAll('.myblab-palette__item')]
    expect(items.length).toBe(PALETTE_ITEMS.length)
    const labels = items.map((b) => b.textContent.trim())
    for (const item of PALETTE_ITEMS) {
      expect(labels.some((l) => l.includes(item.label)), `label manquant : ${item.label}`).toBe(true)
    }
    // le composant explicitement signalé dans le bug
    expect(labels.some((l) => l.toLowerCase().includes('diode'))).toBe(true)
  })

  it('la liste est dans un conteneur défilant dédié (scroll limité à la bibliothèque)', () => {
    const { container } = renderSidebar()
    const scrollSection = container.querySelector('.myblab-sidebar__section--scroll')
    expect(scrollSection, 'section de scroll dédiée absente').not.toBeNull()
    const palette = scrollSection.querySelector('.myblab-palette')
    expect(palette, '.myblab-palette doit vivre dans la section de scroll').not.toBeNull()
    expect(palette.querySelectorAll('.myblab-palette__item').length).toBe(PALETTE_ITEMS.length)
    // l'en-tête "Composants" reste dans la section mais HORS de la zone scrollée
    expect(scrollSection.querySelector('.myblab-sidebar__title')).not.toBeNull()
  })

  it('le clic sur un item (DIODE) ajoute le composant correspondant au circuit', () => {
    const { container, getApi } = renderSidebar()
    const before = getApi().components.length
    const diodeBtn = [...container.querySelectorAll('.myblab-palette__item')]
      .find((b) => b.textContent.toLowerCase().includes('diode'))
    expect(diodeBtn).toBeTruthy()
    fireEvent.click(diodeBtn)
    const after = getApi().components
    expect(after.length).toBe(before + 1)
    expect(after[after.length - 1].type).toBe('DIODE')
  })

  it('le drag & drop des items est préservé (draggable + dataTransfer du type)', () => {
    const { container } = renderSidebar()
    const diodeBtn = [...container.querySelectorAll('.myblab-palette__item')]
      .find((b) => b.textContent.toLowerCase().includes('diode'))
    expect(diodeBtn.draggable).toBe(true)
    const setData = vi.fn()
    fireEvent.dragStart(diodeBtn, { dataTransfer: { setData, effectAllowed: 'copy' } })
    expect(setData).toHaveBeenCalledWith('application/myblab-component', 'DIODE')
  })
})
