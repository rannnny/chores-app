import { Fragment, useEffect, useMemo, useState } from 'react'
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
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">처리 이력</h2>

      <div className="relative">
        <select
          value={choreFilter}
          onChange={(e) => setChoreFilter(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 pl-3 pr-9 py-2.5 outline-none focus:border-[#FF922B] bg-white text-sm text-slate-900"
        >
          <option value="all">전체 집안일</option>
          {chores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center mt-10">불러오는 중...</p>
      ) : filteredLogs.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">처리 기록이 없어요.</p>
      ) : (
        <table className="w-full table-fixed border border-slate-200 rounded-lg overflow-hidden text-sm">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[35%]" />
            <col className="w-[30%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 text-center text-xs text-slate-400">
              <th className="py-2 px-3 font-medium">No.</th>
              <th className="py-2 px-3 font-medium">집안일</th>
              <th className="py-2 px-3 font-medium">날짜·처리자</th>
              <th className="py-2 px-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredLogs.map((log, i) => {
              const isEditing = editingMemoId === log.id
              return (
                <Fragment key={log.id}>
                  <tr>
                    <td className="py-3 px-3 text-center text-slate-400">{i + 1}</td>
                    <td className="py-3 px-3 text-center font-medium text-slate-700 truncate">
                      {choreName(log.chore_id)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {log.done_date}
                      <br />
                      {profileName(log.done_by)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          onClick={() => (isEditing ? setEditingMemoId(null) : startEditMemo(log))}
                          className="text-slate-400 hover:text-[#FF922B]"
                        >
                          메모
                        </button>
                        <button
                          onClick={() => handleRestore(log.id)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                  {(isEditing || log.memo) && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 bg-slate-50">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={memoDraft}
                              placeholder="메모 입력"
                              onChange={(e) => setMemoDraft(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#FF922B]"
                            />
                            <button
                              onClick={() => handleSaveMemo(log.id)}
                              className="rounded-lg bg-[#FF922B] hover:bg-[#E8830A] text-white text-xs px-3 py-1.5 font-medium shrink-0"
                            >
                              저장
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600 text-center">{log.memo}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
