import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STATUS_LABELS, STATUS_COLORS, TaskStatus } from '../types';
import type { Task } from '../types';
import { useTheme } from '../context/ThemeContext';

interface TaskStatusModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: { id: number; status: TaskStatus; description?: string }) => Promise<void>;
  task: Task | null;
  targetStatus: TaskStatus | null;
}

export const TaskStatusModal = ({
  visible,
  onClose,
  onConfirm,
  task,
  targetStatus,
}: TaskStatusModalProps) => {
  const { colors, isDark } = useTheme();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDescription('');
  }, [visible, targetStatus]);

  if (!task || !targetStatus) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm({
        id: task.id,
        status: targetStatus,
        description: description.trim() || undefined,
      });
      onClose();
    } catch {
      // Error handled in screen
    } finally {
      setLoading(false);
    }
  };

  const statusColor = STATUS_COLORS[targetStatus] || colors.primary;
  const isBlock = targetStatus === 'bloqueada';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: statusColor + '20' }]}>
            <Ionicons
              name={isBlock ? 'alert-circle' : 'swap-horizontal'}
              size={30}
              color={statusColor}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Cambiar Estado de Tarea</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Vas a cambiar la tarea a{' '}
            <Text style={{ fontWeight: '800', color: statusColor }}>
              "{STATUS_LABELS[targetStatus]}"
            </Text>
          </Text>

          <Text
            style={[
              styles.taskTitle,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            numberOfLines={2}
          >
            {task.title || task.titulo}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {isBlock ? 'MOTIVO DEL BLOQUEO (REQUERIDO)' : 'NOTA O COMENTARIO (OPCIONAL)'}
          </Text>
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
            placeholder={
              isBlock
                ? 'Explica la razón por la que la tarea está bloqueada...'
                : 'Agrega un detalle o nota de actualización...'
            }
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.bgSurface }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: statusColor },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleConfirm}
              disabled={loading || (isBlock && !description.trim())}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirmar</Text>
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
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    textAlign: 'center',
    marginBottom: 14,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
