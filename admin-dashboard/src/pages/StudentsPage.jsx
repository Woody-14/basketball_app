/**
 * StudentsPage.jsx — Manage your student roster
 * 
 * View all students, see their stats, add new students,
 * and assign workouts to them.
 */

import { useState, useEffect } from 'react'
import { Users, UserPlus, Calendar, Activity, ShieldCheck, FileText, Trash2 } from 'lucide-react'
import {
  getStudents, createStudent, getWorkouts,
  createBulkAssignments, getStudentSkillAssessments, createSkillAssessment,
  createParentAccount, updateStudent, deleteStudent,
} from '../services/api'

const PHASES = [
  { value: 'foundation',        label: 'Foundation',        color: '#7C3AED' },
  { value: 'skill_development', label: 'Skill Development', color: '#2563EB' },
  { value: 'pre_season',        label: 'Pre-Season',        color: '#D97706' },
  { value: 'in_season',         label: 'In-Season',         color: '#16A34A' },
  { value: 'post_season',       label: 'Post-Season',       color: '#6B7280' },
]
const PHASE_MAP = Object.fromEntries(PHASES.map(p => [p.value, p]))
import { useToast } from '../App'
import Modal from '../components/Modal'


export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [showParentModal, setShowParentModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const showToast = useToast()

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    try {
      const data = await getStudents()
      setStudents(data)
    } catch (err) {
      showToast('Failed to load students', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddStudent(data) {
    try {
      const student = await createStudent(data)
      setStudents(prev => [...prev, student])
      setShowAddModal(false)
      showToast(`Added ${student.first_name} ${student.last_name}`)
    } catch (err) {
      showToast(err.message || 'Failed to add student', 'error')
    }
  }

  function handleAssignWorkout(student) {
    setSelectedStudent(student)
    setShowAssignModal(true)
  }

  function handleRateSkills(student) {
    setSelectedStudent(student)
    setShowSkillModal(true)
  }

  function handleAddParent(student) {
    setSelectedStudent(student)
    setShowParentModal(true)
  }

  function handleProgressReport(student) {
    setSelectedStudent(student)
    setShowReportModal(true)
  }

  async function handleDeleteStudent(student) {
    if (!window.confirm(`Remove ${student.first_name} ${student.last_name} from the roster? Their history will be preserved.`)) return
    try {
      await deleteStudent(student.id)
      setStudents(prev => prev.filter(s => s.id !== student.id))
      showToast(`${student.first_name} removed from roster`)
    } catch (err) {
      showToast(err.message || 'Failed to remove student', 'error')
    }
  }

  async function handlePhaseChange(student, newPhase) {
    try {
      const updated = await updateStudent(student.id, { training_phase: newPhase || null })
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, training_phase: updated.training_phase } : s))
      showToast(`Phase updated for ${student.first_name}`)
    } catch (err) {
      showToast('Failed to update phase', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">
            {students.length} active student{students.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={16} />
          Add Student
        </button>
      </div>

      {loading ? (
        <p className="text-secondary">Loading students...</p>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={48} />
            <h3>No students yet</h3>
            <p className="text-sm text-secondary">
              Add your first student to start assigning workouts.
            </p>
            <button className="btn btn-primary mt-md" onClick={() => setShowAddModal(true)}>
              <UserPlus size={16} /> Add Your First Student
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Tier</th>
                  <th>Phase</th>
                  <th>Streak</th>
                  <th>Completion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="text-sm text-secondary">{student.email}</div>
                      {(student.position || student.age) && (
                        <div className="text-sm text-secondary">
                          {[student.position, student.age ? `Age ${student.age}` : null].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>
                      {student.subscription_tier === 'elite' ? (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Elite
                        </span>
                      ) : student.subscription_tier === 'training' ? (
                        <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>Training</span>
                      ) : student.subscription_tier ? (
                        <span className="badge" style={{ textTransform: 'capitalize' }}>{student.subscription_tier}</span>
                      ) : '—'}
                    </td>
                    <td>
                      {(() => {
                        const meta = student.training_phase ? PHASE_MAP[student.training_phase] : null
                        return (
                          <select
                            value={student.training_phase || ''}
                            onChange={e => handlePhaseChange(student, e.target.value)}
                            style={{
                              border: `1.5px solid ${meta ? meta.color : 'var(--color-border)'}`,
                              borderRadius: 8,
                              padding: '3px 6px',
                              fontSize: 12,
                              fontWeight: meta ? 600 : 400,
                              color: meta ? meta.color : 'var(--color-text-secondary)',
                              background: meta ? meta.color + '10' : 'transparent',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="">No Phase</option>
                            {PHASES.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        )
                      })()}
                    </td>
                    <td>
                      <span className="text-mono">
                        {student.current_streak}
                      </span>
                      <span className="text-sm text-secondary"> days</span>
                    </td>
                    <td>
                      {student.compliance_rate != null ? (
                        <span style={{
                          fontWeight: 600,
                          color: student.compliance_rate >= 80
                            ? 'var(--color-success)'
                            : student.compliance_rate >= 50
                              ? 'var(--color-warning)'
                              : 'var(--color-danger)'
                        }}>
                          {student.compliance_rate}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleAssignWorkout(student)}
                          title="Assign Workout"
                          style={{ padding: '4px 8px' }}
                        >
                          <Calendar size={15} />
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleRateSkills(student)}
                          title="Rate Skills"
                          style={{ padding: '4px 8px' }}
                        >
                          <Activity size={15} />
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleAddParent(student)}
                          title="Add Parent Account"
                          style={{ padding: '4px 8px' }}
                        >
                          <ShieldCheck size={15} />
                        </button>
                        {student.subscription_tier === 'elite' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleProgressReport(student)}
                            title="Progress Report"
                            style={{ padding: '4px 8px', color: '#D97706' }}
                          >
                            <FileText size={15} />
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleDeleteStudent(student)}
                          title="Remove Student"
                          style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          onSave={handleAddStudent}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Assign Workout Modal */}
      {showAssignModal && selectedStudent && (
        <AssignWorkoutModal
          student={selectedStudent}
          onClose={() => { setShowAssignModal(false); setSelectedStudent(null) }}
        />
      )}

      {/* Skill Assessment Modal */}
      {showSkillModal && selectedStudent && (
        <SkillAssessmentModal
          student={selectedStudent}
          onClose={() => { setShowSkillModal(false); setSelectedStudent(null) }}
        />
      )}

      {/* Add Parent Modal */}
      {showParentModal && selectedStudent && (
        <AddParentModal
          student={selectedStudent}
          onClose={() => { setShowParentModal(false); setSelectedStudent(null) }}
        />
      )}

      {/* Progress Report Modal (Elite only) */}
      {showReportModal && selectedStudent && (
        <ProgressReportModal
          student={selectedStudent}
          onClose={() => { setShowReportModal(false); setSelectedStudent(null) }}
        />
      )}
    </div>
  )
}


// ---------- ADD STUDENT MODAL ----------

function AddStudentModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    age: '',
    position: '',
    school: '',
    subscription_tier: 'training',
  })
  const [saving, setSaving] = useState(false)

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      age: form.age ? parseInt(form.age) : null,
      role: 'student',
    })
    setSaving(false)
  }

  return (
    <Modal title="Add New Student" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                className="form-input"
                value={form.first_name}
                onChange={e => updateField('first_name', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                className="form-input"
                value={form.last_name}
                onChange={e => updateField('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder="student@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Temporary Password *</label>
              <input
                type="text"
                className="form-input"
                value={form.password}
                onChange={e => updateField('password', e.target.value)}
                placeholder="They'll change this later"
                required
              />
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                type="number"
                className="form-input"
                value={form.age}
                onChange={e => updateField('age', e.target.value)}
                min="5" max="18"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Position</label>
              <select
                className="form-select"
                value={form.position}
                onChange={e => updateField('position', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="PG">PG — Point Guard</option>
                <option value="SG">SG — Shooting Guard</option>
                <option value="SF">SF — Small Forward</option>
                <option value="PF">PF — Power Forward</option>
                <option value="C">C — Center</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tier</label>
              <select
                className="form-select"
                value={form.subscription_tier}
                onChange={e => updateField('subscription_tier', e.target.value)}
              >
                <option value="training">Training ($90/mo)</option>
                <option value="elite">Elite ($195/mo)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">School</label>
            <input
              className="form-input"
              value={form.school}
              onChange={e => updateField('school', e.target.value)}
              placeholder="School or team name"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Student Account'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


// ---------- ASSIGN WORKOUT MODAL ----------

function AssignWorkoutModal({ student, onClose }) {
  const [workouts, setWorkouts] = useState([])
  const [selectedWorkout, setSelectedWorkout] = useState('')
  const [dates, setDates] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    getWorkouts().then(setWorkouts).catch(console.error)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedWorkout || !dates.trim()) {
      showToast('Select a workout and enter at least one date', 'error')
      return
    }

    setSaving(true)
    try {
      // Parse comma-separated dates
      const dateList = dates.split(',').map(d => d.trim()).filter(Boolean)

      await createBulkAssignments({
        workout_id: parseInt(selectedWorkout),
        student_id: student.id,
        dates: dateList,
      })

      showToast(`Assigned workout to ${student.first_name} for ${dateList.length} day(s)`)
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to assign workout', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Assign Workout to ${student.first_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Select Workout *</label>
            <select
              className="form-select"
              value={selectedWorkout}
              onChange={e => setSelectedWorkout(e.target.value)}
              required
            >
              <option value="">Choose a workout...</option>
              {workouts.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.drill_count} drills
                  {w.estimated_duration_minutes ? `, ~${w.estimated_duration_minutes} min` : ''})
                </option>
              ))}
            </select>
            {workouts.length === 0 && (
              <p className="text-sm text-secondary mt-md">
                No workouts created yet. Build one first!
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Dates (comma separated) *</label>
            <input
              className="form-input"
              value={dates}
              onChange={e => setDates(e.target.value)}
              placeholder="2026-02-19, 2026-02-21, 2026-02-23"
            />
            <p className="text-sm text-secondary" style={{ marginTop: '6px' }}>
              Use YYYY-MM-DD format. Separate multiple dates with commas for a full week.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || workouts.length === 0}>
            {saving ? 'Assigning...' : 'Assign Workout'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


// ---------- SKILL ASSESSMENT MODAL ----------

const SKILL_FIELDS = [
  { key: 'ball_handling',     label: 'Ball Handling' },
  { key: 'shooting_form',     label: 'Shooting Form' },
  { key: 'shooting_accuracy', label: 'Shooting Accuracy' },
  { key: 'footwork',          label: 'Footwork' },
  { key: 'finishing',         label: 'Finishing' },
  { key: 'court_vision',      label: 'Court Vision / IQ' },
  { key: 'athleticism',       label: 'Athleticism' },
  { key: 'defense',           label: 'Defense' },
]

const N = SKILL_FIELDS.length
const SKILL_MAX = 10

/** Get x,y on a radar axis at value v/10 of maxRadius */
function radarPoint(cx, cy, maxR, value, index) {
  const angle = (2 * Math.PI * index) / N - Math.PI / 2
  const r = (value / SKILL_MAX) * maxR
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function buildPolygonPoints(cx, cy, maxR, scores) {
  return SKILL_FIELDS.map((f, i) => {
    const { x, y } = radarPoint(cx, cy, maxR, scores[f.key] ?? 0, i)
    return `${x},${y}`
  }).join(' ')
}

function buildRingPoints(cx, cy, r) {
  return Array.from({ length: N }, (_, i) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}

/** Tiny inline SVG radar — no library needed in browser */
function MiniRadar({ scores }) {
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.36

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      {[0.33, 0.67, 1.0].map((pct, i) => (
        <polygon key={i} points={buildRingPoints(cx, cy, maxR * pct)}
          fill="none" stroke="var(--border)" strokeWidth="1" />
      ))}
      {SKILL_FIELDS.map((_, i) => {
        const outer = radarPoint(cx, cy, maxR, SKILL_MAX, i)
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y}
          stroke="var(--border)" strokeWidth="1" />
      })}
      <polygon points={buildPolygonPoints(cx, cy, maxR, scores)}
        fill="rgba(255,107,0,0.15)" stroke="var(--accent)"
        strokeWidth="2" strokeLinejoin="round" />
      {SKILL_FIELDS.map((f, i) => {
        const val = scores[f.key] ?? 0
        if (val === 0) return null
        const { x, y } = radarPoint(cx, cy, maxR, val, i)
        return <circle key={i} cx={x} cy={y} r="4" fill="var(--accent)" />
      })}
      {SKILL_FIELDS.map((f, i) => {
        const { x, y } = radarPoint(cx, cy, maxR + 18, SKILL_MAX, i)
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        return (
          <text key={i} x={x} y={y + 4} textAnchor={anchor}
            fontSize="10" fontWeight="600" fill="var(--text-secondary)">
            {f.label.split(' ')[0]}
          </text>
        )
      })}
    </svg>
  )
}


function SkillAssessmentModal({ student, onClose }) {
  const DEFAULT_SCORES = Object.fromEntries(SKILL_FIELDS.map(f => [f.key, 5]))
  const [scores, setScores] = useState(DEFAULT_SCORES)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  // Pre-populate with the student's latest assessment if one exists
  useEffect(() => {
    getStudentSkillAssessments(student.id)
      .then(data => {
        if (data && data.length > 0) {
          const latest = data[0]
          const populated = {}
          SKILL_FIELDS.forEach(f => { populated[f.key] = latest[f.key] ?? 5 })
          setScores(populated)
          setNotes(latest.notes || '')
        }
      })
      .catch(() => {})
  }, [student.id])

  function updateScore(key, value) {
    setScores(prev => ({ ...prev, [key]: Number(value) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createSkillAssessment(student.id, { ...scores, notes })
      showToast(`Skill assessment saved for ${student.first_name}!`)
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to save assessment', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Rate Skills — ${student.first_name} ${student.last_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div style={{ marginBottom: '20px' }}>
            <MiniRadar scores={scores} />
          </div>

          {SKILL_FIELDS.map(field => (
            <div key={field.key} className="form-group" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>{field.label}</label>
                <span style={{ fontWeight: 700, color: 'var(--accent)', minWidth: '28px', textAlign: 'right' }}>
                  {scores[field.key]}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={scores[field.key]}
                onChange={e => updateScore(field.key, e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>1 — Needs work</span>
                <span>10 — Elite</span>
              </div>
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="form-label">Coach Notes (optional)</label>
            <textarea
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Key observations from this evaluation..."
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Assessment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


// ---------- ADD PARENT MODAL ----------

function AddParentModal({ student, onClose }) {
  const showToast = useToast()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createParentAccount(student.id, form)
      showToast(`Parent account created for ${student.first_name} ${student.last_name}`)
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to create parent account', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Add Parent — ${student.first_name} ${student.last_name}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
        Create a read-only parent account. The parent will be able to log in and view their child's progress, workouts, and coach feedback.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input className="form-input" name="first_name" value={form.first_name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input className="form-input" name="last_name" value={form.last_name} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Parent Email</label>
          <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange}
            placeholder="parent@example.com" required />
        </div>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Temporary Password</label>
          <input className="form-input" type="password" name="password" value={form.password} onChange={handleChange}
            placeholder="They can change this later" minLength={8} required />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Parent Account'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


// ---------- PROGRESS REPORT MODAL (ELITE ONLY) ----------

function ProgressReportModal({ student, onClose }) {
  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  useEffect(() => {
    getStudentSkillAssessments(student.id)
      .then(data => { if (data && data.length > 0) setAssessment(data[0]) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [student.id])

  function handlePrint() {
    window.print()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, overflowY: 'auto', padding: '32px 16px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Print-only style — hides overlay chrome when printing */}
      <style>{`
        @media print {
          body > *:not(#progress-report-print) { display: none !important; }
          #progress-report-print { position: static !important; box-shadow: none !important; border-radius: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="progress-report-print" style={{
        background: '#fff', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 680, boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}>
        {/* Header bar */}
        <div style={{ background: '#111827', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Elite Player Progress Report
            </div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>
              {student.first_name} {student.last_name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
              {student.position && `${student.position} · `}{student.school && `${student.school} · `}Generated {today}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }} className="no-print">
            <button className="btn btn-primary" onClick={handlePrint}>Print / Save PDF</button>
            <button className="btn btn-secondary" onClick={onClose} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)' }}>Close</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px' }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Completion', value: student.compliance_rate != null ? `${student.compliance_rate}%` : '—' },
              { label: 'Workouts Done', value: student.total_completed ?? '—' },
              { label: 'Current Streak', value: student.current_streak ? `${student.current_streak}d` : '—' },
              { label: 'Best Streak', value: student.longest_streak ? `${student.longest_streak}d` : '—' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Skill Assessment */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
              Skill Assessment {assessment && `· ${new Date(assessment.assessed_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
            </h3>
            {loading ? (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading...</p>
            ) : !assessment ? (
              <p style={{ color: '#9ca3af', fontSize: 14, fontStyle: 'italic' }}>No skill assessment on file yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                {SKILL_FIELDS.map(f => {
                  const val = assessment[f.key]
                  const pct = val ? Math.round((val / 10) * 100) : 0
                  return (
                    <div key={f.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span style={{ color: '#374151' }}>{f.label}</span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{val ? val.toFixed(1) : '—'}/10</span>
                      </div>
                      <div style={{ height: 5, background: '#e5e7eb', borderRadius: 99, marginBottom: 8 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #FF5C16, #FF8A4C)', borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {assessment?.notes && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff7ed', borderRadius: 6, borderLeft: '3px solid #FF5C16', fontSize: 13, color: '#374151' }}>
                <strong style={{ fontSize: 11, color: '#FF5C16', display: 'block', marginBottom: 4 }}>COACH NOTES</strong>
                {assessment.notes}
              </div>
            )}
          </div>

          {/* Badges */}
          {student.badges && student.badges.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Badges Earned</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {student.badges.map(b => (
                  <span key={b.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600, color: '#c2410c' }}>
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, fontSize: 12, color: '#9ca3af' }}>
            This report reflects data as of {today}. Prepared by your basketball coach via the training platform.
          </div>
        </div>
      </div>
    </div>
  )
}
