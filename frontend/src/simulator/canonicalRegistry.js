/**
 * canonicalRegistry.js — Registre canonique déclaratif des composants (MB-CF2-001).
 *
 * Expose une entrée pour CHAQUE type déclaré dans componentDefinitions.js
 * (identité + pins), en distinguant explicitement :
 *   1. type connu/déclaré (toujours présent si le type existe dans
 *      componentDefinitions.js) ;
 *   2. modèle de simulation disponible ou non (`modelAvailable`).
 *
 * Pour les types SANS modèle réel en dépôt, `parameterSchema` et
 * `capabilities` valent `null` — PAS `[]` — pour signaler explicitement
 * "donnée non sourcée", et non "confirmé : zéro paramètre/capacité".
 * Aucun parameterSchema n'est inventé pour ces types.
 *
 * ADR-012 (Option C) : connaissance déclarative uniquement. Aucun calcul,
 * aucune exécution de modèle, aucune validation de candidat (B — réservée
 * à Validation/CF4).
 *
 * pin.role : convention PARTIELLEMENT DÉFINIE — valeurs recopiées telles
 * quelles, aucune normalisation, aucun renommage.
 *
 * Q2 (casing) : recherche par type strictement sensible à la casse, sans
 * normalisation — aucune convention choisie.
 * Q3 (forme d'implémentation) : reste DÉCISION DIFFÉRÉE / HORS PÉRIMÈTRE ;
 * le module plat retenu ici est un choix local, non définitif.
 *
 * @see MB-CF2-001 Blueprint / Spécification / Conception validée
 */

import { PowerModel } from './models/PowerModel.js';
import { ResistorModel } from './models/ResistorModel.js';

/**
 * @typedef {Object} CanonicalPin
 * @property {string} id
 * @property {string} role
 */

/**
 * @typedef {Object} CanonicalEntry
 * @property {string} type
 * @property {CanonicalPin[]} pins
 * @property {Array<Object>|null} parameterSchema - null si non sourcé (pas de modèle)
 * @property {string[]|null} capabilities - null si non sourcé (pas de modèle)
 * @property {boolean} modelAvailable
 */

// Pins recopiés littéralement depuis frontend/src/config/componentDefinitions.js
// pour les 16 types déclarés, volontairement SANS importer ce fichier :
// componentDefinitions.js mêle des champs de rendu (label, icon, width,
// height) consommés par la Presentation (Sidebar.jsx, CircuitComponent.jsx),
// et la contrainte MB-CF2-001 interdit toute dépendance du Registry vers
// React ou la Presentation. Seuls id/role (pins) sont repris ici.
const DECLARED_TYPES_PINS = {
  LED: [
    { id: 'anode', role: 'input' },
    { id: 'cathode', role: 'input' },
  ],
  RESISTOR: [
    { id: 'A', role: 'passive' },
    { id: 'B', role: 'passive' },
  ],
  ARDUINO: [
    { id: 'D2', role: 'gpio' },
    { id: 'D3', role: 'gpio' },
    { id: 'GND', role: 'ground' },
    { id: '5V', role: 'power' },
  ],
  BUTTON: [
    { id: 'pin1', role: 'switch' },
    { id: 'pin2', role: 'switch' },
  ],
  BUTTON_LATCHING: [
    { id: 'pin1', role: 'switch' },
    { id: 'pin2', role: 'switch' },
  ],
  POWER: [
    { id: '5V', role: 'power_out' },
    { id: 'GND', role: 'ground_out' },
  ],
  CAPACITOR: [
    { id: 'pinA', role: 'passive' },
    { id: 'pinB', role: 'passive' },
  ],
  BUZZER: [
    { id: 'plus', role: 'input' },
    { id: 'minus', role: 'input' },
  ],
  POTENTIOMETER: [
    { id: 'left', role: 'passive' },
    { id: 'wiper', role: 'output' },
    { id: 'right', role: 'passive' },
  ],
  LDR: [
    { id: 'A', role: 'sensor' },
    { id: 'B', role: 'sensor' },
  ],
  THERMISTOR: [
    { id: 'A', role: 'sensor' },
    { id: 'B', role: 'sensor' },
  ],
  DIODE: [
    { id: 'anode', role: 'input' },
    { id: 'cathode', role: 'output' },
  ],
  RGB_LED: [
    { id: 'R', role: 'input' },
    { id: 'common', role: 'ground' },
    { id: 'G', role: 'input' },
    { id: 'B', role: 'input' },
  ],
  NPN_TRANSISTOR: [
    { id: 'collector', role: 'input' },
    { id: 'base', role: 'input' },
    { id: 'emitter', role: 'output' },
  ],
  SERVO: [
    { id: 'signal', role: 'gpio' },
    { id: 'vcc', role: 'power' },
    { id: 'gnd', role: 'ground' },
  ],
  DC_MOTOR: [
    { id: 'plus', role: 'input' },
    { id: 'minus', role: 'input' },
  ],
};

const DECLARED_TYPE_ORDER = [
  'LED', 'RESISTOR', 'ARDUINO', 'BUTTON', 'BUTTON_LATCHING', 'POWER',
  'CAPACITOR', 'BUZZER', 'POTENTIOMETER', 'LDR', 'THERMISTOR', 'DIODE',
  'RGB_LED', 'NPN_TRANSISTOR', 'SERVO', 'DC_MOTOR',
];

// Seuls POWER et RESISTOR disposent d'un modèle de simulation réel en dépôt
// (PowerModel.js / ResistorModel.js). Les 14 autres types déclarés n'ont
// aucune source de parameterSchema/capabilities — ils ne sont donc PAS
// inventés (voir buildEntry : parameterSchema/capabilities → null).
const MODELS_BY_TYPE = {
  POWER: PowerModel,
  RESISTOR: ResistorModel,
};

function cloneParameterSchema(parameterSchema) {
  return parameterSchema.map((param) => Object.freeze({ ...param }));
}

function cloneCapabilities(capabilities) {
  return Object.freeze([...capabilities]);
}

function clonePins(pins) {
  return Object.freeze(pins.map((pin) => Object.freeze({ ...pin })));
}

function buildEntry(type) {
  const pins = DECLARED_TYPES_PINS[type];
  const model = MODELS_BY_TYPE[type] ?? null;

  return Object.freeze({
    type,
    pins: clonePins(pins),
    parameterSchema: model ? cloneParameterSchema(model.parameterSchema) : null,
    capabilities: model ? cloneCapabilities(model.capabilities) : null,
    modelAvailable: model !== null,
  });
}

/**
 * @type {Readonly<Record<string, CanonicalEntry>>}
 */
const CANONICAL_ENTRIES = Object.freeze(
  DECLARED_TYPE_ORDER.reduce((acc, type) => {
    acc[type] = buildEntry(type);
    return acc;
  }, {})
);

const CANONICAL_TYPES = Object.freeze(Object.keys(CANONICAL_ENTRIES));
const CANONICAL_ENTRIES_LIST = Object.freeze(Object.values(CANONICAL_ENTRIES));

/**
 * Vérifie la cohérence structurelle interne (invariants A) d'une entrée
 * canonique isolée. N'effectue AUCUNE validation de candidat/instance (B).
 *
 * Invariants couverts :
 *  - unicité des pins (au sein de l'entrée)
 *  - identifiant de pin non vide
 *  - cohérence minimum/maximum
 *  - présence d'une valeur par défaut UNIQUEMENT lorsque le paramètre
 *    déclare explicitement `required: true` (aucune requiredness n'est
 *    fabriquée quand cette information est absente de la source)
 *  - compatibilité de la valeur par défaut avec les bornes déclarées,
 *    lorsqu'une valeur par défaut est présente
 *
 * `parameterSchema`/`capabilities` valant `null` (type sans modèle) ne
 * sont pas des erreurs — c'est l'état attendu pour ces types.
 *
 * (L'unicité du TYPE est un invariant d'ensemble — voir validateCanonicalEntrySet.)
 *
 * @param {*} entry
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCanonicalEntry(entry) {
  const errors = [];

  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['entry must be a non-null object'] };
  }

  if (typeof entry.type !== 'string' || entry.type.length === 0) {
    errors.push('type must be a non-empty string');
  }

  if (!Array.isArray(entry.pins)) {
    errors.push('pins must be an array');
  } else {
    const seenPinIds = new Set();
    entry.pins.forEach((pin, index) => {
      if (!pin || typeof pin.id !== 'string' || pin.id.length === 0) {
        errors.push(`pins[${index}].id must be a non-empty string`);
        return;
      }
      if (seenPinIds.has(pin.id)) {
        errors.push(`duplicate pin id "${pin.id}"`);
      }
      seenPinIds.add(pin.id);
    });
  }

  if (entry.parameterSchema !== null) {
    if (!Array.isArray(entry.parameterSchema)) {
      errors.push('parameterSchema must be an array or null');
    } else {
      entry.parameterSchema.forEach((param, index) => {
        if (!param || typeof param.key !== 'string' || param.key.length === 0) {
          errors.push(`parameterSchema[${index}].key must be a non-empty string`);
        }

        const hasMin = typeof param?.minimum === 'number';
        const hasMax = typeof param?.maximum === 'number';
        if (hasMin && hasMax && param.minimum > param.maximum) {
          errors.push(
            `parameterSchema[${index}] minimum (${param.minimum}) must be <= maximum (${param.maximum})`
          );
        }

        const hasDefault = !!param && Object.prototype.hasOwnProperty.call(param, 'defaultValue');
        const isExplicitlyRequired = param?.required === true;

        if (isExplicitlyRequired && !hasDefault) {
          errors.push(`parameterSchema[${index}] is declared required but has no defaultValue`);
        }

        if (hasDefault) {
          const dv = param.defaultValue;
          if (hasMin && dv < param.minimum) {
            errors.push(
              `parameterSchema[${index}] defaultValue (${dv}) is below minimum (${param.minimum})`
            );
          }
          if (hasMax && dv > param.maximum) {
            errors.push(
              `parameterSchema[${index}] defaultValue (${dv}) is above maximum (${param.maximum})`
            );
          }
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * @param {Array<*>} entries
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCanonicalEntrySet(entries) {
  if (!Array.isArray(entries)) {
    return { valid: false, errors: ['entries must be an array'] };
  }

  const errors = [];
  const seenTypes = new Set();

  entries.forEach((entry, index) => {
    const result = validateCanonicalEntry(entry);
    if (!result.valid) {
      errors.push(...result.errors.map((e) => `entries[${index}]: ${e}`));
    }
    if (entry && typeof entry.type === 'string') {
      if (seenTypes.has(entry.type)) {
        errors.push(`duplicate type "${entry.type}" in entry set`);
      }
      seenTypes.add(entry.type);
    }
  });

  return { valid: errors.length === 0, errors };
}

const selfCheck = validateCanonicalEntrySet(CANONICAL_ENTRIES_LIST);
if (!selfCheck.valid) {
  throw new Error(
    `canonicalRegistry: internal data failed self-validation: ${selfCheck.errors.join('; ')}`
  );
}

/** @returns {readonly string[]} */
export function getAllCanonicalTypes() {
  return CANONICAL_TYPES;
}

/**
 * Recherche exacte, sensible à la casse, sans normalisation.
 * @param {string} type
 * @returns {boolean}
 */
export function hasCanonicalType(type) {
  return typeof type === 'string' && Object.prototype.hasOwnProperty.call(CANONICAL_ENTRIES, type);
}

/**
 * @param {string} type
 * @returns {CanonicalEntry | null}
 */
export function getCanonicalEntry(type) {
  if (!hasCanonicalType(type)) return null;
  return CANONICAL_ENTRIES[type];
}

/** @returns {readonly CanonicalEntry[]} */
export function getAllCanonicalEntries() {
  return CANONICAL_ENTRIES_LIST;
}
