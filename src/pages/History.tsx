import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { deleteLog, getAllLogs, getAllProfiles, getChoresWithStatus } from '../lib/data'
import type { Chore, ChoreLog, Profile } from '../types/index'

export default function History() {
  const { session } = useAuth()
  const showToast = useToast()
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [choreFilter, setChoreFilter] = useState('all')

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

  const choreName = (id: string) => chores.find((c) => c.id === id)?.name ?? '(삭제된 집안일)'
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.display_name ?? '알 수 없음'

  const filteredLogs = useMemo(
    () => (choreFilter === 'all' ? logs : logs.filter((l) => l.chore_id === choreFilter)),
    [logs, choreFilter]
  )

  async function handleDelete(id: string) {
    if (!confirm('이 처리 기록을 삭제할까요?')) return
    await deleteLog(id)
    showToast('삭제했어요')
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
          {filteredLogs.map((log) => (
            <li key={log.id} className="bg-white rounded-2xl p-3 border border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{choreName(log.chore_id)}</p>
                  <p className="text-xs text-slate-400">
                    {log.done_date} · {profileName(log.done_by)}
                  </p>
                  {log.memo && <p className="text-sm text-slate-600 mt-1">{log.memo}</p>}
                </div>
                {log.done_by === session?.user.id && (
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-xs text-slate-300 hover:text-rose-500 shrink-0"
                  >
                    삭제
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
