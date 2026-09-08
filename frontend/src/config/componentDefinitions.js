import { createUid } from "../utils/ids.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"

/**
 * Présentation locale des pins. Les identifiants et rôles sont canoniques dans
 * simulator/canonicalRegistry.js ; ce tableau ne contient que la clé de jointure
 * id et les propriétés propres à l'affichage et au positionnement.
 */
const PIN_PRESENTATION_BY_TYPE = {
  LED: [
    { id: "anode", label: "Anode", dx: 28, dy: 62 },
    { id: "cathode", label: "Cathode", dx: 52, dy: 62 },
  ],
  RESISTOR: [
    { id: "A", label: "A", dx: 0, dy: 14 },
    { id: "B", label: "B", dx: 84, dy: 14 },
  ],
  // [FT-B-001-S5] ARDUINO n'est PAS directement enfichable dans le breadboard :
  // c'est une carte reliée au breadboard PAR FIL. `pin.dx/dy` (géométrie
  // canonique / électrique) reste inchangée ; les CONTACTS physiques déclarés
  // portent les vraies positions raster des connecteurs (silhouette photo de
  // la carte, cf. MB-VIS-COMP-037) et sont `breadboardInsertable: false`. Le
  // registre ARDUINO_VISUAL_PINS (pinPresentationGeometry.js) est supprimé.
  ARDUINO: [
    { id: "D2", label: "D2", dx: 0, dy: 50, contacts: [{ id: "D2", dx: 3, dy: 50, wireConnectable: true, breadboardInsertable: false }] },
    { id: "D3", label: "D3", dx: 0, dy: 75, contacts: [{ id: "D3", dx: 15, dy: 75, wireConnectable: true, breadboardInsertable: false }] },
    { id: "GND", label: "GND", dx: 0, dy: 110, contacts: [{ id: "GND", dx: 15, dy: 108, wireConnectable: true, breadboardInsertable: false }] },
    { id: "5V", label: "5V", dx: 120, dy: 50, contacts: [{ id: "5V", dx: 115, dy: 50, wireConnectable: true, breadboardInsertable: false }] },
  ],
  // [MB-VIS-BUTTON-ASSET-006] Remesuré depuis zéro sur le nouveau paquet
  // d'assets "Tinkercad-style" (housing carré + 4 pattes métalliques
  // physiques, cf. ButtonPart.jsx) — les anciennes valeurs (dx:8/51, héritées
  // de MB-VIS-CONTACT-FOUNDATION-001) mesuraient un asset visuellement
  // différent et n'ont explicitement PAS été considérées valides pour ce
  // remplacement (mandat CSA). Méthode : pixel-probe navigateur
  // (canvas.getImageData sur button.released.3x.png, alpha>16), centre de
  // masse pondéré par alpha calculé séparément sur chaque patte (colonnes
  // isolées aux lignes "hors boîtier", au-dessus/en-dessous du corps) pour
  // le dx, et sur la même colonne pour le dy — évite le bruit de
  // quantification d'un simple bbox. Pattes gauche/droite mesurées à
  // x≈40.7/139.3 (échelle 3x, soit ≈13.6/46.4 en 1x) — somme ≈180 (3x) /
  // 60 (1x) : symétrie quasi parfaite, cohérente avec le housing carré
  // centré. dy mesuré ≈90.7 (3x) / ≈30.2 (1x) — quasiment inchangé par
  // rapport à l'ancienne valeur (30), le nouvel asset restant centré
  // verticalement dans sa boîte 60×60. Valeurs arrondies à l'entier le plus
  // proche en conservant la symétrie gauche/droite (14+46=60). Toujours
  // exactement 2 pins logiques (mandat §7/§8) : les 4 pattes visibles sont
  // une représentation physique pure, non électrique.
  // [FT-B-001-S2] `contacts` : 4 pattes métalliques physiques / 2 pins
  // électriques canoniques (canonicalRegistry.js INCHANGÉ). Les deux pattes
  // d'un même côté (gauche = pin1, droite = pin2) sont électriquement
  // reliées dans le boîtier ; leurs `contact.id` ("1a"/"1b", "2a"/"2b") sont
  // une identité de PRÉSENTATION uniquement, jamais un nœud électrique.
  // Coordonnées = centroïdes pondérés par alpha des 4 blobs métalliques hors
  // boîtier, mesurés sur button.released.3x.png (pixel-probe, cohérent 1x/3x)
  // : gauche x≈13.6 → 14, droite x≈46.4 → 46 ; patte haute y≈4.95, patte
  // basse y≈53.9. Le contact PAR DÉFAUT (premier déclaré, "1a"/"2a") est la
  // patte BASSE à dy:58 — valeur exacte de l'ancienne projection
  // BUTTON_VISUAL_PINS (MB-VIS-BUTTON-INTERACTION-008), donc les fils legacy
  // sans contactId restent pixel-identiques. La patte haute ("1b"/"2b") est
  // à dy:2 (miroir, extrémité de la patte supérieure).
  BUTTON: [
    { id: "pin1", label: "1", dx: 14, dy: 30, contacts: [
      { id: "1a", dx: 14, dy: 58, wireConnectable: true, breadboardInsertable: true },
      { id: "1b", dx: 14, dy: 2, wireConnectable: true, breadboardInsertable: true },
    ] },
    { id: "pin2", label: "2", dx: 46, dy: 30, contacts: [
      { id: "2a", dx: 46, dy: 58, wireConnectable: true, breadboardInsertable: true },
      { id: "2b", dx: 46, dy: 2, wireConnectable: true, breadboardInsertable: true },
    ] },
  ],
  // [MB-VIS-BUTTON-ASSET-006] Même méthode, mesurée séparément sur
  // button-latching.off.3x.png : pattes gauche/droite à x≈37.9/140.7
  // (3x, soit ≈12.6/46.9 en 1x) — somme ≈178.6 (3x) / ≈59.5 (1x), légère
  // asymétrie réelle de l'asset rocker (pas une erreur de mesure — déjà
  // noté par la version précédente : "l'asset (rocker plus large) diffère
  // physiquement" de BUTTON, toujours vrai avec ce nouvel asset). dy
  // mesuré ≈90.7 (3x) / ≈30.2 (1x), identique à BUTTON. Valeurs arrondies
  // en conservant la somme symétrique 60 (13+47) la plus proche de la
  // mesure. Toujours exactement 2 pins logiques.
  // [FT-B-001-S2] Même modèle que BUTTON — 4 pattes / 2 pins électriques.
  // Mesuré séparément sur button-latching.off.3x.png : gauche x≈12.7 → 13,
  // droite x≈46.9 → 47 ; patte haute y≈4.7, patte basse y≈53.9. Contact par
  // défaut ("1a"/"2a") = patte basse à dy:58 = ancienne projection
  // BUTTON_LATCHING_VISUAL_PINS (legacy pixel-identique).
  BUTTON_LATCHING: [
    { id: "pin1", label: "1", dx: 13, dy: 30, contacts: [
      { id: "1a", dx: 13, dy: 58, wireConnectable: true, breadboardInsertable: true },
      { id: "1b", dx: 13, dy: 2, wireConnectable: true, breadboardInsertable: true },
    ] },
    { id: "pin2", label: "2", dx: 47, dy: 30, contacts: [
      { id: "2a", dx: 47, dy: 58, wireConnectable: true, breadboardInsertable: true },
      { id: "2b", dx: 47, dy: 2, wireConnectable: true, breadboardInsertable: true },
    ] },
  ],
  // [FT-B-001-S5] POWER n'est PAS un composant directement enfichable dans le
  // breadboard : c'est une alimentation de paillasse reliée aux rails PAR FIL.
  // `pin.dx/dy` (géométrie canonique / électrique héritée de MB-BREADBOARD-005)
  // reste inchangée ; les CONTACTS physiques déclarés portent les vraies
  // bornes raster (rouge/noire) et sont `breadboardInsertable: false`. Le
  // registre POWER_VISUAL_PINS (pinPresentationGeometry.js) est supprimé —
  // ces contacts sont l'unique source de présentation.
  POWER: [
    { id: "5V", label: "+5V", dx: 70, dy: 37, contacts: [
      { id: "5V", dx: 35, dy: 67, wireConnectable: true, breadboardInsertable: false },
    ] },
    { id: "GND", label: "GND", dx: 58, dy: 25, contacts: [
      { id: "GND", dx: 22, dy: 67, wireConnectable: true, breadboardInsertable: false },
    ] },
  ],
  CAPACITOR: [
    { id: "pinA", label: "A", dx: 0, dy: 20 },
    { id: "pinB", label: "B", dx: 70, dy: 20 },
  ],
  BUZZER: [
    { id: "plus", label: "+", dx: 10, dy: 50 },
    { id: "minus", label: "-", dx: 60, dy: 50 },
  ],
  POTENTIOMETER: [
    { id: "left", label: "L", dx: 10, dy: 50 },
    { id: "wiper", label: "W", dx: 45, dy: 50 },
    { id: "right", label: "R", dx: 80, dy: 50 },
  ],
  LDR: [
    { id: "A", label: "A", dx: 0, dy: 18 },
    { id: "B", label: "B", dx: 84, dy: 18 },
  ],
  THERMISTOR: [
    { id: "A", label: "A", dx: 0, dy: 18 },
    { id: "B", label: "B", dx: 84, dy: 18 },
  ],
  DIODE: [
    { id: "anode", label: "A", dx: 0, dy: 15 },
    { id: "cathode", label: "K", dx: 84, dy: 15 },
  ],
  RGB_LED: [
    // MB-VIS-COMP-033 correction physique : les 4 pattes sont rapprochées
    // sous le dôme, conformément à la LED RGB réelle de référence. Les
    // coordonnées canoniques précédentes 12/34/56/78 étaient trop écartées.
    { id: "R", label: "R", dx: 19, dy: 56 },
    { id: "common", label: "COM", dx: 35, dy: 56 },
    { id: "G", label: "G", dx: 53, dy: 56 },
    { id: "B", label: "B", dx: 71, dy: 56 },
  ],
  // [FT-B-001-S5] NPN_TRANSISTOR EST directement enfichable (TO-92, 3 pattes
  // traversantes). `pin.dx/dy` (géométrie canonique / électrique : coins du
  // boîtier) reste inchangée ; les CONTACTS physiques déclarés portent les 3
  // pattes métalliques réelles, mesurées par pixel-probe read-only validé CSA
  // (alpha=255 sur 1x ET 3x, pitch=12 / tolérance=±2, insertion simultanée sur
  // 3 trous consécutifs distincts). Mapping : base→B, collector→C, emitter→E ;
  // `pin.id` (base/collector/emitter) inchangé. Registre
  // NPN_TRANSISTOR_VISUAL_PINS (pinPresentationGeometry.js) supprimé.
  NPN_TRANSISTOR: [
    { id: "collector", label: "C", dx: 45, dy: 0, contacts: [{ id: "C", dx: 42.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
    { id: "base", label: "B", dx: 0, dy: 45, contacts: [{ id: "B", dx: 31.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
    { id: "emitter", label: "E", dx: 90, dy: 45, contacts: [{ id: "E", dx: 53.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }] },
  ],
  // [FT-B-001-S5] SERVO : micro-servo SG90 avec câble/connecteur externe, non
  // traversant. Câblable, mais PAS d'insertion breadboard directe : drapeau
  // pin-level `breadboardInsertable: false` (aucune géométrie de connecteur
  // parallèle créée — les coordonnées d'endpoint existantes sont conservées
  // via le contact implicite en pin.dx/dy).
  SERVO: [
    { id: "signal", label: "SIG", dx: 90, dy: 20, breadboardInsertable: false },
    { id: "vcc", label: "VCC", dx: 90, dy: 35, breadboardInsertable: false },
    { id: "gnd", label: "GND", dx: 90, dy: 50, breadboardInsertable: false },
  ],
  // [FT-B-001-S5] DC_MOTOR : cosses à souder, non traversant. Câblable, PAS
  // d'insertion breadboard directe : drapeau pin-level `breadboardInsertable:
  // false` ; contact implicite conservé en pin.dx/dy.
  DC_MOTOR: [
    { id: "plus", label: "+", dx: 0, dy: 25, breadboardInsertable: false },
    { id: "minus", label: "-", dx: 84, dy: 25, breadboardInsertable: false },
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
      // [FT-B-001-S5] Drapeaux pin-level `wireConnectable` / `breadboardInsertable`
      // propagés GÉNÉRIQUEMENT s'ils sont déclarés (booléen strict) — consommés
      // par utils/contactModel.js (héritage contact > pin > true, S4). Absents ⇒
      // le contact hérite de `true` (comportement inchangé pour les types qui
      // n'en déclarent pas). Aucun branchement par type.
      ...(typeof presentationPin.wireConnectable === "boolean" ? { wireConnectable: presentationPin.wireConnectable } : {}),
      ...(typeof presentationPin.breadboardInsertable === "boolean" ? { breadboardInsertable: presentationPin.breadboardInsertable } : {}),
      // [FT-B-001-S2] `contacts` optionnel (contacts physiques de présentation) —
      // recopié tel quel s'il est déclaré ; absent ⇒ contact implicite unique
      // synthétisé à la lecture par utils/contactModel.js.
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
  CAPACITOR: { id: "CAPACITOR", label: "Condensateur", icon: "║║", width: 70, height: 40, pins: buildPins("CAPACITOR") },
  BUZZER: { id: "BUZZER", label: "Buzzer", icon: "🔊", width: 70, height: 50, pins: buildPins("BUZZER") },
  POTENTIOMETER: { id: "POTENTIOMETER", label: "Potentiomètre", icon: "🎚", width: 90, height: 50, pins: buildPins("POTENTIOMETER") },
  LDR: { id: "LDR", label: "Photoresistance (LDR)", icon: "☀️", width: 84, height: 36, pins: buildPins("LDR") },
  THERMISTOR: { id: "THERMISTOR", label: "Thermistance", icon: "🌡", width: 84, height: 36, pins: buildPins("THERMISTOR") },
  DIODE: { id: "DIODE", label: "Diode", icon: "↦|", width: 84, height: 30, pins: buildPins("DIODE") },
  RGB_LED: { id: "RGB_LED", label: "LED RGB", icon: "🌈", width: 90, height: 56, pins: buildPins("RGB_LED") },
  NPN_TRANSISTOR: { id: "NPN_TRANSISTOR", label: "Transistor NPN", icon: "NPN", width: 90, height: 60, pins: buildPins("NPN_TRANSISTOR") },
  SERVO: { id: "SERVO", label: "Micro Servo", icon: "⚙️", width: 90, height: 70, pins: buildPins("SERVO") },
  DC_MOTOR: { id: "DC_MOTOR", label: "Moteur DC", icon: "🌀", width: 84, height: 50, pins: buildPins("DC_MOTOR") },
}

export const PALETTE_ITEMS = [COMPONENT_TYPES.LED, COMPONENT_TYPES.RESISTOR, COMPONENT_TYPES.ARDUINO, COMPONENT_TYPES.BUTTON, COMPONENT_TYPES.BUTTON_LATCHING, COMPONENT_TYPES.POWER, COMPONENT_TYPES.CAPACITOR, COMPONENT_TYPES.BUZZER, COMPONENT_TYPES.POTENTIOMETER, COMPONENT_TYPES.LDR, COMPONENT_TYPES.THERMISTOR, COMPONENT_TYPES.DIODE, COMPONENT_TYPES.RGB_LED, COMPONENT_TYPES.NPN_TRANSISTOR, COMPONENT_TYPES.SERVO, COMPONENT_TYPES.DC_MOTOR]

export function getComponentDef(type) { return COMPONENT_TYPES[type] ?? null }

export function createComponent(type, x, y) {
  const def = getComponentDef(type)
  if (!def) return null
  return { uid: createUid(), type: def.id, x, y, pins: def.pins.map((pin) => ({ ...pin })), ...(def.initialState !== undefined ? { state: def.initialState } : {}) }
}
