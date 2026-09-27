/**
 * InvalidDigitalTransitionError — A12-NEOPIXEL-PREQ-EVENT-TIMING-001.
 *
 * Levée lorsqu'une transition numérique horodatée (ou une borne de
 * consommation) est invalide. Le store de transitions n'est jamais modifié
 * lorsque cette erreur est levée : la validation précède toute mutation.
 */
export class InvalidDigitalTransitionError extends Error {
  constructor(reason, value) {
    super(`InvalidDigitalTransitionError: ${reason} (received "${String(value)}").`)
    this.name = 'InvalidDigitalTransitionError'
    this.reason = reason
    this.value = value
  }
}
