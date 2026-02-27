/**
 * App.jsx — Main application component
 *
 * REACT CONCEPTS IN THIS FILE:
 * - useState: Stores data that can change (like whether you're logged in)
 * - BrowserRouter/Routes: Handles page navigation without refreshing
 * - Components: Reusable pieces of UI (Sidebar, pages, etc.)
 * - Conditional rendering: Show login page OR dashboard based on auth state
 */

import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isLoggedIn, logout, getMe } from './services/api'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DrillsPage from './pages/DrillsPage'
import WorkoutsPage from './pages/WorkoutsPage'
import StudentsPage from './pages/StudentsPage'
import MessagesPage from './pages/MessagesPage'
import VideoReviewPage from './pages/VideoReviewPage'
import ParentPortalPage from './pages/ParentPortalPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ContentPage from './pages/ContentPage'

// Components
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'


// ---------- AUTH CONTEXT ----------
// This lets any component in the app check if the user is logged in
// without passing the info through every single component manually.

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}


// ---------- TOAST CONTEXT ----------
// Global notification system — any component can show a toast.

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}


// ---------- PROTECTED ROUTE ----------
// Wraps pages that require login. If not logged in, redirects to /login.

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}


// ---------- COACH APP LAYOUT ----------
// The sidebar + main content area (only shown when logged in as coach)

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuthenticated, setRole } = useAuth()

  function handleLogout() {
    logout()
    setAuthenticated(false)
    setRole(null)
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <Sidebar currentPath={location.pathname} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/drills" element={<DrillsPage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/video-review" element={<VideoReviewPage />} />
          {/* Catch-all: redirect unknown routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}


// ---------- ROLE-BASED LAYOUT ----------
// Decides whether to render the coach layout or parent portal.

function RoleLayout() {
  const { role } = useAuth()

  // While we're still fetching the role, show nothing (avoids flash)
  if (role === undefined) return null

  if (role === 'parent') {
    return <ParentPortalPage />
  }

  return <AppLayout />
}


// ---------- MAIN APP ----------

export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn())
  // undefined = fetching, null = not logged in, 'coach'/'parent'/'student' = known
  const [role, setRole] = useState(() => {
    if (!isLoggedIn()) return null
    const cached = localStorage.getItem('user_role')
    return cached !== null ? cached : undefined
  })
  const [toasts, setToasts] = useState([])

  // On mount (or when auth state changes), fetch the logged-in user's role
  useEffect(() => {
    if (!isLoggedIn()) {
      setRole(null)
      return
    }
    // If we already have the role cached, no need to re-fetch
    const cached = localStorage.getItem('user_role')
    if (cached) {
      setRole(cached)
      return
    }
    getMe()
      .then(user => {
        localStorage.setItem('user_role', user.role)
        setRole(user.role)
      })
      .catch(() => {
        // Token invalid — force logout
        logout()
        setAuthenticated(false)
        setRole(null)
      })
  }, [authenticated])

  function showToast(message, type = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  return (
    <AuthContext.Provider value={{ authenticated, setAuthenticated, role, setRole }}>
      <ToastContext.Provider value={showToast}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={
              authenticated ? <Navigate to="/" replace /> : <LoginPage />
            } />
            <Route path="/*" element={
              <ProtectedRoute>
                <RoleLayout />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>

        {/* Global toast notifications */}
        <div className="toast-container">
          {toasts.map(toast => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  )
}
