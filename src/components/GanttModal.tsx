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
import { AppDatePicker } from './AppDatePicker';
import { useTheme } from '../context/ThemeContext';
import type { GanttItem, Group } from '../types';

interface GanttModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialItem?: GanttItem | null;
  groups: Group[];
}

const TYPE_OPTIONS = [
  { id: 'lanzamiento', label: '🚀 Lanzamiento', defaultColor: '#7C83FF' },
  { id: 'campaña', label: '📢 Campaña', defaultColor: '#FF9E6D' },
  { id: 'webinar', label: '🎙️ Webinar', defaultColor: '#9C8CFF' },
  { id: 'programa', label: '📚 Programa', defaultColor: '#5EE0C0' },
  { id: 'tarea', label: '✅ Tarea', defaultColor: '#009497' },
  { id: 'evento', label: '📅 Evento', defaultColor: '#BA7517' },
  { id: 'otro', label: '📌 Otro', defaultColor: '#FF7BA9' },
];

export const GanttModal: React.FC<GanttModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialItem,
  groups,
}) => {
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('lanzamiento');
  const [color, setColor] = useState('#7C83FF');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [groupId, setGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title || '');
      setDescription(initialItem.description || '');
      setType(initialItem.type || 'lanzamiento');
      setColor(initialItem.color || '#7C83FF');
      setStartDate(initialItem.start_date ? initialItem.start_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setEndDate(initialItem.end_date ? initialItem.end_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setGroupId(initialItem.group_id || null);
    } else {
      setTitle('');
      setDescription('');
      setType('lanzamiento');
      setColor('#7C83FF');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      );
      setGroupId(groups.length > 0 ? groups[0].id : null);
    }
  }, [initialItem, visible, groups]);

  const handleTypeSelect = (opt: typeof TYPE_OPTIONS[0]) => {
    setType(opt.id);
    setColor(opt.defaultColor);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título del proyecto Gantt es obligatorio');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        title,
        description,
        type,
        color,
        start_date: startDate,
        end_date: endDate,
        group_id: groupId,
      });
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al guardar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
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
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {initialItem ? 'Editar Proyecto Gantt' : 'Nuevo Proyecto Gantt'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Título del Proyecto *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Ej: Lanzamiento Curso IA"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Descripción</Text>
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
              placeholder="Detalles sobre el proyecto..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo de Proyecto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
              {TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.border,
                    },
                    type === opt.id && {
                      backgroundColor: opt.defaultColor,
                      borderColor: opt.defaultColor,
                    },
                  ]}
                  onPress={() => handleTypeSelect(opt)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: colors.textSecondary },
                      type === opt.id && { color: '#FFFFFF', fontWeight: '800' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.dateRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppDatePicker
                  label="Fecha Inicio"
                  value={startDate}
                  onChange={(d) => setStartDate(d)}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppDatePicker
                  label="Fecha Fin"
                  value={endDate}
                  onChange={(d) => setEndDate(d)}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Grupo Responsable</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.border,
                    },
                    groupId === g.id && {
                      backgroundColor: g.color || colors.primary,
                      borderColor: g.color || colors.primary,
                    },
                  ]}
                  onPress={() => setGroupId(g.id)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: colors.textSecondary },
                      groupId === g.id && { color: '#FFFFFF', fontWeight: '800' },
                    ]}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.bgSurface }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {initialItem ? 'Guardar' : 'Crear Proyecto'}
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
    maxHeight: '85%',
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
  closeBtn: {
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
  rowScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
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

export default GanttModal;
