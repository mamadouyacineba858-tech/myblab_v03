import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * A3-SW2 — DIP Switch 4 positions, renderer CSS/DOM provisoire : aucun
 * asset raster validé n'a été fourni pour ce composant (ticket §9) —
 * FUNCTIONAL, Canvas visuel à qualifier, une correction raster A3-SW2-R1
 * pourra suivre si le CSA/Founder le demande (même trajectoire que
 * SLIDE_SWITCH/A3-SW1 -> A3-SW1-R1).
 *
 * Contrat de props : `channelStates` (Record<canal, "on"|"off">) et
 * `onPointerDown`/`onPointerMove`/`onClick` sont fournis par
 * CircuitComponent.jsx via la capacité déclarative
 * `interaction.type === "multi-state-toggle"` (componentDefinitions.js) —
 * ce fichier ne connaît lui-même aucun mécanisme d'historique/undo. Chaque
 * actuateur porte `data-channel-id` (convention de présentation générique,
 * lue par CircuitComponent.jsx pour router le clic vers le bon canal) —
 * jamais un branchement sur un nom de type.
 */
export function DipSwitchPart({
  channelStates,
  onPointerDown,
  onPointerMove,
  onClick,
}) {
  const def = getComponentDef('DIP_SWITCH')
  const width = def?.width ?? 112
  const height = def?.height ?? 56
  const channels = def?.interaction?.channels ?? []
  const states = channelStates && typeof channelStates === 'object' ? channelStates : {}

  const actuatorWidth = 10
  const actuatorHeight = 22
  const spacing = 28
  const firstCenterX = 14

  return (
    <div
      className="part-dip-switch"
      aria-label={`Interrupteur DIP 4 positions : ${channels.map((ch) => `${ch}=${states[ch] === 'on' ? 'ON' : 'OFF'}`).join(', ')}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onClick={onClick}
      style={{
        position: 'relative',
        width,
        height,
        boxSizing: 'border-box',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div
        className="part-dip-switch__housing"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4,
          background: '#1e293b',
          border: '1px solid #0f172a',
        }}
      />
      <span
        className="part-dip-switch__on-label"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 4,
          top: 2,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 6,
          fontWeight: 700,
          color: '#94a3b8',
          letterSpacing: 0.5,
        }}
      >
        ON
      </span>

      {channels.map((channelId, index) => {
        const isOn = states[channelId] === 'on'
        const centerX = firstCenterX + index * spacing
        return (
          <div
            key={channelId}
            className={`part-dip-switch__channel${isOn ? ' is-on' : ' is-off'}`}
            data-channel-id={channelId}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: centerX - actuatorWidth / 2,
              top: 8,
              width: actuatorWidth,
              height: actuatorHeight,
              borderRadius: 2,
              background: '#0f172a',
              border: '1px solid #334155',
            }}
          >
            <div
              className="part-dip-switch__actuator"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 1,
                top: isOn ? 1 : actuatorHeight / 2,
                width: actuatorWidth - 4,
                height: actuatorHeight / 2 - 2,
                borderRadius: 1,
                background: isOn ? '#f97316' : '#cbd5e1',
                transition: 'top 0.1s ease-out',
                pointerEvents: 'none',
              }}
            />
            <span
              className="part-dip-switch__number"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: actuatorHeight + 2,
                transform: 'translateX(-50%)',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: 6,
                fontWeight: 700,
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            >
              {channelId}
            </span>
          </div>
        )
      })}
    </div>
  )
}
