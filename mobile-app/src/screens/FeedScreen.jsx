/**
 * FeedScreen — Coach's content feed for students.
 *
 * Layout:
 *   1. Pinned "Drill of the Week" card (only when an active, non-expired drill exists)
 *   2. Scrollable list of announcements (and any past drill cards, newest first)
 *
 * Drill of the week:
 *   - Pinned at the very top, outside the scroll list
 *   - Expires 7 days after scheduled_for (enforced server-side; just not returned)
 *   - The backend only returns currently-active posts in GET /api/feed
 *
 * Pull-to-refresh via RefreshControl.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { getFeed } from '../services/api';


// ---------- HELPERS ----------

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysRemaining(scheduledFor) {
  const expiry = new Date(scheduledFor).getTime() + 7 * 24 * 3600 * 1000;
  const diff = expiry - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatCategory(cat) {
  return (cat || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}


// ---------- PINNED DRILL CARD ----------

function PinnedDrillCard({ post }) {
  const drill = post.drill;

  return (
    <View style={styles.pinnedCard}>
      {/* Pin header */}
      <View style={styles.pinnedHeader}>
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={11} color="#fff" />
          <Text style={styles.pinnedBadgeText}>DRILL OF THE WEEK</Text>
        </View>
      </View>

      {/* Thumbnail */}
      {drill?.thumbnail_url ? (
        <Image
          source={{ uri: drill.thumbnail_url }}
          style={styles.pinnedThumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.pinnedThumbnailPlaceholder}>
          <Ionicons name="barbell" size={44} color={COLORS.accent} />
        </View>
      )}

      {/* Drill info */}
      {drill && (
        <View style={styles.pinnedInfo}>
          <Text style={styles.pinnedDrillName}>{drill.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{formatCategory(drill.category)}</Text>
          </View>
          {drill.description ? (
            <Text style={styles.pinnedDesc} numberOfLines={3}>
              {drill.description}
            </Text>
          ) : null}
          {drill.coaching_cues ? (
            <View style={styles.cuesBox}>
              <Text style={styles.cuesLabel}>COACHING CUES</Text>
              <Text style={styles.cuesText} numberOfLines={3}>{drill.coaching_cues}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Coach note */}
      {post.content ? (
        <View style={styles.coachNote}>
          <Ionicons name="chatbubble-ellipses" size={13} color={COLORS.accent} />
          <Text style={styles.coachNoteText}>{post.content}</Text>
        </View>
      ) : null}
    </View>
  );
}


// ---------- ANNOUNCEMENT CARD ----------

function AnnouncementCard({ post }) {
  return (
    <View style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <View style={styles.megaphoneIcon}>
          <Ionicons name="megaphone" size={16} color={COLORS.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.announcementLabel}>FROM COACH</Text>
          <Text style={styles.timestamp}>{relativeTime(post.scheduled_for)}</Text>
        </View>
      </View>
      <Text style={styles.announcementText}>{post.content}</Text>
    </View>
  );
}


// ---------- MAIN SCREEN ----------

export default function FeedScreen() {
  const [pinnedDrill, setPinnedDrill] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function loadFeed() {
    setError(null);
    try {
      const data = await getFeed();
      const posts = data || [];

      // Separate the most recent drill_of_week as the pinned item
      const drillIdx = posts.findIndex(p => p.post_type === 'drill_of_week');
      if (drillIdx !== -1) {
        setPinnedDrill(posts[drillIdx]);
        setFeedItems(posts.filter((_, i) => i !== drillIdx));
      } else {
        setPinnedDrill(null);
        setFeedItems(posts);
      }
    } catch (err) {
      console.log('FeedScreen load error:', err.message);
      setError('Could not load the feed. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFeed();
    }, [])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadFeed();
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>COACH UPDATES</Text>
          <Text style={styles.headerTitle}>Feed</Text>
          <View style={styles.headerAccentBar} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  const isEmpty = !pinnedDrill && feedItems.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>COACH UPDATES</Text>
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={styles.headerAccentBar} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Error state */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Pinned Drill of the Week — always at top */}
        {pinnedDrill && (
          <PinnedDrillCard post={pinnedDrill} />
        )}

        {/* Announcements + section divider */}
        {feedItems.length > 0 && (
          <>
            {pinnedDrill && (
              <Text style={styles.sectionLabel}>ANNOUNCEMENTS</Text>
            )}
            {feedItems.map(post => (
              <AnnouncementCard key={post.id} post={post} />
            ))}
          </>
        )}

        {/* Empty state */}
        {isEmpty && (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={56} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>
              Your coach will post drills and announcements here.
            </Text>
          </View>
        )}

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
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  errorBannerText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.danger,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Pinned Drill card
  pinnedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,92,22,0.25)',
    ...SHADOWS.md,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.accent,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pinnedBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  expiryText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: '#fff',
  },
  pinnedThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.bg,
  },
  pinnedThumbnailPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedInfo: {
    padding: SPACING.md,
  },
  pinnedDrillName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.sm,
  },
  categoryText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.accent,
  },
  pinnedDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cuesBox: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  cuesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cuesText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  coachNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    margin: SPACING.md,
    marginTop: 0,
    borderRadius: RADIUS.md,
  },
  coachNoteText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Announcement card
  announcementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  megaphoneIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(59,130,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.info,
    letterSpacing: 0.6,
  },
  timestamp: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  announcementText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    lineHeight: 24,
  },
});
