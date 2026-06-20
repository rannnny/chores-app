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
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { getAllProfiles, getChoresWithStatus, logChoreDone, todayStr } from '../lib/data'
import type { ChoreWithStatus, Profile } from '../types/index'

export default function Home() {
  const { session, profile } = useAuth()
  const showToast = useToast()
  const [chores, setChores] = useState<ChoreWithStatus[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())
  const [target, setTarget] = useState<ChoreWithStatus | null>(null)

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
        .filter((c) => c.next_due_date && c.next_due_date <= today)
        .sort((a, b) => (a.next_due_date! < b.next_due_date! ? -1 : 1)),
    [chores, today]
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
    setTarget(null)
    showToast('처리 완료! ✨')
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
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dueChores = dueDatesInMonth.get(key) ?? []
            const isPast = key < today
            return (
              <div
                key={key}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs ${
                  !isSameMonth(day, month)
                    ? 'text-slate-300'
                    : isToday(day)
                      ? 'bg-teal-600 text-white font-semibold'
                      : 'text-slate-700'
                }`}
              >
                <span>{format(day, 'd')}</span>
                {dueChores.length > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isPast && !isSameDay(day, new Date()) ? 'bg-rose-400' : 'bg-amber-400'
                    } ${isToday(day) ? '!bg-white' : ''}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-2">오늘 할 일{dueList.length > 0 && ` (${dueList.length})`}</h2>
        {dueList.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-2xl p-4 text-center border border-slate-100">
            오늘은 할 일이 없어요 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {dueList.map((chore) => {
              const overdue = chore.next_due_date! < today
              return (
                <li
                  key={chore.id}
                  className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-100"
                >
                  <div>
                    <p className="font-medium text-slate-900">{chore.name}</p>
                    <p className={`text-xs ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>
                      {chore.last_done_date
                        ? `마지막 처리: ${chore.last_done_date} (${profileName(chore.last_done_by)})`
                        : '아직 처리한 적 없어요'}
                      {overdue && ' · 기한 지남'}
                    </p>
                  </div>
                  <button
                    onClick={() => setTarget(chore)}
                    className="rounded-full bg-teal-600 hover:bg-teal-500 text-white text-sm px-3 py-1.5 font-medium"
                  >
                    처리
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {target && (
        <CompleteModal
          chore={target}
          onCancel={() => setTarget(null)}
          onConfirm={(date, memo) => handleComplete(target.id, date, memo)}
        />
      )}

      {!profile && <p className="text-xs text-slate-400 text-center">프로필 정보를 불러오는 중...</p>}
    </div>
  )
}

function CompleteModal({
  chore,
  onCancel,
  onConfirm,
}: {
  chore: ChoreWithStatus
  onCancel: () => void
  onConfirm: (date: string, memo: string) => void
}) {
  const [date, setDate] = useState(todayStr())
  const [memo, setMemo] = useState('')

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-40" onClick={onCancel}>
      <div
        className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-slate-900 text-lg">{chore.name} 처리</h3>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">날짜</label>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">메모 (선택)</label>
          <input
            type="text"
            value={memo}
            placeholder="예: 세제 다 씀"
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
          />
        </div>
        {parseISO(date) > new Date() && <p className="text-xs text-rose-500">미래 날짜는 선택할 수 없어요.</p>}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 py-2.5 font-medium text-slate-600"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(date, memo)}
            className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 font-medium text-white"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}
