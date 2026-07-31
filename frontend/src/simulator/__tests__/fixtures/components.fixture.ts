// ============================================
// LOCAL INTERFACE (copie de ComponentModel)
// ============================================
// In B2, this will be imported from ../core/ComponentModel
// For B1, we define it locally to keep tests autonomous
export interface ComponentModel {
  type: string;
  label: string;
  category: string;
  pins: Array<{ id: string; label: string; position: { x: number; y: number } }>;
  params: Array<{
    id: string;
    label: string;
    type: string;
    min?: number;
    max?: number;
    default?: any;
    required?: boolean;
  }>;
  symbol: string;
  description: string;
  customValidator?: (params: any) => string | null;
}

// ============================================
// VALID MODELS
// ============================================

export const validResistorModel: ComponentModel = {
  type: 'R',
  label: 'Resistor',
  category: 'passive',
  pins: [
    { id: 'p1', label: 'A', position: { x: -30, y: 0 } },
    { id: 'p2', label: 'B', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: 'resistance', 
      label: 'R (Ω)', 
      type: 'number', 
      min: 0, 
      default: 1000,
      required: true
    }
  ],
  symbol: 'resistor.svg',
  description: 'Linear resistor following Ohm\'s law'
};

export const validCapacitorModel: ComponentModel = {
  type: 'C',
  label: 'Capacitor',
  category: 'passive',
  pins: [
    { id: 'p1', label: 'A', position: { x: -30, y: 0 } },
    { id: 'p2', label: 'B', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: 'capacitance', 
      label: 'C (F)', 
      type: 'number', 
      min: 0, 
      default: 1e-6,
      required: true
    }
  ],
  symbol: 'capacitor.svg',
  description: 'Ideal capacitor'
};

export const validInductorModel: ComponentModel = {
  type: 'L',
  label: 'Inductor',
  category: 'passive',
  pins: [
    { id: 'p1', label: 'A', position: { x: -30, y: 0 } },
    { id: 'p2', label: 'B', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: 'inductance', 
      label: 'L (H)', 
      type: 'number', 
      min: 0, 
      default: 1e-3,
      required: true
    }
  ],
  symbol: 'inductor.svg',
  description: 'Ideal inductor'
};

export const validVSourceModel: ComponentModel = {
  type: 'V',
  label: 'Voltage Source',
  category: 'source',
  pins: [
    { id: 'p1', label: '+', position: { x: -30, y: 0 } },
    { id: 'p2', label: '-', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: 'voltage', 
      label: 'V (V)', 
      type: 'number', 
      default: 5,
      required: true
    }
  ],
  symbol: 'vsource.svg',
  description: 'Ideal voltage source'
};

export const validIsourceModel: ComponentModel = {
  type: 'I',
  label: 'Current Source',
  category: 'source',
  pins: [
    { id: 'p1', label: '+', position: { x: -30, y: 0 } },
    { id: 'p2', label: '-', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: 'current', 
      label: 'I (A)', 
      type: 'number', 
      default: 1,
      required: true
    }
  ],
  symbol: 'isource.svg',
  description: 'Ideal current source'
};

export const validDiodeModel: ComponentModel = {
  type: 'D',
  label: 'Diode',
  category: 'semiconductor',
  pins: [
    { id: 'p1', label: 'A (Anode)', position: { x: -30, y: 0 } },
    { id: 'p2', label: 'K (Cathode)', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: 'is', 
      label: 'Is (A)', 
      type: 'number', 
      min: 0, 
      default: 1e-12,
      required: true
    },
    { 
      id: 'n', 
      label: 'Ideality factor', 
      type: 'number', 
      min: 0.5, 
      max: 2, 
      default: 1,
      required: true
    }
  ],
  symbol: 'diode.svg',
  description: 'Ideal diode with Shockley equation'
};

// ============================================
// INVALID MODELS
// ============================================

export const invalidModelNoPins: ComponentModel = {
  type: 'NO_PINS',
  label: 'Invalid Model',
  category: 'invalid',
  pins: [], // Empty pins - invalid
  params: [],
  symbol: 'invalid.svg',
  description: 'Model with no pins'
};

export const invalidModelDuplicatePins: ComponentModel = {
  type: 'DUP_PINS',
  label: 'Invalid Model',
  category: 'invalid',
  pins: [
    { id: 'p1', label: 'A', position: { x: -30, y: 0 } },
    { id: 'p1', label: 'B', position: { x: 30, y: 0 } } // Duplicate pin id
  ],
  params: [],
  symbol: 'invalid.svg',
  description: 'Model with duplicate pin ids'
};

export const invalidModelEmptyType: ComponentModel = {
  type: '', // Empty type - invalid
  label: 'Invalid Model',
  category: 'invalid',
  pins: [
    { id: 'p1', label: 'A', position: { x: -30, y: 0 } },
    { id: 'p2', label: 'B', position: { x: 30, y: 0 } }
  ],
  params: [],
  symbol: 'invalid.svg',
  description: 'Model with empty type'
};

export const invalidModelInvalidParam: ComponentModel = {
  type: 'INV_PARAM',
  label: 'Invalid Model',
  category: 'invalid',
  pins: [
    { id: 'p1', label: 'A', position: { x: -30, y: 0 } },
    { id: 'p2', label: 'B', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: '', // Empty param id - invalid
      label: 'Test', 
      type: 'number', 
      default: 1,
      required: true
    }
  ],
  symbol: 'invalid.svg',
  description: 'Model with invalid param'
};

export const invalidModelNegativeValue: ComponentModel = {
  type: 'NEG_VAL',
  label: 'Invalid Model',
  category: 'invalid',
  pins: [
    { id: 'p1', label: 'A', position: { x: -30, y: 0 } },
    { id: 'p2', label: 'B', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: 'value', 
      label: 'Value', 
      type: 'number', 
      min: 0, 
      default: -1, // Negative default - invalid
      required: true
    }
  ],
  symbol: 'invalid.svg',
  description: 'Model with negative default value'
};

export const invalidModelMissingDefault: ComponentModel = {
  type: 'MISSING_DEF',
  label: 'Invalid Model',
  category: 'invalid',
  pins: [
    { id: 'p1', label: 'A', position: { x: -30, y: 0 } },
    { id: 'p2', label: 'B', position: { x: 30, y: 0 } }
  ],
  params: [
    { 
      id: 'value', 
      label: 'Value', 
      type: 'number', 
      min: 0, 
      required: true // Missing default
    }
  ],
  symbol: 'invalid.svg',
  description: 'Model with required param missing default'
};

// ============================================
// EXPORT ALL
// ============================================

export const allValidModels = {
  R: validResistorModel,
  C: validCapacitorModel,
  L: validInductorModel,
  V: validVSourceModel,
  I: validIsourceModel,
  D: validDiodeModel
};

export const allInvalidModels = {
  NO_PINS: invalidModelNoPins,
  DUP_PINS: invalidModelDuplicatePins,
  EMPTY_TYPE: invalidModelEmptyType,
  INV_PARAM: invalidModelInvalidParam,
  NEG_VAL: invalidModelNegativeValue,
  MISSING_DEF: invalidModelMissingDefault
};