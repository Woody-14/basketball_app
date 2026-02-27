/**
 * RadarChart — SVG radar chart for skill assessments.
 *
 * Uses react-native-svg (already installed) to draw an 8-axis spider chart.
 * Scores are on a 1–10 scale. Null scores render as 0.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { COLORS, FONTS, SPACING } from '../constants/theme';

const SKILLS = [
  { key: 'ball_handling',     label: 'Ball\nHandling' },
  { key: 'shooting_form',     label: 'Shooting\nForm' },
  { key: 'shooting_accuracy', label: 'Accuracy' },
  { key: 'footwork',          label: 'Footwork' },
  { key: 'finishing',         label: 'Finishing' },
  { key: 'court_vision',      label: 'Court\nVision' },
  { key: 'athleticism',       label: 'Athletic' },
  { key: 'defense',           label: 'Defense' },
];

const N = SKILLS.length;                 // 8 axes
const MAX_SCORE = 10;
const RINGS = [0.33, 0.67, 1.0];        // Grid rings at 33%, 67%, 100%


/**
 * Convert polar coords to cartesian (SVG space).
 * angle 0 = top (−π/2 offset), clockwise.
 */
function polar(cx, cy, r, angleIndex) {
  const angle = (2 * Math.PI * angleIndex) / N - Math.PI / 2;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

/**
 * Build a polygon points string from score values.
 */
function scorePolygon(cx, cy, maxR, data) {
  return SKILLS.map((skill, i) => {
    const val = data[skill.key] ?? 0;
    const r = (val / MAX_SCORE) * maxR;
    const { x, y } = polar(cx, cy, r, i);
    return `${x},${y}`;
  }).join(' ');
}

/**
 * Build a ring polygon points string.
 */
function ringPolygon(cx, cy, r) {
  return Array.from({ length: N }, (_, i) => {
    const { x, y } = polar(cx, cy, r, i);
    return `${x},${y}`;
  }).join(' ');
}


export default function RadarChart({ data, size = 280 }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;           // Leave room for labels
  const labelR = maxR + 20;           // Labels just outside the outermost ring

  const hasAnyScore = SKILLS.some(s => data[s.key] != null && data[s.key] > 0);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>

        {/* Grid rings */}
        {RINGS.map((pct, ri) => (
          <Polygon
            key={`ring-${ri}`}
            points={ringPolygon(cx, cy, maxR * pct)}
            fill="none"
            stroke={COLORS.border}
            strokeWidth={1}
          />
        ))}

        {/* Axes */}
        {SKILLS.map((_, i) => {
          const outer = polar(cx, cy, maxR, i);
          return (
            <Line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke={COLORS.border}
              strokeWidth={1}
            />
          );
        })}

        {/* Score polygon */}
        {hasAnyScore && (
          <Polygon
            points={scorePolygon(cx, cy, maxR, data)}
            fill={`${COLORS.accent}33`}   // 20% opacity
            stroke={COLORS.accent}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Score dots */}
        {hasAnyScore && SKILLS.map((skill, i) => {
          const val = data[skill.key] ?? 0;
          if (val === 0) return null;
          const r = (val / MAX_SCORE) * maxR;
          const { x, y } = polar(cx, cy, r, i);
          return (
            <Circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r={4}
              fill={COLORS.accent}
            />
          );
        })}

        {/* Labels */}
        {SKILLS.map((skill, i) => {
          const { x, y } = polar(cx, cy, labelR, i);
          // Adjust text anchor based on x position
          const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
          const lines = skill.label.split('\n');
          const lineHeight = 13;
          const totalH = lines.length * lineHeight;
          const yStart = y - totalH / 2 + lineHeight / 2;

          return (
            <G key={`label-${i}`}>
              {lines.map((line, li) => (
                <SvgText
                  key={li}
                  x={x}
                  y={yStart + li * lineHeight}
                  textAnchor={anchor}
                  fontSize={10}
                  fontWeight="600"
                  fill={COLORS.textSecondary}
                >
                  {line}
                </SvgText>
              ))}
            </G>
          );
        })}

        {/* Ring labels (1, 3, 6, 10 scores at rings) */}
        {['3', '7', '10'].map((label, ri) => (
          <SvgText
            key={`rlabel-${ri}`}
            x={cx + 3}
            y={cy - maxR * RINGS[ri] - 3}
            fontSize={8}
            fill={COLORS.textLight}
          >
            {label}
          </SvgText>
        ))}

      </Svg>

      {!hasAnyScore && (
        <Text style={styles.noDataText}>Scores not yet entered</Text>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  noDataText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
});
