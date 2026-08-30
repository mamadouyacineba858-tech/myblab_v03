/**
 * Enregistrements par défaut du Visual State Registry — MB-VIS-COMP-002.
 *
 * Remplace l'ancien branchement de PartRenderer.jsx :
 *   if (type === 'LED') { const { on } = getLedState(...); ... }
 *   else if (type === 'RGB_LED') { const { r, g, b } = getRgbLedState(...); ... }
 *
 * Comportement strictement identique à l'ancien code : mêmes fonctions de
 * lecture (simulator/engine.js), mêmes props produites (isOn / r,g,b).
 *
 * Importé une seule fois pour effet de bord (registerVisualState) par
 * PartRenderer.jsx, sur le modèle déjà utilisé par
 * visualization/defaultRegistrations.js pour le RendererRegistry.
 */
import { getLedState, getRgbLedState } from '../simulator/engine.js'
import { registerVisualState } from './visualStateRegistry.js'

registerVisualState('LED', ({ uid, pinSignals }) => {
  const { on } = getLedState(uid ?? "", pinSignals)
  return { isOn: on }
})

registerVisualState('RGB_LED', ({ uid, pinSignals }) => {
  const { r, g, b } = getRgbLedState(uid ?? "", pinSignals)
  return { r, g, b }
})
