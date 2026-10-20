import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Bell,
  Bot,
  ChevronDown,
  CircleHelp,
  FileSearch,
  Menu,
  Search,
  ShieldCheck,
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

        <div className="sidebar__bottom">
          <div className="sidebar__security">
            <div className="security-icon">
              <ShieldCheck size={18} aria-hidden="true" />
            </div>
            <div>
              <strong>Secure workspace</strong>
              <span>Internal use only</span>
            </div>
          </div>
          <div className="sidebar__version">RPA PORTAL <span>·</span> 1.0.0</div>
        </div>
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
            <div className="breadcrumbs">
              <span>Operations</span>
              <span className="breadcrumbs__separator">/</span>
              <strong>{pageName}</strong>
            </div>
          </div>
          <div className="topbar__right">
            <label className="global-search">
              <Search size={17} aria-hidden="true" />
              <input aria-label="Search portal" placeholder="Search portal" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button topbar__help" aria-label="Help">
              <CircleHelp size={19} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications, 2 unread"
            >
              <Bell size={19} />
              <span className="notification-button__dot" />
            </button>
            <span className="topbar__divider" />
            <button className="profile-button" aria-label="Account menu">
              <span className="profile-avatar">JL</span>
              <span className="profile-button__name">
                <strong>Operations</strong>
                <small>Team workspace</small>
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="environment-banner">
            <Activity size={14} aria-hidden="true" />
            Internal operations workspace
            <span className="environment-banner__dot" />
            Mock data
          </div>
          <Outlet />
          <footer className="page-footer">
            <span>Jubilee Life Insurance</span>
            <span>Internal RPA operations portal</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
