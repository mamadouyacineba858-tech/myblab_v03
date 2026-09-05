/**
 * clientToCanvasZoom.test.js — MB-VIS-CANVAS-049.
 *
 * Verrouille `clientToCanvas()` (utils/geometry.js) comme point d'entrée
 * UNIQUE et zoom-conscient de la conversion écran→Document — la Décision
 * CSA du Blueprint : « Le zoom est un facteur de projection entre Document
 * et écran ; il ne modifie jamais les coordonnées du Document. »
 *
 * Avant ce ticket, la fonction ignorait totalement `zoom` (2 paramètres,
 * aucune division) — chaque assertion ci-dessous échouerait contre cet
 * ancien comportement.
 */
import { describe, it, expect } from 'vitest'
import { clientToCanvas } from '../geometry.js'

const RECT = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }

describe('MB-VIS-CANVAS-049 — clientToCanvas() zoom-aware', () => {
  it('zoom = 1 (défaut implicite) : comportement historique inchangé, aucune division', () => {
    expect(clientToCanvas({ clientX: 240, clientY: 180 }, RECT)).toEqual({ x: 240, y: 180 })
  })

  it('zoom = 1 (explicite) : identique au défaut implicite', () => {
    expect(clientToCanvas({ clientX: 240, clientY: 180 }, RECT, 1)).toEqual({ x: 240, y: 180 })
  })

  it('zoom = 2 (zoom avant) : la coordonnée Document est DIVISÉE par 2 — un pixel écran vaut un demi pixel Document', () => {
    expect(clientToCanvas({ clientX: 240, clientY: 180 }, RECT, 2)).toEqual({ x: 120, y: 90 })
  })

  it('zoom = 0.5 (zoom arrière) : la coordonnée Document est MULTIPLIÉE par 2', () => {
    expect(clientToCanvas({ clientX: 100, clientY: 60 }, RECT, 0.5)).toEqual({ x: 200, y: 120 })
  })

  it('le rect du canvas (origine du conteneur non transformé) est soustrait AVANT la division par zoom', () => {
    const rect = { left: 50, top: 20, right: 0, bottom: 0, width: 0, height: 0 }
    // (300-50)/2 = 125 ; (220-20)/2 = 100 — la soustraction d'origine ne doit
    // jamais être elle-même mise à l'échelle par le zoom.
    expect(clientToCanvas({ clientX: 300, clientY: 220 }, rect, 2)).toEqual({ x: 125, y: 100 })
  })

  it('valeurs de zoom défensives : 0, NaN, undefined, Infinity retombent sur 1 plutôt que de produire une division par zéro ou un résultat non fini', () => {
    for (const bogus of [0, NaN, undefined, Infinity, -Infinity]) {
      const result = clientToCanvas({ clientX: 100, clientY: 100 }, RECT, bogus)
      expect(Number.isFinite(result.x)).toBe(true)
      expect(Number.isFinite(result.y)).toBe(true)
    }
    // Un zoom véritablement invalide (0/NaN/undefined) retombe précisément
    // sur le comportement zoom=1 (pas de division) — seul Infinity/-Infinity
    // sont finis par construction (division par une valeur infinie -> 0) et
    // ne sont donc pas contraints à retomber sur 1, seulement à rester finis.
    for (const bogus of [0, NaN, undefined]) {
      expect(clientToCanvas({ clientX: 100, clientY: 100 }, RECT, bogus)).toEqual({ x: 100, y: 100 })
    }
  })

  it('la signature accepte un objet {clientX, clientY} minimal (pas seulement un vrai MouseEvent) — nécessaire pour updateSidebarComponentDragPosition(clientX, clientY)', () => {
    expect(clientToCanvas({ clientX: 42, clientY: 24 }, RECT, 1)).toEqual({ x: 42, y: 24 })
  })
})

/**
 * MB-VIS-CANVAS-050 : extension de la même fonction (D3 — un seul oracle
 * screen→Document) pour intégrer le pan, exprimé en pixels ÉCRAN
 * (translateX/translateY), en plus du zoom déjà géré ci-dessus. Relation :
 * `xDocument = (xScreen - translateX) / zoom`.
 */
describe('MB-VIS-CANVAS-050 — clientToCanvas() intègre translateX/translateY (pan)', () => {
  it('translateX/translateY par défaut (non fournis) : comportement 049 strictement inchangé', () => {
    expect(clientToCanvas({ clientX: 240, clientY: 180 }, RECT, 2)).toEqual({ x: 120, y: 90 })
  })

  it('translation pure (zoom=1) : la translation est soustraite avant conversion, aucune division', () => {
    expect(clientToCanvas({ clientX: 240, clientY: 180 }, RECT, 1, 40, 20)).toEqual({ x: 200, y: 160 })
  })

  it('pan + zoom combinés (zoom=2, translate=(40,20)) : la translation est soustraite AVANT la division par zoom', () => {
    // (240-40)/2 = 100 ; (180-20)/2 = 80. Une translation appliquée APRÈS la
    // division (bug potentiel) donnerait (120-40)=80 ; (90-20)=70 — valeurs
    // différentes, ce test distingue donc sans ambiguïté les deux ordres.
    expect(clientToCanvas({ clientX: 240, clientY: 180 }, RECT, 2, 40, 20)).toEqual({ x: 100, y: 80 })
  })

  it('translation négative (pan vers le haut/la gauche) : addition, pas soustraction inversée', () => {
    expect(clientToCanvas({ clientX: 100, clientY: 100 }, RECT, 1, -50, -30)).toEqual({ x: 150, y: 130 })
  })

  it('translateX/translateY défensifs : NaN/undefined/Infinity retombent sur 0 plutôt que de propager un résultat non fini', () => {
    for (const bogus of [NaN, undefined]) {
      expect(clientToCanvas({ clientX: 100, clientY: 100 }, RECT, 1, bogus, bogus)).toEqual({ x: 100, y: 100 })
    }
    const result = clientToCanvas({ clientX: 100, clientY: 100 }, RECT, 1, Infinity, Infinity)
    expect(Number.isFinite(result.x)).toBe(true)
    expect(Number.isFinite(result.y)).toBe(true)
  })
})
