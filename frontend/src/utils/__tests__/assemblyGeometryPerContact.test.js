/**
 * assemblyGeometryPerContact.test.js — A8-H-BRIDGE-ASSEMBLY-PREQ.
 *
 * Extension générique de AssemblyProfile : un même pin électrique portant
 * plusieurs PhysicalContacts peut déclarer une root/style par contact
 * (`leads[pin].contacts[contactId]`). Tous les tests utilisent un `def` et un
 * `profile` synthétiques injectés via `options` : aucune connaissance d'un type
 * de composant réel n'est nécessaire.
 */
import { describe, it, expect } from "vitest"
import { resolveAssemblyGeometry } from "../assemblyGeometry.js"
import { getAssemblyProfile } from "../../visualization/assemblyProfiles.js"

const bb = { id: "bb1", position: { x: 0, y: 0 }, layout: "STANDARD_V1" }

const contact = (id, dx, dy, extra = {}) => ({ id, dx, dy, wireConnectable: true, breadboardInsertable: true, ...extra })

// Pin "SHARED" à 2 contacts physiques + pin "OTHER" à 1 contact.
const def = {
  pins: [
    { id: "SHARED", dx: 24, dy: 60, contacts: [contact("c1", 24, 60), contact("c2", 60, 60)] },
    { id: "OTHER", dx: 36, dy: 72, contacts: [contact("o1", 36, 72)] },
  ],
}
const comp = { uid: "x", type: "SYNTHETIC", x: 100, y: 200 }
const run = (profile, breadboard = null, component = comp) =>
  resolveAssemblyGeometry(component, breadboard, { def, profile })
const find = (g, contactId) => g.contacts.find((c) => c.contactId === contactId)
const profile = (leads) => ({ kind: "through-hole", leads })

const PIN_ROOT = { dx: 10, dy: 20 }
const CONTACT_ROOT = { dx: 50, dy: 30 }

describe("A8-H-BRIDGE-ASSEMBLY-PREQ — leads per-contact génériques", () => {
  it("T1 legacy : root/style du pin appliqués à chaque contact, sans `contacts`", () => {
    const g = run(profile({ SHARED: { root: PIN_ROOT, style: "metallic-wire" } }))
    for (const id of ["c1", "c2"]) {
      expect(find(g, id).root).toEqual({ x: 110, y: 220 })
      expect(find(g, id).style).toBe("metallic-wire")
    }
  })

  it("T2 per-contact roots : deux roots distinctes pour un même pin", () => {
    const g = run(profile({
      SHARED: { root: PIN_ROOT, contacts: { c1: { root: { dx: 24, dy: 40 } }, c2: { root: { dx: 60, dy: 44 } } } },
    }))
    expect(find(g, "c1").root).toEqual({ x: 124, y: 240 })
    expect(find(g, "c2").root).toEqual({ x: 160, y: 244 })
  })

  it("T3/T4 identités : pinId commun (électrique), contactId propre (présentation)", () => {
    const g = run(profile({
      SHARED: { root: PIN_ROOT, contacts: { c1: { root: { dx: 24, dy: 40 } }, c2: { root: { dx: 60, dy: 44 } } } },
    }))
    const shared = g.contacts.filter((c) => c.pinId === "SHARED")
    expect(shared.map((c) => c.contactId)).toEqual(["c1", "c2"])
    expect(new Set(shared.map((c) => c.pinId)).size).toBe(1)
  })

  it("T5 precedence root : contact.root > pin.root > target", () => {
    const g = run(profile({
      SHARED: { root: PIN_ROOT, contacts: { c2: { root: CONTACT_ROOT } } },
      OTHER: {}, // ni root de pin ni de contact -> target
    }))
    expect(find(g, "c1").root).toEqual({ x: 110, y: 220 }) // pin.root
    expect(find(g, "c2").root).toEqual({ x: 150, y: 230 }) // contact.root
    expect(find(g, "o1").root).toEqual(find(g, "o1").target) // target
  })

  it("T6 precedence style : contact.style > pin.style > wire", () => {
    const g = run(profile({
      SHARED: { root: PIN_ROOT, style: "metallic-wire", contacts: { c2: { style: "dark-wire" } } },
      OTHER: { root: PIN_ROOT },
    }))
    expect(find(g, "c2").style).toBe("dark-wire")
    expect(find(g, "c1").style).toBe("metallic-wire")
    expect(find(g, "o1").style).toBe("wire")
  })

  it("T7 override partiel : contact.root seul hérite du style du pin", () => {
    const g = run(profile({
      SHARED: { root: PIN_ROOT, style: "metallic-wire", contacts: { c2: { root: CONTACT_ROOT } } },
    }))
    expect(find(g, "c2").root).toEqual({ x: 150, y: 230 })
    expect(find(g, "c2").style).toBe("metallic-wire")
  })

  it("T8 override partiel : contact.style seul conserve la root du pin", () => {
    const g = run(profile({
      SHARED: { root: PIN_ROOT, style: "metallic-wire", contacts: { c2: { style: "lug" } } },
    }))
    expect(find(g, "c2").root).toEqual({ x: 110, y: 220 })
    expect(find(g, "c2").style).toBe("lug")
  })

  it("T9 root de contact invalide : repli sûr sur pin.root puis target (jamais NaN)", () => {
    const invalid = [{ dx: NaN, dy: 1 }, { dx: 1 }, { dx: "1", dy: "2" }, { dx: Infinity, dy: 0 }, null, 42, "x"]
    for (const root of invalid) {
      const withPin = run(profile({ SHARED: { root: PIN_ROOT, contacts: { c1: { root } } } }))
      expect(find(withPin, "c1").root).toEqual({ x: 110, y: 220 })
      const noPin = run(profile({ SHARED: { contacts: { c1: { root } } } }))
      expect(find(noPin, "c1").root).toEqual(find(noPin, "c1").target)
      for (const c of [...withPin.contacts, ...noPin.contacts]) {
        expect(Number.isFinite(c.root.x) && Number.isFinite(c.root.y)).toBe(true)
      }
    }
  })

  it("T10 style de contact invalide : repli sûr sur pin.style puis wire", () => {
    for (const style of ["neon", 42, null, {}, ""]) {
      const withPin = run(profile({ SHARED: { root: PIN_ROOT, style: "lug", contacts: { c1: { style } } } }))
      expect(find(withPin, "c1").style).toBe("lug")
      const noPin = run(profile({ SHARED: { root: PIN_ROOT, contacts: { c1: { style } } } }))
      expect(find(noPin, "c1").style).toBe("wire")
    }
  })

  it("T11 override inconnu / non conforme : n'affecte aucun contact réel", () => {
    const base = run(profile({ SHARED: { root: PIN_ROOT, style: "metallic-wire" }, OTHER: { root: PIN_ROOT } }))
    const overrides = [
      { ghost: { root: CONTACT_ROOT, style: "lug" } },
      { toString: { root: CONTACT_ROOT } }, // clé de prototype
      { o1: { root: CONTACT_ROOT, style: "lug" } }, // contact d'un AUTRE pin
      { c1: null }, { c1: 7 }, { c1: "x" },
      null, "x", 3,
    ]
    for (const contacts of overrides) {
      const g = run(profile({ SHARED: { root: PIN_ROOT, style: "metallic-wire", contacts }, OTHER: { root: PIN_ROOT } }))
      expect(g).toEqual(base)
    }
  })

  it("T12 ordre : pin puis contact historique préservé", () => {
    const g = run(profile({
      SHARED: { root: PIN_ROOT, contacts: { c2: { root: CONTACT_ROOT }, c1: { root: CONTACT_ROOT } } },
    }))
    expect(g.contacts.map((c) => `${c.pinId}:${c.contactId}`)).toEqual(["SHARED:c1", "SHARED:c2", "OTHER:o1"])
  })

  it("T13 breadboard : inserted/hole/holePosition/target identiques avec ou sans overrides", () => {
    const inserted = { uid: "x", type: "SYNTHETIC", x: 0, y: 0 }
    const legacy = run(profile({ SHARED: { root: PIN_ROOT, style: "wire" } }), bb, inserted)
    const perContact = run(profile({
      SHARED: { root: PIN_ROOT, style: "wire", contacts: { c1: { root: CONTACT_ROOT, style: "lug" }, c2: { root: { dx: 0, dy: 0 } } } },
    }), bb, inserted)
    expect(legacy.inserted).toBe(true)
    expect(perContact.inserted).toBe(legacy.inserted)
    for (const [a, b] of legacy.contacts.map((c, i) => [c, perContact.contacts[i]])) {
      expect(b.hole).toEqual(a.hole)
      expect(b.holePosition).toEqual(a.holePosition)
      expect(b.target).toEqual(a.target)
      expect(b.pinId).toBe(a.pinId)
      expect(b.contactId).toBe(a.contactId)
    }
  })

  it("T14 aucune connaissance de type : le profil est lu depuis options, pas depuis le type", () => {
    // type inconnu du registre : sans `options.profile` la géométrie reste vide.
    expect(resolveAssemblyGeometry(comp, null, { def }).contacts).toEqual([])
    expect(getAssemblyProfile("SYNTHETIC")).toBeNull()
  })

  it("le resolver ne mute ni le profil ni le def", () => {
    const p = profile({ SHARED: { root: PIN_ROOT, contacts: { c1: { root: CONTACT_ROOT } } } })
    const snapshot = JSON.stringify([p, def])
    run(p)
    expect(JSON.stringify([p, def])).toBe(snapshot)
  })
})
