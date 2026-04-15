/**
 * DrillLibraryScreen — Browse the coach's full drill library.
 *
 * Students can search and filter drills, tap to see details and
 * watch the coach's demo video. This is a reference/learning tool.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, CATEGORY_LABELS, DIFFICULTY_COLORS } from '../constants/theme';
import { getDrills } from '../services/api';
import { useAuth } from '../hooks/useAuth';


// Shown to Training-tier students who don't have drill library access
function TierLockedView() {
  return (
    <View style={lockedStyles.container}>
      <View style={lockedStyles.iconWrap}>
        <Ionicons name="barbell-outline" size={40} color={COLORS.accent} />
      </View>
      <Text style={lockedStyles.title}>Elite Plan Feature</Text>
      <Text style={lockedStyles.body}>
        The full drill library is available on the Elite plan. Your coach assigns
        personalized drills tailored specifically to your development.
      </Text>
      <View style={lockedStyles.card}>
        <Text style={lockedStyles.cardTitle}>YOUR TRAINING PLAN INCLUDES</Text>
        {[
          'Personalized assigned workouts (2–3/week)',
          'Video form checks with coach feedback',
          'In-app messaging with your coach',
          'Streak tracking and achievement badges',
          'Monthly 1-on-1 private training session',
        ].map(item => (
          <View key={item} style={lockedStyles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={lockedStyles.checkText}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={lockedStyles.upgradeHint}>
        Ask your coach about upgrading to Elite for 4–5 workouts/week,
        custom drills, and twice-monthly sessions.
      </Text>
    </View>
  );
}

const lockedStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.bg, padding: SPACING.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text,
    textAlign: 'center', marginBottom: SPACING.sm,
  },
  body: {
    fontSize: FONTS.sizes.body, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, width: '100%', ...SHADOWS.sm,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textLight,
    letterSpacing: 1, marginBottom: SPACING.md,
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  checkText: {
    flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text, lineHeight: 20,
  },
  upgradeHint: {
    fontSize: FONTS.sizes.sm, color: COLORS.textLight,
    textAlign: 'center', lineHeight: 20,
  },
});


const PHASE_META = {
  foundation:        { label: 'Foundation',        color: '#7C3AED' },
  skill_development: { label: 'Skill Development', color: '#2563EB' },
  pre_season:        { label: 'Pre-Season',         color: '#D97706' },
  in_season:         { label: 'In-Season',          color: '#16A34A' },
  post_season:       { label: 'Post-Season',        color: '#6B7280' },
};

export default function DrillLibraryScreen({ navigation }) {
  const { user } = useAuth();
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [phaseFiltered, setPhaseFiltered] = useState(true);

  const loadDrills = useCallback(async () => {
    try {
      const filters = {};
      if (phaseFiltered && user?.training_phase) {
        filters.phase = user.training_phase;
      }
      const data = await getDrills(filters);
      setDrills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load drills:', err);
    } finally {
      setLoading(false);
    }
  }, [phaseFiltered, user?.training_phase]);

  useEffect(() => { loadDrills(); }, [loadDrills]);

  // Filter drills
  const filtered = drills.filter(drill => {
    if (search && !drill.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory && drill.category !== selectedCategory) return false;
    return true;
  });

  // Get unique categories from drills
  const categories = [...new Set(drills.map(d => d.category))];

  function renderDrill({ item: drill }) {
    const diffColor = DIFFICULTY_COLORS[drill.difficulty] || DIFFICULTY_COLORS.beginner;

    return (
      <TouchableOpacity
        style={styles.drillCard}
        onPress={() => navigation.navigate('DrillDetail', { drill })}
        activeOpacity={0.85}
      >
        {/* Video Thumbnail Area */}
        <View style={styles.drillThumb}>
          <Ionicons name="play-circle-outline" size={36} color="rgba(255,255,255,0.6)" />
          <View style={[styles.diffBadge, { backgroundColor: diffColor.bg }]}>
            <Text style={[styles.diffBadgeText, { color: diffColor.text }]}>
              {drill.difficulty}
            </Text>
          </View>
        </View>

        <View style={styles.drillInfo}>
          <Text style={styles.drillName} numberOfLines={1}>{drill.name}</Text>
          <Text style={styles.drillCategory}>
            {CATEGORY_LABELS[drill.category] || drill.category}
          </Text>
          <View style={styles.drillMeta}>
            {drill.default_sets && (
              <Text style={styles.metaText}>{drill.default_sets} sets</Text>
            )}
            {drill.default_reps && (
              <Text style={styles.metaText}>{drill.default_reps} reps</Text>
            )}
            {drill.default_duration_seconds && (
              <Text style={styles.metaText}>{drill.default_duration_seconds}s</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>DRILL LIBRARY</Text>
        <Text style={styles.headerTitle}>Drill Library</Text>
        <Text style={styles.headerSubtitle}>{drills.length} drills available</Text>
        <View style={styles.headerAccentBar} />
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search drills..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Phase filter toggle — only shown when student has a phase */}
        {user?.training_phase && (() => {
          const meta = PHASE_META[user.training_phase];
          return (
            <View style={styles.phaseToggleRow}>
              <View style={[styles.phaseDot, { backgroundColor: meta?.color || COLORS.accent }]} />
              <Text style={styles.phaseToggleLabel}>
                {phaseFiltered ? (meta?.label || 'Phase') + ' Drills' : 'All Drills'}
              </Text>
              <TouchableOpacity onPress={() => setPhaseFiltered(v => !v)}>
                <Text style={styles.phaseToggleLink}>
                  {phaseFiltered ? 'Show all' : 'Phase only'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            style={[styles.chip, !selectedCategory && styles.chipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                {CATEGORY_LABELS[cat] || cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Drill List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderDrill}
          numColumns={2}
          columnWrapperStyle={styles.drillRow}
          contentContainerStyle={styles.drillList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="basketball-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>
                {search || selectedCategory ? 'No matching drills' : 'No drills yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search || selectedCategory
                  ? 'Try a different search or filter.'
                  : 'Your coach will add drills to the library soon.'}
              </Text>
            </View>
          }
        />
      )}
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
  headerSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  headerAccentBar: {
    width: 32,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginTop: 8,
  },

  // Search
  searchSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
  phaseToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    marginBottom: 2,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseToggleLabel: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  phaseToggleLink: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.accent,
  },
  chipScroll: {
    marginTop: SPACING.md,
  },
  chipRow: {
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFF',
  },

  // Drill grid
  drillList: {
    padding: SPACING.lg,
  },
  drillRow: {
    gap: SPACING.md,
  },
  drillCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  drillThumb: {
    height: 110,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diffBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  drillInfo: {
    padding: SPACING.md,
  },
  drillName: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  drillCategory: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  drillMeta: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  metaText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  // States
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
