/**
 * StudentsPage.jsx — Manage your student roster
 * 
 * View all students, see their stats, add new students,
 * and assign workouts to them.
 */

import { useState, useEffect } from 'react'
import { Plus, Users, UserPlus, Calendar, ChevronRight } from 'lucide-react'
import { 
  getStudents, createStudent, getWorkouts, 
  createBulkAssignments 
} from '../services/api'
import { useToast } from '../App'
import Modal from '../components/Modal'


export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
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
                  <th>Age</th>
                  <th>Position</th>
                  <th>Tier</th>
                  <th>Streak</th>
                  <th>Compliance</th>
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
                    </td>
                    <td>{student.age || '—'}</td>
                    <td>{student.position || '—'}</td>
                    <td>
                      {student.subscription_tier ? (
                        <span className="badge badge-category">
                          {student.subscription_tier}
                        </span>
                      ) : '—'}
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
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleAssignWorkout(student)}
                      >
                        <Calendar size={14} />
                        Assign
                      </button>
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
    subscription_tier: 'base',
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
                <option value="base">Base ($50/mo)</option>
                <option value="standard">Standard ($75/mo)</option>
                <option value="elite">Elite ($100+/mo)</option>
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
