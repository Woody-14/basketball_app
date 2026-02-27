/**
 * HomeScreen — The student's main dashboard.
 *
 * Shows: greeting, today's workout, current streak, quick stats,
 * and recent badges. This is what they see when they open the app.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, CATEGORY_LABELS } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { getMyAssignments } from '../services/api';


// Helper: get today's date as YYYY-MM-DD
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Helper: get dates for current week
function getWeekDates() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon...
  const start = new Date(today);
  start.setDate(today.getDate() - day); // Start on Sunday
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Training phase metadata — must match backend TrainingPhase enum
const PHASE_META = {
  foundation:        { label: 'Foundation',        description: 'Mechanics & high-volume skill building', weeklyTarget: 5, color: '#7C3AED' },
  skill_development: { label: 'Skill Development', description: 'Game-specific moves & combination skills', weeklyTarget: 4, color: '#2563EB' },
  pre_season:        { label: 'Pre-Season',         description: 'Game-speed reps & situational preparation', weeklyTarget: 3, color: '#D97706' },
  in_season:         { label: 'In-Season',          description: 'Maintenance & game readiness', weeklyTarget: 2, color: '#16A34A' },
  post_season:       { label: 'Post-Season',        description: 'Active recovery & reflection', weeklyTarget: 1, color: '#6B7280' },
};

function PhaseBanner({ phase }) {
  const meta = PHASE_META[phase];
  if (!meta) return null;
  return (
    <View style={[phaseStyles.banner, { borderLeftColor: meta.color }]}>
      <View style={{ flex: 1 }}>
        <Text style={phaseStyles.phaseLabel}>TRAINING PHASE</Text>
        <Text style={[phaseStyles.phaseName, { color: meta.color }]}>{meta.label}</Text>
        <Text style={phaseStyles.phaseDesc}>{meta.description}</Text>
      </View>
      <View style={[phaseStyles.targetPill, { backgroundColor: meta.color + '18' }]}>
        <Text style={[phaseStyles.targetNum, { color: meta.color }]}>{meta.weeklyTarget}×</Text>
        <Text style={phaseStyles.targetLabel}>per wk</Text>
      </View>
    </View>
  );
}

// XP level thresholds — must match backend xp.py
const XP_LEVELS = [
  { level: 7, name: 'Legend',     threshold: 30000 },
  { level: 6, name: 'Pro',        threshold: 15000 },
  { level: 5, name: 'All-Star',   threshold: 7500  },
  { level: 4, name: 'Varsity',    threshold: 3500  },
  { level: 3, name: 'Starter',    threshold: 1500  },
  { level: 2, name: 'Rising Star',threshold: 500   },
  { level: 1, name: 'Rookie',     threshold: 0     },
];

function getLevelInfo(xp) {
  const current = XP_LEVELS.find(l => xp >= l.threshold) || XP_LEVELS[XP_LEVELS.length - 1];
  const nextLevel = XP_LEVELS.find(l => l.threshold > xp);
  return {
    name: current.name,
    level: current.level,
    nextThreshold: nextLevel?.threshold || null,
    progress: nextLevel ? (xp - current.threshold) / (nextLevel.threshold - current.threshold) : 1,
  };
}


export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      // Get this week's assignments
      const weekDates = getWeekDates();
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];
      const data = await getMyAssignments(startDate, endDate);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // Find today's assignment
  const today = todayStr();
  const todayAssignment = assignments.find(a => a.assigned_date === today);
  const completedThisWeek = assignments.filter(a => a.status === 'completed').length;
  const totalThisWeek = assignments.length;

  // Get greeting based on time of day
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // Week calendar dots
  const weekDates = getWeekDates();
  const assignmentDates = new Set(assignments.map(a => a.assigned_date));
  const completedDates = new Set(
    assignments.filter(a => a.status === 'completed').map(a => a.assigned_date)
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>
            {user?.first_name || 'Player'} 🏀
          </Text>
        </View>
        <TouchableOpacity
          style={styles.messageBtn}
          onPress={() => navigation.navigate('Messages')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Training Phase Banner */}
        {user?.training_phase && <PhaseBanner phase={user.training_phase} />}

        {/* Week Overview */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>This Week</Text>
          <View style={styles.weekRow}>
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const isToday = dateStr === today;
              const hasWorkout = assignmentDates.has(dateStr);
              const isCompleted = completedDates.has(dateStr);

              // Today+assigned: use today style (accent). Only show assigned style on non-today days.
              const showAssigned = hasWorkout && !isCompleted && !isToday;

              return (
                <View key={i} style={styles.dayCol}>
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                    {DAY_NAMES[i]}
                  </Text>
                  <View style={[
                    styles.dayDot,
                    isToday && styles.dayDotToday,
                    showAssigned && styles.dayDotAssigned,
                    isCompleted && styles.dayDotCompleted,
                  ]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    ) : (
                      <Text style={[
                        styles.dayNumber,
                        isToday && styles.dayNumberToday,
                        showAssigned && styles.dayNumberAssigned,
                      ]}>
                        {date.getDate()}
                      </Text>
                    )}
                  </View>
                  {/* Small indicator dot below circle */}
                  {(hasWorkout || isToday) && (
                    <View style={[
                      styles.dayIndicatorDot,
                      isCompleted && { backgroundColor: COLORS.success },
                      showAssigned && { backgroundColor: COLORS.warning },
                      isToday && !hasWorkout && { backgroundColor: COLORS.accent },
                      isToday && hasWorkout && !isCompleted && { backgroundColor: COLORS.accent },
                    ]} />
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.weekStats}>
            <Text style={styles.weekStatsText}>
              {completedThisWeek} of {totalThisWeek} workouts completed
            </Text>
            {totalThisWeek > 0 && (
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${(completedThisWeek / totalThisWeek) * 100}%` }
                ]} />
              </View>
            )}
          </View>
        </View>

        {/* Today's Workout Card */}
        <Text style={styles.sectionTitle}>Today's Workout</Text>
        {todayAssignment ? (
          <TouchableOpacity
            style={styles.workoutCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('WorkoutDetail', { assignment: todayAssignment })}
          >
            <View style={styles.workoutCardTop}>
              <View style={styles.workoutIconBox}>
                <Ionicons name="barbell-outline" size={28} color={COLORS.accent} />
              </View>
              <View style={styles.workoutCardInfo}>
                <Text style={styles.workoutCardTitle}>
                  {todayAssignment.workout?.name || 'Assigned Workout'}
                </Text>
                <Text style={styles.workoutCardMeta}>
                  {todayAssignment.workout?.drills?.length ?? '?'} drills
                  {todayAssignment.workout?.estimated_duration_minutes
                    ? ` · ~${todayAssignment.workout.estimated_duration_minutes} min`
                    : ''}
                </Text>
              </View>
              {todayAssignment.status === 'completed' ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={22} color={COLORS.textLight} />
              )}
            </View>

            {todayAssignment.status !== 'completed' && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => navigation.navigate('ActiveWorkout', { assignment: todayAssignment })}
              >
                <Ionicons name="play" size={18} color="#FFF" />
                <Text style={styles.startButtonText}>Start Workout</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.restCard}>
            <Text style={styles.restEmoji}>😌</Text>
            <Text style={styles.restTitle}>No workout today</Text>
            <Text style={styles.restSubtitle}>
              {totalThisWeek > 0
                ? 'Rest up — check your schedule for upcoming workouts.'
                : 'Your coach hasn\'t assigned workouts yet. Check back soon!'}
            </Text>
          </View>
        )}

        {/* Upcoming Workouts */}
        {assignments.filter(a => a.assigned_date > today && !a.completed_at).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Coming Up</Text>
            {assignments
              .filter(a => a.assigned_date > today && !a.completed_at)
              .slice(0, 3)
              .map(assignment => (
                <TouchableOpacity
                  key={assignment.id}
                  style={styles.upcomingCard}
                  onPress={() => navigation.navigate('WorkoutDetail', { assignment })}
                >
                  <View style={styles.upcomingDate}>
                    <Text style={styles.upcomingDateDay}>
                      {new Date(assignment.assigned_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={styles.upcomingDateNum}>
                      {new Date(assignment.assigned_date + 'T12:00:00').getDate()}
                    </Text>
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingName}>
                      {assignment.workout?.name || 'Workout'}
                    </Text>
                    <Text style={styles.upcomingMeta}>
                      {assignment.workout?.drills?.length ?? '?'} drills
                      {assignment.workout?.estimated_duration_minutes
                        ? ` · ~${assignment.workout.estimated_duration_minutes} min`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              ))}
          </>
        )}

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={24} color={COLORS.accent} />
            <Text style={styles.statValue}>{user?.current_streak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy-outline" size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>{user?.badges?.length || 0}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done-outline" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{completedThisWeek}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>

        {/* XP Progress */}
        {(() => {
          const xp = user?.xp || 0;
          const { name, level, nextThreshold, progress } = getLevelInfo(xp);
          return (
            <View style={styles.xpCard}>
              <View style={styles.xpHeader}>
                <View style={styles.xpLevelBadge}>
                  <Text style={styles.xpLevelText}>Lv {level}</Text>
                </View>
                <Text style={styles.xpLevelName}>{name}</Text>
                <Text style={styles.xpTotal}>{xp.toLocaleString()} XP</Text>
              </View>
              <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
              </View>
              {nextThreshold ? (
                <Text style={styles.xpNextLabel}>
                  {(nextThreshold - xp).toLocaleString()} XP to next level
                </Text>
              ) : (
                <Text style={styles.xpNextLabel}>Maximum level reached!</Text>
              )}
            </View>
          );
        })()}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  name: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  messageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },

  // Week Card
  weekCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  weekTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  dayLabelToday: {
    color: COLORS.accent,
  },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotToday: {
    backgroundColor: COLORS.accentLight,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  dayDotAssigned: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1.5,
    borderColor: COLORS.warning,
  },
  dayDotCompleted: {
    backgroundColor: COLORS.success,
  },
  dayNumber: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  dayNumberToday: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  dayNumberAssigned: {
    color: '#D97706',
    fontWeight: '700',
  },
  dayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 2,
  },
  weekStats: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  weekStatsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.bg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },

  // Sections
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },

  // Today's Workout
  workoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.accentLight,
  },
  workoutCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  workoutCardInfo: {
    flex: 1,
  },
  workoutCardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  workoutCardMeta: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  completedBadge: {
    marginLeft: SPACING.sm,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
  },

  // Rest Day
  restCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  restEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  restTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  restSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Upcoming
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  upcomingDate: {
    width: 48,
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  upcomingDateDay: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  upcomingDateNum: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingName: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  upcomingMeta: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
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
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2,
  },

  // XP Progress Card
  xpCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  xpLevelBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  xpLevelText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: '#FFF',
  },
  xpLevelName: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  xpTotal: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.accent,
  },
  xpBarBg: {
    height: 6,
    backgroundColor: COLORS.bg,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  xpNextLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});

const phaseStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  phaseLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: 2,
  },
  phaseName: {
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  phaseDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  targetPill: {
    marginLeft: SPACING.md,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    minWidth: 48,
  },
  targetNum: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
  },
  targetLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
