import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users.api';
import { groupsApi } from '../api/groups.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { UserModal } from '../components/UserModal';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { User, Group } from '../types';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  SUPERADMIN: { bg: '#DC262625', text: '#DC2626' },
  ADMIN: { bg: '#FF9E6D25', text: '#FF9E6D' },
  JEFE: { bg: '#7C83FF25', text: '#7C83FF' },
  USUARIO: { bg: '#5EE0C025', text: '#5EE0C0' },
  COLABORADOR: { bg: '#5EE0C025', text: '#5EE0C0' },
};

export const UsersScreen = () => {
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const { user: currentUser, isSuperAdmin, canManageUsers } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: rawUsers, isLoading, refetch } = useQuery({
    queryKey: ['users-list-screen'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
  });

  const { data: rawGroups } = useQuery({
    queryKey: ['groups-list-screen-users'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const users: User[] = extractArray<User>(rawUsers);
  const groups: Group[] = extractArray<Group>(rawGroups);

  const createUserMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list-screen'] });
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list-screen'] });
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list-screen'] });
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });

  const filteredUsers = (users || []).filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (u.nombre || u.name || '').toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    const dniMatch = (u.dni || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || dniMatch;
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserModalVisible(true);
  };

  const handleDeleteUserPrompt = (user: User) => {
    Alert.alert(
      'Eliminar Usuario',
      `¿Deseas eliminar a ${user.nombre || user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteUserMutation.mutate(user.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader
        title="Equipo & Usuarios"
        subtitle="Gestión de colaboradores, roles y accesos"
        onQuickAdd={() => {
          setEditingUser(null);
          setUserModalVisible(true);
        }}
      />

      <View
        style={[
          styles.searchSection,
          {
            backgroundColor: colors.bgSecondary,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar por nombre, email o DNI..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setEditingUser(null);
            setUserModalVisible(true);
          }}
        >
          <Ionicons name="person-add-outline" size={15} color="#FFFFFF" />
          <Text style={styles.inviteBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando colaboradores...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.bgSecondary }]}>
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No se encontraron usuarios</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'Prueba con otro término de búsqueda.'
                  : 'Crea tu primer usuario para empezar a colaborar.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const roleKey = (item.role || item.rol || 'USUARIO').toUpperCase();
            const roleStyle = ROLE_COLORS[roleKey] || ROLE_COLORS.USUARIO;
            const initials = (item.nombre || item.name || 'U')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            const isItemSuperAdmin = roleKey === 'SUPERADMIN';
            const isItemAdmin = roleKey === 'ADMIN';
            const canEditItem = isSuperAdmin || (canManageUsers && !isItemSuperAdmin && !isItemAdmin) || item.id === currentUser?.id;
            const canDeleteItem = isSuperAdmin ? item.id !== currentUser?.id : (canManageUsers && !isItemSuperAdmin && !isItemAdmin && item.id !== currentUser?.id);

            return (
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
                    styles.userAvatar,
                    {
                      backgroundColor: colors.primaryMuted,
                      borderColor: colors.primary,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={[styles.userAvatarText, { color: colors.primary }]}>{item.emoji || initials}</Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.nombre || item.name}</Text>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                    {item.email || (item.dni ? `DNI: ${item.dni}` : 'Sin email')}
                  </Text>

                  <View style={styles.userBadgesRow}>
                    <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>
                        {roleKey}
                      </Text>
                    </View>

                    {item.group_name || (item as any).group?.name ? (
                      <View style={[styles.statusBadge, { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                          {item.group_name || (item as any).group?.name}
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.isActive !== false ? colors.mintMuted : colors.dangerMuted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: item.isActive !== false ? colors.mint : colors.danger,
                          },
                        ]}
                      >
                        {item.isActive !== false ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                </View>

                {(canEditItem || canDeleteItem) && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {canEditItem && (
                      <TouchableOpacity
                        style={[styles.deleteUserBtn, { backgroundColor: colors.primaryMuted }]}
                        onPress={() => handleEditUser(item)}
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    {canDeleteItem && (
                      <TouchableOpacity
                        style={[styles.deleteUserBtn, { backgroundColor: colors.dangerMuted }]}
                        onPress={() => handleDeleteUserPrompt(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <BottomNavBar />

      <UserModal
        visible={userModalVisible}
        onClose={() => {
          setUserModalVisible(false);
          setEditingUser(null);
        }}
        initialUser={editingUser}
        groups={groups}
        onSubmit={async (userData) => {
          if (editingUser) {
            await updateUserMutation.mutateAsync({ id: editingUser.id, data: userData });
          } else {
            await createUserMutation.mutateAsync(userData);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  userBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteUserBtn: {
    padding: 8,
    borderRadius: 10,
  },
});

export default UsersScreen;
