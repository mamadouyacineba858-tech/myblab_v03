import React from "react"
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { TemporalObservationPanel } from "../TemporalObservationPanel.jsx"
import { ArduinoSimulator } from "../../simulator/arduino/ArduinoSimulator.js"
import { createRuntimeOrchestrator } from "../../simulator/runtimeOrchestrator.js"

// `frontend/vitest.config.js` n'active pas `test.globals`, donc le nettoyage
// automatique de @testing-library/react (qui s'appuie sur un `afterEach`
// global) n'est pas garanti — nettoyage explicite entre chaque test, même
// convention que `MeasurementPanel.test.jsx`.
afterEach(() => {
  cleanup()
})

/**
 * MB-OBS-003 — Test UI / Intégration.
 *
 * Démontre le scénario utilisateur minimal (Ticket, Blueprint §7 "Interface
 * V1") de bout en bout à travers un vrai composant React monté avec
 * @testing-library/react :
 *
 *   sélection target -> sélection quantity -> startTime/endTime/samplePeriod
 *   -> déclenchement (Observe) -> affichage TemporalObservationResult
 *   (timestamps/valeurs/unité/statuts), sans jamais recalculer, interpoler
 *   ou muter quoi que ce soit.
 *
 * Ce fichier ne recopie PAS les tests moteur de MB-OBS-002
 * (`temporalObservationContract.test.js`) : il ne re-teste ni la grille
 * d'échantillonnage, ni la sémantique endTime, ni le comportement du
 * Scheduler partagé — ces preuves existent déjà et restent valides
 * (§AC-08, vérifié séparément par la suite complète). Ce fichier vérifie
 * uniquement que le composant de présentation restitue fidèlement ce que
 * `observeTemporal()` retourne.
 *
 * Utilise l'environnement jsdom (`frontend/vitest.config.js`), comme
 * `MeasurementPanel.test.jsx` — non exécuté par `test`/`test:ci` (limité à
 * `src/**\/*.test.{js,ts}`, environnement node) ; voir le rapport de
 * livraison pour la commande exacte et son résultat.
 */

function poweredResistorCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
  const components = [power, resistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
    { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
  ]
  const targets = [{ kind: "PIN", componentUid: "r1", pinId: "A", label: "R1 · pin A" }]
  return { components, wires, targets }
}

function unavailableCurrentCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const transistor = { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 }
  const components = [power, transistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "collector" },
    { fromUid: "t1", fromPin: "emitter", toUid: "power1", toPin: "GND" },
    { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "base" },
  ]
  const targets = [{ kind: "PIN", componentUid: "t1", pinId: "collector", label: "T1 · collector" }]
  return { components, wires, targets }
}

// Fixture PWM reprise à l'identique de `temporalObservationContract.test.js`
// (elle-même reprise de `pwmRuntime.test.js`) — 100Hz, value=127,
// table t=0/4/5/9/10 -> HIGH/HIGH/LOW/LOW/HIGH. Réutilisée ici uniquement
// pour construire les props du composant (circuit + options.orchestrators),
// jamais pour retester la table elle-même (déjà couverte par MB-SIM-014 et
// MB-OBS-002).
function circuitArduinoVersLed() {
  const components = [
    { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
    { uid: "led1", type: "LED", x: 10, y: 0 },
    { uid: "power1", type: "POWER", x: 20, y: 0 },
  ]
  const wires = [
    { fromUid: "ard1", fromPin: "D2", toUid: "led1", toPin: "anode" },
    { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
  ]
  const targets = [{ kind: "PIN", componentUid: "ard1", pinId: "D2", label: "Arduino · D2 (PWM)" }]
  return { components, wires, targets }
}

function pwmOrchestratorsD2Value127() {
  const runtime = new ArduinoSimulator({ pwmFrequencyHz: 100 })
  const orchestrator = createRuntimeOrchestrator({ runtime })
  runtime.start()
  runtime.tick(0)
  runtime.analogWrite("D2", 127)
  const orchestrators = new Map([["ard1", orchestrator]])
  return { orchestrators }
}

describe("MB-OBS-003 — TemporalObservationPanel : démonstration utilisateur minimale de bout en bout", () => {
  it("rendu initial : Target/Quantity/Start/End/Sample period visibles, bouton Observe désactivé sans target", () => {
    render(<TemporalObservationPanel components={[]} wires={[]} targets={[]} />)
    expect(screen.getByLabelText("temporal-observation-target")).toBeTruthy()
    expect(screen.getByLabelText("temporal-observation-quantity")).toBeTruthy()
    expect(screen.getByLabelText("temporal-observation-start")).toBeTruthy()
    expect(screen.getByLabelText("temporal-observation-end")).toBeTruthy()
    expect(screen.getByLabelText("temporal-observation-sample-period")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Observe" }).disabled).toBe(true)
  })

  it("VALID : sélection target -> quantity VOLTAGE -> startTime/endTime/samplePeriod -> Observe -> affichage de la série exacte retournée par observeTemporal() (OBS003-E2E-001)", () => {
    const { components, wires, targets } = poweredResistorCircuit()
    render(<TemporalObservationPanel components={components} wires={wires} targets={targets} />)

    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-quantity"), { target: { value: "VOLTAGE" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-start"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "3" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-sample-period"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))

    const summary = screen.getByLabelText("temporal-observation-summary")
    expect(summary.textContent).toContain("VOLTAGE")
    expect(summary.textContent).toContain("VALID")
    expect(summary.textContent).toContain("V")

    // Grille attendue : [0, 1, 2, 3] — un modèle DC pur produit une valeur
    // constante à chaque instant (le circuit ne dépend pas du temps), donc
    // 4 échantillons identiques en valeur/statut, timestamps distincts.
    const samplesList = screen.getByLabelText("temporal-observation-samples")
    const items = samplesList.querySelectorAll("li")
    expect(items.length).toBe(4)
    const timestamps = [...items].map((li) => li.querySelectorAll("span")[0].textContent)
    expect(timestamps).toEqual(["0", "1", "2", "3"])
    for (const li of items) {
      expect(li.textContent).toContain("VALID")
    }
  })

  it("UNAVAILABLE par échantillon : jamais converti en 0, le reason est affiché tel quel (OBS003-E2E-002, AC-06)", () => {
    const { components, wires, targets } = unavailableCurrentCircuit()
    render(<TemporalObservationPanel components={components} wires={wires} targets={targets} />)

    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-quantity"), { target: { value: "CURRENT" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-start"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "2" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-sample-period"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))

    const samplesList = screen.getByLabelText("temporal-observation-samples")
    const items = samplesList.querySelectorAll("li")
    expect(items.length).toBe(3)
    for (const li of items) {
      expect(li.textContent).toContain("UNAVAILABLE")
      expect(li.textContent).not.toMatch(/>\s*0\s*</)
      expect(li.textContent).toMatch(/\S/) // un reason non vide est présent
    }
  })

  it("INVALID : requête temporelle malformée (endTime < startTime) -> statut global INVALID affiché avec reason, aucune liste de samples fantôme (AC-05)", () => {
    const { components, wires, targets } = poweredResistorCircuit()
    render(<TemporalObservationPanel components={components} wires={wires} targets={targets} />)

    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-start"), { target: { value: "10" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-sample-period"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))

    const summary = screen.getByLabelText("temporal-observation-summary")
    expect(summary.textContent).toContain("INVALID")
    expect(summary.textContent).toContain("Reason")

    const samplesList = screen.getByLabelText("temporal-observation-samples")
    expect(samplesList.querySelectorAll("li").length).toBe(0)
  })

  it("série vide malgré une requête bien formée reste gérée sans exception (samplePeriod > fenêtre disponible n'existe pas en pratique ; ici, target inconnu -> INVALID, 0 sample, aucun crash)", () => {
    const { components, wires } = poweredResistorCircuit()
    const targets = [{ kind: "PIN", componentUid: "ghost", pinId: "A", label: "cible inconnue" }]
    render(<TemporalObservationPanel components={components} wires={wires} targets={targets} />)

    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-start"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-sample-period"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))

    const summary = screen.getByLabelText("temporal-observation-summary")
    expect(summary.textContent).toContain("INVALID")
    const samplesList = screen.getByLabelText("temporal-observation-samples")
    expect(samplesList.querySelectorAll("li").length).toBe(0)
  })

  it("scénario PWM de référence : la waveform affichée reflète exactement les transitions retournées par observeTemporal() (t=0 HIGH, t=4 HIGH, t=5 LOW, t=9 LOW, t=10 HIGH) — le panneau ne connaît pas la formule PWM, il transmet startTime/endTime/samplePeriod et affiche le résultat (Blueprint §8, AC-11)", () => {
    const { components, wires, targets } = circuitArduinoVersLed()
    const { orchestrators } = pwmOrchestratorsD2Value127()

    render(
      <TemporalObservationPanel
        components={components}
        wires={wires}
        targets={targets}
        options={{ orchestrators }}
      />
    )

    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-quantity"), { target: { value: "LOGICAL_STATE" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-start"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "10" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-sample-period"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))

    const samplesList = screen.getByLabelText("temporal-observation-samples")
    const items = [...samplesList.querySelectorAll("li")]
    expect(items.length).toBe(11) // 0..10 inclus, sur la grille

    const byTime = Object.fromEntries(
      items.map((li) => {
        const spans = li.querySelectorAll("span")
        return [spans[0].textContent, spans[1].textContent]
      })
    )
    expect(byTime["0"]).toBe("HIGH")
    expect(byTime["4"]).toBe("HIGH")
    expect(byTime["5"]).toBe("LOW")
    expect(byTime["9"]).toBe("LOW")
    expect(byTime["10"]).toBe("HIGH")

    // Réserve CSA "waveform" : la liste textuelle affichait déjà HIGH/LOW
    // correctement (vérifié ci-dessus) mais la représentation graphique ne
    // traçait auparavant que les valeurs numériques (VOLTAGE/CURRENT),
    // excluant silencieusement tout LOGICAL_STATE. On vérifie ici que la
    // waveform elle-même (pas seulement la liste) représente chacun des 11
    // échantillons, avec le niveau visuel correspondant exactement à
    // sample.value (HIGH/LOW), sans qu'aucun sample ne soit tracé à un
    // temps ou avec une valeur qui ne provienne pas de result.samples.
    const waveform = screen.getByLabelText("temporal-observation-waveform")
    const points = [...waveform.querySelectorAll('[data-testid="temporal-observation-waveform-point"]')]
    expect(points.length).toBe(11) // un point par sample VALID, aucun sample manquant, aucun inventé

    const levelByTime = Object.fromEntries(points.map((p) => [p.getAttribute("data-time"), p.getAttribute("data-level")]))
    expect(levelByTime["0"]).toBe("HIGH")
    expect(levelByTime["4"]).toBe("HIGH")
    expect(levelByTime["5"]).toBe("LOW")
    expect(levelByTime["9"]).toBe("LOW")
    expect(levelByTime["10"]).toBe("HIGH")

    // Transitions visuelles : un point HIGH doit être positionné strictement
    // au-dessus (cy plus petit, repère SVG) d'un point LOW — preuve que la
    // waveform distingue réellement les deux niveaux plutôt que de tout
    // aplatir à une seule hauteur (ce qui se produirait si HIGH/LOW étaient
    // silencieusement ignorés ou confondus).
    const cyByTime = Object.fromEntries(points.map((p) => [p.getAttribute("data-time"), Number(p.getAttribute("cy"))]))
    expect(cyByTime["0"]).toBeLessThan(cyByTime["5"])
    expect(cyByTime["4"]).toBeLessThan(cyByTime["5"])
    expect(cyByTime["10"]).toBeLessThan(cyByTime["9"])
    // Les points de même niveau logique partagent exactement la même hauteur
    // (deux niveaux fixes, pas un dégradé inventé entre les échantillons).
    expect(cyByTime["0"]).toBe(cyByTime["4"])
    expect(cyByTime["0"]).toBe(cyByTime["10"])
    expect(cyByTime["5"]).toBe(cyByTime["9"])

    // x provient exclusivement de sample.time (aucune horloge, aucune
    // grille recalculée localement) : les points sont dans l'ordre croissant
    // de temps et strictement monotones en x.
    const xByTime = points.map((p) => Number(p.getAttribute("cx")))
    for (let i = 1; i < xByTime.length; i++) {
      expect(xByTime[i]).toBeGreaterThan(xByTime[i - 1])
    }
  })

  it("déterminisme du rendu (AC-12) : deux instances indépendantes du même scénario PWM (même entrée, runtime/Scheduler local à chacune) produisent une représentation identique", () => {
    // Deux fixtures fraîches et indépendantes plutôt qu'un seul
    // `orchestrators` réutilisé entre deux clics : `observeTemporal()`
    // refuse explicitement de rembobiner un Scheduler partagé déjà avancé
    // (garde testée dans temporalObservationContract.test.js) — un second
    // clic sur le MÊME orchestrateur, déjà à t=10, ne peut donc légitimement
    // pas reproduire la même série. Le déterminisme s'observe entre deux
    // runtimes indépendants partant du même état initial, pas en rejouant
    // un état déjà consommé.
    const first = circuitArduinoVersLed()
    const second = circuitArduinoVersLed()

    const { unmount } = render(
      <TemporalObservationPanel
        components={first.components}
        wires={first.wires}
        targets={first.targets}
        options={{ orchestrators: pwmOrchestratorsD2Value127().orchestrators }}
      />
    )
    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-quantity"), { target: { value: "LOGICAL_STATE" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))
    const firstItems = [...screen.getByLabelText("temporal-observation-samples").querySelectorAll("li")].map(
      (li) => li.textContent
    )
    unmount()

    render(
      <TemporalObservationPanel
        components={second.components}
        wires={second.wires}
        targets={second.targets}
        options={{ orchestrators: pwmOrchestratorsD2Value127().orchestrators }}
      />
    )
    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-quantity"), { target: { value: "LOGICAL_STATE" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))
    const secondItems = [...screen.getByLabelText("temporal-observation-samples").querySelectorAll("li")].map(
      (li) => li.textContent
    )

    expect(secondItems).toEqual(firstItems)
    expect(firstItems.length).toBe(11)
  })

  it("non-mutation du circuit : components et wires ne sont pas modifiés par l'interaction complète (AC-10, cas DC)", () => {
    const { components, wires, targets } = poweredResistorCircuit()
    const componentsSnapshot = JSON.parse(JSON.stringify(components))
    const wiresSnapshot = JSON.parse(JSON.stringify(wires))

    render(<TemporalObservationPanel components={components} wires={wires} targets={targets} />)
    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))

    expect(components).toEqual(componentsSnapshot)
    expect(wires).toEqual(wiresSnapshot)
  })

  it("non-mutation du circuit : cas runtime/PWM (AC-10)", () => {
    const { components, wires, targets } = circuitArduinoVersLed()
    const { orchestrators } = pwmOrchestratorsD2Value127()
    const componentsSnapshot = JSON.parse(JSON.stringify(components))
    const wiresSnapshot = JSON.parse(JSON.stringify(wires))

    render(
      <TemporalObservationPanel
        components={components}
        wires={wires}
        targets={targets}
        options={{ orchestrators }}
      />
    )
    fireEvent.change(screen.getByLabelText("temporal-observation-target"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-quantity"), { target: { value: "LOGICAL_STATE" } })
    fireEvent.change(screen.getByLabelText("temporal-observation-end"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("button", { name: "Observe" }))

    expect(components).toEqual(componentsSnapshot)
    expect(wires).toEqual(wiresSnapshot)
  })

  it("aucune sélection de target disponible -> le bouton Observe est désactivé, jamais de requête déclenchée à l'aveugle", () => {
    render(<TemporalObservationPanel components={[]} wires={[]} targets={[]} />)
    expect(screen.getByRole("button", { name: "Observe" }).disabled).toBe(true)
  })
})
