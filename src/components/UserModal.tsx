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
import type { User, Group } from '../types';

interface UserModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => Promise<void>;
  initialUser?: User | null;
  groups: Group[];
}

export const UserModal: React.FC<UserModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialUser,
  groups,
}) => {
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'jefe' | 'usuario'>('usuario');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [emoji, setEmoji] = useState('👤');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const EMOJI_OPTIONS = ['👤', '👨‍💻', '👩‍💻', '🚀', '🎯', '⚡', '🔥', '💼', '📊'];

  useEffect(() => {
    if (initialUser) {
      setName(initialUser.name || '');
      setDni(initialUser.dni || '');
      setEmail(initialUser.email || '');
      setRole(initialUser.role || 'usuario');
      setGroupId(initialUser.group_id || null);
      setEmoji(initialUser.emoji || '👤');
      setWhatsapp(initialUser.whatsapp || '');
    } else {
      setName('');
      setDni('');
      setEmail('');
      setRole('usuario');
      setGroupId(groups.length > 0 ? groups[0].id : null);
      setEmoji('👤');
      setWhatsapp('');
    }
  }, [initialUser, visible, groups]);

  const handleSubmit = async () => {
    if (!name.trim() || !dni.trim()) {
      Alert.alert('Error', 'El Nombre y el DNI son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name,
        dni,
        email,
        role,
        group_id: groupId,
        emoji,
        whatsapp,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Error al guardar el usuario'
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
              {initialUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Emoji Selector */}
            <Text style={styles.label}>Emoji / Avatar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
              {EMOJI_OPTIONS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.emojiItem,
                    emoji === e && styles.emojiItemActive,
                  ]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Nombre */}
            <Text style={styles.label}>Nombre Completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Pérez"
              value={name}
              onChangeText={setName}
            />

            {/* DNI */}
            <Text style={styles.label}>DNI *</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de DNI"
              value={dni}
              onChangeText={setDni}
              keyboardType="number-pad"
            />

            {!initialUser && (
              <Text style={styles.hint}>
                * El PIN inicial será los primeros 4 dígitos del DNI
              </Text>
            )}

            {/* Email */}
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Rol */}
            <Text style={styles.label}>Rol de Usuario</Text>
            <View style={styles.rowWrap}>
              {(['usuario', 'jefe', 'admin'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rolePill, role === r && styles.rolePillActive]}
                  onPress={() => setRole(r)}
                >
                  <Text
                    style={[styles.roleText, role === r && styles.roleTextActive]}
                  >
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Grupo */}
            <Text style={styles.label}>Grupo / Área</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
              <TouchableOpacity
                style={[
                  styles.rolePill,
                  groupId === null && styles.rolePillActive,
                ]}
                onPress={() => setGroupId(null)}
              >
                <Text
                  style={[
                    styles.roleText,
                    groupId === null && styles.roleTextActive,
                  ]}
                >
                  Sin grupo
                </Text>
              </TouchableOpacity>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.rolePill,
                    groupId === g.id && {
                      backgroundColor: g.color || '#009497',
                      borderColor: g.color || '#009497',
                    },
                  ]}
                  onPress={() => setGroupId(g.id)}
                >
                  <Text
                    style={[
                      styles.roleText,
                      groupId === g.id && styles.roleTextActive,
                    ]}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* WhatsApp */}
            <Text style={styles.label}>Número WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: +51999888777"
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
            />

            <View style={{ height: 20 }} />
          </ScrollView>

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
                  {initialUser ? 'Guardar' : 'Crear Usuario'}
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
  rowScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiItemActive: {
    borderColor: '#009497',
    backgroundColor: '#E2F5F3',
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  rolePillActive: {
    backgroundColor: '#009497',
    borderColor: '#009497',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#009497',
    fontWeight: '600',
    marginTop: 6,
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

export default UserModal;
