import { useEffect, useMemo, useState } from 'react'
import { addDays, addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { CheckCircleIcon, RepeatIcon } from '../components/icons'
import { getAllLogs, getAllProfiles, getChoresWithStatus } from '../lib/data'
import type { Chore, ChoreLog, Profile } from '../types/index'

// 그 달 안에 실제로 처리해야 했던(또는 해야 할) 횟수를 계산한다.
// 마지막 처리일 + 주기를 계속 이어 붙여가며, 그 결과가 이번 달 안에 들어오는 횟수를 센다.
function countExpectedInMonth(
  chore: Chore,
  choreLogsAsc: ChoreLog[],
  monthStart: Date,
  monthEnd: Date
): number {
  if (!chore.period_days) return 1
  const period = chore.period_days
  const inMonth = (d: Date) => d >= monthStart && d <= monthEnd

  if (choreLogsAsc.length === 0) {
    let count = 0
    let cursor = new Date(chore.created_at)
    while (cursor <= monthEnd) {
      if (inMonth(cursor)) count++
      cursor = addDays(cursor, period)
    }
    return count
  }

  let count = 0
  const firstDate = new Date(choreLogsAsc[0].done_date)
  if (inMonth(firstDate)) count++

  for (let i = 1; i < choreLogsAsc.length; i++) {
    const scheduled = addDays(new Date(choreLogsAsc[i - 1].done_date), period)
    if (inMonth(scheduled)) count++
  }

  let cursor = addDays(new Date(choreLogsAsc[choreLogsAsc.length - 1].done_date), period)
  while (cursor <= monthEnd) {
    if (inMonth(cursor)) count++
    cursor = addDays(cursor, period)
  }

  return count
}

export default function Stats() {
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())

  useEffect(() => {
    Promise.all([getAllLogs(), getAllProfiles(), getChoresWithStatus()]).then(([l, p, c]) => {
      const activeChoreIds = new Set(c.map((chore) => chore.id))
      setLogs(l.filter((log) => activeChoreIds.has(log.chore_id)))
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

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  const choreStats = useMemo(() => {
    return chores.map((chore) => {
      const count = logs.filter((l) => l.chore_id === chore.id && l.done_date.startsWith(monthKey)).length
      const choreLogs = logs
        .filter((l) => l.chore_id === chore.id)
        .sort((a, b) => (a.done_date < b.done_date ? -1 : 1))
      const expected = countExpectedInMonth(chore, choreLogs, monthStart, monthEnd)

      let delayed = 0
      if (chore.period_days) {
        for (let i = 1; i < choreLogs.length; i++) {
          const cur = choreLogs[i]
          if (!cur.done_date.startsWith(monthKey)) continue
          const expectedDate = format(addDays(new Date(choreLogs[i - 1].done_date), chore.period_days), 'yyyy-MM-dd')
          if (cur.done_date > expectedDate) delayed++
        }
      }

      return { chore, count, expected, onTrack: count >= expected, delayed }
    })
  }, [chores, logs, monthKey, monthStart, monthEnd])

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
        <div className="grid grid-cols-2 gap-2">
          {profiles.map((p) => {
            const count = counts.get(p.id) ?? 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={p.id} className="border border-slate-100 rounded-lg p-3 shadow-sm">
                {count === 0 ? (
                  <p className="text-sm font-medium text-slate-700 leading-relaxed truncate">
                    {p.emoji ? `${p.emoji} ` : ''}
                    {p.display_name}님 차례예요!
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-slate-700 leading-relaxed truncate">
                        {p.emoji ? `${p.emoji}(${p.display_name})` : p.display_name}
                      </p>
                      <p className="text-sm text-slate-500 shrink-0">
                        {count}건 ({pct}%)
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#FF922B]" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <section className="bg-slate-50 rounded-2xl p-3">
        <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
          <RepeatIcon />
          처리 현황 (반복)
        </h3>
        {recurringStats.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">등록된 반복 작업이 없어요.</p>
        ) : (
          <table className="w-full table-fixed border border-slate-200 rounded-lg overflow-hidden text-sm">
            <colgroup>
              <col className="w-[50%]" />
              <col className="w-[18%]" />
              <col className="w-[32%]" />
            </colgroup>
            <thead>
              <tr className="text-center text-xs text-slate-400 divide-x divide-slate-200">
                <th className="py-2 px-3 font-medium">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1">집안일</span>
                </th>
                <th className="py-2 px-3 font-medium">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1">주기</span>
                </th>
                <th className="py-2 px-3 font-medium">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1">처리현황</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recurringStats.map(({ chore, count, expected, onTrack, delayed }) => (
                <tr key={chore.id} className="divide-x divide-slate-200">
                  <td className="py-3 px-3 text-center font-medium text-slate-700 truncate">{chore.name}</td>
                  <td className="py-3 px-3 text-center text-slate-400">{chore.period_days}일</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`font-semibold ${onTrack ? 'text-slate-900' : 'text-rose-500'}`}>
                      {count}/{expected} {onTrack ? '✅' : '⚠️'}
                    </span>
                    {delayed > 0 && <p className="text-xs text-amber-500">지연 {delayed}회</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-slate-50 rounded-2xl p-3">
        <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
          <CheckCircleIcon />
          처리 현황 (1회성)
        </h3>
        {onceStats.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">등록된 1회성 작업이 없어요.</p>
        ) : (
          <table className="w-full table-fixed border border-slate-200 rounded-lg overflow-hidden text-sm">
            <colgroup>
              <col className="w-[68%]" />
              <col className="w-[32%]" />
            </colgroup>
            <thead>
              <tr className="text-center text-xs text-slate-400 divide-x divide-slate-200">
                <th className="py-2 px-3 font-medium">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1">집안일</span>
                </th>
                <th className="py-2 px-3 font-medium">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1">처리현황</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {onceStats.map(({ chore, count }) => (
                <tr key={chore.id} className="divide-x divide-slate-200">
                  <td className="py-3 px-3 text-center font-medium text-slate-700 truncate">{chore.name}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`font-semibold ${count > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                      {count > 0 ? '완료 ✅' : '미처리'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
