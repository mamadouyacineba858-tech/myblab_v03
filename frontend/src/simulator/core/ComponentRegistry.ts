/**
 * ComponentRegistry - Contrat défini par les tests B1
 * Implémentation B2 - Strictement pilotée par les tests
 */

type ComponentModel = any; // Défini par les fixtures B1
type ValidationResult = { valid: boolean; errors: string[] };
type RegisterCallback = (type: string, model: ComponentModel) => void;

export class ComponentRegistry {
  private models: Map<string, ComponentModel> = new Map();
  private callbacks: Set<RegisterCallback> = new Set();

  // ============================================
  // Registration (tests: REG-001 à REG-008)
  // ============================================

  register(type: string, model: ComponentModel): void {
    const normalizedType = type.trim().toUpperCase();

    if (!normalizedType) {
      throw new Error('Type cannot be empty');
    }

    if (!model) {
      throw new Error('Model is required');
    }

    // REG-006: invalid model check
    this.validateModel(model);

    // REG-002: duplicate check
    if (this.models.has(normalizedType)) {
      throw new Error(`Type "${normalizedType}" already registered`);
    }

    // REG-001: store model
    // GET-004 / LISTALL-003: deep copy
    this.models.set(normalizedType, this.deepCopy(model));

    // EVT-001: trigger callbacks
    // EVT-006: pass (type, model)
    this.callbacks.forEach(cb => cb(normalizedType, model));
  }

  // REG-005: register multiple models
  registerAll(models: Record<string, ComponentModel>): void {
    // REG-006 / REG-007: atomic operation
    const entries = Object.entries(models);
    const toRegister: Array<[string, ComponentModel]> = [];

    for (const [type, model] of entries) {
      const normalizedType = type.trim().toUpperCase();
      if (!normalizedType) {
        throw new Error('Type cannot be empty');
      }
      if (!model) {
        throw new Error('Model is required');
      }
      if (this.models.has(normalizedType)) {
        throw new Error(`Type "${normalizedType}" already registered`);
      }
      this.validateModel(model);
      toRegister.push([normalizedType, this.deepCopy(model)]);
    }

    // Atomic registration
    for (const [type, model] of toRegister) {
      this.models.set(type, model);
      this.callbacks.forEach(cb => cb(type, model));
    }
  }

  // ============================================
  // Retrieval (tests: GET-001 à GET-006)
  // ============================================

  // GET-001: get registered model
  // GET-002: return undefined for unregistered
  // GET-003: case-insensitive
  // GET-004: deep copy (not reference)
  get(type: string): ComponentModel | undefined {
    const normalizedType = type.trim().toUpperCase();
    const model = this.models.get(normalizedType);
    return model ? this.deepCopy(model) : undefined;
  }

  // HAS-001: true for registered
  // HAS-002: false for unregistered
  // HAS-003: case-insensitive
 has(type: string): boolean {
  // Normalisation locale (supporte Unicode)
  // case-insensitive: 'r' → 'R', 'Résistor' → 'RÉSISTOR'
  const normalized = type.trim().toLocaleUpperCase();
  return this.models.has(normalized);
}
  // ============================================
  // Listing (tests: LIST-001 à LIST-003)
  // ============================================

  // LIST-001: empty array when empty
  // LIST-002: list all types
  // LIST-003: alphabetical order
  list(): string[] {
    return Array.from(this.models.keys()).sort();
  }

  // LISTALL-001: empty array when empty
  // LISTALL-002: list all models
  // LISTALL-003: deep copies
  listAll(): ComponentModel[] {
    return Array.from(this.models.values())
      .map(model => this.deepCopy(model))
      .sort((a, b) => a.type.localeCompare(b.type));
  }

  // ============================================
  // Validation (tests: VAL-001 à VAL-010)
  // ============================================

  // VAL-001: correct params → valid: true
  // VAL-002: missing required → valid: false + error
  // VAL-003: below min → valid: false + error
  // VAL-004: unregistered type → throw
  // VAL-006: unknown param → valid: false + error
  // VAL-007: string number → parsed
  // VAL-008: non-numeric → valid: false + error
  // VAL-010: customValidator support
  validate(type: string, params: Record<string, any>): ValidationResult {
    const normalizedType = type.trim().toUpperCase();

    if (!normalizedType) {
      return { valid: false, errors: ['Type cannot be empty'] };
    }

    const model = this.models.get(normalizedType);
    if (!model) {
      throw new Error(`Unregistered type: ${normalizedType}`);
    }

    const errors: string[] = [];

    for (const param of model.params || []) {
      // VAL-002: required check
      if (param.required && (params[param.id] === undefined || params[param.id] === null)) {
        errors.push(`${param.id} is required`);
        continue;
      }

      const value = params[param.id];
      if (value === undefined || value === null) continue;

      // VAL-007: string number parsing
      if (param.type === 'number') {
        const num = Number(value);
        // VAL-008: non-numeric
        if (isNaN(num)) {
          errors.push(`${param.id} must be a number`);
          continue;
        }

        // VAL-003: min check
        if (param.min !== undefined && num < param.min) {
          errors.push(`${param.id} must be >= ${param.min}`);
        }
        if (param.max !== undefined && num > param.max) {
          errors.push(`${param.id} must be <= ${param.max}`);
        }
      }
    }

    // VAL-006: unknown params
    const knownParams = new Set((model.params || []).map((p: any) => p.id));
    for (const key of Object.keys(params)) {
      if (!knownParams.has(key)) {
        errors.push(`${key} is not a valid parameter`);
      }
    }

    // VAL-010: customValidator
    if (model.customValidator) {
      const customError = model.customValidator(params);
      if (customError) {
        errors.push(customError);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // VAL-005: batch validation
  validateAll(components: Array<{ type: string; params: Record<string, any> }>): ValidationResult[] {
    return components.map(comp => this.validate(comp.type, comp.params));
  }

  // VAL-009: validate all registered
  validateAllRegistered(): ValidationResult[] {
    const results: ValidationResult[] = [];
    for (const [, model] of this.models) {
      const params: Record<string, any> = {};
      for (const param of model.params || []) {
        if (param.default !== undefined) {
          params[param.id] = param.default;
        }
      }
      results.push(this.validate(model.type, params));
    }
    return results;
  }

  // ============================================
  // Events (tests: EVT-001 à EVT-006)
  // ============================================

  // EVT-001: trigger onRegister
  // EVT-003: support multiple callbacks
  // EVT-006: pass (type, model)
  onRegister(callback: RegisterCallback): void {
    this.callbacks.add(callback);
  }

  // EVT-002: offRegister works
  // EVT-004: removed callback not called
  offRegister(callback: RegisterCallback): void {
    this.callbacks.delete(callback);
  }

  // ============================================
  // State (tests: CLR-001, CLR-002, SIZ-001 à SIZ-004)
  // ============================================

  // CLR-001: clear all
  // CLR-002: clear when empty
  clear(): void {
    this.models.clear();
  }

  // SIZ-001: size after register
  // SIZ-002: size after clear
  // SIZ-003: invalid registrations don't count
  // SIZ-004: registerAll accuracy
  size(): number {
    return this.models.size;
  }

  // ============================================
  // Private utilities (exigés par les tests)
  // ============================================

  // GET-004 / LISTALL-003: deep copy
  private deepCopy<T>(obj: T): T {
    // Fonction → retourner directement (préserver customValidator)
    if (typeof obj === 'function') {
      return obj;
    }
    // Tableau → copier récursivement
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCopy(item)) as any;
    }
    // Objet → copier récursivement
    if (obj && typeof obj === 'object') {
      const copy: any = {};
      for (const key of Object.keys(obj)) {
        copy[key] = this.deepCopy((obj as any)[key]);
      }
      return copy;
    }
    // Valeur primitive
    return obj;
  }

  // REG-006: invalid model check
  // VALIDATION: check pins, params, etc.
  private validateModel(model: ComponentModel): void {
    // Required by tests: pins must exist
    if (!model.pins || model.pins.length === 0) {
      throw new Error('Invalid model: must have at least one pin');
    }

    // Duplicate pin check (from fixtures)
    const pinIds = new Set<string>();
    for (const pin of model.pins || []) {
      if (!pin.id) {
        throw new Error('Pin id is required');
      }
      if (pinIds.has(pin.id)) {
        throw new Error(`Duplicate pin id: ${pin.id}`);
      }
      pinIds.add(pin.id);
    }

    // Validate params (from fixtures)
    for (const param of model.params || []) {
      if (!param.id) {
        throw new Error('Parameter id is required');
      }
      if (param.required && param.default === undefined) {
        throw new Error(`Required parameter "${param.id}" must have a default value`);
      }
      if (param.type === 'number' && param.default !== undefined) {
        const num = Number(param.default);
        if (isNaN(num)) {
          throw new Error(`Default value for "${param.id}" must be a number`);
        }
        if (param.min !== undefined && num < param.min) {
          throw new Error(`Default value for "${param.id}" must be >= ${param.min}`);
        }
        if (param.max !== undefined && num > param.max) {
          throw new Error(`Default value for "${param.id}" must be <= ${param.max}`);
        }
      }
    }
  }
}