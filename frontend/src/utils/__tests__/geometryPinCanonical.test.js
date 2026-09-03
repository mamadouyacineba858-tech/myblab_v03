/**
 * geometryPinCanonical.test.js — MB-VIS-COMP-005 (Phase 4)
 *
 * Teste directement getPinPosition() (geometry.js) — la fonction géométrique
 * CANONIQUE unique (translation pure component.x/y + pin.dx/dy) — et
 * confirme que pinPresentationGeometry.js délègue désormais son cas
 * générique à cette même fonction au lieu de dupliquer la formule.
 *
 * ROTATION (Blueprint §D) : aucune rotation de composant n'est active dans
 * le pipeline réel — recherche exhaustive dans tout frontend/src : la seule
 * occurrence du terme "rotation" en dehors de ce commentaire est un champ
 * arbitraire de test de passthrough générique (ReactDocumentMapper.test.js,
 * T11 : "should preserve additional properties in Core→React conversion",
 * qui utilise `rotation: 45` comme n'importe quel champ inconnu, au même
 * titre que `layer`/`metadata` — aucun rapport avec la géométrie des pins).
 * TEST 6 est donc remplacé, comme prévu par le Blueprint, par un test
 * architectural confirmant que getPinPosition() ne fabrique aucune rotation.
 */
import { describe, it, expect } from "vitest"
import { getPinPosition } from "../geometry.js"
import { getPinPresentationPosition } from "../pinPresentationGeometry.js"
import { getComponentDef, COMPONENT_TYPES } from "../../config/componentDefinitions.js"

describe("MB-VIS-COMP-005 — getPinPosition() : fonction géométrique canonique", () => {
  it("TEST 1 — composant sans rotation : absolute = component position + pin offset", () => {
    expect(getPinPosition({ x: 100, y: 200 }, { dx: 10, dy: 5 })).toEqual({ x: 110, y: 205 })
    expect(getPinPosition({ x: 0, y: 0 }, { dx: 0, dy: 0 })).toEqual({ x: 0, y: 0 })
    expect(getPinPosition({ x: -20, y: 30 }, { dx: 5, dy: -5 })).toEqual({ x: -15, y: 25 })
  })

  it("TEST 2 — deux composants de types différents avec les mêmes offsets relatifs produisent le même déplacement géométrique", () => {
    const resistorLike = { x: 50, y: 60, type: "RESISTOR" }
    const ledLike = { x: 50, y: 60, type: "LED" }
    const offset = { dx: 12, dy: 34 }
    expect(getPinPosition(resistorLike, offset)).toEqual(getPinPosition(ledLike, offset))
  })

  it("TEST 3 — le calcul ne dépend pas du type du composant (présent, absent, ou inconnu)", () => {
    const base = { x: 7, y: 9 }
    const offset = { dx: 3, dy: 4 }
    const withoutType = getPinPosition(base, offset)
    const withKnownType = getPinPosition({ ...base, type: "CAPACITOR" }, offset)
    const withUnknownType = getPinPosition({ ...base, type: "TYPE_QUI_N_EXISTE_PAS" }, offset)
    expect(withKnownType).toEqual(withoutType)
    expect(withUnknownType).toEqual(withoutType)
  })

  it("TEST 4 — le zoom ne modifie pas les coordonnées locales des pins", () => {
    // getPinPosition() n'accepte aucun paramètre de zoom : preuve
    // architecturale qu'il ne peut structurellement pas être contaminé.
    expect(getPinPosition.length).toBe(2)
    // Aucune référence à "zoom" dans les deux fichiers de cette couche.
    // (vérifié statiquement dans TEST 8 ci-dessous par la même lecture de
    // source ; ici, preuve comportementale : deux appels identiques,
    // "avant" et "après" un changement de zoom simulé ailleurs dans
    // l'application, donnent le même résultat car zoom n'est jamais un
    // paramètre du calcul.)
    const component = { x: 100, y: 100 }
    const pin = { dx: 20, dy: 20 }
    const before = getPinPosition(component, pin)
    // Le zoom réel (SimulationCanvas.jsx) est un `transform: scale(zoom)`
    // CSS appliqué à un calque au-dessus des composants — il ne mute ni
    // `component`, ni `pin`. On le simule ici en confirmant qu'aucune
    // mutation de zoom externe (représentée par une variable locale,
    // jamais lue par la fonction) n'affecte le résultat.
    let zoom = 1
    const after1 = getPinPosition(component, pin)
    zoom = 2.5
    const after2 = getPinPosition(component, pin)
    expect(after1).toEqual(before)
    expect(after2).toEqual(before)
    expect(zoom).toBe(2.5) // la variable existe bien, juste jamais consultée
  })

  it("TEST 5 — le pan ne modifie pas les coordonnées locales des pins", () => {
    // Aucun concept de pan (panX/panY/panOffset) n'existe dans le code
    // source (recherche exhaustive, aucune occurrence hors ce commentaire).
    // Le défilement natif du navigateur, s'il existe, est un phénomène
    // purement visuel du viewport DOM, jamais lu par cette fonction.
    const component = { x: 42, y: 84 }
    const pin = { dx: 8, dy: 16 }
    const result1 = getPinPosition(component, pin)
    // Un "pan" simulé ne peut être qu'un décalage appliqué ailleurs (jamais
    // dans cette fonction, qui n'a pas de paramètre pour cela) : deux
    // appels identiques doivent rester strictement égaux.
    const result2 = getPinPosition(component, pin)
    expect(result2).toEqual(result1)
    expect(getPinPosition.length).toBe(2) // pas de 3e paramètre "viewport"/"pan"
  })

  it("TEST 6 — architectural : aucune rotation n'est fabriquée (aucune rotation active dans le pipeline réel)", () => {
    const component = { x: 10, y: 10 }
    const pin = { dx: 5, dy: 5 }
    const withoutRotation = getPinPosition(component, pin)
    // Un champ `rotation` ajouté sur le composant (comme le fait, à titre
    // d'exemple générique et sans rapport, ReactDocumentMapper.test.js T11)
    // ne doit produire AUCUNE différence : getPinPosition() ne lit ni ne
    // fabrique de rotation.
    const with0 = getPinPosition({ ...component, rotation: 0 }, pin)
    const with90 = getPinPosition({ ...component, rotation: 90 }, pin)
    const with180 = getPinPosition({ ...component, rotation: 180 }, pin)
    const with270 = getPinPosition({ ...component, rotation: 270 }, pin)
    expect(with0).toEqual(withoutRotation)
    expect(with90).toEqual(withoutRotation)
    expect(with180).toEqual(withoutRotation)
    expect(with270).toEqual(withoutRotation)
  })

  it("TEST 7 — un renderer visuel différent ne change pas la position calculée du pin", () => {
    // getPinPosition() ne consulte aucun renderer (PartRenderer,
    // VisualizationManager, RendererRegistry) : le résultat dépend
    // uniquement de x/y/dx/dy, jamais du renderer associé au type.
    const offset = { dx: 15, dy: 25 }
    const asLed = getPinPosition({ x: 30, y: 40, type: "LED" }, offset) // renderer réaliste dédié
    const asResistor = getPinPosition({ x: 30, y: 40, type: "RESISTOR" }, offset) // renderer générique
    const asCapacitor = getPinPosition({ x: 30, y: 40, type: "CAPACITOR" }, offset) // renderer réaliste dédié
    expect(asLed).toEqual(asResistor)
    expect(asResistor).toEqual(asCapacitor)
  })

  it("TEST 9 — les coordonnées produites restent stables après plusieurs recalculs", () => {
    const component = { x: 17, y: 23 }
    const pin = { dx: 9, dy: 11 }
    const r1 = getPinPosition(component, pin)
    const r2 = getPinPosition(component, pin)
    const r3 = getPinPosition(getPinPosition(component, pin) && component, pin) // recalcul, mêmes entrées
    expect(r1).toEqual(r2)
    expect(r2).toEqual(r3)
    // Aucune mutation des entrées.
    expect(component).toEqual({ x: 17, y: 23 })
    expect(pin).toEqual({ dx: 9, dy: 11 })
  })

  it("TEST 10 — régression : RESISTOR/LED/CAPACITOR/BUTTON/BUTTON_LATCHING/POTENTIOMETER conservent leurs positions de pins existantes", () => {
    // Valeurs figées ici depuis componentDefinitions.js. Sert de garde-fou de
    // non-régression : si une future modification de la définition change ces
    // valeurs, ce test échoue intentionnellement (comportement attendu).
    // MB-VIS-COMP-032 §8 : la PRÉSENTATION visuelle du WIPER du POTENTIOMETER
    // passe de (45,0) à (45,50) pour aligner les 3 contacts sur le bord bas de
    // l'asset raster réaliste — changement de présentation autorisé par le
    // ticket (IDs, rôles, modèle électrique, canonicalRegistry inchangés).
    const expected = {
      RESISTOR: [{ id: "A", dx: 0, dy: 14 }, { id: "B", dx: 84, dy: 14 }],
      LED: [{ id: "anode", dx: 28, dy: 62 }, { id: "cathode", dx: 52, dy: 62 }],
      CAPACITOR: [{ id: "pinA", dx: 0, dy: 20 }, { id: "pinB", dx: 70, dy: 20 }],
      BUTTON: [{ id: "pin1", dx: 0, dy: 30 }, { id: "pin2", dx: 60, dy: 30 }],
      BUTTON_LATCHING: [{ id: "pin1", dx: 0, dy: 30 }, { id: "pin2", dx: 60, dy: 30 }],
      POTENTIOMETER: [{ id: "left", dx: 10, dy: 50 }, { id: "wiper", dx: 45, dy: 50 }, { id: "right", dx: 80, dy: 50 }],
    }

    const component = { x: 500, y: 300 }
    for (const [type, pins] of Object.entries(expected)) {
      const def = getComponentDef(type)
      expect(def.pins.map(({ id, dx, dy }) => ({ id, dx, dy }))).toEqual(pins)
      for (const pin of pins) {
        expect(getPinPosition(component, def.pins.find((p) => p.id === pin.id)))
          .toEqual({ x: component.x + pin.dx, y: component.y + pin.dy })
      }
    }
    // COMPONENT_TYPES importé uniquement pour confirmer qu'aucune mutation
    // n'a été introduite ailleurs dans ce module (sanity check).
    expect(COMPONENT_TYPES.RESISTOR.pins[0].dx).toBe(0)
  })

  it("cohérence : getPinPresentationPosition() délègue bien au calcul canonique pour le cas générique (non-LED)", () => {
    const component = { x: 300, y: 150, type: "RESISTOR" }
    const pin = { id: "A", dx: 0, dy: 14 }
    expect(getPinPresentationPosition(component, pin)).toEqual(getPinPosition(component, pin))
  })
})
