import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  ScrollView,
  Alert,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import { usersApi } from '../api/users.api';
import { categoriesApi } from '../api/categories.api';
import { ganttApi } from '../api/gantt.api';
import { groupsApi } from '../api/groups.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskStatusModal } from '../components/TaskStatusModal';
import { GanttModal } from '../components/GanttModal';
import { DraggableKanbanBoard, KANBAN_COLUMNS } from '../components/DraggableKanbanBoard';
import { IronManGuide } from '../components/IronManGuide';
import { AppHeader } from '../components/AppHeader';
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  TaskStatus,
  PriorityLevel,
} from '../types';
import type { Task, User, Category, GanttItem, Group } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.78;

interface ColumnDef {
  id: TaskStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'pendiente', label: 'Pendiente', icon: 'time-outline', color: '#94A3B8' },
  { id: 'en_progreso', label: 'En progreso', icon: 'play-circle-outline', color: '#3B82F6' },
  { id: 'en_revision', label: 'En revisión', icon: 'eye-outline', color: '#A855F7' },
  { id: 'bloqueada', label: 'Bloqueada', icon: 'alert-circle-outline', color: '#EF4444' },
  { id: 'completada', label: 'Completada', icon: 'checkmark-circle-outline', color: '#10B981' },
];

export const KanbanScreen = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const { user: currentUser, isSuperAdmin, isAdmin, isJefe, isColaborador, canForceDelete } = useAuth();
  const { showError, showSuccess } = useNotification();

  // Mode: 'list' (default Asana-style) or 'kanban' (board)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // View Selector Modal ("Elegir una vista" Asana-style)
  const [viewSelectorOpen, setViewSelectorOpen] = useState(false);

  // Filters
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | null>(null);
  const [overdueFilter, setOverdueFilter] = useState<'vigentes' | 'vencidas' | 'all'>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Section collapses for list view
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Date horizon filter (Hoy | Semana | Mes | Próximas | Todas)
  const [dateHorizon, setDateHorizon] = useState<'todas' | 'hoy' | 'semana' | 'mes' | 'proximas'>('todas');

  // Plan / Project filtering from header
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPlanName, setSelectedPlanName] = useState<string>('Todas las planificaciones');

  // Quick inline add task
  const [quickAddSection, setQuickAddSection] = useState<string | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Drag state (shared with DraggableKanbanBoard)
  const [hoveredColumn, setHoveredColumn] = useState<TaskStatus | null>(null);
  const [isDraggingTask, setIsDraggingTask] = useState(false);

  // Modals
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus | null>(null);
  const [quickMoveTask, setQuickMoveTask] = useState<Task | null>(null);
  const [createMenuVisible, setCreateMenuVisible] = useState(false);
  const [ganttModalVisible, setGanttModalVisible] = useState(false);
  const [editingGanttItem, setEditingGanttItem] = useState<GanttItem | null>(null);

  // Data queries
  const { data: rawTasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks-kanban-all'],
    queryFn: () => tasksApi.getAll({ includeDeleted: 'true' }).then((res) => res.data),
  });

  const { data: rawUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
  });

  const { data: rawCategories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => categoriesApi.getAll().then((res) => res.data),
  });

  const { data: rawGantt } = useQuery({
    queryKey: ['gantt-list'],
    queryFn: () => ganttApi.getAll().then((res) => res.data),
  });

  const { data: rawGroups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const allTasks: Task[] = useMemo(() => {
    // Defensive deduplication by id (in case API returns multiple rows per assignee)
    const raw = extractArray<Task>(rawTasks);
    const seen = new Set<number>();
    return raw.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [rawTasks]);
  const users: User[] = useMemo(() => extractArray<User>(rawUsers), [rawUsers]);
  const categories: Category[] = useMemo(() => extractArray<Category>(rawCategories), [rawCategories]);
  const ganttItems: GanttItem[] = useMemo(() => extractArray<GanttItem>(rawGantt), [rawGantt]);
  const groups: Group[] = useMemo(() => extractArray<Group>(rawGroups), [rawGroups]);

  const todayStr = dayjs().format('YYYY-MM-DD');

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      setTaskModalVisible(false);
      setEditingTask(null);
      setQuickAddSection(null);
      setQuickTaskTitle('');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => tasksApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      setTaskModalVisible(false);
      setEditingTask(null);
    },
  });

  const createGanttMutation = useMutation({
    mutationFn: (data: any) => ganttApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      setGanttModalVisible(false);
      setEditingGanttItem(null);
      showSuccess('Proyecto creado', 'El proyecto/plan se ha registrado con éxito.');
    },
    onError: () => showError('Error', 'No se pudo crear el proyecto.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, description }: { id: number; status: string; description?: string }) =>
      tasksApi.updateStatus(id, status, description),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks-kanban-all'] });
      const previousTasks = queryClient.getQueryData(['tasks-kanban-all']);
      queryClient.setQueryData(['tasks-kanban-all'], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((t: Task) => (t.id === id ? { ...t, status: status as TaskStatus } : t));
        }
        return old;
      });
      return { previousTasks };
    },
    onSuccess: (res: any, variables: any) => {
      const updated = res?.data;
      if (updated) {
        queryClient.setQueryData(['tasks-kanban-all'], (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((t: Task) =>
            t.id === variables.id ? { ...t, ...updated, status: (updated.status || variables.status) as TaskStatus } : t
          );
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      setStatusModalVisible(false);
      setStatusTask(null);
      setTargetStatus(null);
      setHoveredColumn(null);
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks-kanban-all'], context.previousTasks);
      }
      console.error('Error updating task status', err);
      showError('Error al Mover Tarea', 'No se pudo actualizar el estado de la tarea en el servidor.');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] }),
  });

  const duplicateTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] }),
  });

  const restoreTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.restore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] }),
  });

  const forceDeleteTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.forceDelete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] }),
  });

  const handleToggleTaskCheck = async (task: Task) => {
    const isCompleted = task.status === 'completada' || (task as any).estado === 'COMPLETADA';
    const nextStatus = isCompleted ? 'pendiente' : 'completada';
    await updateStatusMutation.mutateAsync({ id: task.id, status: nextStatus });
  };

  const handleRescheduleToToday = async (task: Task) => {
    await updateTaskMutation.mutateAsync({
      id: task.id,
      dto: { execution_date: todayStr, due_date: todayStr },
    });
  };

  const handleQuickAdd = async (sectionKey: string) => {
    if (!quickTaskTitle.trim()) return;
    const isForToday = sectionKey === 'hoy';
    await createTaskMutation.mutateAsync({
      title: quickTaskTitle.trim(),
      titulo: quickTaskTitle.trim(),
      execution_date: isForToday ? todayStr : undefined,
      due_date: isForToday ? todayStr : undefined,
      status: sectionKey === 'en_progreso' ? 'en_progreso' : 'pendiente',
      priority: 'media',
    });
  };

  // Base filtered tasks. Role-based visibility (admin sees everything, jefe
  // sees what they assigned + their own, colaborador sees their scoped set)
  // is enforced server-side (GET /tasks) — mirror the web client and trust
  // that response instead of re-filtering with a separate, divergent rule
  // here, which is what caused mobile and web to show different tasks.
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t: Task) => {
      if (t.status === 'eliminada') return false;

      // Overdue filter
      if (t.status !== 'completada') {
        const d = t.due_date
          ? String(t.due_date).split('T')[0]
          : t.fechaVencimiento
          ? String(t.fechaVencimiento).split('T')[0]
          : null;
        const isOverdue = d ? d < todayStr : false;

        if (overdueFilter === 'vigentes' && isOverdue) return false;
        if (overdueFilter === 'vencidas' && !isOverdue) return false;
      }

      // Additional "only my tasks" toggle (for admins/jefes who want to narrow down)
      if (onlyMyTasks && currentUser?.id && (isAdmin || isSuperAdmin || isJefe)) {
        const isAssigned =
          t.assignee_id === currentUser.id ||
          t.assignee?.id === currentUser.id ||
          t.assignees?.some((a) => a.user?.id === currentUser.id || (a as any).userId === currentUser.id);
        if (!isAssigned) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (t.title || t.titulo || '').toLowerCase().includes(q);
        const descMatch = (t.description || t.descripcion || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      // Catalog filters
      if (selectedAssignee !== null) {
        const matchesMain = t.assignee_id === selectedAssignee || t.assignee?.id === selectedAssignee;
        const matchesMultiple = t.assignees?.some((a) => a.user?.id === selectedAssignee || (a as any).userId === selectedAssignee);
        if (!matchesMain && !matchesMultiple) return false;
      }
      if (selectedCategory !== null && t.category?.id !== selectedCategory) return false;
      // Project / Planificación filter
      if (selectedPlanId !== null) {
        const matchesGantt = t.gantt_item_id === selectedPlanId || t.gantt_item?.id === selectedPlanId;
        const matchesGroup = t.group_id === selectedPlanId || t.groupId === selectedPlanId;
        if (!matchesGantt && !matchesGroup) return false;
      }

      // Date Horizon Filter (Hoy | Semana | Mes | Próximas | Todas)
      if (dateHorizon !== 'todas') {
        const d = t.due_date
          ? String(t.due_date).split('T')[0]
          : t.fechaVencimiento
          ? String(t.fechaVencimiento).split('T')[0]
          : t.execution_date
          ? String(t.execution_date).split('T')[0]
          : null;

        if (!d) return false;

        const taskDate = dayjs(d);
        const today = dayjs(todayStr);

        if (dateHorizon === 'hoy') {
          if (d !== todayStr) return false;
        } else if (dateHorizon === 'semana') {
          if (!taskDate.isSame(today, 'week')) return false;
        } else if (dateHorizon === 'mes') {
          if (!taskDate.isSame(today, 'month')) return false;
        } else if (dateHorizon === 'proximas') {
          if (d <= todayStr) return false;
        }
      }

      return true;
    });
  }, [allTasks, searchQuery, selectedAssignee, selectedCategory, selectedPriority, selectedPlanId, dateHorizon, overdueFilter, onlyMyTasks, currentUser, todayStr, isSuperAdmin, isAdmin, isJefe]);

  // Grouped tasks for Asana-style List View
  const listSections = useMemo(() => {
    const hoy: Task[] = [];
    const enProgreso: Task[] = [];
    const pendientes: Task[] = [];
    const bloqueadas: Task[] = [];
    const completadas: Task[] = [];

    filteredTasks.forEach((t) => {
      const d = t.due_date
        ? String(t.due_date).split('T')[0]
        : t.fechaVencimiento
        ? String(t.fechaVencimiento).split('T')[0]
        : null;
      const isDueToday = d === todayStr;

      if (t.status === 'completada') {
        completadas.push(t);
      } else if (t.status === 'bloqueada') {
        bloqueadas.push(t);
      } else if (isDueToday) {
        hoy.push(t);
      } else if (t.status === 'en_progreso' || t.status === 'en_revision') {
        enProgreso.push(t);
      } else {
        pendientes.push(t);
      }
    });

    return [
      { key: 'hoy', title: 'Para hacer hoy', icon: 'flame', color: '#F59E0B', tasks: hoy },
      { key: 'en_progreso', title: 'Asignadas recientemente / En curso', icon: 'play-circle', color: '#3B82F6', tasks: enProgreso },
      { key: 'pendientes', title: 'Para hacer más tarde / Próximas', icon: 'calendar', color: '#94A3B8', tasks: pendientes },
      { key: 'bloqueadas', title: 'Bloqueadas', icon: 'alert-circle', color: '#EF4444', tasks: bloqueadas },
      { key: 'completadas', title: 'Completadas', icon: 'checkmark-circle', color: '#10B981', tasks: completadas },
    ];
  }, [filteredTasks, todayStr]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenStatusModal = (task: Task, status: TaskStatus) => {
    setStatusTask(task);
    setTargetStatus(status);
    setStatusModalVisible(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalVisible(true);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedAssignee !== null ||
    selectedCategory !== null ||
    selectedPriority !== null ||
    overdueFilter !== 'all' ||
    dateHorizon !== 'todas' ||
    onlyMyTasks ||
    selectedPlanId !== null;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedAssignee(null);
    setSelectedCategory(null);
    setSelectedPriority(null);
    setOverdueFilter('all');
    setDateHorizon('todas');
    setOnlyMyTasks(false);
    setSelectedPlanId(null);
    setSelectedPlanName('Todas las planificaciones');
  };

  // Render a clean, compact task row (larger text, small vertical space)
  const renderTaskRow = (task: Task) => {
    const isCompleted = task.status === 'completada';
    const isBlocked = task.status === 'bloqueada';
    const pColor = PRIORITY_COLORS[task.priority as PriorityLevel] || colors.primary;

    const dueDate = task.due_date
      ? String(task.due_date).split('T')[0]
      : task.fechaVencimiento
      ? String(task.fechaVencimiento).split('T')[0]
      : null;
    const isOverdue = dueDate ? dueDate < todayStr && !isCompleted : false;
    const isDueToday = dueDate === todayStr && !isCompleted;

    const assignees = task.assignees && task.assignees.length > 0
      ? task.assignees.map((a) => a.user).filter(Boolean)
      : task.assignee
      ? [task.assignee]
      : [];

    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskRow,
          {
            backgroundColor: colors.bgSecondary,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
        onPress={() => {
          setDetailTask(task);
          setDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        {/* Checkbox button */}
        <TouchableOpacity
          style={styles.checkTouch}
          onPress={() => handleToggleTaskCheck(task)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={isCompleted ? colors.mint : isBlocked ? colors.danger : colors.textMuted}
          />
        </TouchableOpacity>

        {/* Task Title & Subtitle */}
        <View style={styles.taskInfoCol}>
          <Text
            style={[
              styles.taskTitleText,
              { color: colors.textPrimary },
              isCompleted && { textDecorationLine: 'line-through', color: colors.textMuted },
            ]}
            numberOfLines={1}
          >
            {task.title || task.titulo}
          </Text>

          <View style={styles.taskMetaRow}>
            {task.category?.name ? (
              <Text style={[styles.taskSubText, { color: colors.textMuted }]} numberOfLines={1}>
                {task.category.name}
              </Text>
            ) : task.gantt_item?.title ? (
              <Text style={[styles.taskSubText, { color: colors.primary }]} numberOfLines={1}>
                📊 {task.gantt_item.title}
              </Text>
            ) : (
              <Text style={[styles.taskSubText, { color: colors.textMuted }]} numberOfLines={1}>
                Tareas pendientes personales
              </Text>
            )}
          </View>
        </View>

        {/* Right Info: Assignee + Priority Dot + Date Pill */}
        <View style={styles.taskRightBox}>
          {/* Due date badge */}
          {dueDate && (
            <View
              style={[
                styles.dateBadge,
                { backgroundColor: colors.bgSurface },
                isOverdue && { backgroundColor: colors.dangerMuted },
                isDueToday && { backgroundColor: '#FEF3C7' },
              ]}
            >
              <Text
                style={[
                  styles.dateBadgeText,
                  { color: colors.textMuted },
                  isOverdue && { color: colors.danger, fontWeight: '800' },
                  isDueToday && { color: '#D97706', fontWeight: '800' },
                ]}
              >
                {isDueToday ? 'Hoy' : dayjs(dueDate).format('DD MMM')}
              </Text>
            </View>
          )}

          {/* Priority indicator */}
          <View style={[styles.priorityDot, { backgroundColor: pColor }]} />

          {/* Assignee Avatar */}
          <View style={styles.avatarMiniBox}>
            {assignees.length > 0 ? (
              <View style={[styles.avatarMiniCircle, { backgroundColor: colors.primaryMuted }]}>
                <Text style={[styles.avatarMiniText, { color: colors.primary }]}>
                  {assignees[0]?.emoji || (assignees[0]?.nombre || assignees[0]?.name || 'U')[0].toUpperCase()}
                </Text>
              </View>
            ) : (
              <Ionicons name="person-circle-outline" size={20} color={colors.textMuted} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Progress percent for header circular ring
  const completedPercent = useMemo(() => {
    if (!allTasks || allTasks.length === 0) return 14;
    const comp = allTasks.filter((t: Task) => t.status === 'completada').length;
    return Math.max(1, Math.round((comp / allTasks.length) * 100));
  }, [allTasks]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* ─── Colab Modern App Header (Brand, Selectors, Quick Task Input) ─── */}
      <AppHeader
        selectedProjectId={selectedPlanId}
        selectedProjectName={selectedPlanName}
        onSelectProject={(id, name) => {
          setSelectedPlanId(id);
          setSelectedPlanName(name);
        }}
        onQuickAdd={() => {
          setEditingTask(null);
          setTaskModalVisible(true);
        }}
        onTaskCreated={async (newTitle) => {
          try {
            await createTaskMutation.mutateAsync({
              title: newTitle,
              titulo: newTitle,
              execution_date: todayStr,
              gantt_item_id: selectedPlanId || undefined,
              status: 'pendiente',
              priority: 'media',
            });
          } catch (e) {
            console.log('Error creating task from header', e);
          }
        }}
        onFilterPress={() => setFilterMenuOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />



      {/* Main Content: List (Asana style) or Kanban Board */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando tareas...</Text>
        </View>
      ) : viewMode === 'list' ? (
        /* ASANA-STYLE ACCORDION LIST */
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollListContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {listSections.map((sec) => {
            const isCollapsed = !!collapsedSections[sec.key];
            const isAdding = quickAddSection === sec.key;

            return (
              <View key={sec.key} style={styles.sectionContainer}>
                {/* Section Header Accordion */}
                <TouchableOpacity
                  style={[styles.sectionHeader, { borderBottomColor: colors.borderSubtle }]}
                  onPress={() => toggleSection(sec.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons
                      name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                      {sec.title}
                    </Text>
                    <View style={[styles.sectionCountPill, { backgroundColor: colors.bgSecondary }]}>
                      <Text style={[styles.sectionCountText, { color: colors.textSecondary }]}>
                        {sec.tasks.length}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.sectionAddBtn}
                    onPress={() => {
                      setQuickAddSection(sec.key);
                      setQuickTaskTitle('');
                    }}
                  >
                    <Ionicons name="add" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Section Tasks */}
                {!isCollapsed && (
                  <View style={styles.sectionTasksBox}>
                    {sec.tasks.map((task) => renderTaskRow(task))}

                      {/* Inline Quick Add Field */}
                      {isAdding && (
                        <View style={[styles.inlineAddRow, { backgroundColor: colors.bgSecondary, borderColor: colors.primary }]}>
                          <TextInput
                            style={[styles.inlineAddInput, { color: colors.textPrimary }]}
                            placeholder="Nombre de la tarea..."
                            placeholderTextColor={colors.textMuted}
                            value={quickTaskTitle}
                            onChangeText={setQuickTaskTitle}
                            autoFocus
                            onSubmitEditing={() => handleQuickAdd(sec.key)}
                          />
                          <TouchableOpacity
                            style={[styles.inlineAddSubmit, { backgroundColor: colors.primary }]}
                            onPress={() => handleQuickAdd(sec.key)}
                          >
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.inlineAddCancel}
                            onPress={() => setQuickAddSection(null)}
                          >
                            <Ionicons name="close" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Add custom section button at bottom */}
          <TouchableOpacity
            style={[styles.addCustomSectionBtn, { borderColor: colors.border }]}
            onPress={() => {
              setEditingTask(null);
              setTaskModalVisible(true);
            }}
          >
            <Ionicons name="reorder-two-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.addCustomSectionText, { color: colors.textSecondary }]}>
              Agregar una sección personalizada
            </Text>
          </TouchableOpacity>

          <View style={{ height: 110 }} />
        </ScrollView>
      ) : (
        /* REAL DRAG & DROP KANBAN BOARD */
        <DraggableKanbanBoard
          tasks={filteredTasks}
          todayStr={todayStr}
          hoveredColumn={hoveredColumn}
          setHoveredColumn={setHoveredColumn}
          onDragStateChange={setIsDraggingTask}
          onStatusChange={async (taskId, newStatus) => {
            await updateStatusMutation.mutateAsync({ id: taskId, status: newStatus });
          }}
          onCardPress={(task) => {
            setDetailTask(task);
            setDetailModalVisible(true);
          }}
          onMovePress={(task) => setQuickMoveTask(task)}
          onAddToColumn={() => {
            setEditingTask(null);
            setTaskModalVisible(true);
          }}
        />
      )}

      {/* Floating Bottom Switcher Toolbar (Asana style) */}
      <View style={styles.floatingToolbarContainer}>
        <View
          style={[
            styles.floatingBar,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Filters button */}
          <TouchableOpacity
            style={[styles.toolBtn, hasActiveFilters && { backgroundColor: colors.primaryMuted }]}
            onPress={() => setFilterMenuOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={hasActiveFilters ? 'funnel' : 'funnel-outline'}
              size={18}
              color={hasActiveFilters ? colors.primary : colors.textPrimary}
            />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>

          {/* View mode switcher (Opens Asana "Elegir una vista" bottom sheet) */}
          <TouchableOpacity
            style={[styles.modeSwitcherBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
            onPress={() => setViewSelectorOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={viewMode === 'list' ? 'reorder-four-outline' : 'grid-outline'}
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.modeSwitcherText, { color: colors.textPrimary }]}>
              {viewMode === 'list' ? 'Lista' : 'Tablero'}
            </Text>
            <Ionicons name="swap-vertical" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <BottomNavBar
        onCenterPlusPress={() => setCreateMenuVisible(true)}
      />

      {/* Iron Man Assistant — rendered last so it's above all content */}
      {viewMode === 'list' && (
        <IronManGuide
          tasks={allTasks}
          viewMode={viewMode}
          userId={currentUser?.id}
          isAdminOrJefe={isAdmin || isJefe}
          isGrabbing={isDraggingTask}
        />
      )}

      {/* Asana-style "Elegir una vista" Bottom Sheet Modal */}
      {viewSelectorOpen && (
        <Modal visible={viewSelectorOpen} transparent animationType="slide" onRequestClose={() => setViewSelectorOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setViewSelectorOpen(false)}>
            <View style={[styles.viewSelectorSheet, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              {/* Drag handle */}
              <View style={styles.sheetHandleBox}>
                <View style={[styles.sheetHandlePill, { backgroundColor: colors.border }]} />
              </View>

              <Text style={[styles.viewSelectorTitle, { color: colors.textPrimary }]}>Elegir una vista</Text>

              {/* Main Views */}
              <TouchableOpacity
                style={[styles.viewOptionRow, viewMode === 'list' && { backgroundColor: colors.primaryMuted }]}
                onPress={() => {
                  setViewMode('list');
                  setViewSelectorOpen(false);
                }}
              >
                <Ionicons name="reorder-four-outline" size={20} color={colors.primary} />
                <Text style={[styles.viewOptionText, { color: colors.textPrimary }, viewMode === 'list' && { fontWeight: '800', color: colors.primary }]}>
                  Lista
                </Text>
                {viewMode === 'list' && <Ionicons name="checkmark" size={18} color={colors.primary} style={styles.viewCheckmark} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewOptionRow, viewMode === 'kanban' && { backgroundColor: colors.primaryMuted }]}
                onPress={() => {
                  setViewMode('kanban');
                  setViewSelectorOpen(false);
                }}
              >
                <Ionicons name="grid-outline" size={20} color={colors.primary} />
                <Text style={[styles.viewOptionText, { color: colors.textPrimary }, viewMode === 'kanban' && { fontWeight: '800', color: colors.primary }]}>
                  Tablero (Kanban)
                </Text>
                {viewMode === 'kanban' && <Ionicons name="checkmark" size={18} color={colors.primary} style={styles.viewCheckmark} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewOptionRow}
                onPress={() => {
                  setViewSelectorOpen(false);
                  navigation.navigate('Calendar');
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.viewOptionText, { color: colors.textPrimary }]}>
                  Calendario
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.viewCheckmark} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewOptionRow}
                onPress={() => {
                  setViewSelectorOpen(false);
                  navigation.navigate('Gantt');
                }}
              >
                <Ionicons name="layers-outline" size={20} color={colors.primary} />
                <Text style={[styles.viewOptionText, { color: colors.textPrimary }]}>
                  Cronograma (Gantt)
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.viewCheckmark} />
              </TouchableOpacity>

              {/* Other Views section */}
              <Text style={[styles.viewSubHeader, { color: colors.textMuted }]}>Vistas adicionales</Text>

              <TouchableOpacity
                style={styles.viewOptionRow}
                onPress={() => {
                  setViewSelectorOpen(false);
                  navigation.navigate('Dashboard');
                }}
              >
                <Ionicons name="stats-chart-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.viewOptionText, { color: colors.textPrimary }]}>
                  Panel & Métricas
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.viewCheckmark} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewOptionRow}
                onPress={() => {
                  setViewSelectorOpen(false);
                  navigation.navigate('Agenda');
                }}
              >
                <Ionicons name="sparkles-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.viewOptionText, { color: colors.textPrimary }]}>
                  Bitácora & Agenda IA
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.viewCheckmark} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Quick Move Status Modal (For Kanban) */}
      {quickMoveTask && (
        <Modal visible={!!quickMoveTask} transparent animationType="fade" onRequestClose={() => setQuickMoveTask(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setQuickMoveTask(null)}>
            <View style={[styles.quickMoveSheet, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Mover Tarea</Text>
              <Text style={[styles.sheetSub, { color: colors.textMuted }]}>{quickMoveTask.title || quickMoveTask.titulo}</Text>

              <View style={styles.sheetOptions}>
                {COLUMNS.map((col) => {
                  const isCurrent = quickMoveTask.status === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[
                        styles.sheetOptionBtn,
                        { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                        isCurrent && { borderColor: col.color, backgroundColor: col.color + '15' },
                      ]}
                      onPress={async () => {
                        await updateStatusMutation.mutateAsync({ id: quickMoveTask.id, status: col.id });
                        setQuickMoveTask(null);
                      }}
                    >
                      <Ionicons name={col.icon} size={18} color={col.color} />
                      <Text style={[styles.sheetOptionText, { color: colors.textPrimary }, isCurrent && { color: col.color, fontWeight: '800' }]}>
                        {col.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Task Creation Modal */}
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
        onCategoryCreated={() => queryClient.invalidateQueries({ queryKey: ['categories-list'] })}
        onSave={async (taskData) => {
          if (editingTask) {
            await updateTaskMutation.mutateAsync({ id: editingTask.id, dto: taskData });
          } else {
            await createTaskMutation.mutateAsync(taskData);
          }
        }}
      />

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
            handleOpenStatusModal(t, 'bloqueada');
          } else {
            await updateStatusMutation.mutateAsync({ id: t.id, status: nextSt });
            setDetailModalVisible(false);
          }
        }}
        onDuplicate={async (id) => {
          await duplicateTaskMutation.mutateAsync(id);
        }}
        onDelete={async (id) => {
          await deleteTaskMutation.mutateAsync(id);
        }}
        onRestore={async (id) => {
          await restoreTaskMutation.mutateAsync(id);
        }}
        onForceDelete={async (id) => {
          await forceDeleteTaskMutation.mutateAsync(id);
        }}
        onRescheduleToday={(t) => handleRescheduleToToday(t)}
      />

      {/* Status Reason Modal */}
      <TaskStatusModal
        visible={statusModalVisible}
        onClose={() => {
          setStatusModalVisible(false);
          setStatusTask(null);
        }}
        task={statusTask}
        targetStatus={targetStatus}
        onConfirm={async ({ id, status, description }) => {
          await updateStatusMutation.mutateAsync({ id, status, description });
        }}
      />

      {/* Filter Bottom Sheet Modal */}
      {filterMenuOpen && (
        <Modal visible={filterMenuOpen} transparent animationType="slide" onRequestClose={() => setFilterMenuOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterMenuOpen(false)}>
            <View style={[styles.filterSheet, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Filtros Avanzados</Text>

              {/* Plazo / Fecha (Horizonte Temporal) */}
              <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Plazo / Fecha</Text>
              <View style={styles.filterChipRow}>
                {[
                  { id: 'hoy', label: '📅 Hoy' },
                  { id: 'semana', label: '🗓️ Esta Semana' },
                  { id: 'mes', label: '📆 Este Mes' },
                  { id: 'proximas', label: '⏳ Próximas' },
                  { id: 'todas', label: 'Todas' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                      dateHorizon === item.id && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                    ]}
                    onPress={() => setDateHorizon(item.id as any)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: colors.textSecondary },
                        dateHorizon === item.id && { color: colors.primary, fontWeight: '800' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Overdue filter */}
              <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Vigencia</Text>
              <View style={styles.filterChipRow}>
                {[
                  { id: 'vigentes', label: '✨ Vigentes' },
                  { id: 'vencidas', label: '🔴 Vencidas' },
                  { id: 'all', label: 'Todas' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                      overdueFilter === item.id && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                    ]}
                    onPress={() => setOverdueFilter(item.id as any)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: colors.textSecondary },
                        overdueFilter === item.id && { color: colors.primary, fontWeight: '800' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Priority Filter */}
              <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Prioridad</Text>
              <View style={styles.filterChipRow}>
                {(['muy_alta', 'alta', 'media', 'baja', 'muy_baja'] as PriorityLevel[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                      selectedPriority === p && { backgroundColor: PRIORITY_COLORS[p] + '25', borderColor: PRIORITY_COLORS[p] },
                    ]}
                    onPress={() => setSelectedPriority(selectedPriority === p ? null : p)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: colors.textSecondary },
                        selectedPriority === p && { color: PRIORITY_COLORS[p], fontWeight: '800' },
                      ]}
                    >
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Clear & Apply */}
              <View style={styles.filterSheetFooter}>
                <TouchableOpacity style={styles.clearFiltersBtn} onPress={handleClearFilters}>
                  <Text style={[styles.clearFiltersText, { color: colors.danger }]}>Limpiar Filtros</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyFiltersBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setFilterMenuOpen(false)}
                >
                  <Text style={styles.applyFiltersText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Create Chooser Sheet (Tasks or Projects) */}
      {createMenuVisible && (
        <Modal
          visible={createMenuVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCreateMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCreateMenuVisible(false)}
          >
            <View style={[styles.createChooserSheet, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <View style={styles.sheetHandleBox}>
                <View style={[styles.sheetHandlePill, { backgroundColor: colors.border }]} />
              </View>

              <Text style={[styles.createChooserTitle, { color: colors.textPrimary }]}>¿Qué deseas crear?</Text>
              <Text style={[styles.createChooserSubtitle, { color: colors.textMuted }]}>
                Selecciona el tipo de elemento a registrar
              </Text>

              <View style={styles.createOptionsList}>
                {/* 1. Nueva Tarea */}
                <TouchableOpacity
                  style={[styles.createOptionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                  onPress={() => {
                    setCreateMenuVisible(false);
                    setEditingTask(null);
                    setTaskModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.createOptionIconCircle, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name="checkbox-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.createOptionTextCol}>
                    <Text style={[styles.createOptionTitle, { color: colors.textPrimary }]}>Nueva Tarea</Text>
                    <Text style={[styles.createOptionDesc, { color: colors.textSecondary }]}>
                      Crear tarea con fecha límite, asignados y prioridad
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* 2. Nuevo Proyecto / Plan */}
                <TouchableOpacity
                  style={[styles.createOptionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                  onPress={() => {
                    setCreateMenuVisible(false);
                    setEditingGanttItem(null);
                    setGanttModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.createOptionIconCircle, { backgroundColor: '#8B5CF622' }]}>
                    <Ionicons name="layers-outline" size={22} color="#8B5CF6" />
                  </View>
                  <View style={styles.createOptionTextCol}>
                    <Text style={[styles.createOptionTitle, { color: colors.textPrimary }]}>Nuevo Proyecto / Plan</Text>
                    <Text style={[styles.createOptionDesc, { color: colors.textSecondary }]}>
                      Crear planificación, campaña o cronograma
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Gantt Project Modal */}
      <GanttModal
        visible={ganttModalVisible}
        onClose={() => {
          setGanttModalVisible(false);
          setEditingGanttItem(null);
        }}
        initialItem={editingGanttItem}
        groups={groups}
        onSubmit={async (data) => {
          await createGanttMutation.mutateAsync(data);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subHeaderControls: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageMainTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  scopeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  dateFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dateFilterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePillText: {
    fontSize: 12.5,
    letterSpacing: -0.2,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    paddingBottom: 110,
  },
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionCountPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionAddBtn: {
    padding: 3,
  },
  sectionTasksBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  checkTouch: {
    padding: 2,
  },
  taskInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  taskSubText: {
    fontSize: 10,
    fontWeight: '600',
  },
  taskRightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  avatarMiniBox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  quickAddTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickAddTriggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inlineAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
    gap: 8,
  },
  inlineAddInput: {
    flex: 1,
    fontSize: 14,
  },
  inlineAddSubmit: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddCancel: {
    padding: 4,
  },
  addCustomSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  addCustomSectionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dropzoneBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  dropzoneTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  dropzoneChips: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  dropzoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropzoneChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  kanbanScroll: {
    flex: 1,
  },
  kanbanScrollContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 110,
  },
  kanbanColumn: {
    width: COLUMN_WIDTH,
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '100%',
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  colHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  colBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  colBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  colTasksScroll: {
    padding: 10,
  },
  kanbanCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  kanbanCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  dragHandleBtn: {
    padding: 2,
  },
  quickStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  quickColPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickColPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  kanbanCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  kanbanCardLeftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  kanbanCardDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  moveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  moveChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyColBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyColText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  floatingToolbarContainer: {
    position: 'absolute',
    bottom: 74,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  toolBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  modeSwitcherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  modeSwitcherText: {
    fontSize: 13,
    fontWeight: '800',
  },
  floatingAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  viewSelectorSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 6,
  },
  sheetHandleBox: {
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetHandlePill: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  viewSelectorTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  viewOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 12,
  },
  viewOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  viewCheckmark: {
    marginLeft: 'auto',
  },
  viewSubHeader: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  quickMoveSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  sheetSub: {
    fontSize: 13,
    marginBottom: 6,
  },
  sheetOptions: {
    gap: 8,
  },
  sheetOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterSheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  clearFiltersBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyFiltersBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFiltersText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  createChooserSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  createChooserTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  createChooserSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  createOptionsList: {
    gap: 10,
  },
  createOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  createOptionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createOptionTextCol: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  createOptionDesc: {
    fontSize: 11.5,
    lineHeight: 15,
  },
});

export default KanbanScreen;
