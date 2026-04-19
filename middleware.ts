import { NextRequest, NextResponse } from 'next/server'
import { getAccessSecret, isAuthorizedRequest } from './src/lib/auth'

export function middleware(req: NextRequest) {
  const secret = getAccessSecret()
  if (isAuthorizedRequest(req.headers, secret)) {
    return NextResponse.next()
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="LogPad"',
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|sw.js|uploads/).*)',
  ],
}
