import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export function resolveDbPath(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string {
  const configured = env.LOGPAD_DB_PATH || env.DATABASE_URL
  if (!configured) return path.join(cwd, 'data', 'logpad.db')

  if (configured.startsWith('file:')) {
    return new URL(configured).pathname
  }

  if (configured.startsWith('sqlite://')) {
    return configured.slice('sqlite://'.length)
  }

  return path.resolve(configured)
}

const DB_PATH = resolveDbPath()

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initSchema(db)
    migrate(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'inbox',
      platforms TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      run_path TEXT,
      script_path TEXT,
      score_curiosity REAL,
      score_audience REAL,
      score_platform REAL,
      score_feasibility REAL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episode_id TEXT,
      name TEXT,
      type TEXT,
      mime_type TEXT,
      path TEXT,
      size INTEGER DEFAULT 0,
      source TEXT DEFAULT '其他',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (episode_id) REFERENCES episodes(id)
    );

    CREATE TABLE IF NOT EXISTS publishing_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episode_id TEXT,
      platform TEXT,
      title TEXT,
      description TEXT,
      tags TEXT,
      scheduled_at TEXT,
      status TEXT DEFAULT 'draft',
      FOREIGN KEY (episode_id) REFERENCES episodes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
    CREATE INDEX IF NOT EXISTS idx_assets_episode ON assets(episode_id);

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episode_id TEXT,
      platform TEXT,
      views INTEGER DEFAULT 0,
      completion_rate REAL,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      new_followers INTEGER DEFAULT 0,
      avg_watch_time INTEGER,
      ctr REAL,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (episode_id) REFERENCES episodes(id)
    );

    CREATE TABLE IF NOT EXISTS learnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episode_id TEXT,
      tag TEXT,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (episode_id) REFERENCES episodes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_episode ON metrics(episode_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_platform ON metrics(platform);
    CREATE INDEX IF NOT EXISTS idx_learnings_episode ON learnings(episode_id);
    CREATE INDEX IF NOT EXISTS idx_learnings_tag ON learnings(tag);
  `)
}

// ---------- Migration System ----------

interface Migration {
  id: number
  name: string
  sql: string
}

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'add_assets_columns',
    sql: `
      ALTER TABLE assets ADD COLUMN source TEXT;
      ALTER TABLE assets ADD COLUMN size INTEGER;
      ALTER TABLE assets ADD COLUMN mime_type TEXT;
    `,
  },
  {
    id: 2,
    name: 'add_episodes_columns',
    sql: `
      ALTER TABLE episodes ADD COLUMN description TEXT;
      ALTER TABLE episodes ADD COLUMN target_platforms TEXT;
    `,
  },
]

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const appliedRows = db.prepare('SELECT id FROM migrations').all() as { id: number }[]
  const appliedIds = new Set(appliedRows.map(r => r.id))

  for (const migration of MIGRATIONS) {
    if (appliedIds.has(migration.id)) continue

    try {
      db.exec(migration.sql)
      db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('duplicate column name')) {
        db.prepare('INSERT OR IGNORE INTO migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name)
      } else {
        throw err
      }
    }
  }
}

// ---------- Types & CRUD ----------

export interface Episode {
  id: string
  title: string
  status: string
  platforms?: string
  created_at: string
  updated_at: string
  run_path?: string
  script_path?: string
  score_curiosity?: number
  score_audience?: number
  score_platform?: number
  score_feasibility?: number
  description?: string
  target_platforms?: string
}

export function listEpisodes(status?: string): Episode[] {
  const db = getDb()
  if (status) {
    return db.prepare('SELECT * FROM episodes WHERE status = ? ORDER BY updated_at DESC').all(status) as Episode[]
  }
  return db.prepare('SELECT * FROM episodes ORDER BY updated_at DESC').all() as Episode[]
}

export function getEpisode(id: string): Episode | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as Episode | undefined
}

export function createEpisode(episode: Omit<Episode, 'created_at' | 'updated_at'>): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO episodes (id, title, status, platforms, run_path, script_path, score_curiosity, score_audience, score_platform, score_feasibility, description, target_platforms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    episode.id,
    episode.title,
    episode.status,
    episode.platforms ?? null,
    episode.run_path ?? null,
    episode.script_path ?? null,
    episode.score_curiosity ?? null,
    episode.score_audience ?? null,
    episode.score_platform ?? null,
    episode.score_feasibility ?? null,
    episode.description ?? null,
    episode.target_platforms ?? null
  )
}

export function updateEpisodeStatus(id: string, status: string): void {
  const db = getDb()
  db.prepare('UPDATE episodes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id)
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export interface Asset {
  id: number
  episode_id: string | null
  name: string
  type: string
  mime_type: string | null
  path: string
  size: number
  source: string
  status: string
  created_at: string
}

export function listAssets(filters?: { source?: string; episode_id?: string; search?: string; limit?: number; offset?: number }): Asset[] {
  const db = getDb()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters?.source) {
    conditions.push('source = ?')
    params.push(filters.source)
  }
  if (filters?.episode_id) {
    conditions.push('episode_id = ?')
    params.push(filters.episode_id)
  }
  if (filters?.search) {
    conditions.push('name LIKE ?')
    params.push(`%${filters.search}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters?.limit
  const offset = filters?.offset ?? 0
  if (limit) {
    return db.prepare(`SELECT * FROM assets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Asset[]
  }
  return db.prepare(`SELECT * FROM assets ${where} ORDER BY created_at DESC`).all(...params) as Asset[]
}

export function countAssets(filters?: { source?: string; episode_id?: string; search?: string }): number {
  const db = getDb()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters?.source) {
    conditions.push('source = ?')
    params.push(filters.source)
  }
  if (filters?.episode_id) {
    conditions.push('episode_id = ?')
    params.push(filters.episode_id)
  }
  if (filters?.search) {
    conditions.push('name LIKE ?')
    params.push(`%${filters.search}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const row = db.prepare(`SELECT COUNT(*) as count FROM assets ${where}`).get(...params) as { count: number }
  return row.count
}

export function getAsset(id: number): Asset | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset | undefined
}

export function createAsset(asset: Omit<Asset, 'id' | 'created_at'>): number {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO assets (episode_id, name, type, mime_type, path, size, source, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    asset.episode_id ?? null,
    asset.name,
    asset.type,
    asset.mime_type ?? null,
    asset.path,
    asset.size,
    asset.source,
    asset.status
  )
  return Number(result.lastInsertRowid)
}

export function updateAsset(id: number, updates: Partial<Pick<Asset, 'episode_id' | 'source' | 'name' | 'status'>>): void {
  const db = getDb()
  const sets: string[] = []
  const params: (string | number | null)[] = []

  if (updates.episode_id !== undefined) {
    sets.push('episode_id = ?')
    params.push(updates.episode_id)
  }
  if (updates.source !== undefined) {
    sets.push('source = ?')
    params.push(updates.source)
  }
  if (updates.name !== undefined) {
    sets.push('name = ?')
    params.push(updates.name)
  }
  if (updates.status !== undefined) {
    sets.push('status = ?')
    params.push(updates.status)
  }

  if (sets.length === 0) return
  params.push(id)
  db.prepare(`UPDATE assets SET ${sets.join(', ')} WHERE id = ?`).run(...params)
}

export function deleteAsset(id: number): void {
  const db = getDb()
  db.prepare('DELETE FROM assets WHERE id = ?').run(id)
}

// ─── Metrics ───────────────────────────────────────────────────────────────

export interface Metrics {
  id?: number
  episode_id: string
  platform: string
  views: number
  completion_rate: number
  likes: number
  comments: number
  shares: number
  saves: number
  new_followers: number
  avg_watch_time: number
  ctr: number
  recorded_at?: string
}

export function listMetrics(filters?: { episode_id?: string; platform?: string }): Metrics[] {
  const db = getDb()
  if (filters?.episode_id && filters?.platform) {
    return db.prepare('SELECT * FROM metrics WHERE episode_id = ? AND platform = ? ORDER BY recorded_at DESC').all(filters.episode_id, filters.platform) as Metrics[]
  }
  if (filters?.episode_id) {
    return db.prepare('SELECT * FROM metrics WHERE episode_id = ? ORDER BY recorded_at DESC').all(filters.episode_id) as Metrics[]
  }
  if (filters?.platform) {
    return db.prepare('SELECT * FROM metrics WHERE platform = ? ORDER BY recorded_at DESC').all(filters.platform) as Metrics[]
  }
  return db.prepare('SELECT * FROM metrics ORDER BY recorded_at DESC').all() as Metrics[]
}

export function getMetrics(id: number): Metrics | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM metrics WHERE id = ?').get(id) as Metrics | undefined
}

export function createMetrics(metrics: Omit<Metrics, 'id' | 'recorded_at'>): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO metrics (episode_id, platform, views, completion_rate, likes, comments, shares, saves, new_followers, avg_watch_time, ctr)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    metrics.episode_id,
    metrics.platform,
    metrics.views ?? 0,
    metrics.completion_rate ?? 0,
    metrics.likes ?? 0,
    metrics.comments ?? 0,
    metrics.shares ?? 0,
    metrics.saves ?? 0,
    metrics.new_followers ?? 0,
    metrics.avg_watch_time ?? 0,
    metrics.ctr ?? 0
  )
}

export function updateMetrics(id: number, metrics: Partial<Omit<Metrics, 'id' | 'recorded_at'>>): void {
  const db = getDb()
  const sets: string[] = []
  const values: unknown[] = []

  const fields: (keyof typeof metrics)[] = ['episode_id', 'platform', 'views', 'completion_rate', 'likes', 'comments', 'shares', 'saves', 'new_followers', 'avg_watch_time', 'ctr']
  for (const f of fields) {
    if (metrics[f] !== undefined) {
      sets.push(`${f} = ?`)
      values.push(metrics[f])
    }
  }
  if (sets.length === 0) return
  values.push(id)
  db.prepare(`UPDATE metrics SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

// ─── Learnings ───────────────────────────────────────────────────────────────

export interface Learning {
  id?: number
  episode_id: string
  tag: string
  content: string
  created_at?: string
}

export function listLearnings(filters?: { episode_id?: string; tag?: string }): Learning[] {
  const db = getDb()
  if (filters?.episode_id && filters?.tag) {
    return db.prepare('SELECT * FROM learnings WHERE episode_id = ? AND tag = ? ORDER BY created_at DESC').all(filters.episode_id, filters.tag) as Learning[]
  }
  if (filters?.episode_id) {
    return db.prepare('SELECT * FROM learnings WHERE episode_id = ? ORDER BY created_at DESC').all(filters.episode_id) as Learning[]
  }
  if (filters?.tag) {
    return db.prepare('SELECT * FROM learnings WHERE tag = ? ORDER BY created_at DESC').all(filters.tag) as Learning[]
  }
  return db.prepare('SELECT * FROM learnings ORDER BY created_at DESC').all() as Learning[]
}

export function createLearning(learning: Omit<Learning, 'id' | 'created_at'>): void {
  const db = getDb()
  db.prepare('INSERT INTO learnings (episode_id, tag, content) VALUES (?, ?, ?)').run(
    learning.episode_id,
    learning.tag,
    learning.content
  )
}

// ─── Publishing Plans ───────────────────────────────────────────────────────

export interface PublishingPlan {
  id: number
  episode_id: string
  platform: string
  title: string
  description: string
  tags: string
  scheduled_at: string
  status: string
}

export interface PublishingPlanWithEpisode extends PublishingPlan {
  episode_title?: string
}

export function listPublishingPlans(filters?: { platform?: string; status?: string; date?: string; episode_id?: string }): PublishingPlanWithEpisode[] {
  const db = getDb()
  let sql = `
    SELECT p.*, e.title as episode_title
    FROM publishing_plans p
    LEFT JOIN episodes e ON p.episode_id = e.id
    WHERE 1=1
  `
  const params: (string | number)[] = []
  if (filters?.platform) {
    sql += ' AND p.platform = ?'
    params.push(filters.platform)
  }
  if (filters?.status) {
    sql += ' AND p.status = ?'
    params.push(filters.status)
  }
  if (filters?.date) {
    sql += ' AND date(p.scheduled_at) = date(?)'
    params.push(filters.date)
  }
  if (filters?.episode_id) {
    sql += ' AND p.episode_id = ?'
    params.push(filters.episode_id)
  }
  sql += ' ORDER BY p.scheduled_at ASC, p.id DESC'
  return db.prepare(sql).all(...params) as PublishingPlanWithEpisode[]
}

export function getPublishingPlan(id: number): PublishingPlanWithEpisode | undefined {
  const db = getDb()
  return db.prepare(`
    SELECT p.*, e.title as episode_title
    FROM publishing_plans p
    LEFT JOIN episodes e ON p.episode_id = e.id
    WHERE p.id = ?
  `).get(id) as PublishingPlanWithEpisode | undefined
}

export function createPublishingPlan(plan: Omit<PublishingPlan, 'id'>): number {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO publishing_plans (episode_id, platform, title, description, tags, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    plan.episode_id ?? null,
    plan.platform ?? null,
    plan.title ?? null,
    plan.description ?? null,
    plan.tags ?? null,
    plan.scheduled_at ?? null,
    plan.status ?? 'draft'
  )
  return Number(result.lastInsertRowid)
}

export function updatePublishingPlan(id: number, updates: Partial<Omit<PublishingPlan, 'id'>>): void {
  const db = getDb()
  const allowedFields = ['episode_id', 'platform', 'title', 'description', 'tags', 'scheduled_at', 'status'] as const
  const sets: string[] = []
  const values: (string | number | null)[] = []

  for (const key of allowedFields) {
    if (key in updates) {
      sets.push(`${key} = ?`)
      values.push(((updates as Record<string, unknown>)[key] ?? null) as string | number | null)
    }
  }

  if (sets.length === 0) return
  values.push(id)
  db.prepare(`UPDATE publishing_plans SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function deletePublishingPlan(id: number): void {
  const db = getDb()
  db.prepare('DELETE FROM publishing_plans WHERE id = ?').run(id)
}
