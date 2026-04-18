const VALID_STATUSES = [
  'inbox',
  'researching',
  'scripting',
  'shooting',
  'editing',
  'published',
  'archived',
]

export function validateEpisodeId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  // Example format: YYYYMMDD-xxxx (8 digits + dash + 4 chars)
  return /^\d{8}-[a-z0-9]{4}$/i.test(id)
}

export function validateRunId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  // Reject path traversal attempts and invalid characters
  if (id.includes('..') || id.includes('/') || id.includes('\\')) return false
  // Must be non-empty and reasonable length
  if (id.length < 1 || id.length > 120) return false
  // Allow letters, digits, hyphens, underscores, and dots (but not ..)
  return /^[\w\-.]+$/i.test(id)
}

export function validateScriptData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    errors.push('Script data must be an object')
    return { valid: false, errors }
  }

  const d = data as Record<string, unknown>

  if (d.title !== undefined && typeof d.title !== 'string') {
    errors.push('title must be a string')
  }
  if (d.content !== undefined && typeof d.content !== 'string') {
    errors.push('content must be a string')
  }
  if (d.sections !== undefined && !Array.isArray(d.sections)) {
    errors.push('sections must be an array')
  }
  if (d.duration !== undefined && typeof d.duration !== 'number') {
    errors.push('duration must be a number')
  }

  return { valid: errors.length === 0, errors }
}

export function validateStatus(status: string): boolean {
  return VALID_STATUSES.includes(status)
}
