import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, BgType, THEME_PRESETS, ThemePreset } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNavBar } from '../components/BottomNavBar';

const PRESET_COLORS = [
  { label: 'Azul marino', value: '#0E1533' },
  { label: 'Púrpura oscuro', value: '#1B1540' },
  { label: 'Negro azul', value: '#09090B' },
  { label: 'Grafito', value: '#18181B' },
  { label: 'Verde oscuro', value: '#052e16' },
  { label: 'Café oscuro', value: '#1c0a00' },
  { label: 'Azul acero', value: '#0f172a' },
  { label: 'Blanco puro', value: '#FFFFFF' },
  { label: 'Crema suave', value: '#FFF8F3' },
  { label: 'Gris claro', value: '#F8FAFC' },
  { label: 'Lavanda', value: '#F0EFFE' },
  { label: 'Menta', value: '#F0FDF4' },
  { label: 'Rosa suave', value: '#FFF0F3' },
  { label: 'Cielo', value: '#EFF6FF' },
  { label: 'Amber suave', value: '#FFFBEB' },
];

const PRESET_GRADIENTS = [
  { label: 'Cósmica', value: '#1a1a2e' },
  { label: 'Marina', value: '#0a192f' },
  { label: 'Nebulosa', value: '#16213e' },
  { label: 'Jade oscuro', value: '#0a2416' },
  { label: 'Vino', value: '#1a0a16' },
];

const PRESET_IMAGE_URIS = [
  {
    label: 'Galaxia',
    uri: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80',
  },
  {
    label: 'Montañas',
    uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  },
  {
    label: 'Bosque',
    uri: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
  },
  {
    label: 'Océano',
    uri: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
  },
  {
    label: 'Ciudad Noche',
    uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
  },
  {
    label: 'Aurora',
    uri: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
  },
  {
    label: 'Desierto',
    uri: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
  },
  {
    label: 'Abstracto',
    uri: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80',
  },
];

import { useNotification } from '../context/NotificationContext';

export const BackgroundPickerScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark, bgType, bgValue, setBackground, clearBackground, themePreset, setThemePreset } = useTheme();
  const { showSuccess, showError, showInfo, showConfirm } = useNotification();
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'themes' | 'colors' | 'images'>('themes');

  const handleSelectPreset = async (presetId: ThemePreset) => {
    await setThemePreset(presetId);
    showSuccess('Tema Aplicado', 'La paleta visual se actualizó correctamente.');
  };

  const handleSelectColor = async (hex: string) => {
    await setBackground('color', hex);
    showSuccess('Fondo Aplicado', 'Color de fondo personalizado configurado.');
  };

  const handleSelectImage = async (uri: string) => {
    await setBackground('image', uri);
    showSuccess('Fondo Aplicado', 'Imagen de fondo configurada con éxito.');
  };

  const handleCustomUrl = async () => {
    if (!customUrl.trim()) return;
    if (!customUrl.startsWith('http')) {
      showError('URL Inválida', 'Por favor ingresa un enlace que comience con http:// o https://');
      return;
    }
    await setBackground('image', customUrl.trim());
    setCustomUrl('');
    showSuccess('Fondo Aplicado', 'Imagen desde URL configurada.');
  };

  const handleClear = () => {
    showConfirm({
      title: 'Restaurar Fondo',
      message: '¿Deseas quitar la personalización y volver al tema predeterminado?',
      confirmText: 'Restaurar',
      onConfirm: async () => {
        await clearBackground();
        showInfo('Fondo Restaurado', 'Se restableció el fondo predeterminado.');
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader
        title="Personalizar Tema y Fondo"
        subtitle="Elige tu paleta predeterminada, color o imagen"
      />

      {/* Tab Selector */}
      <View style={[styles.tabBar, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'themes' && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
          onPress={() => setActiveTab('themes')}
        >
          <Ionicons name="sparkles-outline" size={15} color={activeTab === 'themes' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabBtnText, { color: activeTab === 'themes' ? colors.primary : colors.textSecondary }]}>
            Temas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'colors' && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
          onPress={() => setActiveTab('colors')}
        >
          <Ionicons name="color-palette-outline" size={15} color={activeTab === 'colors' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabBtnText, { color: activeTab === 'colors' ? colors.primary : colors.textSecondary }]}>
            Colores
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'images' && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
          onPress={() => setActiveTab('images')}
        >
          <Ionicons name="images-outline" size={15} color={activeTab === 'images' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabBtnText, { color: activeTab === 'images' ? colors.primary : colors.textSecondary }]}>
            Imágenes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === 'themes' ? (
          <>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>PALETAS PREESTABLECIDAS</Text>
            <View style={{ gap: 10, marginTop: 6 }}>
              {THEME_PRESETS.map((p) => {
                const isSelected = themePreset === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor: colors.bgSecondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleSelectPreset(p.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.presetHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: p.bgHex, borderWidth: 1, borderColor: '#555' }} />
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: p.cardHex, borderWidth: 1, borderColor: '#555' }} />
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: p.primaryHex }} />
                      </View>
                      <Text style={[styles.presetName, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                        {p.name}
                      </Text>
                      {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.presetDesc, { color: colors.textSecondary }]}>{p.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : activeTab === 'colors' ? (
          <>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>COLORES OSCUROS</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.filter((_, i) => i < 7).map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.value, borderColor: bgValue === c.value ? colors.primary : 'transparent' },
                    bgValue === c.value && styles.swatchSelected,
                  ]}
                  onPress={() => handleSelectColor(c.value)}
                >
                  {bgValue === c.value && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                  <Text style={[styles.swatchLabel, { color: '#FFFFFF' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>COLORES CLAROS</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.filter((_, i) => i >= 7).map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.value, borderColor: bgValue === c.value ? colors.primary : colors.borderSubtle },
                    bgValue === c.value && styles.swatchSelected,
                  ]}
                  onPress={() => handleSelectColor(c.value)}
                >
                  {bgValue === c.value && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                  <Text style={[styles.swatchLabel, { color: c.value === '#FFFFFF' ? '#000' : '#0F172A' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>IMÁGENES PREDEFINIDAS</Text>
            <View style={styles.imageGrid}>
              {PRESET_IMAGE_URIS.map((img) => (
                <TouchableOpacity
                  key={img.uri}
                  style={[
                    styles.imagePreviewCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: bgValue === img.uri ? colors.primary : colors.border,
                      borderWidth: bgValue === img.uri ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleSelectImage(img.uri)}
                >
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.bgSecondary }]}>
                    <Ionicons name="image-outline" size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.imageLabel, { color: colors.textPrimary }]}>{img.label}</Text>
                  {bgValue === img.uri && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>URL PERSONALIZADA</Text>
            <View style={[styles.customUrlRow, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.customUrlInput, { color: colors.textPrimary }]}
                placeholder="https://ejemplo.com/mi-imagen.jpg"
                placeholderTextColor={colors.textMuted}
                value={customUrl}
                onChangeText={setCustomUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.customUrlBtn, { backgroundColor: colors.primary }]}
                onPress={handleCustomUrl}
              >
                <Text style={styles.customUrlBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <BottomNavBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  currentBgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  currentBgPreview: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBgLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentBgValue: {
    fontSize: 12,
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 10,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: '30%',
    height: 72,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swatchSelected: {
    borderWidth: 3,
  },
  swatchLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imagePreviewCard: {
    width: '45%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholder: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '700',
    padding: 8,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  customUrlInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
  },
  customUrlBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  customUrlBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  presetCard: {
    borderRadius: 16,
    padding: 14,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginLeft: 6,
  },
  presetDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BackgroundPickerScreen;
