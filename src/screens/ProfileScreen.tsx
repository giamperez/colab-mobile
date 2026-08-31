import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeMode, THEME_PRESETS, ThemePreset } from '../context/ThemeContext';
import { useMascot, MASCOT_TYPES, MascotType } from '../context/MascotContext';
import { PET_COLORWAYS, PetColorwayId } from '../components/petColorways';
import { PixelIronMan } from '../components/PixelIronMan';
import { PixelDog } from '../components/PixelDog';
import { PixelCat } from '../components/PixelCat';
import { AppHeader } from '../components/AppHeader';
import { BottomNavBar } from '../components/BottomNavBar';
import { WorkspaceSwitcherModal } from '../components/WorkspaceSwitcherModal';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotification } from '../context/NotificationContext';

export const ProfileScreen = () => {
  const { user, updateProfile, logout } = useAuth();
  const { colors, isDark, themeMode, setThemeMode, themePreset, setThemePreset } = useTheme();
  const { mascotType, setMascotType, mascotColorway, setMascotColorway } = useMascot();
  const { showSuccess, showError, showWarning, showConfirm } = useNotification();

  const [nombre, setNombre] = useState(user?.nombre || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspaceModalVisible, setWorkspaceModalVisible] = useState(false);

  const initials = (user?.nombre || user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSaveProfile = async () => {
    if (!nombre.trim()) {
      showWarning('Campo Requerido', 'El nombre no puede estar vacío.');
      return;
    }
    if (!email.trim()) {
      showWarning('Campo Requerido', 'El correo no puede estar vacío.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      showError('Error de Validación', 'Las contraseñas nuevas no coinciden.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showWarning('Contraseña Débil', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      showSuccess('¡Perfil Actualizado!', 'Los cambios se guardaron con éxito.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      showError('Error al Actualizar', err.response?.data?.message || 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutPrompt = () => {
    showConfirm({
      title: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir de tu cuenta en este dispositivo?',
      confirmText: 'Cerrar Sesión',
      isDestructive: true,
      icon: 'log-out-outline',
      onConfirm: () => logout(),
    });
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: any; desc: string }[] = [
    {
      mode: 'dark',
      label: 'Oscuro (Web)',
      icon: 'moon',
      desc: 'Fondo espacial #0E1533 & Iris #7C83FF',
    },
    {
      mode: 'light',
      label: 'Claro',
      icon: 'sunny',
      desc: 'Interfaz luminosa y limpia',
    },
    {
      mode: 'system',
      label: 'Automático',
      icon: 'phone-portrait-outline',
      desc: 'Sigue el tema de tu dispositivo',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader title="Mi Perfil" subtitle="Configuración de cuenta y apariencia" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* User Card */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.avatarLarge,
              {
                backgroundColor: colors.primaryMuted,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.avatarLargeText, { color: colors.primary }]}>
              {user?.emoji || initials}
            </Text>
          </View>

          <View style={styles.userCardInfo}>
            <Text style={[styles.userCardName, { color: colors.textPrimary }]}>
              {user?.nombre || user?.name}
            </Text>
            <Text style={[styles.userCardEmail, { color: colors.textSecondary }]}>
              {user?.email}
            </Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: colors.primaryMuted },
                ]}
              >
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                  {(user?.rol || user?.role || 'COLABORADOR').toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.workspaceBadge,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.workspaceBadgeText, { color: colors.textSecondary }]}>
                  {user?.companyName || 'Empresa'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Theme Presets Selection Card */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Temas y Paletas Visuales
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Elige el estilo visual que más te guste. El tema Asana Oscuro ofrece un tono carbón mate neutral sin reflejos morados.
          </Text>

          <View style={styles.themeOptionsGrid}>
            {THEME_PRESETS.map((preset) => {
              const isSelected = themePreset === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    isSelected && {
                      borderWidth: 2,
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryMuted,
                    },
                  ]}
                  onPress={() => setThemePreset(preset.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.themeOptionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {/* Swatch dots preview */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: preset.bgHex, borderWidth: 1, borderColor: '#555' }} />
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: preset.cardHex, borderWidth: 1, borderColor: '#555' }} />
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: preset.primaryHex }} />
                      </View>
                      <Text style={[styles.themeOptionLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                        {preset.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.activeCheckPill, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary, marginLeft: 2 }]}>
                    {preset.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Mascot Selection Card */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="paw-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tu Mascota Guía
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Elige quién te acompaña en Calendario, Gantt y Kanban.
          </Text>

          <View style={styles.themeOptionsGrid}>
            {MASCOT_TYPES.map((option) => {
              const isSelected = mascotType === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    isSelected && {
                      borderWidth: 2,
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryMuted,
                    },
                  ]}
                  onPress={() => setMascotType(option.id as MascotType)}
                  activeOpacity={0.75}
                >
                  <View style={styles.themeOptionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                        {option.id === 'dog' && <PixelDog pose="flying" pixelSize={1.3} colorway={mascotColorway} />}
                        {option.id === 'cat' && <PixelCat pose="flying" pixelSize={1.3} colorway={mascotColorway} />}
                        {option.id === 'ironman' && <PixelIronMan pose="flying" pixelSize={1.3} />}
                      </View>
                      <Text style={[styles.themeOptionLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                        {option.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.activeCheckPill, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary, marginLeft: 2 }]}>
                    {option.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {MASCOT_TYPES.find((m) => m.id === mascotType)?.supportsColorway && (
            <>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginTop: 12 }]}>
                Color de la mascota
              </Text>
              <View style={styles.colorwayRow}>
                {PET_COLORWAYS.map((cw) => {
                  const isSelected = mascotColorway === cw.id;
                  return (
                    <TouchableOpacity
                      key={cw.id}
                      style={[
                        styles.colorwaySwatch,
                        {
                          backgroundColor: cw.main,
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderWidth: isSelected ? 3 : 1,
                        },
                      ]}
                      onPress={() => setMascotColorway(cw.id as PetColorwayId)}
                      activeOpacity={0.75}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Workspace Management Card */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Espacio de Trabajo Activo
            </Text>
          </View>

          <View
            style={[
              styles.wsInfoBox,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.wsName, { color: colors.textPrimary }]}>
                {user?.companyName || 'Mi Empresa'}
              </Text>
              <Text style={[styles.wsPlan, { color: colors.textSecondary }]}>
                Plan: {user?.companyPlan || 'TRIAL'} •{' '}
                {user?.companies?.length || 1} organizaciones
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.switchWsBtn, { backgroundColor: colors.primary }]}
              onPress={() => setWorkspaceModalVisible(true)}
            >
              <Text style={styles.switchWsBtnText}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Edit Form */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Datos Personales
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>NOMBRE COMPLETO</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholderTextColor={colors.textMuted}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Tu nombre completo"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>CORREO ELECTRÓNICO</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Password Change Toggle */}
          <TouchableOpacity
            style={styles.passwordToggleBtn}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
            <Text style={[styles.passwordToggleText, { color: colors.primary }]}>
              {showPasswordSection ? 'Ocultar cambio de contraseña' : 'Cambiar Contraseña'}
            </Text>
            <Ionicons
              name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>

          {showPasswordSection && (
            <View style={[styles.passwordFields, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>CONTRASEÑA ACTUAL</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ingresa tu clave actual"
                placeholderTextColor={colors.textMuted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                NUEVA CONTRASEÑA (MÍN. 6)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Nueva clave"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                CONFIRMAR NUEVA CONTRASEÑA
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Repite la nueva clave"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary },
              saving && { opacity: 0.7 },
            ]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.dangerMuted,
              borderColor: colors.danger,
            },
          ]}
          onPress={handleLogoutPrompt}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.logoutBtnText, { color: colors.danger }]}>CERRAR SESIÓN</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      <BottomNavBar />

      <WorkspaceSwitcherModal
        visible={workspaceModalVisible}
        onClose={() => setWorkspaceModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 16,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarLargeText: {
    fontSize: 20,
    fontWeight: '900',
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 18,
    fontWeight: '800',
  },
  userCardEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  workspaceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  workspaceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  themeOptionsGrid: {
    gap: 10,
  },
  colorwayRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  colorwaySwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  themeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  themeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCheckPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeOptionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  wsInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  wsName: {
    fontSize: 14,
    fontWeight: '800',
  },
  wsPlan: {
    fontSize: 11,
    marginTop: 2,
  },
  switchWsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  switchWsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  passwordToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 6,
  },
  passwordToggleText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  passwordFields: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 10,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;

