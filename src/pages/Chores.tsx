import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import { archiveChore, createChore, getChoresWithStatus, updateChore } from '../lib/data'
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

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">등록된 집안일</h2>
        <button
          onClick={() => setEditing('new')}
          className="rounded-full bg-teal-600 hover:bg-teal-500 text-white text-sm px-3 py-1.5 font-medium"
        >
          + 추가
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center mt-10">불러오는 중...</p>
      ) : chores.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-2xl p-4 text-center border border-slate-100">
          아직 등록된 집안일이 없어요. 위에서 추가해보세요!
        </p>
      ) : (
        <ul className="space-y-2">
          {chores.map((chore) => (
            <li
              key={chore.id}
              className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-100"
            >
              <div>
                <p className="font-medium text-slate-900">{chore.name}</p>
                <p className="text-xs text-slate-400">
                  {chore.period_days ? `${chore.period_days}일마다 반복` : '1회성 작업'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(chore)}
                  className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm px-3 py-1.5"
                >
                  수정
                </button>
                <button
                  onClick={() => handleArchive(chore.id)}
                  className="rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 text-sm px-3 py-1.5"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
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
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const period = recurring ? Number(periodDays) || 1 : null
    if (chore) {
      await updateChore(chore.id, name.trim(), period)
    } else {
      await createChore(name.trim(), period)
    }
    setSaving(false)
    showToast(chore ? '수정했어요' : '추가했어요')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-40" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-slate-900 text-lg">{chore ? '집안일 수정' : '집안일 추가'}</h3>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">이름</label>
          <input
            type="text"
            required
            value={name}
            placeholder="예: 화장실 청소"
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRecurring(true)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium ${
              recurring ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            반복 작업
          </button>
          <button
            type="button"
            onClick={() => setRecurring(false)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium ${
              !recurring ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            1회성 작업
          </button>
        </div>

        {recurring && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">처리 주기 (일)</label>
            <input
              type="number"
              min={1}
              required
              value={periodDays}
              onChange={(e) => setPeriodDays(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 py-2.5 font-medium text-slate-600"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 py-2.5 font-medium text-white"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
