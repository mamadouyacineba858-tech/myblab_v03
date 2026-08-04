/**
 * Document factice pour les tests du Validation Engine.
 * Conforme à ADR-001 (Document State).
 */
export const createTestDocument = (overrides = {}) => ({
  components: [
    { id: 'R1', type: 'resistor', parameters: { resistance: 1000 } },
    { id: 'C1', type: 'capacitor', parameters: { capacitance: 0.001 } },
    { id: 'V1', type: 'voltage_source', parameters: { voltage: 5 } },
  ],
  wires: [
    { id: 'W1', pinA: { componentId: 'R1', pinId: 'pin1' }, pinB: { componentId: 'C1', pinId: 'pin1' } },
    { id: 'W2', pinA: { componentId: 'R1', pinId: 'pin2' }, pinB: { componentId: 'V1', pinId: 'positive' } },
  ],
  ...overrides,
});
