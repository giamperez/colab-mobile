import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import { extractArray } from '../api/utils';
import { categoriesApi } from '../api/categories.api';
import { ganttApi } from '../api/gantt.api';
import { groupsApi } from '../api/groups.api';
import { usersApi } from '../api/users.api';
import { projectsApi } from '../api/projects.api';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskModal } from '../components/TaskModal';
import { TaskStatusModal } from '../components/TaskStatusModal';
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  PriorityLevel,
  TaskStatus,
} from '../types';
import type { Task, User } from '../types';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';

const PRIORITIES_LIST: PriorityLevel[] = [
  'muy_alta',
  'alta',
  'media',
  'baja',
  'muy_baja',
];

export const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, isDark, bgType } = useTheme();
  const [filterAssignee, setFilterAssignee] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterPriority, setFilterPriority] = useState<string>('Todas');
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus | null>(null);


  const { data: rawTasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks-dashboard-all'],
    queryFn: () => tasksApi.getAll({}).then((res) => res.data),
  });

  // Deduplicate by id. Role-based visibility (admin sees everything, jefe
  // sees what they assigned + their own, colaborador sees their scoped set)
  // is enforced server-side (GET /tasks) — mirror the web client and trust
  // that response instead of re-filtering with a separate, divergent rule
  // here, which is what caused mobile and web to show different tasks.
  const tasks: Task[] = useMemo(() => {
    const raw = extractArray<Task>(rawTasks);
    const seen = new Set<number>();
    return raw.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [rawTasks]);

  const { data: rawUsers } = useQuery({
    queryKey: ['users-list-dash'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
  });

  const { data: rawCategories } = useQuery({
    queryKey: ['categories-list-dash'],
    queryFn: () => categoriesApi.getAll().then((res) => res.data),
  });

  const { data: rawGantt } = useQuery({
    queryKey: ['gantt-list-dash'],
    queryFn: () => ganttApi.getAll().then((res) => res.data),
  });

  const { data: rawGroups } = useQuery({
    queryKey: ['groups-list-dash'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const { data: rawProjects } = useQuery({
    queryKey: ['projects-list-dash'],
    queryFn: () => projectsApi.getAll().then((res) => res.data),
  });

  const users: User[] = extractArray<User>(rawUsers);
  const categories = extractArray<any>(rawCategories);
  const ganttItems = extractArray<any>(rawGantt);
  const groups = extractArray<any>(rawGroups);
  const projects = extractArray<any>(rawProjects);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-screen'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-screen'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, description }: { id: number; status: TaskStatus; description?: string }) =>
      tasksApi.updateStatus(id, status, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-screen'] });
    },
  });

  const duplicateTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-screen'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-screen'] });
    },
  });

  const restoreTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-screen'] });
    },
  });

  const forceDeleteTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.forceDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-screen'] });
    },
  });

  const handleOpenStatusModal = (task: Task, nextStatus: TaskStatus) => {

    setStatusTask(task);
    setTargetStatus(nextStatus);
    setStatusModalVisible(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDetailModalVisible(false);
    setTaskModalVisible(true);
  };


  // General KPIs
  const stats = useMemo(() => {
    const total = tasks.length;
    const completadas = tasks.filter((t) => t.status === 'completada').length;
    const en_progreso = tasks.filter((t) => t.status === 'en_progreso').length;
    const en_revision = tasks.filter((t) => t.status === 'en_revision').length;
    const pendientes = tasks.filter((t) => t.status === 'pendiente').length;
    const bloqueadas = tasks.filter((t) => t.status === 'bloqueada').length;
    const completionRate = total > 0 ? Math.round((completadas / total) * 100) : 0;

    return {
      total,
      completadas,
      en_progreso,
      en_revision,
      pendientes,
      bloqueadas,
      completionRate,
    };
  }, [tasks]);

  // Priority Distribution
  const priorityStats = useMemo(() => {
    const counts: Record<string, number> = {};
    PRIORITIES_LIST.forEach((p) => (counts[p] = 0));
    tasks.forEach((t) => {
      if (counts[t.priority] !== undefined) {
        counts[t.priority]++;
      }
    });
    return counts;
  }, [tasks]);

  // Team Workload
  const teamWorkload = useMemo(() => {
    const map: Record<
      string,
      { id: number; name: string; emoji?: string; total: number; completed: number }
    > = {};

    tasks.forEach((t) => {
      const assignees =
        t.assignees && t.assignees.length > 0
          ? t.assignees.map((a) => a.user).filter(Boolean)
          : t.assignee
          ? [t.assignee]
          : [];

      assignees.forEach((usr: any) => {
        if (!usr?.name && !usr?.nombre) return;
        const key = usr.name || usr.nombre;
        if (!map[key]) {
          map[key] = {
            id: usr.id,
            name: key,
            emoji: usr.emoji,
            total: 0,
            completed: 0,
          };
        }
        map[key].total++;
        if (t.status === 'completada') {
          map[key].completed++;
        }
      });
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [tasks]);

  // Unique assignees for filtering
  const uniqueAssigneeNames = useMemo(() => {
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

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== 'Todos' && t.status !== filterStatus) return false;
      if (filterPriority !== 'Todas' && t.priority !== filterPriority) return false;
      if (filterAssignee !== 'Todos') {
        const hasAssignee =
          t.assignee?.nombre === filterAssignee ||
          t.assignee?.name === filterAssignee ||
          t.assignees?.some(
            (a) => a.user?.nombre === filterAssignee || a.user?.name === filterAssignee
          );
        if (!hasAssignee) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterAssignee]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: bgType !== 'none' ? 'transparent' : colors.bgPrimary },
      ]}
      edges={['top']}
    >
      <AppHeader
        title="Métricas & Analytics"
        subtitle="Rendimiento del equipo y estado de proyectos"
        onQuickAdd={() => setTaskModalVisible(true)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 8) + 85 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {/* Eficiencia */}
          <View style={[styles.kpiCard, styles.kpiCardHighlight, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabelLight}>TASA EFICIENCIA</Text>
              <Ionicons name="trending-up" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.kpiValueLight}>{stats.completionRate}%</Text>
            <Text style={styles.kpiSubtitleLight}>
              {stats.completadas} de {stats.total} tareas logradas
            </Text>
          </View>

          {/* En Progreso */}
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>EN PROCESO</Text>
              <Ionicons name="play" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>{stats.en_progreso}</Text>
            <Text style={[styles.kpiSubtitle, { color: colors.textMuted }]}>Tareas activas</Text>
          </View>

          {/* Pendientes */}
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>PENDIENTES</Text>
              <Ionicons name="time" size={16} color={colors.textSecondary} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{stats.pendientes}</Text>
            <Text style={[styles.kpiSubtitle, { color: colors.textMuted }]}>Por iniciar</Text>
          </View>

          {/* Bloqueadas */}
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>BLOQUEADAS</Text>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>{stats.bloqueadas}</Text>
            <Text style={[styles.kpiSubtitle, { color: colors.textMuted }]}>Requieren atención</Text>
          </View>
        </View>

        {/* Priority Breakdown */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="funnel-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Distribución por Prioridad</Text>
          </View>

          <View style={styles.priorityBarsContainer}>
            {PRIORITIES_LIST.map((p) => {
              const count = priorityStats[p] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              const pColor = PRIORITY_COLORS[p];
              return (
                <View key={p} style={styles.priorityRow}>
                  <View style={styles.priorityLabelRow}>
                    <View style={[styles.colorDot, { backgroundColor: pColor }]} />
                    <Text style={[styles.priorityName, { color: colors.textPrimary }]}>{PRIORITY_LABELS[p]}</Text>
                    <Text style={[styles.priorityCount, { color: colors.textSecondary }]}>{count} ({Math.round(pct)}%)</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.bgSurface }]}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.max(pct, 2)}%`, backgroundColor: pColor },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Team Workload */}
        {teamWorkload.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Carga de Trabajo del Equipo</Text>
            </View>

            <View style={styles.teamList}>
              {teamWorkload.map((m) => {
                const memberPct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
                return (
                  <View key={m.id} style={styles.memberRow}>
                    <View
                      style={[
                        styles.memberAvatar,
                        {
                          backgroundColor: colors.primaryMuted,
                          borderColor: colors.primary,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text style={[styles.memberAvatarText, { color: colors.primary }]}>
                        {m.emoji || m.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberHeader}>
                        <Text style={[styles.memberName, { color: colors.textPrimary }]}>{m.name}</Text>
                        <Text style={[styles.memberStats, { color: colors.textSecondary }]}>
                          {m.completed}/{m.total} ({memberPct}%)
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.bgSurface }]}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${Math.max(memberPct, 2)}%`, backgroundColor: colors.primary },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Filterable Tasks Table / List */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Explorador de Tareas ({filteredTasks.length})</Text>
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {uniqueAssigneeNames.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                  filterAssignee === name && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFilterAssignee(name)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: colors.textSecondary },
                    filterAssignee === name && { color: '#FFFFFF', fontWeight: '800' },
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.tasksList}>
            {filteredTasks.slice(0, 15).map((t) => {
              const pColor = PRIORITY_COLORS[t.priority] || colors.primary;
              const stColor = STATUS_COLORS[t.status] || colors.textSecondary;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.taskItem,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setDetailTask(t);
                    setDetailModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.taskItemDot, { backgroundColor: pColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {t.title || t.titulo}
                    </Text>
                    <Text style={[styles.taskItemSubtitle, { color: colors.textMuted }]}>
                      {t.assignee?.nombre || t.assignee?.name || 'Sin asignar'} •{' '}
                      {dayjs(String(t.fechaVencimiento || t.execution_date).split('T')[0]).format('DD MMM')}
                    </Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: stColor + '20' }]}>
                    <Text style={[styles.statusTagText, { color: stColor }]}>
                      {STATUS_LABELS[t.status]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNavBar />

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
        onRescheduleToday={async (t) => {
          const today = dayjs().format('YYYY-MM-DD');
          await updateTaskMutation.mutateAsync({ id: t.id, data: { execution_date: today, due_date: today } });
        }}
      />


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
        onCategoryCreated={() => queryClient.invalidateQueries({ queryKey: ['categories-list-dash'] })}
        onProjectCreated={() => queryClient.invalidateQueries({ queryKey: ['projects-list-dash'] })}
        onSave={async (taskData) => {
          if (editingTask) {
            await updateTaskMutation.mutateAsync({ id: editingTask.id, data: taskData });
          } else {
            await createTaskMutation.mutateAsync(taskData);
          }
        }}
      />

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
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  kpiCardHighlight: {
    backgroundColor: '#009497',
    borderColor: '#009497',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiLabelLight: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E2F5F3',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  kpiValueLight: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  kpiSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  kpiSubtitleLight: {
    fontSize: 11,
    color: '#CCFBF1',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  priorityBarsContainer: {
    gap: 10,
  },
  priorityRow: {
    gap: 4,
  },
  priorityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  priorityCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  teamList: {
    gap: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#009497',
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberStats: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#009497',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tasksList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  taskItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskItemSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

export default DashboardScreen;
