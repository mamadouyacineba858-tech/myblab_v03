const DECLARED_TYPES_PINS = {
  BATTERY_AA:[{id:'plus',role:'power_out'},{id:'minus',role:'ground_out'}],
  COIN_CELL_CR2032:[{id:'plus',role:'power_out'},{id:'minus',role:'ground_out'}],
  BATTERY_9V:[{id:'plus',role:'power_out'},{id:'minus',role:'ground_out'}],
  LED:[{id:'anode',role:'input'},{id:'cathode',role:'input'}],
  RESISTOR:[{id:'A',role:'passive'},{id:'B',role:'passive'}],
  ARDUINO:[{id:'D2',role:'gpio'},{id:'D3',role:'gpio'},{id:'GND',role:'ground'},{id:'5V',role:'power'}],
  BUTTON:[{id:'pin1',role:'switch'},{id:'pin2',role:'switch'}],
  BUTTON_LATCHING:[{id:'pin1',role:'switch'},{id:'pin2',role:'switch'}],
  POWER:[{id:'5V',role:'power_out'},{id:'GND',role:'ground_out'}],
  CAPACITOR:[{id:'pinA',role:'passive'},{id:'pinB',role:'passive'}],
  POLARIZED_CAPACITOR:[{id:'plus',role:'passive'},{id:'minus',role:'passive'}],
  BUZZER:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
  POTENTIOMETER:[{id:'left',role:'passive'},{id:'wiper',role:'output'},{id:'right',role:'passive'}],
  LDR:[{id:'A',role:'sensor'},{id:'B',role:'sensor'}],
  THERMISTOR:[{id:'A',role:'sensor'},{id:'B',role:'sensor'}],
  DIODE:[{id:'anode',role:'input'},{id:'cathode',role:'output'}],
  RGB_LED:[{id:'R',role:'input'},{id:'common',role:'ground'},{id:'G',role:'input'},{id:'B',role:'input'}],
  NPN_TRANSISTOR:[{id:'collector',role:'input'},{id:'base',role:'input'},{id:'emitter',role:'output'}],
  SERVO:[{id:'signal',role:'gpio'},{id:'vcc',role:'power'},{id:'gnd',role:'ground'}],
  DC_MOTOR:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
  // A3-SW1 — Slide Switch (SPDT) : 3 pins, une seule connexion interne active
  // à la fois selon la position (cf. DECLARED_INTERNAL_CONNECTIONS ci-dessous).
  SLIDE_SWITCH:[{id:'throwA',role:'switch'},{id:'common',role:'switch'},{id:'throwB',role:'switch'}],
  // A3-SW2 — DIP Switch 4 positions : 4 canaux SPST indépendants, 8 pins
  // électriques (2 par canal). Aucune connexion croisée entre canaux (cf.
  // DECLARED_INTERNAL_CONNECTIONS.channels ci-dessous).
  DIP_SWITCH:[
    {id:'1A',role:'switch'},{id:'1B',role:'switch'},
    {id:'2A',role:'switch'},{id:'2B',role:'switch'},
    {id:'3A',role:'switch'},{id:'3B',role:'switch'},
    {id:'4A',role:'switch'},{id:'4B',role:'switch'},
  ],
  // A6-OUT1 — Vibration Motor : réutilisation DE LA FAMILLE DC_MOTOR (mêmes
  // rôles de broches plus/minus, cf. roadmap A6 "aucune duplication du
  // moteur DC"). Contrat électrique volontairement identique à DC_MOTOR ;
  // seule la présentation (componentDefinitions.js + renderer) diffère.
  VIBRATION_MOTOR:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
  // A6-OUT2 — Light Bulb : charge résistive DC simple à deux bornes,
  // NON polarisée (à la différence de DC_MOTOR/VIBRATION_MOTOR, qui gardent
  // plus/minus par convention historique). Rôles/IDs 'A'/'B', réutilisation
  // STRICTE de la convention déjà établie par RESISTOR/LDR/THERMISTOR pour
  // les composants résistifs non polarisés — aucune nouvelle convention de
  // nommage introduite. Aucun modèle thermique/filament : hors périmètre.
  LIGHT_BULB:[{id:'A',role:'passive'},{id:'B',role:'passive'}],
  // A6-OUT3 — Hobby Gearmotor : réutilisation DE LA FAMILLE DC_MOTOR (mêmes
  // rôles de broches plus/minus que DC_MOTOR/VIBRATION_MOTOR) — composant
  // POLARISÉ, à la différence de LIGHT_BULB. Contrat électrique
  // volontairement identique à DC_MOTOR ; seule la présentation
  // (componentDefinitions.js + renderer) diffère. Câblage UNIQUEMENT
  // (wireConnectable:true / breadboardInsertable:false sur les deux
  // broches, cf. componentDefinitions.js) — jamais enfichable breadboard.
  HOBBY_GEARMOTOR:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
}

const DECLARED_TYPE_ORDER = ['LED','RESISTOR','ARDUINO','BUTTON','BUTTON_LATCHING','POWER','BATTERY_AA','COIN_CELL_CR2032','BATTERY_9V','CAPACITOR','BUZZER','POTENTIOMETER','LDR','THERMISTOR','DIODE','RGB_LED','NPN_TRANSISTOR','SERVO','DC_MOTOR','POLARIZED_CAPACITOR','SLIDE_SWITCH','DIP_SWITCH','VIBRATION_MOTOR','LIGHT_BULB','HOBBY_GEARMOTOR']

const DECLARED_PARAMETER_SCHEMA = {
  BATTERY_AA:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:1.5,maximum:1.5,defaultValue:1.5,description:'Tension nominale fixe de la pile'}],
  COIN_CELL_CR2032:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:3,maximum:3,defaultValue:3,description:'Tension nominale fixe de la pile'}],
  BATTERY_9V:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:9,maximum:9,defaultValue:9,description:'Tension nominale fixe de la pile'}],
  POWER:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:0.001,maximum:1000,defaultValue:5,description:'Tension de sortie de la source en Volts'}],
  RESISTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e9,defaultValue:220,description:'Valeur de la résistance en Ohms'}],
  LDR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:100,maximum:10000000,defaultValue:10000,description:'Résistance fixe par défaut (fallback historique) tant qu\'aucun stimulus environnemental LIGHT actif n\'est fourni. Sous LIGHT actif (MB-L1-ENV-001), la résistance EFFECTIVE de cette LDR est calculée par le Registry environnemental dédié entre ces mêmes bornes minimum/maximum, sans jamais modifier ce paramètre persistant.'}],
  THERMISTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:100,maximum:1000000,defaultValue:10000,description:'Résistance fixe (mode simplifié MB-SIM-008, type NTC) : cette thermistance est modélisée par une résistance constante et ne dépend pas de la température — la relation température → résistance est hors périmètre de MB-SIM-008.'}],
  DIODE:[
    {key:'forwardVoltage',parameterType:'voltage',unit:'V',minimum:0,maximum:5,defaultValue:0.7,description:'Tension de seuil de conduction directe (modèle DC simplifié, MB-SIM-008 v2) : diode idéale à seuil, sans modèle non linéaire complet ni dynamique de commutation.'},
    {key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e9,defaultValue:10,description:'Résistance équivalente en conduction directe au-delà du seuil (modèle DC simplifié, MB-SIM-008 v2).'},
  ],
  DC_MOTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente du bobinage (modèle électrique DC simplifié, MB-SIM-008 v2) : vitesse, couple, inertie et force contre-électromotrice dynamique sont hors périmètre.'}],
  // A6-OUT1 : même schéma/valeur par défaut que DC_MOTOR — aucune fiche
  // technique réelle de moteur vibreur ne justifie une valeur différente à
  // ce stade. Documenté explicitement comme une équivalence électrique
  // simplifiée (pas une caractéristique moteur mesurée), au même titre que
  // DC_MOTOR : vitesse, couple, inertie et force contre-électromotrice
  // dynamique restent hors périmètre.
  VIBRATION_MOTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente simplifiée (modèle électrique DC simplifié, A6-OUT1, réutilise la convention DC_MOTOR de MB-SIM-008 v2) : vitesse, couple, inertie et force contre-électromotrice dynamique sont hors périmètre.'}],
  // A6-OUT2 : ampoule = charge résistive DC simple (loi d'Ohm), NON polarisée.
  // Même bornes min/max que DC_MOTOR/VIBRATION_MOTOR (ordre de grandeur d'un
  // filament/charge basse résistance) ; valeur par défaut 20 Ω documentée
  // comme une équivalence électrique simplifiée (pas une fiche technique
  // d'ampoule réelle) — aucun modèle thermique de filament, aucun
  // vieillissement, aucun claquage : hors périmètre de ce ticket.
  LIGHT_BULB:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente simplifiée du filament (modèle électrique DC simplifié, A6-OUT2) : aucun modèle thermique, aucune non-linéarité tungstène, aucun vieillissement/claquage — hors périmètre à ce niveau de simulation.'}],
  // A6-OUT3 : même schéma/valeur par défaut que DC_MOTOR/VIBRATION_MOTOR —
  // aucune fiche technique réelle du gearmotor ne justifie une valeur
  // différente à ce stade (équivalence électrique simplifiée, pas une
  // caractéristique moteur/réducteur mesurée). Aucun modèle mécanique du
  // réducteur (couple, inertie, rapport de réduction) : hors périmètre.
  HOBBY_GEARMOTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente simplifiée (modèle électrique DC simplifié, A6-OUT3, réutilise la convention DC_MOTOR de MB-SIM-008 v2) : vitesse, couple, inertie, rapport de réduction du réducteur et force contre-électromotrice dynamique sont hors périmètre.'}],
  CAPACITOR:[{key:'capacitance',parameterType:'capacitance',unit:'F',minimum:1e-12,maximum:1,defaultValue:1e-7,description:'Capacité (modèle DC établi, MB-SIM-008 v2) : le condensateur est traité comme un circuit ouvert en régime permanent (I=0) ; cette valeur n\'intervient pas dans l\'analyse DC et n\'est significative que pour un futur modèle Transitoire, hors périmètre de MB-SIM-008. Défaut 1e-7 F (100 nF, MB-L1-PROP-005) : cohérent avec le boîtier céramique radial Candidate C et son marquage EIA "104" dérivé dynamiquement — l\'ancien défaut 1e-4 F (100 µF) ne correspondait à aucune identité visuelle réaliste.'}],
  POLARIZED_CAPACITOR:[{key:'capacitance',parameterType:'capacitance',unit:'F',minimum:1e-12,maximum:1,defaultValue:0.0001,description:'Capacité (modèle DC établi, FT-C-COMP-002) : le condensateur électrolytique polarisé est traité, comme CAPACITOR, comme un circuit ouvert en régime permanent (I=0) quelle que soit la polarité ; cette valeur n\'intervient pas dans l\'analyse DC et n\'est significative que pour un futur modèle Transitoire, hors périmètre. La tension nominale 25 V est une caractéristique de l\'asset, pas un paramètre simulé.'}],
  POTENTIOMETER:[
    {key:'resistance',parameterType:'resistance',unit:'Ω',minimum:1,maximum:1e7,defaultValue:10000,description:'Résistance totale de la piste résistive, extrémité LEFT à extrémité RIGHT (modèle DC simplifié, MB-SIM-008 v2).'},
    {key:'position',parameterType:'ratio',unit:'',minimum:0,maximum:1,defaultValue:0.5,description:'Position du curseur (0 = extrémité LEFT, 1 = extrémité RIGHT) : détermine les deux résistances équivalentes LEFT↔WIPER et WIPER↔RIGHT (modèle DC simplifié, MB-SIM-008 v2).'},
  ],
  NPN_TRANSISTOR:[{key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:1,description:'Résistance équivalente collecteur-émetteur à l\'état passant (modèle logique simplifié, MB-SIM-008 v2) : commande tout-ou-rien par BASE, sans β réel, sans courbes Ic/Vce, sans dynamique.'}],
}

const DECLARED_DEFAULT_PARAMETERS = {
  BATTERY_AA:{voltage:1.5},
  COIN_CELL_CR2032:{voltage:3},
  BATTERY_9V:{voltage:9},
  POWER:{voltage:5},
  RESISTOR:{resistance:220},
  LDR:{resistance:10000},
  THERMISTOR:{resistance:10000},
  DIODE:{forwardVoltage:0.7,onResistance:10},
  DC_MOTOR:{resistance:20},
  VIBRATION_MOTOR:{resistance:20},
  LIGHT_BULB:{resistance:20},
  HOBBY_GEARMOTOR:{resistance:20},
  CAPACITOR:{capacitance:1e-7},
  POLARIZED_CAPACITOR:{capacitance:0.0001},
  POTENTIOMETER:{resistance:10000,position:0.5},
  NPN_TRANSISTOR:{onResistance:1},
}

const DECLARED_CAPABILITIES = {
  BATTERY_AA:['digital','dc'],
  COIN_CELL_CR2032:['digital','dc'],
  BATTERY_9V:['digital','dc'],
  POWER:['digital','dc'],
  RESISTOR:['digital','dc'],
  LDR:['digital','dc'],
  THERMISTOR:['digital','dc'],
  DIODE:['digital','dc'],
  DC_MOTOR:['digital','dc'],
  VIBRATION_MOTOR:['digital','dc'],
  LIGHT_BULB:['digital','dc'],
  HOBBY_GEARMOTOR:['digital','dc'],
  CAPACITOR:['digital','dc'],
  POLARIZED_CAPACITOR:['digital','dc'],
  POTENTIOMETER:['digital','dc'],
  NPN_TRANSISTOR:['digital','dc'],
}

const DECLARED_MODEL_AVAILABLE = {
  BATTERY_AA:true,
  COIN_CELL_CR2032:true,
  BATTERY_9V:true,
  POWER:true,
  RESISTOR:true,
  LDR:true,
  THERMISTOR:true,
  DIODE:true,
  DC_MOTOR:true,
  VIBRATION_MOTOR:true,
  LIGHT_BULB:true,
  HOBBY_GEARMOTOR:true,
  CAPACITOR:true,
  POLARIZED_CAPACITOR:true,
  POTENTIOMETER:true,
  NPN_TRANSISTOR:true,
}

/**
 * A3-SW0 : topologie interne déclarative, générique (aucun nom de type
 * n'est connu en dehors de cette table de déclaration). Une entrée
 * absente ici reçoit internalConnections: null (aucune topologie).
 */
const DECLARED_INTERNAL_CONNECTIONS = {
  BUTTON:{ states:{ pressed:[['pin1','pin2']] } },
  BUTTON_LATCHING:{ states:{ on:[['pin1','pin2']] } },
  // A3-SW1 : SPDT — une seule paire active par position, jamais throwA↔throwB.
  SLIDE_SWITCH:{ states:{ left:[['common','throwA']], right:[['common','throwB']] } },
  // A3-SW2 : composition de canaux indépendants — extension générique du
  // contrat A3-SW0 (forme `channels`, alternative à `states`). Chaque canal
  // résout sa propre paire selon SON PROPRE état (component.channelStates),
  // jamais une union croisée entre canaux.
  DIP_SWITCH:{
    channels:{
      '1':{ states:{ on:[['1A','1B']], off:[] } },
      '2':{ states:{ on:[['2A','2B']], off:[] } },
      '3':{ states:{ on:[['3A','3B']], off:[] } },
      '4':{ states:{ on:[['4A','4B']], off:[] } },
    },
  },
}

function cloneParameterSchema(schema){ return schema.map((param)=>Object.freeze({...param})) }
function cloneDefaultParameters(parameters){ return Object.freeze({...parameters}) }
function cloneCapabilities(capabilities){ return Object.freeze([...capabilities]) }
function clonePins(pins){ return Object.freeze(pins.map((pin)=>Object.freeze({...pin}))) }
function cloneStatesMap(statesMap){
  return Object.freeze(Object.fromEntries(
    Object.entries(statesMap).map(([state,pairs])=>[state,Object.freeze(pairs.map((pair)=>Object.freeze([...pair])))])
  ))
}
function cloneInternalConnections(internalConnections){
  if(!internalConnections) return null
  // A3-SW2 : forme `channels` (composition de canaux indépendants) —
  // alternative générique à `states` (topologie globale, A3-SW0).
  if(internalConnections.channels){
    const channels=Object.fromEntries(
      Object.entries(internalConnections.channels).map(([channelId,channelDef])=>[channelId,Object.freeze({ states:cloneStatesMap(channelDef.states) })])
    )
    return Object.freeze({ channels:Object.freeze(channels) })
  }
  return Object.freeze({ states:cloneStatesMap(internalConnections.states) })
}

function buildEntry(type){
  const modelAvailable=DECLARED_MODEL_AVAILABLE[type] === true
  return Object.freeze({
    type,
    pins:clonePins(DECLARED_TYPES_PINS[type]),
    parameterSchema:modelAvailable ? cloneParameterSchema(DECLARED_PARAMETER_SCHEMA[type]) : null,
    defaultParameters:modelAvailable ? cloneDefaultParameters(DECLARED_DEFAULT_PARAMETERS[type]) : null,
    capabilities:modelAvailable ? cloneCapabilities(DECLARED_CAPABILITIES[type]) : null,
    modelAvailable,
    internalConnections:cloneInternalConnections(DECLARED_INTERNAL_CONNECTIONS[type] ?? null),
  })
}

const CANONICAL_ENTRIES=Object.freeze(DECLARED_TYPE_ORDER.reduce((acc,type)=>{acc[type]=buildEntry(type);return acc},{}))
const CANONICAL_TYPES=Object.freeze(Object.keys(CANONICAL_ENTRIES))
const CANONICAL_ENTRIES_LIST=Object.freeze(Object.values(CANONICAL_ENTRIES))

export function validateCanonicalEntry(entry){
  const errors=[]
  if(!entry || typeof entry!=='object') return {valid:false,errors:['entry must be a non-null object']}
  if(typeof entry.type!=='string' || entry.type.length===0) errors.push('type must be a non-empty string')
  if(!Array.isArray(entry.pins)) errors.push('pins must be an array')
  else {
    const seen=new Set()
    entry.pins.forEach((pin,index)=>{
      if(!pin || typeof pin.id!=='string' || pin.id.length===0){errors.push(`pins[${index}].id must be a non-empty string`);return}
      if(seen.has(pin.id)) errors.push(`duplicate pin id "${pin.id}"`)
      seen.add(pin.id)
    })
  }
  if(entry.parameterSchema!==null){
    if(!Array.isArray(entry.parameterSchema)) errors.push('parameterSchema must be an array or null')
    else entry.parameterSchema.forEach((param,index)=>{
      if(!param || typeof param.key!=='string' || param.key.length===0) errors.push(`parameterSchema[${index}].key must be a non-empty string`)
      const hasMin=typeof param?.minimum==='number', hasMax=typeof param?.maximum==='number'
      if(hasMin&&hasMax&&param.minimum>param.maximum) errors.push(`parameterSchema[${index}] minimum (${param.minimum}) must be <= maximum (${param.maximum})`)
      const hasDefault=!!param&&Object.prototype.hasOwnProperty.call(param,'defaultValue')
      if(param?.required===true&&!hasDefault) errors.push(`parameterSchema[${index}] is declared required but has no defaultValue`)
      if(hasDefault){if(hasMin&&param.defaultValue<param.minimum) errors.push(`parameterSchema[${index}] defaultValue (${param.defaultValue}) is below minimum (${param.minimum})`);if(hasMax&&param.defaultValue>param.maximum) errors.push(`parameterSchema[${index}] defaultValue (${param.defaultValue}) is above maximum (${param.maximum})`)}
    })
  }
  if(entry.defaultParameters!==null && (!entry.defaultParameters || typeof entry.defaultParameters!=='object' || Array.isArray(entry.defaultParameters))) errors.push('defaultParameters must be an object or null')
  if(entry.capabilities!==null && !Array.isArray(entry.capabilities)) errors.push('capabilities must be an array or null')
  if(entry.internalConnections!==null && entry.internalConnections!==undefined){
    const ic=entry.internalConnections
    const pinIds=new Set(Array.isArray(entry.pins) ? entry.pins.filter((pin)=>pin && typeof pin.id==='string').map((pin)=>pin.id) : [])
    const validateStatesMap=(statesMap,prefix)=>{
      if(!statesMap || typeof statesMap!=='object' || Array.isArray(statesMap)){ errors.push(`${prefix} must be an object with a states object`); return }
      Object.entries(statesMap).forEach(([stateName,pairs])=>{
        if(!Array.isArray(pairs)){ errors.push(`${prefix}.${stateName} must be an array`); return }
        pairs.forEach((pair,index)=>{
          if(!Array.isArray(pair) || pair.length!==2 || typeof pair[0]!=='string' || typeof pair[1]!=='string'){
            errors.push(`${prefix}.${stateName}[${index}] must be a pair of two pin ids`)
            return
          }
          const [pinA,pinB]=pair
          if(!pinIds.has(pinA)) errors.push(`${prefix}.${stateName}[${index}] references unknown pin "${pinA}"`)
          if(!pinIds.has(pinB)) errors.push(`${prefix}.${stateName}[${index}] references unknown pin "${pinB}"`)
        })
      })
    }
    if(typeof ic!=='object' || Array.isArray(ic)){
      errors.push('internalConnections must be an object with a states object or a channels object')
    } else if(ic.channels!==undefined){
      // A3-SW2 : composition de canaux indépendants — chaque canal valide
      // séparément son propre vocabulaire d'états, sur le MÊME jeu de pins.
      if(!ic.channels || typeof ic.channels!=='object' || Array.isArray(ic.channels)){
        errors.push('internalConnections.channels must be an object')
      } else {
        Object.entries(ic.channels).forEach(([channelId,channelDef])=>{
          validateStatesMap(channelDef && channelDef.states, `internalConnections.channels.${channelId}.states`)
        })
      }
    } else {
      validateStatesMap(ic.states, 'internalConnections.states')
    }
  }
  if(typeof entry.modelAvailable!=='boolean') errors.push('modelAvailable must be a boolean')
  if(entry.modelAvailable && (entry.parameterSchema===null || entry.defaultParameters===null || entry.capabilities===null)) errors.push('available model must expose parameterSchema, defaultParameters and capabilities')
  if(!entry.modelAvailable && (entry.parameterSchema!==null || entry.defaultParameters!==null || entry.capabilities!==null)) errors.push('unavailable model must not expose model-specific declarative metadata')
  return {valid:errors.length===0,errors}
}

export function validateCanonicalEntrySet(entries){
  if(!Array.isArray(entries)) return {valid:false,errors:['entries must be an array']}
  const errors=[],seen=new Set()
  entries.forEach((entry,index)=>{const result=validateCanonicalEntry(entry);if(!result.valid)errors.push(...result.errors.map(e=>`entries[${index}]: ${e}`));if(entry&&typeof entry.type==='string'){if(seen.has(entry.type))errors.push(`duplicate type "${entry.type}" in entry set`);seen.add(entry.type)}})
  return {valid:errors.length===0,errors}
}

const selfCheck=validateCanonicalEntrySet(CANONICAL_ENTRIES_LIST)
if(!selfCheck.valid) throw new Error(`canonicalRegistry: internal data failed self-validation: ${selfCheck.errors.join('; ')}`)
export function getAllCanonicalTypes(){return CANONICAL_TYPES}
export function hasCanonicalType(type){return typeof type==='string'&&Object.prototype.hasOwnProperty.call(CANONICAL_ENTRIES,type)}
export function getCanonicalEntry(type){return hasCanonicalType(type)?CANONICAL_ENTRIES[type]:null}
export function getAllCanonicalEntries(){return CANONICAL_ENTRIES_LIST}

/**
 * A3-SW0 (étendu par A3-SW2) : résolution générique de la topologie
 * interne active d'un composant. Ne connaît aucun nom de type ; lit
 * uniquement le contrat déclaratif internalConnections de l'entry et
 * l'état courant du composant. Retourne toujours un tableau (jamais
 * d'exception).
 *
 * Deux formes de contrat, mutuellement exclusives :
 * - `states` (A3-SW0) : topologie globale, lue depuis `component.state`.
 * - `channels` (A3-SW2) : composition de canaux indépendants, chaque
 *   canal résolu depuis SA PROPRE entrée de `component.channelStates`
 *   (jamais une union croisée entre canaux — chaque canal ne peut
 *   produire que des paires impliquant ses propres pins déclarées).
 *
 * @param {object|null} entry canonical entry (getCanonicalEntry)
 * @param {{ state?: string, channelStates?: Record<string,string> }} component instance/state
 * @returns {Array<[string,string]>}
 */
export function resolveInternalConnections(entry,component){
  if(!entry || !entry.internalConnections) return []
  const ic=entry.internalConnections
  if(ic.channels){
    const channelStates=component && component.channelStates
    if(!channelStates || typeof channelStates!=='object') return []
    const pairs=[]
    for(const [channelId,channelDef] of Object.entries(ic.channels)){
      const state=channelStates[channelId]
      if(typeof state!=='string') continue
      const channelPairs=channelDef.states[state]
      if(Array.isArray(channelPairs)) for(const pair of channelPairs) pairs.push(pair)
    }
    return pairs.map(([pinA,pinB])=>[pinA,pinB])
  }
  const state=component && component.state
  if(typeof state!=='string') return []
  const pairs=ic.states[state]
  if(!Array.isArray(pairs)) return []
  return pairs.map(([pinA,pinB])=>[pinA,pinB])
}
