import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import { usersApi } from '../api/users.api';
import { categoriesApi } from '../api/categories.api';
import { ganttApi } from '../api/gantt.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { TaskModal } from '../components/TaskModal';
import { TaskStatusModal } from '../components/TaskStatusModal';
import { PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel } from '../types';
import type { Task, User, Category, GanttItem } from '../types';

export const KanbanScreen = () => {
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<
    'pendiente' | 'en_progreso' | 'bloqueada' | 'completada'
  >('pendiente');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);

  // Modals state
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<
    'pendiente' | 'en_progreso' | 'bloqueada' | 'completada' | null
  >(null);

  // Data fetching
  const { data: rawTasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks-kanban', activeStatus, selectedAssignee],
    queryFn: () =>
      tasksApi
        .getAll({
          status: activeStatus,
          assignee_id: selectedAssignee || undefined,
        })
        .then((res) => res.data),
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

  const tasks: Task[] = extractArray<Task>(rawTasks);
  const users: User[] = extractArray<User>(rawUsers);
  const categories: Category[] = extractArray<Category>(rawCategories);
  const ganttItems: GanttItem[] = extractArray<GanttItem>(rawGantt);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (dto: any) => tasksApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-dashboard'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => tasksApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-dashboard'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      description,
    }: {
      id: number;
      status: string;
      description?: string;
    }) => tasksApi.updateStatus(id, status, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-dashboard'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-dashboard'] });
    },
  });

  // Filter tasks locally by search query
  const filteredTasks = (tasks || []).filter((t: Task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.assignee?.name && t.assignee.name.toLowerCase().includes(q))
    );
  });

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setTaskModalVisible(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskModalVisible(true);
  };

  const handleSaveTask = async (taskData: any) => {
    if (editingTask) {
      await updateTaskMutation.mutateAsync({
        id: editingTask.id,
        dto: taskData,
      });
    } else {
      await createTaskMutation.mutateAsync(taskData);
    }
  };

  const handleOpenStatusModal = (
    task: Task,
    st: 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada'
  ) => {
    setStatusTask(task);
    setTargetStatus(st);
    setStatusModalVisible(true);
  };

  const handleConfirmStatusChange = async (
    id: number,
    status: string,
    description?: string
  ) => {
    await updateStatusMutation.mutateAsync({ id, status, description });
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Eliminar Tarea',
      `¿Estás seguro de eliminar la tarea "${task.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteTaskMutation.mutate(task.id),
        },
      ]
    );
  };

  const columns = [
    { id: 'pendiente', label: 'Pendientes', color: '#64748B', icon: 'time-outline' },
    { id: 'en_progreso', label: 'En Progreso', color: '#009497', icon: 'play-outline' },
    { id: 'bloqueada', label: 'Bloqueadas', color: '#EF4444', icon: 'alert-circle-outline' },
    { id: 'completada', label: 'Completadas', color: '#10B981', icon: 'checkmark-circle-outline' },
  ];

  return (
    <View style={styles.flexContainer}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tablero Kanban</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleOpenCreateModal}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Nueva Tarea</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título, asignado..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtro por Asignado */}
        <View style={styles.assigneeFilterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.userFilterPill,
                selectedAssignee === null && styles.userFilterPillActive,
              ]}
              onPress={() => setSelectedAssignee(null)}
            >
              <Text
                style={[
                  styles.userFilterText,
                  selectedAssignee === null && styles.userFilterTextActive,
                ]}
              >
                Todos los usuarios
              </Text>
            </TouchableOpacity>
            {users.map((u: User) => (
              <TouchableOpacity
                key={u.id}
                style={[
                  styles.userFilterPill,
                  selectedAssignee === u.id && styles.userFilterPillActive,
                ]}
                onPress={() => setSelectedAssignee(u.id)}
              >
                <Text style={styles.userEmoji}>{u.emoji || '👤'}</Text>
                <Text
                  style={[
                    styles.userFilterText,
                    selectedAssignee === u.id && styles.userFilterTextActive,
                  ]}
                >
                  {u.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Pestañas de Columnas */}
        <View style={styles.tabsRow}>
          {columns.map((col) => {
            const isActive = activeStatus === col.id;
            return (
              <TouchableOpacity
                key={col.id}
                style={[
                  styles.tabItem,
                  isActive && {
                    backgroundColor: col.color + '15',
                    borderColor: col.color,
                  },
                ]}
                onPress={() => setActiveStatus(col.id as any)}
              >
                <Ionicons
                  name={col.icon as any}
                  size={16}
                  color={isActive ? col.color : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.tabText,
                    isActive && { color: col.color, fontWeight: '800' },
                  ]}
                >
                  {col.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista de Tareas */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#009497" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={refetch} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="documents-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No hay tareas en esta columna</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: PRIORITY_COLORS[item.priority as PriorityLevel] || '#64748B' },
                    ]}
                  >
                    <Text style={styles.priorityBadgeText}>
                      {PRIORITY_LABELS[item.priority as PriorityLevel] || item.priority}
                    </Text>
                  </View>

                  {item.category && (
                    <View
                      style={[
                        styles.catBadge,
                        { backgroundColor: item.category.color + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catBadgeText,
                          { color: item.category.color || '#009497' },
                        ]}
                      >
                        {item.category.name}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {item.gantt_item && (
                  <View style={styles.ganttTag}>
                    <Ionicons name="bar-chart-outline" size={12} color="#534AB7" />
                    <Text style={styles.ganttTagText}>{item.gantt_item.title}</Text>
                  </View>
                )}

                <View style={styles.cardMetaRow}>
                  <View style={styles.assigneeBox}>
                    <Text style={{ fontSize: 13, marginRight: 4 }}>
                      {item.assignee?.emoji || '👤'}
                    </Text>
                    <Text style={styles.assigneeText}>
                      {item.assignee?.name || 'Sin asignar'}
                    </Text>
                  </View>

                  {item.execution_date && (
                    <View style={styles.dateBox}>
                      <Ionicons name="calendar-outline" size={12} color="#64748B" />
                      <Text style={styles.dateText}>
                        {item.execution_date.split('T')[0]}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Acciones de cambio de estado */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenEditModal(item)}
                  >
                    <Ionicons name="create-outline" size={16} color="#009497" />
                  </TouchableOpacity>

                  {item.status !== 'en_progreso' && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenStatusModal(item, 'en_progreso')}
                    >
                      <Ionicons name="play" size={14} color="#009497" />
                    </TouchableOpacity>
                  )}

                  {item.status !== 'bloqueada' && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenStatusModal(item, 'bloqueada')}
                    >
                      <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}

                  {item.status !== 'completada' && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenStatusModal(item, 'completada')}
                    >
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteTask(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <TaskModal
        visible={taskModalVisible}
        onClose={() => setTaskModalVisible(false)}
        onSubmit={handleSaveTask}
        initialTask={editingTask}
        users={users}
        categories={categories}
        ganttItems={ganttItems}
      />

      <TaskStatusModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        task={statusTask}
        targetStatus={targetStatus}
        onSubmit={handleConfirmStatusChange}
      />

      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009497',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  assigneeFilterRow: {
    marginBottom: 12,
  },
  userFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  userFilterPillActive: {
    backgroundColor: '#009497',
    borderColor: '#009497',
  },
  userEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  userFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  userFilterTextActive: {
    color: '#FFFFFF',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 10,
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  ganttTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  ganttTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#534AB7',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  assigneeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default KanbanScreen;
