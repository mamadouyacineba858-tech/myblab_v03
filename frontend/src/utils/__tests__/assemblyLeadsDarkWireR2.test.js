/**
 * assemblyLeadsDarkWireR2.test.js — A7-C5-R2.
 *
 * Preuve de la nouvelle primitive de présentation générique `dark-wire`
 * (trait unique sombre, AssemblyLeadsLayer.css) et de son unique
 * consommateur réel à ce jour : HC_SR04 (correction Founder post-A7-C5-R1
 * STOP S3 — `wire`/`metallic-wire`/`lug` rendaient tous un aspect trop clair).
 *
 * Couvre R2-01 à R2-14 du ticket §12. Ne réimplémente aucune logique de
 * resolveAssemblyGeometry/resolveComponentContactHoles/computeBreadboardPlacement
 * (déjà couvertes par assemblyGeometry.test.js / physicalContactConvergence.test.js /
 * hcSr04A7C5.test.js) — se concentre STRICTEMENT sur la nouvelle primitive et
 * sur la non-régression des styles historiques.
 */
import { describe, it, expect } from "vitest"
import { resolveAssemblyGeometry } from "../assemblyGeometry.js"
import { resolveComponentContactHoles } from "../breadboardGeometry.js"
import { computeBreadboardPlacement } from "../breadboardPlacementAdapter.js"
import { getComponentDef } from "../../config/componentDefinitions.js"
import { getAssemblyProfile } from "../../visualization/assemblyProfiles.js"

const bb = { id: "bb1", position: { x: 0, y: 0 }, layout: "STANDARD_V1" }

describe("A7-C5-R2 — R2-01/R2-02/R2-03 : dark-wire accepté, jamais rétrogradé, fallback wire préservé", () => {
  // LED (canonical : anode + cathode) sert de support neutre — le fixture ne
  // déclare un lead QUE pour "anode" ; resolveAssemblyGeometry produit tout
  // de même un contact pour "cathode" (style "wire" par défaut, aucun profil
  // déclaré pour ce pin) : chaque test isole donc explicitement le contact
  // "anode" plutôt que de supposer un tableau à un seul élément.
  const findAnode = (g) => g.contacts.find((c) => c.pinId === "anode")

  it("R2-01 — dark-wire est accepté (résolu tel quel) par resolveAssemblyGeometry", () => {
    const fixtureProfile = {
      kind: "through-hole",
      leads: { anode: { root: { dx: 5, dy: 5 }, style: "dark-wire" } },
    }
    const g = resolveAssemblyGeometry({ uid: "x1", type: "LED", x: 0, y: 0 }, null, { profile: fixtureProfile })
    expect(findAnode(g).style).toBe("dark-wire")
  })

  it("R2-02 — dark-wire n'est PAS silencieusement remplacé par le fallback wire", () => {
    const fixtureProfile = {
      kind: "through-hole",
      leads: { anode: { root: { dx: 5, dy: 5 }, style: "dark-wire" } },
    }
    const g = resolveAssemblyGeometry({ uid: "x1", type: "LED", x: 0, y: 0 }, null, { profile: fixtureProfile })
    expect(findAnode(g).style).not.toBe("wire")
  })

  it("R2-03 — un style réellement inconnu (jamais dark-wire) continue de fallback vers wire (comportement historique inchangé)", () => {
    const fixtureProfile = {
      kind: "through-hole",
      leads: { anode: { root: { dx: 5, dy: 5 }, style: "totally-unknown-style" } },
    }
    const g = resolveAssemblyGeometry({ uid: "x1", type: "LED", x: 0, y: 0 }, null, { profile: fixtureProfile })
    expect(findAnode(g).style).toBe("wire")
  })
})

describe("A7-C5-R2 — R2-04/R2-05 : HC_SR04 résout 4 contacts dark-wire, ordre VCC/TRIG/ECHO/GND", () => {
  it("R2-04 — les 4 leads HC_SR04 sont dark-wire", () => {
    const profile = getAssemblyProfile("HC_SR04")
    expect(profile.leads.VCC.style).toBe("dark-wire")
    expect(profile.leads.TRIG.style).toBe("dark-wire")
    expect(profile.leads.ECHO.style).toBe("dark-wire")
    expect(profile.leads.GND.style).toBe("dark-wire")
  })

  it("R2-04bis — resolveAssemblyGeometry(HC_SR04) produit 4 contacts, tous dark-wire", () => {
    const g = resolveAssemblyGeometry({ uid: "h1", type: "HC_SR04", x: -4, y: 16 }, bb)
    expect(g.contacts).toHaveLength(4)
    for (const c of g.contacts) expect(c.style).toBe("dark-wire")
  })

  it("R2-05 — ordre VCC/TRIG/ECHO/GND préservé", () => {
    const g = resolveAssemblyGeometry({ uid: "h1", type: "HC_SR04", x: -4, y: 16 }, bb)
    expect(g.contacts.map((c) => c.pinId)).toEqual(["VCC", "TRIG", "ECHO", "GND"])
  })
})

describe("A7-C5-R2 — R2-06 à R2-10 : géométrie strictement inchangée (racines, targets, pitch, bodyClip, inserted)", () => {
  const profile = getAssemblyProfile("HC_SR04")

  it("R2-06 — racines inchangées : VCC(60,77)/TRIG(67,77)/ECHO(74,77)/GND(81,77)", () => {
    expect(profile.leads.VCC.root).toEqual({ dx: 60, dy: 77 })
    expect(profile.leads.TRIG.root).toEqual({ dx: 67, dy: 77 })
    expect(profile.leads.ECHO.root).toEqual({ dx: 74, dy: 77 })
    expect(profile.leads.GND.root).toEqual({ dx: 81, dy: 77 })
  })

  it("R2-07 — PhysicalContacts (targets) inchangés : VCC(54,92)/TRIG(66,92)/ECHO(78,92)/GND(90,92)", () => {
    const def = getComponentDef("HC_SR04")
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, p]))
    expect([byId.VCC.dx, byId.VCC.dy]).toEqual([54, 92])
    expect([byId.TRIG.dx, byId.TRIG.dy]).toEqual([66, 92])
    expect([byId.ECHO.dx, byId.ECHO.dy]).toEqual([78, 92])
    expect([byId.GND.dx, byId.GND.dy]).toEqual([90, 92])
  })

  it("R2-08 — pitch reste 12/12/12", () => {
    const def = getComponentDef("HC_SR04")
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, p]))
    expect(byId.TRIG.dx - byId.VCC.dx).toBe(12)
    expect(byId.ECHO.dx - byId.TRIG.dx).toBe(12)
    expect(byId.GND.dx - byId.ECHO.dx).toBe(12)
  })

  it("R2-09 — bodyClip inchangé (toujours absent)", () => {
    expect(profile.bodyClip).toBeUndefined()
  })

  it("R2-10 — inserted semantics inchangées : même origine (-4,16) résout toujours inserted:true, 4 trous distincts", () => {
    const { results, allResolved } = resolveComponentContactHoles(bb, getComponentDef("HC_SR04").pins, { x: -4, y: 16 })
    expect(allResolved).toBe(true)
    expect(new Set(results.map((r) => `${r.hole.column}:${r.hole.row}`)).size).toBe(4)

    const placement = computeBreadboardPlacement(bb, "HC_SR04", { x: 0, y: 16 }, [])
    expect(placement.valid).toBe(true)

    const g = resolveAssemblyGeometry({ uid: "h1", type: "HC_SR04", x: -4, y: 16 }, bb)
    expect(g.inserted).toBe(true)
  })
})

describe("A7-C5-R2 — R2-11 à R2-14 : aucune régression sur les styles/profils historiques", () => {
  it("R2-11 — aucun autre profil historique n'a été modifié (types représentatifs de chaque style)", () => {
    // wire : LED (anode/cathode), lug : POTENTIOMETER, metallic-wire : CAPACITOR/THERMISTOR/DIODE/SLIDE_SWITCH.
    expect(getAssemblyProfile("LED").leads.anode).toEqual({ root: { dx: 28, dy: 32 }, style: "wire" })
    expect(getAssemblyProfile("LED").leads.cathode).toEqual({ root: { dx: 52, dy: 32 }, style: "wire" })
    expect(getAssemblyProfile("POTENTIOMETER").leads.left.style).toBe("lug")
    expect(getAssemblyProfile("POTENTIOMETER").leads.wiper.style).toBe("lug")
    expect(getAssemblyProfile("POTENTIOMETER").leads.right.style).toBe("lug")
  })

  it("R2-12 — wire reste wire (LED)", () => {
    expect(getAssemblyProfile("LED").leads.anode.style).toBe("wire")
  })

  it("R2-13 — metallic-wire reste metallic-wire (CAPACITOR, THERMISTOR, DIODE, SLIDE_SWITCH)", () => {
    expect(getAssemblyProfile("CAPACITOR").leads.pinA.style).toBe("metallic-wire")
    expect(getAssemblyProfile("CAPACITOR").leads.pinB.style).toBe("metallic-wire")
    expect(getAssemblyProfile("THERMISTOR").leads.A.style).toBe("metallic-wire")
    expect(getAssemblyProfile("THERMISTOR").leads.B.style).toBe("metallic-wire")
    expect(getAssemblyProfile("DIODE").leads.anode.style).toBe("metallic-wire")
    expect(getAssemblyProfile("DIODE").leads.cathode.style).toBe("metallic-wire")
    expect(getAssemblyProfile("SLIDE_SWITCH").leads.throwA.style).toBe("metallic-wire")
    expect(getAssemblyProfile("SLIDE_SWITCH").leads.common.style).toBe("metallic-wire")
    expect(getAssemblyProfile("SLIDE_SWITCH").leads.throwB.style).toBe("metallic-wire")
  })

  it("R2-14 — lug reste lug (POTENTIOMETER)", () => {
    expect(getAssemblyProfile("POTENTIOMETER").leads.left.style).toBe("lug")
    expect(getAssemblyProfile("POTENTIOMETER").leads.wiper.style).toBe("lug")
    expect(getAssemblyProfile("POTENTIOMETER").leads.right.style).toBe("lug")
  })

  it("aucun autre composant ne consomme dark-wire (primitive dédiée à HC_SR04 pour l'instant)", () => {
    const OTHER_TYPES = [
      "LED", "LDR", "THERMISTOR", "DIODE", "CAPACITOR", "POLARIZED_CAPACITOR", "BUZZER",
      "RGB_LED", "NPN_TRANSISTOR", "POTENTIOMETER", "SLIDE_SWITCH", "VIBRATION_MOTOR",
      "LIGHT_BULB", "TMP36", "FLEX_SENSOR", "SOIL_MOISTURE_SENSOR", "FORCE_SENSOR",
      "PIR_MOTION_SENSOR", "TILT_SENSOR", "IR_RECEIVER",
    ]
    for (const type of OTHER_TYPES) {
      const profile = getAssemblyProfile(type)
      if (!profile) continue
      for (const lead of Object.values(profile.leads)) {
        expect(lead.style, `${type} ne devrait pas utiliser dark-wire`).not.toBe("dark-wire")
      }
    }
  })
})
