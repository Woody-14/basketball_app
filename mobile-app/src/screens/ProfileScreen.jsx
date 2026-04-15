/**
 * ProfileScreen — Student's profile, badges, and settings.
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { deleteMyAccount } from '../services/api';


export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [selectedBadge, setSelectedBadge] = useState(null);

  function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently deactivate your account and remove your data. This cannot be undone.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Your account will be deleted. You will be signed out immediately.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteMyAccount();
                      await signOut();
                    } catch (e) {
                      Alert.alert('Error', 'Could not delete account. Please try again or contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  // Level info — must match backend xp.py thresholds
  const LEVEL_NAMES = {
    1: 'Rookie', 2: 'Rising Star', 3: 'Starter',
    4: 'Varsity', 5: 'All-Star', 6: 'Pro', 7: 'Legend',
  };
  const userLevel = user?.level || 1;
  const userLevelName = LEVEL_NAMES[userLevel] || 'Rookie';

  // Merge user's earned badges with the full badge list to show locked/unlocked
  const earnedBadgeNames = new Set((user?.badges || []).map(b => b.name));

  const builtInBadges = [
    { id: 1,  name: 'First Rep',        emoji: '🏀', description: 'Complete your very first workout.' },
    { id: 2,  name: '5 Strong',         emoji: '💪', description: 'Complete 5 total workouts.' },
    { id: 3,  name: '10 Workouts',      emoji: '✅', description: 'Complete 10 total workouts.' },
    { id: 4,  name: '25 Workouts',      emoji: '🎯', description: 'Complete 25 total workouts.' },
    { id: 5,  name: '50 Workouts',      emoji: '🔥', description: 'Complete 50 total workouts.' },
    { id: 6,  name: 'Century Club',     emoji: '💯', description: 'Complete 100 total workouts.' },
    { id: 7,  name: 'Hat Trick',        emoji: '🎩', description: 'Complete workouts 3 days in a row.' },
    { id: 8,  name: 'Weekly Warrior',   emoji: '⚡', description: 'Maintain a 7-day workout streak.' },
    { id: 9,  name: 'Two Weeks Strong', emoji: '💎', description: 'Maintain a 14-day workout streak.' },
    { id: 10, name: 'Monthly Grind',    emoji: '🏆', description: 'Maintain a 30-day workout streak.' },
    { id: 11, name: '60-Day Elite',     emoji: '👑', description: 'Maintain a 60-day workout streak.' },
    { id: 12, name: 'Perfect Week',     emoji: '⭐', description: 'Complete every assigned workout in a week (minimum 3 workouts).' },
  ];

  const badges = builtInBadges.map(b => ({
    ...b,
    earned: earnedBadgeNames.has(b.name),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.headerTitle}>
          {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Profile'}
        </Text>
        <View style={styles.headerAccentBar} />
      </View>

      {/* Badge Detail Modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalEmoji}>{selectedBadge?.emoji}</Text>
            <Text style={styles.modalBadgeName}>{selectedBadge?.name}</Text>
            {selectedBadge?.earned ? (
              <View style={styles.modalEarnedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.modalEarnedText}>Earned</Text>
              </View>
            ) : (
              <View style={styles.modalLockedBadge}>
                <Ionicons name="lock-closed" size={14} color={COLORS.textLight} />
                <Text style={styles.modalLockedText}>Locked</Text>
              </View>
            )}
            <Text style={styles.modalDescription}>{selectedBadge?.description}</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedBadge(null)}>
              <Text style={styles.modalCloseBtnText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Player Card */}
        <View style={styles.playerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.playerName}>
            {user?.first_name
              ? `${user.first_name} ${user.last_name || ''}`
              : user?.email || 'Player'}
          </Text>
          {user?.position && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>{user.position}</Text>
            </View>
          )}
          {user?.school && (
            <Text style={styles.schoolText}>{user.school}</Text>
          )}

          {/* Level badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelEmoji}>⭐</Text>
            <Text style={styles.levelText}>Level {userLevel} · {userLevelName}</Text>
            {user?.xp != null && (
              <Text style={styles.levelXp}>{(user.xp).toLocaleString()} XP</Text>
            )}
          </View>

          {/* Tier badge */}
          {(() => {
            const tier = user?.subscription_tier;
            const isElite = tier === 'elite';
            const label = isElite ? 'Elite' : 'Training';
            const desc = isElite
              ? '4–5 workouts/week · 2× monthly sessions'
              : '2–3 workouts/week · Monthly private session';
            return (
              <View style={[styles.tierBadge, isElite ? styles.tierBadgeElite : styles.tierBadgeTraining]}>
                <Ionicons
                  name={isElite ? 'trophy' : 'barbell'}
                  size={14}
                  color={isElite ? '#D97706' : COLORS.accent}
                />
                <View>
                  <Text style={[styles.tierLabel, isElite ? styles.tierLabelElite : styles.tierLabelTraining]}>
                    {label} Plan
                  </Text>
                  <Text style={styles.tierDesc}>{desc}</Text>
                </View>
              </View>
            );
          })()}

          {/* Quick stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{user?.current_streak || 0}</Text>
              <Text style={styles.quickStatLabel}>Streak</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{user?.longest_streak || 0}</Text>
              <Text style={styles.quickStatLabel}>Best</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{user?.age || '—'}</Text>
              <Text style={styles.quickStatLabel}>Age</Text>
            </View>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGES</Text>
          <View style={styles.badgesGrid}>
            {badges.map(badge => (
              <TouchableOpacity
                key={badge.id}
                style={[styles.badgeItem, !badge.earned && styles.badgeLocked]}
                onPress={() => setSelectedBadge(badge)}
                activeOpacity={0.7}
              >
                <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
                  {badge.emoji}
                </Text>
                <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
                  {badge.name}
                </Text>
                {!badge.earned && (
                  <Ionicons name="lock-closed" size={12} color={COLORS.textLight} style={styles.lockIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Messages')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.text} />
              <Text style={styles.menuItemText}>Message Coach</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('FormChecks')}
            >
              <Ionicons name="videocam-outline" size={22} color={COLORS.text} />
              <Text style={styles.menuItemText}>Form Checks</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <Ionicons name="lock-closed-outline" size={22} color={COLORS.text} />
              <Text style={styles.menuItemText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openSettings()}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
              <Text style={styles.menuItemText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('mailto:summit.athletic.training@gmail.com')}
            >
              <Ionicons name="help-circle-outline" size={22} color={COLORS.text} />
              <Text style={styles.menuItemText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('https://woody-14.github.io/basketball_app/website/privacy-policy.html')}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.text} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Summit Hoops v1.0.0</Text>

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

  // Player card
  playerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  playerName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  positionBadge: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  positionText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.accent,
  },
  schoolText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    width: '100%',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  quickStatLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.borderLight,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  levelEmoji: {
    fontSize: 14,
  },
  levelText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  levelXp: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(196,181,253,0.7)',
    marginLeft: 2,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    borderWidth: 1,
  },
  tierBadgeTraining: {
    backgroundColor: COLORS.accentLight,
    borderColor: 'rgba(255,92,22,0.2)',
  },
  tierBadgeElite: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  tierLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  tierLabelTraining: {
    color: COLORS.accent,
  },
  tierLabelElite: {
    color: '#D97706',
  },
  tierDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Badges
  section: { marginTop: SPACING.lg },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  badgeItem: {
    width: '30%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeEmojiLocked: {
    opacity: 0.4,
  },
  badgeName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  badgeNameLocked: {
    color: COLORS.textLight,
  },
  lockIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Menu
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuItemLocked: {
    color: COLORS.textLight,
  },
  lockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,92,22,0.2)',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.md,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  logoutText: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.danger,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xs,
  },
  deleteText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    textDecorationLine: 'underline',
  },
  versionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
  },

  // Badge modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.md,
  },
  modalEmoji: {
    fontSize: 56,
    marginBottom: SPACING.md,
  },
  modalBadgeName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalEarnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginBottom: SPACING.md,
  },
  modalEarnedText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.success,
  },
  modalLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginBottom: SPACING.md,
  },
  modalLockedText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  modalDescription: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  modalCloseBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  modalCloseBtnText: {
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
    color: '#FFF',
  },
});
