import { describe, expect, it } from 'vitest'
import { parsePagination } from './pagination'

describe('pagination helper', () => {
  it('applies stable defaults', () => {
    expect(parsePagination(new URLSearchParams())).toEqual({ limit: 100, offset: 0 })
  })

  it('clamps limit and offset', () => {
    const params = new URLSearchParams({ limit: '9999', offset: '-20' })
    expect(parsePagination(params, { limit: 50, maxLimit: 200 })).toEqual({ limit: 200, offset: 0 })
  })

  it('falls back for invalid numbers', () => {
    const params = new URLSearchParams({ limit: 'bad', offset: 'later' })
    expect(parsePagination(params, { limit: 25, maxLimit: 100 })).toEqual({ limit: 25, offset: 0 })
  })
})
