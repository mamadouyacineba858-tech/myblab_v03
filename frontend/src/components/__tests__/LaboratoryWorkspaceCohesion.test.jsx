/**
 * LaboratoryWorkspaceCohesion.test.jsx — MB-VIS-LAB-046 (§12).
 *
 * Verrouille les invariants de "cohésion" qui n'étaient couverts par aucune
 * suite existante (aucun Navbar.test.jsx/SettingsPanel.test.jsx trouvé dans
 * le dépôt réel avant ce ticket) : les commandes Navbar existantes gardent
 * strictement leur comportement (aucune nouvelle commande métier — O2), et
 * SettingsPanel devient cohérent avec le thème actif (O7/F13), sans
 * introduire de second système de thème (le thème et sa classe
 * `.theme-${theme}` restent ceux d'App.jsx/useCircuitState.js, inchangés).
 *
 * Pipeline réel (CircuitProvider, vraies actions startSimulation/
 * stopSimulation/zoomIn/zoomOut/resetViewport/clearCircuit) — aucun mock du
 * Document. `window.confirm`/`URL.createObjectURL` sont neutralisés
 * (jsdom ne les implémente pas / une vraie boîte de dialogue ne doit pas
 * bloquer les tests) — comportement du CLIC, pas du dialogue navigateur.
 *
 * jsdom (config vitest de ce dépôt) ne calcule pas les styles importés via
 * `import "*.css"` (aucune cascade CSS réelle appliquée à
 * `getComputedStyle`) : la cohérence de thème (T29/T30) est donc verrouillée
 * en lisant le TEXTE SOURCE de App.css, même patron déjà établi par
 * canvas/__tests__/breadboardPhysicalReconciliation.test.jsx (`BB_CSS`) —
 * jamais une valeur de pixel inventée.
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { Navbar } from '../Navbar.jsx'
import { CircuitProvider } from '../../context/CircuitContext.jsx'
import { useCircuit } from '../../context/useCircuit.js'
import { useCircuitInteraction } from '../../context/useCircuitInteraction.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_CSS = readFileSync(resolve(__dirname, '../../App.css'), 'utf-8')
const SETTINGS_CSS = readFileSync(resolve(__dirname, '../SettingsPanel.css'), 'utf-8')

function renderNavbar(themeClassName = '') {
  let api = null
  function Probe() {
    api = { ...useCircuit(), ...useCircuitInteraction() }
    return null
  }
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  const utils = render(
    <div className={themeClassName}><Probe /><Navbar /></div>,
    { wrapper }
  )
  return { ...utils, getApi: () => api }
}

describe('MB-VIS-LAB-046 — Navbar : commandes existantes inchangées (O2, T19-T27)', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('T19 — toutes les commandes existantes sont présentes (aucune nouvelle commande métier)', () => {
    const { getByText, container } = renderNavbar()
    for (const label of ['Nouveau', 'Ouvrir', 'Sauvegarder', 'Vue', 'Contenu', 'Sélection']) {
      expect(getByText(new RegExp(label))).toBeTruthy()
    }
    expect(container.querySelector('button.play')).not.toBe(null)
    expect(container.querySelector('button.stop')).not.toBe(null)
    expect(container.querySelector('button.settings')).not.toBe(null)
  })

  it('T20 — "Nouveau" conserve son comportement (confirmation puis clearCircuit uniquement si confirmé)', () => {
    const { getByText, getApi } = renderNavbar()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    expect(getApi().components.length).toBe(1)

    vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(getByText('Nouveau'))
    expect(getApi().components.length).toBe(1) // refusé : aucun changement

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(getByText('Nouveau'))
    expect(getApi().components.length).toBe(0) // confirmé : clearCircuit()
  })

  it('T21 — "Ouvrir" conserve son comportement (déclenche le input file caché, aucune mutation directe)', () => {
    const { getByText, container, getApi } = renderNavbar()
    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).not.toBe(null)
    const clickSpy = vi.spyOn(fileInput, 'click')
    fireEvent.click(getByText('Ouvrir'))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(getApi().components.length).toBe(0)
  })

  it('T22 — "Sauvegarder" conserve son comportement (exporte le circuit réel, ne mute rien)', () => {
    const { getByText, getApi } = renderNavbar()
    act(() => { getApi().addComponent('LED', 100, 100) })
    const before = getApi().components.length

    expect(() => fireEvent.click(getByText('Sauvegarder'))).not.toThrow()
    expect(getApi().components.length).toBe(before)
  })

  it('T23 — "Simuler"/"Arrêter" conservent leur comportement (bascule simulationActive, disabled cohérent)', () => {
    const { container, getApi } = renderNavbar()
    const play = container.querySelector('button.play')
    const stop = container.querySelector('button.stop')

    expect(getApi().simulationActive).toBe(false)
    expect(play.disabled).toBe(false)
    expect(stop.disabled).toBe(true)

    fireEvent.click(play)
    expect(getApi().simulationActive).toBe(true)
    expect(play.disabled).toBe(true)
    expect(stop.disabled).toBe(false)

    fireEvent.click(stop)
    expect(getApi().simulationActive).toBe(false)
    expect(play.disabled).toBe(false)
    expect(stop.disabled).toBe(true)
  })

  it('T24 — Zoom +/- conservent leur comportement (viewport.zoom réel modifié)', () => {
    const { getByTitle, getApi } = renderNavbar()
    const before = getApi().viewport.zoom
    fireEvent.click(getByTitle('Zoom avant'))
    expect(getApi().viewport.zoom).toBeGreaterThan(before)
    const afterIn = getApi().viewport.zoom
    fireEvent.click(getByTitle('Zoom arrière'))
    expect(getApi().viewport.zoom).toBeLessThan(afterIn)
  })

  it('T25 — "Vue" (reset) conserve son comportement (revient au viewport par défaut)', () => {
    const { getByTitle, getApi } = renderNavbar()
    fireEvent.click(getByTitle('Zoom avant'))
    expect(getApi().viewport.zoom).not.toBe(1)
    fireEvent.click(getByTitle('Réinitialiser la vue'))
    expect(getApi().viewport).toEqual({ zoom: 1, translateX: 0, translateY: 0 })
  })

  it('T26/T27 — "Contenu"/"Sélection" (fit) conservent leur comportement (aucune erreur, aucune mutation Document)', () => {
    const { getByTitle, getApi } = renderNavbar()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    const before = getApi().components.length

    expect(() => fireEvent.click(getByTitle('Ajuster au contenu'))).not.toThrow()
    expect(() => fireEvent.click(getByTitle('Ajuster à la sélection'))).not.toThrow()
    expect(getApi().components.length).toBe(before)
  })
})

describe('MB-VIS-LAB-046 — SettingsPanel : ouverture/fermeture + cohérence thème (O7/F13, T28-T30)', () => {
  it("T28 — Settings s'ouvre/se ferme correctement (comportement inchangé)", () => {
    const { getByTitle, container, queryByText } = renderNavbar()
    expect(queryByText('Paramètres')).toBe(null)

    fireEvent.click(getByTitle('Paramètres'))
    expect(container.querySelector('.settings-panel')).not.toBe(null)

    const closeBtn = container.querySelector('.settings-panel__close')
    fireEvent.click(closeBtn)
    expect(container.querySelector('.settings-panel')).toBe(null)
  })

  it('T29 — Settings respecte theme-light : App.css déclare une surcharge réelle de fond clair pour .settings-panel (F13, avant ce ticket : aucune)', () => {
    const { getByTitle, container } = renderNavbar('theme-light')
    fireEvent.click(getByTitle('Paramètres'))
    expect(container.querySelector('.settings-panel')).not.toBe(null)

    expect(APP_CSS).toMatch(/\.theme-light\s+\.settings-panel\s*\{[^}]*background:\s*#f8fafc/)
    // Jamais le fond sombre par défaut réutilisé tel quel en thème clair.
    const lightBlock = /\.theme-light\s+\.settings-panel\s*\{([^}]*)\}/.exec(APP_CSS)?.[1] ?? ''
    expect(lightBlock).not.toMatch(/#1e293b/)
  })

  it('T30 — Settings respecte theme-dark : le rendu sombre historique de SettingsPanel.css reste strictement inchangé (non-régression)', () => {
    const { getByTitle, container } = renderNavbar('theme-dark')
    fireEvent.click(getByTitle('Paramètres'))
    expect(container.querySelector('.settings-panel')).not.toBe(null)

    // Valeur historique — SettingsPanel.css n'est PAS modifié par ce ticket
    // (seules des surcharges .theme-light sont ajoutées ailleurs, App.css).
    expect(SETTINGS_CSS).toMatch(/\.settings-panel\s*\{[^}]*background:\s*#1e293b/)
  })

  it('T29/T30 — le bouton de thème actif reprend le même bleu/cyan de sélection déjà établi (F13/O7 — jamais une nouvelle couleur)', () => {
    expect(APP_CSS).toMatch(
      /\.theme-light\s+\.settings-panel__theme-buttons\s+button\.active\s*\{[^}]*border-color:\s*#0284c7/
    )
  })
})
