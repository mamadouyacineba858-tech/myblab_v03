/**
 * useCircuitStateInteractionCapabilityIsolated.test.jsx — MB-VIS-COMP-003
 * (Phase 7, TEST 2/7 et TEST 3/7 — isolés)
 *
 * BLOCAGE ARCHITECTURAL DÉCOUVERT (voir §1 FAITS OBSERVÉS et §13 du rapport
 * MB-VIS-COMP-003), en DEUX parties empiriquement confirmées ici (debug
 * instrumenté, non conservé) :
 *
 * (a) `frontend/src/utils/circuitModel.js`, fonction `normalizeComponent()`,
 *     encore branchée littéralement sur "BUTTON" / "BUTTON_LATCHING" pour
 *     décider si `state` est conservé et comment il est coercé. Appelée par
 *     `safeComponents` (useCircuitState.js ~ligne 310,
 *     `components.map(normalizeComponent)`) à CHAQUE rendu, sur TOUT
 *     composant.
 *
 * (b) PLUS GRAVE, découvert en tentant de faire passer honnêtement ces deux
 *     tests : le composant BRUT produit par le pipeline réel d'ajout
 *     (CommandBus -> AddComponentHandler -> mapper Document/Presentation,
 *     hors périmètre) ne porte NI `pins` NI `state` du tout à la création —
 *     `createComponent()`/`initialState` de componentDefinitions.js
 *     (MB-VIS-COMP-002) n'est PAS le mécanisme qui alimente ce pipeline.
 *     Les valeurs "released"/"off" observées après addComponent() dans les
 *     tests non isolés (TEST 4/5/8) ne proviennent donc PAS de la
 *     définition déclarative, mais sont ENTIÈREMENT FABRIQUÉES par
 *     normalizeComponent() à partir de la chaîne de type littérale — qui
 *     coïncide par hasard avec les valeurs de `initialState`. Autrement dit,
 *     `initialState` (COMP-002) est actuellement injoignable par le pipeline
 *     de création réellement exercé par le Canvas ; seul `createComponent()`
 *     appelé directement (tests unitaires) l'utilise. Ceci est distinct du
 *     point (a) et documenté séparément au rapport (§13) comme limitation
 *     supplémentaire, hors périmètre de ce ticket (circuitModel.js et le
 *     pipeline CommandBus/mapper ne sont pas dans le périmètre autorisé).
 *
 * `frontend/src/utils/circuitModel.js` n'a pas été modifié.
 *
 * CE FICHIER : pour isoler la variable réellement étudiée par ce ticket (le
 * dispatch de useCircuitState.js — setButtonState/toggleLatchingButton — par
 * `interaction.type`, et non par chaîne de type littérale) de CES DEUX
 * confounds hors périmètre, ce fichier remplace normalizeComponent() par un
 * mock LOCAL AU TEST (aucun fichier de production modifié) qui reproduit
 * fidèlement sa structure (x/y finis, pins tableau) mais dérive la coercion
 * de `state` de `interaction.type` (via getComponentDef(), MB-VIS-COMP-002)
 * au lieu des chaînes littérales "BUTTON"/"BUTTON_LATCHING".
 *
 * Ce mock N'EST PAS une simple neutralisation : il constitue une PREUVE DE
 * CONCEPT FONCTIONNELLE de la correction recommandée au §13 du rapport pour
 * circuitModel.js — si normalizeComponent() lisait interaction.type ainsi en
 * production, le pipeline complet (y compris le point (b) ci-dessus, puisque
 * ce mock synthétise aussi state par défaut à partir de la capacité, sans
 * dépendre d'un `initialState` non propagé) fonctionnerait pour n'importe
 * quel type porteur de la capacité, SANS AUCUN changement supplémentaire à
 * useCircuitState.js. Ces deux tests prouvent donc conjointement : (1) que
 * useCircuitState.js est déjà entièrement capacité-agnostique (aucun
 * changement requis ici pour supporter un nouveau type), et (2) où se situe
 * exactement le seul verrou restant (circuitModel.js, hors périmètre).
 *
 * Ce fichier ne remplace PAS la nécessité de rapporter le blocage réel au
 * CSA — il la complète et l'objective : sans ce mock, TEST 2/7 et TEST 3/7
 * échouent uniquement à cause de circuitModel.js, jamais à cause de
 * useCircuitState.js (dont la correction est aussi prouvée séparément et
 * statiquement par TEST 6, useCircuitStateInteractionGuard.test.js, et par
 * comportement réel — sans aucun mock — dans TEST 1/4/5/8 de
 * useCircuitStateInteraction.test.jsx).
 */
import React from "react"
import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

vi.mock("../../utils/circuitModel.js", async (importOriginal) => {
  const actual = await importOriginal()
  const { getComponentDef } = await import("../../config/componentDefinitions.js")
  return {
    ...actual,
    // MOCK LOCAL AU TEST — voir bloc de commentaires en tête de fichier.
    // Structure identique à la vraie normalizeComponent() (garanties x/y/
    // pins inchangées) ; seule la coercion de `state` change de critère :
    // interaction.type (capacité déclarative) au lieu des chaînes littérales
    // "BUTTON"/"BUTTON_LATCHING".
    normalizeComponent: (component) => {
      if (!component?.uid || !component?.type) return null
      const interactionType = getComponentDef(component.type)?.interaction?.type
      let stateField = {}
      if (interactionType === "momentary") {
        stateField = { state: component.state === "pressed" ? "pressed" : "released" }
      } else if (interactionType === "latching") {
        stateField = { state: component.state === "on" ? "on" : "off" }
      }
      return {
        uid: String(component.uid),
        type: String(component.type),
        x: Number.isFinite(component.x) ? component.x : 0,
        y: Number.isFinite(component.y) ? component.y : 0,
        pins: Array.isArray(component.pins) ? [...component.pins] : [],
        ...stateField,
      }
    },
  }
})

const { CircuitProvider } = await import("../../context/CircuitContext.jsx")
const { useCircuit } = await import("../../context/useCircuit.js")
const { useCircuitInteraction } = await import("../../context/useCircuitInteraction.js")
const { COMPONENT_TYPES } = await import("../../config/componentDefinitions.js")

function renderCircuit() {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  return renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
}

/** Échange temporairement `interaction` d'un type RÉEL déjà canoniquement
 * enregistré, pour la durée du callback, puis restaure — ne touche à aucun
 * fichier, ne crée aucun nouveau type. Avec le mock ci-dessus, l'état par
 * défaut à la création est désormais dérivé de cette même capacité échangée
 * (et non plus d'un `initialState` non propagé par le pipeline réel — voir
 * point (b) en tête de fichier) : échanger `interaction` seul suffit donc
 * ici, sans avoir besoin d'échanger `initialState` en parallèle. */
function withSwappedInteraction(type, interaction, callback) {
  const original = COMPONENT_TYPES[type].interaction
  COMPONENT_TYPES[type] = { ...COMPONENT_TYPES[type], interaction }
  try {
    return callback()
  } finally {
    COMPONENT_TYPES[type] = { ...COMPONENT_TYPES[type], interaction: original }
  }
}

describe("MB-VIS-COMP-003 — useCircuitState : dispatch par interaction.type, isolé des confounds circuitModel.js", () => {
  it('TEST 2/7 — setButtonState suit interaction.type === "momentary", pas la chaîne "BUTTON"', () => {
    withSwappedInteraction("BUTTON_LATCHING", { type: "momentary" }, () => {
      const { result } = renderCircuit()
      act(() => { result.current.addComponent("BUTTON_LATCHING", 0, 0) })
      const uid = result.current.components[0].uid

      // BUTTON_LATCHING porte maintenant la capacité "momentary" : bien que
      // sa chaîne de type littérale reste "BUTTON_LATCHING", setButtonState
      // doit désormais l'accepter (preuve que le guard lit interaction.type).
      act(() => { result.current.setButtonState(uid, "pressed") })
      expect(result.current.components[0].state).toBe("pressed")

      act(() => { result.current.setButtonState(uid, "released") })
      expect(result.current.components[0].state).toBe("released")
    })
  })

  it('TEST 3/7 — toggleLatchingButton suit interaction.type === "latching", pas la chaîne "BUTTON_LATCHING"', () => {
    withSwappedInteraction("BUTTON", { type: "latching" }, () => {
      const { result } = renderCircuit()
      act(() => { result.current.addComponent("BUTTON", 0, 0) })
      const uid = result.current.components[0].uid

      // BUTTON porte maintenant la capacité "latching" : l'état par défaut à
      // la création (via le mock ci-dessus, dérivé de interaction.type) est
      // "off" ; bien que sa chaîne de type littérale reste "BUTTON",
      // toggleLatchingButton doit désormais l'accepter (preuve que le guard
      // lit interaction.type).
      expect(result.current.components[0].state).toBe("off")

      act(() => { result.current.toggleLatchingButton(uid) })
      expect(result.current.components[0].state).toBe("on")

      act(() => { result.current.undo() })
      expect(result.current.components.find((c) => c.uid === uid).state).toBe("off")

      act(() => { result.current.redo() })
      expect(result.current.components.find((c) => c.uid === uid).state).toBe("on")
    })
  })
})
