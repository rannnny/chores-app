import { useEffect, useMemo, useState } from 'react'
import { addDays, addMonths, format, getDaysInMonth, subMonths } from 'date-fns'
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

      let delayed = 0
      if (chore.period_days) {
        const choreLogs = logs
          .filter((l) => l.chore_id === chore.id)
          .sort((a, b) => (a.done_date < b.done_date ? -1 : 1))
        for (let i = 1; i < choreLogs.length; i++) {
          const cur = choreLogs[i]
          if (!cur.done_date.startsWith(monthKey)) continue
          const expectedDate = format(addDays(new Date(choreLogs[i - 1].done_date), chore.period_days), 'yyyy-MM-dd')
          if (cur.done_date > expectedDate) delayed++
        }
      }

      return { chore, count, expected, onTrack: count >= expected, delayed }
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
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
          {format(month, 'yyyy년 M월')} 처리 통계
        </h2>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="text-slate-400 px-2">
          ›
        </button>
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">이 달에는 처리 기록이 없어요.</p>
      ) : (
        <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {profiles.map((p) => {
            const count = counts.get(p.id) ?? 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <li key={p.id} className="py-3 px-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">
                    {p.emoji ? `${p.emoji}(${p.display_name})` : p.display_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {count}건 ({pct}%)
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#8b5e3c]" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <section>
        <h3 className="text-lg font-bold text-slate-700 mb-1 pt-2 leading-snug">
          집안일별 처리 현황 (반복)
        </h3>
        {recurringStats.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">등록된 반복 작업이 없어요.</p>
        ) : (
          <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {recurringStats.map(({ chore, count, expected, onTrack, delayed }) => (
              <li key={chore.id} className="py-3 px-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">{chore.name}</p>
                  <p className="text-xs text-slate-400">
                    {chore.period_days}일마다 반복 · 예상 {expected}회
                    {delayed > 0 && <span className="text-amber-500"> · 지연 {delayed}회</span>}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${onTrack ? 'text-slate-900' : 'text-rose-500'}`}>
                  {count}회 {onTrack ? '✅' : '⚠️'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-700 mb-1 pt-2 leading-snug">
          집안일별 처리 현황 (1회성)
        </h3>
        {onceStats.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">등록된 1회성 작업이 없어요.</p>
        ) : (
          <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {onceStats.map(({ chore, count }) => (
              <li key={chore.id} className="py-3 px-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 leading-relaxed">{chore.name}</p>
                <p className={`text-sm font-semibold ${count > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
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
