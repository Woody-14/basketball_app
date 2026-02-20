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
import { getMyAssignments } from '../services/api';
import { useAuth } from '../hooks/useAuth';


// Get last N days as date strings
function getLastNDays(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}


export default function ProgressScreen() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory() {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const start = new Date();
      start.setDate(start.getDate() - 60);
      const startDate = start.toISOString().split('T')[0];
      const data = await getMyAssignments(startDate, endDate);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load progress:', err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats
  const completedAssignments = assignments.filter(a => a.completed_at);
  const totalCompleted = completedAssignments.length;
  const totalAssigned = assignments.length;
  const complianceRate = totalAssigned > 0
    ? Math.round((totalCompleted / totalAssigned) * 100)
    : 0;

  // Build heatmap data for last 28 days
  const last28 = getLastNDays(28);
  const completedDates = new Set(
    completedAssignments.map(a => a.scheduled_date)
  );
  const assignedDates = new Set(
    assignments.map(a => a.scheduled_date)
  );

  // Calculate current streak
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  for (let i = 0; i <= 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (completedDates.has(dateStr)) {
      streak++;
    } else if (assignedDates.has(dateStr)) {
      break; // Had a workout but didn't complete it
    }
    // Days with no assignment don't break the streak
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Streak Display */}
        <View style={styles.streakCard}>
          <View style={styles.streakCircle}>
            <Ionicons name="flame" size={36} color={COLORS.accent} />
          </View>
          <Text style={styles.streakValue}>{streak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
          <Text style={styles.streakMotivation}>
            {streak === 0
              ? 'Complete today\'s workout to start your streak!'
              : streak < 7
                ? 'Keep it going! Build that habit.'
                : streak < 30
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
            <Text style={styles.statLabel}>Compliance{'\n'}Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalAssigned}</Text>
            <Text style={styles.statLabel}>Workouts{'\n'}Assigned</Text>
          </View>
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
              .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
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
                      {new Date(assignment.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', {
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
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: { flex: 1, paddingHorizontal: SPACING.lg },

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
});
