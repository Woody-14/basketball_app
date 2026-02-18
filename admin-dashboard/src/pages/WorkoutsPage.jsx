/**
 * WorkoutsPage.jsx — Build and manage workouts
 * 
 * The coach creates workouts by selecting drills from their library
 * and arranging them in order. Workouts can be saved as reusable templates.
 */

import { useState, useEffect } from 'react'
import { Plus, ClipboardList, GripVertical, Trash2, Clock } from 'lucide-react'
import { getWorkouts, getWorkout, createWorkout, deleteWorkout, getDrills } from '../services/api'
import { useToast } from '../App'
import Modal from '../components/Modal'

const CATEGORY_LABELS = {
  ball_handling: 'Ball Handling', shooting_form: 'Shooting Form',
  shooting_midrange: 'Midrange', shooting_three: '3-Point',
  free_throws: 'Free Throws', finishing: 'Finishing', footwork: 'Footwork',
  defense: 'Defense', passing: 'Passing', conditioning: 'Conditioning',
  basketball_iq: 'Basketball IQ', warmup: 'Warm Up', cooldown: 'Cool Down',
}


export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [viewingWorkout, setViewingWorkout] = useState(null)

  const showToast = useToast()

  useEffect(() => { loadWorkouts() }, [])

  async function loadWorkouts() {
    try {
      const data = await getWorkouts()
      setWorkouts(data)
    } catch (err) {
      showToast('Failed to load workouts', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleViewWorkout(workout) {
    try {
      const full = await getWorkout(workout.id)
      setViewingWorkout(full)
    } catch (err) {
      showToast('Failed to load workout details', 'error')
    }
  }

  async function handleDeleteWorkout(id) {
    if (!confirm('Delete this workout?')) return
    try {
      await deleteWorkout(id)
      setWorkouts(prev => prev.filter(w => w.id !== id))
      showToast('Workout deleted')
    } catch (err) {
      showToast('Failed to delete workout', 'error')
    }
  }

  async function handleWorkoutCreated(workout) {
    setWorkouts(prev => [workout, ...prev])
    setShowBuilder(false)
    showToast(`Created "${workout.name}"`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workouts</h1>
          <p className="page-subtitle">
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowBuilder(true)}>
          <Plus size={16} />
          Build Workout
        </button>
      </div>

      {loading ? (
        <p className="text-secondary">Loading workouts...</p>
      ) : workouts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ClipboardList size={48} />
            <h3>No workouts yet</h3>
            <p className="text-sm text-secondary">
              Build your first workout by selecting drills from your library.
            </p>
            <button className="btn btn-primary mt-md" onClick={() => setShowBuilder(true)}>
              <Plus size={16} /> Build Your First Workout
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Drills</th>
                  <th>Duration</th>
                  <th>Template</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {workouts.map(workout => (
                  <tr key={workout.id}>
                    <td 
                      style={{ fontWeight: 600, cursor: 'pointer' }} 
                      onClick={() => handleViewWorkout(workout)}
                    >
                      {workout.name}
                    </td>
                    <td className="text-mono">{workout.drill_count}</td>
                    <td>
                      {workout.estimated_duration_minutes 
                        ? `${workout.estimated_duration_minutes} min` 
                        : '—'}
                    </td>
                    <td>
                      {workout.is_template && (
                        <span className="badge badge-category">Template</span>
                      )}
                    </td>
                    <td className="text-secondary text-sm">
                      {new Date(workout.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleDeleteWorkout(workout.id)}
                        title="Delete workout"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workout Builder Modal */}
      {showBuilder && (
        <WorkoutBuilder
          onSave={handleWorkoutCreated}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {/* Workout Detail View */}
      {viewingWorkout && (
        <WorkoutDetailModal
          workout={viewingWorkout}
          onClose={() => setViewingWorkout(null)}
        />
      )}
    </div>
  )
}


// ---------- WORKOUT BUILDER ----------

function WorkoutBuilder({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [selectedDrills, setSelectedDrills] = useState([]) // Drills added to this workout
  const [availableDrills, setAvailableDrills] = useState([]) // All drills from library
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    getDrills().then(setAvailableDrills).catch(console.error)
  }, [])

  function addDrill(drill) {
    setSelectedDrills(prev => [...prev, {
      drill_id: drill.id,
      drill, // Keep the full drill object for display
      order_index: prev.length,
      custom_sets: drill.default_sets || null,
      custom_reps: drill.default_reps || null,
      custom_duration_seconds: drill.default_duration_seconds || null,
      notes: '',
    }])
  }

  function removeDrill(index) {
    setSelectedDrills(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Re-number order indices
      return updated.map((d, i) => ({ ...d, order_index: i }))
    })
  }

  function moveDrill(index, direction) {
    setSelectedDrills(prev => {
      const updated = [...prev]
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= updated.length) return prev
      ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
      return updated.map((d, i) => ({ ...d, order_index: i }))
    })
  }

  // Estimate total duration
  const estimatedMinutes = Math.round(
    selectedDrills.reduce((total, d) => {
      const sets = d.custom_sets || 1
      const duration = d.custom_duration_seconds || 0
      const reps = d.custom_reps || 0
      // Rough estimate: each rep ~3 seconds, plus rest between sets
      const drillTime = duration > 0 
        ? (duration * sets) 
        : (reps * 3 * sets)
      return total + drillTime + (sets > 1 ? (sets - 1) * 30 : 0) // 30s rest between sets
    }, 0) / 60
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (selectedDrills.length === 0) {
      showToast('Add at least one drill to the workout', 'error')
      return
    }
    setSaving(true)
    try {
      const workoutData = {
        name,
        description: description || null,
        estimated_duration_minutes: estimatedMinutes || null,
        is_template: isTemplate,
        drills: selectedDrills.map(d => ({
          drill_id: d.drill_id,
          order_index: d.order_index,
          custom_sets: d.custom_sets,
          custom_reps: d.custom_reps,
          custom_duration_seconds: d.custom_duration_seconds,
          notes: d.notes || null,
        })),
      }
      const created = await createWorkout(workoutData)
      onSave(created)
    } catch (err) {
      showToast(err.message || 'Failed to create workout', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Build Workout" onClose={onClose} large>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {/* Workout Info */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Workout Name *</label>
              <input
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Beginner Ball Handling Day"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Options</label>
              <label style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                fontSize: '14px', cursor: 'pointer', paddingTop: '10px' 
              }}>
                <input
                  type="checkbox"
                  checked={isTemplate}
                  onChange={e => setIsTemplate(e.target.checked)}
                />
                Save as reusable template
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="form-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description for this workout"
            />
          </div>

          {/* Selected Drills */}
          <div className="form-group">
            <label className="form-label">
              Workout Drills ({selectedDrills.length})
              {estimatedMinutes > 0 && (
                <span style={{ 
                  fontWeight: 400, textTransform: 'none', 
                  letterSpacing: 'normal', marginLeft: '8px' 
                }}>
                  — ~{estimatedMinutes} min estimated
                </span>
              )}
            </label>

            {selectedDrills.length === 0 ? (
              <div style={{ 
                padding: '24px', textAlign: 'center', 
                border: '2px dashed var(--color-border)', 
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-light)', fontSize: '14px' 
              }}>
                Select drills from the library below to build your workout
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDrills.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button type="button" onClick={() => moveDrill(index, -1)} 
                        style={{ background: 'none', border: 'none', padding: '0', fontSize: '10px', color: 'var(--color-text-light)' }}>▲</button>
                      <button type="button" onClick={() => moveDrill(index, 1)}
                        style={{ background: 'none', border: 'none', padding: '0', fontSize: '10px', color: 'var(--color-text-light)' }}>▼</button>
                    </div>
                    <span className="text-mono text-secondary" style={{ fontSize: '12px', width: '20px' }}>
                      {index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.drill.name}</div>
                      <div className="text-sm text-secondary">
                        {CATEGORY_LABELS[item.drill.category]}
                        {item.custom_sets && ` · ${item.custom_sets} sets`}
                        {item.custom_reps && ` × ${item.custom_reps} reps`}
                        {item.custom_duration_seconds && ` · ${item.custom_duration_seconds}s`}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-icon" 
                      onClick={() => removeDrill(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drill Library (to pick from) */}
          <div className="form-group">
            <label className="form-label">Add Drills from Library</label>
            <div style={{
              maxHeight: '250px', overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}>
              {availableDrills.map(drill => (
                <div
                  key={drill.id}
                  onClick={() => addDrill(drill)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border-light)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <Plus size={16} style={{ color: 'var(--color-accent)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{drill.name}</div>
                    <div className="text-sm text-secondary">
                      {CATEGORY_LABELS[drill.category]} · {drill.difficulty}
                    </div>
                  </div>
                </div>
              ))}
              {availableDrills.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '14px' }}>
                  No drills in your library yet. Create some drills first!
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Workout'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


// ---------- WORKOUT DETAIL VIEW ----------

function WorkoutDetailModal({ workout, onClose }) {
  return (
    <Modal title={workout.name} onClose={onClose} large>
      <div className="modal-body">
        {workout.description && (
          <p className="text-secondary mb-md">{workout.description}</p>
        )}

        {workout.estimated_duration_minutes && (
          <div className="flex items-center gap-sm mb-md">
            <Clock size={16} className="text-secondary" />
            <span className="text-sm text-secondary">
              ~{workout.estimated_duration_minutes} minutes
            </span>
          </div>
        )}

        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)', 
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Drills ({workout.drills?.length || 0})
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {workout.drills?.map((item, index) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', background: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
            }}>
              <span className="text-mono" style={{ 
                fontSize: '12px', color: 'var(--color-accent)', fontWeight: 700,
                width: '24px', textAlign: 'center'
              }}>
                {index + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.drill?.name}</div>
                <div className="text-sm text-secondary">
                  {item.drill && CATEGORY_LABELS[item.drill.category]}
                  {item.custom_sets && ` · ${item.custom_sets} sets`}
                  {item.custom_reps && ` × ${item.custom_reps} reps`}
                  {item.custom_duration_seconds && ` · ${item.custom_duration_seconds}s`}
                </div>
                {item.notes && (
                  <div className="text-sm" style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    {item.notes}
                  </div>
                )}
              </div>
              <span className={`badge badge-${item.drill?.difficulty}`}>
                {item.drill?.difficulty}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
