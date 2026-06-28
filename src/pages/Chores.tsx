import { useEffect, useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { CheckCircleIcon, PencilIcon, PlusIcon, RepeatIcon } from '../components/icons'
import { archiveChore, createChore, getChoresWithStatus, reorderChores, updateChore } from '../lib/data'
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
    await archiveChore(id)
    showToast('삭제했어요')
    load()
  }

  async function handleReorder(ids: string[]) {
    await reorderChores(ids)
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
            <RecurringList
              list={recurringChores}
              tag={(c) => `${c.period_days}일 주기`}
              onEdit={setEditing}
              onReorder={handleReorder}
            />
          </section>
          <section className="bg-slate-50 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2 px-1 text-slate-500">
              <CheckCircleIcon />
              <h3 className="text-sm font-semibold">이번에 할 일</h3>
            </div>
            {renderCards(onceChores, '등록된 1회성 작업이 없어요.', () => '1회성')}
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

function RecurringList({
  list,
  tag,
  onEdit,
  onReorder,
}: {
  list: ChoreWithStatus[]
  tag: (chore: ChoreWithStatus) => string
  onEdit: (chore: ChoreWithStatus) => void
  onReorder: (ids: string[]) => void
}) {
  const [order, setOrder] = useState(list)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const longPressTimerRef = useRef<number | null>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    if (!draggingRef.current) setOrder(list)
  }, [list])

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function handlePointerDownItem(id: string) {
    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      draggingRef.current = true
      setDraggingId(id)
    }, 450)
  }

  function endDrag() {
    clearLongPressTimer()
    if (draggingRef.current) {
      draggingRef.current = false
      setDraggingId(null)
      onReorder(order.map((c) => c.id))
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingId) return
    const y = e.clientY
    const draggingIndex = order.findIndex((c) => c.id === draggingId)
    for (let i = 0; i < order.length; i++) {
      if (i === draggingIndex) continue
      const el = itemRefs.current.get(order[i].id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      if ((i < draggingIndex && y < mid) || (i > draggingIndex && y > mid)) {
        const newOrder = [...order]
        const [item] = newOrder.splice(draggingIndex, 1)
        newOrder.splice(i, 0, item)
        setOrder(newOrder)
        break
      }
    }
  }

  if (order.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">등록된 반복 작업이 없어요.</p>
  }

  return (
    <div className="space-y-2" onPointerMove={handlePointerMove}>
      {order.map((chore) => (
        <div
          key={chore.id}
          ref={(el) => {
            if (el) itemRefs.current.set(chore.id, el)
            else itemRefs.current.delete(chore.id)
          }}
          onPointerDown={() => handlePointerDownItem(chore.id)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: 'none' }}
          className={`bg-white rounded-lg p-3 flex items-center justify-between gap-2 shadow-sm select-none transition ${
            draggingId === chore.id ? 'opacity-60 scale-[1.02] shadow-lg' : ''
          }`}
        >
          <p className="text-sm font-medium text-slate-700 truncate">{chore.name}</p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-slate-100 text-slate-500 text-xs px-2.5 py-1 font-medium">
              {tag(chore)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(chore)
              }}
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
      await updateChore(chore.id, name.trim(), period, null)
    } else {
      await createChore(name.trim(), period, null)
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
      <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 z-40" onClick={onCancel}>
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
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 z-40" onClick={onCancel}>
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

        {recurring && (
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
