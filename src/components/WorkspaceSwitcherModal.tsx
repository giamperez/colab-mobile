import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import client from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const WorkspaceSwitcherModal = ({ visible, onClose }: Props) => {
  const { user, switchCompany } = useAuth();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSwitch = async (companyId: number) => {
    if (companyId === user?.companyId) {
      onClose();
      return;
    }
    setSwitchingId(companyId);
    try {
      await switchCompany(companyId);
      queryClient.clear();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo cambiar de empresa.');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      Alert.alert('Requerido', 'Ingresa el nombre de la empresa.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await client.post('/companies', {
        nombre: newCompanyName.trim(),
        industria: newCompanyIndustry.trim() || undefined,
      });
      if (res.data?.id) {
        await switchCompany(res.data.id);
        queryClient.clear();
        setIsCreating(false);
        setNewCompanyName('');
        setNewCompanyIndustry('');
        onClose();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al crear empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const companies = user?.companies || [];

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
            <View style={styles.headerTitleRow}>
              <Ionicons name="business" size={22} color={colors.primary} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Espacios de Trabajo</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.bgSurface }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Selecciona la empresa u organización para gestionar sus tareas y proyectos.
          </Text>

          {!isCreating ? (
            <>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {companies.length === 0 && (
                  <View
                    style={[
                      styles.emptyBox,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                      {user?.companyName || 'Empresa Principal'}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  </View>
                )}
                {companies.map((comp) => {
                  const isActive = comp.id === user?.companyId;
                  const isSwitching = switchingId === comp.id;
                  return (
                    <TouchableOpacity
                      key={comp.id}
                      style={[
                        styles.companyCard,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.border,
                        },
                        isActive && {
                          backgroundColor: colors.primaryMuted,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => handleSwitch(comp.id)}
                      disabled={isSwitching}
                    >
                      <View style={styles.cardLeft}>
                        <View
                          style={[
                            styles.avatarBox,
                            { backgroundColor: colors.bgSecondary },
                            isActive && { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.avatarText,
                              { color: colors.textSecondary },
                              isActive && { color: '#FFFFFF' },
                            ]}
                          >
                            {comp.nombre.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.companyName,
                              { color: colors.textPrimary },
                              isActive && { color: colors.primary, fontWeight: '800' },
                            ]}
                          >
                            {comp.nombre}
                          </Text>
                          <Text style={[styles.roleText, { color: colors.textMuted }]}>
                            Rol: {comp.rol || 'Miembro'}
                          </Text>
                        </View>
                      </View>
                      {isSwitching ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : isActive ? (
                        <View style={[styles.activePill, { backgroundColor: colors.bgSecondary }]}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                          <Text style={[styles.activePillText, { color: colors.primary }]}>Activa</Text>
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.addBtn,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setIsCreating(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Crear Nuevo Workspace</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>NOMBRE DE LA EMPRESA</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ej: Acero Solutions"
                placeholderTextColor={colors.textMuted}
                value={newCompanyName}
                onChangeText={setNewCompanyName}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>INDUSTRIA / RUBRO (OPCIONAL)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ej: Tecnología, Construcción..."
                placeholderTextColor={colors.textMuted}
                value={newCompanyIndustry}
                onChangeText={setNewCompanyIndustry}
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.cancelFormBtn, { backgroundColor: colors.bgSurface }]}
                  onPress={() => setIsCreating(false)}
                >
                  <Text style={[styles.cancelFormText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitFormBtn,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                    },
                    isSubmitting && { opacity: 0.7 },
                  ]}
                  onPress={handleCreateCompany}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitFormText}>Crear Workspace</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    padding: 24,
    maxHeight: '85%',
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
    fontWeight: '800',
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
  },
  list: {
    maxHeight: 280,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  activeCompanyCard: {
    backgroundColor: '#E6F6F6',
    borderColor: '#009497',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarBox: {
    backgroundColor: '#009497',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  activeAvatarText: {
    color: '#FFFFFF',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeCompanyName: {
    color: '#007072',
  },
  roleText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009497',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    marginTop: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#009497',
  },
  form: {
    marginTop: 8,
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
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelFormBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelFormText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitFormBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#009497',
    alignItems: 'center',
  },
  submitFormText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
