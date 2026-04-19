import { NextResponse } from 'next/server'
import fs from 'fs'
import { Readable } from 'stream'
import { getAsset } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export const runtime = 'nodejs'

function streamResponse(filePath: string, fileSize: number, mimeType: string, filename: string, request: Request): Response {
  const baseHeaders = {
    'Accept-Ranges': 'bytes',
    'Content-Type': mimeType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
  }
  const range = request.headers.get('range')

  if (!range) {
    const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream
    return new Response(stream, {
      headers: {
        ...baseHeaders,
        'Content-Length': String(fileSize),
      },
    })
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range)
  if (!match) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileSize}` },
    })
  }

  const [, rawStart, rawEnd] = match
  let start = rawStart ? Number(rawStart) : 0
  let end = rawEnd ? Number(rawEnd) : fileSize - 1

  if (!rawStart && rawEnd) {
    const suffixLength = Number(rawEnd)
    start = Math.max(fileSize - suffixLength, 0)
    end = fileSize - 1
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= fileSize) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileSize}` },
    })
  }

  end = Math.min(end, fileSize - 1)
  const chunkSize = end - start + 1
  const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream
  return new Response(stream, {
    status: 206,
    headers: {
      ...baseHeaders,
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    },
  })
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const asset = getAsset(id)
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!asset.path.startsWith('local:')) {
      return NextResponse.redirect(new URL(asset.path, request.url))
    }

    const filePath = asset.path.slice('local:'.length)
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json({ error: 'Local file not found' }, { status: 404 })
    }

    const fileSize = fs.statSync(filePath).size
    return streamResponse(filePath, fileSize, asset.mime_type || 'application/octet-stream', asset.name, request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read asset file'
    console.error('GET /api/assets/[id]/file error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
