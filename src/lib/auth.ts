export function getAccessSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.LOGPAD_ACCESS_TOKEN || env.LOGPAD_PASSWORD || ''
  const trimmed = secret.trim()
  return trimmed.length > 0 ? trimmed : null
}

function decodeBasicCredentials(value: string): string | null {
  try {
    const decoded = atob(value)
    const separator = decoded.indexOf(':')
    if (separator === -1) return null
    return decoded.slice(separator + 1)
  } catch {
    return null
  }
}

export function isAuthorizedRequest(headers: Headers, secret: string | null = getAccessSecret()): boolean {
  if (!secret) return true

  const authorization = headers.get('authorization')
  if (!authorization) return false

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim() === secret
  }

  if (authorization.startsWith('Basic ')) {
    return decodeBasicCredentials(authorization.slice('Basic '.length).trim()) === secret
  }

  return false
}
