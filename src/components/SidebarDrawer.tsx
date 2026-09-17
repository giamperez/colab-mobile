import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpenTrash?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({ visible, onClose, onOpenTrash }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(Math.max(width * 0.82, 280), 380);

  const isSuperAdmin = user?.rol === 'SUPERADMIN' || user?.rol === 'superadmin';
  const isAdmin = isSuperAdmin || user?.rol === 'ADMIN' || user?.rol === 'admin';

  const navigateTo = (item: any) => {
    onClose();
    if (item.isTrash) {
      if (onOpenTrash) {
        setTimeout(() => {
          onOpenTrash();
        }, 200);
      }
      return;
    }
    setTimeout(() => {
      navigation.navigate(item.screen);
    }, 150);
  };

  const navSections = [
    {
      title: 'PRINCIPAL',
      items: [
        { label: 'Tareas & Tablero', screen: 'Kanban', icon: 'checkbox-outline' },
        { label: 'Planificaciones & Gantt', screen: 'Gantt', icon: 'folder-outline' },
        { label: 'Calendario de Entregas', screen: 'Calendar', icon: 'calendar-outline' },
        { label: 'Métricas & Dashboard', screen: 'Dashboard', icon: 'stats-chart-outline' },
      ],
    },
    {
      title: 'GESTIÓN & EQUIPO',
      items: [
        { label: 'Grupos & Áreas', screen: 'Groups', icon: 'people-outline' },
        { label: 'Directorio de Usuarios', screen: 'Users', icon: 'person-outline' },
        { label: 'Papelera de Reciclaje (30d)', screen: 'Trash', icon: 'trash-outline', isTrash: true },
        { label: 'Reportes & Exportar', screen: 'Reports', icon: 'document-text-outline' },
      ],
    },
    {
      title: 'PERSONALIZACIÓN',
      items: [
        { label: 'Fondos de Pantalla', screen: 'BackgroundPicker', icon: 'image-outline' },
        { label: 'Mi Perfil & Ajustes', screen: 'Profile', icon: 'settings-outline' },
        ...(isSuperAdmin
          ? [{ label: 'Panel SuperAdmin', screen: 'SuperAdmin', icon: 'shield-checkmark-outline' }]
          : []),
      ],
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.drawerContent,
            {
              width: drawerWidth,
              backgroundColor: colors.bgSecondary,
              borderColor: colors.borderSubtle,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header Profile Info */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.userAvatarBox, { backgroundColor: colors.primaryMuted }]}>
              {user?.emoji ? (
                <Text style={styles.emojiText}>{user.emoji}</Text>
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                  {(user?.nombre || user?.name || 'U')[0].toUpperCase()}
                </Text>
              )}
            </View>

            <View style={styles.userInfoCol}>
              <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                {user?.nombre || user?.name || 'Usuario'}
              </Text>
              <Text style={[styles.userCompany, { color: colors.primary }]} numberOfLines={1}>
                💼 {user?.companyName || 'Vertex'}
              </Text>
              <Text style={[styles.userRole, { color: colors.textMuted }]}>
                {user?.rol?.toUpperCase() || 'COLABORADOR'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.bgSurface }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Navigation Items */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {navSections.map((sec, idx) => (
              <View key={idx} style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{sec.title}</Text>
                {sec.items.map((item, itemIdx) => (
                  <TouchableOpacity
                    key={itemIdx}
                    style={[styles.navRow, { backgroundColor: colors.bgSurface }]}
                    onPress={() => navigateTo(item.screen)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                    <Text style={[styles.navLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Footer Logout */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
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
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContent: {
    height: '100%',
    borderLeftWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  userAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  avatarInitials: {
    fontSize: 17,
    fontWeight: '900',
  },
  userInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userCompany: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  userRole: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    gap: 10,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 13.5,
    fontWeight: '800',
  },
});

export default SidebarDrawer;
