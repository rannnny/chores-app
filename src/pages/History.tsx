import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { deleteLog, getAllLogs, getAllProfiles, getChoresWithStatus, updateLogMemo } from '../lib/data'
import type { Chore, ChoreLog, Profile } from '../types/index'

export default function History() {
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [choreFilter, setChoreFilter] = useState('all')
  const [editingLog, setEditingLog] = useState<ChoreLog | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressFiredRef = useRef(false)

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

  const formatDate = (date: string) => date.slice(2).replace(/-/g, '.')

  const choreName = (id: string) => chores.find((c) => c.id === id)?.name ?? '(삭제된 집안일)'
  const choreKind = (id: string) => {
    const chore = chores.find((c) => c.id === id)
    if (!chore) return '-'
    return chore.period_days ? `${chore.period_days}일마다` : '1회성'
  }
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.display_name ?? '알 수 없음'

  const filteredLogs = useMemo(
    () => (choreFilter === 'all' ? logs : logs.filter((l) => l.chore_id === choreFilter)),
    [logs, choreFilter]
  )

  function handlePressStart(log: ChoreLog) {
    longPressFiredRef.current = false
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true
      setEditingLog(log)
    }, 450)
  }

  function handlePressEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
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
        <table className="w-full table-fixed border border-slate-200 rounded-lg overflow-hidden text-sm select-none">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[18%]" />
            <col className="w-[46%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 text-center text-xs text-slate-400">
              <th className="py-2 px-3 font-medium">날짜</th>
              <th className="py-2 px-3 font-medium">주기</th>
              <th className="py-2 px-3 font-medium">집안일</th>
              <th className="py-2 px-3 font-medium">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                onPointerDown={() => handlePressStart(log)}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                onContextMenu={(e) => e.preventDefault()}
                className="active:bg-slate-50"
              >
                <td className="py-3 px-3 text-center text-slate-400">
                  {formatDate(log.done_date)}
                  <br />
                  {profileName(log.done_by)}
                </td>
                <td className="py-3 px-3 text-center text-slate-400">{choreKind(log.chore_id)}</td>
                <td className="py-3 px-3 text-center font-medium text-slate-700 truncate">
                  {choreName(log.chore_id)}
                </td>
                <td className="py-3 px-3 text-center text-slate-500">{log.memo ? '📝' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingLog && (
        <EditLogModal
          log={editingLog}
          choreName={choreName(editingLog.chore_id)}
          onClose={() => setEditingLog(null)}
          onSaved={() => {
            setEditingLog(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function EditLogModal({
  log,
  choreName,
  onClose,
  onSaved,
}: {
  log: ChoreLog
  choreName: string
  onClose: () => void
  onSaved: () => void
}) {
  const showToast = useToast()
  const [memo, setMemo] = useState(log.memo ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSaveMemo() {
    setSaving(true)
    await updateLogMemo(log.id, memo.trim() || null)
    setSaving(false)
    showToast('메모를 저장했어요')
    onSaved()
  }

  async function handleRestore() {
    if (!confirm('이 처리 기록을 복원(취소)할까요? 처리하지 않은 상태로 돌아가요.')) return
    await deleteLog(log.id)
    showToast('복원했어요')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-slate-900 text-lg tracking-tight">{choreName} 처리 수정</h3>
        <p className="text-xs text-slate-400">
          {log.done_date.slice(2).replace(/-/g, '.')} · {memo ? '메모 있음' : '메모 없음'}
        </p>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">메모</label>
          <input
            type="text"
            autoFocus
            value={memo}
            placeholder="메모 입력"
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-[#FF922B]"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 font-medium"
          >
            닫기
          </button>
          <button
            onClick={handleSaveMemo}
            disabled={saving}
            className="flex-1 rounded-lg bg-[#FF922B] hover:bg-[#E8830A] disabled:opacity-50 text-white py-2.5 font-medium"
          >
            저장
          </button>
        </div>
        <button
          onClick={handleRestore}
          className="w-full rounded-lg border border-rose-200 hover:bg-rose-50 py-2.5 font-medium text-rose-500"
        >
          처리 취소
        </button>
      </div>
    </div>
  )
}
