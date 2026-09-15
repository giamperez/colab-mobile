import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../types';
import type { Task, User, Category, GanttItem, Group, PriorityLevel, Project } from '../types';
import { categoriesApi } from '../api/categories.api';
import { AppDatePicker } from './AppDatePicker';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (taskData: any) => Promise<void>;
  task?: Task | null;
  users: User[];
  categories: Category[];
  ganttItems?: GanttItem[];
  groups?: Group[];
  projects?: Project[];
  initialGanttItemId?: number | null;
  initialStartDate?: string;
  initialDueDate?: string;
  onCategoryCreated?: () => void;
}

const PRIORITIES: PriorityLevel[] = [
  'muy_alta',
  'alta',
  'media',
  'baja',
  'muy_baja',
];

export const TaskModal = ({
  visible,
  onClose,
  onSave,
  task,
  users = [],
  categories = [],
  ganttItems = [],
  groups = [],
  projects = [],
  initialGanttItemId,
  initialStartDate,
  initialDueDate,
  onCategoryCreated,
}: TaskModalProps) => {
  const { colors, isDark } = useTheme();
  const { showWarning, showError, showSuccess } = useNotification();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('media');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  // Combined project/plan selection: '' | `gantt-{id}` | `proj-{id}`
  const [projectSelection, setProjectSelection] = useState('');
  const [loading, setLoading] = useState(false);

  const projectOptions = React.useMemo(() => {
    const opts: { value: string; label: string; color?: string }[] = [];
    ganttItems.forEach((item) => {
      opts.push({ value: `gantt-${item.id}`, label: item.title || item.nombre || `Plan #${item.id}`, color: item.color });
    });
    projects.forEach((p) => {
      const label = p.nombre || p.name || `Proyecto #${p.id}`;
      if (!opts.some((o) => o.label.toLowerCase() === label.toLowerCase())) {
        opts.push({ value: `proj-${p.id}`, label, color: p.color });
      }
    });
    return opts;
  }, [ganttItems, projects]);

  // Inline Category Creation
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#009497');
  const [isCreatingCatLoading, setIsCreatingCatLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || task.titulo || '');
      setDescription(task.description || task.descripcion || '');
      setPriority((task.priority as any) || 'media');
      setCategoryId(task.category?.id || null);
      
      const existingAssigneeIds: number[] = [];
      if (task.assignees && task.assignees.length > 0) {
        task.assignees.forEach((a) => {
          if (a.user?.id) existingAssigneeIds.push(a.user.id);
        });
      } else if (task.assignee?.id) {
        existingAssigneeIds.push(task.assignee.id);
      } else if (task.assignee_id) {
        existingAssigneeIds.push(task.assignee_id);
      }
      setSelectedUserIds(existingAssigneeIds);

      setStartDate(
        task.execution_date
          ? String(task.execution_date).split('T')[0]
          : task.fechaInicio
          ? String(task.fechaInicio).split('T')[0]
          : ''
      );
      setDueDate(
        task.due_date
          ? String(task.due_date).split('T')[0]
          : task.fechaVencimiento
          ? String(task.fechaVencimiento).split('T')[0]
          : ''
      );
      setGroupId(task.group_id ?? task.groupId ?? null);
      const taskGanttId = task.gantt_item_id;
      const taskProjectId = task.project_id ?? task.projectId;
      setProjectSelection(taskGanttId ? `gantt-${taskGanttId}` : taskProjectId ? `proj-${taskProjectId}` : '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setDescription('');
      setPriority('media');
      setCategoryId(categories.length > 0 ? categories[0].id : null);
      setSelectedUserIds([]);
      setStartDate(initialStartDate || today);
      setDueDate(initialDueDate || today);
      setGroupId(null);
      setProjectSelection(initialGanttItemId ? `gantt-${initialGanttItemId}` : '');
    }
  }, [task, visible, categories, initialGanttItemId, initialStartDate, initialDueDate]);

  const toggleUserSelection = (userId: number) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([userId]); // standard 1 assignee in backend
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCatLoading(true);
    try {
      const res = await categoriesApi.create({
        nombre: newCategoryName.trim(),
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      setIsCreatingCategory(false);
      setNewCategoryName('');
      if (res.data?.id) {
        setCategoryId(res.data.id);
      }
      if (onCategoryCreated) onCategoryCreated();
      showSuccess('Categoría Creada', `Se creó "${newCategoryName.trim()}"`);
    } catch {
      showError('Error', 'No se pudo crear la categoría.');
    } finally {
      setIsCreatingCatLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showWarning('Campo Requerido', 'Por favor ingresa un título para la tarea.');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority,
        category_id: categoryId || (categories.length > 0 ? categories[0].id : 1),
        assignee_id: selectedUserIds.length > 0 ? selectedUserIds[0] : (users.length > 0 ? users[0].id : 1),
        execution_date: startDate || today,
        due_date: dueDate || undefined,
        group_id: groupId || undefined,
        gantt_item_id: projectSelection.startsWith('gantt-')
          ? Number(projectSelection.replace('gantt-', ''))
          : undefined,
        project_id: projectSelection.startsWith('proj-')
          ? Number(projectSelection.replace('proj-', ''))
          : undefined,
      };

      await onSave(payload);
      showSuccess('¡Tarea Guardada!', `"${title.trim()}" se guardó con éxito.`);
      onClose();
    } catch (err: any) {
      showError('Error al Guardar', err.response?.data?.message || 'No se pudo guardar la tarea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {task ? 'Editar Tarea' : 'Nueva Tarea'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.bgSurface }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TÍTULO *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="¿Qué se debe hacer?"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Descripción */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPCIÓN</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Detalles o notas adicionales..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Prioridad */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>NIVEL DE PRIORIDAD</Text>
            <View style={styles.pillGrid}>
              {PRIORITIES.map((p) => {
                const isSelected = priority === p;
                const pColor = PRIORITY_COLORS[p];
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityPill,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                      },
                      isSelected && { backgroundColor: pColor, borderColor: pColor },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: isSelected ? '#FFFFFF' : pColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityPillText,
                        { color: colors.textSecondary },
                        isSelected && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Asignar Colaboradores (Multi-select) */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>RESPONSABLES / COLABORADORES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.usersScroll}>
              {users.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.userChip,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                      },
                      isSelected && {
                        backgroundColor: colors.primaryMuted,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => toggleUserSelection(u.id)}
                  >
                    <View
                      style={[
                        styles.avatarMini,
                        { backgroundColor: colors.bgSecondary },
                        isSelected && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.avatarMiniText, { color: colors.textSecondary }, isSelected && { color: '#FFFFFF' }]}>
                        {u.emoji || (u.nombre || u.name || 'U').slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.userChipText,
                        { color: colors.textSecondary },
                        isSelected && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {u.nombre || u.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Categoría */}
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORÍA</Text>
              <TouchableOpacity onPress={() => setIsCreatingCategory(!isCreatingCategory)}>
                <Text style={[styles.actionLink, { color: colors.primary }]}>
                  {isCreatingCategory ? 'Cancelar' : '+ Nueva Categoría'}
                </Text>
              </TouchableOpacity>
            </View>

            {isCreatingCategory ? (
              <View style={styles.inlineBox}>
                <TextInput
                  style={[
                    styles.inlineInput,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Nombre de categoría..."
                  placeholderTextColor={colors.textMuted}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <TouchableOpacity
                  style={[styles.inlineCreateBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateCategory}
                  disabled={isCreatingCatLoading}
                >
                  {isCreatingCatLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.inlineCreateBtnText}>Crear</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map((c) => {
                  const isSelected = categoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.border,
                        },
                        isSelected && { backgroundColor: c.color || colors.primary, borderColor: c.color || colors.primary },
                      ]}
                      onPress={() => setCategoryId(c.id)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          { color: colors.textSecondary },
                          isSelected && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        {c.nombre || c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Fechas */}
            <View style={styles.rowDates}>
              <View style={styles.dateCol}>
                <AppDatePicker
                  label="FECHA INICIO"
                  value={startDate}
                  onChange={(d) => setStartDate(d)}
                />
              </View>
              <View style={styles.dateCol}>
                <AppDatePicker
                  label="FECHA LÍMITE"
                  value={dueDate}
                  onChange={(d) => setDueDate(d)}
                />
              </View>
            </View>

            {/* Grupo / Departamento */}
            {groups.length > 0 && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>ÁREA / GRUPO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  <TouchableOpacity
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                      },
                      groupId === null && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setGroupId(null)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: colors.textSecondary },
                        groupId === null && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      Ninguno
                    </Text>
                  </TouchableOpacity>
                  {groups.map((g) => {
                    const isSelected = groupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: colors.bgSurface,
                            borderColor: colors.border,
                          },
                          isSelected && { backgroundColor: g.color || colors.primary, borderColor: g.color || colors.primary },
                        ]}
                        onPress={() => setGroupId(g.id)}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            { color: colors.textSecondary },
                            isSelected && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {g.nombre || g.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Proyecto (planes de Gantt + proyectos registrados) */}
            {projectOptions.length > 0 && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>PROYECTO (OPCIONAL)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  <TouchableOpacity
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                      },
                      projectSelection === '' && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setProjectSelection('')}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: colors.textSecondary },
                        projectSelection === '' && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      Ninguno
                    </Text>
                  </TouchableOpacity>
                  {projectOptions.map((opt) => {
                    const isSelected = projectSelection === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: colors.bgSurface,
                            borderColor: colors.border,
                          },
                          isSelected && { backgroundColor: opt.color || colors.primary, borderColor: opt.color || colors.primary },
                        ]}
                        onPress={() => setProjectSelection(opt.value)}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            { color: colors.textSecondary },
                            isSelected && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.bgSurface }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {task ? 'Guardar Cambios' : 'Crear Tarea'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
  content: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  formScroll: {
    maxHeight: '75%',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  actionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009497',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  usersScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    gap: 6,
  },
  userChipSelected: {
    backgroundColor: '#E6F6F6',
    borderColor: '#009497',
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniSelected: {
    backgroundColor: '#009497',
  },
  avatarMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  userChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  userChipTextSelected: {
    color: '#007072',
    fontWeight: '700',
  },
  catScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  catChipActiveDefault: {
    backgroundColor: '#E2E8F0',
    borderColor: '#94A3B8',
  },
  catChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  inlineBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  inlineCreateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#009497',
  },
  inlineCreateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  rowDates: {
    flexDirection: 'row',
    gap: 12,
  },
  dateCol: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#009497',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
