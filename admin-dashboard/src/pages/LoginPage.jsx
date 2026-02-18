/**
 * LoginPage.jsx — Coach login screen
 * 
 * REACT CONCEPTS:
 * - useState: We track what the user types in the email/password fields
 * - async/await: Login is an async operation (talks to the server)
 * - Event handling: onSubmit runs when the form is submitted
 * - useNavigate: Programmatic navigation (redirect after login)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import { useAuth } from '../App'


export default function LoginPage() {
  // These track what's typed in the form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { setAuthenticated } = useAuth()

  async function handleSubmit(e) {
    // Prevent the browser's default form submission (which would reload the page)
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      setAuthenticated(true)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', fontSize: '48px', marginBottom: '16px' }}>🏀</div>
        <h1 className="login-title">Coach Dashboard</h1>
        <p className="login-subtitle">Sign in to manage your players</p>

        {error && <div className="login-error">{error}</div>}

        {/* 
          REACT FORMS: Instead of the browser submitting the form,
          we handle it ourselves with onSubmit. Each input's value
          is tied to a state variable, and onChange updates it.
        */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="coach@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
