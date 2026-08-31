import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

export type ThemePreset =
  | 'asana_dark'    // Asana Charcoal (Default, matte dark #1E1F21 + Coral/Red #FF5E5B)
  | 'obsidian'      // Pitch Black OLED #0D0E11 + Electric Blue #3B82F6
  | 'slate_dark'    // Deep Slate Navy #0F172A + Cyan #38BDF8
  | 'emerald_dark'  // Dark Forest #0B1512 + Mint #10B981
  | 'iris_purple'   // Original Violet #0E1533 + Iris #7C83FF
  | 'light_clean';  // Modern Crisp Light #F8FAFC + Indigo/Coral

export interface ThemeColors {
  // Primary / Brand
  primary: string;
  primaryLight: string;
  primaryMuted: string;
  accent: string;
  accentMuted: string;
  mint: string;
  mintMuted: string;
  rose: string;
  roseMuted: string;
  blueSoft: string;

  // Semantic
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  info: string;

  // Backgrounds & Surfaces
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;
  bgCard: string;
  bgCardElevated: string;
  bgModal: string;
  bgOverlay: string;

  // Texts
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders & Dividers
  border: string;
  borderSubtle: string;
  borderFocus: string;

  // Task Statuses
  statusPendiente: string;
  statusProceso: string;
  statusRevision: string;
  statusCompletada: string;
  statusBloqueada: string;
  statusVencida: string;

  // Task Priorities
  prioMuyAlta: string;
  prioAlta: string;
  prioMedia: string;
  prioBaja: string;
  prioMuyBaja: string;

  // Navigation
  navBg: string;
  navActiveBg: string;
  navActiveColor: string;
  navInactiveColor: string;
}

// ─── 1. ASANA CHARCOAL (DEFAULT DARK - Clean Neutral Matte Dark) ─────────────
const asanaDarkColors: ThemeColors = {
  primary: '#FF5E5B', // Asana Coral / Warm Red
  primaryLight: '#FF7D7A',
  primaryMuted: 'rgba(255, 94, 91, 0.16)',
  accent: '#F59E0B',
  accentMuted: 'rgba(245, 158, 11, 0.16)',
  mint: '#10B981',
  mintMuted: 'rgba(16, 185, 129, 0.16)',
  rose: '#EF4444',
  roseMuted: 'rgba(239, 68, 68, 0.16)',
  blueSoft: '#38BDF8',

  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.16)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.16)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.16)',
  info: '#38BDF8',

  bgPrimary: '#1E1F21',      // Neutral charcoal dark (exact Asana style)
  bgSecondary: '#28292B',    // Clean card surface
  bgSurface: '#2E2F32',      // Elevated inputs & pills
  bgCard: '#28292B',
  bgCardElevated: '#343639',
  bgModal: '#28292B',
  bgOverlay: 'rgba(0, 0, 0, 0.8)',

  textPrimary: '#F5F5F7',
  textSecondary: '#A2A4A8',
  textMuted: '#6D6F74',
  textInverse: '#1E1F21',

  border: '#343639',
  borderSubtle: '#2A2B2D',
  borderFocus: '#FF5E5B',

  statusPendiente: '#94A3B8',
  statusProceso: '#3B82F6',
  statusRevision: '#A855F7',
  statusCompletada: '#10B981',
  statusBloqueada: '#EF4444',
  statusVencida: '#EF4444',

  prioMuyAlta: '#EF4444',
  prioAlta: '#F97316',
  prioMedia: '#22C55E',
  prioBaja: '#3B82F6',
  prioMuyBaja: '#8B5CF6',

  navBg: '#1E1F21',
  navActiveBg: '#2E2F32',
  navActiveColor: '#FFFFFF',
  navInactiveColor: '#7C7F84',
};

// ─── 2. OBSIDIAN OLED (Pitch Black + Electric Blue) ──────────────────────────
const obsidianColors: ThemeColors = {
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryMuted: 'rgba(59, 130, 246, 0.18)',
  accent: '#F59E0B',
  accentMuted: 'rgba(245, 158, 11, 0.16)',
  mint: '#10B981',
  mintMuted: 'rgba(16, 185, 129, 0.16)',
  rose: '#EF4444',
  roseMuted: 'rgba(239, 68, 68, 0.16)',
  blueSoft: '#60A5FA',

  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.16)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.16)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.16)',
  info: '#3B82F6',

  bgPrimary: '#0A0A0C',
  bgSecondary: '#141518',
  bgSurface: '#1C1E23',
  bgCard: '#141518',
  bgCardElevated: '#22252C',
  bgModal: '#141518',
  bgOverlay: 'rgba(0, 0, 0, 0.88)',

  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0A0A0C',

  border: '#23262D',
  borderSubtle: '#181A1F',
  borderFocus: '#3B82F6',

  statusPendiente: '#9CA3AF',
  statusProceso: '#3B82F6',
  statusRevision: '#A855F7',
  statusCompletada: '#10B981',
  statusBloqueada: '#EF4444',
  statusVencida: '#EF4444',

  prioMuyAlta: '#EF4444',
  prioAlta: '#F97316',
  prioMedia: '#22C55E',
  prioBaja: '#3B82F6',
  prioMuyBaja: '#8B5CF6',

  navBg: '#0A0A0C',
  navActiveBg: '#1C1E23',
  navActiveColor: '#FFFFFF',
  navInactiveColor: '#6B7280',
};

// ─── 3. SLATE DARK (Navy Slate + Sky Cyan) ────────────────────────────────────
const slateDarkColors: ThemeColors = {
  primary: '#38BDF8',
  primaryLight: '#7DD3FC',
  primaryMuted: 'rgba(56, 189, 248, 0.16)',
  accent: '#F59E0B',
  accentMuted: 'rgba(245, 158, 11, 0.16)',
  mint: '#10B981',
  mintMuted: 'rgba(16, 185, 129, 0.16)',
  rose: '#EF4444',
  roseMuted: 'rgba(239, 68, 68, 0.16)',
  blueSoft: '#38BDF8',

  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.16)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.16)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.16)',
  info: '#38BDF8',

  bgPrimary: '#0F172A',
  bgSecondary: '#1E293B',
  bgSurface: '#293548',
  bgCard: '#1E293B',
  bgCardElevated: '#334155',
  bgModal: '#1E293B',
  bgOverlay: 'rgba(5, 10, 20, 0.85)',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  border: '#334155',
  borderSubtle: '#1E293B',
  borderFocus: '#38BDF8',

  statusPendiente: '#94A3B8',
  statusProceso: '#38BDF8',
  statusRevision: '#C084FC',
  statusCompletada: '#34D399',
  statusBloqueada: '#F87171',
  statusVencida: '#F87171',

  prioMuyAlta: '#EF4444',
  prioAlta: '#F97316',
  prioMedia: '#22C55E',
  prioBaja: '#38BDF8',
  prioMuyBaja: '#8B5CF6',

  navBg: '#0F172A',
  navActiveBg: '#1E293B',
  navActiveColor: '#38BDF8',
  navInactiveColor: '#64748B',
};

// ─── 4. EMERALD DARK (Deep Forest + Emerald Mint) ─────────────────────────────
const emeraldDarkColors: ThemeColors = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryMuted: 'rgba(16, 185, 129, 0.16)',
  accent: '#F59E0B',
  accentMuted: 'rgba(245, 158, 11, 0.16)',
  mint: '#10B981',
  mintMuted: 'rgba(16, 185, 129, 0.16)',
  rose: '#EF4444',
  roseMuted: 'rgba(239, 68, 68, 0.16)',
  blueSoft: '#38BDF8',

  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.16)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.16)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.16)',
  info: '#38BDF8',

  bgPrimary: '#0B1512',
  bgSecondary: '#13231E',
  bgSurface: '#1C312A',
  bgCard: '#13231E',
  bgCardElevated: '#243E35',
  bgModal: '#13231E',
  bgOverlay: 'rgba(0, 0, 0, 0.85)',

  textPrimary: '#ECFDF5',
  textSecondary: '#A7F3D0',
  textMuted: '#6EE7B7',
  textInverse: '#0B1512',

  border: '#234137',
  borderSubtle: '#162923',
  borderFocus: '#10B981',

  statusPendiente: '#94A3B8',
  statusProceso: '#38BDF8',
  statusRevision: '#A855F7',
  statusCompletada: '#10B981',
  statusBloqueada: '#EF4444',
  statusVencida: '#EF4444',

  prioMuyAlta: '#EF4444',
  prioAlta: '#F97316',
  prioMedia: '#22C55E',
  prioBaja: '#38BDF8',
  prioMuyBaja: '#8B5CF6',

  navBg: '#0B1512',
  navActiveBg: '#1C312A',
  navActiveColor: '#10B981',
  navInactiveColor: '#4B7A6A',
};

// ─── 5. IRIS PURPLE (Classic Violet) ──────────────────────────────────────────
const irisPurpleColors: ThemeColors = {
  primary: '#7C83FF',
  primaryLight: '#9C8CFF',
  primaryMuted: 'rgba(124, 131, 255, 0.16)',
  accent: '#FF9E6D',
  accentMuted: 'rgba(255, 158, 109, 0.16)',
  mint: '#5EE0C0',
  mintMuted: 'rgba(94, 224, 192, 0.16)',
  rose: '#FF7BA9',
  roseMuted: 'rgba(255, 123, 169, 0.16)',
  blueSoft: '#7AA2FF',

  success: '#5EE0C0',
  successMuted: 'rgba(94, 224, 192, 0.16)',
  warning: '#FF9E6D',
  warningMuted: 'rgba(255, 158, 109, 0.16)',
  danger: '#FF7BA9',
  dangerMuted: 'rgba(255, 123, 169, 0.16)',
  info: '#7AA2FF',

  bgPrimary: '#0E1533',
  bgSecondary: '#1B1540',
  bgSurface: '#141A3C',
  bgCard: 'rgba(255, 255, 255, 0.06)',
  bgCardElevated: '#201A49',
  bgModal: '#1B1540',
  bgOverlay: 'rgba(5, 4, 18, 0.85)',

  textPrimary: '#F3F2FB',
  textSecondary: '#A6A9C8',
  textMuted: '#76799E',
  textInverse: '#0E1533',

  border: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
  borderFocus: '#7C83FF',

  statusPendiente: '#A6A9C8',
  statusProceso: '#7C83FF',
  statusRevision: '#FF9E6D',
  statusCompletada: '#5EE0C0',
  statusBloqueada: '#FF7BA9',
  statusVencida: '#FF7BA9',

  prioMuyAlta: '#EF4444',
  prioAlta: '#F97316',
  prioMedia: '#22C55E',
  prioBaja: '#3B82F6',
  prioMuyBaja: '#8B5CF6',

  navBg: '#120E2C',
  navActiveBg: 'rgba(124, 131, 255, 0.18)',
  navActiveColor: '#7C83FF',
  navInactiveColor: '#76799E',
};

// ─── 6. LIGHT CLEAN (Modern Crisp White) ─────────────────────────────────────
const lightColors: ThemeColors = {
  primary: '#FF5E5B',
  primaryLight: '#FF7D7A',
  primaryMuted: 'rgba(255, 94, 91, 0.12)',
  accent: '#F97316',
  accentMuted: 'rgba(249, 115, 22, 0.12)',
  mint: '#10B981',
  mintMuted: 'rgba(16, 185, 129, 0.12)',
  rose: '#EF4444',
  roseMuted: 'rgba(239, 68, 68, 0.12)',
  blueSoft: '#3B82F6',

  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',
  info: '#3B82F6',

  bgPrimary: '#F8FAFC',
  bgSecondary: '#FFFFFF',
  bgSurface: '#F1F5F9',
  bgCard: '#FFFFFF',
  bgCardElevated: '#FFFFFF',
  bgModal: '#FFFFFF',
  bgOverlay: 'rgba(15, 23, 42, 0.6)',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderFocus: '#FF5E5B',

  statusPendiente: '#64748B',
  statusProceso: '#3B82F6',
  statusRevision: '#F59E0B',
  statusCompletada: '#10B981',
  statusBloqueada: '#EF4444',
  statusVencida: '#EF4444',

  prioMuyAlta: '#EF4444',
  prioAlta: '#F97316',
  prioMedia: '#22C55E',
  prioBaja: '#3B82F6',
  prioMuyBaja: '#8B5CF6',

  navBg: '#FFFFFF',
  navActiveBg: 'rgba(255, 94, 91, 0.12)',
  navActiveColor: '#FF5E5B',
  navInactiveColor: '#94A3B8',
};

// ─── Theme Preset Metadata for UI selection ──────────────────────────────────
export interface ThemePresetOption {
  id: ThemePreset;
  name: string;
  desc: string;
  bgHex: string;
  cardHex: string;
  primaryHex: string;
}

export const THEME_PRESETS: ThemePresetOption[] = [
  {
    id: 'asana_dark',
    name: 'Asana Oscuro (Recomendado)',
    desc: 'Carbón neutro mate sin morados molestos',
    bgHex: '#1E1F21',
    cardHex: '#28292B',
    primaryHex: '#FF5E5B',
  },
  {
    id: 'obsidian',
    name: 'Obsidiana / Negro Puro',
    desc: 'OLED profundo con azul eléctrico',
    bgHex: '#0A0A0C',
    cardHex: '#141518',
    primaryHex: '#3B82F6',
  },
  {
    id: 'slate_dark',
    name: 'Azul Pizarra',
    desc: 'Azul marino suave y cian profesional',
    bgHex: '#0F172A',
    cardHex: '#1E293B',
    primaryHex: '#38BDF8',
  },
  {
    id: 'emerald_dark',
    name: 'Bosque Esmeralda',
    desc: 'Verde oscuro elegante y menta fresca',
    bgHex: '#0B1512',
    cardHex: '#13231E',
    primaryHex: '#10B981',
  },
  {
    id: 'light_clean',
    name: 'Modo Claro',
    desc: 'Luminoso, limpio y minimalista',
    bgHex: '#F8FAFC',
    cardHex: '#FFFFFF',
    primaryHex: '#FF5E5B',
  },
  {
    id: 'iris_purple',
    name: 'Morado Iris (Original)',
    desc: 'Tema cósmico violeta clásico',
    bgHex: '#0E1533',
    cardHex: '#1B1540',
    primaryHex: '#7C83FF',
  },
];

export type BgType = 'none' | 'color' | 'image';

interface ThemeContextType {
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setThemePreset: (preset: ThemePreset) => Promise<void>;
  toggleTheme: () => Promise<void>;
  bgType: BgType;
  bgValue: string | null;
  setBackground: (type: BgType, value?: string) => Promise<void>;
  clearBackground: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  themePreset: 'asana_dark',
  isDark: true,
  colors: asanaDarkColors,
  setThemeMode: async () => {},
  setThemePreset: async () => {},
  toggleTheme: async () => {},
  bgType: 'none',
  bgValue: null,
  setBackground: async () => {},
  clearBackground: async () => {},
});

const THEME_MODE_KEY = '@colab_theme_mode';
const THEME_PRESET_KEY = '@colab_theme_preset';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [themePreset, setThemePresetState] = useState<ThemePreset>('asana_dark');
  const [bgType, setBgTypeState] = useState<BgType>('none');
  const [bgValue, setBgValueState] = useState<string | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (savedMode === 'dark' || savedMode === 'light' || savedMode === 'system') {
          setThemeModeState(savedMode as ThemeMode);
        }
        const savedPreset = await AsyncStorage.getItem(THEME_PRESET_KEY);
        if (savedPreset && THEME_PRESETS.some((p) => p.id === savedPreset)) {
          setThemePresetState(savedPreset as ThemePreset);
        } else {
          // Default to asana_dark
          setThemePresetState('asana_dark');
        }

        const savedBgType = await AsyncStorage.getItem('@colab_bg_type');
        const savedBgValue = await AsyncStorage.getItem('@colab_bg_value');
        if (savedBgType === 'color' || savedBgType === 'image' || savedBgType === 'none') {
          setBgTypeState(savedBgType as BgType);
        }
        if (savedBgValue) {
          setBgValueState(savedBgValue);
        }
      } catch (err) {
        console.error('Error loading theme preference', err);
      }
    };
    loadPreferences();
  }, []);

  const isDark = useMemo(() => {
    if (themePreset === 'light_clean') return false;
    if (themeMode === 'light') return false;
    if (themeMode === 'system') return systemColorScheme === 'dark';
    return true;
  }, [themeMode, themePreset, systemColorScheme]);

  const colors = useMemo<ThemeColors>(() => {
    if (!isDark) return lightColors;

    switch (themePreset) {
      case 'obsidian':
        return obsidianColors;
      case 'slate_dark':
        return slateDarkColors;
      case 'emerald_dark':
        return emeraldDarkColors;
      case 'iris_purple':
        return irisPurpleColors;
      case 'asana_dark':
      default:
        return asanaDarkColors;
    }
  }, [isDark, themePreset]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (err) {
      console.error('Error saving theme mode', err);
    }
  };

  const setThemePreset = async (preset: ThemePreset) => {
    setThemePresetState(preset);
    if (preset === 'light_clean') {
      setThemeModeState('light');
      await AsyncStorage.setItem(THEME_MODE_KEY, 'light');
    } else {
      setThemeModeState('dark');
      await AsyncStorage.setItem(THEME_MODE_KEY, 'dark');
    }
    try {
      await AsyncStorage.setItem(THEME_PRESET_KEY, preset);
    } catch (err) {
      console.error('Error saving theme preset', err);
    }
  };

  const toggleTheme = async () => {
    const nextPreset: ThemePreset = isDark ? 'light_clean' : 'asana_dark';
    await setThemePreset(nextPreset);
  };

  const setBackground = async (type: BgType, value?: string) => {
    setBgTypeState(type);
    setBgValueState(value || null);
    try {
      await AsyncStorage.setItem('@colab_bg_type', type);
      await AsyncStorage.setItem('@colab_bg_value', value || '');
    } catch (err) {
      console.error('Error saving background', err);
    }
  };

  const clearBackground = async () => {
    setBgTypeState('none');
    setBgValueState(null);
    try {
      await AsyncStorage.removeItem('@colab_bg_type');
      await AsyncStorage.removeItem('@colab_bg_value');
    } catch (err) {
      console.error('Error clearing background', err);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        themePreset,
        isDark,
        colors,
        setThemeMode,
        setThemePreset,
        toggleTheme,
        bgType,
        bgValue,
        setBackground,
        clearBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
