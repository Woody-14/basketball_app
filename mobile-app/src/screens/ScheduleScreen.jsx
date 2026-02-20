/**
 * ScheduleScreen — Calendar view of the student's assigned workouts.
 *
 * Shows a month calendar with workout days highlighted.
 * Tapping a day shows the workout assigned for that date.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { getMyAssignments } from '../services/api';


const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}


export default function ScheduleScreen({ navigation }) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadMonth(currentYear, currentMonth);
    }, [currentYear, currentMonth])
  );

  async function loadMonth(year, month) {
    setLoading(true);
    try {
      const startDate = formatDate(year, month, 1);
      const endDate = formatDate(year, month, getDaysInMonth(year, month));
      const data = await getMyAssignments(startDate, endDate);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(m => m - 1);
    }
    setSelectedDate(null);
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(m => m + 1);
    }
    setSelectedDate(null);
  }

  // Build lookup maps for quick rendering
  const assignmentMap = {};
  assignments.forEach(a => {
    assignmentMap[a.scheduled_date] = a;
  });

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayStr = formatDate(now.getFullYear(), now.getMonth(), now.getDate());

  // Build the calendar grid (6 rows × 7 columns)
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null); // Empty cells before the 1st
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  // Selected day's assignment
  const selectedAssignment = selectedDate ? assignmentMap[selectedDate] : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarCard}>
          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {DAY_LABELS.map(day => (
              <Text key={day} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar cells */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, i) => {
              if (!day) {
                return <View key={`empty-${i}`} style={styles.dayCell} />;
              }

              const dateStr = formatDate(currentYear, currentMonth, day);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const assignment = assignmentMap[dateStr];
              const isCompleted = assignment?.completed_at;
              const hasWorkout = !!assignment;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => setSelectedDate(dateStr)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayCellText,
                    isToday && styles.dayCellTextToday,
                    isSelected && styles.dayCellTextSelected,
                  ]}>
                    {day}
                  </Text>
                  {/* Indicator dot */}
                  {hasWorkout && (
                    <View style={[
                      styles.indicator,
                      isCompleted ? styles.indicatorCompleted : styles.indicatorPending,
                      isSelected && styles.indicatorSelected,
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Details */}
        {selectedDate && (
          <View style={styles.detailSection}>
            <Text style={styles.detailDate}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
              })}
            </Text>

            {selectedAssignment ? (
              <TouchableOpacity
                style={styles.assignmentCard}
                onPress={() => navigation.navigate('WorkoutDetail', { assignment: selectedAssignment })}
                activeOpacity={0.85}
              >
                <View style={styles.assignmentTop}>
                  <View style={[
                    styles.statusDot,
                    selectedAssignment.completed_at ? styles.statusCompleted : styles.statusPending,
                  ]} />
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentName}>
                      {selectedAssignment.workout?.name || 'Workout'}
                    </Text>
                    <Text style={styles.assignmentMeta}>
                      {selectedAssignment.workout?.drill_count || '?'} drills
                      {selectedAssignment.workout?.estimated_duration_minutes
                        ? ` · ~${selectedAssignment.workout.estimated_duration_minutes} min`
                        : ''}
                    </Text>
                  </View>
                  <Text style={[
                    styles.statusLabel,
                    selectedAssignment.completed_at ? styles.statusLabelCompleted : styles.statusLabelPending,
                  ]}>
                    {selectedAssignment.completed_at ? 'Completed' : 'Pending'}
                  </Text>
                </View>

                {!selectedAssignment.completed_at && selectedDate >= todayStr && (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => navigation.navigate('ActiveWorkout', { assignment: selectedAssignment })}
                  >
                    <Ionicons name="play" size={16} color="#FFF" />
                    <Text style={styles.startBtnText}>Start Workout</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.noAssignment}>
                <Ionicons name="calendar-outline" size={32} color={COLORS.textLight} />
                <Text style={styles.noAssignmentText}>No workout scheduled</Text>
              </View>
            )}
          </View>
        )}

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

  // Month nav
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  monthArrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.sm,
  },
  monthLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Calendar
  calendarCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  dayCellSelected: {
    backgroundColor: COLORS.accent,
  },
  dayCellText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  dayCellTextToday: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  dayCellTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  indicator: {
    width: 6, height: 6, borderRadius: 3,
    marginTop: 2,
  },
  indicatorPending: {
    backgroundColor: COLORS.accent,
  },
  indicatorCompleted: {
    backgroundColor: COLORS.success,
  },
  indicatorSelected: {
    backgroundColor: '#FFF',
  },

  // Detail section
  detailSection: {
    marginTop: SPACING.lg,
  },
  detailDate: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  assignmentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  assignmentTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12, height: 12, borderRadius: 6,
    marginRight: SPACING.md,
  },
  statusCompleted: { backgroundColor: COLORS.success },
  statusPending: { backgroundColor: COLORS.accent },
  assignmentInfo: { flex: 1 },
  assignmentName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  assignmentMeta: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusLabelCompleted: { color: COLORS.success },
  statusLabelPending: { color: COLORS.accent },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  startBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: FONTS.sizes.body,
  },
  noAssignment: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  noAssignmentText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
});
