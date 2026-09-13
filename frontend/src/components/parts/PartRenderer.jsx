import { useMemo } from 'react';
import { createDefaultVisualizationManager } from '../../visualization/factory.js';
import { DEFAULT_REGISTRATIONS } from '../../visualization/defaultRegistrations.js';
import { getVisualState } from '../../visualization/visualStateRegistry.js';
import { resolveComponentProperties } from '../../config/componentProperties.js';
import { resolveComponentParameters } from '../../simulator/resolveComponentParameters.js';
import '../../visualization/defaultVisualStateRegistrations.js';

/**
 * PartRenderer — Rendu des composants électroniques
 *
 * Délègue la sélection et le rendu du composant au VisualizationManager.
 *
 * MB-VIS-COMP-002 : la logique métier spécifique à LED/RGB_LED (calcul de
 * isOn / r,g,b à partir des signaux de pins) n'est plus branchée
 * littéralement ici (`if (type === 'LED') ...`). Elle est déclarée dans le
 * Visual State Registry (visualization/visualStateRegistry.js +
 * defaultVisualStateRegistrations.js) et consultée génériquement via
 * getVisualState(type, context). Un type sans resolver enregistré
 * fonctionne normalement (getVisualState retourne {}) : ajouter un
 * composant visuel statique ne nécessite donc plus de modifier ce
 * fichier.
 */
export function PartRenderer({
  type,
  uid,
  pinSignals,
  state,
  properties,
  parameters,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onMouseDown,
  onClick,
  ...otherProps
}) {
  // Protection si pinSignals est absent (conservée de l'ancienne version)
  const signals = pinSignals instanceof Map ? pinSignals : new Map();

  // Création du manager une seule fois (mémorisé)
  const manager = useMemo(
    () => createDefaultVisualizationManager(DEFAULT_REGISTRATIONS),
    []
  );

  // Construction des props communes à tous les renderers
  // L1-PROP-003 : `properties` est résolu ICI, génériquement (schéma déclaré
  // par componentDefinitions.js), pour que tout renderer reçoive un contrat
  // déjà normalisé (defaults appliqués) sans jamais brancher sur `type`.
  // L1-PROP-004 : même principe pour `parameters` (schéma électrique
  // canonique, canonicalRegistry.js) via la primitive centrale unique
  // resolveComponentParameters — un renderer comme ResistorPart reçoit donc
  // toujours un jeu de paramètres complet (defaults + overrides validés),
  // sans qu'aucun `if (type === "RESISTOR")` n'apparaisse ici.
  let rendererProps = {
    uid,
    pinSignals: signals,
    state,
    properties: resolveComponentProperties(type, properties),
    parameters: resolveComponentParameters(type, parameters),
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onMouseDown,
    onClick,
    ...otherProps,
  };

  // Enrichissement des props via le Visual State Registry (comportement
  // strictement conservé pour LED/RGB_LED ; {} pour tout autre type).
  rendererProps = { ...rendererProps, ...getVisualState(type, { uid, pinSignals: signals }) };

  // Délégation complète au VisualizationManager
  return manager.render(type, rendererProps);
}