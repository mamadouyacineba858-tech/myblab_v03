import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Pin } from '../Pin.jsx'

describe('A13-HOVER-UX shared electrical pin behavior', () => {
  const props = {
    pinId: 'D3', componentUid: 'uno1', left: 12, top: 9,
    onPinClick: vi.fn(), startWireGesture: vi.fn(),
  }

  it('does not use delayed browser title or React hover state', () => {
    const { container } = render(<Pin {...props} label="D3" />)
    const pin = container.querySelector('.myblab-pin')
    expect(pin.getAttribute('title')).toBeNull()
    expect(pin.dataset.hoverLabel).toBe('D3')
    fireEvent.mouseEnter(pin)
    expect(pin.classList.contains('myblab-pin--hover')).toBe(false)
  })

  it('preserves wire gesture and contact identity', () => {
    const onPinClick = vi.fn()
    const startWireGesture = vi.fn()
    const { container } = render(<Pin {...props} contactId="c1" onPinClick={onPinClick} startWireGesture={startWireGesture} />)
    const pin = container.querySelector('.myblab-pin')
    expect(pin.dataset.wireContact).toBe('c1')
    fireEvent.pointerDown(pin)
    expect(startWireGesture).toHaveBeenCalledOnce()
    fireEvent.click(pin)
    expect(onPinClick).toHaveBeenCalledWith('D3', 'c1')
  })

  it('keeps markerless contacts targetable for hover and wiring', () => {
    const { container } = render(<Pin {...props} hideVisualMarker />)
    const pin = container.querySelector('.myblab-pin')
    expect(pin.classList.contains('myblab-pin--markerless')).toBe(true)
    expect(pin.style.opacity).toBe('')
    expect(pin.dataset.hoverLabel).toBe('D3')
  })
})
