/**
 * Sidebar.jsx — Left navigation panel
 * 
 * REACT CONCEPTS:
 * - Props: Data passed into a component (currentPath, onLogout)
 * - Link: React Router's version of <a> — navigates without page reload
 * - Conditional class names: We add "active" class based on current path
 */

import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Dumbbell, ClipboardList,
  Users, LogOut, Settings, MessageSquare
} from 'lucide-react'


const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/drills', label: 'Drill Library', icon: Dumbbell },
  { path: '/workouts', label: 'Workouts', icon: ClipboardList },
  { path: '/students', label: 'Students', icon: Users },
]


export default function Sidebar({ currentPath, onLogout }) {
  return (
    <aside className="sidebar">
      {/* Logo / Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">🏀</div>
          <span>CoachApp</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = currentPath === item.path ||
            (item.path !== '/' && currentPath.startsWith(item.path))

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="nav-link" onClick={onLogout}>
          <LogOut />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
