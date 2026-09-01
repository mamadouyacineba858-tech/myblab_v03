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
import { render, fireEvent, act } from '@testing-library/react'
import { ResistorPart } from '../ResistorPart.jsx'
import { LedPart } from '../LedPart.jsx'
import { CapacitorPart } from '../CapacitorPart.jsx'
import { DiodePart } from '../DiodePart.jsx'
import { ArduinoPart } from '../ArduinoPart.jsx'
import { ButtonPart } from '../ButtonPart.jsx'
import { LatchingButtonPart } from '../LatchingButtonPart.jsx'
import { PowerPart } from '../PowerPart.jsx'
import { BuzzerPart } from '../BuzzerPart.jsx'
import { PotentiometerPart } from '../PotentiometerPart.jsx'
import { LdrPart } from '../LdrPart.jsx'
import { ThermistorPart } from '../ThermistorPart.jsx'
import { RgbLedPart } from '../RgbLedPart.jsx'
import { NpnTransistorPart } from '../NpnTransistorPart.jsx'
import { ServoPart } from '../ServoPart.jsx'
import { DcMotorPart } from '../DcMotorPart.jsx'
import { DEFAULT_REGISTRATIONS, getComponentByType } from '../../../visualization/defaultRegistrations.js'
import { createDefaultVisualizationManager } from '../../../visualization/factory.js'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const LOT = [
  { type: 'RESISTOR', Component: ResistorPart, label: 'Résistance' },
  { type: 'LED', Component: LedPart, label: null }, // aria-label dépend de isOn
  { type: 'CAPACITOR', Component: CapacitorPart, label: 'Condensateur' },
  { type: 'DIODE', Component: DiodePart, label: 'Diode' },
]

// MB-COMPONENT-LIBRARY-002 — second lot : tous les types du catalogue qui ne
// disposaient pas encore d'un renderer réaliste (SVG contraint par
// componentDefinitions.js) avant ce ticket.
const LOT2 = [
  { type: 'ARDUINO', Component: ArduinoPart, label: 'Arduino UNO' },
  { type: 'BUTTON', Component: ButtonPart, label: 'Bouton' },
  { type: 'BUTTON_LATCHING', Component: LatchingButtonPart, label: null }, // aria-label dépend de state
  { type: 'POWER', Component: PowerPart, label: 'Alimentation' },
  { type: 'BUZZER', Component: BuzzerPart, label: 'Buzzer' },
  { type: 'POTENTIOMETER', Component: PotentiometerPart, label: 'Potentiomètre' },
  { type: 'LDR', Component: LdrPart, label: 'Photorésistance' },
  { type: 'THERMISTOR', Component: ThermistorPart, label: 'Thermistance' },
  { type: 'RGB_LED', Component: RgbLedPart, label: 'LED RGB' },
  { type: 'NPN_TRANSISTOR', Component: NpnTransistorPart, label: 'Transistor NPN' },
  { type: 'SERVO', Component: ServoPart, label: 'Micro Servo' },
  { type: 'DC_MOTOR', Component: DcMotorPart, label: 'Moteur DC' },
]

const circuitWrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

/**
 * Harnais minimal : reproduit exactement le patron de rendu réel de
 * SimulationCanvas.jsx (`components.map((comp) => <CircuitComponent
 * key={comp.uid} component={comp} />)`), pour vérifier que le renderer
 * réaliste redessiné reste intégré sans changement au pipeline
 * CircuitComponent -> PartRenderer -> Pin réel (pas un mock).
 */
function CanvasHarness({ onReady }) {
  const circuit = useCircuit()
  onReady(circuit)
  return (
    <>
      {circuit.components.map((comp) => (
        <CircuitComponent key={comp.uid} component={comp} />
      ))}
    </>
  )
}

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
  // MB-VIS-PROTOTYPE-001C : RESISTOR est passé au backend RASTER (<img>),
  // exclu de la vérification "<svg> dimensionné" et couvert juste en dessous.
  it.each(LOT.filter((entry) => entry.type !== 'RESISTOR'))('$type : le <svg> respecte exactement les dimensions de componentDefinitions.js', ({ type, Component }) => {
    const def = getComponentDef(type)
    const { container } = render(<Component isOn={false} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('width')).toBe(String(def.width))
    expect(svg.getAttribute('height')).toBe(String(def.height))
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${def.width} ${def.height}`)
  })

  it('RESISTOR : backend raster — <img> aux dimensions de componentDefinitions.js, aucun <svg>', () => {
    const def = getComponentDef('RESISTOR')
    const { container } = render(<ResistorPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
    expect(img.getAttribute('src')).toMatch(/^\/assets\/components\/resistor\/resistor\.default\./)
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
    expect(root.getAttribute('class')).not.toMatch(/part-led--on/)
    expect(root.getAttribute('aria-label')).toBe('LED éteinte')
  })

  it('isOn=true : classe part-led--on présente, aria-label "LED allumée"', () => {
    const { container } = render(<LedPart isOn={true} />)
    const root = container.querySelector('.part-led')
    expect(root.getAttribute('class')).toMatch(/part-led--on/)
    expect(root.getAttribute('aria-label')).toBe('LED allumée')
  })
})

/**
 * ============================================================
 * MB-COMPONENT-LIBRARY-002 — second lot de renderers réalistes.
 * Couvre les 12 types du catalogue qui n'avaient encore qu'un rendu
 * schématique (div/CSS) : ARDUINO, BUTTON, BUTTON_LATCHING, POWER, BUZZER,
 * POTENTIOMETER, LDR, THERMISTOR, RGB_LED, NPN_TRANSISTOR, SERVO,
 * DC_MOTOR. Même discipline que le premier lot (MB-VIS-002) : structurel,
 * contrat géométrique vérifié contre componentDefinitions.js (source de
 * vérité, non modifiée par ce ticket — VIS-INV-01/02/03), états
 * dynamiques préservés à l'identique.
 * ============================================================
 */

describe('MB-COMPONENT-LIBRARY-002 — second lot de renderers réalistes (structurel, VIS-TEST-01)', () => {
  it.each(LOT2.map((entry) => entry.type))(
    "%s est enregistré dans DEFAULT_REGISTRATIONS et s'y résout vers le bon composant",
    (type) => {
      const expected = LOT2.find((entry) => entry.type === type).Component
      expect(getComponentByType(type)).toBe(expected)
      expect(DEFAULT_REGISTRATIONS.some((entry) => entry.type === type && entry.component === expected)).toBe(true)
    }
  )

  it.each(LOT2.map((entry) => entry.type))(
    '%s se résout via VisualizationManager.render (mécanisme réel de PartRenderer.jsx)',
    (type) => {
      const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
      const element = manager.render(type, {})
      expect(element).not.toBeNull()
    }
  )
})

describe('MB-COMPONENT-LIBRARY-002 — second lot (rendu, contrat géométrique, VIS-TEST-02)', () => {
  it.each(LOT2)('$type : le <svg> respecte exactement les dimensions de componentDefinitions.js (LOCK-04/LOCK-05, aucune géométrie modifiée)', ({ type, Component }) => {
    const def = getComponentDef(type)
    const { container } = render(<Component />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('width')).toBe(String(def.width))
    expect(svg.getAttribute('height')).toBe(String(def.height))
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${def.width} ${def.height}`)
  })

  it.each(LOT2.filter((entry) => entry.label !== null))(
    '$type : aria-label correct',
    ({ type, Component, label }) => {
      const { container } = render(<Component />)
      expect(container.querySelector(`[aria-label="${label}"]`)).not.toBeNull()
    }
  )
})

describe('MB-COMPONENT-LIBRARY-002 — BUTTON : état pressé/relâché préservé (VIS-TEST-08, LOCK-19)', () => {
  it('state="released" (ou absent) : pas de classe part-button--pressed', () => {
    const { container } = render(<ButtonPart />)
    const root = container.querySelector('.part-button')
    expect(root.getAttribute('class')).not.toMatch(/part-button--pressed/)
  })

  it('state="pressed" : classe part-button--pressed présente', () => {
    const { container } = render(<ButtonPart state="pressed" />)
    const root = container.querySelector('.part-button')
    expect(root.getAttribute('class')).toMatch(/part-button--pressed/)
  })

  it('les gestionnaires onPointerDown/onPointerUp restent attachés à la racine (contrat de props inchangé)', () => {
    let pressed = false
    const { container } = render(
      <ButtonPart
        state={pressed ? 'pressed' : 'released'}
        onPointerDown={() => { pressed = true }}
        onPointerUp={() => { pressed = false }}
      />
    )
    const root = container.querySelector('.part-button')
    fireEvent.pointerDown(root)
    expect(pressed).toBe(true)
    fireEvent.pointerUp(root)
    expect(pressed).toBe(false)
  })
})

describe('MB-COMPONENT-LIBRARY-002 — BUTTON_LATCHING : état on/off préservé (VIS-TEST-08, LOCK-19)', () => {
  it('state="off" : pas de classe is-on, aria-label "Interrupteur désactivé"', () => {
    const { container } = render(<LatchingButtonPart state="off" />)
    const root = container.querySelector('.part-latching-button')
    expect(root.getAttribute('class')).not.toMatch(/is-on/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur désactivé')
  })

  it('state="on" : classe is-on présente, aria-label "Interrupteur activé"', () => {
    const { container } = render(<LatchingButtonPart state="on" />)
    const root = container.querySelector('.part-latching-button')
    expect(root.getAttribute('class')).toMatch(/is-on/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur activé')
  })

  it('le gestionnaire onClick reste attaché à la racine (contrat de props inchangé)', () => {
    let clicked = false
    const { container } = render(<LatchingButtonPart state="off" onClick={() => { clicked = true }} />)
    fireEvent.click(container.querySelector('.part-latching-button'))
    expect(clicked).toBe(true)
  })
})

describe('MB-COMPONENT-LIBRARY-002 — RGB_LED : états dynamiques r/g/b préservés (VIS-TEST-08, LOCK-19)', () => {
  it('r=g=b=undefined : aucun canal actif (part-rgb-led__chip--on absent des 3 puces)', () => {
    const { container } = render(<RgbLedPart />)
    expect(container.querySelectorAll('.part-rgb-led__chip--on').length).toBe(0)
  })

  it('r=true seul : uniquement la puce rouge porte part-rgb-led__chip--on', () => {
    const { container } = render(<RgbLedPart r={true} g={false} b={false} />)
    expect(container.querySelector('.part-rgb-led__chip--r').getAttribute('class')).toMatch(/part-rgb-led__chip--on/)
    expect(container.querySelector('.part-rgb-led__chip--g').getAttribute('class')).not.toMatch(/part-rgb-led__chip--on/)
    expect(container.querySelector('.part-rgb-led__chip--b').getAttribute('class')).not.toMatch(/part-rgb-led__chip--on/)
  })

  it('r=g=b=true : les 3 puces portent part-rgb-led__chip--on', () => {
    const { container } = render(<RgbLedPart r={true} g={true} b={true} />)
    expect(container.querySelectorAll('.part-rgb-led__chip--on').length).toBe(3)
  })
})

describe('MB-COMPONENT-LIBRARY-002 — pipeline réel CircuitComponent -> PartRenderer (VIS-TEST-02/03, AC-04/AC-05/AC-06)', () => {
  it('ARDUINO (4 pins) : les 4 pins existants restent rendus aux positions dx/dy exactes de componentDefinitions.js', () => {
    let circuitApi = null
    render(
      <CanvasHarness onReady={(api) => { circuitApi = api }} />,
      { wrapper: circuitWrapper }
    )

    act(() => {
      circuitApi.addComponent('ARDUINO', 0, 0)
    })

    const def = getComponentDef('ARDUINO')
    const pinButtons = document.querySelectorAll('.myblab-pin')
    expect(pinButtons.length).toBe(def.pins.length)
    def.pins.forEach((pin) => {
      const match = Array.from(pinButtons).find(
        (el) => el.style.left === `${pin.dx}px` && el.style.top === `${pin.dy}px`
      )
      expect(match, `pin ${pin.id} (dx=${pin.dx}, dy=${pin.dy})`).toBeTruthy()
    })
  })

  it("BUTTON : le clic réel (pointerdown/pointerup) sur le nouveau rendu SVG met bien à jour l'état pressé dans le Document (interaction non régressée, AC-06)", () => {
    let circuitApi = null
    render(
      <CanvasHarness onReady={(api) => { circuitApi = api }} />,
      { wrapper: circuitWrapper }
    )

    act(() => {
      circuitApi.addComponent('BUTTON', 0, 0)
    })

    const root = document.querySelector('.part-button')
    expect(root).not.toBeNull()

    act(() => {
      fireEvent.pointerDown(root)
    })
    expect(circuitApi.components[0].state).toBe('pressed')

    act(() => {
      fireEvent.pointerUp(root)
    })
    expect(circuitApi.components[0].state).toBe('released')
  })
})
