/**
 * WorkoutDetailScreen — Preview a workout before starting it.
 *
 * Shows the workout name, all drills in order, estimated duration,
 * and a big "Start Workout" button.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, CATEGORY_LABELS, DIFFICULTY_COLORS } from '../constants/theme';
import { getWorkout } from '../services/api';


export default function WorkoutDetailScreen({ route, navigation }) {
  const { assignment } = route.params;
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkout();
  }, []);

  async function loadWorkout() {
    try {
      const data = await getWorkout(assignment.workout_id || assignment.workout?.id);
      setWorkout(data);
    } catch (err) {
      console.error('Failed to load workout:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textLight} />
        <Text style={styles.errorText}>Couldn't load this workout</Text>
      </View>
    );
  }

  const isCompleted = !!assignment.completed_at;
  const drills = workout.drills || [];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Workout Header */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="barbell" size={32} color={COLORS.accent} />
          </View>
          <Text style={styles.workoutName}>{workout.name}</Text>
          {workout.description && (
            <Text style={styles.workoutDesc}>{workout.description}</Text>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="list-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{drills.length} drills</Text>
            </View>
            {workout.estimated_duration_minutes && (
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.statText}>~{workout.estimated_duration_minutes} min</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={isCompleted ? COLORS.success : COLORS.textSecondary}
              />
              <Text style={[styles.statText, isCompleted && { color: COLORS.success }]}>
                {isCompleted ? 'Completed' : 'Not started'}
              </Text>
            </View>
          </View>

          {/* Scheduled date */}
          <View style={styles.dateTag}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
            <Text style={styles.dateTagText}>
              Scheduled for{' '}
              {new Date(assignment.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Drill List */}
        <View style={styles.drillSection}>
          <Text style={styles.sectionTitle}>DRILLS</Text>
          {drills.map((item, index) => {
            const drill = item.drill || {};
            const diffColor = DIFFICULTY_COLORS[drill.difficulty] || DIFFICULTY_COLORS.beginner;

            return (
              <TouchableOpacity
                key={item.id || index}
                style={styles.drillItem}
                onPress={() => navigation.navigate('DrillDetail', { drill })}
                activeOpacity={0.8}
              >
                <View style={styles.drillNumber}>
                  <Text style={styles.drillNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.drillInfo}>
                  <Text style={styles.drillName}>{drill.name || 'Drill'}</Text>
                  <View style={styles.drillMeta}>
                    <Text style={styles.drillCat}>
                      {CATEGORY_LABELS[drill.category] || drill.category}
                    </Text>
                    {item.custom_sets && (
                      <Text style={styles.drillSpec}>{item.custom_sets} sets</Text>
                    )}
                    {item.custom_reps && (
                      <Text style={styles.drillSpec}>× {item.custom_reps}</Text>
                    )}
                    {item.custom_duration_seconds && (
                      <Text style={styles.drillSpec}>{item.custom_duration_seconds}s</Text>
                    )}
                  </View>
                  {item.notes && (
                    <Text style={styles.drillNotes}>{item.notes}</Text>
                  )}
                </View>
                <View style={[styles.drillDiffBadge, { backgroundColor: diffColor.bg }]}>
                  <Text style={[styles.drillDiffText, { color: diffColor.text }]}>
                    {drill.difficulty?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      {!isCompleted && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate('ActiveWorkout', { assignment, workout })}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={20} color="#FFF" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg,
  },
  errorText: {
    fontSize: FONTS.sizes.body, color: COLORS.textSecondary, marginTop: SPACING.md,
  },
  scroll: { flex: 1 },

  // Hero
  heroSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  workoutName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  workoutDesc: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  dateTagText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.accent,
    fontWeight: '600',
  },

  // Drills
  drillSection: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  drillNumber: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  drillNumberText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.accent,
  },
  drillInfo: { flex: 1 },
  drillName: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  drillMeta: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  drillCat: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  drillSpec: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  drillNotes: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  drillDiffBadge: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  drillDiffText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: SPACING.lg,
    paddingBottom: 36,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
});
