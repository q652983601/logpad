import { NextResponse } from 'next/server'
import { readScript, writeScript, backupScript, listScriptBackups, readScriptBackup } from '@/lib/pipeline'
import { validateRunId, validateScriptData } from '@/lib/validation'

function errorResponse(error: string, details?: string, status = 500) {
  return NextResponse.json({ error, details }, { status })
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id || !validateRunId(id)) {
      return errorResponse('Invalid id parameter', undefined, 400)
    }

    const { searchParams } = new URL(request.url)
    const backups = searchParams.get('backups')
    const backup = searchParams.get('backup')

    if (backups === 'true') {
      const list = listScriptBackups(id)
      return NextResponse.json(list)
    }

    if (backup) {
      const data = readScriptBackup(id, backup)
      if (!data) {
        return errorResponse('Backup not found', undefined, 404)
      }
      return NextResponse.json(data)
    }

    const script = readScript(id)
    if (!script) {
      return errorResponse('Script not found', undefined, 404)
    }
    return NextResponse.json(script)
  } catch (err) {
    return errorResponse('Failed to read script', err instanceof Error ? err.message : undefined, 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id || !validateRunId(id)) {
      return errorResponse('Invalid id parameter', undefined, 400)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('Invalid JSON body', undefined, 400)
    }

    const validation = validateScriptData(body)
    if (!validation.valid) {
      return errorResponse('Invalid script data', validation.errors.join('; '), 400)
    }

    backupScript(id)
    writeScript(id, body)
    return NextResponse.json({ success: true })
  } catch (err) {
    return errorResponse('Failed to write script', err instanceof Error ? err.message : undefined, 500)
  }
}
