import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import { archiveChore, createChore, getChoresWithStatus, todayStr, updateChore } from '../lib/data'
import type { ChoreWithStatus } from '../types/index'

export default function Chores() {
  const showToast = useToast()
  const [chores, setChores] = useState<ChoreWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ChoreWithStatus | 'new' | null>(null)

  async function load() {
    setLoading(true)
    setChores(await getChoresWithStatus())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleArchive(id: string) {
    if (!confirm('이 집안일을 삭제할까요? (처리 이력은 남아있어요)')) return
    await archiveChore(id)
    showToast('삭제했어요')
    load()
  }

  const recurringChores = chores.filter((c) => c.period_days !== null)
  const onceChores = chores.filter((c) => c.period_days === null)

  function renderTable(list: ChoreWithStatus[], emptyText: string) {
    if (list.length === 0) {
      return <p className="text-sm text-slate-400 py-6 text-center">{emptyText}</p>
    }
    return (
      <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs text-slate-400">
            <th className="py-2 px-3 font-medium">이름</th>
            <th className="py-2 px-3 font-medium">주기</th>
            <th className="py-2 px-3 font-medium text-right">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {list.map((chore) => (
            <tr key={chore.id}>
              <td className="py-3 px-3 font-medium text-slate-700">{chore.name}</td>
              <td className="py-3 px-3 text-slate-400">{chore.period_days}일마다</td>
              <td className="py-3 px-3 text-right">
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setEditing(chore)} className="text-slate-400 hover:text-slate-900">
                    수정
                  </button>
                  <button onClick={() => handleArchive(chore.id)} className="text-slate-400 hover:text-rose-500">
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  function renderList(list: ChoreWithStatus[], emptyText: string) {
    if (list.length === 0) {
      return <p className="text-sm text-slate-400 py-6 text-center">{emptyText}</p>
    }
    return (
      <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {list.map((chore) => (
          <li key={chore.id} className="py-3 px-3 flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-slate-700 leading-relaxed">{chore.name}</p>
              <p className="text-xs text-slate-400">예정일: {chore.due_date ?? '-'}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditing(chore)} className="text-slate-400 hover:text-slate-900">
                수정
              </button>
              <button onClick={() => handleArchive(chore.id)} className="text-slate-400 hover:text-rose-500">
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">등록된 집안일</h2>
        <button
          onClick={() => setEditing('new')}
          className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm px-3 py-1.5 font-medium"
        >
          + 추가
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center mt-10">불러오는 중...</p>
      ) : (
        <>
          <section>
            <h3 className="text-lg font-bold text-slate-700 mb-1 leading-snug">🔁 반복 작업</h3>
            {renderTable(recurringChores, '등록된 반복 작업이 없어요.')}
          </section>
          <section>
            <h3 className="text-lg font-bold text-slate-700 mb-1 leading-snug">📌 1회성 작업</h3>
            {renderList(onceChores, '등록된 1회성 작업이 없어요.')}
          </section>
        </>
      )}

      {editing && (
        <ChoreFormModal
          chore={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function ChoreFormModal({
  chore,
  onCancel,
  onSaved,
}: {
  chore: ChoreWithStatus | null
  onCancel: () => void
  onSaved: () => void
}) {
  const showToast = useToast()
  const [name, setName] = useState(chore?.name ?? '')
  const [recurring, setRecurring] = useState(chore ? chore.period_days !== null : true)
  const [periodDays, setPeriodDays] = useState(chore?.period_days ? String(chore.period_days) : '7')
  const [dueDate, setDueDate] = useState(chore?.due_date ?? todayStr())
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const period = recurring ? Number(periodDays) || 1 : null
    if (chore) {
      await updateChore(chore.id, name.trim(), period, recurring ? null : dueDate)
    } else {
      await createChore(name.trim(), period, recurring ? null : dueDate)
    }
    setSaving(false)
    showToast(chore ? '수정했어요' : '추가했어요')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-40" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-slate-900 text-lg tracking-tight">
          {chore ? '집안일 수정' : '집안일 추가'}
        </h3>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">이름</label>
          <input
            type="text"
            required
            value={name}
            placeholder="예: 화장실 청소"
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRecurring(true)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              recurring ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            🔁 반복 작업
          </button>
          <button
            type="button"
            onClick={() => setRecurring(false)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              !recurring ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            📌 1회성 작업
          </button>
        </div>

        {recurring ? (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">처리 주기 (일)</label>
            <input
              type="number"
              min={1}
              required
              value={periodDays}
              onChange={(e) => setPeriodDays(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
            />
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">할 일로 띄울 날짜</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 py-2.5 font-medium text-slate-600"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 py-2.5 font-medium text-white"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
