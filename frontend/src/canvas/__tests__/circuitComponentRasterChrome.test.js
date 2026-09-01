/**
 * circuitComponentRasterChrome.test.js — MB-VIS-PROTOTYPE-001C.2 / 001C.4
 *
 * Verrouille le nettoyage visuel du RESISTOR à backend raster :
 *  - 001C.2 : le wrapper `.circuit-component__body` ne l'habille plus ;
 *  - 001C.4 : le marqueur `.myblab-pin` n'est plus rendu à la pointe des leads.
 * Dans les deux cas : règle CSS déclarative locale au RESISTOR, aucune
 * branche `type === "…"` dans la couche de rendu, aucun changement du système
 * breadboard.
 *
 * Contexte 001C.2 : le wrapper
 * générique `.circuit-component__body` (fond sombre + bordure + coins
 * arrondis + ombre portée générique, défini plus haut dans le même fichier)
 * NE DOIT PLUS habiller un composant dont le renderer émet `.part-resistor`
 * (asset raster validé MB-VIS-PROTOTYPE-001B, qui porte déjà sa propre
 * silhouette détourée ET son ombre de contact cuite dans l'image).
 *
 * Garde STATIQUE volontaire (même approche que partDimensionsGuard.test.js) :
 * la règle repose sur le sélecteur CSS `:has()`, dont la cascade n'est pas
 * restituée de façon fiable par jsdom — on vérifie donc la présence et le
 * contenu de la règle dans la source, jamais un getComputedStyle.
 *
 * Ce test n'affaiblit aucun garde-fou existant : il est purement additif et
 * vérifie en plus que la règle de BASE (`.circuit-component__body`) conserve
 * son habillage pour tous les autres composants (aucune suppression globale).
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSS_PATH = resolve(__dirname, "../CircuitComponent.css")

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "")
}

const css = stripComments(readFileSync(CSS_PATH, "utf-8"))
const RASTER_RULE_RE = /\.circuit-component__body:has\(\s*>\s*\.part-resistor\s*\)\s*\{([^}]*)\}/

describe("MB-VIS-PROTOTYPE-001C.2 — .circuit-component__body n'habille pas le RESISTOR raster", () => {
  it("une règle cible .circuit-component__body pour un enfant direct .part-resistor via :has()", () => {
    expect(css).toMatch(RASTER_RULE_RE)
  })

  it("cette règle neutralise fond, bordure, coins arrondis et ombre générique du wrapper", () => {
    const block = css.match(RASTER_RULE_RE)
    expect(block, "règle raster introuvable dans CircuitComponent.css").not.toBeNull()
    const body = block[1]
    expect(body, "background non neutralisé").toMatch(/background:\s*transparent\s*;/)
    expect(body, "border non neutralisée").toMatch(/border:\s*0\s*;/)
    expect(body, "border-radius non neutralisé").toMatch(/border-radius:\s*0\s*;/)
    expect(body, "box-shadow générique non neutralisée").toMatch(/box-shadow:\s*none\s*;/)
  })

  it("la règle de base .circuit-component__body conserve son habillage (aucune suppression globale)", () => {
    const base = css.match(/\.circuit-component__body\s*\{([^}]*)\}/)
    expect(base).not.toBeNull()
    expect(base[1]).toMatch(/background:\s*#1a1f2e/)
    expect(base[1]).toMatch(/border:\s*1px solid #334155/)
    expect(base[1]).toMatch(/box-shadow:\s*0 4px 12px rgba\(0, 0, 0, 0\.35\)/)
  })

  it("le nettoyage passe par une règle CSS déclarative, pas par une nouvelle branche type=== dans la couche de rendu", () => {
    const jsx = readFileSync(resolve(__dirname, "../CircuitComponent.jsx"), "utf-8")
    const typeBranches = [...jsx.matchAll(/\btype\s*===\s*["']([A-Z0-9_]+)["']/g)].map((m) => m[1])
    // Inchangé depuis MB-VIS-RENDER-009 T6 : seules les 2 comparaisons LED
    // documentées existent ; ce ticket n'en ajoute pas (ni RESISTOR ni RASTER).
    expect(typeBranches.sort()).toEqual(["LED", "LED"])
  })
})

/**
 * MB-VIS-PROTOTYPE-001C.4 — les deux « trous » sombres visibles à la pointe
 * de chaque lead du RESISTOR sont le marqueur visuel du <Pin> (`.myblab-pin` :
 * disque #1e293b cerclé #94a3b8, z-index 10) rendu aux points d'insertion
 * A(0,14)/B(84,14). Pour le RESISTOR uniquement, cet habillage est neutralisé
 * en CSS (même résultat que `hideVisualMarker` de la LED) sans branche
 * `type === "…"` dans la couche de rendu et sans toucher le système
 * breadboard. Le <button> reste dans le DOM (câblage/drag/sélection intacts).
 */
const PIN_RULE_RE =
  /\.circuit-component:has\(\s*\.part-resistor\s*\)\s+\.myblab-pin\s*\{([^}]*)\}/

describe("MB-VIS-PROTOTYPE-001C.4 — le marqueur .myblab-pin n'est pas rendu pour le RESISTOR raster", () => {
  it("une règle cible .myblab-pin dans un .circuit-component qui contient .part-resistor via :has()", () => {
    expect(css).toMatch(PIN_RULE_RE)
  })

  it("cette règle neutralise uniquement l'habillage du marqueur (fond, bordure, ombre) — pas opacity/pointer-events/taille", () => {
    const block = css.match(PIN_RULE_RE)
    expect(block, "règle marqueur RESISTOR introuvable dans CircuitComponent.css").not.toBeNull()
    const body = block[1]
    expect(body, "fond du marqueur non neutralisé").toMatch(/background:\s*transparent\s*;/)
    expect(body, "anneau du marqueur non neutralisé").toMatch(/border:\s*0\s*;/)
    expect(body, "ombre du marqueur non neutralisée").toMatch(/box-shadow:\s*none\s*;/)
    // Le clic de câblage doit rester fonctionnel : la règle NE touche PAS ces
    // propriétés (le <Pin> garde opacity:1 en inline style, pointer-events par
    // défaut, et ses 12x12px).
    expect(body).not.toMatch(/opacity\s*:/)
    expect(body).not.toMatch(/pointer-events\s*:/)
    expect(body).not.toMatch(/display\s*:/)
    expect(body).not.toMatch(/\bwidth\s*:/)
    expect(body).not.toMatch(/\bheight\s*:/)
  })

  it("la règle de base .myblab-pin (Pin.css) n'est pas modifiée par ce ticket — garde globale", () => {
    // Pin.css est le SEUL endroit qui définit l'apparence de base du marqueur ;
    // ce ticket ne doit y toucher en rien (aucune suppression globale du
    // marqueur pour les autres composants).
    const pinCss = readFileSync(resolve(__dirname, "../Pin.css"), "utf-8")
    expect(pinCss).toMatch(/\.myblab-pin\s*\{[^}]*background:\s*#1e293b/)
    expect(pinCss).toMatch(/\.myblab-pin\s*\{[^}]*border:\s*2px solid #94a3b8/)
  })

  it("Breadboard.jsx et Breadboard.css ne sont pas référencés/modifiés par la solution", () => {
    // La règle vit dans CircuitComponent.css et ne cible que .myblab-pin /
    // .part-resistor : aucune classe .breadboard* n'apparaît dans le bloc.
    const block = css.match(PIN_RULE_RE)[0]
    expect(block).not.toMatch(/breadboard/i)
  })
})
