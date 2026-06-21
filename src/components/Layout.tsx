import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const tabs = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/chores', label: '집안일', icon: '🧹' },
  { to: '/history', label: '이력', icon: '📜' },
  { to: '/stats', label: '통계', icon: '📊' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

export default function Layout() {
  return (
    <div className="h-dvh flex flex-col text-slate-800 bg-white">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <h1 className="text-base font-semibold text-slate-900 tracking-tight">집안일 공유</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-400 hover:text-slate-700">
          로그아웃
        </button>
      </header>

      <main className="flex-1 px-5 pb-24 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
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
                `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] ${
                  isActive ? 'text-[#6b4226] font-medium' : 'text-slate-400'
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
