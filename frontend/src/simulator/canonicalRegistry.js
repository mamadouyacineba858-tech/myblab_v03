const DECLARED_TYPES_PINS = {
  LED:[{id:'anode',role:'input'},{id:'cathode',role:'input'}],
  RESISTOR:[{id:'A',role:'passive'},{id:'B',role:'passive'}],
  ARDUINO:[{id:'D2',role:'gpio'},{id:'D3',role:'gpio'},{id:'GND',role:'ground'},{id:'5V',role:'power'}],
  BUTTON:[{id:'pin1',role:'switch'},{id:'pin2',role:'switch'}],
  BUTTON_LATCHING:[{id:'pin1',role:'switch'},{id:'pin2',role:'switch'}],
  POWER:[{id:'5V',role:'power_out'},{id:'GND',role:'ground_out'}],
  CAPACITOR:[{id:'pinA',role:'passive'},{id:'pinB',role:'passive'}],
  CAPACITOR_POLARIZED:[{id:'positive',role:'passive'},{id:'negative',role:'passive'}],
  BUZZER:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
  POTENTIOMETER:[{id:'left',role:'passive'},{id:'wiper',role:'output'},{id:'right',role:'passive'}],
  LDR:[{id:'A',role:'sensor'},{id:'B',role:'sensor'}],
  THERMISTOR:[{id:'A',role:'sensor'},{id:'B',role:'sensor'}],
  DIODE:[{id:'anode',role:'input'},{id:'cathode',role:'output'}],
  RGB_LED:[{id:'R',role:'input'},{id:'common',role:'ground'},{id:'G',role:'input'},{id:'B',role:'input'}],
  NPN_TRANSISTOR:[{id:'collector',role:'input'},{id:'base',role:'input'},{id:'emitter',role:'output'}],
  SERVO:[{id:'signal',role:'gpio'},{id:'vcc',role:'power'},{id:'gnd',role:'ground'}],
  DC_MOTOR:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
}

const DECLARED_TYPE_ORDER = ['LED','RESISTOR','ARDUINO','BUTTON','BUTTON_LATCHING','POWER','CAPACITOR','CAPACITOR_POLARIZED','BUZZER','POTENTIOMETER','LDR','THERMISTOR','DIODE','RGB_LED','NPN_TRANSISTOR','SERVO','DC_MOTOR']

const DECLARED_PARAMETER_SCHEMA = {
  POWER:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:0.001,maximum:1000,defaultValue:5,description:'Tension de sortie de la source en Volts'}],
  RESISTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e9,defaultValue:220,description:'Valeur de la résistance en Ohms'}],
  LDR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:100,maximum:10000000,defaultValue:10000,description:'Résistance fixe (mode simplifié MB-SIM-008) : cette LDR est modélisée par une résistance constante et ne dépend pas de la lumière — la relation éclairement → résistance est hors périmètre de MB-SIM-008.'}],
  THERMISTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:100,maximum:1000000,defaultValue:10000,description:'Résistance fixe (mode simplifié MB-SIM-008, type NTC) : cette thermistance est modélisée par une résistance constante et ne dépend pas de la température — la relation température → résistance est hors périmètre de MB-SIM-008.'}],
  DIODE:[
    {key:'forwardVoltage',parameterType:'voltage',unit:'V',minimum:0,maximum:5,defaultValue:0.7,description:'Tension de seuil de conduction directe (modèle DC simplifié, MB-SIM-008 v2) : diode idéale à seuil, sans modèle non linéaire complet ni dynamique de commutation.'},
    {key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e9,defaultValue:10,description:'Résistance équivalente en conduction directe au-delà du seuil (modèle DC simplifié, MB-SIM-008 v2).'},
  ],
  DC_MOTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente du bobinage (modèle électrique DC simplifié, MB-SIM-008 v2) : vitesse, couple, inertie et force contre-électromotrice dynamique sont hors périmètre.'}],
  CAPACITOR:[{key:'capacitance',parameterType:'capacitance',unit:'F',minimum:1e-12,maximum:1,defaultValue:0.0001,description:'Capacité (modèle DC établi, MB-SIM-008 v2) : le condensateur est traité comme un circuit ouvert en régime permanent (I=0) ; cette valeur n\'intervient pas dans l\'analyse DC et n\'est significative que pour un futur modèle Transitoire, hors périmètre de MB-SIM-008.'}],
  CAPACITOR_POLARIZED:[{key:'capacitance',parameterType:'capacitance',unit:'F',minimum:1e-12,maximum:1,defaultValue:0.0001,description:'Capacité d\'un condensateur électrolytique polarisé (modèle DC établi, MB-SIM-008 v2) : circuit ouvert en régime permanent (I=0). La polarité est une propriété physique du composant et son comportement transitoire est hors périmètre.'}],
  POTENTIOMETER:[
    {key:'resistance',parameterType:'resistance',unit:'Ω',minimum:1,maximum:1e7,defaultValue:10000,description:'Résistance totale de la piste résistive, extrémité LEFT à extrémité RIGHT (modèle DC simplifié, MB-SIM-008 v2).'},
    {key:'position',parameterType:'ratio',unit:'',minimum:0,maximum:1,defaultValue:0.5,description:'Position du curseur (0 = extrémité LEFT, 1 = extrémité RIGHT) : détermine les deux résistances équivalentes LEFT↔WIPER et WIPER↔RIGHT (modèle DC simplifié, MB-SIM-008 v2).'},
  ],
  NPN_TRANSISTOR:[{key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:1,description:'Résistance équivalente collecteur-émetteur à l\'état passant (modèle logique simplifié, MB-SIM-008 v2) : commande tout-ou-rien par BASE, sans β réel, sans courbes Ic/Vce, sans dynamique.'}],
}

const DECLARED_DEFAULT_PARAMETERS = {
  POWER:{voltage:5},
  RESISTOR:{resistance:220},
  LDR:{resistance:10000},
  THERMISTOR:{resistance:10000},
  DIODE:{forwardVoltage:0.7,onResistance:10},
  DC_MOTOR:{resistance:20},
  CAPACITOR:{capacitance:0.0001},
  CAPACITOR_POLARIZED:{capacitance:0.0001},
  POTENTIOMETER:{resistance:10000,position:0.5},
  NPN_TRANSISTOR:{onResistance:1},
}

const DECLARED_CAPABILITIES = {
  POWER:['digital','dc'],
  RESISTOR:['digital','dc'],
  LDR:['digital','dc'],
  THERMISTOR:['digital','dc'],
  DIODE:['digital','dc'],
  DC_MOTOR:['digital','dc'],
  CAPACITOR:['digital','dc'],
  CAPACITOR_POLARIZED:['digital','dc'],
  POTENTIOMETER:['digital','dc'],
  NPN_TRANSISTOR:['digital','dc'],
}

const DECLARED_MODEL_AVAILABLE = {
  POWER:true,
  RESISTOR:true,
  LDR:true,
  THERMISTOR:true,
  DIODE:true,
  DC_MOTOR:true,
  CAPACITOR:true,
  CAPACITOR_POLARIZED:true,
  POTENTIOMETER:true,
  NPN_TRANSISTOR:true,
}

function cloneParameterSchema(schema){ return schema.map((param)=>Object.freeze({...param})) }
function cloneDefaultParameters(parameters){ return Object.freeze({...parameters}) }
function cloneCapabilities(capabilities){ return Object.freeze([...capabilities]) }
function clonePins(pins){ return Object.freeze(pins.map((pin)=>Object.freeze({...pin}))) }

function buildEntry(type){
  const modelAvailable=DECLARED_MODEL_AVAILABLE[type] === true
  return Object.freeze({
    type,
    pins:clonePins(DECLARED_TYPES_PINS[type]),
    parameterSchema:modelAvailable ? cloneParameterSchema(DECLARED_PARAMETER_SCHEMA[type]) : null,
    defaultParameters:modelAvailable ? cloneDefaultParameters(DECLARED_DEFAULT_PARAMETERS[type]) : null,
    capabilities:modelAvailable ? cloneCapabilities(DECLARED_CAPABILITIES[type]) : null,
    modelAvailable,
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
