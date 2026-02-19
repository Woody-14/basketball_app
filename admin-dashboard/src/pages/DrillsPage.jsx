/**
 * DrillsPage.jsx — The coach's drill library
 * 
 * This is the heart of the admin experience. The coach browses their
 * library of drills, filters by category/difficulty, and can create
 * new drills or edit existing ones.
 * 
 * REACT CONCEPTS:
 * - Multiple state variables working together (drills, filters, modal)
 * - Lifting state: The filter values live here and affect what's displayed
 * - Callback functions: We pass handleSave down to the modal form
 */

import { useState, useEffect } from 'react'
import { 
  Plus, Search, Dumbbell, Play, Edit2, Trash2 
} from 'lucide-react'
import { getDrills, createDrill, updateDrill, deleteDrill, getTags } from '../services/api'
import { useToast } from '../App'
import Modal from '../components/Modal'
import VideoUploader from '../components/VideoUploader'


// Maps category enum values to readable labels
const CATEGORY_LABELS = {
  ball_handling: 'Ball Handling',
  shooting_form: 'Shooting Form',
  shooting_midrange: 'Midrange',
  shooting_three: '3-Point',
  free_throws: 'Free Throws',
  finishing: 'Finishing',
  footwork: 'Footwork',
  defense: 'Defense',
  passing: 'Passing',
  conditioning: 'Conditioning',
  basketball_iq: 'Basketball IQ',
  warmup: 'Warm Up',
  cooldown: 'Cool Down',
}

const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}


export default function DrillsPage() {
  const [drills, setDrills] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDrill, setEditingDrill] = useState(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')

  const showToast = useToast()

  useEffect(() => {
    loadDrills()
    loadTags()
  }, [])

  async function loadDrills() {
    try {
      const data = await getDrills()
      setDrills(data)
    } catch (err) {
      showToast('Failed to load drills', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadTags() {
    try {
      const data = await getTags()
      setTags(data)
    } catch (err) {
      console.error('Failed to load tags:', err)
    }
  }

  // Filter drills based on search and filter state
  const filteredDrills = drills.filter(drill => {
    if (search && !drill.name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (categoryFilter && drill.category !== categoryFilter) {
      return false
    }
    if (difficultyFilter && drill.difficulty !== difficultyFilter) {
      return false
    }
    return true
  })

  function handleNewDrill() {
    setEditingDrill(null)
    setShowModal(true)
  }

  function handleEditDrill(drill) {
    setEditingDrill(drill)
    setShowModal(true)
  }

  async function handleDeleteDrill(drill) {
    if (!confirm(`Delete "${drill.name}"? This cannot be undone.`)) return
    try {
      await deleteDrill(drill.id)
      setDrills(prev => prev.filter(d => d.id !== drill.id))
      showToast(`Deleted "${drill.name}"`)
    } catch (err) {
      showToast('Failed to delete drill', 'error')
    }
  }

  async function handleSaveDrill(drillData) {
    try {
      if (editingDrill) {
        const updated = await updateDrill(editingDrill.id, drillData)
        setDrills(prev => prev.map(d => d.id === updated.id ? updated : d))
        showToast(`Updated "${updated.name}"`)
      } else {
        const created = await createDrill(drillData)
        setDrills(prev => [...prev, created])
        showToast(`Created "${created.name}"`)
      }
      setShowModal(false)
    } catch (err) {
      showToast(err.message || 'Failed to save drill', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drill Library</h1>
          <p className="page-subtitle">
            {drills.length} drill{drills.length !== 1 ? 's' : ''} in your library
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleNewDrill}>
          <Plus size={16} />
          New Drill
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <Search />
          <input
            type="text"
            className="search-input"
            placeholder="Search drills..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={difficultyFilter}
          onChange={e => setDifficultyFilter(e.target.value)}
        >
          <option value="">All Difficulties</option>
          {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Drill Grid */}
      {loading ? (
        <p className="text-secondary">Loading drills...</p>
      ) : filteredDrills.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Dumbbell size={48} />
            <h3>{drills.length === 0 ? 'No drills yet' : 'No drills match your filters'}</h3>
            <p className="text-sm text-secondary">
              {drills.length === 0 
                ? 'Add your first drill to start building workouts.'
                : 'Try changing your search or filters.'}
            </p>
            {drills.length === 0 && (
              <button className="btn btn-primary mt-md" onClick={handleNewDrill}>
                <Plus size={16} /> Add Your First Drill
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="drill-grid">
          {filteredDrills.map(drill => (
            <div key={drill.id} className="drill-card" onClick={() => handleEditDrill(drill)}>
              <div className="drill-card-thumb">
                <Play size={48} />
                <span className={`difficulty-dot badge badge-${drill.difficulty}`}>
                  {DIFFICULTY_LABELS[drill.difficulty]}
                </span>
              </div>
              <div className="drill-card-body">
                <div className="drill-card-name">{drill.name}</div>
                <div className="drill-card-meta">
                  <span className="badge badge-category">
                    {CATEGORY_LABELS[drill.category] || drill.category}
                  </span>
                  {drill.default_sets && (
                    <span className="text-sm text-secondary">
                      {drill.default_sets} sets
                    </span>
                  )}
                  {drill.default_reps && (
                    <span className="text-sm text-secondary">
                      × {drill.default_reps} reps
                    </span>
                  )}
                  {drill.default_duration_seconds && (
                    <span className="text-sm text-secondary">
                      {drill.default_duration_seconds}s
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <DrillFormModal
          drill={editingDrill}
          tags={tags}
          onSave={handleSaveDrill}
          onClose={() => setShowModal(false)}
          onDelete={editingDrill ? () => handleDeleteDrill(editingDrill) : null}
        />
      )}
    </div>
  )
}


// ---------- DRILL FORM MODAL ----------

function DrillFormModal({ drill, tags, onSave, onClose, onDelete }) {
  /**
   * REACT CONCEPT: Controlled form
   * Every input's value is stored in state. When you type, the onChange
   * handler updates state, which re-renders the input with the new value.
   * This gives us full control over the form data.
   */
  const [form, setForm] = useState({
    video_key: drill?.video_key || '',
    name: drill?.name || '',
    description: drill?.description || '',
    coaching_cues: drill?.coaching_cues || '',
    category: drill?.category || 'ball_handling',
    difficulty: drill?.difficulty || 'beginner',
    default_duration_seconds: drill?.default_duration_seconds || '',
    default_reps: drill?.default_reps || '',
    default_sets: drill?.default_sets || '',
    video_url: drill?.video_url || '',
    tag_ids: drill?.tags?.map(t => t.id) || [],
  })
  const [saving, setSaving] = useState(false)

  // Helper to update a single form field
  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    // Convert empty strings to null for optional numeric fields
    const data = {
      ...form,
      default_duration_seconds: form.default_duration_seconds || null,
      default_reps: form.default_reps || null,
      default_sets: form.default_sets || null,
      video_url: form.video_url || null,
      video_key: form.video_key || null,
    }

    await onSave(data)
    setSaving(false)
  }

  return (
    <Modal title={drill ? 'Edit Drill' : 'New Drill'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Drill Name *</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="e.g., Stationary Crossover"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={form.category}
                onChange={e => updateField('category', e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty *</label>
              <select
                className="form-select"
                value={form.difficulty}
                onChange={e => updateField('difficulty', e.target.value)}
              >
                {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Describe what the player does in this drill..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Coaching Cues</label>
            <textarea
              className="form-textarea"
              value={form.coaching_cues}
              onChange={e => updateField('coaching_cues', e.target.value)}
              placeholder="Key reminders for the player while doing this drill..."
            />
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Default Sets</label>
              <input
                type="number"
                className="form-input"
                value={form.default_sets}
                onChange={e => updateField('default_sets', e.target.value ? parseInt(e.target.value) : '')}
                placeholder="3"
                min="1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Default Reps</label>
              <input
                type="number"
                className="form-input"
                value={form.default_reps}
                onChange={e => updateField('default_reps', e.target.value ? parseInt(e.target.value) : '')}
                placeholder="10"
                min="1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (seconds)</label>
              <input
                type="number"
                className="form-input"
                value={form.default_duration_seconds}
                onChange={e => updateField('default_duration_seconds', e.target.value ? parseInt(e.target.value) : '')}
                placeholder="60"
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Demo Video</label>
            <VideoUploader
              currentVideoUrl={form.video_url}
              currentVideoKey={form.video_key}
              folder="drills"
              onUploadComplete={(data) => {
                if (data) {
                  updateField('video_url', data.url)
                  updateField('video_key', data.key)
                } else {
                  updateField('video_url', '')
                  updateField('video_key', '')
                }
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          {onDelete && (
            <button 
              type="button" 
              className="btn btn-danger btn-sm" 
              onClick={() => { onDelete(); onClose(); }}
              style={{ marginRight: 'auto' }}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (drill ? 'Update Drill' : 'Create Drill')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
