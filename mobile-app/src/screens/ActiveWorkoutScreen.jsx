/**
 * ActiveWorkoutScreen — The student IS doing a workout right now.
 *
 * This is THE most important screen in the entire app. It steps the
 * student through each drill with a timer, coaching cues, the ability
 * to watch the demo video, and mark each drill complete.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, CATEGORY_LABELS } from '../constants/theme';
import { getWorkout, completeWorkout } from '../services/api';


const { width: SCREEN_WIDTH } = Dimensions.get('window');


export default function ActiveWorkoutScreen({ route, navigation }) {
  const { assignment } = route.params;

  const [workout, setWorkout] = useState(route.params.workout || null);
  const [loading, setLoading] = useState(!route.params.workout);
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [completedDrills, setCompletedDrills] = useState(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [drillTimerActive, setDrillTimerActive] = useState(false);
  const [drillTimerSeconds, setDrillTimerSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef(null);
  const drillTimerRef = useRef(null);

  // Load workout if not passed
  useEffect(() => {
    if (!workout) {
      getWorkout(assignment.workout_id || assignment.workout?.id)
        .then(setWorkout)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, []);

  // Main elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isPaused]);

  // Drill countdown timer
  useEffect(() => {
    if (drillTimerActive && drillTimerSeconds > 0) {
      drillTimerRef.current = setInterval(() => {
        setDrillTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(drillTimerRef.current);
            setDrillTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(drillTimerRef.current);
    }
  }, [drillTimerActive]);

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function handleCompleteDrill() {
    setCompletedDrills(prev => new Set([...prev, currentDrillIndex]));
    setDrillTimerActive(false);
    setDrillTimerSeconds(0);

    // Auto-advance to next drill
    if (currentDrillIndex < drills.length - 1) {
      setCurrentDrillIndex(currentDrillIndex + 1);
    }
  }

  function handleStartDrillTimer(seconds) {
    setDrillTimerSeconds(seconds);
    setDrillTimerActive(true);
  }

  function handleFinishWorkout() {
    Alert.alert(
      'Finish Workout?',
      `You completed ${completedDrills.size} of ${drills.length} drills in ${formatTime(elapsedSeconds)}.`,
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              await completeWorkout(assignment.id, {
                completed_drills: [...completedDrills],
                total_seconds: elapsedSeconds,
              });
            } catch (err) {
              // If the endpoint doesn't exist yet, that's okay — just navigate
              console.log('Completion API not yet available:', err.message);
            }
            navigation.replace('WorkoutComplete', {
              drillsCompleted: completedDrills.size,
              totalDrills: drills.length,
              timeSeconds: elapsedSeconds,
            });
          },
        },
      ]
    );
  }

  function handleQuit() {
    Alert.alert(
      'Quit Workout?',
      'Your progress will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  }

  if (loading || !workout) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  const drills = workout.drills || [];
  const currentItem = drills[currentDrillIndex];
  const currentDrill = currentItem?.drill || {};
  const isCurrentCompleted = completedDrills.has(currentDrillIndex);
  const allCompleted = completedDrills.size === drills.length;
  const progress = drills.length > 0 ? completedDrills.size / drills.length : 0;

  // Determine if drill uses timer or reps
  const hasDuration = currentItem?.custom_duration_seconds || currentDrill.default_duration_seconds;
  const durationSeconds = currentItem?.custom_duration_seconds || currentDrill.default_duration_seconds;
  const sets = currentItem?.custom_sets || currentDrill.default_sets;
  const reps = currentItem?.custom_reps || currentDrill.default_reps;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleQuit} style={styles.topBarBtn}>
          <Ionicons name="close" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.timerDisplay}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>
        <TouchableOpacity onPress={() => setIsPaused(!isPaused)} style={styles.topBarBtn}>
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>

      {/* Drill Progress Dots */}
      <View style={styles.dotsRow}>
        {drills.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              setCurrentDrillIndex(i);
              setDrillTimerActive(false);
              setDrillTimerSeconds(0);
            }}
          >
            <View style={[
              styles.dot,
              i === currentDrillIndex && styles.dotCurrent,
              completedDrills.has(i) && styles.dotCompleted,
            ]}>
              {completedDrills.has(i) && (
                <Ionicons name="checkmark" size={10} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pause Overlay */}
      {isPaused && (
        <View style={styles.pauseOverlay}>
          <TouchableOpacity onPress={() => setIsPaused(false)} style={styles.pauseContent}>
            <Ionicons name="pause-circle" size={64} color={COLORS.accent} />
            <Text style={styles.pauseText}>Paused</Text>
            <Text style={styles.pauseSubtext}>Tap to resume</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Current Drill Header */}
        <View style={styles.drillHeader}>
          <Text style={styles.drillIndex}>
            Drill {currentDrillIndex + 1} of {drills.length}
          </Text>
          <Text style={styles.drillName}>{currentDrill.name || 'Drill'}</Text>
          <Text style={styles.drillCategory}>
            {CATEGORY_LABELS[currentDrill.category] || currentDrill.category}
          </Text>
        </View>

        {/* Sets / Reps / Duration Display */}
        <View style={styles.specRow}>
          {sets && (
            <View style={styles.specCard}>
              <Text style={styles.specValue}>{sets}</Text>
              <Text style={styles.specLabel}>Sets</Text>
            </View>
          )}
          {reps && (
            <View style={styles.specCard}>
              <Text style={styles.specValue}>{reps}</Text>
              <Text style={styles.specLabel}>Reps</Text>
            </View>
          )}
          {hasDuration && (
            <View style={styles.specCard}>
              <Text style={styles.specValue}>{durationSeconds}s</Text>
              <Text style={styles.specLabel}>Duration</Text>
            </View>
          )}
        </View>

        {/* Drill Timer (if duration-based) */}
        {hasDuration && (
          <View style={styles.drillTimerSection}>
            {drillTimerActive ? (
              <View style={styles.drillTimerActive}>
                <Text style={styles.drillTimerValue}>{formatTime(drillTimerSeconds)}</Text>
                <TouchableOpacity
                  style={styles.drillTimerStop}
                  onPress={() => { setDrillTimerActive(false); setDrillTimerSeconds(0); }}
                >
                  <Ionicons name="stop" size={18} color={COLORS.danger} />
                  <Text style={styles.drillTimerStopText}>Stop</Text>
                </TouchableOpacity>
              </View>
            ) : drillTimerSeconds === 0 ? (
              <TouchableOpacity
                style={styles.drillTimerStart}
                onPress={() => handleStartDrillTimer(durationSeconds)}
              >
                <Ionicons name="timer-outline" size={20} color={COLORS.accent} />
                <Text style={styles.drillTimerStartText}>Start Timer ({durationSeconds}s)</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.drillTimerDone}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.drillTimerDoneText}>Timer complete!</Text>
              </View>
            )}
          </View>
        )}

        {/* Video placeholder */}
        <TouchableOpacity
          style={styles.videoPlaceholder}
          onPress={() => navigation.navigate('DrillDetail', { drill: currentDrill })}
        >
          <Ionicons name="play-circle-outline" size={48} color="rgba(255,255,255,0.7)" />
          <Text style={styles.videoPlaceholderText}>Watch Demo Video</Text>
        </TouchableOpacity>

        {/* Coaching Cues */}
        {(currentDrill.coaching_cues || currentDrill.description) && (
          <View style={styles.cuesSection}>
            <Text style={styles.cuesTitle}>
              <Ionicons name="megaphone-outline" size={16} /> Coaching Cues
            </Text>
            <Text style={styles.cuesText}>
              {currentDrill.coaching_cues || currentDrill.description}
            </Text>
          </View>
        )}

        {/* Coach notes for this specific drill in the workout */}
        {currentItem?.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>
              <Ionicons name="chatbubble-outline" size={14} /> Coach's Note
            </Text>
            <Text style={styles.notesText}>{currentItem.notes}</Text>
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {isCurrentCompleted ? (
          <View style={styles.completedRow}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.completedText}>Drill complete!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={handleCompleteDrill}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={22} color="#FFF" />
            <Text style={styles.completeBtnText}>Mark Drill Complete</Text>
          </TouchableOpacity>
        )}

        {/* Navigation arrows + finish */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentDrillIndex === 0 && styles.navBtnDisabled]}
            onPress={() => {
              if (currentDrillIndex > 0) setCurrentDrillIndex(currentDrillIndex - 1);
            }}
            disabled={currentDrillIndex === 0}
          >
            <Ionicons name="chevron-back" size={20} color={currentDrillIndex === 0 ? COLORS.textLight : COLORS.text} />
            <Text style={[styles.navBtnText, currentDrillIndex === 0 && styles.navBtnTextDisabled]}>Previous</Text>
          </TouchableOpacity>

          {currentDrillIndex === drills.length - 1 || allCompleted ? (
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={handleFinishWorkout}
              activeOpacity={0.85}
            >
              <Text style={styles.finishBtnText}>Finish Workout</Text>
              <Ionicons name="flag" size={18} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => setCurrentDrillIndex(currentDrillIndex + 1)}
            >
              <Text style={styles.navBtnText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.body },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 56,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  topBarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },

  // Progress bar
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.borderLight,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  dotCurrent: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  dotCompleted: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success,
  },

  // Pause overlay
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 100,
  },
  pauseContent: {
    alignItems: 'center',
  },
  pauseText: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: '#FFF',
    marginTop: SPACING.md,
  },
  pauseSubtext: {
    fontSize: FONTS.sizes.body,
    color: 'rgba(255,255,255,0.6)',
    marginTop: SPACING.sm,
  },

  scroll: { flex: 1 },

  // Drill header
  drillHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  drillIndex: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  drillName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  drillCategory: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Specs
  specRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  specCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minWidth: 80,
    ...SHADOWS.sm,
  },
  specValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.accent,
  },
  specLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2,
  },

  // Drill timer
  drillTimerSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  drillTimerStart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
  },
  drillTimerStartText: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.accent,
  },
  drillTimerActive: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  drillTimerValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
  },
  drillTimerStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
  },
  drillTimerStopText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.danger,
    fontWeight: '600',
  },
  drillTimerDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
  },
  drillTimerDoneText: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.success,
  },

  // Video
  videoPlaceholder: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    height: 180,
    backgroundColor: COLORS.dark,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },

  // Coaching cues
  cuesSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  cuesTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  cuesText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // Coach notes
  notesSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  notesTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  notesText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    lineHeight: 22,
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    gap: SPACING.sm,
  },
  completeBtnText: {
    color: '#FFF',
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
  },
  completedText: {
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
    color: COLORS.success,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  navBtnTextDisabled: { color: COLORS.textLight },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
  },
  finishBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: FONTS.sizes.body,
  },
});
