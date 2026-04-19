import { describe, expect, it } from 'vitest'
import { getAccessSecret, isAuthorizedRequest } from './auth'

function headers(value?: string) {
  const h = new Headers()
  if (value) h.set('authorization', value)
  return h
}

describe('auth helpers', () => {
  it('allows requests when no local secret is configured', () => {
    expect(getAccessSecret({} as NodeJS.ProcessEnv)).toBeNull()
    expect(isAuthorizedRequest(headers(), null)).toBe(true)
  })

  it('accepts bearer and basic credentials when a secret is configured', () => {
    expect(isAuthorizedRequest(headers('Bearer local-secret'), 'local-secret')).toBe(true)
    const basic = Buffer.from('wilson:local-secret').toString('base64')
    expect(isAuthorizedRequest(headers(`Basic ${basic}`), 'local-secret')).toBe(true)
  })

  it('rejects missing or mismatched credentials when protected', () => {
    expect(isAuthorizedRequest(headers(), 'local-secret')).toBe(false)
    expect(isAuthorizedRequest(headers('Bearer wrong'), 'local-secret')).toBe(false)
  })
})
