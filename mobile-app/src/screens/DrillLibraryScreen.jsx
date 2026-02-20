/**
 * DrillLibraryScreen — Browse the coach's full drill library.
 *
 * Students can search and filter drills, tap to see details and
 * watch the coach's demo video. This is a reference/learning tool.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, CATEGORY_LABELS, DIFFICULTY_COLORS } from '../constants/theme';
import { getDrills } from '../services/api';


export default function DrillLibraryScreen({ navigation }) {
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => { loadDrills(); }, []);

  async function loadDrills() {
    try {
      const data = await getDrills();
      setDrills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load drills:', err);
    } finally {
      setLoading(false);
    }
  }

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
        <Text style={styles.headerTitle}>Drill Library</Text>
        <Text style={styles.headerSubtitle}>{drills.length} drills available</Text>
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
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
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
