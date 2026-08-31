import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  TaskStatus,
} from '../types';
import type { Task } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import dayjs from 'dayjs';

interface TaskDetailModalProps {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onDuplicate?: (taskId: number) => void;
  onDelete?: (taskId: number) => void;
  onRestore?: (taskId: number) => void;
  onForceDelete?: (taskId: number) => void;
  onRescheduleToday?: (task: Task) => void;
}

const ALL_STATUSES: TaskStatus[] = [
  'pendiente',
  'en_progreso',
  'en_revision',
  'bloqueada',
  'completada',
  'eliminada',
];

export const TaskDetailModal = ({
  visible,
  onClose,
  task,
  onEdit,
  onStatusChange,
  onDuplicate,
  onDelete,
  onRestore,
  onForceDelete,
  onRescheduleToday,
}: TaskDetailModalProps) => {
  const { colors, isDark } = useTheme();
  const { canForceDelete, isAdmin, isJefe, isSuperAdmin } = useAuth();
  const { showConfirm, showSuccess } = useNotification();
  if (!task) return null;

  const isDeleted = task.status === 'eliminada';
  const priorityColor = PRIORITY_COLORS[task.priority] || '#7C83FF';
  const statusColor = STATUS_COLORS[task.status] || '#94A3B8';

  const todayStr = dayjs().format('YYYY-MM-DD');
  const taskDueDate = task.due_date ? String(task.due_date).split('T')[0] : task.fechaVencimiento ? String(task.fechaVencimiento).split('T')[0] : null;
  const isOverdue = taskDueDate ? taskDueDate < todayStr && task.status !== 'completada' && !isDeleted : false;

  const assigneesList =
    task.assignees && task.assignees.length > 0
      ? task.assignees.map((a) => a.user).filter(Boolean)
      : task.assignee
      ? [task.assignee]
      : [];

  const formattedDueDate = task.fechaVencimiento || task.due_date || task.execution_date;

  const handleDeletePrompt = () => {
    showConfirm({
      title: 'Mover a la Papelera',
      message: '¿Deseas enviar esta tarea a la papelera? Podrás recuperarla durante 30 días.',
      confirmText: 'Mover a Papelera',
      isDestructive: true,
      icon: 'trash-outline',
      onConfirm: () => {
        if (onDelete) onDelete(task.id);
        onClose();
        showSuccess('Tarea en Papelera', 'La tarea se movió a la papelera.');
      },
    });
  };

  const handleForceDeletePrompt = () => {
    showConfirm({
      title: 'Eliminar Permanentemente',
      message: `¿Deseas eliminar definitivamente "${task.title || task.titulo}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar para siempre',
      isDestructive: true,
      icon: 'alert-circle-outline',
      onConfirm: () => {
        if (onForceDelete) onForceDelete(task.id);
        onClose();
        showSuccess('Eliminada', 'La tarea fue eliminada permanentemente.');
      },
    });
  };


  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBadges}>
              {/* Prioridad */}
              <View style={[styles.badge, { backgroundColor: priorityColor + '20' }]}>
                <View style={[styles.dot, { backgroundColor: priorityColor }]} />
                <Text style={[styles.badgeText, { color: priorityColor }]}>
                  {PRIORITY_LABELS[task.priority] || task.priority}
                </Text>
              </View>

              {/* Categoría */}
              {task.category && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: (task.category.color || colors.primary) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: task.category.color || colors.primary },
                    ]}
                  >
                    {task.category.name}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.bgSurface }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Trash retention banner if deleted */}
            {isDeleted && (
              <View
                style={[
                  styles.trashBanner,
                  {
                    backgroundColor: colors.dangerMuted,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <Ionicons name="time-outline" size={18} color={colors.danger} />
                <Text style={[styles.trashBannerText, { color: colors.danger }]}>
                  Esta tarea se encuentra en la papelera y se eliminará definitivamente de forma automática tras 30 días.
                </Text>
              </View>
            )}

            {/* Overdue alert banner if overdue */}
            {isOverdue && (
              <View
                style={[
                  styles.trashBanner,
                  {
                    backgroundColor: colors.dangerMuted,
                    borderColor: colors.danger,
                    justifyContent: 'space-between',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={[styles.trashBannerText, { color: colors.danger }]}>
                    Tarea vencida ({taskDueDate})
                  </Text>
                </View>
                {onRescheduleToday && (
                  <TouchableOpacity
                    style={{ backgroundColor: colors.danger, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                    onPress={() => {
                      onRescheduleToday(task);
                      onClose();
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Pasar a Hoy</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Título */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>{task.title || task.titulo}</Text>

            {/* Avance */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>AVANCE</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: priorityColor }}>{task.progress ?? 0}%</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bgSurface, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, task.progress ?? 0))}%`, backgroundColor: priorityColor, borderRadius: 3 }} />
              </View>
            </View>

            {/* Descripción */}
            {(task.description || task.descripcion) ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DESCRIPCIÓN</Text>
                <Text
                  style={[
                    styles.descText,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  {task.description || task.descripcion}
                </Text>
              </View>
            ) : null}

            {/* Motivo de Bloqueo (si aplica) */}
            {task.status === 'bloqueada' && task.blockReason && (
              <View
                style={[
                  styles.blockReasonBox,
                  {
                    backgroundColor: colors.dangerMuted,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.blockReasonTitle, { color: colors.danger }]}>Motivo del Bloqueo</Text>
                  <Text style={[styles.blockReasonText, { color: colors.danger }]}>{task.blockReason}</Text>
                </View>
              </View>
            )}

            {/* Estado Actual y Cambio Rápido */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ESTADO DE LA TAREA</Text>
              <View style={styles.statusRow}>
                {ALL_STATUSES.map((st) => {
                  const isCurrent = task.status === st;
                  const stCol = STATUS_COLORS[st];
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.border,
                        },
                        isCurrent && {
                          backgroundColor: stCol,
                          borderColor: stCol,
                        },
                      ]}
                      onPress={() => onStatusChange(task, st)}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: colors.textSecondary },
                          isCurrent && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        {STATUS_LABELS[st]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Responsables */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RESPONSABLES</Text>
              {assigneesList.length > 0 ? (
                <View style={styles.assigneesGrid}>
                  {assigneesList.map((usr: any, idx) => (
                    <View
                      key={usr?.id || idx}
                      style={[
                        styles.assigneeCard,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.avatarCircle, { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>
                          {usr?.emoji || (usr?.nombre || usr?.name || 'U')[0]}
                        </Text>
                      </View>
                      <Text style={[styles.assigneeName, { color: colors.textPrimary }]}>
                        {usr?.nombre || usr?.name || 'Sin nombre'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyInfo, { color: colors.textMuted }]}>Sin responsable asignado</Text>
              )}
            </View>

            {/* Fechas */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CRONOGRAMA Y FECHAS</Text>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Fecha de Vencimiento:</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {formattedDueDate
                    ? dayjs(formattedDueDate).format('DD MMM YYYY')
                    : 'Sin fecha límite'}
                </Text>
              </View>
              {task.fechaInicio ? (
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Fecha de Inicio:</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {dayjs(String(task.fechaInicio).split('T')[0]).format('DD MMM YYYY')}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Proyecto Gantt o Área */}
            {(task.gantt_item || task.group || task.groupNombre) ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ASOCIACIONES</Text>
                {task.gantt_item && (
                  <View style={styles.infoRow}>
                    <Ionicons name="layers-outline" size={16} color={colors.primary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Proyecto:</Text>
                    <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>
                      {task.gantt_item.title}
                    </Text>
                  </View>
                )}
                {(task.group || task.groupNombre) && (
                  <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Grupo:</Text>
                    <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                      {task.group?.nombre || task.group?.name || task.groupNombre}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          {isDeleted ? (
            <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={[styles.actionBtnSecondary, { flex: 1, justifyContent: 'center', backgroundColor: colors.primaryMuted }]}
                onPress={() => {
                  if (onRestore) onRestore(task.id);
                  onClose();
                }}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnTextSec, { color: colors.primary }]}>Restaurar Tarea</Text>
              </TouchableOpacity>

              {canForceDelete && (
                <TouchableOpacity
                  style={[styles.actionBtnDanger, { flexDirection: 'row', gap: 6, backgroundColor: colors.dangerMuted, borderColor: colors.danger }]}
                  onPress={handleForceDeletePrompt}
                >
                  <Ionicons name="trash" size={18} color={colors.danger} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.danger }}>Eliminar</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
              {(isAdmin || isJefe || isSuperAdmin) && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtnSecondary, { flex: 1, justifyContent: 'center', backgroundColor: colors.bgSurface }]}
                    onPress={() => {
                      if (onDuplicate) onDuplicate(task.id);
                      onClose();
                    }}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnTextSec, { color: colors.textSecondary }]} numberOfLines={1}>Duplicar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtnDanger, { backgroundColor: colors.dangerMuted, borderColor: colors.danger }]}
                    onPress={handleDeletePrompt}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.actionBtnPrimary,
                  { flex: 1, backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={() => {
                  onClose();
                  onEdit(task);
                }}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnTextPri} numberOfLines={1}>Editar Tarea</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  scrollArea: {
    maxHeight: 460,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 14,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blockReasonBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  blockReasonTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  blockReasonText: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  assigneesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assigneeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#009497',
  },
  assigneeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyInfo: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  actionBtnTextSec: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  actionBtnDanger: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#009497',
  },
  actionBtnTextPri: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  trashBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
    lineHeight: 16,
  },
});

