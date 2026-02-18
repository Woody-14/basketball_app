/**
 * DashboardPage.jsx — The coach's home screen
 * 
 * Shows a quick overview: student count, recent activity, etc.
 * 
 * REACT CONCEPTS:
 * - useEffect: Runs code when the component first appears (like fetching data)
 * - Dependency array []: Empty array means "run once on mount"
 * - Loading states: Show a loading indicator while data is being fetched
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Dumbbell, ClipboardList, ArrowRight } from 'lucide-react'
import { getStudents, getDrills, getWorkouts } from '../services/api'


export default function DashboardPage() {
  const [stats, setStats] = useState({ students: 0, drills: 0, workouts: 0 })
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // useEffect runs AFTER the component renders for the first time.
  // We use it to fetch data from the API.
  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, drillsData, workoutsData] = await Promise.all([
          getStudents(),
          getDrills(),
          getWorkouts(),
        ])
        setStats({
          students: studentsData.length,
          drills: drillsData.length,
          workouts: workoutsData.length,
        })
        setStudents(studentsData)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, []) // Empty array = run once when component mounts

  if (loading) {
    return <div className="page-header"><h1 className="page-title">Loading...</h1></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, Coach</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Active Students</div>
          <div className="stat-value accent">{stats.students}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Drills in Library</div>
          <div className="stat-value">{stats.drills}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Workouts Created</div>
          <div className="stat-value">{stats.workouts}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <Link to="/drills" className="btn btn-primary">
            <Dumbbell size={16} />
            Manage Drills
          </Link>
          <Link to="/workouts" className="btn btn-secondary">
            <ClipboardList size={16} />
            Build Workout
          </Link>
          <Link to="/students" className="btn btn-secondary">
            <Users size={16} />
            View Students
          </Link>
        </div>
      </div>

      {/* Student Roster Preview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Students</h3>
          <Link to="/students" className="btn btn-sm btn-secondary">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {students.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No students yet</h3>
            <p className="text-sm text-secondary">
              Go to the Students page to add your first player.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Position</th>
                  <th>Tier</th>
                  <th>Streak</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 5).map(student => (
                  <tr key={student.id}>
                    <td style={{ fontWeight: 600 }}>
                      {student.first_name} {student.last_name}
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
                    <td className="text-mono">{student.current_streak} days</td>
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
