import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { y2018, y2019, y2020, y2021, y2022, y2023, y2024, y2025, y2026 } from '@hyunbinseo/holidays-kr'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { CheckCircleIcon, RepeatIcon } from '../components/icons'
import {
  acknowledgeHouseNote,
  clearHouseNote,
  createChore,
  deleteLog,
  getAllProfiles,
  getChoresWithStatus,
  getHouseNote,
  logChoreDone,
  setHouseNote,
  todayStr,
} from '../lib/data'
import type { ChoreWithStatus, HouseNote, Profile } from '../types/index'

const HOLIDAYS: Record<string, readonly string[]> = {
  ...y2018,
  ...y2019,
  ...y2020,
  ...y2021,
  ...y2022,
  ...y2023,
  ...y2024,
  ...y2025,
  ...y2026,
}

const lunarCalendar = new KoreanLunarCalendar()

function isFullMoonDay(date: Date): boolean {
  const ok = lunarCalendar.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return ok && lunarCalendar.getLunarCalendar().day === 15
}

export default function Home() {
  const { session, profile } = useAuth()
  const showToast = useToast()
  const [chores, setChores] = useState<ChoreWithStatus[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [houseNote, setHouseNoteState] = useState<HouseNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [editingHouseNote, setEditingHouseNote] = useState(false)
  const [houseNoteDraft, setHouseNoteDraft] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addingNewChore, setAddingNewChore] = useState(false)
  const [newChoreName, setNewChoreName] = useState('')
  const [savingNewChore, setSavingNewChore] = useState(false)
  const [editingComplete, setEditingComplete] = useState<ChoreWithStatus | null>(null)
  const [pressingId, setPressingId] = useState<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressFiredRef = useRef(false)

  async function refresh() {
    const [c, p, h] = await Promise.all([
      getChoresWithStatus(),
      getAllProfiles(),
      getHouseNote().catch(() => null),
    ])
    setChores(c)
    setProfiles(p)
    setHouseNoteState(h)
  }

  useEffect(() => {
    refresh().then(() => setLoading(false))
  }, [])

  const profileName = (id: string | null) => profiles.find((p) => p.id === id)?.display_name ?? '알 수 없음'
  const profileEmoji = (id: string | null) => profiles.find((p) => p.id === id)?.emoji ?? ''

  const today = todayStr()
  const dueList = useMemo(
    () =>
      chores.filter((c) => {
        if (c.last_done_date === selectedDate) return true
        if (!c.next_due_date) return false
        // 기한이 지나도 처리하기 전까지 계속 표시한다.
        return c.next_due_date <= selectedDate
      }),
    [chores, selectedDate]
  )

  const dueDatesInMonth = useMemo(() => {
    const map = new Map<string, ChoreWithStatus[]>()
    const add = (date: string | null, chore: ChoreWithStatus) => {
      if (!date) return
      const list = map.get(date) ?? []
      list.push(chore)
      map.set(date, list)
    }
    for (const c of chores) {
      add(c.next_due_date, c)
      add(c.last_done_date, c)
    }
    return map
  }, [chores])

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  async function handleComplete(choreId: string, doneDate: string, memo: string) {
    if (!session) return
    await logChoreDone(choreId, session.user.id, doneDate, memo || null)
    showToast('처리 완료! ✨')
    refresh()
  }

  async function handleUndo(logId: string) {
    await deleteLog(logId)
    showToast('처리를 취소했어요')
    refresh()
  }

  function handlePressStart(chore: ChoreWithStatus, doneOnSelected: boolean) {
    if (doneOnSelected) return
    longPressFiredRef.current = false
    setPressingId(chore.id)
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true
      setEditingComplete(chore)
      setPressingId(null)
    }, 450)
  }

  function handlePressEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setPressingId(null)
  }

  function handleCompleteClick(chore: ChoreWithStatus, doneOnSelected: boolean) {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
    if (doneOnSelected && chore.last_log_id) handleUndo(chore.last_log_id)
    else handleComplete(chore.id, selectedDate, '')
  }

  function startEditHouseNote() {
    setHouseNoteDraft(houseNote?.message ?? '')
    setEditingHouseNote(true)
  }

  async function handleSaveHouseNote() {
    if (!session || !houseNoteDraft.trim()) return
    await setHouseNote(session.user.id, houseNoteDraft.trim())
    setEditingHouseNote(false)
    refresh()
  }

  async function handleConfirmHouseNote() {
    if (!session) return
    await acknowledgeHouseNote(session.user.id)
    await clearHouseNote()
    refresh()
  }

  const otherChores = useMemo(
    () => chores.filter((c) => !dueList.some((d) => d.id === c.id)),
    [chores, dueList]
  )

  async function handlePickOther(choreId: string) {
    if (!session) return
    await logChoreDone(choreId, session.user.id, selectedDate, null)
    setPickerOpen(false)
    showToast('처리 완료! ✨')
    refresh()
  }

  function closePicker() {
    setPickerOpen(false)
    setAddingNewChore(false)
    setNewChoreName('')
  }

  async function handleAddAndLogNew() {
    if (!session || !newChoreName.trim()) return
    setSavingNewChore(true)
    const chore = await createChore(newChoreName.trim(), null, selectedDate)
    await logChoreDone(chore.id, session.user.id, selectedDate, null)
    setSavingNewChore(false)
    closePicker()
    showToast('새 집안일을 등록하고 처리했어요! ✨')
    refresh()
  }

  if (loading) return <p className="text-slate-400 mt-10 text-center">불러오는 중...</p>

  return (
    <div className="pt-1">
      <section className="mb-3">
        {houseNote ? (
          <div
            title={profileName(houseNote.author)}
            className="bg-[#FFF3E6] border border-[#FFD9A8] text-[#B5650F] text-xs rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <p className="flex-1 truncate">📢 {houseNote.message}</p>
            <div className="flex gap-1 shrink-0">
              {houseNote.author === session?.user.id ? (
                <button
                  onClick={startEditHouseNote}
                  className="rounded-full bg-white/70 hover:bg-white text-[#B5650F] text-xs px-2.5 py-1 border border-[#FFD9A8]"
                >
                  수정
                </button>
              ) : (
                <button
                  onClick={handleConfirmHouseNote}
                  className="rounded-full bg-[#FF922B] hover:bg-[#E8830A] text-white text-xs px-2.5 py-1 font-bold"
                >
                  확인
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={startEditHouseNote}
            className="h-7 w-full flex items-center justify-end text-xs text-slate-300 hover:text-slate-500"
          >
            + 긴급메모
          </button>
        )}
      </section>

      {editingHouseNote && (
        <div
          className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 z-40"
          onClick={() => setEditingHouseNote(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 text-lg tracking-tight">긴급 메모</h3>
            <input
              type="text"
              autoFocus
              value={houseNoteDraft}
              placeholder="예: 가스 점검 내일 오전 10시 방문"
              onChange={(e) => setHouseNoteDraft(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FF922B]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingHouseNote(false)}
                className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSaveHouseNote}
                className="flex-1 rounded-lg bg-[#FF922B] hover:bg-[#E8830A] text-white py-2.5 font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="text-lg font-bold text-slate-400 px-2">
            ‹
          </button>
          <h2 className="text-lg font-bold text-slate-700 leading-snug">{format(month, 'yyyy년 M월')}</h2>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="text-lg font-bold text-slate-400 px-2">
            ›
          </button>
        </div>
        <div className="border-t border-slate-200 mb-2" />
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div key={d} className={i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}>
              {d}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7)).map(
            (weekDays, week) => (
              <div
                key={week}
                className={`grid grid-cols-7 gap-1 ${week > 0 ? 'pt-1 border-t border-slate-100' : ''}`}
              >
                {weekDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dueChores = dueDatesInMonth.get(key) ?? []
                  const isPast = key < today
                  const dow = day.getDay()
                  const holidayNames = HOLIDAYS[key]
                  const dateColor =
                    !isSameMonth(day, month)
                      ? 'text-slate-300'
                      : holidayNames || dow === 0
                        ? 'text-rose-500'
                        : dow === 6
                          ? 'text-blue-500'
                          : 'text-slate-700'
                  const isSelected = key === selectedDate
                  return (
                    <button
                      key={key}
                      title={holidayNames?.join(', ')}
                      onClick={() => setSelectedDate(key)}
                      className={`h-11 rounded-lg flex flex-col items-center pt-1.5 text-xs ${
                        isToday(day) ? 'bg-[#FF922B] text-white font-semibold' : dateColor
                      } ${isSelected && !isToday(day) ? 'ring-1 ring-[#FF922B]' : ''}`}
                    >
                      <span>{format(day, 'd')}</span>
                      <span className="flex flex-col items-center gap-0.5 mt-0.5">
                        {isFullMoonDay(day) && <span className="text-[8px] leading-none">🌕</span>}
                        {dueChores.length > 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPast && !isSameDay(day, new Date()) ? 'bg-rose-400' : 'bg-amber-400'
                            } ${isToday(day) ? '!bg-white' : ''}`}
                          />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          )}
        </div>
        <div className="border-t border-slate-200 mt-2" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-2 leading-snug">
          {selectedDate === today ? '오늘 할 일' : `${selectedDate} 할 일`}
          {dueList.length > 0 && ` (${dueList.length})`}
        </h2>
        {dueList.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            {selectedDate === today ? '오늘은 할 일이 없어요 🎉' : '이 날에는 할 일이 없어요'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {dueList.map((chore) => {
              const doneOnSelected = chore.last_done_date === selectedDate
              const overdue = !doneOnSelected && !!chore.next_due_date && chore.next_due_date < selectedDate
              return (
                <div
                  key={chore.id}
                  className="bg-white border border-slate-100 rounded-lg p-2 space-y-0.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed truncate flex items-center gap-1.5 min-w-0">
                      <span className="text-slate-400 shrink-0">
                        {chore.period_days !== null ? <RepeatIcon /> : <CheckCircleIcon />}
                      </span>
                      <span className="truncate">{chore.name}</span>
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {doneOnSelected && <span className="text-sm">{profileEmoji(chore.last_done_by)}</span>}
                      <button
                        onPointerDown={() => handlePressStart(chore, doneOnSelected)}
                        onPointerUp={handlePressEnd}
                        onPointerLeave={handlePressEnd}
                        onClick={() => handleCompleteClick(chore, doneOnSelected)}
                        className={`rounded-lg text-xs px-2.5 py-1 font-medium select-none ${
                          pressingId === chore.id
                            ? 'bg-slate-700 text-white'
                            : doneOnSelected
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                              : 'bg-[#FF922B] hover:bg-[#E8830A] text-white'
                        }`}
                      >
                        {pressingId === chore.id ? '변경' : doneOnSelected ? '취소' : '완료'}
                      </button>
                    </div>
                  </div>
                  {!doneOnSelected && chore.last_done_date && (
                    <p className={`text-xs ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>
                      마지막 처리: {chore.last_done_date} ({profileName(chore.last_done_by)})
                      {overdue && ' · 기한 지남'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <button
          onClick={() => setPickerOpen(true)}
          className="mt-2 w-full text-xs text-slate-400 hover:text-[#FF922B] underline-offset-2 hover:underline"
        >
          + 목록에 없는 다른 집안일도 처리했어요
        </button>
      </section>

      </div>

      {pickerOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 z-40" onClick={closePicker}>
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 text-lg tracking-tight">
              {selectedDate === today ? '오늘' : selectedDate} 처리한 다른 집안일
            </h3>
            <p className="text-xs text-slate-400">
              아직 처리할 때가 안 된 집안일도 오늘 했다면 여기서 기록할 수 있어요.
            </p>
            <ul className="divide-y divide-slate-100 overflow-y-auto -mx-1 px-1">
              {otherChores.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">더 등록된 집안일이 없어요.</p>
              ) : (
                otherChores.map((chore) => (
                  <li key={chore.id}>
                    <button
                      onClick={() => handlePickOther(chore.id)}
                      className="w-full flex items-center justify-between py-2.5 px-1 text-left hover:bg-slate-50 rounded-lg"
                    >
                      <span className="text-sm text-slate-700">{chore.name}</span>
                      <span className="text-xs text-slate-400">
                        {chore.last_done_date ? `최근 ${chore.last_done_date}` : '처리 기록 없음'}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>

            {addingNewChore ? (
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <input
                  type="text"
                  autoFocus
                  value={newChoreName}
                  placeholder="새 집안일 이름"
                  onChange={(e) => setNewChoreName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-[#FF922B]"
                />
                <button
                  onClick={handleAddAndLogNew}
                  disabled={savingNewChore || !newChoreName.trim()}
                  className="rounded-lg bg-[#FF922B] hover:bg-[#E8830A] disabled:opacity-50 text-white text-sm px-3 py-2.5 font-medium shrink-0"
                >
                  {savingNewChore ? '저장 중...' : '등록+처리'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingNewChore(true)}
                className="w-full rounded-lg border border-dashed border-slate-200 hover:border-[#FF922B] text-slate-400 hover:text-[#FF922B] py-2.5 font-medium text-sm"
              >
                + 새 집안일로 등록하고 처리하기
              </button>
            )}

            <button
              onClick={closePicker}
              className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {editingComplete && (
        <EditCompleteModal
          chore={editingComplete}
          defaultDate={selectedDate}
          onCancel={() => setEditingComplete(null)}
          onConfirm={(date, memo) => {
            handleComplete(editingComplete.id, date, memo)
            setEditingComplete(null)
          }}
        />
      )}

      {!profile && <p className="text-xs text-slate-400 text-center">프로필 정보를 불러오는 중...</p>}
    </div>
  )
}

function EditCompleteModal({
  chore,
  defaultDate,
  onCancel,
  onConfirm,
}: {
  chore: ChoreWithStatus
  defaultDate: string
  onCancel: () => void
  onConfirm: (date: string, memo: string) => void
}) {
  const [date, setDate] = useState(defaultDate)
  const [memo, setMemo] = useState('')

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 z-40" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-slate-900 text-lg tracking-tight">{chore.name} 처리 변경하기</h3>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">처리한 날짜</label>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-[#FF922B]"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">메모 (선택)</label>
          <input
            type="text"
            value={memo}
            placeholder="예: 세제 다 씀"
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-[#FF922B]"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 font-medium"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(date, memo)}
            className="flex-1 rounded-lg bg-[#FF922B] hover:bg-[#E8830A] text-white py-2.5 font-medium"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}
