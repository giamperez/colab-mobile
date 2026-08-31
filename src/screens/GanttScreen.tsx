import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ganttApi } from '../api/gantt.api';
import { groupsApi } from '../api/groups.api';
import { usersApi } from '../api/users.api';
import { categoriesApi } from '../api/categories.api';
import { tasksApi } from '../api/tasks.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { WorkspaceSwitcherModal } from '../components/WorkspaceSwitcherModal';
import { GanttModal } from '../components/GanttModal';
import { GanttMascot } from '../components/GanttMascot';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskStatusModal } from '../components/TaskStatusModal';
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  TaskStatus,
  PriorityLevel,
} from '../types';
import type { GanttItem, Group, User, Category, Task } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';

const LEFT_COL_WIDTH = 135;
const DAY_COL_WIDTH = 56;
const ROW_HEIGHT = 52;
const HEADER_ROW_HEIGHT = 38;

// Matching screenshot color palette
const GANTT_BAR_COLORS = [
  '#7CD1C4', // Soft Mint Teal (like Plan #12)
  '#FFAA5B', // Warm Peach Orange (like Plan #15)
  '#539DFE', // Electric Sky Blue (like Plan #13)
  '#10B981', // Emerald Mint (like Plan #14)
  '#FFB020', // Amber Gold (like TREA / Reporte)
  '#A855F7', // Vivid Purple
  '#FF5C8A', // Coral Pink
  '#00D2D3', // Bright Turquoise
  '#6366F1', // Indigo
  '#E67E22', // Deep Orange
];

export const GanttScreen = () => {
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const timelineScrollRef = useRef<ScrollView>(null);

  // Time & Month navigation
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [timeframe, setTimeframe] = useState<'semana' | 'mes'>('mes');
  const [timeframeModalVisible, setTimeframeModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'todos' | 'planificacion' | 'tareas'>('todos');

  // Group filter
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  // Expanded projects in Gantt
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<GanttItem | null>(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [createMenuVisible, setCreateMenuVisible] = useState(false);
  const [selectedGanttForTask, setSelectedGanttForTask] = useState<GanttItem | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus | null>(null);

  const month = currentDate.month() + 1;
  const year = currentDate.year();

  // Data fetching
  const { data: rawItems, isLoading, refetch } = useQuery({
    queryKey: ['gantt-items', selectedGroup, month, year],
    queryFn: () => ganttApi.getAll({ group_id: selectedGroup || undefined, month, year }).then((res) => res.data),
  });

  const { data: rawGroups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const { data: rawUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
  });

  const { data: rawCategories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => categoriesApi.getAll().then((res) => res.data),
  });

  const { data: rawTasks } = useQuery({
    queryKey: ['tasks-kanban-all'],
    queryFn: () => tasksApi.getAll({ includeDeleted: 'false' }).then((res) => res.data),
  });

  const items: GanttItem[] = useMemo(() => extractArray<GanttItem>(rawItems), [rawItems]);
  const groups: Group[] = useMemo(() => extractArray<Group>(rawGroups), [rawGroups]);
  const users: User[] = useMemo(() => extractArray<User>(rawUsers), [rawUsers]);
  const categories: Category[] = useMemo(() => extractArray<Category>(rawCategories), [rawCategories]);
  const allTasks: Task[] = useMemo(() => {
    // Defensive deduplication by id
    const raw = extractArray<Task>(rawTasks);
    const seen = new Set<number>();
    return raw.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [rawTasks]);


  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => ganttApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => ganttApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ganttApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => ganttApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      setTaskModalVisible(false);
      setSelectedGanttForTask(null);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, description }: { id: number; status: string; description?: string }) =>
      tasksApi.updateStatus(id, status, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
    },
  });

  const toggleProjectExpand = (id: number) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const todayStr = dayjs().format('YYYY-MM-DD');

  // Month navigation helpers
  const handlePrev = () => {
    if (timeframe === 'mes') {
      setCurrentDate((prev) => prev.subtract(1, 'month'));
    } else {
      setCurrentDate((prev) => prev.subtract(1, 'week'));
    }
  };

  const handleNext = () => {
    if (timeframe === 'mes') {
      setCurrentDate((prev) => prev.add(1, 'month'));
    } else {
      setCurrentDate((prev) => prev.add(1, 'week'));
    }
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  // Timeline Days Array
  const timelineDays = useMemo(() => {
    const result = [];
    if (timeframe === 'mes') {
      const daysInMonth = currentDate.daysInMonth();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = currentDate.date(i);
        const dateStr = d.format('YYYY-MM-DD');
        const dayLetter = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.day()];
        const dayNum = String(i);
        const isToday = dateStr === todayStr;
        result.push({ dateStr, dayLetter, dayNum, isToday });
      }
    } else {
      const startOfWeek = currentDate.startOf('week');
      for (let i = 0; i < 14; i++) {
        const d = startOfWeek.add(i, 'day');
        const dateStr = d.format('YYYY-MM-DD');
        const dayLetter = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.day()];
        const dayNum = d.format('DD');
        const isToday = dateStr === todayStr;
        result.push({ dateStr, dayLetter, dayNum, isToday });
      }
    }
    return result;
  }, [currentDate, timeframe, todayStr]);

  const timelineWidth = timelineDays.length * DAY_COL_WIDTH;
  const startRangeDate = timelineDays[0]?.dateStr || todayStr;
  const endRangeDate = timelineDays[timelineDays.length - 1]?.dateStr || todayStr;

  const rangeStart = useMemo(() => dayjs(startRangeDate).startOf('day'), [startRangeDate]);
  const rangeEnd = useMemo(() => dayjs(endRangeDate).endOf('day'), [endRangeDate]);

  const inDateRange = useCallback(
    (sDate: string, eDate: string) => {
      const s = dayjs(sDate).startOf('day');
      const e = dayjs(eDate || sDate).endOf('day');
      return !e.isBefore(rangeStart) && !s.isAfter(rangeEnd);
    },
    [rangeStart, rangeEnd]
  );

  // Auto-scroll to today when viewing current month
  useEffect(() => {
    const isCurrent = currentDate.isSame(dayjs(), timeframe === 'mes' ? 'month' : 'week');
    if (isCurrent && timelineScrollRef.current) {
      const offsetDays = timeframe === 'mes' ? dayjs().date() - 2 : dayjs().diff(currentDate.startOf('week'), 'day') - 1;
      const targetScroll = Math.max(0, offsetDays * DAY_COL_WIDTH);
      setTimeout(() => {
        timelineScrollRef.current?.scrollTo({ x: targetScroll, animated: true });
      }, 200);
    } else if (timelineScrollRef.current) {
      timelineScrollRef.current?.scrollTo({ x: 0, animated: true });
    }
  }, [currentDate, timeframe]);

  // Build Deduplicated Hierarchical Timeline Rows
  const { timelineRows, standaloneCount, planCount } = useMemo(() => {
    const rows: Array<{
      id: string | number;
      projectId?: number;
      type: 'project' | 'task' | 'header';
      title: string;
      color: string;
      startDate: string;
      endDate: string;
      progress: number;
      rawItem: any;
      parentTitle?: string;
      hasSubtasks?: boolean;
      subtaskCount?: number;
      isExpanded?: boolean;
      isChild?: boolean;
    }> = [];

    // Track seen task IDs to avoid duplicates from multiple assignees!
    const seenTaskIds = new Set<number>();

    // 1. Process Projects / Plans (only if tab includes them)
    let pCount = 0;
    if (activeTab === 'todos' || activeTab === 'planificacion') {
      items.forEach((item, itemIdx) => {
        const rawTasksArr: any[] = Array.isArray(item.tasks)
          ? item.tasks
          : Array.isArray(item.subtasks)
          ? item.subtasks
          : [];

        // Filter unique tasks for this project
        const uniqueChildTasks: any[] = [];
        rawTasksArr.forEach((t) => {
          if (!seenTaskIds.has(t.id)) {
            seenTaskIds.add(t.id);
            uniqueChildTasks.push(t);
          }
        });

        const start = item.start_date
          ? String(item.start_date).split('T')[0]
          : (item as any).startDate
          ? String((item as any).startDate).split('T')[0]
          : item.fechaInicio
          ? String(item.fechaInicio).split('T')[0]
          : todayStr;

        const end = item.end_date
          ? String(item.end_date).split('T')[0]
          : (item as any).endDate
          ? String((item as any).endDate).split('T')[0]
          : item.fechaFin
          ? String(item.fechaFin).split('T')[0]
          : dayjs(start).add(4, 'day').format('YYYY-MM-DD');

        // Check if plan or any of its tasks is within the current visible range
        const planInRange = inDateRange(start, end) || uniqueChildTasks.some((t) => {
          const tS = t.execution_date || t.start_date || start;
          const tE = t.due_date || t.fechaVencimiento || end;
          return inDateRange(tS, tE);
        });

        if (!planInRange) return;

        // Group filter
        if (selectedGroup != null) {
          const matchesGroup = uniqueChildTasks.some(
            (t) => (t.group_id ?? t.groupId ?? t.group?.id) === selectedGroup
          );
          if (!matchesGroup) return;
        }

        pCount++;
        const projectColor = item.color || GANTT_BAR_COLORS[itemIdx % GANTT_BAR_COLORS.length];

        let completedTasks = uniqueChildTasks.filter(
          (s) => s.status === 'completada' || s.estado === 'COMPLETADA' || s.is_checked
        ).length;
        let totalTasks = uniqueChildTasks.length;

        let progress = 0;
        if (totalTasks > 0) {
          progress = Math.round((completedTasks / totalTasks) * 100);
        } else if (typeof item.progress === 'number') {
          progress = item.progress;
        } else if (typeof item.progreso === 'number') {
          progress = item.progreso;
        }

        const anyItem = item as any;
        const cleanTitle = item.title || item.nombre || anyItem.name || anyItem.titulo || `Plan #${item.id}`;
        const isExpanded = !!expandedProjects[item.id];
        const hasSubtasks = totalTasks > 0;

        // Add Project Row
        rows.push({
          id: `proj_${item.id}`,
          projectId: item.id,
          type: 'project',
          title: cleanTitle,
          color: projectColor,
          startDate: start,
          endDate: end,
          progress: Math.min(100, Math.max(0, progress)),
          rawItem: item,
          hasSubtasks,
          subtaskCount: totalTasks,
          isExpanded,
        });

        // Add child subtasks if expanded
        if (isExpanded) {
          uniqueChildTasks.forEach((t) => {
            const tStart = t.execution_date
              ? String(t.execution_date).split('T')[0]
              : t.start_date
              ? String(t.start_date).split('T')[0]
              : start;

            const tEnd = t.due_date
              ? String(t.due_date).split('T')[0]
              : t.fechaVencimiento
              ? String(t.fechaVencimiento).split('T')[0]
              : end;

            const isDone = t.status === 'completada' || t.estado === 'COMPLETADA' || t.is_checked;
            const tTitle = t.title || t.titulo || (t as any).name || `Tarea #${t.id}`;

            rows.push({
              id: `task_${t.id}`,
              projectId: item.id,
              type: 'task',
              title: tTitle,
              color: projectColor,
              startDate: tStart,
              endDate: tEnd,
              progress: isDone ? 100 : 0,
              rawItem: t,
              parentTitle: cleanTitle,
              isChild: true,
            });
          });
        }
      });
    }

    // 2. Process Standalone Tasks (Tareas Sueltas) - Filtered by visible month/range
    const standaloneTasks = allTasks.filter((t) => {
      // Must NOT belong to any Gantt Item
      if (t.gantt_item_id || (t as any).ganttItemId || t.gantt_item?.id || seenTaskIds.has(t.id)) return false;
      if (t.status === 'eliminada') return false;

      // Group filter
      if (selectedGroup != null) {
        const tGroupId = t.group_id ?? t.groupId ?? t.group?.id;
        if (tGroupId !== selectedGroup) return false;
      }

      // Range filter: must overlap with the visible month / week
      const tStart = t.execution_date || t.fechaInicio || t.due_date || t.fechaVencimiento || todayStr;
      const tEnd = t.due_date || t.fechaVencimiento || t.execution_date || t.fechaInicio || tStart;
      if (!inDateRange(tStart, tEnd)) return false;

      return true;
    });

    const sCount = standaloneTasks.length;

    if (activeTab === 'todos' || activeTab === 'tareas') {
      standaloneTasks.forEach((t, tIdx) => {
        seenTaskIds.add(t.id);
        const isDone = t.status === 'completada' || t.estado === 'COMPLETADA' || t.is_checked;
        const tStart = t.execution_date
          ? String(t.execution_date).split('T')[0]
          : t.fechaInicio
          ? String(t.fechaInicio).split('T')[0]
          : todayStr;
        const tEnd = t.due_date
          ? String(t.due_date).split('T')[0]
          : t.fechaVencimiento
          ? String(t.fechaVencimiento).split('T')[0]
          : tStart;

        // Rotate colors harmoniously
        const taskColor = GANTT_BAR_COLORS[(items.length + tIdx) % GANTT_BAR_COLORS.length];
        const tTitle = t.title || t.titulo || (t as any).name || `Tarea #${t.id}`;

        rows.push({
          id: `standalone_${t.id}`,
          type: 'task',
          title: tTitle,
          color: taskColor,
          startDate: tStart,
          endDate: tEnd,
          progress: isDone ? 100 : 0,
          rawItem: t,
          isChild: false,
        });
      });
    }

    return { timelineRows: rows, standaloneCount: sCount, planCount: pCount };
  }, [items, allTasks, todayStr, expandedProjects, activeTab, selectedGroup, inDateRange]);

  // Bar layout calculation - strictly bounded to the visible timeline range
  const getBarLayout = (startDate: string, endDate: string) => {
    const s = dayjs(startDate).startOf('day');
    const e = dayjs(endDate || startDate).endOf('day');

    if (e.isBefore(rangeStart) || s.isAfter(rangeEnd)) {
      return null;
    }

    const visibleStart = s.isBefore(rangeStart) ? rangeStart : s;
    const visibleEnd = e.isAfter(rangeEnd) ? rangeEnd : e;

    const startOffsetDays = Math.max(0, visibleStart.diff(rangeStart, 'day'));
    const spanDays = Math.max(1, visibleEnd.diff(visibleStart, 'day') + 1);

    const left = startOffsetDays * DAY_COL_WIDTH + 3;
    const width = Math.max(spanDays * DAY_COL_WIDTH - 6, 44);

    return { left, width };
  };

  // Pulled straight from the active theme so Gantt matches whichever preset the
  // user picked (Asana, Obsidian, Slate, Emerald, Iris Purple, Light), instead of
  // a hardcoded dark palette that only ever looked right on one of them.
  const bgMain = colors.bgPrimary;
  const bgCard = colors.bgSecondary;
  const bgHeaderRow = colors.bgSurface;
  const borderColor = colors.border;
  const borderSubtle = colors.borderSubtle;
  const todayColumnBg = colors.primaryMuted;
  const todayHighlightStripe = colors.primary + '14';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgMain }]} edges={['top']}>
      {/* ─── 1. APP HEADER WITH WORKSPACE, PROJECT, SEARCH & AI DICTATION ──── */}
      <AppHeader
        title="Cronograma (Gantt)"
        subtitle="Línea temporal y planificación visual"
        onQuickAdd={() => {
          setEditingItem(null);
          setModalVisible(true);
        }}
      />

      {/* ─── 2. GROUP FILTER CHIPS (Matching Screenshot) ───────────────────── */}
      {groups.length > 0 && (
        <View style={[styles.groupFilterBar, { backgroundColor: bgMain, borderBottomColor: borderSubtle }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupScrollContainer}>
            <TouchableOpacity
              style={[
                styles.groupChipBtn,
                { backgroundColor: selectedGroup === null ? '#FF5C8A20' : bgCard, borderColor: selectedGroup === null ? '#FF5C8A' : borderColor },
              ]}
              onPress={() => setSelectedGroup(null)}
            >
              <Text style={[styles.groupChipText, { color: selectedGroup === null ? '#FF5C8A' : (isDark ? '#94A3B8' : '#64748B') }]}>
                Todos los Grupos
              </Text>
            </TouchableOpacity>

            {groups.map((grp) => {
              const isSelected = selectedGroup === grp.id;
              return (
                <TouchableOpacity
                  key={grp.id}
                  style={[
                    styles.groupChipBtn,
                    { backgroundColor: isSelected ? '#FF5C8A20' : bgCard, borderColor: isSelected ? '#FF5C8A' : borderColor },
                  ]}
                  onPress={() => setSelectedGroup(isSelected ? null : grp.id)}
                >
                  <Text style={[styles.groupChipText, { color: isSelected ? '#FF5C8A' : (isDark ? '#94A3B8' : '#64748B') }]}>
                    {grp.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ─── 3. GANTT TIMELINE CARD (Exact Layout from Screenshot) ─────────── */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#FF5C8A" />
          <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Cargando cronograma...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#FF5C8A" />}
        >
          <View style={[styles.ganttCardBox, { backgroundColor: bgCard, borderColor: borderColor }]}>
            {/* Card Header: Month Nav, HOY, Timeframe & Tabs */}
            <View style={[styles.cardHeaderRow, { borderBottomColor: borderSubtle, backgroundColor: bgHeaderRow }]}>
              {/* Left: Date navigator < AGOSTO 2026 > + HOY */}
              <View style={styles.navControlsRow}>
                <TouchableOpacity onPress={handlePrev} style={[styles.navIconBtn, { backgroundColor: isDark ? '#282A38' : '#EDE9FE' }]}>
                  <Ionicons name="chevron-back" size={14} color="#FF5C8A" />
                </TouchableOpacity>

                <Text style={[styles.monthNavTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  {currentDate.format('MMMM YYYY').toUpperCase()}
                </Text>

                <TouchableOpacity onPress={handleNext} style={[styles.navIconBtn, { backgroundColor: isDark ? '#282A38' : '#EDE9FE' }]}>
                  <Ionicons name="chevron-forward" size={14} color="#FF5C8A" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleToday} style={[styles.todayNavBtn, { backgroundColor: isDark ? '#282A38' : '#EDE9FE' }]}>
                  <Text style={styles.todayNavBtnText}>HOY</Text>
                </TouchableOpacity>
              </View>

              {/* Right: Semana / Mes selector */}
              <TouchableOpacity
                style={[styles.semanaSelectorPill, { backgroundColor: isDark ? '#282A38' : '#EDE9FE' }]}
                onPress={() => setTimeframeModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.semanaSelectorText}>
                  {timeframe === 'semana' ? 'Semana' : 'Mes'}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#FF5C8A" />
              </TouchableOpacity>
            </View>

            {/* Subtabs: Todos / Planificación / Tareas Sueltas */}
            <View style={[styles.tabFilterRow, { borderBottomColor: borderSubtle, backgroundColor: bgCard }]}>
              <TouchableOpacity
                style={[styles.tabFilterBtn, activeTab === 'todos' && styles.tabFilterBtnActive]}
                onPress={() => setActiveTab('todos')}
              >
                <Text style={[styles.tabFilterBtnText, activeTab === 'todos' ? styles.tabFilterTextActive : { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Todos ({planCount + standaloneCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabFilterBtn, activeTab === 'planificacion' && styles.tabFilterBtnActive]}
                onPress={() => setActiveTab('planificacion')}
              >
                <Text style={[styles.tabFilterBtnText, activeTab === 'planificacion' ? styles.tabFilterTextActive : { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Planificación ({planCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabFilterBtn, activeTab === 'tareas' && styles.tabFilterBtnActive]}
                onPress={() => setActiveTab('tareas')}
              >
                <Text style={[styles.tabFilterBtnText, activeTab === 'tareas' ? styles.tabFilterTextActive : { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Tareas Sueltas ({standaloneCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Grid Table Container */}
            <View style={styles.tableFlexRow}>
              {/* Left Column (PLAN / TAREA) */}
              <View style={[styles.leftTableCol, { width: LEFT_COL_WIDTH, borderRightColor: borderSubtle }]}>
                {/* Header Cell */}
                <View style={[styles.leftTableColHeader, { height: HEADER_ROW_HEIGHT, borderBottomColor: borderSubtle, backgroundColor: bgHeaderRow }]}>
                  <Text style={[styles.colHeaderLabel, { color: isDark ? '#7E8299' : '#94A3B8' }]}>
                    PLAN / TAREA
                  </Text>
                </View>

                {/* Rows in left column */}
                {timelineRows.map((row: any) => (
                  <TouchableOpacity
                    key={row.id}
                    style={[
                      styles.leftTableRowCell,
                      { height: ROW_HEIGHT, borderBottomColor: borderSubtle },
                      row.isChild && { paddingLeft: 18, backgroundColor: isDark ? '#161720' : '#FAFAFA' },
                    ]}
                    onPress={() => {
                      if (row.type === 'project') {
                        if (row.hasSubtasks) {
                          toggleProjectExpand(row.projectId);
                        } else {
                          setEditingItem(row.rawItem);
                          setModalVisible(true);
                        }
                      } else {
                        setDetailTask(row.rawItem);
                        setDetailModalVisible(true);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Expand Chevron for plans */}
                    {row.type === 'project' && row.hasSubtasks ? (
                      <TouchableOpacity
                        onPress={() => toggleProjectExpand(row.projectId)}
                        style={styles.chevronTouch}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={row.isExpanded ? 'chevron-down' : 'chevron-forward'}
                          size={12}
                          color={row.color || '#FF5C8A'}
                        />
                      </TouchableOpacity>
                    ) : row.isChild ? (
                      <Text style={[styles.connectorL, { color: isDark ? '#64748B' : '#94A3B8' }]}>↳</Text>
                    ) : null}

                    {/* Color dot */}
                    <View style={[styles.rowColorDot, { backgroundColor: row.color }]} />

                    {/* Title */}
                    <Text
                      style={[
                        styles.rowTitleText,
                        { color: isDark ? '#E2E8F0' : '#0F172A' },
                        row.isChild && { color: isDark ? '#94A3B8' : '#475569', fontSize: 11 },
                      ]}
                      numberOfLines={1}
                    >
                      {row.title}
                    </Text>

                    {/* Badge count for plans */}
                    {row.type === 'project' && row.hasSubtasks && (
                      <View style={[styles.countBadgePill, { backgroundColor: isDark ? '#2A2C3A' : '#E2E8F0' }]}>
                        <Text style={[styles.countBadgePillText, { color: row.color }]}>
                          {row.subtaskCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                {timelineRows.length === 0 && (
                  <View style={[styles.leftTableRowCell, { height: 90, justifyContent: 'center' }]}>
                    <Text style={[styles.emptyMsg, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      Sin elementos
                    </Text>
                  </View>
                )}
              </View>

              {/* Right Scrollable Timeline */}
              <ScrollView
                ref={timelineScrollRef}
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={[styles.rightTimelineScroll, { width: timelineWidth }]}
              >
                <View>
                  {/* Days Header Row: L 24, M 25, M 26, J 27, V 28... */}
                  <View style={[styles.daysHeaderFlexRow, { height: HEADER_ROW_HEIGHT, borderBottomColor: borderSubtle, backgroundColor: bgHeaderRow }]}>
                    {timelineDays.map((d) => (
                      <View
                        key={d.dateStr}
                        style={[
                          styles.dayHeaderBox,
                          { width: DAY_COL_WIDTH },
                          d.isToday && { backgroundColor: todayColumnBg, borderRadius: 4 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayHeaderBoxText,
                            { color: isDark ? '#94A3B8' : '#64748B' },
                            d.isToday && { fontWeight: '900', color: isDark ? '#A5B4FC' : '#4F46E5' },
                          ]}
                        >
                          {d.dayLetter} {d.dayNum}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Grid Rows with Vibrant Rounded Bars */}
                  {timelineRows.map((row) => {
                    const barLayout = getBarLayout(row.startDate, row.endDate);

                    return (
                      <View
                        key={row.id}
                        style={[
                          styles.timelineGridRow,
                          { height: ROW_HEIGHT, borderBottomColor: borderSubtle },
                          row.isChild && { backgroundColor: isDark ? '#161720' : '#FAFAFA' },
                        ]}
                      >
                        {/* Day Vertical Grid Columns with Today Highlighting */}
                        {timelineDays.map((d) => (
                          <View
                            key={d.dateStr}
                            style={[
                              styles.gridColDivider,
                              { width: DAY_COL_WIDTH, borderRightColor: borderSubtle },
                              d.isToday && { backgroundColor: todayHighlightStripe },
                            ]}
                          />
                        ))}

                        {/* Gantt Bar (Plan or Task) */}
                        {barLayout && (
                          <TouchableOpacity
                            style={[
                              styles.ganttVibrantPill,
                              {
                                left: barLayout.left,
                                width: barLayout.width,
                                backgroundColor: row.color,
                              },
                            ]}
                            onPress={() => {
                              if (row.type === 'project') {
                                setEditingItem(row.rawItem);
                                setModalVisible(true);
                              } else {
                                setDetailTask(row.rawItem);
                                setDetailModalVisible(true);
                              }
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.ganttVibrantPillText} numberOfLines={1}>
                              {row.progress > 0 ? `${row.progress}%` : row.title}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}

                  {timelineRows.length === 0 && (
                    <View style={[styles.timelineGridRow, { height: 90, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={[styles.emptyMsg, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                        No hay actividades en este rango
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Timeframe Modal (Semana / Mes) */}
      <Modal
        visible={timeframeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeframeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimeframeModalVisible(false)}
        >
          <View style={[styles.pickerModalCard, { backgroundColor: bgCard, borderColor: borderColor }]}>
            <Text style={[styles.pickerModalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              Vista del Cronograma
            </Text>
            <TouchableOpacity
              style={[styles.pickerItemRow, timeframe === 'semana' && { backgroundColor: '#FF5C8A20' }]}
              onPress={() => {
                setTimeframe('semana');
                setTimeframeModalVisible(false);
              }}
            >
              <Ionicons name="calendar-outline" size={16} color="#FF5C8A" />
              <Text style={[styles.pickerItemText, { color: timeframe === 'semana' ? '#FF5C8A' : (isDark ? '#FFFFFF' : '#0F172A') }]}>
                Semana (14 Días)
              </Text>
              {timeframe === 'semana' && <Ionicons name="checkmark" size={16} color="#FF5C8A" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerItemRow, timeframe === 'mes' && { backgroundColor: '#FF5C8A20' }]}
              onPress={() => {
                setTimeframe('mes');
                setTimeframeModalVisible(false);
              }}
            >
              <Ionicons name="grid-outline" size={16} color="#FF5C8A" />
              <Text style={[styles.pickerItemText, { color: timeframe === 'mes' ? '#FF5C8A' : (isDark ? '#FFFFFF' : '#0F172A') }]}>
                Mes (31 Días)
              </Text>
              {timeframe === 'mes' && <Ionicons name="checkmark" size={16} color="#FF5C8A" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gantt Modal */}
      <GanttModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingItem(null);
        }}
        initialItem={editingItem}
        groups={groups}
        onSubmit={async (data) => {
          if (editingItem) {
            await updateMutation.mutateAsync({ id: editingItem.id, data });
          } else {
            await createMutation.mutateAsync(data);
          }
        }}
      />

      {/* Task Modal */}
      <TaskModal
        visible={taskModalVisible}
        onClose={() => {
          setTaskModalVisible(false);
          setEditingTask(null);
        }}
        task={editingTask}
        users={users}
        categories={categories}
        ganttItems={items}
        groups={groups}
        initialGanttItemId={selectedGanttForTask?.id}
        initialStartDate={selectedGanttForTask?.start_date || (selectedGanttForTask as any)?.startDate}
        initialDueDate={selectedGanttForTask?.end_date || (selectedGanttForTask as any)?.endDate}
        onCategoryCreated={() => queryClient.invalidateQueries({ queryKey: ['categories-list'] })}
        onSave={async (taskData) => {
          if (editingTask) {
            await updateTaskMutation.mutateAsync({ id: editingTask.id, data: taskData });
          } else {
            await createTaskMutation.mutateAsync(taskData);
          }
        }}
      />

      {/* Detail Modal */}
      <TaskDetailModal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setDetailTask(null);
        }}
        task={detailTask}
        onEdit={(t) => {
          setEditingTask(t);
          setTaskModalVisible(true);
        }}
        onStatusChange={async (t, nextSt) => {
          if (nextSt === 'bloqueada') {
            setDetailModalVisible(false);
            setStatusTask(t);
            setTargetStatus('bloqueada');
            setStatusModalVisible(true);
          } else {
            await updateStatusMutation.mutateAsync({ id: t.id, status: nextSt });
            setDetailModalVisible(false);
          }
        }}
        onDuplicate={async (id) => duplicateMutation.mutateAsync(id)}
        onDelete={async (id) => deleteMutation.mutateAsync(id)}
        onRestore={async () => queryClient.invalidateQueries({ queryKey: ['gantt-items'] })}
        onForceDelete={async () => queryClient.invalidateQueries({ queryKey: ['gantt-items'] })}
        onRescheduleToday={async (t) => {
          const today = dayjs().format('YYYY-MM-DD');
          await updateTaskMutation.mutateAsync({ id: t.id, data: { execution_date: today, due_date: today } });
        }}
      />

      {/* Status Modal */}
      <TaskStatusModal
        visible={statusModalVisible}
        onClose={() => {
          setStatusModalVisible(false);
          setStatusTask(null);
          setTargetStatus(null);
        }}
        task={statusTask}
        targetStatus={targetStatus}
        onConfirm={async ({ id, status, description }) => {
          await updateStatusMutation.mutateAsync({ id, status, description });
        }}
      />

      {/* Bottom Bar */}
      <BottomNavBar onCenterPlusPress={() => setCreateMenuVisible(true)} />

      {/* Iron Man Assistant — plan-level alerts (overdue, due soon, stalled) */}
      <GanttMascot items={items} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  groupFilterBar: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  groupScrollContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  groupChipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
  },
  groupChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 10,
    paddingBottom: 90,
  },
  ganttCardBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  navControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navIconBtn: {
    padding: 5,
    borderRadius: 8,
  },
  monthNavTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  todayNavBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  todayNavBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF5C8A',
  },
  tabFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 6,
  },
  tabFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tabFilterBtnActive: {
    backgroundColor: '#FF5C8A20',
  },
  tabFilterBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabFilterTextActive: {
    color: '#FF5C8A',
    fontWeight: '900',
  },
  cardHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardHeaderSubTitle: {
    fontSize: 10,
    color: '#FF5C8A',
    fontWeight: '700',
    marginTop: 1,
  },
  semanaSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  semanaSelectorText: {
    color: '#FF5C8A',
    fontSize: 11,
    fontWeight: '800',
  },
  tableFlexRow: {
    flexDirection: 'row',
  },
  leftTableCol: {
    borderRightWidth: 1,
    zIndex: 10,
  },
  leftTableColHeader: {
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  colHeaderLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  leftTableRowCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 5,
  },
  chevronTouch: {
    padding: 2,
  },
  connectorL: {
    fontSize: 12,
    fontWeight: '900',
    marginRight: -1,
  },
  rowColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowTitleText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  countBadgePill: {
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  countBadgePillText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  emptyMsg: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  rightTimelineScroll: {
    flexDirection: 'column',
  },
  daysHeaderFlexRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  dayHeaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  dayHeaderBoxText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  timelineGridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    position: 'relative',
    alignItems: 'center',
  },
  gridColDivider: {
    height: '100%',
    borderRightWidth: 1,
  },
  ganttVibrantPill: {
    position: 'absolute',
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    elevation: 2,
  },
  ganttVibrantPillText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalCard: {
    width: '82%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default GanttScreen;
