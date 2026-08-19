import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '../types';

interface TaskStatusModalProps {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
  targetStatus: 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada' | null;
  onSubmit: (id: number, status: string, description?: string) => Promise<void>;
}

export const TaskStatusModal: React.FC<TaskStatusModalProps> = ({
  visible,
  onClose,
  task,
  targetStatus,
  onSubmit,
}) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!task || !targetStatus) return null;

  const getStatusTitle = (st: string) => {
    switch (st) {
      case 'pendiente':
        return 'Mover a Pendiente';
      case 'en_progreso':
        return 'Marcar En Progreso';
      case 'bloqueada':
        return 'Bloquear Tarea';
      case 'completada':
        return 'Marcar como Completada';
      default:
        return 'Cambiar Estado';
    }
  };

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'pendiente':
        return '#64748B';
      case 'en_progreso':
        return '#009497';
      case 'bloqueada':
        return '#EF4444';
      case 'completada':
        return '#10B981';
      default:
        return '#009497';
    }
  };

  const handleSubmit = async () => {
    if (targetStatus === 'bloqueada' && !description.trim()) {
      Alert.alert(
        'Nota Requerida',
        'Por favor indica la razón o el motivo del bloqueo de la tarea.'
      );
      return;
    }

    setLoading(true);
    try {
      await onSubmit(task.id, targetStatus, description);
      setDescription('');
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Error al actualizar el estado de la tarea'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(targetStatus) },
                ]}
              />
              <Text style={styles.headerTitle}>{getStatusTitle(targetStatus)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            
            <Text style={styles.label}>
              {targetStatus === 'bloqueada'
                ? 'Motivo del Bloqueo *'
                : 'Nota / Comentario de Progreso (Opcional)'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder={
                targetStatus === 'bloqueada'
                  ? 'Explica por qué está bloqueada...'
                  : 'Añade detalles sobre este cambio...'
              }
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: getStatusColor(targetStatus) },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Confirmar</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statusBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
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
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default TaskStatusModal;
