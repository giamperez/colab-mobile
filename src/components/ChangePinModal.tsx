import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface ChangePinModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  visible,
  onClose,
}) => {
  const { changePin } = useAuth();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPin.trim() || !newPin.trim()) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'El nuevo PIN y la confirmación no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await changePin({ current_pin: currentPin, new_pin: newPin });
      Alert.alert('Éxito', 'Tu PIN ha sido cambiado correctamente.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Error al cambiar el PIN.'
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
            <Text style={styles.headerTitle}>Cambiar PIN de Acceso</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>PIN Actual</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu PIN actual"
              value={currentPin}
              onChangeText={setCurrentPin}
              secureTextEntry
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Nuevo PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu nuevo PIN"
              value={newPin}
              onChangeText={setNewPin}
              secureTextEntry
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Confirmar Nuevo PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Repite el nuevo PIN"
              value={confirmPin}
              onChangeText={setConfirmPin}
              secureTextEntry
              keyboardType="number-pad"
            />
          </View>

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
                <Text style={styles.submitBtnText}>Actualizar PIN</Text>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
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
    flex: 1.5,
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

export default ChangePinModal;
