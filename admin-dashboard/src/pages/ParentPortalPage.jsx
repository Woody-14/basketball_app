/**
 * ParentPortalPage.jsx — Read-only parent portal
 *
 * Parents are the paying customers for K-12 students. This page lets them
 * see exactly what their child is working on, how they're progressing, and
 * what feedback their coach has given — building trust and justifying the
 * subscription.
 *
 * Layout: no sidebar, single-page view with a top nav bar.
 */

import { useState, useEffect } from 'react'
import { LogOut, Flame, Target, Calendar, CheckCircle, Clock, Star, Lock } from 'lucide-react'
import { logout, getMe, getParentChild, getParentChildAssignments, getParentChildSkillAssessment, getParentChildFormChecks, changePassword } from '../services/api'
import { useAuth } from '../App'


// ---------- INLINE RADAR CHART (browser SVG) ----------

const SKILLS = [
  { key: 'ball_handling',     label: 'Ball Handling' },
  { key: 'shooting_form',     label: 'Shooting Form' },
  { key: 'shooting_accuracy', label: 'Accuracy' },
  { key: 'footwork',          label: 'Footwork' },
  { key: 'finishing',         label: 'Finishing' },
  { key: 'court_vision',      label: 'Court Vision' },
  { key: 'athleticism',       label: 'Athletic' },
  { key: 'defense',           label: 'Defense' },
]

const N = SKILLS.length
const MAX_SCORE = 10
const RINGS = [0.33, 0.67, 1.0]

function polar(cx, cy, r, i) {
  const angle = (2 * Math.PI * i) / N - Math.PI / 2
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function pts(cx, cy, r) {
  return Array.from({ length: N }, (_, i) => {
    const p = polar(cx, cy, r, i)
    return `${p.x},${p.y}`
  }).join(' ')
}

function scorePts(cx, cy, maxR, data) {
  return SKILLS.map((s, i) => {
    const val = data[s.key] ?? 0
    const r = (val / MAX_SCORE) * maxR
    const p = polar(cx, cy, r, i)
    return `${p.x},${p.y}`
  }).join(' ')
}

function ParentRadar({ data, size = 240 }) {
  const cx = size / 2, cy = size / 2
  const maxR = size * 0.33
  const labelR = maxR + 22
  const hasScore = SKILLS.some(s => data[s.key] > 0)

  return (
    <svg width={size} height={size}>
      {RINGS.map((pct, ri) => (
        <polygon key={ri} points={pts(cx, cy, maxR * pct)}
          fill="none" stroke="var(--color-border)" strokeWidth={1} />
      ))}
      {SKILLS.map((_, i) => {
        const o = polar(cx, cy, maxR, i)
        return <line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y}
          stroke="var(--color-border)" strokeWidth={1} />
      })}
      {hasScore && (
        <polygon points={scorePts(cx, cy, maxR, data)}
          fill="rgba(255,92,22,0.15)" stroke="#FF5C16" strokeWidth={2} strokeLinejoin="round" />
      )}
      {hasScore && SKILLS.map((s, i) => {
        const val = data[s.key] ?? 0
        if (!val) return null
        const r = (val / MAX_SCORE) * maxR
        const p = polar(cx, cy, r, i)
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill="#FF5C16" />
      })}
      {SKILLS.map((s, i) => {
        const p = polar(cx, cy, labelR, i)
        const anchor = p.x < cx - 4 ? 'end' : p.x > cx + 4 ? 'start' : 'middle'
        return (
          <text key={i} x={p.x} y={p.y} textAnchor={anchor}
            dominantBaseline="middle" fontSize={9} fontWeight="600"
            fill="var(--color-text-secondary)">
            {s.label}
          </text>
        )
      })}
    </svg>
  )
}


// ---------- SKILL SCORE ROW ----------

function SkillRow({ label, value }) {
  const pct = value ? Math.round((value / 10) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          {value ? value.toFixed(1) : '—'}<span style={{ fontWeight: 400, color: 'var(--color-text-light)', fontSize: 11 }}>/10</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #FF5C16, #FF8A4C)',
          borderRadius: 99,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}


// ---------- STAT CARD ----------

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: 'var(--shadow-sm)',
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-sm)',
        background: color || 'var(--color-accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={color ? '#fff' : 'var(--color-accent)'} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--color-text-light)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}


// ---------- MAIN COMPONENT ----------

export default function ParentPortalPage() {
  const { setAuthenticated, setRole } = useAuth()
  const [parent, setParent] = useState(null)
  const [child, setChild] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [skillAssessment, setSkillAssessment] = useState(null)
  const [formChecks, setFormChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showChangePwd, setShowChangePwd] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const me = await getMe()
        setParent(me)

        // Load child data — if no child is linked yet, show a friendly message
        const childData = await getParentChild().catch(err => {
          if (err.message && err.message.includes('linked')) {
            setError('not_linked')
          } else {
            setError(err.message || 'Failed to load player data')
          }
          return null
        })

        if (!childData) return  // Stop here if no child

        const [assignmentsData, skillData, checksData] = await Promise.all([
          getParentChildAssignments().catch(() => []),
          getParentChildSkillAssessment().catch(() => null),
          getParentChildFormChecks().catch(() => []),
        ])
        setChild(childData)
        setAssignments(assignmentsData)
        setSkillAssessment(skillData)
        setFormChecks(checksData)
      } catch (err) {
        setError(err.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleLogout() {
    logout()
    setAuthenticated(false)
    setRole(null)
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading your child's progress...</p>
      </div>
    )
  }

  if (error) {
    const isNotLinked = error === 'not_linked'
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <header style={{ background: 'var(--color-sidebar)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sidebar)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🏀</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Player Progress Portal</span>
          </div>
          {parent && <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>Hi, {parent.first_name}</span>}
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', color: 'rgba(255,255,255,0.8)', padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
            <LogOut size={14} /> Sign Out
          </button>
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', flexDirection: 'column', gap: 16, padding: 24 }}>
          <div style={{ fontSize: 48 }}>{isNotLinked ? '🔗' : '⚠️'}</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {isNotLinked ? 'Account Not Linked Yet' : 'Something went wrong'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 400, margin: 0 }}>
            {isNotLinked
              ? "Your parent account hasn't been linked to a player yet. Contact your coach and ask them to link your account from the Students page."
              : error}
          </p>
          <button className="btn btn-secondary" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
    )
  }

  const recent10 = assignments.slice(0, 10)
  const recent5Checks = formChecks.slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ---- TOP NAV BAR ---- */}
      <header style={{
        background: 'var(--color-sidebar)',
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sidebar)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🏀</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Player Progress Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {parent && (
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
              Hi, {parent.first_name}
            </span>
          )}
          <button
            onClick={() => setShowChangePwd(true)}
            title="Change Password"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-sm)',
              color: 'rgba(255,255,255,0.8)',
              padding: '6px 14px',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <Lock size={14} /> Password
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-sm)',
              color: 'rgba(255,255,255,0.8)',
              padding: '6px 14px',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {/* ---- PAGE CONTENT ---- */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* ---- CHILD PROFILE CARD ---- */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          marginBottom: 24,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                {child.first_name} {child.last_name}
              </h1>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                {child.position && (
                  <span className="badge badge-info">{child.position}</span>
                )}
                {child.school && (
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{child.school}</span>
                )}
                {child.age && (
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Age {child.age}</span>
                )}
                {child.subscription_tier && (
                  <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{child.subscription_tier}</span>
                )}
              </div>
            </div>

            {/* Streak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-accent-light)', borderRadius: 'var(--radius-md)', padding: '12px 20px' }}>
              <Flame size={28} color="var(--color-accent)" />
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1 }}>{child.current_streak}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>day streak</div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
            <StatCard
              icon={Target}
              label="Completion Rate"
              value={`${child.compliance_rate}%`}
              sub={`${child.total_completed} of ${child.total_assigned} completed`}
            />
            <StatCard
              icon={CheckCircle}
              label="Workouts Completed"
              value={child.total_completed}
              color="var(--color-success)"
            />
            <StatCard
              icon={Flame}
              label="Best Streak"
              value={`${child.longest_streak} days`}
              color="#FF5C16"
            />
          </div>

          {/* Badges */}
          {child.badges && child.badges.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badges Earned</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {child.badges.map(badge => (
                  <div key={badge.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--color-accent-light)',
                    border: '1px solid rgba(255,92,22,0.2)',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 12px',
                    fontSize: 12, fontWeight: 600, color: 'var(--color-accent)',
                  }}>
                    <Star size={12} />
                    {badge.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- TWO-COLUMN LAYOUT ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ---- SKILL ASSESSMENT ---- */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--color-border)',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px' }}>Skill Assessment</h2>

            {!skillAssessment ? (
              <p style={{ color: 'var(--color-text-light)', fontSize: 14, fontStyle: 'italic' }}>
                No skill assessment yet — coach hasn't rated skills yet.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 12, color: 'var(--color-text-light)', marginBottom: 16 }}>
                  Assessed {formatDate(skillAssessment.assessed_at)}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <ParentRadar data={skillAssessment} size={220} />
                </div>
                <div>
                  {SKILLS.map(s => (
                    <SkillRow key={s.key} label={s.label} value={skillAssessment[s.key]} />
                  ))}
                </div>
                {skillAssessment.notes && (
                  <div style={{
                    marginTop: 16, padding: '12px 14px',
                    background: 'var(--color-accent-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13, color: 'var(--color-text)',
                    borderLeft: '3px solid var(--color-accent)',
                  }}>
                    <strong style={{ fontSize: 11, color: 'var(--color-accent)', display: 'block', marginBottom: 4 }}>COACH NOTES</strong>
                    {skillAssessment.notes}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ---- RIGHT COLUMN ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ---- RECENT WORKOUTS ---- */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--color-border)',
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px' }}>
                Recent Workouts <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--color-text-light)' }}>last 60 days</span>
              </h2>

              {recent10.length === 0 ? (
                <p style={{ color: 'var(--color-text-light)', fontSize: 14, fontStyle: 'italic' }}>No workouts assigned yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recent10.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--color-bg)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border-light)',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{a.workout_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-light)', marginTop: 2 }}>{formatDate(a.assigned_date)} · {a.drill_count} drills</div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '3px 8px', borderRadius: 'var(--radius-full)',
                        background: a.status === 'completed' ? 'rgba(16,185,129,0.12)' : a.status === 'missed' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                        color: a.status === 'completed' ? 'var(--color-success)' : a.status === 'missed' ? 'var(--color-danger)' : 'var(--color-info)',
                        textTransform: 'capitalize',
                      }}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ---- FORM CHECKS / COACH FEEDBACK ---- */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--color-border)',
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px' }}>
                Coach Feedback <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--color-text-light)' }}>form checks</span>
              </h2>

              {recent5Checks.length === 0 ? (
                <p style={{ color: 'var(--color-text-light)', fontSize: 14, fontStyle: 'italic' }}>
                  No form check videos submitted yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recent5Checks.map(fc => (
                    <div key={fc.id} style={{
                      padding: '14px',
                      background: 'var(--color-bg)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border-light)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                          {fc.drill_name || 'Drill'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {fc.is_reviewed ? (
                            <CheckCircle size={14} color="var(--color-success)" />
                          ) : (
                            <Clock size={14} color="var(--color-text-light)" />
                          )}
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: fc.is_reviewed ? 'var(--color-success)' : 'var(--color-text-light)',
                          }}>
                            {fc.is_reviewed ? 'Reviewed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-light)', marginBottom: 6 }}>
                        {formatDate(fc.completed_at)}
                        {fc.assigned_date && ` · workout from ${formatDate(fc.assigned_date)}`}
                      </div>
                      {fc.coach_feedback ? (
                        <div style={{
                          fontSize: 13, color: 'var(--color-text)',
                          padding: '8px 10px',
                          background: 'var(--color-accent-light)',
                          borderRadius: 6,
                          borderLeft: '3px solid var(--color-accent)',
                        }}>
                          {fc.coach_feedback}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: 'var(--color-text-light)', fontStyle: 'italic', margin: 0 }}>
                          Awaiting coach feedback...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ---- CHANGE PASSWORD MODAL ---- */}
      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </div>
  )
}


// ---------- CHANGE PASSWORD MODAL ----------

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (form.next.length < 8) { setErr('New password must be at least 8 characters.'); return }
    if (form.next !== form.confirm) { setErr('New passwords do not match.'); return }
    setSaving(true)
    try {
      await changePassword(form.current, form.next)
      setSuccess(true)
    } catch (e) {
      setErr(e.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        padding: 32, width: 400, boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Change Password</h2>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle size={40} color="var(--color-success)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 4 }}>Password updated!</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 20 }}>Your password has been changed successfully.</p>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password" className="form-input" required
                value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password" className="form-input" required minLength={8}
                placeholder="At least 8 characters"
                value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password" className="form-input" required
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              />
            </div>

            {err && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{err}</p>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
