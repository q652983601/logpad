import { NextResponse } from 'next/server'
import { getAsset, updateAsset, deleteAsset, listEpisodes } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const asset = getAsset(id)
    if (!asset) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const episodes = listEpisodes()
    const episode = asset.episode_id ? episodes.find(e => e.id === asset.episode_id) : null

    return NextResponse.json({ ...asset, episode_title: episode?.title || null })
  } catch (err) {
    console.error('GET /api/assets/[id] error:', err)
    return NextResponse.json({ error: 'Failed to get asset' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const body = await request.json()
    const { source, episode_id, name, status } = body

    updateAsset(id, {
      source,
      episode_id: episode_id === undefined ? undefined : episode_id,
      name,
      status,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/assets/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const asset = getAsset(id)
    if (!asset) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Delete file from disk
    try {
      const filePath = path.resolve(process.cwd(), 'public', asset.path)
      const publicDir = path.resolve(process.cwd(), 'public')
      const relativePath = path.relative(publicDir, filePath)
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        console.warn('Unsafe asset path detected, skipping file deletion:', asset.path)
      } else {
        await unlink(filePath)
      }
    } catch (e) {
      console.warn('Failed to delete file:', e)
    }

    deleteAsset(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/assets/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
  }
}
