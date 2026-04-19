'use client'

import { useState, useEffect, useCallback } from 'react'

interface QuickNoteItem {
  id: string
  content: string
  createdAt: string
}

const STORAGE_KEY = 'logpad_quick_notes'

export default function QuickNote() {
  const [notes, setNotes] = useState<QuickNoteItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showList, setShowList] = useState(false)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as QuickNoteItem[]
        setNotes(parsed)
      }
    } catch {
      setNotes([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const showToast = useCallback((msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }, [])

  const openModal = useCallback(() => {
    setContent('')
    setShowModal(true)
  }, [])

  useEffect(() => {
    const openQuickNote = () => openModal()
    window.addEventListener('logpad:quick-note', openQuickNote)
    return () => window.removeEventListener('logpad:quick-note', openQuickNote)
  }, [openModal])

  function closeModal() {
    setShowModal(false)
    setContent('')
  }

  function saveNote() {
    if (!content.trim()) return
    const note: QuickNoteItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }
    setNotes(prev => [note, ...prev])
    setContent('')
    setShowModal(false)
    showToast('已保存到灵感速记')
  }

  async function sendToBoard(note: QuickNoteItem) {
    if (sending) return
    setSending(true)
    try {
      const id = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6)}`
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: note.content,
          description: note.content,
          platforms: ['youtube', 'douyin', 'bilibili'],
        }),
      })
      if (!res.ok) throw new Error('创建选题失败')
      setNotes(prev => prev.filter(n => n.id !== note.id))
      showToast('已发送到选题看板')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div>
      {/* FAB */}
      <button
        onClick={openModal}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center active:scale-95 hover:scale-105 transition-transform"
        aria-label="灵感速记"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Note count badge */}
      {notes.length > 0 && (
        <button
          onClick={() => setShowList(true)}
          className="fixed bottom-20 right-6 z-50 bg-surface-3 text-text text-xs px-3 py-1.5 rounded-full border border-border shadow hover:border-accent/30"
        >
          {notes.length} 条速记
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div
            className="relative w-full sm:w-[90%] max-w-md bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-note-title"
          >
            <h3 id="quick-note-title" className="text-lg font-semibold text-text mb-3">灵感速记</h3>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="突然想到的点子…"
              rows={5}
              className="w-full bg-surface-2 text-text placeholder:text-text-3 rounded-xl border border-border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl bg-surface-2 text-text-2 text-sm font-medium active:scale-[0.98] transition-transform"
              >
                取消
              </button>
              <button
                onClick={saveNote}
                disabled={!content.trim()}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                保存
              </button>
            </div>
            <button
              onClick={() => {
                if (!content.trim()) return
                const note: QuickNoteItem = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  content: content.trim(),
                  createdAt: new Date().toISOString(),
                }
                sendToBoard(note).then(() => closeModal())
              }}
              disabled={!content.trim() || sending}
              className="w-full mt-2 py-2.5 rounded-xl border border-accent text-accent text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {sending ? '发送中…' : '发送到选题看板'}
            </button>
          </div>
        </div>
      )}

      {/* Note list drawer */}
      {showList && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowList(false)} />
          <div
            className="relative w-full max-w-md bg-surface rounded-t-2xl border border-border shadow-2xl p-4 max-h-[70vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-note-list-title"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="quick-note-list-title" className="text-lg font-semibold text-text">灵感速记</h3>
              <button onClick={() => setShowList(false)} className="text-text-3 text-sm px-2 py-1">关闭</button>
            </div>
            {notes.length === 0 ? (
              <p className="text-text-3 text-sm text-center py-8">暂无速记</p>
            ) : (
              <ul className="overflow-y-auto space-y-2">
                {notes.map(note => (
                  <li key={note.id} className="bg-surface-2 rounded-xl p-3 border border-border">
                    <p className="text-sm text-text whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-text-3">
                        {new Date(note.createdAt).toLocaleString('zh-CN')}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendToBoard(note)}
                          disabled={sending}
                          className="text-xs text-accent font-medium px-2 py-1 rounded-md bg-accent/10 active:scale-95 transition-transform"
                        >
                          发送到选题看板
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-xs text-text-3 px-2 py-1 rounded-md bg-surface-3 active:scale-95 transition-transform"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {message && (
        <div role="status" aria-live="polite" className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-surface-3 text-text text-sm px-4 py-2 rounded-full border border-border shadow-lg">
          {message}
        </div>
      )}
    </div>
  )
}
