export interface Pagination {
  limit: number
  offset: number
}

function readBoundedInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export function parsePagination(searchParams: URLSearchParams, defaults: { limit?: number; maxLimit?: number } = {}): Pagination {
  const maxLimit = defaults.maxLimit ?? 200
  const defaultLimit = Math.min(defaults.limit ?? 100, maxLimit)
  return {
    limit: readBoundedInt(searchParams.get('limit'), defaultLimit, 1, maxLimit),
    offset: readBoundedInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER),
  }
}
