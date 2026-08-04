/**
 * Document factice pour les tests des Command Handlers.
 * Structure basée sur ADR-005 et ADR-008.
 */
export const createTestDocument = (overrides = {}) => ({
  components: [
    {
      id: 'R1',
      type: 'resistor',
      position: { x: 100, y: 100 },
      parameters: { resistance: 1000 },
    },
    {
      id: 'C1',
      type: 'capacitor',
      position: { x: 200, y: 200 },
      parameters: { capacitance: 0.001 },
    },
    {
      id: 'LED1',
      type: 'LED',
      position: { x: 300, y: 100 },
      parameters: { color: 'red' },
    },
  ],
  wires: [
    {
      id: 'W1',
      pinA: { componentId: 'R1', pinId: 'pin1' },
      pinB: { componentId: 'C1', pinId: 'pin1' },
    },
    {
      id: 'W2',
      pinA: { componentId: 'R1', pinId: 'pin2' },
      pinB: { componentId: 'LED1', pinId: 'anode' },
    },
  ],
  ...overrides,
});
