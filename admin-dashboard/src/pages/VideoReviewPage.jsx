/**
 * VideoReviewPage.jsx — Coach reviews student form check videos
 *
 * Two-panel layout (reuses messages-layout CSS):
 *   Left  — pending submissions list
 *   Right — selected submission: video player + feedback textarea
 */

import { useState, useEffect } from 'react'
import { Video, CheckCircle, Clock, User } from 'lucide-react'
import { getPendingReviews, submitFeedback } from '../services/api'
import { useToast } from '../App'


function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function initials(s) {
  return `${s?.first_name?.[0] ?? ''}${s?.last_name?.[0] ?? ''}`.toUpperCase()
}


export default function VideoReviewPage() {
  const [submissions, setSubmissions] = useState([])
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const showToast = useToast()

  async function load() {
    try {
      const data = await getPendingReviews()
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast(err.message || 'Failed to load submissions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleSelect(submission) {
    setSelected(submission)
    setFeedback('')
  }

  async function handleSubmitFeedback(e) {
    e.preventDefault()
    const text = feedback.trim()
    if (!text || !selected) return

    setSubmitting(true)
    try {
      await submitFeedback(selected.id, text)
      showToast('Feedback submitted!', 'success')
      // Remove from pending list
      setSubmissions(prev => prev.filter(s => s.id !== selected.id))
      setSelected(null)
      setFeedback('')
    } catch (err) {
      showToast(err.message || 'Failed to submit feedback', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="messages-layout">

      {/* ── Left panel: pending submissions ── */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <Clock size={15} />
          <span>Pending Reviews ({submissions.length})</span>
        </div>

        {loading ? (
          <p className="text-secondary" style={{ padding: '16px', fontSize: '13px' }}>
            Loading…
          </p>
        ) : submissions.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <CheckCircle size={32} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              All caught up! No pending reviews.
            </p>
          </div>
        ) : (
          <div className="messages-student-list">
            {submissions.map(s => (
              <button
                key={s.id}
                className={`messages-student-item ${selected?.id === s.id ? 'active' : ''}`}
                onClick={() => handleSelect(s)}
              >
                <div className="msg-avatar msg-avatar-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {initials(s.student)}
                </div>
                <div className="messages-student-info">
                  <div className="messages-student-name">
                    {s.student?.first_name} {s.student?.last_name}
                  </div>
                  <div className="messages-student-meta">
                    {s.drill?.name || 'Drill'} · {formatDate(s.completed_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel: video + feedback ── */}
      <div className="messages-conversation">
        {!selected ? (
          <div className="messages-empty-state">
            <Video size={44} strokeWidth={1.5} />
            <h3>Select a submission</h3>
            <p className="text-secondary">
              Choose a pending form check from the list to review and give feedback.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>

            {/* Header */}
            <div className="messages-conv-header">
              <div className="msg-avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                {initials(selected.student)}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {selected.student?.first_name} {selected.student?.last_name}
                </div>
                <div className="text-sm text-secondary">
                  {selected.drill?.name} · {selected.drill?.category} · Submitted {formatDate(selected.completed_at)}
                </div>
              </div>
            </div>

            {/* Video player */}
            <div style={{ padding: '16px 20px' }}>
              {selected.video_url ? (
                <video
                  key={selected.id}
                  controls
                  src={selected.video_url}
                  style={{
                    width: '100%',
                    maxHeight: '420px',
                    borderRadius: '10px',
                    backgroundColor: '#000',
                    display: 'block',
                  }}
                >
                  Your browser does not support the video element.
                </video>
              ) : (
                <div style={{
                  height: '200px', background: 'var(--bg)', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)',
                }}>
                  <Video size={32} strokeWidth={1.5} />
                  <span style={{ fontSize: '13px' }}>No video available</span>
                </div>
              )}
            </div>

            {/* Feedback form */}
            <form
              onSubmit={handleSubmitFeedback}
              style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}
            >
              <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                Coach Feedback
              </label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Write your feedback for this drill submission…"
                rows={5}
                disabled={submitting}
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                  background: 'var(--surface)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={!feedback.trim() || submitting}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle size={16} />
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
