/**
 * SoilMoistureSensorModel — Modèle électrique du capteur d'humidité du sol
 * (A7-C3, YL-69 probe + YL-38 interface module).
 *
 * Capteur analogique + numérique alimenté à 4 broches (VCC/AO/DO/GND),
 * modélisé au niveau de simulation actuel de MYBlab par deux paramètres
 * normalisés [0,1] (voir DECLARED_PARAMETER_SCHEMA.SOIL_MOISTURE_SENSOR dans
 * canonicalRegistry.js) : `analogRatio` (niveau analogique EFFECTIF, produit
 * par environmentalResponseRegistry.js sous stimulus MOISTURE, fallback 1
 * sinon) et `threshold` (seuil d'instance persistant pour la sortie DO).
 * Aucun modèle de bruit, de temps de réponse, de courant de repos ou de
 * charge AO/DO : hors périmètre.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — même corps de validation bornée
 * que Tmp36Model/PotentiometerModel, adapté aux deux paramètres [0,1].
 *
 * La contribution au solveur DC (alimentation VCC/GND requise, exposition de
 * AO) est portée séparément par simulator/dcContributionRegistry.js
 * (soilMoistureSensorDc). La sortie numérique DO est portée par
 * simulator/digitalContributionRegistry.js (soilMoistureSensorDigital). La
 * production de `analogRatio` EFFECTIF à partir du stimulus environnemental
 * MOISTURE est portée par environmentalResponseRegistry.js — aucune des
 * trois logiques n'est dupliquée ici.
 */

export const SoilMoistureSensorModel = {
  type: 'SOIL_MOISTURE_SENSOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    for (const key of ['analogRatio', 'threshold']) {
      if (typeof params[key] !== 'number') return false
      if (!Number.isFinite(params[key])) return false
      if (params[key] < 0 || params[key] > 1) return false
    }
    return true
  },
}
