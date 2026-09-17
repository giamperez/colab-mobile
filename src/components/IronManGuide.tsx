import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useAuth } from '../context/AuthContext';
import { useMascot } from '../context/MascotContext';
import { PixelMascot } from './PixelMascot';
import type { Task } from '../types';

const RESTING_KEY_PREFIX = '@ironman_pixel_guide_resting2_';
const LAST_VISIT_KEY_PREFIX = '@mascot_last_visit_';

/** Returns the greeting word based on the current hour */
const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

/** Returns an emoji matching the time of day */
const getTimeEmoji = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '☀️';
  if (hour >= 12 && hour < 19) return '👋';
  return '🌙';
};

export interface IronManGuideProps {
  tasks?: Task[];
  viewMode?: 'list' | 'kanban';
  userId?: number | string;
  isAdminOrJefe?: boolean;
  isGrabbing?: boolean;
}

const STARK_TIPS = [
  '¿Sabías que el 80% del éxito es empezar?',
  'JARVIS dice: si toma menos de 2 min, hazla ahora.',
  'No hay proyecto grande, solo tareas sin dividir.',
  '¡Menos reuniones, más tareas completadas!',
  'Viernes con tareas listas = superhéroe el finde.',
];

const MASCOT_WIDTH = 62;
const CARD_WIDTH = 220;

export const IronManGuide: React.FC<IronManGuideProps> = ({
  tasks = [],
  viewMode = 'list',
  userId,
  isAdminOrJefe = false,
  isGrabbing = false,
}) => {
  const { user } = useAuth();
  const { mascotType } = useMascot();
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const firstName = user?.nombre?.split(' ')[0] || user?.name?.split(' ')[0] || (user as any)?.first_name || 'Carlos';
  const mascotDisplayName = mascotType === 'dog' ? 'Cobi' : mascotType === 'cat' ? 'Labi' : 'Tony';

  const [showWelcomeBubble, setShowWelcomeBubble] = useState(true);
  const [isFirstVisitToday, setIsFirstVisitToday] = useState(false);
  const welcomeBubbleScale = useRef(new Animated.Value(0)).current;
  const welcomeBubbleOpacity = useRef(new Animated.Value(0)).current;

  const timeGreeting = getTimeGreeting();
  const timeEmoji = getTimeEmoji();

  const restingKey = `${RESTING_KEY_PREFIX}${userId ?? 'anon'}`;
  const lastVisitKey = `${LAST_VISIT_KEY_PREFIX}${userId ?? 'anon'}`;

  /** Check if this is the first time the user opens the app today */
  useEffect(() => {
    const checkFirstVisit = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
        const lastVisit = await AsyncStorage.getItem(lastVisitKey);
        if (lastVisit !== today) {
          setIsFirstVisitToday(true);
          await AsyncStorage.setItem(lastVisitKey, today);
        }
      } catch {
        // silently ignore
      }
    };
    checkFirstVisit();
  }, [lastVisitKey]);

  const [isOpen, setIsOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  // Tooltip side-open animation (scale + opacity, no backdrop dim)
  const tooltipScale = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  // Mascot float animation
  const floatAnim = useRef(new Animated.Value(0)).current;
  const zzzFloatAnim = useRef(new Animated.Value(0)).current;
  const zzzOpacityAnim = useRef(new Animated.Value(0.5)).current;
  const pokeScale = useRef(new Animated.Value(1)).current;

  // Draggable mascot position (pinned bottom-right, draggable)
  const mascotPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragMoved = useRef(false);

  // Fixed anchor point for mascot bottom-right corner
  const baseRight = 14;
  const baseBottom = Math.max(insets.bottom, 8) + 68;

  // Compute card anchor: opens to the LEFT of the mascot
  // We need absolute left position for the card
  const mascotLeft = screenWidth - MASCOT_WIDTH - baseRight;
  const cardLeft = mascotLeft - CARD_WIDTH - 8;
  // Clamp so card never goes off-screen left
  const cardFinalLeft = Math.max(cardLeft, 8);

  // Card pops out from mascot's position (bottom of the mascot)
  const cardBottom = baseBottom;

  // ─── Personal Stats ───────────────────────────────────────────────────────
  const userStats = useMemo(() => {
    const isMine = (t: Task) => {
      if (!userId) return true;
      const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      return (
        t.assignee_id === uid ||
        t.assignee?.id === uid ||
        (t.assignees?.some((a: any) => a.user?.id === uid || a.userId === uid) ?? false)
      );
    };
    const mine = tasks.filter((t) => isMine(t) && t.status !== 'eliminada');
    const completed = mine.filter((t) => t.status === 'completada').length;
    const pending = mine.filter((t) => t.status === 'pendiente' || t.status === 'en_progreso').length;
    const blocked = mine.filter((t) => t.status === 'bloqueada').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = mine.filter((t) => {
      if (t.status === 'completada') return false;
      const d = t.due_date
        ? String(t.due_date).split('T')[0]
        : t.fechaVencimiento
        ? String(t.fechaVencimiento).split('T')[0]
        : null;
      return d ? d < todayStr : false;
    }).length;
    const dueToday = mine.filter((t) => {
      if (t.status === 'completada') return false;
      const d = t.due_date
        ? String(t.due_date).split('T')[0]
        : t.fechaVencimiento
        ? String(t.fechaVencimiento).split('T')[0]
        : null;
      return d === todayStr;
    }).length;
    const pct = mine.length > 0 ? Math.round((completed / mine.length) * 100) : 0;
    return { total: mine.length, completed, pending, blocked, overdue, dueToday, pct };
  }, [tasks, userId]);

  const notification = useMemo(() => {
    if (userStats.overdue > 0) return { icon: 'alert-circle' as const, color: '#EF4444', label: `${userStats.overdue} vencidas`, urgent: true };
    if (userStats.blocked > 0) return { icon: 'warning' as const, color: '#F59E0B', label: `${userStats.blocked} bloqueadas`, urgent: true };
    if (userStats.dueToday > 0) return { icon: 'calendar' as const, color: '#6366F1', label: `${userStats.dueToday} para hoy`, urgent: false };
    if (userStats.pending > 0) return { icon: 'sparkles' as const, color: colors.primary, label: `${userStats.pending} en curso`, urgent: false };
    return null;
  }, [userStats, colors.primary]);

  // ─── Animations setup ─────────────────────────────────────────────────────
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

    // Show welcome bubble greeting on startup
    const welcomeTimer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(welcomeBubbleScale, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }),
        Animated.timing(welcomeBubbleOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 400);

    // Auto-dismiss after 6.5 seconds
    const dismissTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(welcomeBubbleScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
        Animated.timing(welcomeBubbleOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setShowWelcomeBubble(false));
    }, 6500);

    return () => {
      floatLoop.stop();
      zzzLoop.stop();
      clearTimeout(welcomeTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  // ─── PanResponder for dragging ────────────────────────────────────────────
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

  // ─── Open/Close tooltip ───────────────────────────────────────────────────
  const handleToggle = () => {
    if (isOpen) {
      closeTooltip();
    } else {
      openTooltip();
    }
  };

  const openTooltip = () => {
    setIsOpen(true);
    // Bounce the mascot
    Animated.sequence([
      Animated.timing(pokeScale, { toValue: 1.25, duration: 80, useNativeDriver: true }),
      Animated.spring(pokeScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    // Slide-in the card from the right (scale from 0 to 1, origin mascot side)
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

  const alertCount = userStats.overdue > 0 ? userStats.overdue : userStats.dueToday > 0 ? userStats.dueToday : 0;
  const pose = isGrabbing ? 'pushing' : isOpen ? 'flying' : alertCount > 0 ? 'alert' : 'sleeping';

  return (
    <>
      {/* ─── Tooltip Card: rendered at absolute position to the left of mascot ─── */}
      {isOpen && (
        <>
          {/* Invisible tap-anywhere-to-close layer — zIndex 150 puts it above ScrollView items */}
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, styles.backdrop]}
            activeOpacity={1}
            onPress={closeTooltip}
          />

          {/* The side card */}
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
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={[styles.statusDot, { backgroundColor: notification?.color ?? '#10B981' }]} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {notification
                    ? notification.label
                    : userStats.total === 0
                    ? 'Sin tareas asignadas'
                    : `${userStats.pct}% completado`}
                </Text>
                <TouchableOpacity onPress={closeTooltip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.max(userStats.pct, 3)}%`,
                      backgroundColor: userStats.pct === 100 ? '#10B981' : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {userStats.completed} de {userStats.total} tareas listas · {userStats.pct}%
              </Text>

              {/* Stats chips */}
              <View style={styles.chipsRow}>
                {userStats.pending > 0 && (
                  <View style={[styles.chip, { backgroundColor: colors.bgSurface }]}>
                    <Ionicons name="time-outline" size={11} color="#F59E0B" />
                    <Text style={[styles.chipText, { color: colors.textSecondary }]}>{userStats.pending} pendientes</Text>
                  </View>
                )}
                {userStats.overdue > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(239,68,68,0.14)' }]}>
                    <Ionicons name="alert-circle" size={11} color="#EF4444" />
                    <Text style={[styles.chipText, { color: '#EF4444', fontWeight: '800' }]}>{userStats.overdue} vencidas</Text>
                  </View>
                )}
                {userStats.blocked > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
                    <Ionicons name="warning" size={11} color="#F59E0B" />
                    <Text style={[styles.chipText, { color: '#F59E0B', fontWeight: '800' }]}>{userStats.blocked} bloqueadas</Text>
                  </View>
                )}
                {userStats.dueToday > 0 && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(99,102,241,0.14)' }]}>
                    <Ionicons name="calendar" size={11} color="#6366F1" />
                    <Text style={[styles.chipText, { color: '#6366F1' }]}>{userStats.dueToday} hoy</Text>
                  </View>
                )}
              </View>

              {/* Stark tip */}
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

      {/* ─── Mascot fixed bottom-right corner ─── */}
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
        {/* Alert badge on top */}
        {alertCount > 0 && !isOpen && (
          <View style={[styles.alertBadge, { backgroundColor: userStats.overdue > 0 ? '#EF4444' : '#6366F1' }]}>
            <Text style={styles.alertBadgeText}>{alertCount}</Text>
          </View>
        )}

        {/* Sleeping Zzz bubble */}
        {!isOpen && alertCount === 0 && (
          <Animated.View
            style={[styles.zzzContainer, { transform: [{ translateY: zzzFloatAnim }], opacity: zzzOpacityAnim }]}
          >
            <View style={styles.zzzBubble}>
              <Text style={styles.zzzText}>z z z</Text>
            </View>
          </Animated.View>
        )}

        {/* Startup Welcome Speech Bubble from Mascot */}
        {showWelcomeBubble && !isOpen && (
          <Animated.View
            style={[
              styles.welcomeSpeechBubble,
              {
                backgroundColor: isDark ? colors.bgSecondary : '#FFFFFF',
                borderColor: colors.primary,
                opacity: welcomeBubbleOpacity,
                transform: [{ scale: welcomeBubbleScale }],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setShowWelcomeBubble(false);
                openTooltip();
              }}
            >
              <Text style={[styles.welcomeSpeechText, { color: colors.textPrimary }]}>
                {isFirstVisitToday
                  ? `${timeGreeting}, `
                  : '¡De vuelta, '}
                <Text style={{ color: colors.primary, fontWeight: '900' }}>{firstName}</Text>
                {isFirstVisitToday ? ` ${timeEmoji}` : '! 😊'}
              </Text>
              <Text style={[styles.welcomeSpeechSub, { color: colors.textSecondary }]}>
                {isFirstVisitToday
                  ? `${mascotDisplayName} te da la bienvenida ✨`
                  : `${mascotDisplayName} está contigo 💪`}
              </Text>
            </TouchableOpacity>
            <View
              style={[
                styles.speechTail,
                {
                  borderTopColor: isDark ? colors.bgSecondary : '#FFFFFF',
                },
              ]}
            />
          </Animated.View>
        )}

        {/* Mascot sprite */}
        <PixelMascot pose={pose} pixelSize={1.9} />

        {/* Label under mascot — only shown when closed */}
        {!isOpen && (
          <View style={[styles.mascotLabel, { backgroundColor: isDark ? colors.bgSecondary : '#FFFFFF', borderColor: colors.borderSubtle }]}>
            <Text style={[styles.mascotLabelText, { color: colors.textMuted }]}>
              {alertCount > 0 ? `${userStats.pct}%` : mascotDisplayName}
            </Text>
          </View>
        )}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  // ─── Mascot ───────────────────────────────────────────────────────────────
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

  // ─── Tooltip Card ─────────────────────────────────────────────────────────
  backdrop: {
    zIndex: 150,
    elevation: 15,
    // fully transparent — no visual change, just captures touches
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
  welcomeSpeechBubble: {
    position: 'absolute',
    bottom: 58,
    right: -10,
    width: 175,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 300,
  },
  welcomeSpeechText: {
    fontSize: 12,
    fontWeight: '800',
  },
  welcomeSpeechSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  speechTail: {
    position: 'absolute',
    bottom: -7,
    right: 28,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export default IronManGuide;
