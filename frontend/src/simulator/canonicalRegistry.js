import { PowerModel } from './models/PowerModel.js'
import { ResistorModel } from './models/ResistorModel.js'
import { LdrModel } from './models/LdrModel.js'
import { ThermistorModel } from './models/ThermistorModel.js'

const DECLARED_TYPES_PINS = {
  LED:[{id:'anode',role:'input'},{id:'cathode',role:'input'}],
  RESISTOR:[{id:'A',role:'passive'},{id:'B',role:'passive'}],
  ARDUINO:[{id:'D2',role:'gpio'},{id:'D3',role:'gpio'},{id:'GND',role:'ground'},{id:'5V',role:'power'}],
  BUTTON:[{id:'pin1',role:'switch'},{id:'pin2',role:'switch'}],
  BUTTON_LATCHING:[{id:'pin1',role:'switch'},{id:'pin2',role:'switch'}],
  POWER:[{id:'5V',role:'power_out'},{id:'GND',role:'ground_out'}],
  CAPACITOR:[{id:'pinA',role:'passive'},{id:'pinB',role:'passive'}],
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

const DECLARED_TYPE_ORDER = ['LED','RESISTOR','ARDUINO','BUTTON','BUTTON_LATCHING','POWER','CAPACITOR','BUZZER','POTENTIOMETER','LDR','THERMISTOR','DIODE','RGB_LED','NPN_TRANSISTOR','SERVO','DC_MOTOR']
const MODELS_BY_TYPE = { POWER:PowerModel, RESISTOR:ResistorModel, LDR:LdrModel, THERMISTOR:ThermistorModel }

function cloneParameterSchema(schema){ return schema.map((param)=>Object.freeze({...param})) }
function cloneCapabilities(capabilities){ return Object.freeze([...capabilities]) }
function clonePins(pins){ return Object.freeze(pins.map((pin)=>Object.freeze({...pin}))) }

function buildEntry(type){
  const model=MODELS_BY_TYPE[type] ?? null
  return Object.freeze({
    type,
    pins:clonePins(DECLARED_TYPES_PINS[type]),
    parameterSchema:model ? cloneParameterSchema(model.parameterSchema) : null,
    capabilities:model ? cloneCapabilities(model.capabilities) : null,
    modelAvailable:model !== null,
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
