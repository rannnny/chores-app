import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const tabs = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/chores', label: '집안일', icon: '🧹' },
  { to: '/history', label: '이력', icon: '📜' },
  { to: '/stats', label: '통계', icon: '📊' },
]

export default function Layout() {
  return (
    <div className="h-dvh flex flex-col text-slate-800 bg-slate-50">
      <header className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 bg-white border-b border-slate-100">
        <h1 className="text-lg font-bold text-slate-900">🧺 집안일 공유</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-400 hover:text-slate-600">
          로그아웃
        </button>
      </header>

      <main className="flex-1 px-4 pb-24 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 border-t border-slate-100 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? 'text-teal-600' : 'text-slate-400'
                }`
              }
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
