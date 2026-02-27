/**
 * ContentPage.jsx — Coach content feed management
 *
 * Left card:   Set Drill of the Week (drill picker + optional note + optional publish date)
 * Right card:  Post an announcement to all students
 * Middle card: Upcoming scheduled drills (future posts)
 * Bottom card: Published / recent posts
 */

import { useState, useEffect } from 'react'
import { Dumbbell, Megaphone, Trash2, Pin, Send, FileText, Calendar, Clock } from 'lucide-react'
import {
  getDrills, getFeedPosts, getScheduledDrills,
  createFeedPost, deleteFeedPost,
} from '../services/api'
import { useToast } from '../App'


function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatScheduled(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatCategory(cat) {
  return (cat || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Minimum datetime-local value = right now (can't schedule in the past)
function minDatetimeLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}


export default function ContentPage() {
  const showToast = useToast()

  const [drills, setDrills] = useState([])
  const [posts, setPosts] = useState([])
  const [scheduled, setScheduled] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  // Drill of the week form
  const [selectedDrillId, setSelectedDrillId] = useState('')
  const [drillNote, setDrillNote] = useState('')
  const [publishDate, setPublishDate] = useState('')   // datetime-local string
  const [publishingDrill, setPublishingDrill] = useState(false)

  // Announcement form
  const [announcementText, setAnnouncementText] = useState('')
  const [postingAnnouncement, setPostingAnnouncement] = useState(false)

  async function loadAll() {
    try {
      const [drillsData, postsData, scheduledData] = await Promise.all([
        getDrills(),
        getFeedPosts(),
        getScheduledDrills(),
      ])
      setDrills(drillsData)
      setPosts(postsData)
      setScheduled(scheduledData)
    } catch (err) {
      showToast(err.message || 'Failed to load content', 'error')
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  async function handlePublishDrill(e) {
    e.preventDefault()
    if (!selectedDrillId) return
    setPublishingDrill(true)
    try {
      // Convert datetime-local string to ISO 8601 (or null for "now")
      const scheduledFor = publishDate
        ? new Date(publishDate).toISOString()
        : null

      const post = await createFeedPost({
        post_type: 'drill_of_week',
        drill_id: parseInt(selectedDrillId, 10),
        content: drillNote.trim() || null,
        scheduled_for: scheduledFor,
      })

      const isScheduled = scheduledFor && new Date(scheduledFor) > new Date()
      if (isScheduled) {
        setScheduled(prev => [...prev, post].sort(
          (a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for)
        ))
        showToast(`Drill scheduled for ${formatScheduled(post.scheduled_for)}!`, 'success')
      } else {
        setPosts(prev => [post, ...prev])
        showToast('Drill of the Week published!', 'success')
      }
      setSelectedDrillId('')
      setDrillNote('')
      setPublishDate('')
    } catch (err) {
      showToast(err.message || 'Failed to publish drill', 'error')
    } finally {
      setPublishingDrill(false)
    }
  }

  async function handlePostAnnouncement(e) {
    e.preventDefault()
    if (!announcementText.trim()) return
    setPostingAnnouncement(true)
    try {
      const post = await createFeedPost({
        post_type: 'announcement',
        content: announcementText.trim(),
      })
      setPosts(prev => [post, ...prev])
      setAnnouncementText('')
      showToast('Announcement posted to all students!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to post announcement', 'error')
    } finally {
      setPostingAnnouncement(false)
    }
  }

  async function handleDelete(postId, isScheduled = false) {
    try {
      await deleteFeedPost(postId)
      if (isScheduled) {
        setScheduled(prev => prev.filter(p => p.id !== postId))
      } else {
        setPosts(prev => prev.filter(p => p.id !== postId))
      }
      showToast('Post deleted', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to delete post', 'error')
    }
  }

  const isSchedulingFuture = publishDate && new Date(publishDate) > new Date()

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Content</h1>
          <p className="page-subtitle">Drill of the Week and announcements for all students</p>
        </div>
      </div>

      {/* ── Two-column top section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>

        {/* Left — Drill of the Week */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Dumbbell size={18} style={{ color: 'var(--accent)' }} />
              Drill of the Week
            </h3>
          </div>

          <form onSubmit={handlePublishDrill} style={{ padding: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Select Drill *</label>
              <select
                className="form-select"
                value={selectedDrillId}
                onChange={e => setSelectedDrillId(e.target.value)}
                required
              >
                <option value="">Choose a drill from your library…</option>
                {drills.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {formatCategory(d.category)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Coach Note (optional)</label>
              <textarea
                className="form-textarea"
                value={drillNote}
                onChange={e => setDrillNote(e.target.value)}
                placeholder="Add a tip or focus area for this drill…"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} />
                Publish Date & Time
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-secondary)' }}>
                  — leave blank to publish now
                </span>
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={publishDate}
                onChange={e => setPublishDate(e.target.value)}
                min={minDatetimeLocal()}
              />
            </div>

            {/* Preview of what will happen */}
            {isSchedulingFuture && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                marginBottom: 'var(--space-md)', fontSize: 13, color: '#d97706',
              }}>
                <Clock size={14} />
                Will go live {formatScheduled(publishDate)} · expires 7 days later
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={publishingDrill || !selectedDrillId}
              style={{ width: '100%' }}
            >
              <Pin size={15} />
              {publishingDrill
                ? 'Saving…'
                : isSchedulingFuture
                ? 'Schedule Drill'
                : 'Set as Drill of the Week'}
            </button>
          </form>
        </div>

        {/* Right — Announcement */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone size={18} style={{ color: 'var(--accent)' }} />
              Post Announcement
            </h3>
          </div>

          <form onSubmit={handlePostAnnouncement} style={{ padding: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea
                className="form-textarea"
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="Write a message to all your students — schedule changes, encouragement, reminders…"
                rows={6}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={postingAnnouncement || !announcementText.trim()}
              style={{ width: '100%' }}
            >
              <Send size={15} />
              {postingAnnouncement ? 'Posting…' : 'Post to All Students'}
            </button>
          </form>
        </div>
      </div>

      {/* ── Upcoming Scheduled Drills ── */}
      {scheduled.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', borderColor: 'rgba(245,158,11,0.3)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: '#d97706' }} />
              Upcoming Scheduled Drills
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {scheduled.length} scheduled · not yet visible to students
            </span>
          </div>
          <div>
            {scheduled.map((post, i) => (
              <div
                key={post.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                  padding: 'var(--space-md) var(--space-lg)',
                  borderBottom: i < scheduled.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Date badge */}
                <div style={{
                  flexShrink: 0, textAlign: 'center',
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', letterSpacing: 0.5 }}>
                    {new Date(post.scheduled_for).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706', lineHeight: 1.2 }}>
                    {new Date(post.scheduled_for).getDate()}
                  </div>
                </div>

                {/* Drill info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{post.drill?.name || '—'}</div>
                  {post.drill?.category && (
                    <span className="badge badge-category" style={{ fontSize: 11 }}>
                      {formatCategory(post.drill.category)}
                    </span>
                  )}
                  {post.content && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                      "{post.content}"
                    </div>
                  )}
                </div>

                {/* Expires label */}
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, textAlign: 'right' }}>
                  <div>Goes live</div>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(post.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    Expires {new Date(new Date(post.scheduled_for).getTime() + 7 * 24 * 3600 * 1000)
                      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Delete */}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(post.id, true)}
                  title="Cancel scheduled post"
                  style={{ flexShrink: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Posts ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Posts</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {posts.length} post{posts.length !== 1 ? 's' : ''} · visible to students now
          </span>
        </div>

        {loadingPosts ? (
          <div style={{ padding: 'var(--space-xl)', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Loading…
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No posts yet</h3>
            <p className="text-sm text-secondary">
              Set a drill of the week or post an announcement above.
            </p>
          </div>
        ) : (
          <div>
            {posts.map((post, i) => (
              <div
                key={post.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)',
                  padding: 'var(--space-lg)',
                  borderBottom: i < posts.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Type badge */}
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  {post.post_type === 'drill_of_week' ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: 'rgba(245,158,11,0.12)', color: '#d97706',
                    }}>
                      <Dumbbell size={10} /> DRILL OF WEEK
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: 'rgba(59,130,246,0.1)', color: '#2563eb',
                    }}>
                      <Megaphone size={10} /> ANNOUNCEMENT
                    </span>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {post.post_type === 'drill_of_week' && post.drill && (
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {post.drill.name}
                      <span className="badge badge-category" style={{ marginLeft: 8, fontSize: 11 }}>
                        {formatCategory(post.drill.category)}
                      </span>
                    </div>
                  )}
                  {post.content && (
                    <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {post.content}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                      {relativeTime(post.scheduled_for)}
                    </p>
                    {post.post_type === 'drill_of_week' && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                        · expires {new Date(new Date(post.scheduled_for).getTime() + 7 * 24 * 3600 * 1000)
                          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(post.id, false)}
                  title="Delete post"
                  style={{ flexShrink: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
