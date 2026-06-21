import { useEffect, useMemo, useState } from 'react'
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
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import {
  clearHouseNote,
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

  async function load() {
    setLoading(true)
    const [c, p, h] = await Promise.all([
      getChoresWithStatus(),
      getAllProfiles(),
      getHouseNote().catch(() => null),
    ])
    setChores(c)
    setProfiles(p)
    setHouseNoteState(h)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const profileName = (id: string | null) => profiles.find((p) => p.id === id)?.display_name ?? '알 수 없음'
  const profileEmoji = (id: string | null) => profiles.find((p) => p.id === id)?.emoji ?? ''

  const today = todayStr()
  const dueList = useMemo(
    () =>
      chores
        .filter((c) => (c.next_due_date && c.next_due_date <= selectedDate) || c.last_done_date === selectedDate)
        .sort((a, b) => (a.next_due_date ?? '9999-99-99') < (b.next_due_date ?? '9999-99-99') ? -1 : 1),
    [chores, selectedDate]
  )

  const dueDatesInMonth = useMemo(() => {
    const map = new Map<string, ChoreWithStatus[]>()
    for (const c of chores) {
      if (!c.next_due_date) continue
      const list = map.get(c.next_due_date) ?? []
      list.push(c)
      map.set(c.next_due_date, list)
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
    load()
  }

  async function handleUndo(logId: string) {
    if (!confirm('처리를 취소할까요?')) return
    await deleteLog(logId)
    showToast('처리를 취소했어요')
    load()
  }

  function startEditHouseNote() {
    setHouseNoteDraft(houseNote?.message ?? '')
    setEditingHouseNote(true)
  }

  async function handleSaveHouseNote() {
    if (!session || !houseNoteDraft.trim()) return
    await setHouseNote(session.user.id, houseNoteDraft.trim())
    setEditingHouseNote(false)
    load()
  }

  async function handleConfirmHouseNote() {
    await clearHouseNote()
    load()
  }

  if (loading) return <p className="text-slate-400 mt-10 text-center">불러오는 중...</p>

  return (
    <div className="space-y-6 pt-4">
      <section>
        {editingHouseNote ? (
          <div className="border border-amber-300 rounded-lg p-3 space-y-2">
            <input
              type="text"
              autoFocus
              value={houseNoteDraft}
              placeholder="예: 가스 점검 내일 오전 10시 방문"
              onChange={(e) => setHouseNoteDraft(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveHouseNote}
                className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm py-2 font-medium"
              >
                저장
              </button>
              <button
                onClick={() => setEditingHouseNote(false)}
                className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm py-2"
              >
                취소
              </button>
            </div>
          </div>
        ) : houseNote ? (
          <div
            title={profileName(houseNote.author)}
            className="border border-amber-300 rounded-lg pl-3 pr-1.5 py-1.5 flex items-center justify-between gap-2"
          >
            <p className="text-sm font-bold text-slate-900 truncate">❗ {houseNote.message}</p>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={startEditHouseNote}
                className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs px-2.5 py-1"
              >
                수정
              </button>
              <button
                onClick={handleConfirmHouseNote}
                className="rounded-full bg-amber-400 hover:bg-amber-500 text-white text-xs px-2.5 py-1 font-bold"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={startEditHouseNote}
            className="text-xs text-slate-300 hover:text-slate-500"
          >
            + 긴급 메모 남기기
          </button>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="text-slate-400 px-2">
            ‹
          </button>
          <h2 className="font-semibold text-slate-900">{format(month, 'yyyy년 M월')}</h2>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="text-slate-400 px-2">
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div key={d} className={i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
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
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${
                  isToday(day) ? 'bg-slate-900 text-white font-semibold' : dateColor
                } ${isSelected && !isToday(day) ? 'ring-1 ring-slate-900' : ''}`}
              >
                <span>{format(day, 'd')}</span>
                {dueChores.length > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isPast && !isSameDay(day, new Date()) ? 'bg-rose-400' : 'bg-amber-400'
                    } ${isToday(day) ? '!bg-white' : ''}`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-2">
          {selectedDate === today ? '오늘 할 일' : `${selectedDate} 할 일`}
          {dueList.length > 0 && ` (${dueList.length})`}
        </h2>
        {dueList.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            {selectedDate === today ? '오늘은 할 일이 없어요 🎉' : '이 날에는 할 일이 없어요'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {dueList.map((chore) => {
              const doneOnSelected = chore.last_done_date === selectedDate
              const overdue = !doneOnSelected && !!chore.next_due_date && chore.next_due_date < selectedDate
              return (
                <li key={chore.id} className="py-3 px-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{chore.name}</p>
                      {!doneOnSelected && chore.last_done_date && (
                        <p className={`text-xs ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>
                          마지막 처리: {chore.last_done_date} ({profileName(chore.last_done_by)})
                          {overdue && ' · 기한 지남'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {doneOnSelected && <span className="text-lg">{profileEmoji(chore.last_done_by)}</span>}
                      <button
                        onClick={() =>
                          doneOnSelected && chore.last_log_id
                            ? handleUndo(chore.last_log_id)
                            : handleComplete(chore.id, selectedDate, '')
                        }
                        className={`rounded-lg text-sm px-3 py-1.5 font-medium ${
                          doneOnSelected
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {doneOnSelected ? '완료 ↩' : '처리'}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {!profile && <p className="text-xs text-slate-400 text-center">프로필 정보를 불러오는 중...</p>}
    </div>
  )
}
