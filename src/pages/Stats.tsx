import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, getDaysInMonth, subMonths } from 'date-fns'
import { getAllLogs, getAllProfiles, getChoresWithStatus } from '../lib/data'
import type { Chore, ChoreLog, Profile } from '../types/index'

export default function Stats() {
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())

  useEffect(() => {
    Promise.all([getAllLogs(), getAllProfiles(), getChoresWithStatus(true)]).then(([l, p, c]) => {
      setLogs(l)
      setProfiles(p)
      setChores(c)
      setLoading(false)
    })
  }, [])

  const monthKey = format(month, 'yyyy-MM')

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of logs) {
      if (!log.done_date.startsWith(monthKey)) continue
      map.set(log.done_by, (map.get(log.done_by) ?? 0) + 1)
    }
    return map
  }, [logs, monthKey])

  const total = useMemo(() => [...counts.values()].reduce((a, b) => a + b, 0), [counts])

  const daysInMonth = getDaysInMonth(month)

  const choreStats = useMemo(() => {
    return chores.map((chore) => {
      const count = logs.filter((l) => l.chore_id === chore.id && l.done_date.startsWith(monthKey)).length
      const expected = chore.period_days ? Math.max(1, Math.round(daysInMonth / chore.period_days)) : 1
      return { chore, count, expected, onTrack: count >= expected }
    })
  }, [chores, logs, monthKey, daysInMonth])

  const recurringStats = choreStats.filter((s) => s.chore.period_days !== null)
  const onceStats = choreStats.filter((s) => s.chore.period_days === null)

  if (loading) return <p className="text-slate-400 mt-10 text-center">불러오는 중...</p>

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="text-slate-400 px-2">
          ‹
        </button>
        <h2 className="font-semibold text-slate-900">{format(month, 'yyyy년 M월')} 처리 통계</h2>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="text-slate-400 px-2">
          ›
        </button>
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-2xl p-4 text-center border border-slate-100">
          이 달에는 처리 기록이 없어요.
        </p>
      ) : (
        <ul className="space-y-2">
          {profiles.map((p) => {
            const count = counts.get(p.id) ?? 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <li key={p.id} className="bg-white rounded-2xl p-3 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-slate-900">{p.display_name}</p>
                  <p className="text-sm text-slate-500">{count}건 ({pct}%)</p>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-500 pt-2">집안일별 처리 현황 (반복)</h3>
        {recurringStats.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-2xl p-4 text-center border border-slate-100">
            등록된 반복 작업이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {recurringStats.map(({ chore, count, expected, onTrack }) => (
              <li
                key={chore.id}
                className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{chore.name}</p>
                  <p className="text-xs text-slate-400">{chore.period_days}일마다 반복 · 예상 {expected}회</p>
                </div>
                <p className={`text-sm font-semibold ${onTrack ? 'text-teal-600' : 'text-rose-500'}`}>
                  {count}회 {onTrack ? '✅' : '⚠️'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-500 pt-2">집안일별 처리 현황 (1회성)</h3>
        {onceStats.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-2xl p-4 text-center border border-slate-100">
            등록된 1회성 작업이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {onceStats.map(({ chore, count }) => (
              <li
                key={chore.id}
                className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between"
              >
                <p className="font-medium text-slate-900">{chore.name}</p>
                <p className={`text-sm font-semibold ${count > 0 ? 'text-teal-600' : 'text-slate-400'}`}>
                  {count > 0 ? '처리완료 ✅' : '미처리'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
