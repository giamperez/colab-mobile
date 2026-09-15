import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNavBar } from '../components/BottomNavBar';
import { WorkspaceSwitcherModal } from '../components/WorkspaceSwitcherModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export const MenuScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [workspaceModalVisible, setWorkspaceModalVisible] = useState(false);

  const menuSections = [
    {
      title: 'MÓDULOS PRINCIPALES',
      items: [
        {
          route: 'Kanban',
          label: 'Tablero Kanban',
          desc: 'Flujo de tareas y estados',
          icon: 'grid-outline',
          color: colors.primary,
        },
        {
          route: 'Dashboard',
          label: 'Métricas & Analytics',
          desc: 'KPIs y rendimiento del equipo',
          icon: 'stats-chart-outline',
          color: colors.primaryLight,
        },
        {
          route: 'Calendar',
          label: 'Calendario Mensual',
          desc: 'Fechas límite y programación',
          icon: 'calendar-outline',
          color: colors.blueSoft,
        },
        {
          route: 'Gantt',
          label: 'Proyectos & Cronogramas',
          desc: 'Hitos, tipos y sub-tareas',
          icon: 'layers-outline',
          color: colors.accent,
        },
        {
          route: 'Agenda',
          label: 'Bitácora & Agenda',
          desc: 'Extracción de tareas desde notas',
          icon: 'sparkles-outline',
          color: colors.primary,
        },
        {
          route: 'Reports',
          label: 'Reportes Ejecutivos',
          desc: 'Informes diarios y semanales',
          icon: 'document-text-outline',
          color: colors.mint,
        },
      ],
    },
    ...(isSuperAdmin || isAdmin
      ? [
          {
            title: 'ADMINISTRACIÓN Y CONTROL',
            items: [
              {
                route: 'SuperAdmin',
                label: 'Consola Super Admin',
                desc: 'Workspaces, métricas globales y monitoreo',
                icon: 'shield-checkmark-outline',
                color: colors.danger,
              },
            ],
          },
        ]
      : []),
    {
      title: 'ORGANIZACIÓN Y EQUIPOS',
      items: [
        {
          route: 'Users',
          label: 'Equipo & Miembros',
          desc: 'Roles, invitaciones y colaboradores',
          icon: 'people-outline',
          color: colors.rose,
        },
        {
          route: 'Groups',
          label: 'Grupos & Departamentos',
          desc: 'Áreas y jefes de equipo',
          icon: 'business-outline',
          color: colors.mint,
        },
      ],
    },
    {
      title: 'CUENTA Y AJUSTES',
      items: [
        {
          route: 'Profile',
          label: 'Mi Perfil & Seguridad',
          desc: 'Datos personales, contraseña y tema',
          icon: 'person-outline',
          color: colors.textSecondary,
        },
        {
          route: 'BackgroundPicker',
          label: 'Personalizar Fondo',
          desc: 'Color o imagen de fondo para la app',
          icon: 'color-palette-outline',
          color: colors.accent,
        },
        {
          action: () => setWorkspaceModalVisible(true),
          label: 'Cambiar de Empresa / Workspace',
          desc: user?.companyName || 'Seleccionar organización',
          icon: 'swap-horizontal-outline',
          color: colors.primary,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader title="Menú Principal" subtitle="Acceso a todas las herramientas de COLAB" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 8) + 85 },
        ]}
      >
        {/* User Card */}
        <TouchableOpacity
          style={[
            styles.userBanner,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.userAvatar,
              {
                backgroundColor: colors.primaryMuted,
                borderColor: colors.primary,
                borderWidth: 1.5,
              },
            ]}
          >
            <Text style={[styles.userAvatarText, { color: colors.primary }]}>
              {user?.emoji || (user?.nombre || user?.name || 'U').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {user?.nombre || user?.name}
            </Text>
            <Text style={[styles.userSub, { color: colors.textSecondary }]}>
              {user?.email} • {(user?.rol || user?.role || 'COLABORADOR').toUpperCase()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Quick Theme Switcher Card */}
        <TouchableOpacity
          style={[
            styles.themeQuickCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? 'rgba(255, 158, 109, 0.15)' : 'rgba(124, 131, 255, 0.15)',
              },
            ]}
          >
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={20}
              color={isDark ? colors.accent : colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
              {isDark ? 'Tema Oscuro Activo' : 'Tema Claro Activo'}
            </Text>
            <Text style={[styles.menuItemDesc, { color: colors.textSecondary }]}>
              Toca para cambiar a {isDark ? 'Modo Claro ☀️' : 'Modo Oscuro 🌙'}
            </Text>
          </View>
          <View
            style={[
              styles.themeSwitchPill,
              {
                backgroundColor: isDark ? colors.primary : colors.bgSurface,
                borderColor: colors.borderSubtle,
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={14}
              color={isDark ? '#FFFFFF' : colors.textPrimary}
            />
          </View>
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
              {section.title}
            </Text>
            <View
              style={[
                styles.cardBox,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              {section.items.map((item, iIdx) => (
                <TouchableOpacity
                  key={iIdx}
                  style={[
                    styles.menuItem,
                    iIdx < section.items.length - 1 && [
                      styles.menuItemBorder,
                      { borderBottomColor: colors.borderSubtle },
                    ],
                  ]}
                  onPress={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.route) {
                      navigation.navigate(item.route);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: item.color + '18' },
                    ]}
                  >
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.menuItemDesc, { color: colors.textSecondary }]}>
                      {item.desc}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footerInfo}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Colab • Versión 1.0.0
          </Text>
        </View>

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
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userSub: {
    fontSize: 12,
    marginTop: 2,
  },
  themeQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  themeSwitchPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  cardBox: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MenuScreen;

