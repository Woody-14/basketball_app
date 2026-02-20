/**
 * WorkoutCompleteScreen — Celebration screen after finishing a workout!
 *
 * Shows an animated celebration with the workout stats.
 * This is the feel-good moment that keeps kids coming back.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';


export default function WorkoutCompleteScreen({ route, navigation }) {
  const { drillsCompleted, totalDrills, timeSeconds } = route.params;

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      // Trophy bounces in
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      // Stats fade and slide up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  const completionPercent = totalDrills > 0
    ? Math.round((drillsCompleted / totalDrills) * 100)
    : 0;

  const message = completionPercent === 100
    ? 'Perfect Workout! 🔥'
    : completionPercent >= 75
      ? 'Great Effort! 💪'
      : 'Good Work! 👏';

  return (
    <View style={styles.container}>
      {/* Trophy / Celebration */}
      <Animated.View style={[styles.trophySection, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.trophyCircle}>
          <Text style={styles.trophyEmoji}>🏆</Text>
        </View>
        <Text style={styles.congratsText}>{message}</Text>
        <Text style={styles.congratsSubtext}>Workout complete</Text>
      </Animated.View>

      {/* Stats */}
      <Animated.View style={[
        styles.statsSection,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconCircle}>
              <Ionicons name="checkmark-done" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{drillsCompleted}/{totalDrills}</Text>
            <Text style={styles.statLabel}>Drills Completed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconCircle}>
              <Ionicons name="time" size={24} color={COLORS.info} />
            </View>
            <Text style={styles.statValue}>{formatTime(timeSeconds)}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconCircle}>
              <Ionicons name="trending-up" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.statValue}>{completionPercent}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* Motivational message */}
        <View style={styles.messageCard}>
          <Ionicons name="flame" size={20} color={COLORS.accent} />
          <Text style={styles.messageText}>
            Every rep builds your game. Keep showing up and the results will follow.
          </Text>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View style={[styles.actionSection, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },

  // Trophy
  trophySection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  trophyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(232, 113, 42, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  trophyEmoji: {
    fontSize: 56,
  },
  congratsText: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  congratsSubtext: {
    fontSize: FONTS.sizes.body,
    color: 'rgba(255,255,255,0.5)',
    marginTop: SPACING.xs,
  },

  // Stats
  statsSection: {
    marginBottom: SPACING.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },

  // Message
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  messageText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Actions
  actionSection: {
    gap: SPACING.md,
  },
  doneBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
});
