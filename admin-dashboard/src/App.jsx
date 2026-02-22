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
import { isLoggedIn, logout } from './services/api'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DrillsPage from './pages/DrillsPage'
import WorkoutsPage from './pages/WorkoutsPage'
import StudentsPage from './pages/StudentsPage'
import MessagesPage from './pages/MessagesPage'

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


// ---------- APP LAYOUT ----------
// The sidebar + main content area (only shown when logged in)

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuthenticated } = useAuth()

  function handleLogout() {
    logout()
    setAuthenticated(false)
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
          {/* Catch-all: redirect unknown routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}


// ---------- MAIN APP ----------

export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn())
  const [toasts, setToasts] = useState([])

  function showToast(message, type = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  return (
    <AuthContext.Provider value={{ authenticated, setAuthenticated }}>
      <ToastContext.Provider value={showToast}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={
              authenticated ? <Navigate to="/" replace /> : <LoginPage />
            } />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout />
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
