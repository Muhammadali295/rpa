import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  FileSearch,
  Menu,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const navigation = [
  {
    label: 'Policy Assistant',
    path: '/policy-assistant',
    icon: Bot,
    end: false,
  },
  {
    label: 'Document Intelligence',
    path: '/document-intelligence',
    icon: FileSearch,
    end: false,
  },
]

const pageNames: Record<string, string> = {
  '/policy-assistant': 'Policy Assistant',
  '/document-intelligence': 'Document Intelligence',
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const pageName = pageNames[location.pathname] ?? 'Policy Assistant'

  function closeSidebar() {
    setSidebarOpen(false)
  }

  useEffect(() => {
    if (!sidebarOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}
        aria-label="Primary navigation"
      >
        <div className="brand">
          <img
            className="brand__logo"
            src="/jubilee-life-logo.png"
            alt="Jubilee Life Insurance"
          />
          <button
            className="icon-button sidebar__close"
            aria-label="Close navigation menu"
            onClick={closeSidebar}
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar__section-label">WORKSPACE</div>
        <nav className="sidebar__nav">
          {navigation.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link--active' : ''}`
              }
              onClick={closeSidebar}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {label === 'Document Intelligence' && (
                <span className="nav-link__tag">NEW</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              className="icon-button topbar__menu"
              ref={menuButtonRef}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <strong className="topbar__title">{pageName}</strong>
          </div>
        </header>

        <main className="main-content">
          {location.pathname !== '/document-intelligence' && (
            <div className="environment-banner">
              Internal operations workspace
              <span className="environment-banner__dot" />
              Mock data
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
