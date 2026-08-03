import { useMemo } from 'react';
import { getLedState, getRgbLedState } from '../../simulator/engine.js';
import { createDefaultVisualizationManager } from '../../visualization/factory.js';
import { DEFAULT_REGISTRATIONS } from '../../visualization/defaultRegistrations.js';

/**
 * PartRenderer — Rendu des composants électroniques
 * 
 * Délègue la sélection et le rendu du composant au VisualizationManager.
 * La logique métier (LED, RGB_LED) est conservée localement.
 */
export function PartRenderer({
  type,
  uid,
  pinSignals,
  state,
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
  let rendererProps = {
    uid,
    pinSignals: signals,
    state,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onMouseDown,
    onClick,
    ...otherProps,
  };

  // Enrichissement des props selon le type (comportement strictement conservé)
  if (type === 'LED') {
    const { on } = getLedState(uid ?? "", signals);
    rendererProps = { ...rendererProps, isOn: on };
  } else if (type === 'RGB_LED') {
    const { r, g, b } = getRgbLedState(uid ?? "", signals);
    rendererProps = { ...rendererProps, r, g, b };
  }

  // Délégation complète au VisualizationManager
  return manager.render(type, rendererProps);
}