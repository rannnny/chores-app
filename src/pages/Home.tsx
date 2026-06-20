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
import { deleteLog, getAllProfiles, getChoresWithStatus, logChoreDone, todayStr } from '../lib/data'
import type { ChoreWithStatus, Profile } from '../types/index'

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
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(todayStr())

  async function load() {
    setLoading(true)
    const [c, p] = await Promise.all([getChoresWithStatus(), getAllProfiles()])
    setChores(c)
    setProfiles(p)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const profileName = (id: string | null) => profiles.find((p) => p.id === id)?.display_name ?? '알 수 없음'

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

  if (loading) return <p className="text-slate-400 mt-10 text-center">불러오는 중...</p>

  return (
    <div className="space-y-6 pt-4">
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
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs ${
                  isToday(day) ? 'bg-teal-600 text-white font-semibold' : dateColor
                } ${isSelected && !isToday(day) ? 'ring-2 ring-teal-500' : ''} ${isSelected ? 'ring-offset-1' : ''}`}
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
          <p className="text-sm text-slate-400 bg-white rounded-2xl p-4 text-center border border-slate-100">
            {selectedDate === today ? '오늘은 할 일이 없어요 🎉' : '이 날에는 할 일이 없어요'}
          </p>
        ) : (
          <ul className="space-y-2">
            {dueList.map((chore) => {
              const doneOnSelected = chore.last_done_date === selectedDate
              const overdue = !doneOnSelected && !!chore.next_due_date && chore.next_due_date < selectedDate
              return (
                <li
                  key={chore.id}
                  className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-100"
                >
                  <div>
                    <p className="font-medium text-slate-900">{chore.name}</p>
                    {chore.last_done_date && (
                      <p className={`text-xs ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>
                        마지막 처리: {chore.last_done_date} ({profileName(chore.last_done_by)})
                        {overdue && ' · 기한 지남'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      doneOnSelected && chore.last_log_id
                        ? handleUndo(chore.last_log_id)
                        : handleComplete(chore.id, selectedDate, '')
                    }
                    className={`rounded-full text-sm px-3 py-1.5 font-medium ${
                      doneOnSelected
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                        : 'bg-teal-600 hover:bg-teal-500 text-white'
                    }`}
                  >
                    {doneOnSelected ? '완료 ↩' : '처리'}
                  </button>
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
