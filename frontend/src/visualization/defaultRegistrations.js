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
  // LED : troisième composant à backend raster (paquet d'assets validé
  // MB-VIS-PROTOTYPE-003, états `off` / `on` — luminescence cuite dans
  // `led.on.*`). raster => bareBody + markerless dérivés, via le même
  // mécanisme déclaratif que RESISTOR / DIODE — aucun code central spécifique.
  { type: 'LED', component: LedPart, visual: { backend: 'raster' } },
  // RESISTOR : premier composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-001B). raster => bareBody + markerless dérivés.
  { type: 'RESISTOR', component: ResistorPart, visual: { backend: 'raster' } },
  { type: 'ARDUINO', component: ArduinoPart },
  // BUTTON : huitième composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-008, états `released` / `pressed`). raster => bareBody +
  // markerless dérivés, même mécanisme déclaratif que RESISTOR / DIODE /
  // LED / CAPACITOR / LDR / THERMISTOR / DC_MOTOR.
  { type: 'BUTTON', component: ButtonPart, visual: { backend: 'raster' } },
  // BUTTON_LATCHING : neuvième composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-008, états `off` / `on`, rocker rouge cuit dans les
  // deux assets). raster => bareBody + markerless dérivés, même mécanisme
  // déclaratif que les autres composants raster.
  { type: 'BUTTON_LATCHING', component: LatchingButtonPart, visual: { backend: 'raster' } },
  { type: 'POWER', component: PowerPart },
  // CAPACITOR : quatrième composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-004, état unique `default`). raster => bareBody +
  // markerless dérivés, même mécanisme déclaratif que RESISTOR / DIODE / LED.
  { type: 'CAPACITOR', component: CapacitorPart, visual: { backend: 'raster' } },
  // BUZZER : porté au backend raster (asset réaliste validé MB-VIS-COMP-031,
  // état unique `default` — le pipeline n'expose aucun état électrique
  // exploitable, cf. BuzzerPart.jsx §11). raster => bareBody + markerless
  // dérivés, même mécanisme déclaratif que RESISTOR / DIODE / LED / … —
  // aucun code central spécifique.
  { type: 'BUZZER', component: BuzzerPart, visual: { backend: 'raster' } },
  { type: 'POTENTIOMETER', component: PotentiometerPart },
  // LDR : cinquième composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-005, état unique `default`). raster => bareBody +
  // markerless dérivés, même mécanisme déclaratif que RESISTOR / DIODE /
  // LED / CAPACITOR.
  { type: 'LDR', component: LdrPart, visual: { backend: 'raster' } },
  // THERMISTOR : sixième composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-006, état unique `default`). raster => bareBody +
  // markerless dérivés, même mécanisme déclaratif que RESISTOR / DIODE /
  // LED / CAPACITOR / LDR.
  { type: 'THERMISTOR', component: ThermistorPart, visual: { backend: 'raster' } },
  // DIODE : deuxième composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-002). raster => bareBody + markerless dérivés, via le
  // même mécanisme déclaratif que RESISTOR — aucun code central spécifique.
  { type: 'DIODE', component: DiodePart, visual: { backend: 'raster' } },
  { type: 'RGB_LED', component: RgbLedPart },
  { type: 'NPN_TRANSISTOR', component: NpnTransistorPart },
  { type: 'SERVO', component: ServoPart },
  // DC_MOTOR : septième composant à backend raster (asset validé
  // MB-VIS-PROTOTYPE-007 v5, état unique `default`). raster => bareBody +
  // markerless dérivés, même mécanisme déclaratif que RESISTOR / DIODE /
  // LED / CAPACITOR / LDR / THERMISTOR.
  { type: 'DC_MOTOR', component: DcMotorPart, visual: { backend: 'raster' } },
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