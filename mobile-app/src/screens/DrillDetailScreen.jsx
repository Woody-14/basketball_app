/**
 * DrillDetailScreen — Detailed view of a single drill.
 *
 * Shows the coach's demo video, description, coaching cues,
 * sets/reps/duration, and difficulty level.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, CATEGORY_LABELS, DIFFICULTY_COLORS } from '../constants/theme';
import { getDrill } from '../services/api';


const { width: SCREEN_WIDTH } = Dimensions.get('window');


export default function DrillDetailScreen({ route }) {
  const { drill: initialDrill } = route.params;
  const [drill, setDrill] = useState(initialDrill);
  const videoRef = useRef(null);
  const [videoStatus, setVideoStatus] = useState({});
  const [videoLoading, setVideoLoading] = useState(true);

  // If video_url is missing (drill came from a workout/assignment response where
  // presigned URLs are not generated), fetch the drill directly to get a fresh URL.
  useEffect(() => {
    if (!initialDrill.video_url && initialDrill.id) {
      getDrill(initialDrill.id)
        .then(fresh => setDrill(fresh))
        .catch(() => {}); // silently fail — no video shown
    }
  }, [initialDrill.id]);

  const diffColor = DIFFICULTY_COLORS[drill.difficulty] || DIFFICULTY_COLORS.beginner;
  const hasVideo = !!drill.video_url;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Video Player */}
      {hasVideo ? (
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: drill.video_url }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            onLoadStart={() => setVideoLoading(true)}
            onLoad={() => setVideoLoading(false)}
            onPlaybackStatusUpdate={setVideoStatus}
          />
          {videoLoading && (
            <View style={styles.videoLoading}>
              <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noVideoContainer}>
          <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.noVideoText}>No demo video yet</Text>
        </View>
      )}

      {/* Drill Info */}
      <View style={styles.infoSection}>
        <View style={styles.titleRow}>
          <View style={styles.titleInfo}>
            <Text style={styles.drillName}>{drill.name}</Text>
            <Text style={styles.drillCategory}>
              {CATEGORY_LABELS[drill.category] || drill.category}
            </Text>
          </View>
          <View style={[styles.diffBadge, { backgroundColor: diffColor.bg }]}>
            <Text style={[styles.diffText, { color: diffColor.text }]}>
              {drill.difficulty}
            </Text>
          </View>
        </View>

        {/* Specs */}
        <View style={styles.specsRow}>
          {drill.default_sets && (
            <View style={styles.specPill}>
              <Text style={styles.specPillValue}>{drill.default_sets}</Text>
              <Text style={styles.specPillLabel}>sets</Text>
            </View>
          )}
          {drill.default_reps && (
            <View style={styles.specPill}>
              <Text style={styles.specPillValue}>{drill.default_reps}</Text>
              <Text style={styles.specPillLabel}>reps</Text>
            </View>
          )}
          {drill.default_duration_seconds && (
            <View style={styles.specPill}>
              <Text style={styles.specPillValue}>{drill.default_duration_seconds}</Text>
              <Text style={styles.specPillLabel}>sec</Text>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      {drill.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="document-text-outline" size={16} /> Description
          </Text>
          <Text style={styles.sectionText}>{drill.description}</Text>
        </View>
      )}

      {/* Coaching Cues */}
      {drill.coaching_cues && (
        <View style={styles.cuesSection}>
          <Text style={styles.cuesTitle}>
            <Ionicons name="megaphone-outline" size={16} /> Coaching Cues
          </Text>
          <Text style={styles.cuesText}>{drill.coaching_cues}</Text>
        </View>
      )}

      {/* Tags */}
      {drill.tags && drill.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {drill.tags.map(tag => (
              <View key={tag.id} style={styles.tag}>
                <Text style={styles.tagText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Video
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.5625, // 16:9 aspect ratio
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  noVideoContainer: {
    width: SCREEN_WIDTH,
    height: 200,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
  },

  // Info
  infoSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleInfo: { flex: 1, marginRight: SPACING.md },
  drillName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  drillCategory: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  diffBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  diffText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  specsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  specPillValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.accent,
  },
  specPillLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Sections
  section: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },

  // Coaching cues (highlighted)
  cuesSection: {
    margin: SPACING.lg,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  cuesTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: SPACING.sm,
  },
  cuesText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    lineHeight: 24,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
