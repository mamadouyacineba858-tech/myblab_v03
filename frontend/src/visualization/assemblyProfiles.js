/**
 * assemblyProfiles.js — FT-C-001-A.
 *
 * Profil MÉCANIQUE de PRÉSENTATION d'un composant traversant : où les pattes /
 * cosses NAISSENT visuellement sous le corps (« racine »), et de quel style
 * elles sont dessinées. C'est de la présentation d'assemblage PURE.
 */

/** @typedef {{ dx: number, dy: number }} LocalPoint */
/**
 * @typedef {Object} AssemblyProfile
 * @property {'through-hole'} kind
 * @property {Record<string, { root: LocalPoint, style?: 'wire'|'metallic-wire'|'lug' }>} leads
 * @property {{ bottom: number }} [bodyClip]
 */

/** @type {Record<string, AssemblyProfile>} */
const ASSEMBLY_PROFILES = {
  LED: {
    kind: "through-hole",
    leads: {
      anode: { root: { dx: 28, dy: 32 }, style: "wire" },
      cathode: { root: { dx: 52, dy: 32 }, style: "wire" },
    },
    bodyClip: { bottom: 31 },
  },
  LDR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 30, dy: 29 }, style: "wire" },
      B: { root: { dx: 54, dy: 29 }, style: "wire" },
    },
  },
  // MB-L1-PROP-006 — meme silhouette radiale que CAPACITOR V2, decalee de
  // +7px en X et +4px en Y dans la boite THERMISTOR 84x36 : les pieds du
  // corps tombent donc exactement sur x=30/54, y=31. Les PhysicalContacts
  // restent A/B (30,62)/(54,62). Le style metallic-wire reutilise le rendu
  // de pattes brillantes valide au Canvas pour CAPACITOR.
  THERMISTOR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 30, dy: 31 }, style: "metallic-wire" },
      B: { root: { dx: 54, dy: 31 }, style: "metallic-wire" },
    },
  },
  // MB-L1-PROP-007-R1 — diode axiale : le raster conserve uniquement le
  // cylindre central et sa bande cathode (DiodePart.jsx). Le premier Canvas
  // Gate a montré que 24/60 s'arrêtaient dans les marges transparentes du
  // raster, donc avant le cylindre visible. Les racines sont recalées sur les
  // bords opaques du corps x=31/x=51 ; les endpoints électriques restent
  // strictement anode(0,15)/cathode(84,15).
  DIODE: {
    kind: "through-hole",
    leads: {
      anode: { root: { dx: 31, dy: 15 }, style: "metallic-wire" },
      cathode: { root: { dx: 51, dy: 15 }, style: "metallic-wire" },
    },
  },
  // MB-L1-PROP-005-R1 — la logique de marquage reste inchangée ; seul le
  // rendu physique est corrigé après Canvas FAIL. Les racines mécaniques et
  // les PhysicalContacts restent strictement identiques. Le style dédié
  // `metallic-wire` rend les deux pattes nickelées plus brillantes, comme les
  // leads du RESISTOR de référence, sans modifier les autres traversants.
  CAPACITOR: {
    kind: "through-hole",
    leads: {
      pinA: { root: { dx: 23, dy: 27 }, style: "metallic-wire" },
      pinB: { root: { dx: 47, dy: 27 }, style: "metallic-wire" },
    },
  },
  // FT-C-COMP-002 — condensateur électrolytique radial polarisé. Le raster montre
  // déjà de longues pattes cuites : `bodyClip.bottom = 68` masque tout ce qui
  // est sous y=52. AssemblyLeadsLayer dessine ensuite les pattes fonctionnelles
  // depuis y=48 jusqu'aux PhysicalContacts y=80, soit ~32 px — longueur
  // harmonisée avec LED/LDR/THERMISTOR (~30–33 px). Racines alignées en x sur
  // les contacts `plus` (28) / `minus` (4, côté bande négative).
  POLARIZED_CAPACITOR: {
    kind: "through-hole",
    leads: {
      plus: { root: { dx: 28, dy: 48 }, style: "wire" },
      minus: { root: { dx: 4, dy: 48 }, style: "wire" },
    },
    bodyClip: { bottom: 68 },
  },
  // FT-C-COMP-004 — buzzer piézo traversant (asset 120×120). Les deux pattes
  // métalliques sont cuites dans le raster (x≈42 / 77, y≈79..114), suivies
  // d'une ombre de contact pâle et large. `bodyClip.bottom = 42` masque tout ce
  // qui est sous y=78 (les pattes cuites + l'ombre parasite) tout en CONSERVANT
  // l'intégralité du corps cylindrique noir, le trou acoustique et le symbole
  // « + ». AssemblyLeadsLayer dessine ensuite les deux pattes fonctionnelles
  // fines et droites (style `wire`) depuis la racine (dx 42 / 78, dy 76,
  // alignée sur les pieds visibles) jusqu'aux PhysicalContacts (dy 108).
  BUZZER: {
    kind: "through-hole",
    leads: {
      plus: { root: { dx: 42, dy: 76 }, style: "wire" },
      minus: { root: { dx: 78, dy: 76 }, style: "wire" },
    },
    bodyClip: { bottom: 42 },
  },
  RGB_LED: {
    kind: "through-hole",
    leads: {
      R: { root: { dx: 32, dy: 29 }, style: "wire" },
      common: { root: { dx: 41, dy: 29 }, style: "wire" },
      G: { root: { dx: 49, dy: 29 }, style: "wire" },
      B: { root: { dx: 58, dy: 29 }, style: "wire" },
    },
    bodyClip: { bottom: 26 },
  },
  NPN_TRANSISTOR: {
    kind: "through-hole",
    leads: {
      base: { root: { dx: 31.5, dy: 23 }, style: "wire" },
      collector: { root: { dx: 42.5, dy: 23 }, style: "wire" },
      emitter: { root: { dx: 53.5, dy: 23 }, style: "wire" },
    },
    bodyClip: { bottom: 35 },
  },
  // FT-C-COMP-003 — potentiomètre rotatif (asset 120×120). Les 3 cosses sont
  // cuites dans le raster. Le clip s'arrête maintenant à y=100
  // (`bodyClip.bottom = 20`) afin de CONSERVER toute l'embase bleue visible
  // au-dessus des trois pattes. L'ancien clip à y=88 supprimait justement la
  // partie basse bleue de l'asset et donnait l'impression que les cosses
  // fonctionnelles naissaient directement sous le corps métallique.
  // AssemblyLeadsLayer garde les racines à dx 42 / 60 / 78, dy 86 : cette
  // portion est peinte derrière le raster puis n'émerge qu'après l'embase,
  // vers y=100, jusqu'aux PhysicalContacts.
  POTENTIOMETER: {
    kind: "through-hole",
    leads: {
      left: { root: { dx: 42, dy: 86 }, style: "lug" },
      wiper: { root: { dx: 60, dy: 86 }, style: "lug" },
      right: { root: { dx: 78, dy: 86 }, style: "lug" },
    },
    bodyClip: { bottom: 20 },
  },
  // A3-SW3 — interrupteur à glissière SPDT (asset 72×48, prise de vue
  // orthographique — pas de perspective, cf. rapport final §F). Le raster
  // cuit 3 pattes métalliques pleine longueur (housing visible jusqu'à
  // y≈30, pattes de y≈31 à y≈41) qui NE terminaient jamais sur un trou de
  // breadboard réel (position figée dans la photo, indépendante de
  // channelStates/de la position d'insertion). `bodyClip.bottom = 17` masque
  // ces 3 pattes cuites (garde le boîtier visible jusqu'à y=30) ;
  // AssemblyLeadsLayer dessine ensuite 3 pattes fonctionnelles fines
  // (style metallic-wire, même rendu que CAPACITOR/DIODE/THERMISTOR) depuis
  // la racine (dy=29, juste sous le boîtier visible) jusqu'aux
  // PhysicalContacts throwA(12,44)/common(36,44)/throwB(60,44) INCHANGÉS —
  // qui, une fois enfiché, coïncident exactement avec le trou résolu
  // (résolveComponentContactHoles), donnant l'apparence réelle d'une patte
  // entrant dans le breadboard (§9 du ticket).
  SLIDE_SWITCH: {
    kind: "through-hole",
    leads: {
      throwA: { root: { dx: 12, dy: 29 }, style: "metallic-wire" },
      common: { root: { dx: 36, dy: 29 }, style: "metallic-wire" },
      throwB: { root: { dx: 60, dy: 29 }, style: "metallic-wire" },
    },
    bodyClip: { bottom: 17 },
  },
  // A6-OUT1-R1 — moteur à vibration coin-type ERM (asset 72×96). Pixel-probe
  // réel (alpha>=32, DevTools console via frontend/scripts/lead-anchor-probe.md,
  // rejoué sur le paquet copié) : bounding box opaque globale x∈[4,68] y∈[12,83]
  // (disque + pattes courtes, silhouette UNIQUE, jamais séparée en deux pattes
  // fines distinctes — cohérent avec un moteur coin-type dont les deux cosses
  // sont quasiment affleurantes sous le corps). Colonne x=24 (plus) opaque en
  // continu jusqu'à y=83 ; colonne x=48 (minus) opaque en continu jusqu'à
  // y=80 ; alpha strictement 0 dès y=84 dans les deux colonnes (bord net, sans
  // anti-aliasing résiduel). Racines = dernier pixel opaque mesuré de chaque
  // colonne, PAS une valeur inventée : plus (24,83) -> patte fonctionnelle de
  // 1 px jusqu'au contact (24,84) ; minus (48,80) -> patte fonctionnelle de
  // 4 px jusqu'au contact (48,84). AUCUN bodyClip : le contenu opaque du
  // raster s'arrête naturellement AVANT les PhysicalContacts (y=83/80 < 84
  // dans les deux colonnes) — rien à masquer, contrairement à BUZZER /
  // POLARIZED_CAPACITOR / POTENTIOMETER / SLIDE_SWITCH dont les pattes cuites
  // dépassent leurs PhysicalContacts fonctionnels.
  VIBRATION_MOTOR: {
    kind: "through-hole",
    leads: {
      plus: { root: { dx: 24, dy: 83 }, style: "wire" },
      minus: { root: { dx: 48, dy: 80 }, style: "wire" },
    },
  },
  // A6-OUT2 — Light Bulb (asset 72×96, culot doré + deux pattes noires).
  // Pixel-probe réel (alpha>=32, méthode frontend/scripts/lead-anchor-probe.md,
  // rejouée sur le paquet copié dans le worktree) : bounding box opaque
  // globale x∈[4,67] y∈[2,93] (globe verre + culot + amorce de pattes,
  // silhouette UNIQUE jusqu'à y=91 — le culot ne se scinde en deux pattes
  // distinctes qu'aux 2 dernières lignes, y=92-93, x∈[29,35]/[39,44]).
  // Aux colonnes des PhysicalContacts, alpha(24,84)=3 et alpha(48,84)=0
  // (sous le seuil, donc transparent) : recherche du pixel opaque le plus
  // proche par expansion en anneaux (méthode documentée, ring-search)
  // depuis chaque contact -> A trouve (26,82) à distance de Chebyshev 2,
  // B trouve (47,83) à distance 1. Racines = ces pixels mesurés (PAS une
  // valeur inventée), légèrement DIAGONALES par rapport aux contacts —
  // précédent déjà établi par DIODE (racines x=31/51 vs contacts x=0/84).
  // Le corps opaque continue jusqu'à y=93, DONC dépasse les PhysicalContacts
  // (y=84) de 9 px : `bodyClip.bottom = 12` (clip à y=96-12=84, exactement
  // au niveau des contacts) masque cette portion — même logique que BUZZER /
  // POLARIZED_CAPACITOR / POTENTIOMETER / SLIDE_SWITCH (pattes cuites qui
  // dépassaient leurs PhysicalContacts fonctionnels), à la différence de
  // VIBRATION_MOTOR (raster qui s'arrêtait déjà avant ses contacts).
  LIGHT_BULB: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 26, dy: 82 }, style: "wire" },
      B: { root: { dx: 47, dy: 83 }, style: "wire" },
    },
    bodyClip: { bottom: 12 },
  },
  // A7-C1 — TMP36 (asset raster 60×72 Founder-approved R3). Pixel-probe réel
  // (alpha>=32, méthode frontend/scripts/lead-anchor-probe.md, System.Drawing
  // sur le paquet copié dans ce worktree) : bounding box opaque globale (1x)
  // x∈[21,43] y∈[6,67] — AUCUN pixel opaque à/sous y=68, donc strictement
  // AVANT les PhysicalContacts (y=68, cf. componentDefinitions.js) : aucun
  // bodyClip requis (même situation que VIBRATION_MOTOR). Les 3 colonnes
  // exactes des PhysicalContacts (x=18/30/42, y=68) sont transparentes
  // (alpha=0) : racines mesurées par ring-search (même algorithme documenté
  // que LIGHT_BULB) depuis chaque contact -> plus (25,61) à distance de
  // Chebyshev 7 ; vout (31,67) à distance 1 ; gnd (40,66) à distance 2.
  // Racines mesurées sur le raster réel, PAS inventées pour coller au
  // Blueprint (§7 du ticket A7-C1).
  TMP36: {
    kind: "through-hole",
    leads: {
      plus: { root: { dx: 25, dy: 61 }, style: "wire" },
      vout: { root: { dx: 31, dy: 67 }, style: "wire" },
      gnd: { root: { dx: 40, dy: 66 }, style: "wire" },
    },
  },
}

export function getAssemblyProfile(type) {
  return ASSEMBLY_PROFILES[type] ?? null
}
