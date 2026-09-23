import { createUid } from "../utils/ids.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"

const PIN_PRESENTATION_BY_TYPE = {
  // A9-AND: three functional columns A/B/Q, lower visible feet measured in
  // the frozen raster. Assembly roots retain subpixel measurements; targets
  // at x=48/72/96 use two breadboard pitches, without altering the image.
  AND_GATE: [
    { id: "A", label: "A", dx: 48, dy: 90, contacts: [{ id: "A", dx: 48, dy: 90, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 72, dy: 90, contacts: [{ id: "B", dx: 72, dy: 90, wireConnectable: true, breadboardInsertable: true }] },
    { id: "Q", label: "Q", dx: 96, dy: 90, contacts: [{ id: "Q", dx: 96, dy: 90, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A9-OR: measured lower feet project to 12px-pitch contacts via assembly leads.
  OR_GATE: [
    { id: "A", label: "A", dx: 48, dy: 84, contacts: [{ id: "A", dx: 48, dy: 84, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 72, dy: 84, contacts: [{ id: "B", dx: 72, dy: 84, wireConnectable: true, breadboardInsertable: true }] },
    { id: "Q", label: "Q", dx: 96, dy: 84, contacts: [{ id: "Q", dx: 96, dy: 84, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A9-NAND: real pixel-probe on the FROZEN RGBA reference (own measurement,
  // not copied from AND/OR) — source row y=890, neutral metal
  // min(RGB)>=130, max(RGB)-min(RGB)<45, alpha>=200: lower-foot spans
  // A [478,508], B [750,780], Q [1017,1044]. Centres scaled isotropically by
  // 3/32 (see manifest.json derivation.pixelProbe for the full measurement).
  NAND_GATE: [
    { id: "A", label: "A", dx: 48, dy: 83, contacts: [{ id: "A", dx: 48, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 72, dy: 83, contacts: [{ id: "B", dx: 72, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
    { id: "Q", label: "Q", dx: 96, dy: 83, contacts: [{ id: "Q", dx: 96, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A9-NOR: real pixel-probe on the FROZEN RGBA reference (own measurement,
  // not copied from AND/OR/NAND) — source row y=890, neutral metal
  // min(RGB)>=130, max(RGB)-min(RGB)<45, alpha>=200: lower-foot spans
  // A [474,505], B [751,780], Q [1022,1051]. Centres scaled isotropically by
  // 3/32 (see manifest.json derivation.pixelProbe for the full measurement).
  NOR_GATE: [
    { id: "A", label: "A", dx: 48, dy: 83, contacts: [{ id: "A", dx: 48, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 72, dy: 83, contacts: [{ id: "B", dx: 72, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
    { id: "Q", label: "Q", dx: 96, dy: 83, contacts: [{ id: "Q", dx: 96, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A9-XOR: real pixel-probe on the FROZEN RGBA reference (own measurement,
  // not copied from AND/OR/NAND/NOR) — source row y=890, neutral metal
  // min(RGB)>=130, max(RGB)-min(RGB)<45, alpha>=200: lower-foot spans
  // A [470,492], B [748,770], Q [1023,1044]. Centres scaled isotropically by
  // 3/32 (see manifest.json derivation.pixelProbe for the full measurement).
  XOR_GATE: [
    { id: "A", label: "A", dx: 48, dy: 83, contacts: [{ id: "A", dx: 48, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 72, dy: 83, contacts: [{ id: "B", dx: 72, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
    { id: "Q", label: "Q", dx: 96, dy: 83, contacts: [{ id: "Q", dx: 96, dy: 83, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A9-NOT: own real pixel-probe on the FROZEN RGBA reference (not copied from
  // the three-contact gates, whose feet share one row). NOT has exactly two
  // vertical leads: A above the body, Q below it. Neutral metal
  // min(RGB)>=130, max(RGB)-min(RGB)<45, alpha>=200 over each free-standing
  // lead segment -> roots A (767, 217.5), Q (765, 870.5) source, scaled 3/32
  // (see not-gate manifest.json derivation.pixelProbe). Contacts on the 12px
  // pitch: same column, 60 = 5x12 apart, straddling the breadboard groove.
  NOT_GATE: [
    { id: "A", label: "A", dx: 72, dy: 21, contacts: [{ id: "A", dx: 72, dy: 21, wireConnectable: true, breadboardInsertable: true }] },
    { id: "Q", label: "Q", dx: 72, dy: 81, contacts: [{ id: "Q", dx: 72, dy: 81, wireConnectable: true, breadboardInsertable: true }] },
  ],
  BATTERY_AA: [
    { id: "plus", label: "+", dx: 28.5, dy: 10.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 28.5, dy: 10.5, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "−", dx: 12.5, dy: 10.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 12.5, dy: 10.5, wireConnectable: true, breadboardInsertable: false }] },
  ],
  COIN_CELL_CR2032: [
    { id: "plus", label: "+", dx: 30.5, dy: 8.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 30.5, dy: 8.5, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "−", dx: 30.5, dy: 52.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 30.5, dy: 52.5, wireConnectable: true, breadboardInsertable: false }] },
  ],
  BATTERY_9V: [
    { id: "plus", label: "+", dx: 50.5, dy: 12.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 50.5, dy: 12.5, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "−", dx: 20.5, dy: 12.5, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 20.5, dy: 12.5, wireConnectable: true, breadboardInsertable: false }] },
  ],
  LED: [
    { id: "anode", label: "Anode", dx: 28, dy: 62 },
    { id: "cathode", label: "Cathode", dx: 52, dy: 62 },
  ],
  RESISTOR: [
    { id: "A", label: "A", dx: 0, dy: 14 },
    { id: "B", label: "B", dx: 84, dy: 14 },
  ],
  ARDUINO: [
    { id: "D2", label: "D2", dx: 0, dy: 50, contacts: [{ id: "D2", dx: 3, dy: 50, wireConnectable: true, breadboardInsertable: false }] },
    { id: "D3", label: "D3", dx: 0, dy: 75, contacts: [{ id: "D3", dx: 15, dy: 75, wireConnectable: true, breadboardInsertable: false }] },
    { id: "GND", label: "GND", dx: 0, dy: 110, contacts: [{ id: "GND", dx: 15, dy: 108, wireConnectable: true, breadboardInsertable: false }] },
    { id: "5V", label: "5V", dx: 120, dy: 50, contacts: [{ id: "5V", dx: 115, dy: 50, wireConnectable: true, breadboardInsertable: false }] },
  ],
  BUTTON: [
    { id: "pin1", label: "1", dx: 14, dy: 30, contacts: [{ id: "1a", dx: 14, dy: 58, wireConnectable: true, breadboardInsertable: true }, { id: "1b", dx: 14, dy: 2, wireConnectable: true, breadboardInsertable: true }] },
    { id: "pin2", label: "2", dx: 46, dy: 30, contacts: [{ id: "2a", dx: 46, dy: 58, wireConnectable: true, breadboardInsertable: true }, { id: "2b", dx: 46, dy: 2, wireConnectable: true, breadboardInsertable: true }] },
  ],
  BUTTON_LATCHING: [
    { id: "pin1", label: "1", dx: 13, dy: 30, contacts: [{ id: "1a", dx: 13, dy: 58, wireConnectable: true, breadboardInsertable: true }, { id: "1b", dx: 13, dy: 2, wireConnectable: true, breadboardInsertable: true }] },
    { id: "pin2", label: "2", dx: 47, dy: 30, contacts: [{ id: "2a", dx: 47, dy: 58, wireConnectable: true, breadboardInsertable: true }, { id: "2b", dx: 47, dy: 2, wireConnectable: true, breadboardInsertable: true }] },
  ],
  POWER: [
    { id: "5V", label: "+5V", dx: 70, dy: 37, contacts: [{ id: "5V", dx: 35, dy: 67, wireConnectable: true, breadboardInsertable: false }] },
    { id: "GND", label: "GND", dx: 58, dy: 25, contacts: [{ id: "GND", dx: 22, dy: 67, wireConnectable: true, breadboardInsertable: false }] },
  ],
  CAPACITOR: [
    { id: "pinA", label: "A", dx: 0, dy: 20, contacts: [{ id: "pinA", dx: 23, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
    { id: "pinB", label: "B", dx: 70, dy: 20, contacts: [{ id: "pinB", dx: 47, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // FT-C-COMP-002 — condensateur électrolytique radial polarisé. Boîte
  // canonique 33×120 = pixels natifs @1x de l'asset raster (portrait, corps
  // bleu + bande négative à GAUCHE + deux pattes). PhysicalContacts =
  // extrémités FONCTIONNELLES des pattes : `minus` (côté bande négative,
  // gauche) et `plus` (droite), entraxe 24 = 2 × BREADBOARD_PITCH (12) —
  // exact, donc enfichable proprement. Les pattes cuites dans le raster
  // sont masquées par `bodyClip` (assemblyProfiles.js) ; la géométrie
  // finale des pattes est rendue par AssemblyLeadsLayer entre `root`
  // (assemblyProfiles.js) et ces contacts. La longueur fonctionnelle est
  // harmonisée avec LED/LDR/THERMISTOR : root y=48 → contact y=80 (~32 px).
  POLARIZED_CAPACITOR: [
    { id: "plus", label: "+", dx: 28, dy: 80, contacts: [{ id: "plus", dx: 28, dy: 80, wireConnectable: true, breadboardInsertable: true }] },
    { id: "minus", label: "−", dx: 4, dy: 80, contacts: [{ id: "minus", dx: 4, dy: 80, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // FT-C-COMP-004 — buzzer piézo TRAVERSANT réaliste (asset 120×120). Les deux
  // pattes métalliques sont cuites dans le raster autour de x≈42 / 77, y≈79..114
  // (probe pixel ; PO probe 44 / 76, entraxe 32). Pour l'insertion breadboard
  // les deux PhysicalContacts fonctionnels sont recalés à dx 42 / 78 (entraxe
  // 36 = 3 × BREADBOARD_PITCH exact, centrés sur les deux pieds visibles) et
  // dy 108 (= probe `canonical.pins` du manifeste ; 9 × BREADBOARD_PITCH).
  // AssemblyLeadsLayer relie racine visuelle → contact (pattes fines droites).
  // IDs, rôles et modèle électrique (plus / minus, role input) INCHANGÉS —
  // aucune nouvelle simulation, aucun état "on".
  BUZZER: [
    { id: "plus", label: "+", dx: 42, dy: 108, contacts: [{ id: "plus", dx: 42, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "minus", label: "-", dx: 78, dy: 108, contacts: [{ id: "minus", dx: 78, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // FT-C-COMP-003 — potentiomètre ROTATIF réaliste (asset 120×120). Les 3
  // cosses métalliques verticales sont cuites dans le raster autour de
  // x≈42 / 60 / 78 (probe pixel ; PO probe 40/60/80). Pour l'insertion
  // breadboard les 3 PhysicalContacts fonctionnels sont recalés à
  // dx 36 / 60 / 84 (entraxe 24 = 2 × BREADBOARD_PITCH exact, `wiper` aligné
  // sur la cosse centrale) et dy 108 (multiple exact de 12 ; = probe
  // `canonical.pins` du manifeste). AssemblyLeadsLayer relie racine visuelle
  // → contact avec un léger évasement des cosses extérieures. IDs, rôles et
  // modèle électrique (left/wiper/right, resistance, position) INCHANGÉS.
  POTENTIOMETER: [
    { id: "left", label: "L", dx: 36, dy: 108, contacts: [{ id: "left", dx: 36, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "wiper", label: "W", dx: 60, dy: 108, contacts: [{ id: "wiper", dx: 60, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "right", label: "R", dx: 84, dy: 108, contacts: [{ id: "right", dx: 84, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
  ],
  LDR: [
    { id: "A", label: "A", dx: 0, dy: 18, contacts: [{ id: "A", dx: 30, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 84, dy: 18, contacts: [{ id: "B", dx: 54, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
  ],
  THERMISTOR: [
    { id: "A", label: "A", dx: 0, dy: 18, contacts: [{ id: "A", dx: 30, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 84, dy: 18, contacts: [{ id: "B", dx: 54, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
  ],
  DIODE: [
    { id: "anode", label: "A", dx: 0, dy: 15 },
    { id: "cathode", label: "K", dx: 84, dy: 15 },
  ],
  RGB_LED: [
    { id: "R", label: "R", dx: 19, dy: 56, contacts: [{ id: "R", dx: 19, dy: 72, wireConnectable: true, breadboardInsertable: true }] },
    { id: "common", label: "COM", dx: 35, dy: 56, contacts: [{ id: "common", dx: 35, dy: 72, wireConnectable: true, breadboardInsertable: true }] },
    { id: "G", label: "G", dx: 53, dy: 56, contacts: [{ id: "G", dx: 53, dy: 72, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 71, dy: 56, contacts: [{ id: "B", dx: 71, dy: 72, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A8-NMOS: measured roots stay in assemblyProfiles; functional contacts fan in
  // to three adjacent holes. y204 = root y170 + 34px, matching the existing
  // radial lead clearance (~30-37px), and 17 * BREADBOARD_PITCH (12).
  NMOS: [
    { id: "drain", label: "D", dx: 76, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "drain", dx: 76, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
    { id: "gate", label: "G", dx: 64, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "gate", dx: 64, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
    { id: "source", label: "S", dx: 88, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "source", dx: 88, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // Functional two-row footprint; assignment is MYBlab routing, not photographic pin numbering.
  RELAY: [
    { id: "coilA", label: "Bobine A", dx: 60, dy: 288, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "coilA", dx: 60, dy: 288, wireConnectable: true, breadboardInsertable: true }] },
    { id: "coilB", label: "Bobine B", dx: 60, dy: 312, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "coilB", dx: 60, dy: 312, wireConnectable: true, breadboardInsertable: true }] },
    { id: "common", label: "COM", dx: 132, dy: 312, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "common", dx: 132, dy: 312, wireConnectable: true, breadboardInsertable: true }] },
    { id: "normallyClosed", label: "NC", dx: 228, dy: 288, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "normallyClosed", dx: 228, dy: 288, wireConnectable: true, breadboardInsertable: true }] },
    { id: "normallyOpen", label: "NO", dx: 228, dy: 312, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "normallyOpen", dx: 228, dy: 312, wireConnectable: true, breadboardInsertable: true }] },
  ],
  VOLTAGE_REGULATOR: [
    { id: "IN", label: "IN", dx: 60, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "IN", dx: 60, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 72, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND", dx: 72, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
    { id: "OUT", label: "OUT", dx: 84, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "OUT", dx: 84, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A8-H-BRIDGE : L293D DIP-16, raster Founder PASS/FROZEN tourne de 90 deg (derive runtime
  // isotrope 132x88, encoche a gauche, broche 1 en bas a gauche). 13 pins ELECTRIQUES, 16
  // PhysicalContacts : les 4 broches physiques GND (4, 5, 12, 13) sont 4 contacts du MEME pin
  // electrique GND. DIP reel a cheval sur la rainure de STANDARD_V1 : rangee basse y=68
  // (broches 1..8, gauche -> droite), rangee haute y=20 (broches 16..9, gauche -> droite),
  // pas 12, ecartement 48 = 4 x pitch. x = 25 + 12k = centres de pattes mesures (pixel-probe).
  H_BRIDGE: [
    { id: "EN12", label: "EN12", dx: 25, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "EN12", dx: 25, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1A", label: "1A", dx: 37, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1A", dx: 37, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1Y", label: "1Y", dx: 49, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1Y", dx: 49, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 61, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND4", dx: 61, dy: 68, wireConnectable: true, breadboardInsertable: true }, { id: "GND5", dx: 73, dy: 68, wireConnectable: true, breadboardInsertable: true }, { id: "GND12", dx: 73, dy: 20, wireConnectable: true, breadboardInsertable: true }, { id: "GND13", dx: 61, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2Y", label: "2Y", dx: 85, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2Y", dx: 85, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2A", label: "2A", dx: 97, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2A", dx: 97, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "VCC2", label: "VCC2", dx: 109, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "VCC2", dx: 109, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "EN34", label: "EN34", dx: 109, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "EN34", dx: 109, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "3A", label: "3A", dx: 97, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "3A", dx: 97, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "3Y", label: "3Y", dx: 85, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "3Y", dx: 85, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "4Y", label: "4Y", dx: 49, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "4Y", dx: 49, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "4A", label: "4A", dx: 37, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "4A", dx: 37, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "VCC1", label: "VCC1", dx: 25, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "VCC1", dx: 25, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
  ],
  PMOS: [
    { id: "drain", label: "D", dx: 72, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "drain", dx: 72, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
    { id: "gate", label: "G", dx: 60, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "gate", dx: 60, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
    { id: "source", label: "S", dx: 84, dy: 204, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "source", dx: 84, dy: 204, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A8-PNP : runtime normalisé 132x66, dérivé isotropiquement de REFERENCE.png.
  // BC557 onsemi CASE 29 STYLE 17, face marquée : C/B/E gauche/milieu/droite.
  // Contacts fonctionnels au pas exact de 12 ; racines mesurées dans assemblyProfiles.
  PNP_TRANSISTOR: [
    { id: "collector", label: "C", dx: 54, dy: 62, contacts: [{ id: "collector", dx: 54, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
    { id: "base", label: "B", dx: 66, dy: 62, contacts: [{ id: "base", dx: 66, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
    { id: "emitter", label: "E", dx: 78, dy: 62, contacts: [{ id: "emitter", dx: 78, dy: 62, wireConnectable: true, breadboardInsertable: true }] },
  ],
  NPN_TRANSISTOR: [
    { id: "collector", label: "C", dx: 45, dy: 0, contacts: [{ id: "C", dx: 42.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
    { id: "base", label: "B", dx: 0, dy: 45, contacts: [{ id: "B", dx: 31.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
    { id: "emitter", label: "E", dx: 90, dy: 45, contacts: [{ id: "E", dx: 53.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
  ],
  SERVO: [
    { id: "signal", label: "SIG", dx: 90, dy: 20, breadboardInsertable: false },
    { id: "vcc", label: "VCC", dx: 90, dy: 35, breadboardInsertable: false },
    { id: "gnd", label: "GND", dx: 90, dy: 50, breadboardInsertable: false },
  ],
  // MB-L1-PROP-009 — le Core reste inchangé (+ à 0,25 ; - à 84,25), mais
  // les PhysicalContacts de présentation suivent désormais les DEUX vraies
  // cosses électriques de l'overlay arrière. L'arbre mécanique à droite n'est
  // jamais connectable. Le moteur reste non-insérable sur breadboard.
  DC_MOTOR: [
    { id: "plus", label: "+", dx: 0, dy: 25, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 3.5, dy: 16, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "-", dx: 84, dy: 25, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 3.5, dy: 34, wireConnectable: true, breadboardInsertable: false }] },
  ],
  // A3-SW1 — Slide Switch (SPDT). Renderer CSS/DOM (SlideSwitchPart.jsx),
  // A3-SW3 : géométrie déjà compatible BREADBOARD_PITCH=12 SANS modification
  // (12, 36, 60 sont tous des multiples exacts de 12 ; dy=44 uniforme pour les
  // 3 contacts) — démontré par breadboardSwitchFit.test.js (T1-T4). Un seul
  // changement : breadboardInsertable false -> true (pin-level + contact-level).
  SLIDE_SWITCH: [
    { id: "throwA", label: "A", dx: 12, dy: 44, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "throwA", dx: 12, dy: 44, wireConnectable: true, breadboardInsertable: true }] },
    { id: "common", label: "C", dx: 36, dy: 44, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "common", dx: 36, dy: 44, wireConnectable: true, breadboardInsertable: true }] },
    { id: "throwB", label: "B", dx: 60, dy: 44, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "throwB", dx: 60, dy: 44, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A3-SW3 : géométrie CORRIGÉE — l'espacement A3-SW2 d'origine (8,20,36,48,
  // 64,76,92,104 = alternance 12/16) mélangeait TROIS résidus mod 12 distincts
  // (8, 0, 4) : aucune origine commune ne pouvait aligner les 8 contacts sur le
  // pitch breadboard à la fois (démontré par breadboardSwitchFit.test.js avant
  // correction). Corrigé en espacement UNIFORME de 12 (8 pattes réellement au
  // pas 0.1", conforme à l'asset réel : un DIP switch à corps DIP-8 breadboard-
  // friendly a ses 8 broches à pas constant, cf. rapport final §D) :
  // 14,26,38,50,62,74,86,98 (7 intervalles de 12, centrés dans la boîte
  // canonique 112 large, marge 14 de chaque côté). dy=50 inchangé (rangée
  // unique — l'asset ne montre PAS deux rangées opposées, cf. rapport final
  // §D). Topologie électrique 1A/1B/2A/2B/3A/3B/4A/4B INCHANGÉE : seule la
  // géométrie PHYSIQUE de présentation est corrigée. breadboardInsertable
  // false -> true (pin-level + contact-level) après preuve géométrique.
  DIP_SWITCH: [
    { id: "1A", label: "1A", dx: 14, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1A", dx: 14, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1B", label: "1B", dx: 26, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1B", dx: 26, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2A", label: "2A", dx: 38, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2A", dx: 38, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2B", label: "2B", dx: 50, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2B", dx: 50, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "3A", label: "3A", dx: 62, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "3A", dx: 62, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "3B", label: "3B", dx: 74, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "3B", dx: 74, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "4A", label: "4A", dx: 86, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "4A", dx: 86, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
    { id: "4B", label: "4B", dx: 98, dy: 50, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "4B", dx: 98, dy: 50, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A6-OUT1-R1 — Vibration Motor : réutilisation de la famille DC_MOTOR
  // (même contrat électrique plus/minus, cf. canonicalRegistry.js) ; passage
  // au paquet d'assets raster réaliste Founder-approved (coin-type ERM,
  // asset 72×96 @1x). Boîte canonique portrait 72×96 (était 50×70
  // provisoire A6-OUT1). PhysicalContacts recalés à plus(24,84)/minus(48,84)
  // — entraxe 24 = 2 × BREADBOARD_PITCH (12), exact, donc enfichable
  // proprement (preuve géométrique : vibrationMotorA6Out1R1.test.js). Racines
  // AssemblyLeadsLayer dérivées du pixel-probe réel de l'asset (voir
  // assemblyProfiles.js) — pas de bodyClip : le contenu opaque du raster
  // s'arrête naturellement à y=83 (colonne plus) / y=80 (colonne minus),
  // AVANT les PhysicalContacts (y=84), sans rien à masquer.
  VIBRATION_MOTOR: [
    { id: "plus", label: "+", dx: 24, dy: 84, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "plus", dx: 24, dy: 84, wireConnectable: true, breadboardInsertable: true }] },
    { id: "minus", label: "-", dx: 48, dy: 84, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "minus", dx: 48, dy: 84, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A6-OUT2 — Light Bulb : même famille géométrique que VIBRATION_MOTOR
  // (boîte portrait 72×96, PhysicalContacts (24,84)/(48,84), entraxe
  // 24 = 2 × BREADBOARD_PITCH) mais pins NON polarisées (A/B, convention
  // RESISTOR/LDR/THERMISTOR) : une ampoule résistive simple n'a pas de sens
  // électrique orienté. Racines AssemblyLeadsLayer dérivées du pixel-probe
  // réel de l'asset Founder-approved (voir assemblyProfiles.js) : le corps
  // opaque (culot doré + amorce des deux pattes noires) dépasse les
  // PhysicalContacts (opaque jusqu'à y=93, contacts à y=84) — bodyClip requis,
  // contrairement à VIBRATION_MOTOR.
  LIGHT_BULB: [
    { id: "A", label: "A", dx: 24, dy: 84, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "A", dx: 24, dy: 84, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 48, dy: 84, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "B", dx: 48, dy: 84, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A6-OUT3 — Hobby Gearmotor : boîte canonique VERTICALE 72×120 (asset
  // raster Founder-approved "VERTICAL FINAL"). Composant WIRE-ONLY
  // (wireConnectable:true / breadboardInsertable:false sur les DEUX
  // broches, comme DC_MOTOR — jamais enfichable breadboard, aucune
  // contrainte BREADBOARD_PITCH). Coordonnées dérivées d'un pixel-probe RÉEL
  // du raster livré (hobby-gearmotor.default.1x.png, 72×120), méthode
  // frontend/scripts/lead-anchor-probe.md (seuil alpha>=32, classification
  // de teinte HSV pour isoler les deux fils colorés du reste du corps) :
  // fil ROUGE (borne plus) régions opaques solides (alpha>=200) x∈[14,20]
  // y∈[94,102], centroïde (17.56, 96.56) -> arrondi (18, 97) ; fil NOIR
  // (borne minus) x∈[14,19] y∈[88,91], centroïde (17.11, 89.39) -> arrondi
  // (17, 89) — mesure recoupée sur le raster 3x (216×360) : centroïdes
  // divisés par 3 cohérents à <0.3 px des valeurs 1x ci-dessus. Les deux
  // fils sont visuellement distincts (rouge vs noir/carter moteur) et
  // géométriquement séparés (distance ~8 px) — aucune coordonnée inventée.
  HOBBY_GEARMOTOR: [
    { id: "plus", label: "+", dx: 18, dy: 97, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "plus", dx: 18, dy: 97, wireConnectable: true, breadboardInsertable: false }] },
    { id: "minus", label: "-", dx: 17, dy: 89, wireConnectable: true, breadboardInsertable: false, contacts: [{ id: "minus", dx: 17, dy: 89, wireConnectable: true, breadboardInsertable: false }] },
  ],
  // A7-C1 — TMP36 (asset raster 60×72 Founder-approved R3). PhysicalContacts
  // = cibles techniques du paquet Founder (manifest.json
  // `technicalContactTargets`) : plus(18,68) / vout(30,68) / gnd(42,68),
  // entraxe 12 = 1 × BREADBOARD_PITCH exact entre contacts adjacents (§6 du
  // ticket) — jamais les racines visuelles des pattes (voir
  // assemblyProfiles.js pour ces dernières, dérivées du pixel-probe réel).
  TMP36: [
    { id: "plus", label: "+Vs", dx: 18, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "plus", dx: 18, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "vout", label: "Vout", dx: 30, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "vout", dx: 30, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "gnd", label: "GND", dx: 42, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "gnd", dx: 42, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A7-C2-R2 — Force Sensor (FSR). Boîte canonique VERTICALE 72×144 = pixels
  // natifs @1x de l'asset raster Founder-approved (manifest.json canonical,
  // INCHANGÉ). Founder Canvas Gate a signalé un FAIL physical fit
  // breadboard (les deux connexions ne rentraient pas dans deux trous
  // distincts). Correctif CSA A7-C2-R2, même stratégie qu'A7-C2-R1
  // (FLEX_SENSOR) : les racines mécaniques MESURÉES sur le raster (pixel-probe
  // réel reconfirmé, seuil alpha>=200, méthode
  // frontend/scripts/lead-anchor-probe.md) restent A(36,111)/B(41,111) —
  // INCHANGÉES, cf. assemblyProfiles.js — mais les PhysicalContacts
  // électriques/enfichables sont désormais des points FONCTIONNELS distincts
  // A(30,132)/B(42,132), entraxe 42-30 = 12 px = 1 × BREADBOARD_PITCH exact,
  // alignés sur la grille breadboard (même rangée, dy identique 132). Même
  // stratégie déjà appliquée par POLARIZED_CAPACITOR/BUZZER/POTENTIOMETER/
  // FLEX_SENSOR (racine visuelle mesurée ≠ PhysicalContact fonctionnel
  // recalé au pas breadboard, pont assuré par AssemblyLeadsLayer via
  // assemblyProfiles.js) — aucune coordonnée de racine inventée, seul le
  // point d'insertion fonctionnel est recalé.
  FORCE_SENSOR: [
    { id: "A", label: "A", dx: 30, dy: 132, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "A", dx: 30, dy: 132, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 42, dy: 132, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "B", dx: 42, dy: 132, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A7-C2-R1 — Flex Sensor. Boîte canonique VERTICALE 72×180 = pixels
  // natifs @1x de l'asset raster Founder-approved (manifest.json canonical,
  // INCHANGÉ). Founder Canvas Gate a signalé un FAIL PARTIEL sur ce
  // composant : déclaré wire-only en A7-C2, ses deux pieds ne s'inséraient
  // pas dans deux trous distincts du breadboard. Correctif CSA A7-C2-R1:
  // les racines mécaniques MESURÉES sur le raster (pixel-probe réel,
  // méthode frontend/scripts/lead-anchor-probe.md, seuil alpha>=200) restent
  // A(33,162)/B(41,163) — INCHANGÉES, cf. assemblyProfiles.js — mais les
  // PhysicalContacts électriques/enfichables sont désormais des points
  // FONCTIONNELS distincts A(30,180)/B(42,180), entraxe 42-30 = 12 px =
  // 1 × BREADBOARD_PITCH exact, alignés sur la grille breadboard. Même
  // stratégie déjà appliquée par POLARIZED_CAPACITOR/BUZZER/POTENTIOMETER
  // (racine visuelle mesurée ≠ PhysicalContact fonctionnel recalé au pas
  // breadboard, pont assuré par AssemblyLeadsLayer via assemblyProfiles.js) —
  // aucune coordonnée inventée pour la racine, la seule chose recalée est le
  // point d'insertion fonctionnel. FORCE_SENSOR a reçu le même traitement
  // en A7-C2-R2 (cf. bloc FORCE_SENSOR ci-dessus).
  FLEX_SENSOR: [
    { id: "A", label: "A", dx: 30, dy: 180, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "A", dx: 30, dy: 180, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 42, dy: 180, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "B", dx: 42, dy: 180, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A7-C3 — Soil Moisture Sensor (YL-69 probe + YL-38 interface module).
  // Boîte canonique 144×144 = pixels natifs @1x du paquet Founder-approved.
  // PhysicalContacts fonctionnels VERROUILLÉS par le ticket §11 :
  // VCC(80,140)/AO(92,140)/DO(104,140)/GND(116,140), entraxe 12 px =
  // 1 × BREADBOARD_PITCH exact entre CHAQUE paire adjacente, même rangée
  // (dy=140 identique), même stratégie que TMP36/FORCE_SENSOR/FLEX_SENSOR
  // (racines visuelles mesurées ≠ PhysicalContacts fonctionnels alignés
  // grille — cf. assemblyProfiles.js pour les racines).
  SOIL_MOISTURE_SENSOR: [
    { id: "VCC", label: "VCC", dx: 80, dy: 140, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "VCC", dx: 80, dy: 140, wireConnectable: true, breadboardInsertable: true }] },
    { id: "AO", label: "AO", dx: 92, dy: 140, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "AO", dx: 92, dy: 140, wireConnectable: true, breadboardInsertable: true }] },
    { id: "DO", label: "DO", dx: 104, dy: 140, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "DO", dx: 104, dy: 140, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 116, dy: 140, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND", dx: 116, dy: 140, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A7-C4-PIR — PIR Motion Sensor (HC-SR501-style module). Boîte canonique
  // 120×96 = pixels natifs @1x du paquet Founder-approved. Pixel-probe réel
  // (alpha>=32, méthode frontend/scripts/lead-anchor-probe.md, System.Drawing
  // sur le paquet copié dans ce worktree) : les 3 pattes de l'en-tête sont
  // centrées (x=50.5/59.5/68.0, entraxe réel ~8.5-9 px — le pas de header
  // 2.54mm réel du module, PAS 12 px) — jamais 1×BREADBOARD_PITCH exact, à
  // la différence de TMP36. PhysicalContacts fonctionnels VERROUILLÉS,
  // recalés au pas breadboard : VCC(48,92)/OUT(60,92)/GND(72,92), entraxe
  // 12 px = 1×BREADBOARD_PITCH exact entre chaque paire adjacente, même
  // rangée (dy=92, juste sous les racines mesurées y≈80, à l'intérieur de la
  // boîte canonique 96 px de haut) — même stratégie que FORCE_SENSOR/
  // FLEX_SENSOR/SOIL_MOISTURE_SENSOR (racines visuelles mesurées ≠
  // PhysicalContacts fonctionnels alignés grille — cf. assemblyProfiles.js
  // pour les racines).
  // A7-C4-TILT — Tilt Sensor (SW-520D-style module, pack Founder PASS 72×120).
  // Pixel-probe réel (centroïdes alpha-pondérés, méthode identique à
  // PIR_MOTION_SENSOR) sur le segment vertical stable de chaque patte
  // (y∈[104,116]) : DO (30.76,109.93)->racine (31,110) ; GND (39.2,109.98)
  // ->racine (39,110) — entraxe réel Δx≈8.4 px, NON multiple de 12 (raster
  // roots ≠ PhysicalContacts, §4 du ticket, parfaitement autorisé). Les
  // PhysicalContacts fonctionnels ci-dessous sont recalés à dx 29/41 (entraxe
  // 12 = 1×BREADBOARD_PITCH exact, DEUX TROUS ADJACENTS — préférence §4 du
  // ticket, la plus proche géométriquement des racines réelles) et dy 108
  // (multiple exact de 12, même convention que BUZZER/POTENTIOMETER pour un
  // composant traversant de hauteur canonique 120). AssemblyLeadsLayer relie
  // chaque racine mesurée (assemblyProfiles.js) à son PhysicalContact via une
  // courte patte fonctionnelle (style metallic-wire).
  TILT_SENSOR: [
    { id: "DO", label: "DO", dx: 29, dy: 108, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "DO", dx: 29, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 41, dy: 108, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND", dx: 41, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
  ],
  PIR_MOTION_SENSOR: [
    { id: "VCC", label: "VCC", dx: 48, dy: 92, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "VCC", dx: 48, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
    { id: "OUT", label: "OUT", dx: 60, dy: 92, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "OUT", dx: 60, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 72, dy: 92, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND", dx: 72, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A7-C4-IR — IR Receiver (TSOP4838-style 38 kHz module, pack Founder PASS
  // 72×120). Pixel-probe réel (System.Drawing, alpha-weighted centroid sur
  // le segment vertical stable de chaque patte, y∈[58,111], confirmé par
  // recoupement sur le 3x) : SIGNAL (23.68,82.83)->x≈24 ; GND (35.07,82.65)
  // ->x≈35 ; VCC (47.03,82.89)->x≈47 — entraxes réels ≈11.4/11.96 px, TRÈS
  // proches de 12 px mais pas exacts (raster roots ≠ PhysicalContacts, §4/§6
  // du ticket, autorisé). Les PhysicalContacts fonctionnels ci-dessous sont
  // verrouillés à la cible CSA dx 24/36/48 (entraxe 12 = 1×BREADBOARD_PITCH
  // exact entre chaque paire adjacente — écart ≤1 px des racines réelles,
  // dans la tolérance ±2 px du ticket §6) et dy 108 (multiple exact de 12,
  // même convention que TILT_SENSOR/BUZZER/POTENTIOMETER pour un composant
  // traversant de hauteur canonique 120). AssemblyLeadsLayer relie chaque
  // racine mesurée (assemblyProfiles.js) à son PhysicalContact via une
  // courte patte fonctionnelle (style metallic-wire).
  IR_RECEIVER: [
    { id: "SIGNAL", label: "SIGNAL", dx: 24, dy: 108, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "SIGNAL", dx: 24, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 36, dy: 108, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND", dx: 36, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
    { id: "VCC", label: "VCC", dx: 48, dy: 108, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "VCC", dx: 48, dy: 108, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A7-C5 — HC-SR04 Ultrasonic Distance Sensor (asset raster Founder PASS
  // 144×96 @1x). Pixel-probe réel (alpha>=32, System.Drawing, sur le paquet
  // copié dans ce worktree) : bounding box opaque globale (1x) [2,8,141,87]
  // — cohérent EXACTEMENT avec le pack Founder (manifest.json
  // pixelProbe.opaqueBounds1x [2,8,141,87]). Les 4 pattes de l'en-tête (VCC/
  // TRIG/ECHO/GND) se scindent pour la première fois à y=68 (dernière ligne
  // pleine y=67), restent des segments verticaux stables et pleinement
  // opaques (alpha jusqu'à 255) de y=68 à y=87 — bord net, alpha=0 sans
  // résidu de y=88 à y=95 (dernière ligne du canvas). Centroïdes
  // alpha-pondérés sur ce segment stable (y∈[68,87]) : VCC (60.077,77.232),
  // TRIG (67.194,77.331), ECHO (74.288,77.253), GND (81.402,77.187) —
  // recoupés sur le 3x (÷3 cohérent à <0.4 px). Entraxe réel mesuré ≈7.1 px
  // (7.117/7.094/7.114), PAS 12 px (§3 du ticket : le header 2.54mm réel du
  // module est nettement plus étroit que BREADBOARD_PITCH). Les
  // PhysicalContacts fonctionnels ci-dessous sont donc RECALÉS au pas
  // breadboard, comme PIR_MOTION_SENSOR/SOIL_MOISTURE_SENSOR : VCC(54,92)/
  // TRIG(66,92)/ECHO(78,92)/GND(90,92), entraxe 12 = 1×BREADBOARD_PITCH
  // exact entre CHAQUE paire adjacente, centrage choisi au plus proche du
  // centre des racines mesurées (centre racines ≈70.7, centre contacts=72).
  // AUCUN bodyClip requis : le raster s'arrête naturellement à y=87, avant
  // les PhysicalContacts (dy=92) — même situation que PIR_MOTION_SENSOR/
  // TMP36/VIBRATION_MOTOR (racines mesurées, cf. assemblyProfiles.js).
  HC_SR04: [
    { id: "VCC", label: "VCC", dx: 54, dy: 92, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "VCC", dx: 54, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
    { id: "TRIG", label: "TRIG", dx: 66, dy: 92, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "TRIG", dx: 66, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
    { id: "ECHO", label: "ECHO", dx: 78, dy: 92, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "ECHO", dx: 78, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 90, dy: 92, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND", dx: 90, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A4-INDUCTOR — inductance axiale (asset Founder PASS 144×108, pixel-probe
  // réel via System.Drawing sur le paquet livré : bounding box opaque
  // globale (1x) x∈[1,142] y∈[4,67], conforme au manifest.json
  // opaqueBounds1x [1,4,142,67]). Colonnes des capuchons métalliques
  // stables (alpha≥32) x∈[5,10] (gauche) et x∈[133,137] (droite),
  // y∈[14,53] — racines mécaniques mesurées au premier pixel
  // substantiellement opaque scanné depuis chaque bord : A(4,52)/B(139,52)
  // (bas du capuchon, cf. assemblyProfiles.js — les pattes synthétiques
  // pointent vers le bas, même convention que CAPACITOR/THERMISTOR/LDR pour
  // un passif à 2 bornes enfichable, malgré un corps visuellement
  // horizontal). PhysicalContacts fonctionnels recalés au pas breadboard :
  // A(12,92)/B(132,92), entraxe 132-12 = 120 px = 10 × BREADBOARD_PITCH
  // exact — dérive racine→contact modeste (8px/7px), même stratégie que
  // FORCE_SENSOR/FLEX_SENSOR (racine mesurée ≠ contact fonctionnel recalé au
  // pas breadboard, pont assuré par AssemblyLeadsLayer). Aucun bodyClip
  // requis : le raster s'arrête naturellement à y≈52-54 sur ces colonnes,
  // largement avant les PhysicalContacts (y=92) — même situation que
  // TMP36/VIBRATION_MOTOR/HC_SR04.
  INDUCTOR: [
    { id: "A", label: "A", dx: 0, dy: 52, contacts: [{ id: "A", dx: 12, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
    { id: "B", label: "B", dx: 144, dy: 52, contacts: [{ id: "B", dx: 132, dy: 92, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A9-JK1 : 74HC73 DIP-14 double bascule J-K, raster Founder PASS/FROZEN (derive runtime
  // isotrope 120x88, pack CSA LOCKED). 14 pins ELECTRIQUES = 14 PhysicalContacts CSA LOCKED :
  // rangee basse y=68 (broches 1..7, gauche -> droite), rangee haute y=20 (broches 14..8,
  // gauche -> droite), pas 12, ecartement 48 = 4 x pitch, x = 25 + 12k (manifest.json).
  JK_FLIP_FLOP_74HC73: [
    { id: "1CP", label: "1CP", dx: 25, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1CP", dx: 25, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1R", label: "1R", dx: 37, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1R", dx: 37, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1K", label: "1K", dx: 49, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1K", dx: 49, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "VCC", label: "VCC", dx: 61, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "VCC", dx: 61, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2CP", label: "2CP", dx: 73, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2CP", dx: 73, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2R", label: "2R", dx: 85, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2R", dx: 85, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2J", label: "2J", dx: 97, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2J", dx: 97, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2NQ", label: "2NQ", dx: 97, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2NQ", dx: 97, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2Q", label: "2Q", dx: 85, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2Q", dx: 85, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2K", label: "2K", dx: 73, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2K", dx: 73, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 61, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND", dx: 61, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1Q", label: "1Q", dx: 49, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1Q", dx: 49, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1NQ", label: "1NQ", dx: 37, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1NQ", dx: 37, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1J", label: "1J", dx: 25, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1J", dx: 25, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A9-DFF1 : 74HC74 DIP-14 double bascule D, raster Founder PASS/FROZEN (derive runtime
  // isotrope 120x88, pack CSA LOCKED). 14 pins ELECTRIQUES = 14 PhysicalContacts CSA LOCKED
  // (manifest.json physicalContacts) : rangee basse y=68 (broches 1..7, gauche -> droite),
  // rangee haute y=20 (broches 14..8, gauche -> droite), pas 12, ecartement 48 = 4 x pitch.
  D_FLIP_FLOP_74HC74: [
    { id: "1CLR", label: "1CLR", dx: 25, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1CLR", dx: 25, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1D", label: "1D", dx: 37, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1D", dx: 37, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1CLK", label: "1CLK", dx: 49, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1CLK", dx: 49, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1PRE", label: "1PRE", dx: 61, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1PRE", dx: 61, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1Q", label: "1Q", dx: 73, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1Q", dx: 73, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "1NQ", label: "1NQ", dx: 85, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "1NQ", dx: 85, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "GND", label: "GND", dx: 97, dy: 68, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "GND", dx: 97, dy: 68, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2NQ", label: "2NQ", dx: 97, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2NQ", dx: 97, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2Q", label: "2Q", dx: 85, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2Q", dx: 85, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2PRE", label: "2PRE", dx: 73, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2PRE", dx: 73, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2CLK", label: "2CLK", dx: 61, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2CLK", dx: 61, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2D", label: "2D", dx: 49, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2D", dx: 49, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "2CLR", label: "2CLR", dx: 37, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "2CLR", dx: 37, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
    { id: "VCC", label: "VCC", dx: 25, dy: 20, wireConnectable: true, breadboardInsertable: true, contacts: [{ id: "VCC", dx: 25, dy: 20, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // A5-ZENER_DIODE — asset Founder PASS FROZEN 144×72, pixel-probe réel
  // (alpha>=32, createImageBitmap/getImageData sur le fichier livré) :
  // bounding box opaque globale (1x) x∈[0,143] y∈[7,63] (== manifest.json
  // opaqueBounds1x [0,7,143,63]) ; centre vertical de la forme opaque
  // dy=(7+63)/2=35. Boîte canonique 144 == 12×BREADBOARD_PITCH exact :
  // comme DIODE (84==7×12), les pins aux bords du boîtier sont DÉJÀ
  // alignées sur le pas breadboard sans avoir besoin d'un `contacts[]`
  // explicite (le fallback contactModel.js utilise pin.dx/dy). Bande
  // cathode (bande quasi-noire, r≈g≈b très bas, distincte du corps
  // rouge/orange translucide) mesurée x∈[90,100] à dy=35 : nettement du
  // côté K (droite) — confirme l'orientation A=gauche/K=droite déjà
  // imposée par manifest.json (`visiblePinOrder`/`polarity`).
  ZENER_DIODE: [
    { id: "A", label: "A", dx: 0, dy: 35 },
    { id: "K", label: "K", dx: 144, dy: 35 },
  ],
}

function buildPins(type) {
  const canonicalEntry = getCanonicalEntry(type)
  const presentationPins = PIN_PRESENTATION_BY_TYPE[type]
  if (!canonicalEntry || !presentationPins) throw new Error(`Unknown component pin definition: ${type}`)
  const presentationById = new Map()
  for (const presentationPin of presentationPins) {
    if (presentationById.has(presentationPin.id)) throw new Error(`Duplicate presentation pin id for component ${type}: ${presentationPin.id}`)
    presentationById.set(presentationPin.id, presentationPin)
  }
  if (canonicalEntry.pins.length !== presentationPins.length) throw new Error(`Pin count mismatch for component ${type}`)
  return canonicalEntry.pins.map((canonicalPin) => {
    const presentationPin = presentationById.get(canonicalPin.id)
    if (!presentationPin) throw new Error(`Missing presentation pin for component ${type}: ${canonicalPin.id}`)
    return {
      ...canonicalPin,
      label: presentationPin.label,
      dx: presentationPin.dx,
      dy: presentationPin.dy,
      ...(typeof presentationPin.wireConnectable === "boolean" ? { wireConnectable: presentationPin.wireConnectable } : {}),
      ...(typeof presentationPin.breadboardInsertable === "boolean" ? { breadboardInsertable: presentationPin.breadboardInsertable } : {}),
      ...(Array.isArray(presentationPin.contacts) ? { contacts: presentationPin.contacts.map((c) => ({ ...c })) } : {}),
    }
  })
}

export const COMPONENT_TYPES = {
  LED: { id: "LED", label: "LED", icon: "💡", width: 80, height: 64, pins: buildPins("LED") },
  RESISTOR: { id: "RESISTOR", label: "Résistance", icon: "〰️", width: 84, height: 28, pins: buildPins("RESISTOR") },
  ARDUINO: { id: "ARDUINO", label: "Arduino UNO", icon: "🤖", width: 120, height: 140, pins: buildPins("ARDUINO") },
  BUTTON: { id: "BUTTON", label: "Bouton", icon: "🔘", width: 60, height: 60, pins: buildPins("BUTTON"), interaction: { type: "momentary" }, initialState: "released" },
  BUTTON_LATCHING: { id: "BUTTON_LATCHING", label: "Interrupteur", icon: "🔲", width: 60, height: 60, pins: buildPins("BUTTON_LATCHING"), interaction: { type: "latching" }, initialState: "off" },
  POWER: { id: "POWER", label: "Alimentation", icon: "⚡", width: 70, height: 90, pins: buildPins("POWER") },
  BATTERY_AA: { id: "BATTERY_AA", label: "Pile AA 1,5 V", icon: "🔋", width: 40, height: 100, pins: buildPins("BATTERY_AA") },
  COIN_CELL_CR2032: { id: "COIN_CELL_CR2032", label: "Pile CR2032 3 V", icon: "🔋", width: 60, height: 60, pins: buildPins("COIN_CELL_CR2032") },
  BATTERY_9V: { id: "BATTERY_9V", label: "Pile 9 V", icon: "🔋", width: 70, height: 90, pins: buildPins("BATTERY_9V") },
  CAPACITOR: { id: "CAPACITOR", label: "Condensateur", icon: "║║", width: 70, height: 40, pins: buildPins("CAPACITOR") },
  BUZZER: { id: "BUZZER", label: "Buzzer", icon: "🔊", width: 120, height: 120, pins: buildPins("BUZZER") },
  POTENTIOMETER: { id: "POTENTIOMETER", label: "Potentiomètre", icon: "🎚", width: 120, height: 120, pins: buildPins("POTENTIOMETER") },
  LDR: { id: "LDR", label: "Photoresistance (LDR)", icon: "☀️", width: 84, height: 36, pins: buildPins("LDR") },
  THERMISTOR: { id: "THERMISTOR", label: "Thermistance", icon: "🌡", width: 84, height: 36, pins: buildPins("THERMISTOR") },
  DIODE: { id: "DIODE", label: "Diode", icon: "↦|", width: 84, height: 30, pins: buildPins("DIODE") },
  RGB_LED: { id: "RGB_LED", label: "LED RGB", icon: "🌈", width: 90, height: 56, pins: buildPins("RGB_LED") },
  NPN_TRANSISTOR: { id: "NPN_TRANSISTOR", label: "Transistor NPN", icon: "NPN", width: 90, height: 60, pins: buildPins("NPN_TRANSISTOR") },
  PNP_TRANSISTOR: { id: "PNP_TRANSISTOR", label: "Transistor PNP", icon: "PNP", width: 132, height: 66, pins: buildPins("PNP_TRANSISTOR") },
  NMOS: { id: "NMOS", label: "MOSFET canal N", icon: "NMOS", width: 144, height: 288, pins: buildPins("NMOS") },
  PMOS: { id: "PMOS", label: "MOSFET canal P", icon: "PMOS", width: 144, height: 288, pins: buildPins("PMOS") },
  VOLTAGE_REGULATOR: { id: "VOLTAGE_REGULATOR", label: "Régulateur 5 V", icon: "VOLTAGE_REGULATOR", width: 144, height: 288, pins: buildPins("VOLTAGE_REGULATOR") },
  RELAY: { id: "RELAY", label: "Relais SPDT", icon: "RELAY", width: 288, height: 288, pins: buildPins("RELAY") },
  SERVO: { id: "SERVO", label: "Micro Servo", icon: "⚙️", width: 90, height: 70, pins: buildPins("SERVO") },
  DC_MOTOR: { id: "DC_MOTOR", label: "Moteur DC", icon: "🌀", width: 84, height: 50, pins: buildPins("DC_MOTOR") },
  POLARIZED_CAPACITOR: { id: "POLARIZED_CAPACITOR", label: "Condensateur polarisé", icon: "⊕║", width: 33, height: 120, pins: buildPins("POLARIZED_CAPACITOR") },
  // A3-SW1 — Slide Switch : interaction déclarative généralisée pour un
  // composant à état persistant à N valeurs (cf. CircuitComponent.jsx,
  // interaction.type === "state-toggle") — BUTTON_LATCHING (type "latching",
  // on/off) reste inchangé et distinct.
  SLIDE_SWITCH: { id: "SLIDE_SWITCH", label: "Interrupteur à glissière", icon: "⇄", width: 72, height: 48, pins: buildPins("SLIDE_SWITCH"), interaction: { type: "state-toggle", states: ["left", "right"] }, initialState: "left" },
  // A3-SW2 — DIP Switch : capacité déclarative généralisée pour un composant
  // à PLUSIEURS canaux de commutation indépendants (cf. CircuitComponent.jsx,
  // interaction.type === "multi-state-toggle" ; canonicalRegistry.js,
  // internalConnections.channels). `channels` énumère les canaux déclarés,
  // `states` leur vocabulaire commun (off/on) — ni l'un ni l'autre n'est
  // figé sur "4" ou sur DIP_SWITCH : un futur composant multi-canaux
  // réutilise ce même contrat sans modification de CircuitComponent.jsx.
  DIP_SWITCH: { id: "DIP_SWITCH", label: "Interrupteur DIP 4 positions", icon: "▦", width: 112, height: 56, pins: buildPins("DIP_SWITCH"), interaction: { type: "multi-state-toggle", channels: ["1", "2", "3", "4"], states: ["off", "on"] }, initialChannelStates: { "1": "off", "2": "off", "3": "off", "4": "off" } },
  // A6-OUT1-R1 — Vibration Motor : réutilisation DC_MOTOR (aucune duplication
  // de simulation, cf. simulator/dcContributionRegistry.js). Renderer raster
  // (VibrationMotorPart.jsx, paquet Founder-approved), boîte canonique 72×96
  // (était 50×70 provisoire A6-OUT1) — cf. ticket A6-OUT1-R1.
  VIBRATION_MOTOR: { id: "VIBRATION_MOTOR", label: "Moteur à vibration", icon: "📳", width: 72, height: 96, pins: buildPins("VIBRATION_MOTOR") },
  // A6-OUT2 — Light Bulb : charge résistive DC simple, NON polarisée (pins
  // A/B). Renderer raster (LightBulbPart.jsx, paquet Founder-approved),
  // boîte canonique 72×96 (même famille géométrique que VIBRATION_MOTOR).
  LIGHT_BULB: { id: "LIGHT_BULB", label: "Ampoule", icon: "💡", width: 72, height: 96, pins: buildPins("LIGHT_BULB") },
  // A6-OUT3 — Hobby Gearmotor : réutilisation DC_MOTOR (aucune duplication de
  // simulation, cf. simulator/dcContributionRegistry.js). Renderer raster
  // (HobbyGearmotorPart.jsx, paquet Founder-approved "VERTICAL FINAL"),
  // boîte canonique VERTICALE 72×120 (largeur < hauteur, à la différence de
  // VIBRATION_MOTOR/LIGHT_BULB qui sont 72×96) — wire-only, jamais
  // enfichable breadboard.
  HOBBY_GEARMOTOR: { id: "HOBBY_GEARMOTOR", label: "Motoréducteur", icon: "⚙️", width: 72, height: 120, pins: buildPins("HOBBY_GEARMOTOR") },
  // A7-C1 — TMP36 : premier capteur environnemental analogique de la famille
  // A7-C (contrat générique A7-C0). Renderer raster (Tmp36Part.jsx, paquet
  // Founder-approved R3), boîte canonique 60×72 (dimensions natives @1x du
  // paquet).
  TMP36: { id: "TMP36", label: "Capteur de température (TMP36)", icon: "🌡️", width: 60, height: 72, pins: buildPins("TMP36") },
  // A7-C2-R2 — Force Sensor (FSR) : capteur résistif environnemental (contrat
  // générique A7-C0, stimulus FORCE). Renderer raster (ForceSensorPart.jsx,
  // paquet Founder-approved), boîte canonique VERTICALE 72×144 (dimensions
  // natives @1x du paquet) — enfichable breadboard (PhysicalContacts
  // fonctionnels A(30,132)/B(42,132), entraxe 1×BREADBOARD_PITCH, correctif
  // Founder Canvas Gate A7-C2-R2).
  FORCE_SENSOR: { id: "FORCE_SENSOR", label: "Capteur de force (FSR)", icon: "👆", width: 72, height: 144, pins: buildPins("FORCE_SENSOR") },
  // A7-C2-R1 — Flex Sensor : capteur résistif environnemental (contrat
  // générique A7-C0, stimulus FLEX). Renderer raster (FlexSensorPart.jsx,
  // paquet Founder-approved), boîte canonique VERTICALE 72×180 (dimensions
  // natives @1x du paquet) — enfichable breadboard (PhysicalContacts
  // fonctionnels A(30,180)/B(42,180), entraxe 1×BREADBOARD_PITCH, correctif
  // Founder Canvas Gate A7-C2-R1).
  FLEX_SENSOR: { id: "FLEX_SENSOR", label: "Capteur de flexion", icon: "📏", width: 72, height: 180, pins: buildPins("FLEX_SENSOR") },
  // A7-C3 — Soil Moisture Sensor : capteur environnemental analogique +
  // numérique (contrat générique A7-C0, stimulus MOISTURE). Renderer raster
  // (SoilMoistureSensorPart.jsx, paquet Founder-approved), boîte canonique
  // 144×144 (dimensions natives @1x du paquet) — enfichable breadboard
  // (PhysicalContacts fonctionnels VCC(80,140)/AO(92,140)/DO(104,140)/
  // GND(116,140), entraxe 1×BREADBOARD_PITCH entre chaque paire adjacente).
  SOIL_MOISTURE_SENSOR: { id: "SOIL_MOISTURE_SENSOR", label: "Capteur d'humidité du sol", icon: "🌱", width: 144, height: 144, pins: buildPins("SOIL_MOISTURE_SENSOR") },
  // A7-C4-PIR — PIR Motion Sensor : capteur environnemental numérique (contrat
  // générique A7-C0, stimulus MOTION). Renderer raster (PirMotionSensorPart.jsx,
  // paquet Founder-approved), boîte canonique 120×96 (dimensions natives @1x
  // du paquet) — enfichable breadboard (PhysicalContacts fonctionnels
  // VCC(48,92)/OUT(60,92)/GND(72,92), entraxe 1×BREADBOARD_PITCH entre chaque
  // paire adjacente). Aucune sortie analogique (§12 du ticket).
  PIR_MOTION_SENSOR: { id: "PIR_MOTION_SENSOR", label: "Capteur de mouvement PIR", icon: "🕵️", width: 120, height: 96, pins: buildPins("PIR_MOTION_SENSOR") },
  // A7-C4-TILT — Tilt Sensor : capteur environnemental numérique (contrat
  // générique A7-C0, stimulus TILT). Renderer raster (TiltSensorPart.jsx,
  // paquet Founder-approved), boîte canonique 72×120 (dimensions natives @1x
  // du paquet) — enfichable breadboard (PhysicalContacts fonctionnels
  // DO(29,108)/GND(41,108), entraxe 1×BREADBOARD_PITCH). Aucune broche VCC
  // (le pack Founder PASS n'en expose aucune, §0/§7/§11 du ticket) ; aucune
  // sortie analogique (§12 du ticket).
  TILT_SENSOR: { id: "TILT_SENSOR", label: "Capteur d'inclinaison", icon: "🧭", width: 72, height: 120, pins: buildPins("TILT_SENSOR") },
  // A7-C4-IR — IR Receiver : capteur environnemental numérique (contrat
  // générique A7-C0, stimulus INFRARED). Renderer raster (IrReceiverPart.jsx,
  // paquet Founder-approved), boîte canonique 72×120 (dimensions natives @1x
  // du paquet) — enfichable breadboard (PhysicalContacts fonctionnels
  // SIGNAL(24,108)/GND(36,108)/VCC(48,108), entraxe 1×BREADBOARD_PITCH entre
  // chaque paire adjacente). SIGNAL est active-low (§12 du ticket) ; aucune
  // sortie analogique (§15 du ticket).
  IR_RECEIVER: { id: "IR_RECEIVER", label: "Récepteur IR", icon: "📡", width: 72, height: 120, pins: buildPins("IR_RECEIVER") },
  // A7-C5 — HC-SR04 : capteur environnemental TEMPOREL (contrat générique
  // A7-C0 pour le stimulus DISTANCE + Generic Timed Digital Output Runtime,
  // A7-C5-PREQ, pour la sortie ECHO). Renderer raster (HcSr04Part.jsx,
  // paquet Founder-approved), boîte canonique 144×96 (dimensions natives @1x
  // du paquet) — enfichable breadboard (PhysicalContacts fonctionnels
  // VCC(54,92)/TRIG(66,92)/ECHO(78,92)/GND(90,92), entraxe 1×BREADBOARD_PITCH
  // entre chaque paire adjacente). Aucune sortie analogique (§13 du ticket).
  HC_SR04: { id: "HC_SR04", label: "Capteur de distance à ultrasons", icon: "📏", width: 144, height: 96, pins: buildPins("HC_SR04") },
  // A4-INDUCTOR — inductance axiale (contrat transitoire générique A4-D-PREQ1/2,
  // stimulus AUCUN — composant purement électrique, pas de capteur
  // environnemental). Renderer raster (InductorPart.jsx, paquet Founder-approved
  // FROZEN), boîte canonique 144×108 (dimensions natives @1x du paquet) —
  // enfichable breadboard (PhysicalContacts fonctionnels A(12,92)/B(132,92),
  // entraxe 10×BREADBOARD_PITCH). Aucune contribution DC steady-state (§11
  // du ticket, voir dcContributionRegistry.js/transientContributionRegistry.js).
  INDUCTOR: { id: "INDUCTOR", label: "Inductance", icon: "🧲", width: 144, height: 108, pins: buildPins("INDUCTOR") },
  // A5-ZENER_DIODE — diode Zener axiale, asset Founder PASS/FROZEN. Renderer
  // raster (ZenerDiodePart.jsx, même patron que DiodePart.jsx : corps
  // raster conservé via fenêtre de découpe, pattes physiques génériques via
  // AssemblyLeadsLayer), boîte canonique 144×72 (dimensions natives @1x du
  // paquet). Enfichable breadboard (pins A(0,35)/K(144,35), entraxe
  // 12×BREADBOARD_PITCH exact — boîte déjà alignée sur le pas, cf.
  // PIN_PRESENTATION_BY_TYPE.ZENER_DIODE ci-dessus). Contribution DC :
  // createDiodeDcContribution({reverseBreakdown:true}) (A5-D-PREQ), mêmes
  // ids canoniques A/K imposés par le pack Founder (voir
  // dcContributionRegistry.js).
  ZENER_DIODE: { id: "ZENER_DIODE", label: "Diode Zener", icon: "⊳|", width: 144, height: 72, pins: buildPins("ZENER_DIODE") },
  H_BRIDGE: { id: "H_BRIDGE", label: "Pont en H L293D", icon: "H_BRIDGE", width: 132, height: 88, pins: buildPins("H_BRIDGE") },
  AND_GATE: { id: "AND_GATE", label: "AND Gate", icon: "AND_GATE", width: 144, height: 96, pins: buildPins("AND_GATE") },
  OR_GATE: { id: "OR_GATE", label: "OR Gate", icon: "OR_GATE", width: 144, height: 96, pins: buildPins("OR_GATE") },
  NAND_GATE: { id: "NAND_GATE", label: "NAND Gate", icon: "NAND_GATE", width: 144, height: 96, pins: buildPins("NAND_GATE") },
  NOR_GATE: { id: "NOR_GATE", label: "NOR Gate", icon: "NOR_GATE", width: 144, height: 96, pins: buildPins("NOR_GATE") },
  XOR_GATE: { id: "XOR_GATE", label: "XOR Gate", icon: "XOR_GATE", width: 144, height: 96, pins: buildPins("XOR_GATE") },
  NOT_GATE: { id: "NOT_GATE", label: "NOT Gate", icon: "NOT_GATE", width: 144, height: 96, pins: buildPins("NOT_GATE") },
  JK_FLIP_FLOP_74HC73: { id: "JK_FLIP_FLOP_74HC73", label: "74HC73 Dual J-K Flip-Flop", icon: "JK_FLIP_FLOP_74HC73", width: 120, height: 88, pins: buildPins("JK_FLIP_FLOP_74HC73") },
  D_FLIP_FLOP_74HC74: { id: "D_FLIP_FLOP_74HC74", label: "74HC74 Dual D Flip-Flop", icon: "D_FLIP_FLOP_74HC74", width: 120, height: 88, pins: buildPins("D_FLIP_FLOP_74HC74") },
}

// L1-PROP-001: one common product contract, attached to the existing catalogue.
export const COMMON_PROPERTY_SCHEMA = Object.freeze({
  name: Object.freeze({ type: "string", default: "", maxLength: 80, label: "Nom", control: "text" }),
})
for (const definition of Object.values(COMPONENT_TYPES)) {
  definition.propertySchema = COMMON_PROPERTY_SCHEMA
}

// L1-PROP-003: LED's first physical property — orthogonal to electrical
// parameters/runtime isOn (§4/§6 of the ticket). Declarative extension of the
// common contract; the renderer (LedPart.jsx) is the only place allowed to
// interpret `color`.
export const LED_COLOR_OPTIONS = Object.freeze([
  Object.freeze({ value: "red", label: "Rouge" }),
  Object.freeze({ value: "green", label: "Vert" }),
  Object.freeze({ value: "blue", label: "Bleu" }),
  Object.freeze({ value: "yellow", label: "Jaune" }),
  Object.freeze({ value: "white", label: "Blanc" }),
])
COMPONENT_TYPES.LED.propertySchema = Object.freeze({
  ...COMMON_PROPERTY_SCHEMA,
  color: Object.freeze({ type: "string", default: "red", label: "Couleur", control: "select", options: LED_COLOR_OPTIONS }),
})

export const PALETTE_ITEMS = [COMPONENT_TYPES.LED, COMPONENT_TYPES.RESISTOR, COMPONENT_TYPES.ARDUINO, COMPONENT_TYPES.BUTTON, COMPONENT_TYPES.BUTTON_LATCHING, COMPONENT_TYPES.POWER, COMPONENT_TYPES.BATTERY_AA, COMPONENT_TYPES.COIN_CELL_CR2032, COMPONENT_TYPES.BATTERY_9V, COMPONENT_TYPES.CAPACITOR, COMPONENT_TYPES.BUZZER, COMPONENT_TYPES.POTENTIOMETER, COMPONENT_TYPES.LDR, COMPONENT_TYPES.THERMISTOR, COMPONENT_TYPES.DIODE, COMPONENT_TYPES.RGB_LED, COMPONENT_TYPES.NPN_TRANSISTOR, COMPONENT_TYPES.PNP_TRANSISTOR, COMPONENT_TYPES.NMOS, COMPONENT_TYPES.PMOS, COMPONENT_TYPES.VOLTAGE_REGULATOR, COMPONENT_TYPES.RELAY, COMPONENT_TYPES.SERVO, COMPONENT_TYPES.DC_MOTOR, COMPONENT_TYPES.POLARIZED_CAPACITOR, COMPONENT_TYPES.SLIDE_SWITCH, COMPONENT_TYPES.DIP_SWITCH, COMPONENT_TYPES.VIBRATION_MOTOR, COMPONENT_TYPES.LIGHT_BULB, COMPONENT_TYPES.HOBBY_GEARMOTOR, COMPONENT_TYPES.TMP36, COMPONENT_TYPES.FORCE_SENSOR, COMPONENT_TYPES.FLEX_SENSOR, COMPONENT_TYPES.SOIL_MOISTURE_SENSOR, COMPONENT_TYPES.PIR_MOTION_SENSOR, COMPONENT_TYPES.TILT_SENSOR, COMPONENT_TYPES.IR_RECEIVER, COMPONENT_TYPES.HC_SR04, COMPONENT_TYPES.INDUCTOR, COMPONENT_TYPES.ZENER_DIODE, COMPONENT_TYPES.H_BRIDGE, COMPONENT_TYPES.AND_GATE, COMPONENT_TYPES.OR_GATE, COMPONENT_TYPES.NAND_GATE, COMPONENT_TYPES.NOR_GATE, COMPONENT_TYPES.XOR_GATE, COMPONENT_TYPES.NOT_GATE, COMPONENT_TYPES.JK_FLIP_FLOP_74HC73, COMPONENT_TYPES.D_FLIP_FLOP_74HC74]

export function getComponentDef(type) { return COMPONENT_TYPES[type] ?? null }

export function createComponent(type, x, y) {
  const def = getComponentDef(type)
  if (!def) return null
  return {
    uid: createUid(), type: def.id, x, y, pins: def.pins.map((pin) => ({ ...pin })),
    ...(def.initialState !== undefined ? { state: def.initialState } : {}),
    ...(def.initialChannelStates !== undefined ? { channelStates: { ...def.initialChannelStates } } : {}),
  }
}
