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
import { useTheme } from '../context/ThemeContext';
import { useMascot } from '../context/MascotContext';
import { PixelMascot } from './PixelMascot';
import type { Task } from '../types';

export interface CalendarMascotProps {
  /** Tasks currently loaded for the visible month (CalendarScreen already fetches these). */
  tasks: Task[];
  userId?: number;
}

const STARK_TIPS = [
  'Revisa tu agenda cada mañana, estilo JARVIS.',
  'Una tarea sin fecha es una tarea que se olvida.',
  'Bloquea tiempo para lo importante, no solo lo urgente.',
  'Los viernes son ideales para planear la próxima semana.',
];

const MASCOT_WIDTH = 62;
const CARD_WIDTH = 220;

const getDueDate = (t: Task): string | undefined => t.due_date || t.fechaVencimiento || t.execution_date;

export const CalendarMascot: React.FC<CalendarMascotProps> = ({ tasks, userId }) => {
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

  // ─── Personal Agenda Stats (mirrors IronManGuide's logic for consistency) ──
  const stats = useMemo(() => {
    const isMine = (t: Task) => {
      if (!userId) return true;
      return (
        t.assignee_id === userId ||
        t.assignee?.id === userId ||
        (t.assignees?.some((a: any) => a.user?.id === userId || a.userId === userId) ?? false)
      );
    };
    const mine = tasks.filter((t) => isMine(t) && t.status !== 'eliminada');
    const completed = mine.filter((t) => t.status === 'completada').length;
    const pending = mine.filter((t) => t.status === 'pendiente' || t.status === 'en_progreso').length;
    const blocked = mine.filter((t) => t.status === 'bloqueada').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const weekEndStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const overdue = mine.filter((t) => {
      if (t.status === 'completada') return false;
      const d = getDueDate(t);
      const dateOnly = d ? String(d).split('T')[0] : null;
      return dateOnly ? dateOnly < todayStr : false;
    }).length;

    const dueToday = mine.filter((t) => {
      if (t.status === 'completada') return false;
      const d = getDueDate(t);
      const dateOnly = d ? String(d).split('T')[0] : null;
      return dateOnly === todayStr;
    }).length;

    const dueThisWeek = mine
      .filter((t) => {
        if (t.status === 'completada') return false;
        const d = getDueDate(t);
        const dateOnly = d ? String(d).split('T')[0] : null;
        return dateOnly ? dateOnly > todayStr && dateOnly <= weekEndStr : false;
      })
      .sort((a, b) => (getDueDate(a) || '').localeCompare(getDueDate(b) || ''));

    const pct = mine.length > 0 ? Math.round((completed / mine.length) * 100) : 0;
    return { total: mine.length, completed, pending, blocked, overdue, dueToday, dueThisWeek, pct };
  }, [tasks, userId]);

  const notification = useMemo(() => {
    if (stats.overdue > 0) return { icon: 'alert-circle' as const, color: '#EF4444', label: `${stats.overdue} vencidas`, urgent: true };
    if (stats.blocked > 0) return { icon: 'warning' as const, color: '#F59E0B', label: `${stats.blocked} bloqueadas`, urgent: true };
    if (stats.dueToday > 0) return { icon: 'calendar' as const, color: '#6366F1', label: `${stats.dueToday} para hoy`, urgent: false };
    if (stats.pending > 0) return { icon: 'sparkles' as const, color: colors.primary, label: `${stats.pending} en curso`, urgent: false };
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

  const alertCount = stats.overdue > 0 ? stats.overdue : stats.dueToday > 0 ? stats.dueToday : 0;
  const pose = isOpen ? 'flying' : alertCount > 0 ? 'alert' : 'sleeping';
  const nextThisWeek = stats.dueThisWeek[0];

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
                    ? 'Sin tareas este mes'
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
                {stats.completed} de {stats.total} tareas listas este mes · {stats.pct}%
              </Text>

              <View style={styles.chipsRow}>
                {stats.overdue > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(239,68,68,0.14)' }]}>
                    <Ionicons name="alert-circle" size={11} color="#EF4444" />
                    <Text style={[styles.chipText, { color: '#EF4444', fontWeight: '800' }]}>{stats.overdue} vencidas</Text>
                  </View>
                )}
                {stats.dueToday > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(99,102,241,0.14)' }]}>
                    <Ionicons name="calendar" size={11} color="#6366F1" />
                    <Text style={[styles.chipText, { color: '#6366F1' }]}>{stats.dueToday} hoy</Text>
                  </View>
                )}
                {stats.blocked > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
                    <Ionicons name="warning" size={11} color="#F59E0B" />
                    <Text style={[styles.chipText, { color: '#F59E0B', fontWeight: '800' }]}>{stats.blocked} bloqueadas</Text>
                  </View>
                )}
                {stats.pending > 0 && (
                  <View style={[styles.chip, { backgroundColor: colors.bgSurface }]}>
                    <Ionicons name="time-outline" size={11} color="#F59E0B" />
                    <Text style={[styles.chipText, { color: colors.textSecondary }]}>{stats.pending} pendientes</Text>
                  </View>
                )}
              </View>

              {nextThisWeek && (
                <Text style={[styles.nextText, { color: colors.textPrimary }]} numberOfLines={2}>
                  Próxima: "{nextThisWeek.title}" · {getDueDate(nextThisWeek)?.split('T')[0]}
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

export default CalendarMascot;
