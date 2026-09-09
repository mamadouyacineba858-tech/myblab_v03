/**
 * assemblyProfiles.js — FT-C-001-A.
 *
 * Profil MÉCANIQUE de PRÉSENTATION d'un composant traversant : où les pattes /
 * cosses NAISSENT visuellement sous le corps (« racine »), et de quel style
 * elles sont dessinées. C'est de la présentation d'assemblage PURE.
 *
 * INVARIANTS (ruling FT-C-001-R1 §10) :
 *  - une `root` n'est JAMAIS un PhysicalContact, jamais un nœud électrique,
 *    jamais un net, jamais stockée dans le Document ;
 *  - `root.dx` / `root.dy` sont dans le repère LOCAL du composant, même origine
 *    que `pin.dx/dy` (`componentDefinitions.js`) — mais ne participent à AUCUN
 *    calcul électrique / de simulation / de résolution de trou ;
 *  - aucun `*_VISUAL_PINS`, aucune coordonnée de contact ici : l'extrémité
 *    d'une patte reste résolue par le modèle PhysicalContact
 *    (`utils/contactModel.js`) — ce module ne fournit que le POINT DE DÉPART
 *    mécanique et un `bodyClip` optionnel ;
 *  - aucune branche `type === …` chez les consommateurs : ils lisent
 *    `getAssemblyProfile(type)` (peut renvoyer `null`).
 *
 * `bodyClip.bottom` : hauteur (en unités canoniques, depuis le bas de la boîte
 * `componentDefinitions.js`) de la portion RASTER à masquer — les anciennes
 * longueurs de pattes cuites dans l'asset (stratégie de clipping §13). Le corps
 * et la naissance des pattes restent visibles ; l'extension métallique est
 * redessinée par `AssemblyLeadsLayer`, ce qui évite la double patte.
 *
 * Racines mesurées par pixel-probe read-only (alpha ≥ 64, 1x + 3x concordants,
 * dev server) — cf. rapport FT-C-001 §3 :
 *  - LED  (80×64) : dôme jusqu'à y ≈ 37-38, pattes raster centrées x ≈ 33 / 46 ;
 *  - NPN  (90×60) : boîtier TO-92 jusqu'à y ≈ 24-25 ;
 *  - POT  (90×50) : corps jusqu'à y ≈ 40, 3 cosses discrètes x ≈ 10 / 45 / 80.
 *
 * Les `root.dx` sont alignés sur les PhysicalContacts FT-B correspondants (la
 * patte descend verticalement du corps vers son contact / son trou), les
 * PhysicalContacts eux-mêmes n'étant PAS modifiés par ce ticket
 * (LED anode(28,62)/cathode(52,62) ; NPN B/C/E S5 ; POT left/wiper/right).
 */

/** @typedef {{ dx: number, dy: number }} LocalPoint */
/**
 * @typedef {Object} AssemblyProfile
 * @property {'through-hole'} kind
 * @property {Record<string, { root: LocalPoint, style?: 'wire'|'lug' }>} leads
 *   clé = `pin.id` (résolution générique par pin ; un profil ne cible jamais un
 *   `contact.id`).
 * @property {{ bottom: number }} [bodyClip]
 */

/** @type {Record<string, AssemblyProfile>} */
const ASSEMBLY_PROFILES = {
  // La racine dynamique reste à y=36. Le clip commence désormais exactement
  // à cette ligne : cela masque les derniers pixels des anciennes pattes
  // raster encore visibles sous la collerette, sans toucher aux PhysicalContacts
  // ni à l'écart anode/cathode validé pour le breadboard.
  LED: {
    kind: "through-hole",
    leads: {
      anode: { root: { dx: 28, dy: 36 }, style: "wire" },
      cathode: { root: { dx: 52, dy: 36 }, style: "wire" },
    },
    bodyClip: { bottom: 28 }, // asset 80×64 : masque y ∈ [36, 64] (résidus + anciennes pattes raster)
  },
  NPN_TRANSISTOR: {
    kind: "through-hole",
    leads: {
      base: { root: { dx: 31.5, dy: 23 }, style: "wire" },
      collector: { root: { dx: 42.5, dy: 23 }, style: "wire" },
      emitter: { root: { dx: 53.5, dy: 23 }, style: "wire" },
    },
    bodyClip: { bottom: 35 }, // asset 90×60 : masque y ∈ [25, 60] (pattes raster)
  },
  POTENTIOMETER: {
    kind: "through-hole",
    leads: {
      left: { root: { dx: 10, dy: 38 }, style: "lug" },
      wiper: { root: { dx: 45, dy: 38 }, style: "lug" },
      right: { root: { dx: 80, dy: 38 }, style: "lug" },
    },
    bodyClip: { bottom: 10 }, // asset 90×50 : masque y ∈ [40, 50] (cosses raster)
  },
}

/**
 * Profil mécanique d'assemblage d'un type, ou `null` si le type n'en déclare
 * pas (tout composant non traversant : RESISTOR, POWER, ARDUINO, BUZZER, …).
 * @param {string} type
 * @returns {AssemblyProfile | null}
 */
export function getAssemblyProfile(type) {
  return ASSEMBLY_PROFILES[type] ?? null
}
