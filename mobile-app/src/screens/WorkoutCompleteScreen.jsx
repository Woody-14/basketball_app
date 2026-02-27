/**
 * WorkoutCompleteScreen — Celebration screen after finishing a workout!
 *
 * Shows an animated celebration with the workout stats, XP earned,
 * any newly earned badges, and a level-up banner if applicable.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';


// Badge type to emoji mapping
const BADGE_EMOJIS = {
  workout_count: '💪',
  streak: '🔥',
  perfect_week: '⭐',
  skill_milestone: '🎯',
  monthly_challenge: '🏆',
  custom: '🎖️',
};

// Level number to name mapping (matches backend xp.py)
const LEVEL_NAMES = {
  1: 'Rookie',
  2: 'Rising Star',
  3: 'Starter',
  4: 'Varsity',
  5: 'All-Star',
  6: 'Pro',
  7: 'Legend',
};


export default function WorkoutCompleteScreen({ route, navigation }) {
  const {
    drillsCompleted, totalDrills, timeSeconds,
    xpEarned = 0,
    newBadges = [],
    newLevel = null,
  } = route.params;

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

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
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

          {/* XP Earned */}
          {xpEarned > 0 && (
            <View style={styles.xpRow}>
              <Ionicons name="flash" size={20} color="#FFD700" />
              <Text style={styles.xpText}>+{xpEarned} XP earned</Text>
            </View>
          )}

          {/* Level Up Banner */}
          {newLevel && (
            <View style={styles.levelUpBanner}>
              <Text style={styles.levelUpStar}>⭐</Text>
              <View style={styles.levelUpTextWrap}>
                <Text style={styles.levelUpTitle}>Level Up!</Text>
                <Text style={styles.levelUpSub}>
                  You're now a {LEVEL_NAMES[newLevel] || `Level ${newLevel}`}!
                </Text>
              </View>
              <Text style={styles.levelUpStar}>⭐</Text>
            </View>
          )}

          {/* New Badges */}
          {newBadges.length > 0 && (
            <View style={styles.badgesSection}>
              <Text style={styles.badgesTitle}>
                <Ionicons name="trophy" size={14} color={COLORS.warning} /> Badge{newBadges.length > 1 ? 's' : ''} Earned!
              </Text>
              <View style={styles.badgesList}>
                {newBadges.map((badge, i) => (
                  <View key={badge.id || i} style={styles.badgePill}>
                    <Text style={styles.badgePillEmoji}>
                      {BADGE_EMOJIS[badge.badge_type] || '🎖️'}
                    </Text>
                    <Text style={styles.badgePillName}>{badge.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Motivational message */}
          <View style={styles.messageCard}>
            <Ionicons name="flame" size={20} color={COLORS.accent} />
            <Text style={styles.messageText}>
              Every rep builds your game. Keep showing up and the results will follow.
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

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
  },

  // Trophy
  trophySection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  trophyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(232, 113, 42, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  trophyEmoji: {
    fontSize: 48,
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

  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },

  // Stats
  statsSection: {
    marginBottom: SPACING.lg,
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

  // XP
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  xpText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: '#FFD700',
  },

  // Level Up
  levelUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
  },
  levelUpStar: {
    fontSize: 24,
  },
  levelUpTextWrap: {
    alignItems: 'center',
  },
  levelUpTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  levelUpSub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(196,181,253,0.8)',
    marginTop: 2,
  },

  // Badges
  badgesSection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  badgesTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: SPACING.sm,
  },
  badgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgePillEmoji: {
    fontSize: 16,
  },
  badgePillName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: '#FFF',
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.dark,
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
