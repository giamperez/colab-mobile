/**
 * DraggableKanbanBoard
 *
 * REAL mobile drag-and-drop:
 *  1. Long-press (380ms) a card → card lifts + ghost card follows finger
 *  2. Drag freely across the board
 *  3. Drag near left/right edge → board auto-scrolls
 *  4. Drop card → optimistic update immediately moves card to destination column
 *
 * 100% compatible with Expo Go (Pure React Native Animated + PanResponder).
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIORITY_LABELS, PRIORITY_COLORS, TaskStatus, PriorityLevel } from '../types';
import type { Task } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IronManPose } from './PixelIronMan';
import { PixelMascot } from './PixelMascot';
import { triggerTaskCompleted } from '../utils/taskCompletionEvents';
import dayjs from 'dayjs';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.78;
const COLUMN_MARGIN = 12;
const COLUMN_STEP = COLUMN_WIDTH + COLUMN_MARGIN;
const BOARD_PADDING = 12;
const GHOST_WIDTH = COLUMN_WIDTH - 16;
const EDGE_ZONE = 80;       // px from edge to trigger auto-scroll
const SCROLL_SPEED = 16;    // px per tick during auto-scroll
const LONG_PRESS_DELAY = 360;

// ─── Column definitions ───────────────────────────────────────────────────────
export interface KanbanColumn {
  id: TaskStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'pendiente',   label: 'Pendiente',   icon: 'time-outline',             color: '#94A3B8' },
  { id: 'en_progreso', label: 'En progreso', icon: 'play-circle-outline',      color: '#3B82F6' },
  { id: 'en_revision', label: 'En revisión', icon: 'eye-outline',              color: '#A855F7' },
  { id: 'bloqueada',   label: 'Bloqueada',   icon: 'alert-circle-outline',     color: '#EF4444' },
  { id: 'completada',  label: 'Completada',  icon: 'checkmark-circle-outline', color: '#10B981' },
];

// ─── Ghost card (rendered in overlay, follows finger) ─────────────────────────
const GhostCard = ({
  task,
  colors,
  activeColor,
}: {
  task: Task;
  colors: any;
  activeColor?: string;
}) => {
  const pColor = PRIORITY_COLORS[task.priority as PriorityLevel] || colors.primary;
  const borderColor = activeColor || colors.primary;
  return (
    <View style={[ghost.card, { backgroundColor: colors.bgSurface, borderColor }]}>
      <View style={[ghost.handleRow, { borderBottomColor: colors.border }]}>
        <View style={[ghost.handle, { backgroundColor: borderColor }]} />
        <Text style={[ghost.status, { color: KANBAN_COLUMNS.find((c) => c.id === task.status)?.color }]}>
          {KANBAN_COLUMNS.find((c) => c.id === task.status)?.label}
        </Text>
        <Ionicons name="move-outline" size={13} color={borderColor} />
      </View>
      <Text style={[ghost.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {task.title || task.titulo}
      </Text>
      <View style={ghost.footer}>
        <View style={[ghost.pill, { backgroundColor: pColor + '22' }]}>
          <View style={[ghost.dot, { backgroundColor: pColor }]} />
          <Text style={[ghost.pillText, { color: pColor }]}>
            {PRIORITY_LABELS[task.priority as PriorityLevel] || 'Media'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const ghost = StyleSheet.create({
  card: {
    width: GHOST_WIDTH,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    shadowOpacity: 0.45,
    elevation: 24,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  handle: { width: 28, height: 4, borderRadius: 2 },
  status: { fontSize: 10, fontWeight: '700', flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  footer: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '800' },
  contactSparksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 64,
    marginTop: -4,
    zIndex: 10,
  },
  sparkDot: {
    width: 12,
    height: 6,
    borderRadius: 3,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.9,
    elevation: 6,
  },
  mascotPushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 2,
  },
  ironmanContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  flameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 30,
    marginTop: -3,
  },
  jetPlume: {
    width: 8,
    height: 16,
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    shadowOpacity: 0.8,
  },
  jetCore: {
    width: 4,
    height: 10,
    backgroundColor: '#00F0FF',
    borderRadius: 2,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.35,
    elevation: 8,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

// ─── Individual card ──────────────────────────────────────────────────────────
interface DragCallbacks {
  startDrag: (task: Task, pageX: number, pageY: number) => void;
  updateDrag: (pageX: number, pageY: number) => void;
  endDrag: (pageX: number, pageY: number) => void;
  cancelDrag: () => void;
}

interface CardProps {
  task: Task;
  todayStr: string;
  isDimmed: boolean;
  onPress: (task: Task) => void;
  onMoveModalPress: (task: Task) => void;
  onQuickMove: (taskId: number, newStatus: TaskStatus) => void;
  dragCallbacksRef: React.MutableRefObject<DragCallbacks>;
}

const KanbanCard = ({
  task,
  todayStr,
  isDimmed,
  onPress,
  onMoveModalPress,
  onQuickMove,
  dragCallbacksRef,
}: CardProps) => {
  const { colors } = useTheme();

  const longPressActiveRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pColor = PRIORITY_COLORS[task.priority as PriorityLevel] || colors.primary;
  const dueDate = task.due_date
    ? String(task.due_date).split('T')[0]
    : task.fechaVencimiento
    ? String(task.fechaVencimiento).split('T')[0]
    : null;
  const isOverdue = dueDate ? dueDate < todayStr && task.status !== 'completada' : false;
  const isDueToday = dueDate === todayStr && task.status !== 'completada';

  const assignees =
    task.assignees && task.assignees.length > 0
      ? task.assignees.map((a: any) => a.user).filter(Boolean)
      : task.assignee
      ? [task.assignee]
      : [];

  const quickTargets = KANBAN_COLUMNS.filter((c) => c.id !== task.status).slice(0, 2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: () => longPressActiveRef.current,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gs) => {
        dragCallbacksRef.current.updateDrag(gs.moveX, gs.moveY);
      },
      onPanResponderRelease: (_, gs) => {
        longPressActiveRef.current = false;
        dragCallbacksRef.current.endDrag(gs.moveX, gs.moveY);
      },
      onPanResponderTerminate: () => {
        longPressActiveRef.current = false;
        // Terminated by OS/touch cancel -> still try to drop where finger was
        dragCallbacksRef.current.endDrag(0, 0);
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        cStyles.wrapper,
        { opacity: isDimmed ? 0.32 : 1, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(task)}
        onLongPress={(evt) => {
          longPressActiveRef.current = true;
          Animated.spring(scaleAnim, { toValue: 1.05, friction: 5, useNativeDriver: true }).start();
          dragCallbacksRef.current.startDrag(task, evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        }}
        delayLongPress={LONG_PRESS_DELAY}
        style={[
          cStyles.card,
          {
            backgroundColor: colors.bgSurface,
            borderColor: isDimmed ? colors.primary : colors.borderSubtle,
            borderWidth: isDimmed ? 2 : 1,
          },
        ]}
      >
        {/* Top row */}
        <View style={[cStyles.topRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={cStyles.topLeft}>
            <Ionicons name="reorder-two-outline" size={15} color={colors.textMuted} />
            <Text style={[cStyles.statusLabel, { color: KANBAN_COLUMNS.find((c) => c.id === task.status)?.color }]}>
              {KANBAN_COLUMNS.find((c) => c.id === task.status)?.label}
            </Text>
          </View>
          <View style={cStyles.quickRow}>
            {quickTargets.map((col) => (
              <TouchableOpacity
                key={col.id}
                style={[cStyles.quickPill, { backgroundColor: col.color + '18', borderColor: col.color + '40' }]}
                onPress={() => onQuickMove(task.id, col.id)}
              >
                <Text style={[cStyles.quickPillText, { color: col.color }]}>
                  → {col.label.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title */}
        <Text style={[cStyles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {task.title || task.titulo}
        </Text>

        {/* Footer */}
        <View style={cStyles.footer}>
          <View style={[cStyles.priorityPill, { backgroundColor: pColor + '22' }]}>
            <View style={[cStyles.dot, { backgroundColor: pColor }]} />
            <Text style={[cStyles.priorityText, { color: pColor }]}>
              {PRIORITY_LABELS[task.priority as PriorityLevel] || 'Media'}
            </Text>
          </View>

          {dueDate && (
            <View style={[cStyles.dateBadge, isOverdue ? { backgroundColor: '#FEE2E2' } : isDueToday ? { backgroundColor: '#FEF3C7' } : { backgroundColor: colors.bgSecondary }]}>
              <Ionicons name="calendar-outline" size={11} color={isOverdue ? '#EF4444' : isDueToday ? '#D97706' : colors.textMuted} />
              <Text style={[cStyles.dateText, { color: isOverdue ? '#EF4444' : isDueToday ? '#D97706' : colors.textMuted }]}>
                {isDueToday ? 'Hoy' : dayjs(dueDate).format('DD MMM')}
              </Text>
            </View>
          )}

          {assignees.length > 0 && (
            <View style={[cStyles.avatar, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[cStyles.avatarText, { color: colors.primary }]}>
                {(assignees[0]?.emoji || (assignees[0]?.nombre || assignees[0]?.name || 'U')[0]).toUpperCase()}
              </Text>
            </View>
          )}

          <TouchableOpacity style={[cStyles.moreBtn, { backgroundColor: colors.bgSecondary }]} onPress={() => onMoveModalPress(task)}>
            <Ionicons name="ellipsis-horizontal" size={13} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const cStyles = StyleSheet.create({
  wrapper: { marginBottom: 6 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    shadowOpacity: 0.05,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusLabel: { fontSize: 9.5, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 3 },
  quickPill: { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5, borderWidth: 1 },
  quickPillText: { fontSize: 8.5, fontWeight: '800' },
  title: { fontSize: 13, fontWeight: '700', lineHeight: 17, paddingHorizontal: 8, paddingTop: 5, paddingBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 6, gap: 4, flexWrap: 'wrap' },
  priorityPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  priorityText: { fontSize: 9, fontWeight: '800' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 2.5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  dateText: { fontSize: 9, fontWeight: '600' },
  avatar: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 9.5, fontWeight: '800' },
  moreBtn: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
});

// ─── Column Iron Man Header ───────────────────────────────────────────────────
interface ColumnIronManHeaderProps {
  column: KanbanColumn;
  taskCount: number;
  isHot: boolean;
  colors: any;
  onAddPress: () => void;
}

const ColumnIronManHeader: React.FC<ColumnIronManHeaderProps> = ({
  column,
  taskCount,
  isHot,
  colors,
  onAddPress,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger float animation duration per column to prevent robotic unison movement
    const dur = 1100 + (column.id.length * 80);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3.5,
          duration: dur,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 2.5,
          duration: dur,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [column.id, floatAnim]);

  const hasTasks = taskCount > 0;
  const pose: IronManPose = !hasTasks
    ? 'sleeping'
    : column.id === 'bloqueada'
    ? 'alert'
    : column.id === 'completada'
    ? 'celebrating'
    : column.id === 'en_progreso'
    ? 'flying'
    : 'pointing';

  const statusSubtext = !hasTasks
    ? 'Columna libre'
    : column.id === 'pendiente'
    ? `${taskCount} por iniciar`
    : column.id === 'en_progreso'
    ? `${taskCount} en desarrollo`
    : column.id === 'en_revision'
    ? `${taskCount} en revisión`
    : column.id === 'bloqueada'
    ? `⚠️ ${taskCount} con bloqueo`
    : `✨ ${taskCount} lista${taskCount > 1 ? 's' : ''}`;

  return (
    <View
      style={[
        hStyles.headerContainer,
        {
          borderBottomColor: isHot ? column.color : colors.borderSubtle,
          backgroundColor: isHot ? column.color + '20' : 'transparent',
        },
      ]}
    >
      {/* Half-body animated mascot on left */}
      <Animated.View
        style={[
          hStyles.mascotBox,
          {
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        <PixelMascot pose={pose} pixelSize={1.6} halfBody={true} />
        {hasTasks && (
          <View
            style={[
              hStyles.mascotAura,
              { backgroundColor: column.color + '22', borderColor: column.color + '55' },
            ]}
          />
        )}
      </Animated.View>

      {/* Column Info in center */}
      <View style={hStyles.centerInfo}>
        <View style={hStyles.titleRow}>
          <View style={[hStyles.colDot, { backgroundColor: column.color }]} />
          <Text style={[hStyles.colTitle, { color: colors.textPrimary }]}>{column.label}</Text>
          <View style={[hStyles.colBadge, { backgroundColor: column.color + '22' }]}>
            <Text style={[hStyles.colBadgeText, { color: column.color }]}>{taskCount}</Text>
          </View>
        </View>
        <Text style={[hStyles.subStatus, { color: hasTasks ? column.color : colors.textMuted }]} numberOfLines={1}>
          {statusSubtext}
        </Text>
      </View>

      {/* Add button */}
      <TouchableOpacity
        onPress={onAddPress}
        style={[hStyles.addBtn, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={17} color={column.color} />
      </TouchableOpacity>
    </View>
  );
};

const hStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 8,
  },
  mascotBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mascotAura: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: -1,
  },
  centerInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  colBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  colBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  subStatus: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Board ────────────────────────────────────────────────────────────────────
interface DraggableKanbanBoardProps {
  tasks: Task[];
  todayStr: string;
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void;
  onCardPress: (task: Task) => void;
  onMovePress: (task: Task) => void;
  onAddToColumn: (status: TaskStatus) => void;
  hoveredColumn?: TaskStatus | null;
  setHoveredColumn?: (s: TaskStatus | null) => void;
  /** Fires whenever a card starts/stops being dragged (e.g. to animate a mascot grabbing it). */
  onDragStateChange?: (isDragging: boolean) => void;
}

export const DraggableKanbanBoard = ({
  tasks,
  todayStr,
  onStatusChange,
  onCardPress,
  onMovePress,
  onAddToColumn,
  onDragStateChange,
}: DraggableKanbanBoardProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Drag state
  const isDraggingRef = useRef(false);
  const draggingTaskRef = useRef<Task | null>(null);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<TaskStatus | null>(null);
  const hoveredColumnRef = useRef<TaskStatus | null>(null);

  // Board layout offset to accurately position ghost inside root view
  const rootLayoutYRef = useRef(0);

  // Ghost card animated values
  const ghostX = useRef(new Animated.Value(0)).current;
  const ghostY = useRef(new Animated.Value(0)).current;
  const ghostOpacity = useRef(new Animated.Value(0)).current;
  const ghostScale = useRef(new Animated.Value(0.92)).current;
  const ghostTilt = useRef(new Animated.Value(0)).current;
  const thrusterPulse = useRef(new Animated.Value(1)).current;
  const jitterAnim = useRef(new Animated.Value(0)).current;
  const prevFingerXRef = useRef(0);

  // Board scroll
  const boardScrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fingerXRef = useRef(0);

  // Jet thrusters flicker and vibration while dragging
  useEffect(() => {
    if (draggingTask) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(thrusterPulse, {
            toValue: 0.55,
            duration: 85,
            useNativeDriver: false,
          }),
          Animated.timing(thrusterPulse, {
            toValue: 1,
            duration: 85,
            useNativeDriver: false,
          }),
        ])
      );

      const jitterLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(jitterAnim, {
            toValue: 1,
            duration: 55,
            useNativeDriver: false,
          }),
          Animated.timing(jitterAnim, {
            toValue: -1,
            duration: 55,
            useNativeDriver: false,
          }),
          Animated.timing(jitterAnim, {
            toValue: 0,
            duration: 55,
            useNativeDriver: false,
          }),
        ])
      );

      pulseLoop.start();
      jitterLoop.start();

      return () => {
        pulseLoop.stop();
        jitterLoop.stop();
      };
    }
  }, [draggingTask, thrusterPulse, jitterAnim]);

  // ─── Column detection ────────────────────────────────────────────────────
  const getColumn = useCallback((screenX: number): TaskStatus | null => {
    if (screenX <= 0) return null;
    const boardX = screenX + scrollOffsetRef.current - BOARD_PADDING;
    if (boardX < 0) return KANBAN_COLUMNS[0].id;
    const idx = Math.max(0, Math.min(Math.floor(boardX / COLUMN_STEP), KANBAN_COLUMNS.length - 1));
    return KANBAN_COLUMNS[idx]?.id || null;
  }, []);

  // ─── Auto-scroll ─────────────────────────────────────────────────────────
  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current !== null) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback((dir: 'left' | 'right') => {
    if (autoScrollRef.current !== null) return;
    autoScrollRef.current = setInterval(() => {
      const next = dir === 'right'
        ? scrollOffsetRef.current + SCROLL_SPEED
        : Math.max(0, scrollOffsetRef.current - SCROLL_SPEED);
      scrollOffsetRef.current = next;
      boardScrollRef.current?.scrollTo({ x: next, animated: false });

      const col = getColumn(fingerXRef.current);
      if (col && col !== hoveredColumnRef.current) {
        hoveredColumnRef.current = col;
        setHoveredColumn(col);
      }
    }, 16);
  }, [getColumn]);

  // ─── Drag callbacks ────────────────────────────────────────────────────────
  const startDrag = useCallback((task: Task, pageX: number, pageY: number) => {
    isDraggingRef.current = true;
    draggingTaskRef.current = task;
    fingerXRef.current = pageX;
    prevFingerXRef.current = pageX;
    ghostTilt.setValue(0);
    setDraggingTask(task);

    const relativeY = Math.max(10, pageY - rootLayoutYRef.current - 70);
    ghostX.setValue(pageX - GHOST_WIDTH / 2);
    ghostY.setValue(relativeY);

    const col = getColumn(pageX);
    hoveredColumnRef.current = col;
    setHoveredColumn(col);

    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 1.05, friction: 6, useNativeDriver: false }),
      Animated.timing(ghostOpacity, { toValue: 0.98, duration: 130, useNativeDriver: false }),
    ]).start();
  }, [getColumn, ghostOpacity, ghostScale, ghostTilt, ghostX, ghostY]);

  const updateDrag = useCallback((pageX: number, pageY: number) => {
    if (!isDraggingRef.current) return;
    fingerXRef.current = pageX;

    const deltaX = pageX - prevFingerXRef.current;
    prevFingerXRef.current = pageX;

    if (deltaX > 1.5) {
      Animated.timing(ghostTilt, {
        toValue: Math.min(1, deltaX / 8),
        duration: 100,
        useNativeDriver: false,
      }).start();
    } else if (deltaX < -1.5) {
      Animated.timing(ghostTilt, {
        toValue: Math.max(-1, deltaX / 8),
        duration: 100,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(ghostTilt, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }

    const relativeY = Math.max(10, pageY - rootLayoutYRef.current - 70);
    ghostX.setValue(pageX - GHOST_WIDTH / 2);
    ghostY.setValue(relativeY);

    // Column detection
    const col = getColumn(pageX);
    if (col && col !== hoveredColumnRef.current) {
      hoveredColumnRef.current = col;
      setHoveredColumn(col);
    }

    // Edge auto-scroll
    if (pageX > SCREEN_WIDTH - EDGE_ZONE) {
      startAutoScroll('right');
    } else if (pageX < EDGE_ZONE) {
      startAutoScroll('left');
    } else {
      stopAutoScroll();
    }
  }, [getColumn, ghostTilt, ghostX, ghostY, startAutoScroll, stopAutoScroll]);

  const finishDrag = useCallback((pageX: number) => {
    stopAutoScroll();
    const task = draggingTaskRef.current;
    const col = hoveredColumnRef.current || (pageX > 0 ? getColumn(pageX) : null);

    if (task && col && col !== task.status) {
      if (col === 'completada') {
        triggerTaskCompleted({ id: task.id, title: task.title || task.titulo });
      }
      onStatusChange(task.id, col);
    }

    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 0.88, friction: 8, useNativeDriver: false }),
      Animated.timing(ghostOpacity, { toValue: 0, duration: 150, useNativeDriver: false }),
      Animated.timing(ghostTilt, { toValue: 0, duration: 100, useNativeDriver: false }),
    ]).start(() => {
      isDraggingRef.current = false;
      draggingTaskRef.current = null;
      hoveredColumnRef.current = null;
      setDraggingTask(null);
      setHoveredColumn(null);
    });
  }, [getColumn, ghostOpacity, ghostScale, ghostTilt, onStatusChange, stopAutoScroll]);

  const cancelDrag = useCallback(() => {
    stopAutoScroll();
    Animated.parallel([
      Animated.timing(ghostOpacity, { toValue: 0, duration: 120, useNativeDriver: false }),
      Animated.timing(ghostTilt, { toValue: 0, duration: 100, useNativeDriver: false }),
    ]).start(() => {
      isDraggingRef.current = false;
      draggingTaskRef.current = null;
      hoveredColumnRef.current = null;
      setDraggingTask(null);
      setHoveredColumn(null);
    });
  }, [ghostOpacity, ghostTilt, stopAutoScroll]);

  // Stable ref passed to cards
  const dragCallbacksRef = useRef<DragCallbacks>({
    startDrag,
    updateDrag,
    endDrag: (x) => finishDrag(x),
    cancelDrag,
  });

  useEffect(() => {
    dragCallbacksRef.current = {
      startDrag,
      updateDrag,
      endDrag: (x) => finishDrag(x),
      cancelDrag,
    };
  }, [startDrag, updateDrag, finishDrag, cancelDrag]);

  useEffect(() => {
    onDragStateChange?.(!!draggingTask);
  }, [draggingTask, onDragStateChange]);

  const handleQuickMove = useCallback(
    (taskId: number, status: TaskStatus) => onStatusChange(taskId, status),
    [onStatusChange]
  );

  const activeTargetCol = KANBAN_COLUMNS.find((c) => c.id === hoveredColumn) || null;

  const tiltInterpolate = ghostTilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-9deg', '0deg', '9deg'],
  });

  const jitterInterpolate = jitterAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-1.2, 0, 1.2],
  });

  return (
    <View
      style={bStyles.root}
      onLayout={(e) => {
        // Measure root position relative to window
        e.target.measure?.((_x, _y, _width, _height, _pageX, pageY) => {
          if (pageY !== undefined) {
            rootLayoutYRef.current = pageY;
          }
        });
      }}
    >
      {/* ── Ghost card Overlay with Pixel Mascot Pushing ── */}
      {draggingTask && (
        <View pointerEvents="none" style={bStyles.overlayContainer}>
          <Animated.View
            style={{
              position: 'absolute',
              left: ghostX,
              top: ghostY,
              transform: [
                { scale: ghostScale },
                { rotate: tiltInterpolate },
                { translateY: jitterInterpolate },
              ],
              opacity: ghostOpacity,
              zIndex: 99999,
              alignItems: 'center',
            }}
          >
            {/* Dragged Ghost Task Card */}
            <GhostCard
              task={draggingTask}
              colors={colors}
              activeColor={activeTargetCol?.color}
            />

            {/* Repulsor contact points glowing against bottom of card */}
            <View style={ghost.contactSparksRow}>
              <Animated.View
                style={[
                  ghost.sparkDot,
                  {
                    backgroundColor: activeTargetCol?.color || '#00F0FF',
                    opacity: thrusterPulse,
                    transform: [{ scale: thrusterPulse }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  ghost.sparkDot,
                  {
                    backgroundColor: activeTargetCol?.color || '#00F0FF',
                    opacity: thrusterPulse,
                    transform: [{ scale: thrusterPulse }],
                  },
                ]}
              />
            </View>

            {/* Mascot Pushing Unit */}
            <View style={ghost.mascotPushRow}>
              <View style={ghost.ironmanContainer}>
                <PixelMascot pose="pushing" pixelSize={2.4} />

                {/* Jet Thruster Flame Exhaust */}
                <Animated.View
                  style={[
                    ghost.flameRow,
                    {
                      opacity: thrusterPulse,
                      transform: [
                        {
                          scaleY: thrusterPulse.interpolate({
                            inputRange: [0.55, 1],
                            outputRange: [0.75, 1.3],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={ghost.jetPlume}>
                    <View style={ghost.jetCore} />
                  </View>
                  <View style={ghost.jetPlume}>
                    <View style={ghost.jetCore} />
                  </View>
                </Animated.View>
              </View>

              {/* Dynamic Stark Tech Action Badge */}
              <View
                style={[
                  ghost.actionBadge,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: activeTargetCol?.color || colors.primary,
                    shadowColor: activeTargetCol?.color || colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name={activeTargetCol ? activeTargetCol.icon : 'rocket'}
                  size={13}
                  color={activeTargetCol?.color || colors.primary}
                />
                <Text
                  style={[
                    ghost.actionBadgeText,
                    { color: activeTargetCol?.color || colors.textPrimary },
                  ]}
                >
                  {activeTargetCol
                    ? `¡Empujando → ${activeTargetCol.label}!`
                    : '¡Propulsando tarea!'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Column target strip at bottom of board */}
          <View style={[bStyles.dropStrip, { backgroundColor: colors.bgSecondary + 'F2' }]}>
            {KANBAN_COLUMNS.map((col) => {
              const isHot = hoveredColumn === col.id;
              const isCurrent = draggingTask?.status === col.id;
              return (
                <View
                  key={col.id}
                  style={[
                    bStyles.dropChip,
                    {
                      backgroundColor: isHot ? col.color : isCurrent ? colors.bgSurface : col.color + '18',
                      borderColor: col.color,
                      borderWidth: isHot ? 2 : 1,
                      flex: isHot ? 1.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name={col.icon} size={14} color={isHot ? '#FFF' : col.color} />
                  <Text style={[bStyles.dropChipText, { color: isHot ? '#FFF' : col.color, fontWeight: isHot ? '800' : '600' }]}>
                    {col.label.split(' ')[0]}
                  </Text>
                  {isCurrent && !isHot && (
                    <Text style={[bStyles.currentMark, { color: col.color }]}>✓</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Top hint banner when dragging ── */}
      {draggingTask && (
        <View style={[bStyles.banner, { backgroundColor: colors.primaryMuted, borderBottomColor: colors.primary }]}>
          <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
          <Text style={[bStyles.bannerText, { color: colors.primary }]} numberOfLines={1}>
            Arrastrando: "{draggingTask.title || draggingTask.titulo}"
          </Text>
          {hoveredColumn && (
            <View style={[bStyles.targetBadge, { backgroundColor: KANBAN_COLUMNS.find((c) => c.id === hoveredColumn)?.color }]}>
              <Text style={bStyles.targetBadgeText}>
                → {KANBAN_COLUMNS.find((c) => c.id === hoveredColumn)?.label}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Horizontal board ── */}
      <ScrollView
        ref={boardScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          bStyles.boardContent,
          { paddingBottom: Math.max(insets.bottom, 8) + 140 },
        ]}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        scrollEnabled={!isDraggingRef.current}
      >
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isHot = hoveredColumn === col.id && !!draggingTask;

          return (
            <View
              key={col.id}
              style={[
                bStyles.column,
                {
                  backgroundColor: isHot ? col.color + '15' : colors.bgSecondary,
                  borderColor: isHot ? col.color : colors.border,
                  borderWidth: isHot ? 2.5 : 1,
                },
              ]}
            >
              {/* Column Iron Man Header with Mascot & Live Status */}
              <ColumnIronManHeader
                column={col}
                taskCount={colTasks.length}
                isHot={isHot}
                colors={colors}
                onAddPress={() => onAddToColumn(col.id)}
              />

              {/* Drop zone indicator */}
              {isHot && (
                <View style={[bStyles.dropZone, { borderColor: col.color, backgroundColor: col.color + '15' }]}>
                  <Ionicons name="arrow-down-circle" size={20} color={col.color} />
                  <Text style={[bStyles.dropZoneText, { color: col.color }]}>Suelta aquí → {col.label}</Text>
                </View>
              )}

              {/* Cards */}
              <ScrollView
                style={bStyles.cards}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                scrollEnabled={!isDraggingRef.current}
              >
                {colTasks.map((t) => (
                  <KanbanCard
                    key={t.id}
                    task={t}
                    todayStr={todayStr}
                    isDimmed={draggingTask?.id === t.id}
                    onPress={onCardPress}
                    onMoveModalPress={onMovePress}
                    onQuickMove={handleQuickMove}
                    dragCallbacksRef={dragCallbacksRef}
                  />
                ))}
                {colTasks.length === 0 && !isHot && (
                  <View style={bStyles.emptyCol}>
                    <Ionicons name={col.icon} size={26} color={col.color + '55'} />
                    <Text style={[bStyles.emptyText, { color: colors.textMuted }]}>Sin tareas</Text>
                  </View>
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          );
        })}
        <View style={{ width: 16 }} />
      </ScrollView>
    </View>
  );
};

const bStyles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99,
  },
  dropStrip: {
    position: 'absolute',
    bottom: 90,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 5,
    padding: 8,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    shadowOpacity: 0.22,
    elevation: 14,
    zIndex: 100000,
  },
  dropChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 3,
  },
  dropChipText: { fontSize: 9, textAlign: 'center' },
  currentMark: { fontSize: 9, fontWeight: '800' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
  },
  bannerText: { fontSize: 13, fontWeight: '700', flex: 1 },
  targetBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  targetBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  boardContent: {
    padding: BOARD_PADDING,
    paddingBottom: 120,
    gap: COLUMN_MARGIN,
    alignItems: 'flex-start',
  },
  column: {
    width: COLUMN_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '96%',
    minHeight: 220,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  colHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colDot: { width: 10, height: 10, borderRadius: 5 },
  colTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  colBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  colBadgeText: { fontSize: 11, fontWeight: '800' },
  addBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dropZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  dropZoneText: { fontSize: 13, fontWeight: '800' },
  cards: { padding: 10 },
  emptyCol: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, gap: 8 },
  emptyText: { fontSize: 12, fontStyle: 'italic' },
});

export default DraggableKanbanBoard;
