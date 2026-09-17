import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import { extractArray } from '../api/utils';
import { categoriesApi } from '../api/categories.api';
import { ganttApi } from '../api/gantt.api';
import { groupsApi } from '../api/groups.api';
import { projectsApi } from '../api/projects.api';
import { usersApi } from '../api/users.api';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { CalendarMascot } from '../components/CalendarMascot';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskModal } from '../components/TaskModal';
import { TaskStatusModal } from '../components/TaskStatusModal';
import {
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  TaskStatus,
  PriorityLevel,
} from '../types';
import type { Task, User, Category, GanttItem, Group, Project } from '../types';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const CalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [calendarViewMode, setCalendarViewMode] = useState<'mes' | 'semana' | 'dia'>('mes');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('Todos');

  // Modals state
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus | null>(null);

  // Catalogs
  const { data: rawUsers } = useQuery({
    queryKey: ['users-list-calendar'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
  });

  const { data: rawCategories } = useQuery({
    queryKey: ['categories-list-calendar'],
    queryFn: () => categoriesApi.getAll().then((res) => res.data),
  });

  const { data: rawGantt } = useQuery({
    queryKey: ['gantt-list-calendar'],
    queryFn: () => ganttApi.getAll().then((res) => res.data),
  });

  const { data: rawGroups } = useQuery({
    queryKey: ['groups-list-calendar'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const { data: rawProjects } = useQuery({
    queryKey: ['projects-list-calendar'],
    queryFn: () => projectsApi.getAll().then((res) => res.data),
  });

  const users: User[] = extractArray<User>(rawUsers);
  const categories: Category[] = extractArray<Category>(rawCategories);
  const ganttItems: GanttItem[] = extractArray<GanttItem>(rawGantt);
  const groups: Group[] = extractArray<Group>(rawGroups);
  const projects: Project[] = extractArray<Project>(rawProjects);

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => tasksApi.update(id, data),
    onSuccess: () => {
      fetchTasks();
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, description }: { id: number; status: string; description?: string }) =>
      tasksApi.updateStatus(id, status, description),
    onSuccess: () => {
      fetchTasks();
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
    },
  });

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDetailModalVisible(false);
    setTaskModalVisible(true);
  };

  useEffect(() => {
    fetchTasks();
  }, [currentDate]);

  const fetchTasks = async () => {
    setLoading(true);
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    try {
      const res = await tasksApi.getCalendarTasks(
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      );
      setTasks(extractArray<Task>(res.data));
    } catch (err) {
      console.error('Error fetching calendar tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  // Navigates by week (in 'semana' view) or by day (in 'dia' view) instead of
  // jumping a whole month, since those views only show a slice of the month.
  const goToPrevPeriod = () => {
    if (calendarViewMode === 'semana') {
      const nd = dayjs(currentDate).date(selectedDay).subtract(7, 'day');
      setCurrentDate(nd.toDate());
      setSelectedDay(nd.date());
    } else if (calendarViewMode === 'dia') {
      const nd = dayjs(currentDate).date(selectedDay).subtract(1, 'day');
      setCurrentDate(nd.toDate());
      setSelectedDay(nd.date());
    } else {
      prevMonth();
    }
  };

  const goToNextPeriod = () => {
    if (calendarViewMode === 'semana') {
      const nd = dayjs(currentDate).date(selectedDay).add(7, 'day');
      setCurrentDate(nd.toDate());
      setSelectedDay(nd.date());
    } else if (calendarViewMode === 'dia') {
      const nd = dayjs(currentDate).date(selectedDay).add(1, 'day');
      setCurrentDate(nd.toDate());
      setSelectedDay(nd.date());
    } else {
      nextMonth();
    }
  };

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayIndex = (() => {
    const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; // Lunes = 0
  })();

  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Group days into structured rows of 7 (weeks) for a rock-solid 7-column layout
  const calendarWeeks = useMemo(() => {
    const allCells: Array<{ day: number | null; isBlank: boolean }> = [];
    for (let i = 0; i < firstDayIndex; i++) {
      allCells.push({ day: null, isBlank: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      allCells.push({ day: d, isBlank: false });
    }
    while (allCells.length % 7 !== 0) {
      allCells.push({ day: null, isBlank: true });
    }
    const weeks: Array<Array<{ day: number | null; isBlank: boolean }>> = [];
    for (let i = 0; i < allCells.length; i += 7) {
      weeks.push(allCells.slice(i, i + 7));
    }
    return weeks;
  }, [firstDayIndex, daysInMonth]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    tasks.forEach((t) => {
      const dateStr = t.due_date || t.fechaVencimiento || t.execution_date || t.fechaInicio;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (
        d.getMonth() === currentDate.getMonth() &&
        d.getFullYear() === currentDate.getFullYear()
      ) {
        const dayNum = d.getDate();
        if (!map[dayNum]) map[dayNum] = [];
        map[dayNum].push(t);
      }
    });
    return map;
  }, [tasks, currentDate]);

  // Statistics calculation for the 3 top stat cards
  const stats = useMemo(() => {
    const total = tasks.filter((t) => t.status !== 'eliminada').length;
    const reuniones = tasks.filter(
      (t) =>
        t.category?.name?.toLowerCase().includes('reunion') ||
        t.category?.name?.toLowerCase().includes('reunión') ||
        t.title?.toLowerCase().includes('reunion') ||
        t.title?.toLowerCase().includes('reunión') ||
        t.title?.toLowerCase().includes('meet')
    ).length;
    const urgentes = tasks.filter(
      (t) => t.priority === 'muy_alta' || t.priority === 'alta' || t.status === 'bloqueada'
    ).length;

    return { total: total || tasks.length, reuniones, urgentes };
  }, [tasks]);

  // Unique users for filtering
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignee?.nombre) set.add(t.assignee.nombre);
      if (t.assignee?.name) set.add(t.assignee.name);
      t.assignees?.forEach((a) => {
        if (a.user?.nombre) set.add(a.user.nombre);
        if (a.user?.name) set.add(a.user.name);
      });
    });
    return ['Todos', ...Array.from(set)];
  }, [tasks]);

  // Tasks for selected day
  const selectedDayTasks = useMemo(() => {
    const dayTasks = tasksByDay[selectedDay] || [];
    if (filterUser === 'Todos') return dayTasks;
    return dayTasks.filter((t) => {
      return (
        t.assignee?.nombre === filterUser ||
        t.assignee?.name === filterUser ||
        t.assignees?.some((a) => a.user?.nombre === filterUser || a.user?.name === filterUser)
      );
    });
  }, [tasksByDay, selectedDay, filterUser]);

  const selectedDateLabel = `${selectedDay} de ${
    MONTH_NAMES[currentDate.getMonth()]
  } de ${currentDate.getFullYear()}`;

  const todayNum = new Date().getDate();
  const isCurrentMonth =
    currentDate.getMonth() === new Date().getMonth() &&
    currentDate.getFullYear() === new Date().getFullYear();

  // Week Days for 'semana' view
  const weekStart = useMemo(() => {
    const d = dayjs(currentDate).date(selectedDay);
    return d.startOf('week');
  }, [currentDate, selectedDay]);

  const weekDays = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = weekStart.add(i + 1, 'day'); // Start from Monday
      const dayLetter = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.day()];
      const dayNum = d.date();
      const dateStr = d.format('YYYY-MM-DD');
      const isSelected = selectedDay === dayNum && d.month() === currentDate.getMonth();
      const isToday = d.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
      const dayTasksCount = tasks.filter((t) => {
        const tDate = t.due_date || t.fechaVencimiento || t.execution_date || t.fechaInicio;
        return tDate ? String(tDate).split('T')[0] === dateStr : false;
      }).length;

      result.push({
        d,
        dayLetter,
        dayNum,
        dateStr,
        isSelected,
        isToday,
        hasTasks: dayTasksCount > 0,
        dayTasksCount,
      });
    }
    return result;
  }, [weekStart, selectedDay, currentDate, tasks]);

  // Header label adapts to the active view: month, week range, or single day
  const headerLabel = useMemo(() => {
    if (calendarViewMode === 'semana') {
      const first = weekStart.add(1, 'day');
      const last = weekStart.add(7, 'day');
      if (first.month() === last.month()) {
        return `${first.date()} - ${last.date()} ${MONTH_NAMES[first.month()]} ${first.year()}`;
      }
      return `${first.date()} ${MONTH_NAMES[first.month()]} - ${last.date()} ${MONTH_NAMES[last.month()]} ${last.year()}`;
    }
    if (calendarViewMode === 'dia') {
      const d = dayjs(currentDate).date(selectedDay);
      return `${d.date()} ${MONTH_NAMES[d.month()]} ${d.year()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [calendarViewMode, currentDate, selectedDay, weekStart]);

  // Tasks for day timeline view (sorted with mock/real times)
  const dayTimelineTasks = useMemo(() => {
    const base = selectedDayTasks;
    const hours = ['09:00', '09:30', '10:15', '11:00', '12:30', '14:00', '15:30', '16:45', '17:30', '19:00', '20:00'];
    return base.map((t, idx) => {
      let timeStr = hours[idx % hours.length];
      if (t.due_date && String(t.due_date).includes('T')) {
        const timePart = String(t.due_date).split('T')[1]?.substring(0, 5);
        if (timePart && timePart !== '00:00') timeStr = timePart;
      }
      const categoryName = t.category?.name || t.groupNombre || 'General';
      const categoryCode = categoryName.substring(0, 2).toUpperCase();
      return {
        ...t,
        displayTime: timeStr,
        categoryCode,
        categoryName,
      };
    });
  }, [selectedDayTasks]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader title="Calendario" subtitle="Programa mensual de tareas y fechas límite" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 8) + 85 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. TOP SEGMENTED VIEW SWITCHER: [ Mes | Semana | Día ] ────────── */}
        <View style={[styles.viewSwitcherCard, { backgroundColor: isDark ? colors.bgSecondary : colors.primaryMuted }]}>
          {[
            { id: 'mes', label: 'Mes' },
            { id: 'semana', label: 'Semana' },
            { id: 'dia', label: 'Día' },
          ].map((tab) => {
            const isActive = calendarViewMode === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.viewSwitcherBtn,
                  isActive && {
                    backgroundColor: isDark ? colors.bgSurface : colors.bgCard,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
                onPress={() => setCalendarViewMode(tab.id as any)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.viewSwitcherText,
                    { color: isActive ? colors.primary : colors.textMuted },
                    isActive && { fontWeight: '900', color: colors.primary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── 2. STAT SUMMARY CARDS ROW: [ 9 Tareas | 2 Reuniones | 1 Urgentes ] ─ */}
        <View style={styles.statsRow}>
          {/* Card 1: Tareas */}
          <View style={[styles.statCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tareas</Text>
          </View>

          {/* Card 2: Reuniones */}
          <View style={[styles.statCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>{stats.reuniones}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reuniones</Text>
          </View>

          {/* Card 3: Urgentes */}
          <View style={[styles.statCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.statNumber, { color: colors.danger }]}>{stats.urgentes}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Urgentes</Text>
          </View>
        </View>

        {/* ─── 3. MONTH / DATE NAVIGATOR ──────────────────────────────────────── */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={goToPrevPeriod}
            style={[styles.monthNavBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {headerLabel}
          </Text>
          <TouchableOpacity
            onPress={goToNextPeriod}
            style={[styles.monthNavBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ─── 4. VISTA: MES (Month Grid View - 7-column Week Rows) ───────────── */}
        {calendarViewMode === 'mes' && (
          <View style={[styles.calendarGridCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            {/* Weekday Row (L M M J V S D) */}
            <View style={[styles.weekdayRow, { borderBottomColor: colors.borderSubtle }]}>
              {WEEKDAYS.map((wd, i) => (
                <Text
                  key={`${wd}-${i}`}
                  style={[styles.weekdayText, { color: colors.textMuted }]}
                >
                  {wd}
                </Text>
              ))}
            </View>

            {/* Days Grid - Row by Row */}
            {loading ? (
              <View style={styles.gridLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.daysGridContainer}>
                {calendarWeeks.map((week, wIdx) => (
                  <View key={`week-${wIdx}`} style={styles.calendarWeekRow}>
                    {week.map((cell, cIdx) => {
                      if (cell.isBlank || cell.day === null) {
                        return <View key={`blank-${wIdx}-${cIdx}`} style={styles.dayCellBlank} />;
                      }

                      const d = cell.day;
                      const dayTasks = tasksByDay[d] || [];
                      const isSelected = selectedDay === d;
                      const isToday = isCurrentMonth && d === todayNum;

                      return (
                        <TouchableOpacity
                          key={`d-${d}`}
                          style={[
                            styles.dayCell,
                            { backgroundColor: isDark ? colors.bgSurface : colors.bgPrimary },
                            isToday && {
                              borderColor: colors.primary,
                              borderWidth: 1.5,
                              backgroundColor: colors.primaryMuted,
                            },
                            isSelected && !isToday && {
                              borderColor: colors.primary,
                              borderWidth: 1.5,
                            },
                          ]}
                          onPress={() => setSelectedDay(d)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              { color: colors.textPrimary },
                              isToday && { color: colors.primary, fontWeight: '900' },
                              isSelected && { fontWeight: '900' },
                            ]}
                          >
                            {d}
                          </Text>

                          {dayTasks.length > 0 && (
                            <View style={styles.dayTaskSnippetCol}>
                              {dayTasks.slice(0, 1).map((t, idx) => {
                                const pColor = PRIORITY_COLORS[t.priority as PriorityLevel] || '#F59E0B';
                                return (
                                  <View key={t.id || idx} style={styles.microTaskRow}>
                                    <View style={[styles.microDot, { backgroundColor: pColor }]} />
                                    <Text style={[styles.microTaskText, { color: colors.textSecondary }]} numberOfLines={1}>
                                      {t.title || t.titulo}
                                    </Text>
                                  </View>
                                );
                              })}

                              {dayTasks.length > 1 && (
                                <View style={styles.extraDotsRow}>
                                  {dayTasks.slice(1, 3).map((t, idx) => {
                                    const pColor = PRIORITY_COLORS[t.priority as PriorityLevel] || '#3B82F6';
                                    return <View key={t.id || idx} style={[styles.extraDot, { backgroundColor: pColor }]} />;
                                  })}
                                </View>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── 5. VISTA: SEMANA (Week Strip View - Matching Screenshot 1) ─────── */}
        {calendarViewMode === 'semana' && (
          <View style={styles.weekSectionContainer}>
            {/* Week Strip Card */}
            <View style={[styles.weekStripCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}>
              <View style={styles.weekDaysFlexRow}>
                {weekDays.map((wd) => {
                  const isHighlighted = wd.isSelected;
                  return (
                    <TouchableOpacity
                      key={wd.dateStr}
                      style={[
                        styles.weekDayPill,
                        isHighlighted && [
                          styles.weekDayPillActive,
                          { backgroundColor: colors.primary, shadowColor: colors.primary },
                        ],
                      ]}
                      onPress={() => setSelectedDay(wd.dayNum)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.weekDayLetter,
                          { color: isHighlighted ? '#FFFFFF' : colors.textMuted },
                        ]}
                      >
                        {wd.dayLetter}
                      </Text>
                      <Text
                        style={[
                          styles.weekDayNum,
                          { color: isHighlighted ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {wd.dayNum}
                      </Text>
                      {wd.hasTasks && (
                        <View
                          style={[
                            styles.weekDayDot,
                            { backgroundColor: isHighlighted ? '#FFFFFF' : colors.primary },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Horizontal Mini Task Cards Preview */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalWeekCardsContainer}>
              {selectedDayTasks.map((t) => {
                const priorityColor = PRIORITY_COLORS[t.priority as PriorityLevel] || '#F59E0B';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.miniWeekTaskCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
                    onPress={() => {
                      setDetailTask(t);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.miniWeekCardHeader}>
                      <View style={[styles.miniCardDot, { backgroundColor: priorityColor }]} />
                      <Text style={[styles.miniCardTitle, { color: colors.textPrimary }]} numberOfLines={3}>
                        {t.title || t.titulo}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {selectedDayTasks.length === 0 && (
                <View style={[styles.miniWeekTaskCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>Sin tareas para este día</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ─── 6. VISTA: DÍA (Day Agenda Timeline - Matching Screenshot 2) ────── */}
        {calendarViewMode === 'dia' && (
          <View style={styles.dayTimelineContainer}>
            {dayTimelineTasks.map((item, idx) => {
              const priorityColor = PRIORITY_COLORS[item.priority as PriorityLevel] || '#10B981';
              return (
                <View key={item.id || idx} style={styles.dayTimelineRow}>
                  {/* Time Label on Left */}
                  <View style={styles.timelineTimeCol}>
                    <Text style={[styles.timelineTimeText, { color: colors.textMuted }]}>
                      {item.displayTime}
                    </Text>
                  </View>

                  {/* Vertical Timeline Divider */}
                  <View style={styles.timelineTrackCol}>
                    <View style={[styles.timelineTrackDot, { backgroundColor: priorityColor }]} />
                    <View style={[styles.timelineTrackLine, { backgroundColor: colors.borderSubtle }]} />
                  </View>

                  {/* Card Content with colored left border indicator */}
                  <TouchableOpacity
                    style={[styles.timelineTaskCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
                    onPress={() => {
                      setDetailTask(item);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.timelineColorBar, { backgroundColor: priorityColor }]} />
                    <View style={styles.timelineCardBody}>
                      <Text style={[styles.timelineTaskTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {item.title || item.titulo}
                      </Text>
                      <Text style={[styles.timelineTaskSubtitle, { color: colors.textSecondary }]}>
                        {item.categoryCode} · {item.categoryName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}

            {dayTimelineTasks.length === 0 && (
              <View style={[styles.dayTasksSection, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                <View style={styles.emptyDayTasks}>
                  <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>
                    No hay tareas programadas para el {selectedDateLabel}.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── 7. SELECTED DAY TASKS SECTION (For Mes & General) ──────────────── */}
        {calendarViewMode === 'mes' && (
          <View style={[styles.dayTasksSection, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View style={styles.dayTasksHeader}>
              <Ionicons name="calendar" size={17} color={colors.primary} />
              <Text style={[styles.dayTasksTitle, { color: colors.textPrimary }]}>
                Tareas para el {selectedDateLabel}
              </Text>
              <View style={[styles.badgeCount, { backgroundColor: colors.primaryMuted }]}>
                <Text style={[styles.badgeCountText, { color: colors.primary }]}>{selectedDayTasks.length}</Text>
              </View>
            </View>

            {selectedDayTasks.length === 0 ? (
              <View style={styles.emptyDayTasks}>
                <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>
                  No hay tareas programadas para esta fecha.
                </Text>
              </View>
            ) : (
              <View style={styles.tasksList}>
                {selectedDayTasks.map((item) => {
                  const priorityColor = PRIORITY_COLORS[item.priority as PriorityLevel] || colors.primary;
                  const statusColor = STATUS_COLORS[item.status as TaskStatus] || colors.textSecondary;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.taskCard,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        setDetailTask(item);
                        setDetailModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />
                      <View style={styles.taskCardBody}>
                        <Text style={[styles.taskCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.title || item.titulo}
                        </Text>
                        <View style={styles.taskCardMeta}>
                          <Text style={[styles.assigneeMeta, { color: colors.textSecondary }]}>
                            {item.assignee?.nombre || item.assignee?.name || 'Sin asignar'}
                          </Text>
                          <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                            <Text style={[styles.statusPillText, { color: statusColor }]}>
                              {STATUS_LABELS[item.status as TaskStatus] || item.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar />

      <CalendarMascot tasks={tasks} userId={user?.id} />

      {/* Task Detail Modal */}
      <TaskDetailModal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setDetailTask(null);
        }}
        task={detailTask}
        onEdit={(t) => handleEditTask(t)}
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
        onDuplicate={async (id) => tasksApi.duplicate(id).then(fetchTasks)}
        onDelete={async (id) => tasksApi.remove(id).then(fetchTasks)}
        onRestore={async () => fetchTasks()}
        onForceDelete={async () => fetchTasks()}
        onRescheduleToday={async (t) => {
          const today = dayjs().format('YYYY-MM-DD');
          await updateTaskMutation.mutateAsync({ id: t.id, data: { execution_date: today, due_date: today } });
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
        ganttItems={ganttItems}
        groups={groups}
        projects={projects}
        onCategoryCreated={() => queryClient.invalidateQueries({ queryKey: ['categories-list-calendar'] })}
        onProjectCreated={() => queryClient.invalidateQueries({ queryKey: ['projects-list-calendar'] })}
        onSave={async (taskData) => {
          if (editingTask) {
            await updateTaskMutation.mutateAsync({ id: editingTask.id, data: taskData });
          } else {
            await tasksApi.create(taskData);
            fetchTasks();
          }
        }}
      />

      {/* Status Reason Modal */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 90,
  },

  // 1. View Switcher Tabs
  viewSwitcherCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
  },
  viewSwitcherBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  viewSwitcherText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // 2. Stat Summary Cards
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  // 3. Month Navigator
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  // 4. Main Calendar Grid Card
  calendarGridCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
    elevation: 3,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
  },
  gridLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  daysGridContainer: {
    marginTop: 6,
    gap: 4,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCellBlank: {
    flex: 1,
    minHeight: 48,
  },
  dayCell: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    padding: 3,
    justifyContent: 'flex-start',
  },
  dayNumber: {
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayTaskSnippetCol: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  microTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  microDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  microTaskText: {
    fontSize: 7.5,
    fontWeight: '600',
    flex: 1,
  },
  extraDotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  extraDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },

  // 5. Day Tasks Section
  dayTasksSection: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  dayTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dayTasksTitle: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  badgeCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyDayTasks: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  tasksList: {
    gap: 8,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    paddingRight: 10,
  },
  priorityBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  taskCardBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  taskCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  taskCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  assigneeMeta: {
    fontSize: 10.5,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  // 6. Week View Styles (Screenshot 1)
  weekSectionContainer: {
    gap: 12,
  },
  weekStripCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    elevation: 2,
  },
  weekDaysFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekDayPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    gap: 2,
  },
  weekDayPillActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  weekDayLetter: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekDayNum: {
    fontSize: 14,
    fontWeight: '900',
  },
  weekDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  horizontalWeekCardsContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  miniWeekTaskCard: {
    width: 130,
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  miniWeekCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  miniCardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  miniCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    lineHeight: 15,
  },

  // 7. Day Timeline View Styles (Screenshot 2)
  dayTimelineContainer: {
    gap: 10,
  },
  dayTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  timelineTimeCol: {
    width: 65,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  timelineTimeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineTrackCol: {
    alignItems: 'center',
    width: 14,
  },
  timelineTrackDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 11,
  },
  timelineTrackLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineTaskCard: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 1,
  },
  timelineColorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  timelineCardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  timelineTaskTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  timelineTaskSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
  },
});

export default CalendarScreen;
