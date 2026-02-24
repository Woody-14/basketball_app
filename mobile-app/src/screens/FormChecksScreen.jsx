/**
 * FormChecksScreen — Student's form check submission history.
 *
 * Shows all uploaded drill videos along with coach feedback.
 * Pending reviews show "Awaiting feedback..." in muted style.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { getMyFormChecks } from '../services/api';


export default function FormChecksScreen() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState(null);

  async function load() {
    try {
      const data = await getMyFormChecks();
      setChecks(data || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load form checks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (checks.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="videocam-outline" size={56} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Form Checks Yet</Text>
        <Text style={styles.emptySubtext}>
          Record yourself during a workout to get feedback from your coach.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionLabel}>{checks.length} submission{checks.length !== 1 ? 's' : ''}</Text>

      {checks.map(check => (
        <View key={check.id} style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.drillName}>{check.drill?.name || 'Drill'}</Text>
              {check.is_reviewed ? (
                <View style={styles.reviewedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  <Text style={styles.reviewedText}>Reviewed</Text>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardDate}>
              {check.assigned_date ? `Workout: ${formatDate(check.assigned_date)}` : formatDate(check.completed_at)}
            </Text>
          </View>

          {/* Video */}
          {check.video_url ? (
            <View style={styles.videoContainer}>
              {playingId === check.id ? (
                <Video
                  source={{ uri: check.video_url }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  onError={() => {
                    setPlayingId(null);
                    Alert.alert('Playback Error', 'Could not play this video.');
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={styles.videoThumbnail}
                  onPress={() => setPlayingId(check.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.playBtn}>
                    <Ionicons name="play" size={28} color="#FFF" />
                  </View>
                  <Text style={styles.videoLabel}>Tap to play</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noVideo}>
              <Ionicons name="videocam-off-outline" size={24} color={COLORS.textLight} />
              <Text style={styles.noVideoText}>No video</Text>
            </View>
          )}

          {/* Coach Feedback */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>
              <Ionicons name="chatbubble-outline" size={13} /> Coach Feedback
            </Text>
            {check.coach_feedback ? (
              <>
                <Text style={styles.feedbackText}>{check.coach_feedback}</Text>
                {check.feedback_at && (
                  <Text style={styles.feedbackDate}>— {formatDate(check.feedback_at)}</Text>
                )}
              </>
            ) : (
              <Text style={styles.awaitingText}>Awaiting feedback from your coach...</Text>
            )}
          </View>
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.bg,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  cardHeader: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  drillName: {
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  reviewedText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.success,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  pendingText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  cardDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Video
  videoContainer: {
    height: 200,
    backgroundColor: COLORS.dark,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  videoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  noVideo: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.bg,
  },
  noVideoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
  },

  // Feedback
  feedbackSection: {
    padding: SPACING.md,
  },
  feedbackLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  feedbackText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    lineHeight: 22,
  },
  feedbackDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  awaitingText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});
