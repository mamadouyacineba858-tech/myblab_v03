/**
 * TINKERCAD-004 : registre déclaratif des broches qui constituent une
 * référence de masse (0 V) du circuit au même titre que la borne négative
 * d'une source DC. Open/Closed : ajouter un type = ajouter une entrée ici,
 * sans branche par type dans resolution.js.
 */
const GROUND_REFERENCE_PINS = Object.freeze({
  ARDUINO: Object.freeze(["GND"]),
})

export function getGroundReferencePins(type) {
  return Object.prototype.hasOwnProperty.call(GROUND_REFERENCE_PINS, type)
    ? GROUND_REFERENCE_PINS[type] : []
}
