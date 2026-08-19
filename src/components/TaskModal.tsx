import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel } from '../types';
import type { Task, User, Category, GanttItem } from '../types';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (taskData: any) => Promise<void>;
  initialTask?: Task | null;
  users: User[];
  categories: Category[];
  ganttItems: GanttItem[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialTask,
  users,
  categories,
  ganttItems,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('media');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [executionDate, setExecutionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [ganttItemId, setGanttItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority || 'media');
      setCategoryId(initialTask.category?.id || null);
      setAssigneeId(initialTask.assignee?.id || null);
      setExecutionDate(
        initialTask.execution_date
          ? initialTask.execution_date.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setDueDate(
        initialTask.due_date ? initialTask.due_date.split('T')[0] : ''
      );
      setGanttItemId(initialTask.gantt_item_id || null);
    } else {
      setTitle('');
      setDescription('');
      setPriority('media');
      setCategoryId(categories.length > 0 ? categories[0].id : null);
      setAssigneeId(users.length > 0 ? users[0].id : null);
      setExecutionDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setGanttItemId(null);
    }
  }, [initialTask, visible, categories, users]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título de la tarea es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title,
        description,
        priority,
        category_id: categoryId,
        assignee_id: assigneeId,
        execution_date: executionDate,
        due_date: dueDate || null,
        gantt_item_id: ganttItemId || null,
      };

      await onSubmit(payload);
      onClose();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al guardar la tarea'
      );
    } finally {
      setLoading(false);
    }
  };

  const priorities: PriorityLevel[] = [
    'muy_baja',
    'baja',
    'media',
    'alta',
    'muy_alta',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialTask ? 'Editar Tarea' : 'Nueva Tarea'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la tarea"
              value={title}
              onChangeText={setTitle}
            />

            {/* Descripción */}
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detalles opcionales..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Prioridad */}
            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.rowWrap}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.pillOption,
                    priority === p && {
                      backgroundColor: PRIORITY_COLORS[p],
                      borderColor: PRIORITY_COLORS[p],
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      priority === p && styles.pillTextActive,
                    ]}
                  >
                    {PRIORITY_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Asignado */}
            <Text style={styles.label}>Asignado a</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
              {users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[
                    styles.userPill,
                    assigneeId === u.id && styles.userPillActive,
                  ]}
                  onPress={() => setAssigneeId(u.id)}
                >
                  <Text style={styles.userEmoji}>{u.emoji || '👤'}</Text>
                  <Text
                    style={[
                      styles.userText,
                      assigneeId === u.id && styles.userTextActive,
                    ]}
                  >
                    {u.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Categoría */}
            <Text style={styles.label}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catPill,
                    categoryId === c.id && {
                      backgroundColor: c.color || '#009497',
                      borderColor: c.color || '#009497',
                    },
                  ]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text
                    style={[
                      styles.catText,
                      categoryId === c.id && styles.catTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Fechas */}
            <View style={styles.dateRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Fecha Ejecución</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={executionDate}
                  onChangeText={setExecutionDate}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Fecha Vencimiento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>
            </View>

            {/* Proyecto Gantt */}
            {ganttItems.length > 0 && (
              <>
                <Text style={styles.label}>Proyecto Gantt Asociado</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
                  <TouchableOpacity
                    style={[
                      styles.catPill,
                      ganttItemId === null && styles.catPillActive,
                    ]}
                    onPress={() => setGanttItemId(null)}
                  >
                    <Text style={styles.catText}>Ninguno</Text>
                  </TouchableOpacity>
                  {ganttItems.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.catPill,
                        ganttItemId === g.id && {
                          backgroundColor: g.color || '#534AB7',
                          borderColor: g.color || '#534AB7',
                        },
                      ]}
                      onPress={() => setGanttItemId(g.id)}
                    >
                      <Text
                        style={[
                          styles.catText,
                          ganttItemId === g.id && styles.catTextActive,
                        ]}
                      >
                        {g.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {initialTask ? 'Guardar Cambios' : 'Crear Tarea'}
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 14,
    marginBottom: 6,
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
    minHeight: 70,
    textAlignVertical: 'top',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  pillOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userPillActive: {
    backgroundColor: '#009497',
    borderColor: '#009497',
  },
  userEmoji: {
    marginRight: 6,
    fontSize: 14,
  },
  userText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  userTextActive: {
    color: '#FFFFFF',
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillActive: {
    backgroundColor: '#009497',
    borderColor: '#009497',
  },
  catText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#009497',
    alignItems: 'center',
  },
  submitBtnText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default TaskModal;
