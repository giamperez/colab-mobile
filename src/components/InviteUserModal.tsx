import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { membershipsApi } from '../api/memberships.api';
import { useTheme } from '../context/ThemeContext';

interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = [
  { id: 'ADMIN', label: 'Admin', desc: 'Control total de la empresa' },
  { id: 'JEFE', label: 'Jefe', desc: 'Gestiona áreas y equipos' },
  { id: 'COLABORADOR', label: 'Colaborador', desc: 'Ejecuta y actualiza tareas' },
];

export const InviteUserModal = ({ visible, onClose, onSuccess }: InviteUserModalProps) => {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('COLABORADOR');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Requerido', 'Por favor ingresa el correo del usuario.');
      return;
    }

    setLoading(true);
    try {
      await membershipsApi.invite({
        email: email.trim().toLowerCase(),
        rol: selectedRole,
      });
      Alert.alert('¡Invitación Enviada!', `Se envió la invitación a ${email.trim()}`);
      setEmail('');
      setSelectedRole('COLABORADOR');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error al invitar', err.response?.data?.message || 'No se pudo enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

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
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="person-add" size={22} color={colors.primary} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Invitar al Equipo</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.bgSurface }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            El usuario recibirá un correo para unirse a esta empresa y colaborar en los proyectos.
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>CORREO ELECTRÓNICO *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder="colaborador@empresa.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>ROL EN LA EMPRESA</Text>
          <View style={styles.rolesList}>
            {ROLES.map((r) => {
              const isSelected = selectedRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.border,
                    },
                    isSelected && {
                      backgroundColor: colors.primaryMuted,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedRole(r.id)}
                >
                  <View style={styles.roleHeader}>
                    <Text
                      style={[
                        styles.roleName,
                        { color: colors.textPrimary },
                        isSelected && { color: colors.primary, fontWeight: '800' },
                      ]}
                    >
                      {r.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </View>
                  <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>{r.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
                styles.submitBtn,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleInvite}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Enviar Invitación</Text>
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
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    marginTop: 10,
    letterSpacing: 0.5,
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
  rolesList: {
    gap: 8,
    marginTop: 4,
  },
  roleCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  roleCardActive: {
    backgroundColor: '#E6F6F6',
    borderColor: '#009497',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleNameActive: {
    color: '#007072',
  },
  roleDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
  submitBtn: {
    flex: 1.8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#009497',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
