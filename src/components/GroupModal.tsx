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
import type { Group } from '../types';

interface GroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (groupData: any) => Promise<void>;
  initialGroup?: Group | null;
}

const COLOR_PALETTE = [
  '#009497',
  '#0080a3',
  '#534AB7',
  '#D85A30',
  '#BA7517',
  '#10B981',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#64748B',
];

export const GroupModal: React.FC<GroupModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialGroup,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#009497');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialGroup) {
      setName(initialGroup.name || '');
      setColor(initialGroup.color || '#009497');
      setDescription(initialGroup.description || '');
    } else {
      setName('');
      setColor('#009497');
      setDescription('');
    }
  }, [initialGroup, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre del grupo es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name,
        color,
        description,
      });
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Error al guardar el grupo'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Nombre del Grupo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Marketing, Ventas, TI"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Color Identificador</Text>
            <View style={styles.colorPalette}>
              {COLOR_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && styles.colorCircleActive,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Propósito u observaciones del grupo..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: color }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {initialGroup ? 'Guardar' : 'Crear Grupo'}
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
    maxHeight: '80%',
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
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#0F172A',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
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
    alignItems: 'center',
  },
  submitBtnText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default GroupModal;
