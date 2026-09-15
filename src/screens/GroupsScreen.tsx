import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/groups.api';
import { usersApi } from '../api/users.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { GroupModal } from '../components/GroupModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Group, User, GroupMember } from '../types';

export const GroupsScreen = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const { isAdmin } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  const { data: rawGroups, isLoading, refetch } = useQuery({
    queryKey: ['groups-list-screen'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const { data: rawUsers } = useQuery({
    queryKey: ['users-list-for-groups'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
  });

  const groups: Group[] = extractArray<Group>(rawGroups);
  const users: User[] = extractArray<User>(rawUsers);

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (data: any) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-list-screen'] });
      queryClient.invalidateQueries({ queryKey: ['groups-list'] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-list-screen'] });
      queryClient.invalidateQueries({ queryKey: ['groups-list'] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => groupsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-list-screen'] });
      queryClient.invalidateQueries({ queryKey: ['groups-list'] });
    },
  });

  const updateUserGroupMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: any }) => usersApi.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list-for-groups'] });
      queryClient.invalidateQueries({ queryKey: ['users-list-screen'] });
    },
  });

  const handleAddMemberPrompt = (groupId: number) => {
    const availableUsers = users.filter((u) => u.group_id !== groupId);

    if (availableUsers.length === 0) {
      Alert.alert('Información', 'Todos los colaboradores ya forman parte de este grupo.');
      return;
    }

    Alert.alert(
      'Agregar Miembro al Grupo',
      'Selecciona el colaborador:',
      [
        { text: 'Cancelar', style: 'cancel' },
        ...availableUsers.slice(0, 8).map((u) => ({
          text: `${u.emoji || '👤'} ${u.nombre || u.name || 'Usuario'}`,
          onPress: () => updateUserGroupMutation.mutate({ userId: u.id, data: { group_id: groupId } }),
        })),
      ]
    );
  };

  const handleDeleteGroupPrompt = (g: Group) => {
    Alert.alert(
      'Eliminar Grupo',
      `¿Deseas eliminar el grupo "${g.name || g.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteGroupMutation.mutate(g.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader
        title="Grupos & Departamentos"
        subtitle="Organización de áreas de trabajo y líderes"
        onQuickAdd={
          isAdmin
            ? () => {
                setEditingGroup(null);
                setModalVisible(true);
              }
            : undefined
        }
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando departamentos...</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(insets.bottom, 8) + 85 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.bgSurface }]}>
                <Ionicons name="folder-open-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No hay grupos creados</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Crea departamentos para organizar tus proyectos por área.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const groupMembers = users.filter((u) => u.group_id === item.id);
            const isExpanded = expandedGroupId === item.id;
            const groupColor = item.color || colors.primary;

            return (
              <View
                style={[
                  styles.groupCard,
                  {
                    backgroundColor: colors.bgSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => setExpandedGroupId(isExpanded ? null : item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.colorBox, { backgroundColor: groupColor }]}>
                    <Ionicons name="people" size={20} color="#FFFFFF" />
                  </View>

                  <View style={styles.groupInfo}>
                    <Text style={[styles.groupName, { color: colors.textPrimary }]}>{item.name || item.nombre}</Text>
                    {(item.description || item.descripcion) ? (
                      <Text style={[styles.groupDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.description || item.descripcion}
                      </Text>
                    ) : null}
                    <Text style={[styles.memberCount, { color: colors.primary }]}>
                      {groupMembers.length} miembros
                    </Text>
                  </View>

                  {isAdmin && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.bgSurface }]}
                        onPress={() => {
                          setEditingGroup(item);
                          setModalVisible(true);
                        }}
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.dangerMuted }]}
                        onPress={() => handleDeleteGroupPrompt(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {/* Expanded Members Section */}
                {isExpanded && (
                  <View
                    style={[
                      styles.membersSection,
                      {
                        backgroundColor: colors.bgSurface,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.membersHeader}>
                      <Text style={[styles.membersTitle, { color: colors.textSecondary }]}>Integrantes del Grupo</Text>
                      {isAdmin && (
                        <TouchableOpacity
                          style={[styles.addMemberBtn, { backgroundColor: colors.primaryMuted }]}
                          onPress={() => handleAddMemberPrompt(item.id)}
                        >
                          <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                          <Text style={[styles.addMemberBtnText, { color: colors.primary }]}>Agregar</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {groupMembers.length === 0 ? (
                      <Text style={[styles.emptyMembersText, { color: colors.textMuted }]}>
                        Aún no hay integrantes asignados a este grupo.
                      </Text>
                    ) : (
                      <View style={styles.membersList}>
                        {groupMembers.map((mUser) => {
                          const isJefe = mUser.role === 'jefe' || mUser.rol === 'JEFE';
                          return (
                            <View
                              key={mUser.id}
                              style={[
                                styles.memberRow,
                                {
                                  backgroundColor: colors.bgSecondary,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.memberAvatar,
                                  {
                                    backgroundColor: colors.primaryMuted,
                                    borderColor: colors.primary,
                                    borderWidth: 1,
                                  },
                                ]}
                              >
                                <Text style={[styles.memberAvatarText, { color: colors.primary }]}>
                                  {mUser.emoji || (mUser.nombre || mUser.name || mUser.email || 'U')[0]}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.memberRowName, { color: colors.textPrimary }]}>
                                  {mUser.nombre || mUser.name || mUser.email || 'Colaborador'}
                                </Text>
                                {isJefe && (
                                  <View style={styles.jefeBadge}>
                                    <Ionicons name="star" size={10} color="#F59E0B" />
                                    <Text style={styles.jefeBadgeText}>Líder / Jefe de Grupo</Text>
                                  </View>
                                )}
                              </View>

                              {isAdmin && (
                                <View style={styles.memberActions}>
                                  <TouchableOpacity
                                    style={styles.jefeToggleBtn}
                                    onPress={() =>
                                      updateUserGroupMutation.mutate({
                                        userId: mUser.id,
                                        data: { role: isJefe ? 'usuario' : 'jefe' },
                                      })
                                    }
                                  >
                                    <Ionicons
                                      name={isJefe ? 'star' : 'star-outline'}
                                      size={18}
                                      color={isJefe ? '#F59E0B' : colors.textMuted}
                                    />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={[styles.removeMemberBtn, { backgroundColor: colors.dangerMuted }]}
                                    onPress={() =>
                                      updateUserGroupMutation.mutate({
                                        userId: mUser.id,
                                        data: { group_id: null },
                                      })
                                    }
                                  >
                                    <Ionicons name="close" size={16} color={colors.danger} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <BottomNavBar />

      <GroupModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingGroup(null);
        }}
        initialGroup={editingGroup}
        onSubmit={async (data) => {
          if (editingGroup) {
            await updateGroupMutation.mutateAsync({ id: editingGroup.id, data });
          } else {
            await createGroupMutation.mutateAsync(data);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  colorBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  groupDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009497',
    marginTop: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  membersSection: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 14,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  membersTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E2F5F3',
  },
  addMemberBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#009497',
  },
  emptyMembersText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  membersList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#009497',
  },
  memberRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  jefeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  jefeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jefeToggleBtn: {
    padding: 4,
  },
  removeMemberBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
});

export default GroupsScreen;
