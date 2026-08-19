/**
 * Registrations par défaut des composants de visualisation
 *
 * Ce fichier centralise les associations type → composant React.
 * Utilisé par PartRenderer.jsx (migration effectuée, MB-VIS-001-B) : chaque
 * rendu de composant passe par ce tableau via
 * createDefaultVisualizationManager(DEFAULT_REGISTRATIONS).
 *
 * ⚠️ ATTENTION : N'ajouter que des imports correspondant à des fichiers
 * existant dans src/components/parts/.
 *
 * [MB-VIS-002 — GATE 1] Commentaire corrigé : il décrivait une migration
 * "à venir" alors qu'elle est déjà en production. Correction explicitement
 * autorisée par le ruling CSA (GATE 1 PASS), sans autre changement à ce
 * fichier.
 */

// Imports des composants de visualisation EXISTANTS
// 🇫🇷 Liste basée sur le dépôt réel — ne pas inventer d'imports
import { LedPart } from '../components/parts/LedPart.jsx';
import { ResistorPart } from '../components/parts/ResistorPart.jsx';
import { ArduinoPart } from '../components/parts/ArduinoPart.jsx';
import { ButtonPart } from '../components/parts/ButtonPart.jsx';
import { LatchingButtonPart } from '../components/parts/LatchingButtonPart.jsx';
import { PowerPart } from '../components/parts/PowerPart.jsx';
import { CapacitorPart } from '../components/parts/CapacitorPart.jsx';
import { BuzzerPart } from '../components/parts/BuzzerPart.jsx';
import { PotentiometerPart } from '../components/parts/PotentiometerPart.jsx';
import { LdrPart } from '../components/parts/LdrPart.jsx';
import { ThermistorPart } from '../components/parts/ThermistorPart.jsx';
import { DiodePart } from '../components/parts/DiodePart.jsx';
import { RgbLedPart } from '../components/parts/RgbLedPart.jsx';
import { NpnTransistorPart } from '../components/parts/NpnTransistorPart.jsx';
import { ServoPart } from '../components/parts/ServoPart.jsx';
import { DcMotorPart } from '../components/parts/DcMotorPart.jsx';

/**
 * Liste des associations type → composant
 * 
 * ⚠️ Les types doivent correspondre à ceux utilisés dans le système.
 * 
 * @type {Array<{type: string, component: React.ComponentType}>}
 */
export const DEFAULT_REGISTRATIONS = [
  { type: 'LED', component: LedPart },
  { type: 'RESISTOR', component: ResistorPart },
  { type: 'ARDUINO', component: ArduinoPart },
  { type: 'BUTTON', component: ButtonPart },
 { type: 'BUTTON_LATCHING', component: LatchingButtonPart },
  { type: 'POWER', component: PowerPart },
  { type: 'CAPACITOR', component: CapacitorPart },
  { type: 'BUZZER', component: BuzzerPart },
  { type: 'POTENTIOMETER', component: PotentiometerPart },
  { type: 'LDR', component: LdrPart },
  { type: 'THERMISTOR', component: ThermistorPart },
  { type: 'DIODE', component: DiodePart },
  { type: 'RGB_LED', component: RgbLedPart },
  { type: 'NPN_TRANSISTOR', component: NpnTransistorPart },
  { type: 'SERVO', component: ServoPart },
  { type: 'DC_MOTOR', component: DcMotorPart },
];

/**
 * Retourne uniquement la liste des types disponibles
 * @returns {string[]}
 */
export function getAvailableTypes() {
  return DEFAULT_REGISTRATIONS.map(entry => entry.type);
}

/**
 * Recherche un composant par son type
 * @param {string} type
 * @returns {React.ComponentType|null}
 */
export function getComponentByType(type) {
  const entry = DEFAULT_REGISTRATIONS.find(entry => entry.type === type);
  return entry ? entry.component : null;
}

export default DEFAULT_REGISTRATIONS;