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
  // A8-NMOS: Infineon IRFZ44N TO-220AB marked front, 1=G/2=D/3=S.
  // Final R3 pixel-probe roots; fractional x is accepted by Number.isFinite.
  // CircuitComponent applies CSS inset(0 0 bottom px 0): 288 - 118 = y170.
  NMOS: {
    kind: "through-hole",
    leads: {
      gate: { root: { dx: 45, dy: 170 }, style: "metallic-wire" },
      drain: { root: { dx: 75.5, dy: 170 }, style: "metallic-wire" },
      source: { root: { dx: 107, dy: 170 }, style: "metallic-wire" },
    },
    bodyClip: { bottom: 118 },
  },
  // RELAY: deterministic alpha>=128 scan at y240, intervals
  // [53,68], [132,142], [179,189], [228,238]. Midpoints are measured
  // mechanical roots only. Electrical assignment is a functional routing
  // convention, never inferred from the front photo or decorative numbers.
  // NC is the fifth footprint connection, hidden in this projection: no
  // measured root is claimed. Generic root=target fallback draws no fifth lead.
  // No clipping: all frozen raster pixels survive; contacts lie below its bbox.
  RELAY: {
    kind: "through-hole",
    leads: {
      coilA: { root: { dx: 60.5, dy: 240 }, style: "metallic-wire" },
      coilB: { root: { dx: 137, dy: 240 }, style: "metallic-wire" },
      common: { root: { dx: 184, dy: 240 }, style: "metallic-wire" },
      normallyOpen: { root: { dx: 233, dy: 240 }, style: "metallic-wire" },
    },
  },
  PMOS: {
    kind: "through-hole",
    leads: {
      gate: { root: { dx: 40, dy: 171 }, style: "metallic-wire" },
      drain: { root: { dx: 71, dy: 171 }, style: "metallic-wire" },
      source: { root: { dx: 103, dy: 171 }, style: "metallic-wire" },
    },
    bodyClip: { bottom: 117 },
  },
  // A8-PNP R2 : PNG runtime 132x66, alpha>=128 : première séparation à y=25.
  // Intervalles [58,60]/[65,67]/[72,73] : roots C(59,25)/B(66,25)/E(72.5,25).
  // Contacts (54,62)/(66,62)/(78,62) au pas exact de 12 ; raster non déformé.
  // Clip à y=25 : les pattes cuites descendront sinon sous les contacts y=62.
  PNP_TRANSISTOR: {
    kind: "through-hole",
    leads: {
      collector: { root: { dx: 59, dy: 25 }, style: "metallic-wire" },
      base: { root: { dx: 66, dy: 25 }, style: "metallic-wire" },
      emitter: { root: { dx: 72.5, dy: 25 }, style: "metallic-wire" },
    },
    bodyClip: { bottom: 41 },
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
  // A7-C2-R1 — Flex Sensor (correctif CSA, Founder Canvas Gate FAIL sur le
  // physical fit breadboard). Racines mécaniques INCHANGÉES par rapport à
  // A7-C2 (pixel-probe réel du raster livré, méthode
  // frontend/scripts/lead-anchor-probe.md, seuil alpha>=200) :
  // A(33,162)/B(41,163) — le raster n'est ni retouché ni redessiné. Les
  // PhysicalContacts fonctionnels (componentDefinitions.js) sont désormais
  // A(30,180)/B(42,180), sous les racines mesurées : AssemblyLeadsLayer relie
  // chaque racine à son PhysicalContact via une patte fonctionnelle courte
  // (style metallic-wire, même rendu que CAPACITOR/DIODE/THERMISTOR).
  // `bodyClip.bottom = 18` (hauteur canonique 180 - 18 = clip à y=162, PILE
  // au niveau des racines mesurées) masque la queue de connexion cuite dans
  // le raster sous les racines, pour laisser AssemblyLeadsLayer dessiner
  // seule la portion terminale entre la racine et le PhysicalContact —
  // même stratégie déjà appliquée par BUZZER/POLARIZED_CAPACITOR/
  // POTENTIOMETER (racine mesurée ≠ PhysicalContact fonctionnel recalé,
  // pont assuré par bodyClip + AssemblyLeadsLayer).
  FLEX_SENSOR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 33, dy: 162 }, style: "metallic-wire" },
      B: { root: { dx: 41, dy: 163 }, style: "metallic-wire" },
    },
    bodyClip: { bottom: 18 },
  },
  // A7-C3 — Soil Moisture Sensor (YL-69 probe + YL-38 interface module).
  // Pixel-probe réel (alpha>=32, méthode frontend/scripts/lead-anchor-probe.md,
  // System.Drawing sur le paquet copié dans ce worktree) : bounding box
  // opaque globale (1x) x∈[30,114] y∈[2,140] — cohérent avec l'audit Founder
  // (§2 du ticket : opaqueBounds1x ≈ [29,2,114,141]). Racines VERROUILLÉES
  // par le ticket §12 : VCC(91,116)/AO(96,116)/DO(101,116)/GND(107,116) —
  // toutes les quatre mesurées OPAQUES (alpha 163-255) sur le raster réel.
  // Sous chaque racine, l'alpha chute à 0 entre y=126 et y=140 (vérifié par
  // sondage colonne par colonne) : le corps opaque du module s'arrête donc
  // NATURELLEMENT avant les PhysicalContacts (y=140), exactement comme
  // TMP36/VIBRATION_MOTOR — AUCUN bodyClip requis, décision d'audit déjà
  // verrouillée par le ticket (§12 : "le YL-69 probe descend jusqu'à
  // environ y=141" au global, mais la zone SOUS le header, aux colonnes des
  // 4 leads, est naturellement transparente jusqu'aux contacts).
  SOIL_MOISTURE_SENSOR: {
    kind: "through-hole",
    leads: {
      VCC: { root: { dx: 91, dy: 116 }, style: "metallic-wire" },
      AO: { root: { dx: 96, dy: 116 }, style: "metallic-wire" },
      DO: { root: { dx: 101, dy: 116 }, style: "metallic-wire" },
      GND: { root: { dx: 107, dy: 116 }, style: "metallic-wire" },
    },
  },
  // A7-C2-R2 — Force Sensor (FSR) (correctif CSA, Founder Canvas Gate FAIL
  // sur le physical fit breadboard). Racines mécaniques reconfirmées par
  // pixel-probe réel sur le raster Founder livré (méthode
  // frontend/scripts/lead-anchor-probe.md, seuil alpha>=200, région stable
  // y∈[107,115]) : A(36,111)/B(41,111) — INCHANGÉES par rapport à A7-C2, le
  // raster n'est ni retouché ni redessiné. Les PhysicalContacts fonctionnels
  // (componentDefinitions.js) sont désormais A(30,132)/B(42,132), sous les
  // racines mesurées : AssemblyLeadsLayer relie chaque racine à son
  // PhysicalContact via une patte fonctionnelle (style metallic-wire, même
  // rendu que FLEX_SENSOR/CAPACITOR/DIODE/THERMISTOR). `bodyClip.bottom = 33`
  // (hauteur canonique 144 - 33 = clip à y=111, PILE au niveau des racines
  // mesurées) masque la queue de connexion cuite dans le raster sous les
  // racines (le contenu opaque de la queue continue jusqu'à y=115, donc
  // AU-DELÀ de la racine y=111 — un bodyClip est donc requis ici, à la
  // différence de VIBRATION_MOTOR/TMP36 dont le raster s'arrête déjà avant
  // la racine), pour laisser AssemblyLeadsLayer dessiner seule la portion
  // terminale entre la racine et le PhysicalContact — même stratégie que
  // FLEX_SENSOR/BUZZER/POLARIZED_CAPACITOR/POTENTIOMETER.
  FORCE_SENSOR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 36, dy: 111 }, style: "metallic-wire" },
      B: { root: { dx: 41, dy: 111 }, style: "metallic-wire" },
    },
    bodyClip: { bottom: 33 },
  },
  // A7-C4-PIR — PIR Motion Sensor (HC-SR501-style module). Pixel-probe réel
  // (alpha>=32, méthode frontend/scripts/lead-anchor-probe.md, System.Drawing
  // sur le paquet copié dans ce worktree) : bounding box opaque globale (1x)
  // [11,4,109,92] — cohérent avec l'audit Founder (opaqueBounds1x [10,2,109,93]).
  // Les 3 pattes de l'en-tête (header 2.54mm, PAS 12 px) sont des segments
  // verticaux stables entre y=74 et y=88, centroïdes alpha-pondérés mesurés
  // sur toute la hauteur du segment (y∈[74,88]) : VCC (50.81,80.21) ->
  // (51,80) ; OUT (59.33,80.12) -> (59,80) ; GND (67.99,80.17) -> (68,80) —
  // toutes les trois pleinement opaques (alpha=255). Sous y=88, un vide total
  // (y=89) précède un halo diffus faible (alpha 51-90, y∈[90,92], quasi
  // certainement une ombre portée décorative, PAS une patte fonctionnelle :
  // aucun pixel opaque au-delà de y=92, RIEN à y=93/94/95). Les
  // PhysicalContacts fonctionnels (componentDefinitions.js) sont désormais
  // VCC(48,92)/OUT(60,92)/GND(72,92), sous les racines mesurées : AssemblyLeadsLayer
  // relie chaque racine à son PhysicalContact via une patte fonctionnelle
  // courte (style metallic-wire, même rendu que FORCE_SENSOR/SOIL_MOISTURE_SENSOR).
  // AUCUN bodyClip : le raster s'arrête naturellement à y=92, exactement au
  // niveau des PhysicalContacts (même situation que TMP36/VIBRATION_MOTOR,
  // §5 du ticket : "ne pas ajouter de bodyClip automatiquement").
  PIR_MOTION_SENSOR: {
    kind: "through-hole",
    leads: {
      VCC: { root: { dx: 51, dy: 80 }, style: "metallic-wire" },
      OUT: { root: { dx: 59, dy: 80 }, style: "metallic-wire" },
      GND: { root: { dx: 68, dy: 80 }, style: "metallic-wire" },
    },
  },
  // A7-C4-TILT-R1 — Tilt Sensor : correctif Canvas FAIL Founder (pattes
  // débordant visuellement sous le point d'insertion). Cause réelle
  // identifiée par audit (voir RAPPORT FINAL R1) : le profil A7-C4-TILT
  // original plaçait la racine (dy=110) SOUS le PhysicalContact (dy=108) —
  // sens INVERSÉ par rapport à toute autre patte du catalogue (racine
  // toujours au-dessus, near du corps ; PhysicalContact/target en dessous,
  // au niveau du trou) — et ne déclarait AUCUN bodyClip. Le raster cuit ses
  // deux pattes en continu jusqu'à leur pointe réelle y=117, largement
  // au-delà du PhysicalContact y=108 : sans clip, cette pointe cuite reste
  // seule visible (le segment AssemblyLeadsLayer root→target, peint SOUS le
  // corps, est entièrement recouvert par le raster opaque non clippé) et
  // dépasse le point d'insertion de 9 px — exactement le défaut Founder.
  //
  // Fix (aucun changement de PhysicalContacts, aucun raster retouché, même
  // stratégie EXACTE que FORCE_SENSOR A7-C2-R2 / FLEX_SENSOR A7-C2-R1) :
  // la racine est ramenée AU-DESSUS du PhysicalContact, au pixel réel où le
  // corps/PCB (rectangle plein largeur, mesuré solide jusqu'à y=100) cède la
  // place aux deux pattes cuites individualisées (transition mesurée à
  // y=101 : bounding box de chaque patte se resserre de [18,52] à
  // [29,41]/[37,43] sur cette ligne) : DO/GND racine (·,101), x inchangés
  // (31/39, mesurés réels, stables sur toute la longueur de la patte
  // y∈[102,116]). `bodyClip.bottom = 120 - 101 = 19` clippe tout sous
  // y=101 — masque la totalité de la patte cuite (y=102..117, y compris sa
  // pointe qui dépassait) tout en conservant le corps/PCB intact au-dessus.
  // AssemblyLeadsLayer dessine désormais le segment complet racine(101) →
  // PhysicalContact(108) dans la zone désormais transparente : la patte
  // fonctionnelle apparaît naître du corps et se terminer PILE au trou,
  // sans jamais dépasser.
  TILT_SENSOR: {
    kind: "through-hole",
    leads: {
      DO: { root: { dx: 31, dy: 101 }, style: "metallic-wire" },
      GND: { root: { dx: 39, dy: 101 }, style: "metallic-wire" },
    },
    bodyClip: { bottom: 19 },
  },
  // A7-C4-IR — IR Receiver (TSOP4838-style 38 kHz module). Pixel-probe réel
  // (System.Drawing, seuil alpha>0, méthode identique à TILT_SENSOR/PIR_MOTION_SENSOR —
  // méthodologie CORRIGÉE post A7-C4-TILT-R1 : root choisi AU-DESSUS du
  // PhysicalContact, jamais en dessous). Bounding box opaque globale (1x)
  // x∈[17,54] y∈[2,117] (corps/dôme texturé, cohérent avec l'audit Founder
  // opaqueBounds1x [17,2,54,117]). Le corps (dôme + texture de lentille) est
  // un bloc plein x∈[17,54] de y=2 à y=51 ; à y=52 le bloc se scinde pour la
  // PREMIÈRE fois en 3 groupes distincts (20-27/32-38/44-51 — flasque/pastille
  // de sortie des 3 pattes), qui se stabilisent en 3 pattes fines individuelles
  // (largeur ~3-5 px chacune) de y=58 à y=111, pleinement opaques (alpha=255)
  // jusqu'à y=112 inclus, puis s'estompent à y=113 (alpha≈78-81) et
  // disparaissent totalement à y=114 (alpha=0) — un halo diffus décoratif
  // (ombre portée, alpha partiel/asymétrique) réapparaît ensuite y=115-117,
  // confirmé NON fonctionnel (même diagnostic que PIR_MOTION_SENSOR). Racines
  // mesurées : centroïdes alpha-pondérés sur le segment stable y∈[58,111]
  // (recoupés sur le 3x, ×3 cohérent) : SIGNAL (23.68,82.83)->x≈24 ; GND
  // (35.07,82.65)->x≈35 ; VCC (47.03,82.89)->x≈47 — le y de racine est fixé à
  // la ligne de transition corps→pattes réellement mesurée (y=52, PREMIÈRE
  // ligne où le bloc plein se scinde), STRICTEMENT AU-DESSUS des
  // PhysicalContacts (y=108, componentDefinitions.js) : sens racine→trou
  // correct (leçon A7-C4-TILT-R1, jamais inversé). `bodyClip.bottom =
  // 120 - 52 = 68` masque toute la portion sous y=52 (flasque + 3 pattes
  // cuites + halo décoratif, soit toute la zone qui dépasserait sinon les
  // PhysicalContacts) tout en conservant le corps/dôme du TSOP4838 intact
  // au-dessus (§8 du ticket : "le corps ne doit PAS être tronqué").
  // AssemblyLeadsLayer dessine désormais le segment complet racine(52) →
  // PhysicalContact(108) dans la zone désormais transparente pour les 3
  // pattes : chacune apparaît naître du corps et se terminer PILE au trou,
  // sans jamais dépasser (§7 du ticket, gate anti-débordement).
  IR_RECEIVER: {
    kind: "through-hole",
    leads: {
      SIGNAL: { root: { dx: 24, dy: 52 }, style: "metallic-wire" },
      GND: { root: { dx: 35, dy: 52 }, style: "metallic-wire" },
      VCC: { root: { dx: 47, dy: 52 }, style: "metallic-wire" },
    },
    bodyClip: { bottom: 68 },
  },
  // A7-C5 — HC-SR04 (asset raster Founder PASS 144×96). Pixel-probe réel
  // (alpha>=32, System.Drawing, méthode identique à PIR_MOTION_SENSOR/
  // TILT_SENSOR/IR_RECEIVER) : les 4 pattes de l'en-tête se scindent pour la
  // première fois à y=68 (dernière ligne pleine du corps y=67), restent des
  // segments verticaux stables et pleinement opaques de y=68 à y=87 (bord
  // net, alpha=0 sans résidu de y=88 à y=95). Centroïdes alpha-pondérés sur
  // ce segment stable (y∈[68,87]), recoupés sur le 3x (÷3 cohérent à <0.4 px) :
  // VCC (60.077,77.232)->racine (60,77) ; TRIG (67.194,77.331)->(67,77) ;
  // ECHO (74.288,77.253)->(74,77) ; GND (81.402,77.187)->(81,77) — toutes les
  // quatre STRICTEMENT AU-DESSUS de leur PhysicalContact (dy=92,
  // componentDefinitions.js), sens racine→trou correct (leçon
  // A7-C4-TILT-R1, jamais inversé). AUCUN bodyClip : le raster s'arrête
  // naturellement à y=87, avant les PhysicalContacts (dy=92) — même
  // situation que PIR_MOTION_SENSOR/TMP36/VIBRATION_MOTOR (racine mesurée
  // dans la zone opaque du raster, patte fonctionnelle visible uniquement
  // dans la portion transparente sous y=87, jusqu'au trou). Style
  // metallic-wire, même rendu que les autres capteurs à en-tête (PIR_MOTION_
  // SENSOR/TILT_SENSOR/IR_RECEIVER/SOIL_MOISTURE_SENSOR).
  // A7-C5-R2 — correction Founder (post-A7-C5-R1 STOP S3) : `metallic-wire`
  // (dominée par son core clair #b9c0c6 + highlight blanc) rendait un aspect
  // nickelé/brillant trop clair pour ce module, et `wire` seul (#9aa1a9)
  // restait également trop clair — cf. primitive dédiée `dark-wire`
  // (AssemblyLeadsLayer.css). Racines/PhysicalContacts/pitch/bodyClip
  // STRICTEMENT INCHANGÉS — seul le style de présentation change.
  HC_SR04: {
    kind: "through-hole",
    leads: {
      VCC: { root: { dx: 60, dy: 77 }, style: "dark-wire" },
      TRIG: { root: { dx: 67, dy: 77 }, style: "dark-wire" },
      ECHO: { root: { dx: 74, dy: 77 }, style: "dark-wire" },
      GND: { root: { dx: 81, dy: 77 }, style: "dark-wire" },
    },
  },
  // A4-INDUCTOR — inductance axiale (asset raster Founder PASS 144×108).
  // Pixel-probe réel (alpha>=32, System.Drawing sur le paquet copié dans ce
  // worktree, méthodologie identique à HC_SR04/PIR_MOTION_SENSOR/TILT_SENSOR/
  // IR_RECEIVER — racine choisie AU-DESSUS/AU BORD du PhysicalContact,
  // jamais en dessous, leçon A7-C4-TILT-R1) : les deux capuchons métalliques
  // de l'inductance forment des colonnes stables (y∈[14,53]) dès x=5..10
  // (gauche) et x=133..137 (droite) ; le premier pixel substantiellement
  // opaque scanné depuis chaque bord canonique (x=0/144) tombe à x=4/x=139,
  // avec un bord bas mesuré à y=52 sur ces deux colonnes (alpha chute sous
  // le seuil dès y=53-54, bord net). Racines : A(4,52)/B(139,52) —
  // STRICTEMENT AU-DESSUS des PhysicalContacts fonctionnels (dy=92,
  // componentDefinitions.js). AUCUN bodyClip : le raster s'arrête
  // naturellement à y≈52-54 sur ces colonnes, avant les PhysicalContacts —
  // même situation que TMP36/VIBRATION_MOTOR/HC_SR04/PIR_MOTION_SENSOR.
  // Style metallic-wire (pattes nickelées brillantes, même rendu que
  // CAPACITOR/DIODE/THERMISTOR/FORCE_SENSOR/FLEX_SENSOR — cohérent avec le
  // fini métallique visible des capuchons du raster).
  INDUCTOR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 4, dy: 52 }, style: "metallic-wire" },
      B: { root: { dx: 139, dy: 52 }, style: "metallic-wire" },
    },
  },
  // A5-ZENER_DIODE — diode Zener axiale (asset raster Founder PASS/FROZEN
  // 144×72). Même situation que DIODE ci-dessus (pas INDUCTOR) : le raster
  // livré cuit ses pattes métalliques jusqu'aux bords du boîtier canonique
  // (pixel-probe réel confirme alpha opaque continu de x=0 à x=143 sur la
  // ligne médiane dy=35), donc ZenerDiodePart.jsx doit masquer ces pattes
  // cuites (fenêtre de découpe BODY_WINDOW, même patron que DiodePart.jsx)
  // et AssemblyLeadsLayer redessine les pattes fonctionnelles depuis les
  // racines mesurées jusqu'aux pins canoniques A(0,35)/K(144,35).
  //
  // Racines mesurées par balayage de saturation couleur (metal gris neutre
  // r≈g≈b vs corps rouge/orange translucide) sur deux lignes hors zone de
  // marquage imprimé (dy=25 et dy=45, évite le texte "BZX55"/"5V1" centré
  // sur dy=35) : transition nette gris→rouge à x=34 (gauche) et rouge→gris
  // à x=108 (droite), cohérent aux deux lignes. dy=35 = centre vertical de
  // la forme opaque globale ((7+63)/2, bornes opaques manifest.json
  // opaqueBounds1x [0,7,143,63]).
  ZENER_DIODE: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 34, dy: 35 }, style: "metallic-wire" },
      K: { root: { dx: 108, dy: 35 }, style: "metallic-wire" },
    },
  },
}

export function getAssemblyProfile(type) {
  return ASSEMBLY_PROFILES[type] ?? null
}
