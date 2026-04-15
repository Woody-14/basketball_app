/**
 * ProgressScreen — The student's training stats and history.
 *
 * Shows streak, total workouts, contribution-style calendar,
 * and training history. Designed to motivate consistent practice.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { getMyAssignments, getMySkillAssessment } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import RadarChart from '../components/RadarChart';


// Local date string helper — avoids UTC offset issues with toISOString()
function localDateStr(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/**
 * Streak = consecutive completed workouts counting backwards from the most recent.
 * Rules:
 *   - If today's workout exists but isn't completed yet, skip it (give them until EOD).
 *   - Any past assignment (assigned_date < today) that isn't completed breaks the streak.
 *   - "scheduled" status on a past date counts as missed.
 */
function calcStreak(assignments) {
  const today = localDateStr(new Date());

  // Only look at past assignments (assigned date is today or earlier)
  const past = [...assignments]
    .filter(a => a.assigned_date <= today)
    .sort((a, b) => b.assigned_date.localeCompare(a.assigned_date));

  if (past.length === 0) return 0;

  // If today's workout isn't done yet, skip it — don't break the streak mid-day
  const start = (past[0].assigned_date === today && past[0].status !== 'completed') ? 1 : 0;

  let streak = 0;
  for (let i = start; i < past.length; i++) {
    const a = past[i];
    const isPast = a.assigned_date < today;
    const isCompleted = a.status === 'completed';
    // A past assignment that isn't completed ends the streak
    if (isCompleted) {
      streak++;
    } else if (isPast) {
      break;
    }
    // today not completed is already skipped above
  }
  return streak;
}

// Get last N days as YYYY-MM-DD strings in LOCAL time (not UTC).
function getLastNDays(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${d.getFullYear()}-${mm}-${dd}`);
  }
  return dates;
}


export default function ProgressScreen() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [skillAssessment, setSkillAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory() {
    setError(null);
    try {
      const endDate = localDateStr(new Date());
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const startDate = localDateStr(start);

      const [assignmentsData, skillData] = await Promise.all([
        getMyAssignments(startDate, endDate),
        getMySkillAssessment().catch(() => null),
      ]);

      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setSkillAssessment(skillData || null);
    } catch (err) {
      console.error('Failed to load progress:', err);
      setError('Could not load your progress. Pull down to retry.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats
  const completedAssignments = assignments.filter(a => a.status === 'completed');
  const totalCompleted = completedAssignments.length;
  const totalAssigned = assignments.length;
  const complianceRate = totalAssigned > 0
    ? Math.round((totalCompleted / totalAssigned) * 100)
    : 0;

  // Build heatmap data for last 28 days
  const last28 = getLastNDays(28);
  const completedDates = new Set(completedAssignments.map(a => a.assigned_date));
  const assignedDates = new Set(assignments.map(a => a.assigned_date));

  const streak = calcStreak(assignments);
  const today = localDateStr(new Date());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>YOUR TRAINING</Text>
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={styles.headerAccentBar} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Streak Display */}
        <View style={styles.streakCard}>
          <View style={styles.streakCircle}>
            <Ionicons name="flame" size={36} color={COLORS.accent} />
          </View>
          <Text style={styles.streakValue}>{streak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
          <Text style={styles.streakMotivation}>
            {(streak) === 0
              ? 'Complete today\'s workout to start your streak!'
              : (streak) < 7
                ? 'Keep it going! Build that habit.'
                : (streak) < 30
                  ? 'You\'re on fire! 🔥'
                  : 'Incredible dedication! 🏆'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCompleted}</Text>
            <Text style={styles.statLabel}>Workouts{'\n'}Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{complianceRate}%</Text>
            <Text style={styles.statLabel}>Completion{'\n'}Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalAssigned}</Text>
            <Text style={styles.statLabel}>Workouts{'\n'}Assigned</Text>
          </View>
        </View>

        {/* Skill Radar Chart */}
        <View style={styles.skillsCard}>
          <Text style={styles.sectionTitle}>SKILL ASSESSMENT</Text>
          {skillAssessment ? (
            <>
              <RadarChart data={skillAssessment} size={280} />
              <Text style={styles.assessmentDate}>
                Last assessed: {new Date(skillAssessment.assessed_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric'
                })}
              </Text>
              {skillAssessment.notes ? (
                <View style={styles.assessmentNotes}>
                  <Ionicons name="chatbubble-outline" size={13} color={COLORS.accent} />
                  <Text style={styles.assessmentNotesText}>{skillAssessment.notes}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.noSkillState}>
              <Ionicons name="analytics-outline" size={36} color={COLORS.textLight} />
              <Text style={styles.noSkillText}>No skill assessment yet</Text>
              <Text style={styles.noSkillSubtext}>
                Ask your coach to rate your skills during your next session.
              </Text>
            </View>
          )}
        </View>

        {/* Activity Heatmap (last 28 days) */}
        <View style={styles.heatmapSection}>
          <Text style={styles.sectionTitle}>LAST 28 DAYS</Text>
          <View style={styles.heatmapGrid}>
            {last28.map(dateStr => {
              const isCompleted = completedDates.has(dateStr);
              const isAssigned = assignedDates.has(dateStr);
              const isToday = dateStr === today;

              return (
                <View
                  key={dateStr}
                  style={[
                    styles.heatmapCell,
                    isCompleted && styles.heatmapCompleted,
                    isAssigned && !isCompleted && styles.heatmapMissed,
                    isToday && styles.heatmapToday,
                  ]}
                >
                  {isCompleted && (
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.heatmapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.dangerLight }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border }]} />
              <Text style={styles.legendText}>Rest day</Text>
            </View>
          </View>
        </View>

        {/* Recent History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>RECENT WORKOUTS</Text>
          {completedAssignments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={36} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No completed workouts yet</Text>
              <Text style={styles.emptySubtext}>Start your first workout to see your history here.</Text>
            </View>
          ) : (
            completedAssignments
              .sort((a, b) => String(b.assigned_date).localeCompare(String(a.assigned_date)))
              .slice(0, 10)
              .map(assignment => (
                <View key={assignment.id} style={styles.historyItem}>
                  <View style={styles.historyDot}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>
                      {assignment.workout?.name || 'Workout'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(assignment.assigned_date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric'
                      })}
                    </Text>
                  </View>
                  {assignment.workout?.drill_count && (
                    <Text style={styles.historyDrills}>
                      {assignment.workout.drill_count} drills
                    </Text>
                  )}
                </View>
              ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerAccentBar: {
    width: 32,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginTop: 8,
  },
  scroll: { flex: 1, paddingHorizontal: SPACING.lg },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  errorBannerText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.danger,
    lineHeight: 18,
  },

  // Streak
  streakCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  streakCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center', alignItems: 'center',
  },
  streakValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  streakLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakMotivation: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    marginTop: SPACING.md,
    textAlign: 'center',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // Heatmap
  heatmapSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heatmapCell: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapCompleted: {
    backgroundColor: COLORS.success,
  },
  heatmapMissed: {
    backgroundColor: COLORS.dangerLight,
  },
  heatmapToday: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  heatmapLegend: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12, height: 12, borderRadius: 3,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },

  // History
  historySection: {
    marginTop: SPACING.lg,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  historyDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  historyInfo: { flex: 1 },
  historyName: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyDrills: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  // Skills radar
  skillsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  assessmentDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  assessmentNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignSelf: 'stretch',
  },
  assessmentNotesText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  noSkillState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  noSkillText: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  noSkillSubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
