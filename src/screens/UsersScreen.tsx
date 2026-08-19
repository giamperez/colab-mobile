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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users.api';
import { groupsApi } from '../api/groups.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { UserModal } from '../components/UserModal';
import type { User, Group } from '../types';

export const UsersScreen = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rawUsers, isLoading, refetch } = useQuery({
    queryKey: ['users-management'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
  });

  const { data: rawGroups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const users: User[] = extractArray<User>(rawUsers);
  const groups: Group[] = extractArray<Group>(rawGroups);

  const createMutation = useMutation({
    mutationFn: (dto: any) => usersApi.create(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users-management'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => usersApi.update(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users-management'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users-management'] }),
  });

  const handleOpenCreate = () => {
    setEditingUser(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setModalVisible(true);
  };

  const handleSaveUser = async (data: any) => {
    if (editingUser) {
      await updateMutation.mutateAsync({ id: editingUser.id, dto: data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDeleteUser = (user: User) => {
    Alert.alert(
      'Eliminar Usuario',
      `¿Deseas eliminar al usuario "${user.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(user.id),
        },
      ]
    );
  };

  const filteredUsers = users.filter((u: User) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.dni.toLowerCase().includes(q) ||
      (u.group_name && u.group_name.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.flexContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gestión de Usuarios ({users.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreate}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Nuevo Usuario</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, DNI o grupo..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#009497" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={refetch} />
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>{item.emoji || '👤'}</Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userDni}>DNI: {item.dni}</Text>

                  <View style={styles.tagRow}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>
                        {item.role ? item.role.toUpperCase() : 'USUARIO'}
                      </Text>
                    </View>
                    {item.group_name && (
                      <View style={styles.groupBadge}>
                        <Text style={styles.groupBadgeText}>{item.group_name}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleOpenEdit(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#009497" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDeleteUser(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <UserModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSaveUser}
        initialUser={editingUser}
        groups={groups}
      />

      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009497',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  listContent: {
    paddingBottom: 30,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  userDni: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#534AB7',
  },
  groupBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default UsersScreen;
