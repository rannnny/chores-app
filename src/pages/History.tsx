import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/Toast'
import { deleteLog, getAllLogs, getAllProfiles, getChoresWithStatus, updateLogMemo } from '../lib/data'
import type { Chore, ChoreLog, Profile } from '../types/index'

export default function History() {
  const showToast = useToast()
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [choreFilter, setChoreFilter] = useState('all')
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoDraft, setMemoDraft] = useState('')

  async function load() {
    setLoading(true)
    const [l, c, p] = await Promise.all([getAllLogs(), getChoresWithStatus(true), getAllProfiles()])
    setLogs(l)
    setChores(c)
    setProfiles(p)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const choreName = (id: string) => {
    const chore = chores.find((c) => c.id === id)
    if (!chore) return '(삭제된 집안일)'
    return `${chore.name} (${chore.period_days ? `${chore.period_days}일마다` : '1회성'})`
  }
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.display_name ?? '알 수 없음'

  const filteredLogs = useMemo(
    () => (choreFilter === 'all' ? logs : logs.filter((l) => l.chore_id === choreFilter)),
    [logs, choreFilter]
  )

  async function handleRestore(id: string) {
    if (!confirm('이 처리 기록을 복원(취소)할까요? 처리하지 않은 상태로 돌아가요.')) return
    await deleteLog(id)
    showToast('복원했어요')
    load()
  }

  function startEditMemo(log: ChoreLog) {
    setEditingMemoId(log.id)
    setMemoDraft(log.memo ?? '')
  }

  async function handleSaveMemo(id: string) {
    await updateLogMemo(id, memoDraft.trim() || null)
    setEditingMemoId(null)
    showToast('메모를 저장했어요')
    load()
  }

  return (
    <div className="space-y-4 pt-4">
      <h2 className="font-semibold text-slate-900">처리 이력</h2>

      <select
        value={choreFilter}
        onChange={(e) => setChoreFilter(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-teal-500 bg-white"
      >
        <option value="all">전체 집안일</option>
        {chores.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {loading ? (
        <p className="text-slate-400 text-center mt-10">불러오는 중...</p>
      ) : filteredLogs.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-2xl p-4 text-center border border-slate-100">
          처리 기록이 없어요.
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredLogs.map((log) => {
            const isEditing = editingMemoId === log.id
            return (
              <li key={log.id} className="bg-white rounded-2xl p-3 border border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{choreName(log.chore_id)}</p>
                    <p className="text-xs text-slate-400">
                      {log.done_date} · {profileName(log.done_by)}
                    </p>
                    {isEditing ? (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          autoFocus
                          value={memoDraft}
                          placeholder="메모 입력"
                          onChange={(e) => setMemoDraft(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500"
                        />
                        <button
                          onClick={() => handleSaveMemo(log.id)}
                          className="rounded-full bg-teal-600 hover:bg-teal-500 text-white text-xs px-3 py-1.5 font-medium shrink-0"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingMemoId(null)}
                          className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs px-3 py-1.5 shrink-0"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      log.memo && <p className="text-sm mt-1 text-slate-600">{log.memo}</p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => startEditMemo(log)}
                        className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs px-3 py-1.5"
                      >
                        메모
                      </button>
                      <button
                        onClick={() => handleRestore(log.id)}
                        className="rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs px-3 py-1.5"
                      >
                        복원
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
