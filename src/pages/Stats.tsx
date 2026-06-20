import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, subMonths } from 'date-fns'
import { getAllLogs, getAllProfiles } from '../lib/data'
import type { ChoreLog, Profile } from '../types/index'

export default function Stats() {
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())

  useEffect(() => {
    Promise.all([getAllLogs(), getAllProfiles()]).then(([l, p]) => {
      setLogs(l)
      setProfiles(p)
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
    </div>
  )
}
