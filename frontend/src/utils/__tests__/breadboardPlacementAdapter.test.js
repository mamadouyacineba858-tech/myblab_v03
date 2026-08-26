/**
 * breadboardPlacementAdapter.test.js — MB-BREADBOARD-003 (Blueprint §2/§8,
 * UI-02/03/07/09).
 *
 * Couvre computeBreadboardPlacement() : fonction pure, aucun mock
 * nécessaire (mêmes fixtures/breadboard que breadboardConnectivity.test.js/
 * Breadboard.test.jsx — MB-BREADBOARD-002).
 *
 * Inclut spécifiquement la preuve de la correction algorithmique disclosed
 * (voir en-tête de breadboardPlacementAdapter.js et Delivery Report
 * MB-BREADBOARD-003 §Déviations) : LED (écart de pins 80px, PAS un multiple
 * exact de BREADBOARD_PITCH=12) doit pouvoir atteindre valid:true — un
 * algorithme qui forcerait pins[0] à un résidu exactement nul échouerait
 * systématiquement pour ce type, ce qui aurait rendu impossible le scénario
 * de preuve Canvas obligatoire du ticket (§9, qui exige une LED insérée sur
 * breadboard).
 */
import { describe, it, expect } from 'vitest'
import { computeBreadboardPlacement } from '../breadboardPlacementAdapter.js'
import { holeAt } from '../breadboardGeometry.js'
import { getComponentDef } from '../../config/componentDefinitions.js'

const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

describe('computeBreadboardPlacement — repli (breadboardActive: false)', () => {
  it('sans breadboard, retourne candidatePosition inchangée (UI-... non-régression)', () => {
    const result = computeBreadboardPlacement(null, 'RESISTOR', { x: 60, y: 22 }, [])
    expect(result).toEqual({ breadboardActive: false, compatible: true, valid: false, position: { x: 60, y: 22 }, holes: [] })
  })

  // MB-BREADBOARD-008 (O8/R6) : ce test couvrait auparavant "ARDUINO (4 pins)
  // = incompatible" — la restriction pins.length === 2 est précisément ce
  // que ce ticket supprime (voir describe dédié plus bas). Un type INCONNU
  // (def introuvable) reste le seul cas légitime de compatible:false.
  it("pour un type inconnu (def introuvable), même dans l’empreinte du breadboard", () => {
    const result = computeBreadboardPlacement(breadboard, 'DOES_NOT_EXIST', { x: 60, y: 22 }, [])
    expect(result.breadboardActive).toBe(false)
    expect(result.compatible).toBe(false)
    expect(result.valid).toBe(false)
    expect(result.position).toEqual({ x: 60, y: 22 })
    expect(result.holes).toEqual([])
  })

  it('hors de l’empreinte du breadboard, retourne candidatePosition inchangée', () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 5000, y: 5000 }, [])
    expect(result).toEqual({ breadboardActive: false, compatible: true, valid: false, position: { x: 5000, y: 5000 }, holes: [] })
  })
})

describe('computeBreadboardPlacement — snapping RESISTOR (UI-02, écart dx 84 après correction §1)', () => {
  it('aligne les deux pins sur des trous valides quand candidatePosition est déjà proche', () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 58, y: 21 }, [])
    expect(result.breadboardActive).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.holes).toEqual([
      { pinId: 'A', column: 5, row: 3 },
      { pinId: 'B', column: 12, row: 3 },
    ])
  })

  it('déplace réellement candidatePosition vers la position valide la plus proche', () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 50, y: 18 }, [])
    expect(result.valid).toBe(true)
    expect(result.position).toEqual({ x: 50, y: 20 })
    expect(result.holes).toEqual([
      { pinId: 'A', column: 4, row: 3 },
      { pinId: 'B', column: 11, row: 3 },
    ])
  })
})

describe('computeBreadboardPlacement — snapping LED (UI-03, correction algorithmique disclosed)', () => {
  it('atteint valid:true pour LED malgré un écart de pins (80px) non multiple de BREADBOARD_PITCH', () => {
    const result = computeBreadboardPlacement(breadboard, 'LED', { x: 1, y: 15 }, [])
    expect(result.breadboardActive).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.position).toEqual({ x: 2, y: 15 })
    expect(result.holes).toEqual([
      { pinId: 'anode', column: 0, row: 3 },
      { pinId: 'cathode', column: 7, row: 3 },
    ])
  })

  it("trouve une position valide même quand l'ancrage naïf (pins[0] à résidu 0) échouerait", () => {
    // x=60 place pins[0] (anode, dx:0) EXACTEMENT sur un trou (résidu 0) —
    // l'algorithme naïf du Blueprint §2 s'arrêterait là et échouerait (la
    // cathode, dx:80, ne résout alors aucun trou). La recherche généralisée
    // doit trouver une position valide proche malgré tout.
    const result = computeBreadboardPlacement(breadboard, 'LED', { x: 60, y: 15 }, [])
    expect(result.valid).toBe(true)
    expect(result.holes.every((h) => h.column !== null)).toBe(true)
  })
})

describe('computeBreadboardPlacement — collision (LOCK-12, UI-07/09)', () => {
  it("valid devient false si le trou cible est déjà occupé par un AUTRE composant", () => {
    const others = [{ uid: 'other', type: 'RESISTOR', x: 60, y: 22 }]
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 58, y: 21 }, others)
    expect(result.breadboardActive).toBe(true)
    expect(result.valid).toBe(false)
    // La position/les trous restent renseignés (feedback rouge, AC-09) même
    // si invalide.
    expect(result.holes).toEqual([
      { pinId: 'A', column: 5, row: 3 },
      { pinId: 'B', column: 12, row: 3 },
    ])
  })

  it("n'est pas affecté par l'occupation du composant EN COURS de déplacement (déjà exclu par l'appelant)", () => {
    // otherComponents ne contient jamais le composant déplacé lui-même
    // (filtré par l'appelant, useCircuitState.js) — un tableau vide simule
    // ce cas : aucune collision avec soi-même.
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 58, y: 21 }, [])
    expect(result.valid).toBe(true)
  })
})

describe('computeBreadboardPlacement — hors limites de colonne (repli best-effort, AC-09)', () => {
  it("retourne valid:false avec des trous partiellement résolus quand une pin dépasserait la dernière colonne", () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 336, y: 22 }, [])
    expect(result.breadboardActive).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.valid).toBe(false)
    expect(result.holes).toEqual([
      { pinId: 'A', column: 28, row: 3 },
      { pinId: 'B', column: null, row: null },
    ])
  })
})

/**
 * MB-BREADBOARD-005 (Blueprint §4/§5, invariants BB-POWER-INV-01→02/06/07,
 * tests POWER-01→06 du ticket).
 *
 * Root cause démontrée par MB-BREADBOARD-004 (rapport
 * MB-BREADBOARD-004-real-path-diagnostic-report.md §3) : l'ancien écart
 * vertical POWER (dy 25/65, écart 40) n'était pas un multiple de
 * BREADBOARD_PITCH — confirmé ici : AUCUNE position candidate ne résolvait
 * les deux pins simultanément sur des trous de rail.
 *
 * Correctif final (componentDefinitions.js, seul fichier touché) : dy
 * 5V=37/GND=25 (écart 12 = BREADBOARD_PITCH) ET dx 5V=70/GND=58 (écart 12
 * également). Les positions candidates ci-dessous sont vérifiées par
 * exécution réelle de computeBreadboardPlacement() (seul oracle), jamais
 * déduites à la main — cf. scan exhaustif disclosed dans le commentaire
 * componentDefinitions.js.
 *
 * [Disclosed — défaut découvert puis corrigé en cours de ticket] Un premier
 * correctif (dy seul changé, dx=70 identique pour les deux pins) a été
 * vérifié PUIS REJETÉ : il ouvrait un court-circuit 5V/GND silencieux
 * lorsque POWER atterrit dans la bande centrale (STRIP) plutôt que sur le
 * rail — cas par défaut le plus probable en pratique (ex. dépôt Sidebar).
 * Cause : le groupKey d'un trou de bande ne dépend QUE de la colonne
 * (holeAt(), non modifié) ; avec dx identique, 5V et GND restent toujours
 * dans la MÊME colonne, donc sur le MÊME bus dès qu'ils tombent sur deux
 * rangées adjacentes de la même bande. dx corrigé à 70/58 (écart 12) :
 * colonne résolue diffère alors TOUJOURS d'exactement 1 entre les deux pins
 * (même raisonnement algébrique que pour les rangées), donc plus aucun
 * partage de groupKey possible, sur le rail comme sur la bande. Le test
 * "POWER-07bis" ci-dessous couvre spécifiquement ce cas régressé.
 *
 * Rappel disclosed (componentDefinitions.js, PowerModel) : la paire de rails
 * du HAUT (rangées 0/1) est structurellement inatteignable par CE moteur de
 * placement pour TOUT composant 2-pins (isWithinFootprint() borne l'ancre,
 * pas les pins) — seule la paire du BAS (rangées 15/16) est atteignable ;
 * les tests ci-dessous portent donc sur cette paire, la seule physiquement
 * accessible.
 */
describe('computeBreadboardPlacement — POWER sur rail physique (MB-BREADBOARD-005, POWER-01→06)', () => {
  it("POWER-01/02/03 : 5V et GND résolvent SIMULTANÉMENT sur des trous de rail distincts (rail+ pour 5V, rail- pour GND)", () => {
    const result = computeBreadboardPlacement(breadboard, 'POWER', { x: 2, y: 155 }, [])
    expect(result.breadboardActive).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.holes).toEqual([
      { pinId: '5V', column: 6, row: 16 },
      { pinId: 'GND', column: 5, row: 15 },
    ])
  })

  it("POWER-05 : rail+ et rail- restent électriquement distincts (groupKey différent pour 5V et GND)", () => {
    const result = computeBreadboardPlacement(breadboard, 'POWER', { x: 2, y: 155 }, [])
    expect(result.valid).toBe(true)
    const [fiveV, gnd] = result.holes
    // Rangées ADJACENTES mais distinctes (16 vs 15) ET colonnes désormais
    // également distinctes (6 vs 5) — donc groupKey distinct dans
    // breadboardGeometry.js (rail:bottom:+ vs rail:bottom:-), non ré-importé
    // ici pour ne pas dupliquer la logique de holeAt() (LOCK-02) : la seule
    // distinction row!==row suffit déjà à prouver la non-fusion sur le rail
    // (le groupKey de rail ne dépend que de la rangée), holeAt() étant le
    // seul arbitre du groupKey (déjà couvert par breadboardGeometry.test.js,
    // non modifié).
    expect(fiveV.row).not.toBe(gnd.row)
  })

  it("POWER-07bis (défaut découvert et corrigé en cours de ticket) : AUCUNE position du footprint ne fait résoudre 5V et GND sur le MÊME groupKey (pas de court-circuit 5V/GND, y compris en bande centrale)", () => {
    // Balayage réel (pas déduit à la main) de tout le footprint adressable :
    // pour CHAQUE position où les deux pins résolvent un trou (rail OU
    // bande), leur groupKey — recalculé via holeAt(), seul oracle, jamais
    // réimplémenté — doit être différent. Couvre explicitement le cas qui
    // avait précédemment échoué avec dx identique (dépôt par défaut, bande
    // centrale, voir Delivery Report §Défaut découvert).
    const pins = getComponentDef('POWER').pins
    let bothResolvedCount = 0
    for (let x = 0; x <= 348; x++) {
      for (let y = 0; y <= 192; y++) {
        const fiveVPin = pins.find((p) => p.id === '5V')
        const gndPin = pins.find((p) => p.id === 'GND')
        const fiveVHole = holeAt(breadboard, x + fiveVPin.dx, y + fiveVPin.dy)
        const gndHole = holeAt(breadboard, x + gndPin.dx, y + gndPin.dy)
        if (!fiveVHole || !gndHole) continue
        bothResolvedCount++
        expect(fiveVHole.groupKey).not.toBe(gndHole.groupKey)
      }
    }
    // Garde-fou : le balayage doit avoir réellement exercé un nombre
    // significatif de positions où les deux pins résolvent (sinon le test
    // passerait trivialement sans rien vérifier).
    expect(bothResolvedCount).toBeGreaterThan(1000)
  })

  it("POWER-04 : collision — valid devient false si le trou du rail+ ciblé par 5V est déjà occupé par un AUTRE composant", () => {
    // POWER déjà posé ailleurs occupe col6/row16 (5V) et col5/row15 (GND).
    const others = [{ uid: 'power-other', type: 'POWER', x: 2, y: 155 }]
    const result = computeBreadboardPlacement(breadboard, 'POWER', { x: 2, y: 155 }, others)
    expect(result.breadboardActive).toBe(true)
    expect(result.valid).toBe(false)
    // Les trous restent renseignés (feedback rouge, AC-09) même invalides.
    expect(result.holes).toEqual([
      { pinId: '5V', column: 6, row: 16 },
      { pinId: 'GND', column: 5, row: 15 },
    ])
  })

  it('POWER-06 : hors empreinte du breadboard, retourne candidatePosition inchangée (repli GRID_SIZE existant, AC-17)', () => {
    const result = computeBreadboardPlacement(breadboard, 'POWER', { x: 5000, y: 5000 }, [])
    expect(result).toEqual({ breadboardActive: false, compatible: true, valid: false, position: { x: 5000, y: 5000 }, holes: [] })
  })

  it('POWER-06bis : sans breadboard du tout, retourne candidatePosition inchangée (non-régression AC-17)', () => {
    const result = computeBreadboardPlacement(null, 'POWER', { x: 700, y: 200 }, [])
    expect(result).toEqual({ breadboardActive: false, compatible: true, valid: false, position: { x: 700, y: 200 }, holes: [] })
  })
})

/**
 * MB-BREADBOARD-008 (Blueprint §1.7/§4 O8, CSA R6/A9) : l'algorithme doit
 * être générique sur def.pins — plus de restriction pins.length === 2.
 * Aucun de ces tests n'exige qu'un composant N-pins ATTEIGNE valid:true
 * (Blueprint §1.7 : "Si un composant N-pins ne possède pas encore une
 * géométrie compatible : valid = false sans crash ni corruption" — un
 * résultat explicitement acceptable, la géométrie dx/dy des composants
 * 3+ pins existants n'a pas été retouchée par ce ticket, hors scope). Ce
 * qui est vérifié : compatible désormais true dès qu'il y a des pins,
 * jamais d'exception, et result.holes contient toujours EXACTEMENT une
 * entrée par pin (résolue ou {column:null,row:null}).
 */
describe('computeBreadboardPlacement — MB-BREADBOARD-008 (O8/R6/A9) : généralisation N-pins', () => {
  it("un composant 4 pins (ARDUINO) est désormais 'compatible' (compatible dérive uniquement de def.pins.length > 0, plus de restriction === 2)", () => {
    const result = computeBreadboardPlacement(breadboard, 'ARDUINO', { x: 60, y: 22 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(4)
  })

  it("un composant 3 pins (POTENTIOMETER) ne crashe jamais, même quand aucune position de la fenêtre ne résout les 3 pins simultanément", () => {
    expect(() => computeBreadboardPlacement(breadboard, 'POTENTIOMETER', { x: 60, y: 22 }, [])).not.toThrow()
    const result = computeBreadboardPlacement(breadboard, 'POTENTIOMETER', { x: 60, y: 22 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(typeof result.valid).toBe('boolean')
    expect(result.holes).toHaveLength(3)
  })

  it("un composant 4 pins (RGB_LED) ne crashe jamais et retourne toujours autant de trous que de pins (résolus ou null)", () => {
    expect(() => computeBreadboardPlacement(breadboard, 'RGB_LED', { x: 60, y: 22 }, [])).not.toThrow()
    const result = computeBreadboardPlacement(breadboard, 'RGB_LED', { x: 60, y: 22 }, [])
    expect(result.compatible).toBe(true)
    expect(result.holes).toHaveLength(4)
  })

  it("un composant 3 pins (NPN_TRANSISTOR) hors empreinte reste en repli GRID_SIZE existant (non-régression AC-17, généralisée au-delà de 2 pins)", () => {
    const result = computeBreadboardPlacement(breadboard, 'NPN_TRANSISTOR', { x: 5000, y: 5000 }, [])
    expect(result.breadboardActive).toBe(false)
    expect(result.compatible).toBe(true)
    expect(result.position).toEqual({ x: 5000, y: 5000 })
  })

  it('non-régression : un composant 2 pins (RESISTOR) reste inchangé — toujours valid:true à la même position candidate qu’avant ce ticket', () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 58, y: 21 }, [])
    expect(result.valid).toBe(true)
    expect(result.holes).toEqual([
      { pinId: 'A', column: 5, row: 3 },
      { pinId: 'B', column: 12, row: 3 },
    ])
  })
})
