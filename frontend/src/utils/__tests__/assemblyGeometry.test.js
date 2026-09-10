/**
 * assemblyGeometry.test.js — FT-C-001-A.
 *
 * Preuves de la fondation générique Assembly Geometry (§34) :
 *   A. non inséré  → target = PhysicalContact naturel
 *   B. inséré      → hole résolu + holePosition = centre EXACT du trou
 *   C. résolution partielle → politique sûre (inserted:false)
 *   D. aucune mutation (component / breadboard / def)
 *   E. aucune identité électrique modifiée (pinId canonique, contactId présentation)
 *   F. LED — 2 contacts
 *   G. NPN_TRANSISTOR — 3 contacts distincts
 *   H. type SANS profil (CAPACITOR aujourd'hui — asset radial = FT-C-001-B) → géométrie vide
 *   I. POTENTIOMETER — 3 contacts distincts
 *   J. changement de position → la géométrie suit
 *   K. déplacement du breadboard → la géométrie suit
 *
 * + `getBreadboardHolePosition()` : centres de trous uniques et dérivés.
 *
 * INVARIANT vérifié partout : `contact.target` == PhysicalContact naturel
 * (`component.{x,y} + contact.{dx,dy}`) — jamais déplacé vers le trou, pour
 * rester coïncident avec le hit target <Pin> et l'endpoint de fil. Quand
 * inséré, `holePosition` est à ≤ 2 (INSERTION_TOLERANCE) de `target`.
 */
import { describe, it, expect } from "vitest"
import { resolveAssemblyGeometry } from "../assemblyGeometry.js"
import { getBreadboardHolePosition, BREADBOARD_PITCH } from "../breadboardGeometry.js"
import { getComponentDef } from "../../config/componentDefinitions.js"

const bb = { id: "bb1", position: { x: 0, y: 0 }, layout: "STANDARD_V1" }
const TOL = 2 // INSERTION_TOLERANCE (holeAt, par axe)

const near = (a, b, t = TOL) => Math.abs(a - b) <= t

// Positions d'insertion calculées à la main puis vérifiées par le test
// (résolution réelle via resolveComponentContactHoles → holeAt) :
//  - LED (28,62)/(52,62), écart 24 = 2·pitch → x=-4,y=10 : anode col2/row6,
//    cathode col4/row6, résidus 0/0/0 ;
//  - NPN B(31.5)/C(42.5)/E(53.5)@58.5, écarts 11/11 → x=4.5,y=1.5 : col3/4/5
//    row5, résidus 0/-1/-2 (11 ≠ pitch : target ≠ centre du trou pour C/E) ;
//  - POT (FT-C-COMP-003) 36/60/84@108, écarts 24/24 = 2·pitch → x=0,y=0 :
//    col3/5/7 row9, résidus 0/0/0.
const LED_IN = { uid: "led-in", type: "LED", x: -4, y: 10 }
const NPN_IN = { uid: "npn-in", type: "NPN_TRANSISTOR", x: 4.5, y: 1.5 }
const POT_IN = { uid: "pot-in", type: "POTENTIOMETER", x: 0, y: 0 }

// ---------------------------------------------------------------------------
// getBreadboardHolePosition
// ---------------------------------------------------------------------------
describe("getBreadboardHolePosition — centre de trou pur et dérivé", () => {
  it("projette (colonne,rangée) → breadboard.position + n·PITCH, sans dupliquer le pas", () => {
    expect(getBreadboardHolePosition(bb, 0, 0)).toEqual({ x: 0, y: 0 })
    expect(getBreadboardHolePosition(bb, 3, 5)).toEqual({ x: 3 * BREADBOARD_PITCH, y: 5 * BREADBOARD_PITCH })
    expect(getBreadboardHolePosition({ position: { x: 17, y: -4 } }, 2, 6)).toEqual({
      x: 17 + 2 * BREADBOARD_PITCH,
      y: -4 + 6 * BREADBOARD_PITCH,
    })
  })

  it("chaque (colonne,rangée) donne un centre UNIQUE", () => {
    const seen = new Set()
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 6; r++) {
        const p = getBreadboardHolePosition(bb, c, r)
        const key = `${p.x}:${p.y}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
  })

  it("entrées invalides → null (jamais NaN)", () => {
    expect(getBreadboardHolePosition(null, 1, 1)).toBeNull()
    expect(getBreadboardHolePosition({}, 1, 1)).toBeNull()
    expect(getBreadboardHolePosition(bb, NaN, 1)).toBeNull()
    expect(getBreadboardHolePosition(bb, 1, undefined)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// A / F — LED libre : 2 contacts, target = PhysicalContact naturel
// ---------------------------------------------------------------------------
describe("A/F — LED libre (hors breadboard)", () => {
  const led = { uid: "led-1", type: "LED", x: 100, y: 200 }

  it("2 contacts, inserted:false, hole/holePosition null", () => {
    const g = resolveAssemblyGeometry(led, null)
    expect(g.inserted).toBe(false)
    expect(g.contacts).toHaveLength(2)
    for (const c of g.contacts) {
      expect(c.hole).toBeNull()
      expect(c.holePosition).toBeNull()
    }
  })

  it("target = component.{x,y} + PhysicalContact.{dx,dy} (== getPinPresentationPosition)", () => {
    const g = resolveAssemblyGeometry(led, null)
    const anode = g.contacts.find((c) => c.pinId === "anode")
    const cathode = g.contacts.find((c) => c.pinId === "cathode")
    expect(anode.target).toEqual({ x: 128, y: 262 }) // (100+28, 200+62)
    expect(cathode.target).toEqual({ x: 152, y: 262 }) // (100+52, 200+62)
  })

  it("root vient du profil mécanique (sous le corps), distinct de target", () => {
    const g = resolveAssemblyGeometry(led, null)
    const anode = g.contacts.find((c) => c.pinId === "anode")
    expect(anode.root).toEqual({ x: 128, y: 236 }) // (100+28, 200+36) — dy racine profil
    expect(anode.root.y).toBeLessThan(anode.target.y) // la racine est AU-DESSUS du contact
    expect(anode.style).toBe("wire")
  })
})

// ---------------------------------------------------------------------------
// B — LED insérée : hole résolu + holePosition = centre exact
// ---------------------------------------------------------------------------
describe("B — LED insérée sur breadboard", () => {
  it("inserted:true, chaque contact a un hole + holePosition dérivé de getBreadboardHolePosition", () => {
    const g = resolveAssemblyGeometry(LED_IN, bb)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(2)

    const anode = g.contacts.find((c) => c.pinId === "anode")
    const cathode = g.contacts.find((c) => c.pinId === "cathode")

    expect(anode.hole).toEqual({ column: 2, row: 6 })
    expect(cathode.hole).toEqual({ column: 4, row: 6 })

    expect(anode.holePosition).toEqual(getBreadboardHolePosition(bb, 2, 6))
    expect(cathode.holePosition).toEqual(getBreadboardHolePosition(bb, 4, 6))
  })

  it("target reste le PhysicalContact naturel — jamais déplacé vers le trou — mais à ≤ tolérance du centre du trou", () => {
    const g = resolveAssemblyGeometry(LED_IN, bb)
    for (const c of g.contacts) {
      // target = position naturelle (coïncide avec <Pin> / endpoint fil)
      expect(c.target).toEqual({
        x: LED_IN.x + getComponentDef("LED").pins.find((p) => p.id === c.pinId).dx,
        y: LED_IN.y + getComponentDef("LED").pins.find((p) => p.id === c.pinId).dy,
      })
      // ... et l'extrémité de patte tombe bien sur le trou (à la tolérance près)
      expect(near(c.target.x, c.holePosition.x)).toBe(true)
      expect(near(c.target.y, c.holePosition.y)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// C — résolution partielle → politique sûre
// ---------------------------------------------------------------------------
describe("C — résolution partielle → inserted:false (politique sûre)", () => {
  it("une seule patte alignée sur un trou ⇒ inserted:false, holes partiels exposés", () => {
    // anode alignée (x tel que -4 ⇒ col2), mais cathode décalée : on translate
    // la LED de +5px en X → anode résidu 5 (non résolu), donc au moins un
    // contact enfichable non résolu.
    const half = { uid: "led-half", type: "LED", x: -4 + 5, y: 10 }
    const g = resolveAssemblyGeometry(half, bb)
    expect(g.inserted).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// D — aucune mutation
// ---------------------------------------------------------------------------
describe("D — aucune mutation des entrées", () => {
  it("component / breadboard / def inchangés après résolution", () => {
    const led = { uid: "led-x", type: "LED", x: 10, y: 20 }
    const bbCopy = { id: "bb1", position: { x: 0, y: 0 }, layout: "STANDARD_V1" }
    const ledSnap = JSON.stringify(led)
    const bbSnap = JSON.stringify(bbCopy)
    const def = getComponentDef("LED")
    const defSnap = JSON.stringify(def)

    resolveAssemblyGeometry(led, bbCopy)
    resolveAssemblyGeometry(LED_IN, bbCopy)

    expect(JSON.stringify(led)).toBe(ledSnap)
    expect(JSON.stringify(bbCopy)).toBe(bbSnap)
    expect(JSON.stringify(def)).toBe(defSnap)
  })
})

// ---------------------------------------------------------------------------
// E — identité électrique intacte
// ---------------------------------------------------------------------------
describe("E — aucune identité électrique modifiée", () => {
  it("pinId = id canonique ; contactId = identité de présentation (jamais un net)", () => {
    const g = resolveAssemblyGeometry(NPN_IN, bb)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(
      new Set(["base", "collector", "emitter"]),
    )
    expect(new Set(g.contacts.map((c) => c.contactId))).toEqual(new Set(["B", "C", "E"]))
    // contactId ≠ pinId pour NPN (contacts explicites nommés) mais reste
    // purement présentation : la géométrie ne renvoie aucun champ de net.
    for (const c of g.contacts) {
      expect(Object.keys(c).sort()).toEqual(
        ["contactId", "hole", "holePosition", "pinId", "root", "style", "target"].sort(),
      )
    }
  })
})

// ---------------------------------------------------------------------------
// G — NPN 3 contacts distincts
// ---------------------------------------------------------------------------
describe("G — NPN_TRANSISTOR : 3 contacts", () => {
  it("libre : 3 pattes, targets = B/C/E naturels, roots sous le boîtier", () => {
    const npn = { uid: "npn-free", type: "NPN_TRANSISTOR", x: 0, y: 0 }
    const g = resolveAssemblyGeometry(npn, null)
    expect(g.contacts).toHaveLength(3)
    const byPin = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPin.base.target).toEqual({ x: 31.5, y: 58.5 })
    expect(byPin.collector.target).toEqual({ x: 42.5, y: 58.5 })
    expect(byPin.emitter.target).toEqual({ x: 53.5, y: 58.5 })
    for (const c of g.contacts) expect(c.root.y).toBeLessThan(c.target.y)
  })

  it("inséré : 3 trous CONSÉCUTIFS DISTINCTS, aucune fusion, targets naturels ≤ tolérance des centres", () => {
    const g = resolveAssemblyGeometry(NPN_IN, bb)
    expect(g.inserted).toBe(true)
    const cols = g.contacts.map((c) => c.hole.column).sort((a, z) => a - z)
    expect(cols).toEqual([3, 4, 5])
    expect(new Set(g.contacts.map((c) => `${c.hole.column}:${c.hole.row}`)).size).toBe(3)
    for (const c of g.contacts) {
      expect(near(c.target.x, c.holePosition.x)).toBe(true)
      expect(near(c.target.y, c.holePosition.y)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// I — POTENTIOMETER 3 contacts distincts
// ---------------------------------------------------------------------------
describe("I — POTENTIOMETER : 3 cosses", () => {
  it("libre : 3 cosses style 'lug', targets left/wiper/right naturels", () => {
    const pot = { uid: "pot-free", type: "POTENTIOMETER", x: 0, y: 0 }
    const g = resolveAssemblyGeometry(pot, null)
    expect(g.contacts).toHaveLength(3)
    const byPin = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPin.left.target).toEqual({ x: 36, y: 108 })
    expect(byPin.wiper.target).toEqual({ x: 60, y: 108 })
    expect(byPin.right.target).toEqual({ x: 84, y: 108 })
    for (const c of g.contacts) expect(c.style).toBe("lug")
  })

  it("inséré : 3 trous distincts, left/wiper/right restent 3 pins distincts", () => {
    const g = resolveAssemblyGeometry(POT_IN, bb)
    expect(g.inserted).toBe(true)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(["left", "wiper", "right"]))
    expect(new Set(g.contacts.map((c) => `${c.hole.column}:${c.hole.row}`)).size).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// H — type SANS profil mécanique → géométrie vide
// ---------------------------------------------------------------------------
describe("H — type sans profil d'assemblage → aucune patte dynamique", () => {
  it("CAPACITOR (asset radial = FT-C-001-B) : géométrie vide, aucune patte fantôme", () => {
    const cap = { uid: "cap-1", type: "CAPACITOR", x: 0, y: 0 }
    expect(resolveAssemblyGeometry(cap, null)).toEqual({ inserted: false, contacts: [] })
    expect(resolveAssemblyGeometry(cap, bb)).toEqual({ inserted: false, contacts: [] })
  })

  it("RESISTOR (composant axial non traversant) : géométrie vide", () => {
    const res = { uid: "res-1", type: "RESISTOR", x: 0, y: 0 }
    expect(resolveAssemblyGeometry(res, bb)).toEqual({ inserted: false, contacts: [] })
  })

  it("entrées dégénérées → géométrie vide, jamais d'exception", () => {
    expect(resolveAssemblyGeometry(null, bb)).toEqual({ inserted: false, contacts: [] })
    expect(resolveAssemblyGeometry({ type: "LED" }, bb)).toEqual({ inserted: false, contacts: [] })
    expect(resolveAssemblyGeometry({ type: "NOPE", x: 0, y: 0 }, bb)).toEqual({ inserted: false, contacts: [] })
  })
})

// ---------------------------------------------------------------------------
// J — la géométrie suit la position du composant
// ---------------------------------------------------------------------------
describe("J — changement de position du composant", () => {
  it("translater la LED translate root ET target du même vecteur", () => {
    const a = resolveAssemblyGeometry({ uid: "l", type: "LED", x: 0, y: 0 }, null)
    const b = resolveAssemblyGeometry({ uid: "l", type: "LED", x: 37, y: -11 }, null)
    for (let i = 0; i < a.contacts.length; i++) {
      expect(b.contacts[i].target.x - a.contacts[i].target.x).toBe(37)
      expect(b.contacts[i].target.y - a.contacts[i].target.y).toBe(-11)
      expect(b.contacts[i].root.x - a.contacts[i].root.x).toBe(37)
      expect(b.contacts[i].root.y - a.contacts[i].root.y).toBe(-11)
    }
  })

  it("sortir la LED de la grille (résidu > tolérance) ⇒ inserted repasse à false", () => {
    expect(resolveAssemblyGeometry(LED_IN, bb).inserted).toBe(true)
    expect(resolveAssemblyGeometry({ ...LED_IN, x: LED_IN.x + 400 }, bb).inserted).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// K — la géométrie suit le déplacement du breadboard
// ---------------------------------------------------------------------------
describe("K — déplacement du breadboard", () => {
  it("translater breadboard.position ET le composant du même vecteur conserve inserted + les mêmes trous relatifs", () => {
    const g0 = resolveAssemblyGeometry(LED_IN, bb)
    const moved = { id: "bb1", position: { x: 60, y: -24 }, layout: "STANDARD_V1" }
    const g1 = resolveAssemblyGeometry({ ...LED_IN, x: LED_IN.x + 60, y: LED_IN.y - 24 }, moved)
    expect(g1.inserted).toBe(true)
    expect(g1.contacts.map((c) => `${c.hole.column}:${c.hole.row}`)).toEqual(
      g0.contacts.map((c) => `${c.hole.column}:${c.hole.row}`),
    )
  })

  it("déplacer le breadboard SANS déplacer le composant casse l'alignement ⇒ inserted:false", () => {
    const moved = { id: "bb1", position: { x: 5, y: 0 }, layout: "STANDARD_V1" }
    expect(resolveAssemblyGeometry(LED_IN, moved).inserted).toBe(false)
  })
})
