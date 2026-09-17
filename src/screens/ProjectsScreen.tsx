import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ganttApi } from '../api/gantt.api';
import { groupsApi } from '../api/groups.api';
import { usersApi } from '../api/users.api';
import { categoriesApi } from '../api/categories.api';
import { tasksApi } from '../api/tasks.api';
import { projectsApi } from '../api/projects.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { GanttModal } from '../components/GanttModal';
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
import type { GanttItem, Group, User, Category, Task, Project } from '../types';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';

const TYPE_ICONS: Record<string, string> = {
  campaña: 'megaphone-outline',
  lanzamiento: 'rocket-outline',
  webinar: 'mic-outline',
  programa: 'book-outline',
  tarea: 'checkbox-outline',
  evento: 'calendar-outline',
  otro: 'bookmark-outline',
};

export const ProjectsScreen = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();

  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Gantt Item Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<GanttItem | null>(null);

  // Task Modals
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [createMenuVisible, setCreateMenuVisible] = useState(false);
  const [selectedGanttForTask, setSelectedGanttForTask] = useState<GanttItem | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus | null>(null);

  // Data fetching
  const { data: rawItems, isLoading: isGanttLoading, refetch: refetchGantt } = useQuery({
    queryKey: ['gantt-items', selectedGroup],
    queryFn: () =>
      ganttApi.getAll({ group_id: selectedGroup || undefined }).then((res) => res.data),
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

  const { data: rawProjects, isLoading: isProjectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.getAll().then((res) => res.data),
  });

  const { data: rawTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks-kanban-all'],
    queryFn: () => tasksApi.getAll({ includeDeleted: 'false' }).then((res) => res.data),
  });

  const isLoading = isGanttLoading || isProjectsLoading;

  const onRefresh = async () => {
    await Promise.all([refetchGantt(), refetchProjects(), refetchTasks()]);
  };

  const items: GanttItem[] = useMemo(() => extractArray<GanttItem>(rawItems), [rawItems]);
  const groups: Group[] = useMemo(() => extractArray<Group>(rawGroups), [rawGroups]);
  const users: User[] = useMemo(() => extractArray<User>(rawUsers), [rawUsers]);
  const categories: Category[] = useMemo(() => extractArray<Category>(rawCategories), [rawCategories]);
  const projects: Project[] = useMemo(() => extractArray<Project>(rawProjects), [rawProjects]);
  const allTasks: Task[] = useMemo(() => extractArray<Task>(rawTasks), [rawTasks]);

  // Unified list of projects and Gantt items so all web-created and mobile-created projects show up
  const unifiedProjects = useMemo(() => {
    const list: any[] = [];
    const seenNames = new Set<string>();

    // 1. Standard Projects from /projects (Web & Mobile)
    projects.forEach((p) => {
      const title = p.nombre || p.name || (p as any).title || (p as any).titulo || `Proyecto #${p.id}`;
      seenNames.add(title.toLowerCase().trim());
      
      const linkedTasks = (p.tasks && p.tasks.length > 0)
        ? p.tasks
        : allTasks.filter((t: any) => t.project_id === p.id || t.projectId === p.id);

      list.push({
        id: `proj-${p.id}`,
        rawId: p.id,
        isStandardProject: true,
        title: title,
        nombre: title,
        name: title,
        description: p.descripcion || p.description || '',
        color: p.color || '#7C83FF',
        start_date: p.fechaInicio || p.startDate || p.createdAt,
        end_date: p.fechaFin || p.endDate,
        tasks: linkedTasks,
        subtasks: linkedTasks,
        type: 'Proyecto',
      });
    });

    // 2. Gantt Plans from /gantt
    items.forEach((item) => {
      const title = (item as any).name || item.nombre || item.title || (item as any).titulo || `Plan #${item.id}`;
      if (!seenNames.has(title.toLowerCase().trim())) {
        const linkedTasks = (item.tasks && item.tasks.length > 0)
          ? item.tasks
          : (item.subtasks && item.subtasks.length > 0)
          ? item.subtasks
          : allTasks.filter((t: any) => t.gantt_item_id === item.id || t.ganttItemId === item.id);

        list.push({
          ...item,
          id: `gantt-${item.id}`,
          rawId: item.id,
          isStandardProject: false,
          title: title,
          nombre: title,
          name: title,
          tasks: linkedTasks,
          subtasks: linkedTasks,
          type: item.type || (item as any).tipo || 'Plan',
        });
      }
    });

    return list;
  }, [projects, items, allTasks]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => ganttApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => ganttApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ganttApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
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
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      setTaskModalVisible(false);
      setSelectedGanttForTask(null);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, description }: { id: number; status: string; description?: string }) =>
      tasksApi.updateStatus(id, status, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
    },
  });

  const toggleProjectExpand = (id: string | number) => {
    const key = String(id);
    setExpandedProjects((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleTaskStatus = async (taskItem: any) => {
    const isDone = taskItem.status === 'completada' || taskItem.estado === 'COMPLETADA' || taskItem.is_checked;
    const nextStatus = isDone ? 'pendiente' : 'completada';
    await updateStatusMutation.mutateAsync({ id: taskItem.id, status: nextStatus });
  };

  const handleDeleteProject = (item: any) => {
    const projectName = item.title || item.nombre || item.name || item.titulo || 'Plan / Proyecto';
    Alert.alert(
      'Eliminar Plan / Proyecto',
      `¿Deseas eliminar "${projectName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (item.isStandardProject) {
              deleteProjectMutation.mutate(item.rawId);
            } else {
              deleteMutation.mutate(item.rawId || item.id);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader
        title="Planes & Proyectos"
        subtitle="Estructura de proyectos y tareas vinculadas"
        onQuickAdd={() => {
          setEditingItem(null);
          setModalVisible(true);
        }}
      />

      {/* Group Selector Filter Chips */}
      {groups.length > 0 && (
        <View style={[styles.groupFilterSection, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.borderSubtle }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupFilterContainer}>
            <TouchableOpacity
              style={[
                styles.groupChip,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                selectedGroup === null && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedGroup(null)}
            >
              <Text style={[styles.groupChipText, { color: selectedGroup === null ? colors.primary : colors.textSecondary }]}>
                Todos los Grupos
              </Text>
            </TouchableOpacity>

            {groups.map((grp) => {
              const isSelected = selectedGroup === grp.id;
              return (
                <TouchableOpacity
                  key={grp.id}
                  style={[
                    styles.groupChip,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                    isSelected && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedGroup(isSelected ? null : grp.id)}
                >
                  <Text style={[styles.groupChipText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                    {grp.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main FlatList of Project Cards */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando proyectos...</Text>
        </View>
      ) : (
        <FlatList
          data={unifiedProjects}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(insets.bottom, 8) + 85 },
          ]}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.bgSecondary }]}>
                <Ionicons name="folder-open-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin proyectos registrados</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Crea un nuevo proyecto con el botón + para empezar a planificar.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isExpanded = !!expandedProjects[item.id];
            const projectColor = item.color || colors.primary;
            const projectTasks: any[] = Array.isArray(item.tasks)
              ? item.tasks
              : Array.isArray(item.subtasks)
              ? item.subtasks
              : [];

            let displayCompleted = projectTasks.filter(
              (s) => s.status === 'completada' || s.estado === 'COMPLETADA' || s.is_checked
            ).length;
            let displayTotal = projectTasks.length;
            let progress = 0;
            if (projectTasks.length > 0) {
              progress = Math.round((displayCompleted / projectTasks.length) * 100);
            } else if (typeof item.progress === 'number') {
              progress = item.progress;
            } else if (typeof item.progreso === 'number') {
              progress = item.progreso;
            }

            const iconName = TYPE_ICONS[item.type?.toLowerCase()] || 'layers-outline';

            return (
              <View style={[styles.projectCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}>
                <TouchableOpacity style={styles.cardMain} onPress={() => toggleProjectExpand(item.id)} activeOpacity={0.75}>
                  {/* Row 1: Type badge + Project Title + Actions */}
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeftCol}>
                      <View style={[styles.typeBadge, { backgroundColor: projectColor + '18' }]}>
                        <Ionicons name={iconName as any} size={11} color={projectColor} />
                        <Text style={[styles.typeText, { color: projectColor }]}>{item.type || 'Plan'}</Text>
                      </View>
                      <Text style={[styles.projectTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title || item.nombre || item.name || item.titulo || 'Plan de Trabajo'}
                      </Text>
                    </View>

                    <View style={styles.headerActions}>
                      <TouchableOpacity
                        style={[styles.moreBtn, { backgroundColor: colors.bgSurface }]}
                        onPress={() => {
                          setEditingItem(item);
                          setModalVisible(true);
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="pencil-outline" size={13} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.moreBtn, { backgroundColor: colors.bgSurface }]}
                        onPress={() => duplicateMutation.mutate(item.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.moreBtn, { backgroundColor: colors.dangerMuted }]}
                        onPress={() => handleDeleteProject(item)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="trash-outline" size={13} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Progress Line */}
                  <View style={[styles.barTrack, { backgroundColor: colors.bgSurface }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(progress, 3)}%`,
                          backgroundColor: progress === 100 ? colors.mint : projectColor,
                        },
                      ]}
                    />
                  </View>

                  {/* Row 2: Dates (left) | Linked Tasks & Progress & Chevron (right) */}
                  <View style={styles.bottomMetaRow}>
                    <View style={styles.dateItem}>
                      <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        {dayjs(item.start_date || (item as any).startDate || item.fechaInicio).format('DD MMM')} -{' '}
                        {dayjs(item.end_date || (item as any).endDate || item.fechaFin).format('DD MMM')}
                      </Text>
                    </View>

                    <View style={styles.bottomMetaRight}>
                      <Text style={[styles.subtasksCount, { color: colors.textSecondary }]}>
                        📋 {displayCompleted}/{displayTotal} tareas
                      </Text>
                      <Text style={[styles.progressPct, { color: progress === 100 ? colors.mint : projectColor }]}>
                        {progress}%
                      </Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.subtasksSection, { backgroundColor: colors.bgSurface, borderTopColor: colors.borderSubtle }]}>
                    <View style={styles.subtasksList}>
                      {projectTasks.map((t: any) => {
                        const isDone = t.status === 'completada' || t.estado === 'COMPLETADA' || t.is_checked;
                        const pColor =
                          PRIORITY_COLORS[t.priority as PriorityLevel] ||
                          PRIORITY_COLORS[t.prioridad?.toLowerCase() as PriorityLevel] ||
                          colors.primary;

                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.subtaskRow, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
                            onPress={() => {
                              setDetailTask(t);
                              setDetailModalVisible(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <TouchableOpacity onPress={() => handleToggleTaskStatus(t)} style={styles.subtaskCheck}>
                              <View
                                style={[
                                  styles.squareCheckbox,
                                  {
                                    borderColor: isDone ? colors.mint : colors.borderSubtle,
                                    backgroundColor: isDone ? colors.mint : 'transparent',
                                  },
                                ]}
                              >
                                {isDone && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                              </View>
                            </TouchableOpacity>

                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.subtaskTitle,
                                  { color: colors.textPrimary },
                                  isDone && { textDecorationLine: 'line-through', color: colors.textMuted },
                                ]}
                                numberOfLines={1}
                              >
                                {t.title || t.titulo}
                              </Text>
                              <Text style={[styles.subtaskSub, { color: colors.textMuted }]} numberOfLines={1}>
                                {t.assignee?.nombre || t.responsable?.nombre || 'Sin asignar'} •{' '}
                                {t.due_date || t.fechaVencimiento
                                  ? dayjs(String(t.due_date || t.fechaVencimiento).split('T')[0]).format('DD MMM')
                                  : 'Sin fecha'}
                              </Text>
                            </View>

                            <View style={[styles.priorityPill, { backgroundColor: pColor + '20' }]}>
                              <Text style={[styles.priorityPillText, { color: pColor }]}>
                                {PRIORITY_LABELS[t.priority as PriorityLevel] ||
                                  PRIORITY_LABELS[t.prioridad?.toLowerCase() as PriorityLevel] ||
                                  'Media'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {projectTasks.length === 0 && (
                        <Text style={[styles.emptyTasksMsg, { color: colors.textMuted }]}>
                          No hay tareas vinculadas a este plan todavía.
                        </Text>
                      )}
                    </View>

                    <View style={styles.planActionsRow}>
                      <TouchableOpacity
                        style={[styles.addFullTaskBtn, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          setSelectedGanttForTask(item);
                          setEditingTask(null);
                          setTaskModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.addFullTaskBtnText}>Agregar Tarea al Plan</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Bottom Bar */}
      <BottomNavBar onCenterPlusPress={() => setCreateMenuVisible(true)} />

      {/* Create Chooser Sheet */}
      {createMenuVisible && (
        <Modal visible={createMenuVisible} transparent animationType="slide" onRequestClose={() => setCreateMenuVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCreateMenuVisible(false)}>
            <View style={[styles.createChooserSheet, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <View style={styles.sheetHandleBox}>
                <View style={[styles.sheetHandlePill, { backgroundColor: colors.border }]} />
              </View>
              <Text style={[styles.createChooserTitle, { color: colors.textPrimary }]}>¿Qué deseas crear?</Text>
              <Text style={[styles.createChooserSubtitle, { color: colors.textMuted }]}>Selecciona el tipo de elemento a registrar</Text>
              <View style={styles.createOptionsList}>
                <TouchableOpacity
                  style={[styles.createOptionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                  onPress={() => {
                    setCreateMenuVisible(false);
                    setSelectedGanttForTask(null);
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
                    <Text style={[styles.createOptionDesc, { color: colors.textSecondary }]}>Crear tarea con fecha límite, asignados y prioridad</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.createOptionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                  onPress={() => {
                    setCreateMenuVisible(false);
                    setEditingItem(null);
                    setModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.createOptionIconCircle, { backgroundColor: '#8B5CF622' }]}>
                    <Ionicons name="layers-outline" size={22} color="#8B5CF6" />
                  </View>
                  <View style={styles.createOptionTextCol}>
                    <Text style={[styles.createOptionTitle, { color: colors.textPrimary }]}>Nuevo Proyecto / Plan</Text>
                    <Text style={[styles.createOptionDesc, { color: colors.textSecondary }]}>Crear planificación, campaña o cronograma</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

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
        projects={projects}
        initialGanttItemId={(selectedGanttForTask as any)?.isStandardProject ? undefined : ((selectedGanttForTask as any)?.rawId || selectedGanttForTask?.id)}
        initialProjectId={(selectedGanttForTask as any)?.isStandardProject ? ((selectedGanttForTask as any)?.rawId || selectedGanttForTask?.id) : undefined}
        initialStartDate={selectedGanttForTask?.start_date || (selectedGanttForTask as any)?.startDate}
        initialDueDate={selectedGanttForTask?.end_date || (selectedGanttForTask as any)?.endDate}
        onCategoryCreated={() => queryClient.invalidateQueries({ queryKey: ['categories-list'] })}
        onProjectCreated={() => queryClient.invalidateQueries({ queryKey: ['projects-list'] })}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  groupFilterSection: {
    borderBottomWidth: 1,
  },
  groupFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 8,
  },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 12,
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
  listContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 7,
    paddingBottom: 90,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 25,
  },
  projectCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardMain: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  headerLeftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  moreBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  barTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginVertical: 1,
  },
  barFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  bottomMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '900',
  },
  subtasksCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  subtasksSection: {
    borderTopWidth: 1,
    padding: 8,
    gap: 6,
  },
  subtasksList: {
    gap: 5,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  subtaskCheck: {
    padding: 1,
  },
  squareCheckbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskTitle: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  subtaskSub: {
    fontSize: 9.5,
    marginTop: 1,
  },
  priorityPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyTasksMsg: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
  planActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  addFullTaskBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addFullTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  createChooserSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  sheetHandleBox: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  sheetHandlePill: {
    width: 36,
    height: 4,
    borderRadius: 2,
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

export default ProjectsScreen;
