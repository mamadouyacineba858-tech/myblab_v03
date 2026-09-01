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
import { resolvePresentation } from './visualContract.js';

/**
 * Liste des associations type → composant (+ déclaration `visual` optionnelle)
 *
 * ⚠️ Les types doivent correspondre à ceux utilisés dans le système.
 *
 * `visual` (MB-VIS-INDUSTRIAL-001) est une DÉCLARATION DE PRÉSENTATION
 * optionnelle, consommée génériquement via `resolvePresentation()`
 * (visualContract.js) — jamais par un `type === "…"` dans le renderer :
 *   - `backend`    : 'svg' (défaut) | 'raster' | 'r3f'
 *   - `bareBody`   : le wrapper .circuit-component__body ne pose aucun habillage
 *   - `markerless` : les marqueurs visuels de <Pin> ne sont pas rendus
 * Une entrée sans `visual` → backend 'svg', habillage + marqueurs par défaut
 * (comportement historique strictement préservé).
 *
 * @type {Array<{type: string, component: React.ComponentType, visual?: {backend?: string, bareBody?: boolean, markerless?: boolean}}>}
 */
export const DEFAULT_REGISTRATIONS = [
  // LED : renderer SVG qui dessine lui-même son fond et ses pattes -> pas
  // d'habillage de carte, pas de marqueur de pin (comportement pré-existant,
  // auparavant codé par `type === "LED"` dans CircuitComponent.jsx).
  { type: 'LED', component: LedPart, visual: { markerless: true, bareBody: true } },
  // RESISTOR : premier composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-001B). raster => bareBody + markerless dérivés.
  { type: 'RESISTOR', component: ResistorPart, visual: { backend: 'raster' } },
  { type: 'ARDUINO', component: ArduinoPart },
  { type: 'BUTTON', component: ButtonPart },
 { type: 'BUTTON_LATCHING', component: LatchingButtonPart },
  { type: 'POWER', component: PowerPart },
  { type: 'CAPACITOR', component: CapacitorPart },
  { type: 'BUZZER', component: BuzzerPart },
  { type: 'POTENTIOMETER', component: PotentiometerPart },
  { type: 'LDR', component: LdrPart },
  { type: 'THERMISTOR', component: ThermistorPart },
  // DIODE : deuxième composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-002). raster => bareBody + markerless dérivés, via le
  // même mécanisme déclaratif que RESISTOR — aucun code central spécifique.
  { type: 'DIODE', component: DiodePart, visual: { backend: 'raster' } },
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

const VISUAL_BY_TYPE = new Map(
  DEFAULT_REGISTRATIONS.map((entry) => [entry.type, entry.visual])
);

/**
 * Déclaration `visual` brute d'un type (ou `undefined` si l'entrée n'en
 * déclare pas). MB-VIS-INDUSTRIAL-001.
 * @param {string} type
 * @returns {{backend?: string, bareBody?: boolean, markerless?: boolean}|undefined}
 */
export function getComponentVisual(type) {
  return VISUAL_BY_TYPE.get(type);
}

/**
 * Drapeaux de présentation résolus d'un type ({ backend, bareBody, markerless }).
 * Accesseur statique (lit DEFAULT_REGISTRATIONS) équivalent à
 * `VisualizationManager.getPresentation(type)` — même source, même résultat.
 * Utilisé par CircuitComponent.jsx (qui ne détient pas de manager) et par les
 * gardes de test. MB-VIS-INDUSTRIAL-001.
 * @param {string} type
 * @returns {{ backend: 'svg'|'raster'|'r3f', bareBody: boolean, markerless: boolean }}
 */
export function getComponentPresentation(type) {
  return resolvePresentation(VISUAL_BY_TYPE.get(type));
}

export default DEFAULT_REGISTRATIONS;