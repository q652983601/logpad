import fs from 'fs'
import path from 'path'
import { createEpisode, getEpisode, updateEpisodeStatus } from './db'
import { initRun, runExists } from './pipeline'
import { validateRunId } from './validation'

const MEDIA_CODEX_ROOT = process.env.MEDIA_CODEX_ROOT
  ? path.resolve(process.env.MEDIA_CODEX_ROOT)
  : path.resolve('/Users/wilsonlu/Desktop/Ai/media/media-codex')

const ACTIVE_EPISODES_DIR = path.join(
  MEDIA_CODEX_ROOT,
  'business-folder-os',
  '03-episodes',
  'active'
)

interface ActiveEpisodeCandidate {
  id: string
  title: string
  status: string
  description: string
  activeFolder: string
}

function readText(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function readField(markdown: string, key: string): string {
  const line = markdown.split('\n').find(item => item.trim().startsWith(`- ${key}:`))
  return line?.split(':').slice(1).join(':').trim() || ''
}

function statusFromStage(stage: string): string {
  if (stage.includes('shooting')) return 'shooting'
  if (stage.includes('editing')) return 'editing'
  if (stage.includes('script')) return 'scripting'
  if (stage.includes('research')) return 'researching'
  return 'inbox'
}

export function listActiveEpisodeCandidates(): ActiveEpisodeCandidate[] {
  if (!fs.existsSync(ACTIVE_EPISODES_DIR)) return []

  return fs.readdirSync(ACTIVE_EPISODES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const activeFolder = path.join(ACTIVE_EPISODES_DIR, entry.name)
      const brief = readText(path.join(activeFolder, '00-episode-brief.md'))
      const title = readField(brief, 'working_title') || entry.name
      const stage = readField(brief, 'current_stage')
      const description = brief
        .split('## 这期为什么符合当前方向')[1]
        ?.split('##')[0]
        ?.trim()
        .replace(/\s+/g, ' ')
        || '来自 business-folder-os 的当前 active episode。'

      return {
        id: readField(brief, 'episode_id') || entry.name,
        title,
        status: statusFromStage(stage),
        description,
        activeFolder,
      }
    })
}

export function syncActiveEpisodes(): { imported: string[]; existing: string[] } {
  const imported: string[] = []
  const existing: string[] = []

  for (const candidate of listActiveEpisodeCandidates()) {
    if (!validateRunId(candidate.id)) {
      continue
    }

    if (!runExists(candidate.id)) {
      initRun(candidate.id, candidate.title, {
        description: candidate.description,
        platforms: ['youtube', 'douyin-main', 'bilibili'],
      })
      imported.push(candidate.id)
    } else {
      existing.push(candidate.id)
    }

    const episode = getEpisode(candidate.id)
    if (!episode) {
      createEpisode({
        id: candidate.id,
        title: candidate.title,
        status: candidate.status,
        platforms: 'youtube,douyin-main,bilibili',
        description: candidate.description,
        target_platforms: 'youtube,douyin-main,bilibili',
        run_path: path.join(MEDIA_CODEX_ROOT, 'runs', candidate.id),
      })
    } else if (episode.status === 'inbox' || episode.status === 'unknown') {
      updateEpisodeStatus(candidate.id, candidate.status)
    }
  }

  return { imported, existing }
}
