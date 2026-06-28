import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { CheckCircleIcon, RepeatIcon } from '../components/icons'
import { deleteLog, deleteLogPhoto, getAllLogs, getChoresWithStatus, updateLogMemo, uploadLogPhoto } from '../lib/data'
import type { Chore, ChoreLog } from '../types/index'

export default function History() {
  const showToast = useToast()
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [choreFilter, setChoreFilter] = useState('all')
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [startMonth, setStartMonth] = useState(currentMonth)
  const [endMonth, setEndMonth] = useState(currentMonth)
  const [savedFilter, setSavedFilter] = useState({ start: currentMonth, end: currentMonth })
  const [editingLog, setEditingLog] = useState<ChoreLog | null>(null)
  const [viewingMemo, setViewingMemo] = useState<ChoreLog | null>(null)
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressFiredRef = useRef(false)
  const memoPressTimerRef = useRef<number | null>(null)
  const memoLongPressFiredRef = useRef(false)
  const swipeStartXRef = useRef<number | null>(null)
  const swipeIdRef = useRef<string | null>(null)

  async function load() {
    setLoading(true)
    const [l, c] = await Promise.all([getAllLogs(), getChoresWithStatus()])
    const activeChoreIds = new Set(c.map((chore) => chore.id))
    setLogs(l.filter((log) => activeChoreIds.has(log.chore_id)))
    setChores(c)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!swipedId) return
    function handleOutsidePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement
      if (!target.closest(`[data-swipe-id="${swipedId}"]`)) setSwipedId(null)
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [swipedId])

  const formatDate = (date: string) => date.slice(2).replace(/-/g, '.')

  const choreById = (id: string) => chores.find((c) => c.id === id)
  const choreName = (id: string) => choreById(id)?.name ?? '(삭제된 집안일)'

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()])
    for (const l of logs) set.add(Number(l.done_date.slice(0, 4)))
    return Array.from(set).sort((a, b) => b - a)
  }, [logs])

  const filteredLogs = useMemo(
    () =>
      logs.filter((l) => {
        if (choreFilter !== 'all' && l.chore_id !== choreFilter) return false
        const month = l.done_date.slice(0, 7)
        if (startMonth && month < startMonth) return false
        if (endMonth && month > endMonth) return false
        return true
      }),
    [logs, choreFilter, startMonth, endMonth]
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

  function handleMemoPressStart(log: ChoreLog) {
    memoLongPressFiredRef.current = false
    memoPressTimerRef.current = window.setTimeout(() => {
      memoLongPressFiredRef.current = true
      setEditingLog(log)
    }, 450)
  }

  function handleMemoPressEnd() {
    if (memoPressTimerRef.current) {
      clearTimeout(memoPressTimerRef.current)
      memoPressTimerRef.current = null
    }
  }

  function handleMemoClick(log: ChoreLog) {
    if (memoLongPressFiredRef.current) {
      memoLongPressFiredRef.current = false
      return
    }
    if (log.memo || log.photo_url) setViewingMemo(log)
    else setEditingLog(log)
  }

  function handleSwipeStart(e: React.PointerEvent, id: string) {
    swipeStartXRef.current = e.clientX
    swipeIdRef.current = id
  }

  function handleSwipeMove(e: React.PointerEvent, id: string) {
    if (swipeStartXRef.current == null || swipeIdRef.current !== id) return
    const delta = e.clientX - swipeStartXRef.current
    if (delta < -30) {
      handlePressEnd()
      setSwipedId(id)
    } else if (delta > 15) {
      setSwipedId(null)
    }
  }

  function handleSwipeEnd() {
    swipeStartXRef.current = null
    swipeIdRef.current = null
  }

  async function handleDeleteLog(log: ChoreLog) {
    if (!confirm('이 처리 기록을 삭제할까요?')) return
    await deleteLog(log.id)
    setSwipedId(null)
    showToast('삭제했어요')
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
          <optgroup label="🔁 반복 작업">
            {chores
              .filter((c) => c.period_days !== null)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="✅ 1회성 작업">
            {chores
              .filter((c) => c.period_days === null)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
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

      <div className="flex items-center gap-2">
        <YearMonthSelect value={startMonth} onChange={setStartMonth} years={years} />
        <span className="text-slate-400 text-sm shrink-0">~</span>
        <YearMonthSelect value={endMonth} onChange={setEndMonth} years={years} />
        <label className="flex items-center gap-1 shrink-0 text-sm text-slate-500 select-none">
          <input
            type="checkbox"
            checked={!startMonth && !endMonth}
            onChange={(e) => {
              if (e.target.checked) {
                setSavedFilter({ start: startMonth, end: endMonth })
                setStartMonth('')
                setEndMonth('')
              } else {
                setStartMonth(savedFilter.start)
                setEndMonth(savedFilter.end)
              }
            }}
            className="w-4 h-4 accent-[#FF922B]"
          />
          전체
        </label>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center mt-10">불러오는 중...</p>
      ) : filteredLogs.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">처리 기록이 없어요.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2 mb-1 text-xs font-semibold text-slate-500">
            <span className="shrink-0 w-14 text-center">처리날짜</span>
            <span className="flex-1 text-center">집안일</span>
            <span className="shrink-0 w-[150px] text-center">메모</span>
          </div>
          <ul className="divide-y divide-slate-100 select-none">
          {filteredLogs.map((log) => (
            <li key={log.id} data-swipe-id={log.id} className="relative overflow-hidden">
              <div className="absolute inset-y-0 right-0 w-20">
                <button
                  onClick={() => handleDeleteLog(log)}
                  className="w-full h-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium"
                >
                  삭제
                </button>
              </div>
              <div
                onPointerDown={(e) => {
                  handlePressStart(log)
                  handleSwipeStart(e, log.id)
                }}
                onPointerMove={(e) => handleSwipeMove(e, log.id)}
                onPointerUp={() => {
                  handlePressEnd()
                  handleSwipeEnd()
                }}
                onPointerLeave={() => {
                  handlePressEnd()
                  handleSwipeEnd()
                }}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => {
                  if (swipedId === log.id) setSwipedId(null)
                }}
                style={{ transform: swipedId === log.id ? 'translateX(-80px)' : 'translateX(0)' }}
                className="relative bg-white flex items-center justify-between gap-3 px-3 py-2.5 transition-transform active:bg-slate-50"
              >
                <p className="text-xs text-slate-400 shrink-0 w-14 text-center">{formatDate(log.done_date)}</p>
                <p className="text-sm font-semibold text-slate-900 truncate min-w-0 flex-1 flex items-center gap-1.5">
                  <span className="text-slate-400 shrink-0">
                    {choreById(log.chore_id)?.period_days != null ? <RepeatIcon /> : <CheckCircleIcon />}
                  </span>
                  <span className="truncate">{choreName(log.chore_id)}</span>
                </p>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    handleMemoPressStart(log)
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation()
                    handleMemoPressEnd()
                  }}
                  onPointerLeave={handleMemoPressEnd}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMemoClick(log)
                  }}
                  className="text-xs text-slate-400 hover:text-[#FF922B] shrink-0 w-[150px] text-center truncate select-none"
                  aria-label="메모"
                  title={log.memo ?? '메모 추가'}
                >
                  {log.memo || (log.photo_url ? '📷' : '📝')}
                </button>
              </div>
            </li>
          ))}
          </ul>
        </>
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
          onPhotoChanged={load}
        />
      )}

      {viewingMemo && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-40"
          onClick={() => setViewingMemo(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 text-lg tracking-tight">
              {choreName(viewingMemo.chore_id)}
            </h3>
            <p className="text-xs text-slate-400">{formatDate(viewingMemo.done_date)}</p>
            {viewingMemo.memo && (
              <p className="text-base text-slate-700 whitespace-pre-wrap py-2">{viewingMemo.memo}</p>
            )}
            {viewingMemo.photo_url && (
              <img
                src={viewingMemo.photo_url}
                alt="메모 첨부 사진"
                className="w-full rounded-lg object-cover max-h-72"
              />
            )}
            <button
              onClick={() => setViewingMemo(null)}
              className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditLogModal({
  log,
  choreName,
  onClose,
  onSaved,
  onPhotoChanged,
}: {
  log: ChoreLog
  choreName: string
  onClose: () => void
  onSaved: () => void
  onPhotoChanged: () => void
}) {
  const showToast = useToast()
  const [memo, setMemo] = useState(log.memo ?? '')
  const [photoUrl, setPhotoUrl] = useState(log.photo_url)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSaveMemo() {
    setSaving(true)
    await updateLogMemo(log.id, memo.trim() || null)
    setSaving(false)
    showToast('메모를 저장했어요')
    onSaved()
  }

  async function handleDeleteMemo() {
    setSaving(true)
    await updateLogMemo(log.id, null)
    setMemo('')
    setSaving(false)
    showToast('메모를 삭제했어요')
    onSaved()
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const url = await uploadLogPhoto(log.id, file)
    setPhotoUrl(url)
    setUploadingPhoto(false)
    showToast('사진을 추가했어요')
    onPhotoChanged()
  }

  async function handleDeletePhoto() {
    await deleteLogPhoto(log.id)
    setPhotoUrl(null)
    showToast('사진을 삭제했어요')
    onPhotoChanged()
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

        <div>
          <label className="text-xs text-slate-500 mb-1 block">사진</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="첨부 사진" className="w-full rounded-lg object-cover max-h-48" />
              <button
                onClick={handleDeletePhoto}
                className="absolute top-2 right-2 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1"
              >
                삭제
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full rounded-lg border border-dashed border-slate-300 hover:border-[#FF922B] text-slate-400 hover:text-[#FF922B] disabled:opacity-50 py-2.5 font-medium text-sm"
            >
              {uploadingPhoto ? '업로드 중...' : '📷 사진 추가'}
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDeleteMemo}
            disabled={saving || !memo}
            className="flex-1 rounded-lg border border-rose-200 hover:bg-rose-50 disabled:opacity-50 py-2.5 font-medium text-rose-500"
          >
            삭제
          </button>
          <button
            onClick={handleSaveMemo}
            disabled={saving}
            className="flex-1 rounded-lg bg-[#FF922B] hover:bg-[#E8830A] disabled:opacity-50 text-white py-2.5 font-medium"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

function YearMonthSelect({
  value,
  onChange,
  years,
}: {
  value: string
  onChange: (value: string) => void
  years: number[]
}) {
  const [y, m] = value ? value.split('-') : ['', '']
  const selectClass =
    'flex-1 min-w-0 rounded-lg border border-slate-200 px-1 py-2.5 outline-none focus:border-[#FF922B] bg-white text-sm text-slate-900 appearance-none text-center'
  const selectStyle: React.CSSProperties = { textAlign: 'center', textAlignLast: 'center' }

  return (
    <div className="flex gap-1 flex-1">
      <select
        value={y}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}-${m || '01'}` : '')}
        className={selectClass}
        style={selectStyle}
      >
        <option value="">전체</option>
        {years.map((yr) => (
          <option key={yr} value={yr}>
            {yr}년
          </option>
        ))}
      </select>
      <select
        value={m}
        onChange={(e) => onChange(`${y || new Date().getFullYear()}-${e.target.value}`)}
        disabled={!y}
        className={selectClass}
        style={selectStyle}
      >
        <option value="">전체</option>
        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((mm) => (
          <option key={mm} value={mm}>
            {Number(mm)}월
          </option>
        ))}
      </select>
    </div>
  )
}
