import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import { archiveChore, createChore, getChoresWithStatus, todayStr, updateChore } from '../lib/data'
import type { ChoreWithStatus } from '../types/index'

function PencilIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v5h5" />
      <path d="M20 20v-5h-5" />
      <path d="M5.5 9a7 7 0 0 1 12-3.5L20 7" />
      <path d="M18.5 15a7 7 0 0 1-12 3.5L4 17" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

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
    await archiveChore(id)
    showToast('삭제했어요')
    load()
  }

  const recurringChores = chores.filter((c) => c.period_days !== null)
  const onceChores = chores.filter((c) => c.period_days === null)

  function renderCards(list: ChoreWithStatus[], emptyText: string, tag: (chore: ChoreWithStatus) => string) {
    if (list.length === 0) {
      return <p className="text-sm text-slate-400 py-6 text-center">{emptyText}</p>
    }
    return (
      <div className="space-y-2">
        {list.map((chore) => (
          <div key={chore.id} className="bg-white rounded-lg p-3 flex items-center justify-between gap-2 shadow-sm">
            <p className="text-sm font-medium text-slate-700 truncate">{chore.name}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full bg-slate-100 text-slate-500 text-xs px-2.5 py-1 font-medium">
                {tag(chore)}
              </span>
              <button
                onClick={() => setEditing(chore)}
                className="text-slate-400 hover:text-[#FF922B] p-1"
                aria-label="수정"
              >
                <PencilIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-4 relative">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">집안일 목록</h2>

      {loading ? (
        <p className="text-slate-400 text-center mt-10">불러오는 중...</p>
      ) : (
        <>
          <section className="bg-slate-50 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2 px-1 text-slate-500">
              <RepeatIcon />
              <h3 className="text-sm font-semibold">꾸준히 반복되는 일</h3>
            </div>
            {renderCards(recurringChores, '등록된 반복 작업이 없어요.', (c) => `${c.period_days}일 주기`)}
          </section>
          <section className="bg-slate-50 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2 px-1 text-slate-500">
              <CheckCircleIcon />
              <h3 className="text-sm font-semibold">이번에 할 일</h3>
            </div>
            {renderCards(onceChores, '등록된 1회성 작업이 없어요.', (c) => c.due_date ?? '-')}
          </section>
        </>
      )}

      <button
        onClick={() => setEditing('new')}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-[#FF922B] hover:bg-[#E8830A] text-white shadow-lg flex items-center justify-center"
        aria-label="집안일 추가"
      >
        <PlusIcon />
      </button>

      {editing && (
        <ChoreFormModal
          chore={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
          onDelete={
            editing !== 'new'
              ? async () => {
                  await handleArchive(editing.id)
                  setEditing(null)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

const PERIOD_PRESETS: { label: string; days: number }[] = [
  { label: '매일', days: 1 },
  { label: '매주', days: 7 },
  { label: '매달', days: 30 },
]

function periodModeFor(days: number | null): 'daily' | 'weekly' | 'monthly' | 'custom' {
  if (days === 1) return 'daily'
  if (days === 7) return 'weekly'
  if (days === 30) return 'monthly'
  return 'custom'
}

function ChoreFormModal({
  chore,
  onCancel,
  onSaved,
  onDelete,
}: {
  chore: ChoreWithStatus | null
  onCancel: () => void
  onSaved: () => void
  onDelete?: () => Promise<void>
}) {
  const showToast = useToast()
  const [name, setName] = useState(chore?.name ?? '')
  const [recurring, setRecurring] = useState(chore ? chore.period_days !== null : true)
  const [periodMode, setPeriodMode] = useState(periodModeFor(chore?.period_days ?? 7))
  const [periodDays, setPeriodDays] = useState(chore?.period_days ? String(chore.period_days) : '7')
  const [dueDate, setDueDate] = useState(chore?.due_date ?? todayStr())
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function selectPreset(preset: 'daily' | 'weekly' | 'monthly' | 'custom', days?: number) {
    setPeriodMode(preset)
    if (days) setPeriodDays(String(days))
  }

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

  async function handleConfirmDelete() {
    if (!onDelete) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
    showToast('삭제했어요')
  }

  if (confirmingDelete) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-40" onClick={onCancel}>
        <div
          className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-semibold text-slate-900 text-lg tracking-tight">삭제할까요?</h3>
          <p className="text-sm text-slate-500">이 집안일의 처리 이력도 함께 사라져요.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 py-2.5 font-medium text-slate-600"
            >
              취소
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="flex-1 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 py-2.5 font-medium text-white"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>
    )
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
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:bg-white focus:border-[#FF922B] focus:ring-2 focus:ring-[#FF922B]/20"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRecurring(true)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
              recurring ? 'bg-[#FF922B] text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            🔁 반복 작업
          </button>
          <button
            type="button"
            onClick={() => setRecurring(false)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
              !recurring ? 'bg-[#FF922B] text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            ✅ 1회성 작업
          </button>
        </div>

        {recurring ? (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">처리 주기</label>
            <div className="grid grid-cols-4 gap-2">
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => selectPreset(periodModeFor(p.days), p.days)}
                  className={`rounded-lg py-1.5 text-xs font-medium ${
                    periodMode === periodModeFor(p.days) ? 'bg-[#FF922B] text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => selectPreset('custom')}
                className={`rounded-lg py-1.5 text-xs font-medium ${
                  periodMode === 'custom' ? 'bg-[#FF922B] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                기타
              </button>
            </div>
            {periodMode === 'custom' && (
              <input
                type="number"
                min={1}
                required
                value={periodDays}
                placeholder="며칠마다?"
                onChange={(e) => setPeriodDays(e.target.value)}
                className="w-full mt-2 rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-[#FF922B]"
              />
            )}
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">할 일로 띄울 날짜</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:bg-white focus:border-[#FF922B] focus:ring-2 focus:ring-[#FF922B]/20"
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
            className="flex-1 rounded-lg bg-[#FF922B] hover:bg-[#E8830A] disabled:opacity-50 py-2.5 font-medium text-white"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="w-full rounded-lg border border-rose-200 hover:bg-rose-50 py-2.5 font-medium text-rose-500"
          >
            삭제
          </button>
        )}
      </form>
    </div>
  )
}
