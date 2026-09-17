import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import { projectsApi } from '../api/projects.api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { STATUS_LABELS, STATUS_COLORS, TaskStatus } from '../types';
import type { Task, Project } from '../types';

interface TrashModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { canForceDelete, isAdmin, isJefe, isSuperAdmin } = useAuth();
  const { showConfirm, showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'tasks' | 'projects'>('tasks');

  // Fetch trash tasks
  const { data: trashTasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['trash-tasks'],
    queryFn: () => tasksApi.getTrash().then((res) => res.data || []),
    enabled: visible,
  });

  // Fetch trash projects
  const { data: rawTrashProjects, isLoading: isLoadingProjects, refetch: refetchProjects } = useQuery<any>({
    queryKey: ['trash-projects'],
    queryFn: () => projectsApi.getTrash().then((res) => res.data || []),
    enabled: visible,
  });

  const trashProjects: Project[] = Array.isArray(rawTrashProjects)
    ? rawTrashProjects
    : rawTrashProjects?.data || [];

  // Task Mutations
  const restoreTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      showSuccess('Tarea Restaurada', 'La tarea volvió a su estado original.');
    },
    onError: (err: any) => {
      showError('Error al restaurar', err.response?.data?.message || 'No se pudo restaurar la tarea');
    },
  });

  const forceDeleteTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.forceDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-tasks'] });
      showSuccess('Eliminada', 'La tarea fue eliminada definitivamente.');
    },
    onError: (err: any) => {
      showError('Error al eliminar', err.response?.data?.message || 'No se pudo eliminar permanentemente');
    },
  });

  // Project Mutations
  const restoreProjectMutation = useMutation({
    mutationFn: (id: number) => projectsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      showSuccess('Proyecto Restaurado', 'El proyecto y sus tareas asociadas han sido restaurados.');
    },
    onError: (err: any) => {
      showError('Error al restaurar', err.response?.data?.message || 'No se pudo restaurar el proyecto');
    },
  });

  const forceDeleteProjectMutation = useMutation({
    mutationFn: (id: number) => projectsApi.forceDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showSuccess('Proyecto Eliminado', 'El proyecto fue eliminado definitivamente.');
    },
    onError: (err: any) => {
      showError('Error al eliminar', err.response?.data?.message || 'No se pudo eliminar permanentemente');
    },
  });

  const calculateDaysRemaining = (dateString?: string) => {
    if (!dateString) return 30;
    const deletedDate = new Date(dateString);
    const expirationDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffDays = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handlePromptForceDeleteTask = (task: Task) => {
    showConfirm({
      title: 'Eliminar Permanentemente',
      message: `¿Estás seguro de eliminar definitivamente "${task.title || task.titulo}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar para siempre',
      isDestructive: true,
      icon: 'trash',
      onConfirm: () => {
        forceDeleteTaskMutation.mutate(task.id);
      },
    });
  };

  const handlePromptForceDeleteProject = (project: Project) => {
    showConfirm({
      title: 'Eliminar Proyecto Permanentemente',
      message: `¿Estás seguro de eliminar definitivamente "${project.nombre || project.name}" y sus tareas?`,
      confirmText: 'Eliminar para siempre',
      isDestructive: true,
      icon: 'trash',
      onConfirm: () => {
        forceDeleteProjectMutation.mutate(project.id);
      },
    });
  };

  const isLoading = isLoadingTasks || isLoadingProjects;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.dangerMuted }]}>
                <Ionicons name="trash" size={20} color={colors.danger} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Papelera de Reciclaje</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Elementos eliminados en los últimos 30 días
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.bgSurface }]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Retention Notice */}
          <View style={[styles.retentionBanner, { backgroundColor: colors.dangerMuted, borderColor: colors.danger }]}>
            <Ionicons name="time-outline" size={18} color={colors.danger} />
            <Text style={[styles.retentionText, { color: colors.danger }]}>
              Los elementos en la papelera se conservan durante <Text style={{ fontWeight: '800' }}>30 días</Text> antes de ser borrados automáticamente.
            </Text>
          </View>

          {/* Tabs */}
          <View style={[styles.tabsContainer, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'tasks' && { backgroundColor: colors.dangerMuted, borderColor: colors.danger },
              ]}
              onPress={() => setActiveTab('tasks')}
            >
              <Ionicons
                name="checkbox-outline"
                size={16}
                color={activeTab === 'tasks' ? colors.danger : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'tasks' ? colors.danger : colors.textSecondary },
                  activeTab === 'tasks' && { fontWeight: '800' },
                ]}
              >
                Tareas ({trashTasks.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'projects' && { backgroundColor: colors.dangerMuted, borderColor: colors.danger },
              ]}
              onPress={() => setActiveTab('projects')}
            >
              <Ionicons
                name="folder-outline"
                size={16}
                color={activeTab === 'projects' ? colors.danger : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'projects' ? colors.danger : colors.textSecondary },
                  activeTab === 'projects' && { fontWeight: '800' },
                ]}
              >
                Proyectos ({trashProjects.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* List Content */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando papelera...</Text>
              </View>
            ) : activeTab === 'tasks' ? (
              trashTasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="trash-bin-outline" size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Papelera de tareas vacía</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>No hay tareas eliminadas</Text>
                </View>
              ) : (
                trashTasks.map((t) => {
                  const daysLeft = calculateDaysRemaining(t.updatedAt || t.updated_at || t.createdAt);
                  const prevStatus = (t.estado_previo || t.estadoPrevio || 'pendiente').toLowerCase() as TaskStatus;
                  const prevStatusColor = STATUS_COLORS[prevStatus] || '#94A3B8';
                  const prevStatusLabel = STATUS_LABELS[prevStatus] || prevStatus;

                  return (
                    <View
                      key={t.id}
                      style={[styles.itemCard, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                          {t.title || t.titulo}
                        </Text>
                        <View style={styles.itemMetaRow}>
                          <View style={[styles.statusBadge, { backgroundColor: prevStatusColor + '20' }]}>
                            <View style={[styles.statusDot, { backgroundColor: prevStatusColor }]} />
                            <Text style={[styles.statusBadgeText, { color: prevStatusColor }]}>
                              Estado: {prevStatusLabel}
                            </Text>
                          </View>
                          <View style={styles.daysLeftBadge}>
                            <Ionicons name="timer-outline" size={13} color={colors.danger} />
                            <Text style={[styles.daysLeftText, { color: colors.danger }]}>
                              {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Action buttons */}
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={[styles.restoreBtn, { backgroundColor: colors.primaryMuted }]}
                          onPress={() => restoreTaskMutation.mutate(t.id)}
                          disabled={restoreTaskMutation.isPending}
                        >
                          <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                          <Text style={[styles.restoreBtnText, { color: colors.primary }]}>Restaurar</Text>
                        </TouchableOpacity>

                        {(canForceDelete || isAdmin || isJefe || isSuperAdmin) && (
                          <TouchableOpacity
                            style={[styles.forceDeleteBtn, { backgroundColor: colors.dangerMuted }]}
                            onPress={() => handlePromptForceDeleteTask(t)}
                            disabled={forceDeleteTaskMutation.isPending}
                          >
                            <Ionicons name="trash" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )
            ) : trashProjects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Papelera de proyectos vacía</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>No hay proyectos eliminados</Text>
              </View>
            ) : (
              trashProjects.map((p) => {
                const daysLeft = calculateDaysRemaining(p.deletedAt || p.updatedAt || p.createdAt);
                const taskCount = p._count?.tasks ?? (p.tasks?.length || 0);

                return (
                  <View
                    key={p.id}
                    style={[styles.itemCard, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {p.nombre || p.name}
                      </Text>
                      <View style={styles.itemMetaRow}>
                        <View style={[styles.statusBadge, { backgroundColor: (p.color || colors.primary) + '20' }]}>
                          <Ionicons name="layers-outline" size={12} color={p.color || colors.primary} />
                          <Text style={[styles.statusBadgeText, { color: p.color || colors.primary }]}>
                            {taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}
                          </Text>
                        </View>
                        <View style={styles.daysLeftBadge}>
                          <Ionicons name="timer-outline" size={13} color={colors.danger} />
                          <Text style={[styles.daysLeftText, { color: colors.danger }]}>
                            {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={[styles.restoreBtn, { backgroundColor: colors.primaryMuted }]}
                        onPress={() => restoreProjectMutation.mutate(p.id)}
                        disabled={restoreProjectMutation.isPending}
                      >
                        <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                        <Text style={[styles.restoreBtnText, { color: colors.primary }]}>Restaurar</Text>
                      </TouchableOpacity>

                      {(canForceDelete || isAdmin || isJefe || isSuperAdmin) && (
                        <TouchableOpacity
                          style={[styles.forceDeleteBtn, { backgroundColor: colors.dangerMuted }]}
                          onPress={() => handlePromptForceDeleteProject(p)}
                          disabled={forceDeleteProjectMutation.isPending}
                        >
                          <Ionicons name="trash" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '88%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  retentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  retentionText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    maxHeight: 400,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 45,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  daysLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  daysLeftText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  forceDeleteBtn: {
    padding: 7,
    borderRadius: 8,
  },
});
