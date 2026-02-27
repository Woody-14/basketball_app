/**
 * AnalyticsPage.jsx — Coach analytics dashboard
 *
 * Shows aggregated metrics across all students:
 * - 5 stat cards (students, compliance, reviews, revenue, response time)
 * - 12-week compliance trend bar chart (inline SVG, no library)
 * - At-risk students table
 * - Top drills by assignment count
 * - Tier breakdown
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CheckCircle, Video, DollarSign, Clock,
  AlertTriangle, MessageSquare,
} from 'lucide-react'
import {
  getAnalyticsOverview,
  getComplianceTrend,
  getDrillAnalytics,
} from '../services/api'


// ---------- HELPERS ----------

function formatCategory(cat) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function CompliancePill({ value }) {
  const pct = value ?? 0
  let bg, color
  if (pct < 50) {
    bg = 'rgba(239,68,68,0.12)'; color = '#ef4444'
  } else if (pct < 70) {
    bg = 'rgba(245,158,11,0.14)'; color = '#d97706'
  } else {
    bg = 'rgba(34,197,94,0.12)'; color = '#16a34a'
  }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 700,
      background: bg,
      color,
    }}>
      {pct}%
    </span>
  )
}


// ---------- SVG BAR CHART ----------

function ComplianceBarChart({ weeks }) {
  if (!weeks || weeks.length === 0) return null

  const W = 600
  const H = 120
  const BAR_W = 36
  const GAP = (W - BAR_W * 12) / 13  // even spacing
  const LABEL_H = 22
  const CHART_H = H - LABEL_H
  const maxAssigned = Math.max(...weeks.map(w => w.assigned), 1)

  return (
    <svg
      viewBox={`0 0 ${W} ${H + LABEL_H}`}
      style={{ width: '100%', maxWidth: W, display: 'block' }}
      aria-label="12-week completion trend"
    >
      {/* Y-axis line */}
      <line x1={0} y1={0} x2={0} y2={CHART_H} stroke="var(--border)" strokeWidth={1} />
      {/* Baseline */}
      <line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke="var(--border)" strokeWidth={1} />

      {weeks.map((week, i) => {
        const x = GAP + i * (BAR_W + GAP)
        const assignedH = maxAssigned > 0 ? (week.assigned / maxAssigned) * CHART_H : 0
        const completedH = maxAssigned > 0 ? (week.completed / maxAssigned) * CHART_H : 0

        return (
          <g key={week.week_start}>
            {/* Assigned bar (grey background) */}
            <rect
              x={x}
              y={CHART_H - assignedH}
              width={BAR_W}
              height={assignedH}
              rx={3}
              fill="var(--border)"
            />
            {/* Completed bar (orange foreground) */}
            {completedH > 0 && (
              <rect
                x={x}
                y={CHART_H - completedH}
                width={BAR_W}
                height={completedH}
                rx={3}
                fill="var(--accent)"
                opacity={0.85}
              />
            )}
            {/* Week label */}
            <text
              x={x + BAR_W / 2}
              y={CHART_H + LABEL_H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-secondary)"
            >
              {week.week_label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}


// ---------- MAIN PAGE ----------

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [trend, setTrend] = useState([])
  const [drills, setDrills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [ov, tr, dr] = await Promise.all([
          getAnalyticsOverview(),
          getComplianceTrend(),
          getDrillAnalytics(),
        ])
        setOverview(ov)
        setTrend(tr)
        setDrills(dr)
      } catch (err) {
        setError(err.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Loading metrics…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle" style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    )
  }

  const tier = overview?.tier_breakdown || {}

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Performance metrics across all students</p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} /> Active Students
          </div>
          <div className="stat-value accent">{overview?.total_students ?? 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} /> Avg Completion (30d)
          </div>
          <div className="stat-value">{overview?.avg_compliance_30d ?? 0}%</div>
        </div>

        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Video size={14} /> Pending Reviews
          </div>
          <div className="stat-value" style={overview?.pending_video_reviews > 0 ? { color: 'var(--warning)' } : {}}>
            {overview?.pending_video_reviews ?? 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={14} /> Est. Monthly Revenue
          </div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            ${(overview?.total_monthly_revenue ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> Avg Response Time
          </div>
          <div className="stat-value">
            {overview?.avg_response_hours > 0
              ? `${overview.avg_response_hours}h`
              : '—'}
          </div>
        </div>
      </div>

      {/* ── Compliance Trend ── */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <h3 className="card-title">Completion Trend — Last 12 Weeks</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'var(--border)' }} />
              Assigned
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'var(--accent)', opacity: 0.85 }} />
              Completed
            </span>
          </div>
        </div>
        <div style={{ padding: 'var(--space-md) 0' }}>
          <ComplianceBarChart weeks={trend} />
        </div>
      </div>

      {/* ── Two-column row: At-Risk + Tier Breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>

        {/* At-Risk Students */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
              At-Risk Students
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              &lt;60% completion or 7+ days inactive
            </span>
          </div>

          {overview?.at_risk?.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <CheckCircle size={36} style={{ color: '#16a34a', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>All students are on track!</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Completion (30d)</th>
                    <th>Days Inactive</th>
                    <th>Streak</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.at_risk || []).map(student => (
                    <tr key={student.id}>
                      <td style={{ fontWeight: 600 }}>
                        {student.first_name} {student.last_name}
                      </td>
                      <td><CompliancePill value={student.compliance_30d} /></td>
                      <td>
                        {student.days_since_workout != null
                          ? `${student.days_since_workout}d`
                          : '—'}
                      </td>
                      <td className="text-mono">{student.current_streak}d</td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/messages?student=${student.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <MessageSquare size={12} /> Message
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tier Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tier Breakdown</h3>
          </div>
          <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

            {/* Training tier */}
            <div style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Training</span>
                <span className="badge badge-category">{tier.training?.count ?? 0} students</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>$90/mo per student</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                ${((tier.training?.monthly_revenue) ?? 0).toLocaleString()}/mo
              </div>
            </div>

            {/* Elite tier */}
            <div style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius)',
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: '#d97706' }}>Elite</span>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                  fontSize: 12, fontWeight: 700,
                  background: 'rgba(245,158,11,0.14)', color: '#d97706',
                }}>
                  {tier.elite?.count ?? 0} students
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>$195/mo per student</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#d97706' }}>
                ${((tier.elite?.monthly_revenue) ?? 0).toLocaleString()}/mo
              </div>
            </div>

            {/* Total */}
            <div style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 'var(--space-md)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 600 }}>Total Revenue</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: '#16a34a' }}>
                ${(overview?.total_monthly_revenue ?? 0).toLocaleString()}/mo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drill Analytics ── */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <h3 className="card-title">Top Drills by Usage</h3>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Top 15 by times assigned</span>
        </div>

        {drills.length === 0 ? (
          <div className="empty-state">
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No drill data yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Drill</th>
                  <th>Category</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>Completion %</th>
                </tr>
              </thead>
              <tbody>
                {drills.map(drill => (
                  <tr key={drill.drill_id}>
                    <td style={{ fontWeight: 600 }}>{drill.name}</td>
                    <td>
                      <span className="badge badge-category" style={{ fontSize: 11 }}>
                        {formatCategory(drill.category)}
                      </span>
                    </td>
                    <td className="text-mono">{drill.times_assigned}</td>
                    <td className="text-mono">{drill.times_completed}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          flex: 1, height: 6, borderRadius: 3,
                          background: 'var(--border)', overflow: 'hidden', minWidth: 60,
                        }}>
                          <div style={{
                            width: `${drill.completion_pct}%`,
                            height: '100%',
                            background: drill.completion_pct >= 70
                              ? '#16a34a'
                              : drill.completion_pct >= 50
                              ? 'var(--accent)'
                              : '#ef4444',
                            borderRadius: 3,
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                          {drill.completion_pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
