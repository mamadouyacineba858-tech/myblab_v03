import { describe, it, expect } from 'vitest'
import { getAssemblyProfile } from '../assemblyProfiles.js'

describe('MB-L1-PROP-005 V2 — capacitor physical visual correction', () => {
  it('keeps CAPACITOR mechanical roots unchanged and upgrades only the lead material style', () => {
    const profile = getAssemblyProfile('CAPACITOR')
    expect(profile.kind).toBe('through-hole')
    expect(profile.leads.pinA.root).toEqual({ dx: 23, dy: 27 })
    expect(profile.leads.pinB.root).toEqual({ dx: 47, dy: 27 })
    expect(profile.leads.pinA.style).toBe('wire-glossy')
    expect(profile.leads.pinB.style).toBe('wire-glossy')
  })

  it('does not change neighboring through-hole styles', () => {
    expect(getAssemblyProfile('LED').leads.anode.style).toBe('wire')
    expect(getAssemblyProfile('POTENTIOMETER').leads.left.style).toBe('lug')
  })
})
