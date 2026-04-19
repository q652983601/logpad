'use client'

import { useEffect, useMemo, useState } from 'react'

interface EpisodeCommand {
  id: string
  title: string
  dbStatus?: string
  status?: string
}

interface CommandItem {
  id: string
  label: string
  hint: string
  group: string
  run: () => void
}

function go(path: string) {
  window.location.href = path
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [episodes, setEpisodes] = useState<EpisodeCommand[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(value => !value)
      }
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    fetch('/api/runs?limit=8')
      .then(res => res.ok ? res.json() : [])
      .then(data => setEpisodes(Array.isArray(data) ? data : []))
      .catch(() => setEpisodes([]))
  }, [open])

  const commands = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      { id: 'home', label: '打开今日驾驶舱', hint: '看今天先推进什么', group: '导航', run: () => go('/') },
      { id: 'episodes', label: '打开内容工厂', hint: '搜索选题和下一步动作', group: '导航', run: () => go('/episodes') },
      { id: 'voice', label: '打开口述资料库', hint: '上传录音、组合观点、转成选题', group: '导航', run: () => go('/voice') },
      { id: 'assets', label: '打开素材库', hint: '上传、关联和检查素材', group: '导航', run: () => go('/assets') },
      { id: 'distribution', label: '打开发布台', hint: '发布计划、封面 brief、发布 checklist', group: '导航', run: () => go('/distribution') },
      { id: 'review', label: '打开数据复盘', hint: '录数据、写学习银行', group: '导航', run: () => go('/review') },
      {
        id: 'quick-note',
        label: '灵感速记',
        hint: '随手记一个真实好奇点',
        group: '常用动作',
        run: () => window.dispatchEvent(new CustomEvent('logpad:quick-note')),
      },
    ]

    const episodeItems = episodes.flatMap(ep => [
      {
        id: `episode-${ep.id}`,
        label: ep.title,
        hint: `打开单期详情 · ${ep.dbStatus || ep.status || 'inbox'}`,
        group: '最近选题',
        run: () => go(`/episodes/${ep.id}`),
      },
      {
        id: `script-${ep.id}`,
        label: `写脚本：${ep.title}`,
        hint: '进入口播脚本和本地 Agent',
        group: '最近选题',
        run: () => go(`/episodes/${ep.id}/script`),
      },
      {
        id: `record-${ep.id}`,
        label: `录口播：${ep.title}`,
        hint: '进入录制 brief 和提词器',
        group: '最近选题',
        run: () => go(`/episodes/${ep.id}/record`),
      },
    ])

    return [...base, ...episodeItems]
  }, [episodes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(item => `${item.label} ${item.hint} ${item.group}`.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, open, filtered.length])

  function runCommand(command: CommandItem) {
    command.run()
    setOpen(false)
    setQuery('')
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex(current => Math.min(current + 1, Math.max(filtered.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex(current => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && filtered[selectedIndex]) {
      event.preventDefault()
      runCommand(filtered[selectedIndex])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-50 hidden rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-2 shadow-lg hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 md:block"
      >
        快速指令 <span className="ml-2 text-text-3">⌘K</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-palette-title"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
            <div className="border-b border-border p-4">
              <p id="command-palette-title" className="mb-2 text-xs uppercase tracking-widest text-text-3">
                Command Palette
              </p>
              <input
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                aria-label="搜索页面、选题或动作"
                placeholder="搜索页面、选题或动作"
                className="w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              />
            </div>
            <div className="max-h-[62vh] overflow-auto overscroll-contain p-2" role="listbox" aria-label="可执行指令">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-text-2">没有匹配的指令。</div>
              ) : (
                filtered.map((command, index) => (
                  <button
                    type="button"
                    key={command.id}
                    onClick={() => runCommand(command)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={`block w-full rounded-md px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${index === selectedIndex ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="min-w-0 truncate text-sm font-semibold text-text">{command.label}</span>
                      <span className="shrink-0 rounded bg-surface-3 px-2 py-0.5 text-[10px] text-text-3">{command.group}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-3">{command.hint}</p>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-border px-4 py-2 text-xs text-text-3">
              Enter/点击执行，Esc 关闭。真人使用时不用记住页面位置。
            </div>
          </div>
        </div>
      )}
    </>
  )
}
