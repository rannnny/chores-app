import { NavLink, Outlet } from 'react-router-dom'

function TabIcon({ name }: { name: 'home' | 'chores' | 'history' | 'stats' | 'settings' }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 11 12 4l8 7" />
          <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
          <path d="M10 20v-5h4v5" />
        </svg>
      )
    case 'chores':
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 3h6v2H9z" />
          <path d="M8 9.5l1.3 1.3L12 8" />
          <line x1="14" y1="9.5" x2="16.5" y2="9.5" />
          <path d="M8 15.5l1.3 1.3L12 14" />
          <line x1="14" y1="15.5" x2="16.5" y2="15.5" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v4.5l3 2" />
        </svg>
      )
    case 'stats':
      return (
        <svg {...common}>
          <line x1="5" y1="20" x2="5" y2="13" />
          <line x1="12" y1="20" x2="12" y2="9" />
          <line x1="19" y1="20" x2="19" y2="5" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <circle cx="9" cy="6" r="2" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <circle cx="15" cy="12" r="2" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="9" cy="18" r="2" />
        </svg>
      )
  }
}

const tabs = [
  { to: '/', label: '홈', icon: 'home' as const },
  { to: '/chores', label: '집안일', icon: 'chores' as const },
  { to: '/history', label: '이력', icon: 'history' as const },
  { to: '/stats', label: '통계', icon: 'stats' as const },
  { to: '/settings', label: '설정', icon: 'settings' as const },
]

export default function Layout() {
  return (
    <div className="h-dvh flex flex-col text-[#495057] bg-white">
      <main className="flex-1 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 border-t border-[#f1e3d3] backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                  isActive ? 'text-[#B5650F] font-medium' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-full ${
                      isActive ? 'bg-[#FFE8CC]' : ''
                    }`}
                  >
                    <TabIcon name={tab.icon} />
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
