import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Easing,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { useMascot } from '../context/MascotContext';
import { PixelMascot } from './PixelMascot';
import type { GanttItem } from '../types';

export interface GanttMascotProps {
  items?: GanttItem[];
}

const STARK_TIPS = [
  'Un plan sin fecha de revisión se atrasa solo.',
  'JARVIS dice: revisa el cronograma cada lunes.',
  'Divide los planes grandes en tareas cortas.',
  'Un plan al 0% a mitad de camino necesita ayuda.',
];

const MASCOT_WIDTH = 62;
const CARD_WIDTH = 220;

const getStart = (item: GanttItem) => item.start_date || item.fechaInicio;
const getEnd = (item: GanttItem) => item.end_date || item.fechaFin;
const getTitle = (item: GanttItem) => item.title || item.nombre || `Plan #${item.id}`;
const getProgress = (item: GanttItem) =>
  typeof item.progress === 'number' ? item.progress : item.progreso ?? 0;
const isClosed = (item: GanttItem) => {
  const status = (item.status || item.estado || '').toLowerCase();
  return status === 'completado' || status === 'cancelado';
};

export const GanttMascot: React.FC<GanttMascotProps> = ({ items = [] }) => {
  const { colors, isDark } = useTheme();
  const { mascotType } = useMascot();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const mascotDisplayName = mascotType === 'dog' ? 'Cobi' : mascotType === 'cat' ? 'Labi' : 'Tony';

  const [isOpen, setIsOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  const tooltipScale = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  const floatAnim = useRef(new Animated.Value(0)).current;
  const zzzFloatAnim = useRef(new Animated.Value(0)).current;
  const zzzOpacityAnim = useRef(new Animated.Value(0.5)).current;
  const pokeScale = useRef(new Animated.Value(1)).current;

  const mascotPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragMoved = useRef(false);

  const baseRight = 14;
  const baseBottom = insets.bottom + 70;

  const mascotLeft = screenWidth - MASCOT_WIDTH - baseRight;
  const cardLeft = mascotLeft - CARD_WIDTH - 8;
  const cardFinalLeft = Math.max(cardLeft, 8);
  const cardBottom = baseBottom;

  // ─── Plan Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = dayjs().startOf('day');
    const soonLimit = today.add(3, 'day');

    const active = items.filter((it) => !isClosed(it));
    const completed = items.filter((it) => (it.status || it.estado || '').toLowerCase() === 'completado').length;

    let overdue = 0;
    let dueSoon = 0;
    let stalled = 0;
    let mostUrgent: GanttItem | null = null;
    let mostUrgentEnd: dayjs.Dayjs | null = null;

    active.forEach((item) => {
      const start = getStart(item);
      const end = getEnd(item);
      if (!start || !end) return;
      const s = dayjs(start);
      const e = dayjs(end);

      const flagUrgent = () => {
        if (!mostUrgentEnd || e.isBefore(mostUrgentEnd)) {
          mostUrgent = item;
          mostUrgentEnd = e;
        }
      };

      if (e.isBefore(today, 'day')) {
        overdue++;
        flagUrgent();
      } else if (!e.isAfter(soonLimit, 'day')) {
        dueSoon++;
        flagUrgent();
      }

      const totalSpan = e.diff(s, 'day');
      const elapsed = today.diff(s, 'day');
      if (totalSpan > 0 && elapsed > totalSpan * 0.5 && getProgress(item) === 0 && !e.isBefore(today, 'day')) {
        stalled++;
      }
    });

    const total = items.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, overdue, dueSoon, stalled, pct, mostUrgent: mostUrgent as GanttItem | null, mostUrgentEnd: mostUrgentEnd as dayjs.Dayjs | null };
  }, [items]);

  const notification = useMemo(() => {
    if (stats.overdue > 0) return { icon: 'alert-circle' as const, color: '#EF4444', label: `${stats.overdue} vencido${stats.overdue === 1 ? '' : 's'}`, urgent: true };
    if (stats.stalled > 0) return { icon: 'warning' as const, color: '#F59E0B', label: `${stats.stalled} sin avance`, urgent: true };
    if (stats.dueSoon > 0) return { icon: 'calendar' as const, color: '#6366F1', label: `${stats.dueSoon} por vencer`, urgent: false };
    if (stats.total > 0) return { icon: 'sparkles' as const, color: colors.primary, label: 'Cronograma al día', urgent: false };
    return null;
  }, [stats, colors.primary]);

  // ─── Animations ─────────────────────────────────────────────────────────
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -5, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 5, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const zzzLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(zzzFloatAnim, { toValue: -12, duration: 1400, useNativeDriver: true }),
          Animated.timing(zzzOpacityAnim, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(zzzFloatAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(zzzOpacityAnim, { toValue: 0.15, duration: 700, useNativeDriver: true }),
        ]),
      ])
    );
    floatLoop.start();
    zzzLoop.start();
    return () => { floatLoop.stop(); zzzLoop.stop(); };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragMoved.current = false;
        mascotPan.setOffset({
          x: (mascotPan.x as any)._value ?? 0,
          y: (mascotPan.y as any)._value ?? 0,
        });
        mascotPan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
          dragMoved.current = true;
        }
        mascotPan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: () => {
        mascotPan.flattenOffset();
        if (!dragMoved.current) {
          handleToggle();
        }
      },
    })
  ).current;

  const handleToggle = () => {
    if (isOpen) closeTooltip();
    else openTooltip();
  };

  const openTooltip = () => {
    setIsOpen(true);
    Animated.sequence([
      Animated.timing(pokeScale, { toValue: 1.25, duration: 80, useNativeDriver: true }),
      Animated.spring(pokeScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    tooltipScale.setValue(0.7);
    tooltipOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(tooltipScale, { toValue: 1, friction: 7, tension: 180, useNativeDriver: true }),
      Animated.timing(tooltipOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const closeTooltip = () => {
    Animated.parallel([
      Animated.timing(tooltipScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(tooltipOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => setIsOpen(false));
  };

  const handlePoke = () => {
    setTipIdx((i) => (i + 1) % STARK_TIPS.length);
    Animated.sequence([
      Animated.timing(pokeScale, { toValue: 1.3, duration: 70, useNativeDriver: true }),
      Animated.spring(pokeScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
  };

  const alertCount = stats.overdue > 0 ? stats.overdue : stats.stalled > 0 ? stats.stalled : stats.dueSoon > 0 ? stats.dueSoon : 0;
  const pose = isOpen ? 'flying' : alertCount > 0 ? 'alert' : 'sleeping';

  return (
    <>
      {isOpen && (
        <>
          <TouchableOpacity
            style={[StyleSheet.absoluteFillObject, styles.backdrop]}
            activeOpacity={1}
            onPress={closeTooltip}
          />

          <Animated.View
            style={[
              styles.tooltipCard,
              {
                bottom: cardBottom,
                left: cardFinalLeft,
                backgroundColor: isDark ? colors.bgSecondary : '#FFFFFF',
                borderColor: notification?.urgent ? notification.color : colors.borderSubtle,
                transform: [{ scale: tooltipScale }],
                opacity: tooltipOpacity,
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusDot, { backgroundColor: notification?.color ?? '#10B981' }]} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {notification
                    ? notification.label
                    : stats.total === 0
                    ? 'Sin planes creados'
                    : `${stats.pct}% completado`}
                </Text>
                <TouchableOpacity onPress={closeTooltip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.max(stats.pct, 3)}%`,
                      backgroundColor: stats.pct === 100 ? '#10B981' : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {stats.completed} de {stats.total} planes completados · {stats.pct}%
              </Text>

              <View style={styles.chipsRow}>
                {stats.overdue > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(239,68,68,0.14)' }]}>
                    <Ionicons name="alert-circle" size={11} color="#EF4444" />
                    <Text style={[styles.chipText, { color: '#EF4444', fontWeight: '800' }]}>{stats.overdue} vencidos</Text>
                  </View>
                )}
                {stats.dueSoon > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(99,102,241,0.14)' }]}>
                    <Ionicons name="calendar" size={11} color="#6366F1" />
                    <Text style={[styles.chipText, { color: '#6366F1' }]}>{stats.dueSoon} por vencer</Text>
                  </View>
                )}
                {stats.stalled > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
                    <Ionicons name="warning" size={11} color="#F59E0B" />
                    <Text style={[styles.chipText, { color: '#F59E0B', fontWeight: '800' }]}>{stats.stalled} sin avance</Text>
                  </View>
                )}
              </View>

              {stats.mostUrgent && (
                <Text style={[styles.nextText, { color: colors.textPrimary }]} numberOfLines={2}>
                  "{getTitle(stats.mostUrgent)}" · {stats.mostUrgentEnd?.format('DD MMM')}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.tipRow, { borderTopColor: colors.borderSubtle }]}
                onPress={handlePoke}
                activeOpacity={0.7}
              >
                <Ionicons name="flash" size={12} color={colors.primary} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {STARK_TIPS[tipIdx]}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      <Animated.View
        style={[
          styles.mascotContainer,
          {
            bottom: baseBottom,
            right: baseRight,
            transform: [
              ...mascotPan.getTranslateTransform(),
              { translateY: floatAnim },
              { scale: pokeScale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {alertCount > 0 && !isOpen && (
          <View style={[styles.alertBadge, { backgroundColor: stats.overdue > 0 ? '#EF4444' : '#6366F1' }]}>
            <Text style={styles.alertBadgeText}>{alertCount}</Text>
          </View>
        )}

        {!isOpen && alertCount === 0 && (
          <Animated.View
            style={[styles.zzzContainer, { transform: [{ translateY: zzzFloatAnim }], opacity: zzzOpacityAnim }]}
          >
            <View style={styles.zzzBubble}>
              <Text style={styles.zzzText}>z z z</Text>
            </View>
          </Animated.View>
        )}

        <PixelMascot pose={pose} pixelSize={1.9} />

        {!isOpen && (
          <View style={[styles.mascotLabel, { backgroundColor: isDark ? colors.bgSecondary : '#FFFFFF', borderColor: colors.borderSubtle }]}>
            <Text style={[styles.mascotLabelText, { color: colors.textMuted }]}>
              {alertCount > 0 ? `${stats.pct}%` : mascotDisplayName}
            </Text>
          </View>
        )}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  mascotContainer: {
    position: 'absolute',
    width: MASCOT_WIDTH,
    alignItems: 'center',
    zIndex: 250,
    elevation: 20,
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  zzzContainer: {
    position: 'absolute',
    top: -16,
    right: 2,
    zIndex: 5,
  },
  zzzBubble: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  zzzText: {
    color: '#F59E0B',
    fontSize: 8.5,
    fontWeight: '800',
  },
  mascotLabel: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  mascotLabelText: {
    fontSize: 9,
    fontWeight: '800',
  },
  backdrop: {
    zIndex: 150,
    elevation: 15,
    backgroundColor: 'transparent',
  },
  tooltipCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    zIndex: 250,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    transformOrigin: 'right bottom',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  nextText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tipText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 14,
    fontStyle: 'italic',
  },
});

export default GanttMascot;
