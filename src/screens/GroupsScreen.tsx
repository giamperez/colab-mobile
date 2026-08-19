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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/groups.api';
import { categoriesApi } from '../api/categories.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { GroupModal } from '../components/GroupModal';
import type { Group, Category } from '../types';

export const GroupsScreen = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'groups' | 'categories'>('groups');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const { data: rawGroups, isLoading: loadingGroups, refetch: refetchGroups } = useQuery({
    queryKey: ['groups-management'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const { data: rawCategories, isLoading: loadingCats, refetch: refetchCats } = useQuery({
    queryKey: ['categories-management'],
    queryFn: () => categoriesApi.getAll().then((res) => res.data),
  });

  const groups: Group[] = extractArray<Group>(rawGroups);
  const categories: Category[] = extractArray<Category>(rawCategories);

  const createGroupMutation = useMutation({
    mutationFn: (dto: any) => groupsApi.create(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups-management'] }),
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => groupsApi.update(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups-management'] }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => groupsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups-management'] }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (dto: any) => categoriesApi.create(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories-management'] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories-management'] }),
  });

  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setModalVisible(true);
  };

  const handleOpenEditGroup = (g: Group) => {
    setEditingGroup(g);
    setModalVisible(true);
  };

  const handleSaveGroup = async (dto: any) => {
    if (editingGroup) {
      await updateGroupMutation.mutateAsync({ id: editingGroup.id, dto });
    } else {
      await createGroupMutation.mutateAsync(dto);
    }
  };

  const handleDeleteGroup = (g: Group) => {
    Alert.alert(
      'Eliminar Área/Grupo',
      `¿Deseas eliminar el grupo "${g.name}"?`,
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

  const handlePromptCreateCategory = () => {
    Alert.prompt(
      'Nueva Categoría',
      'Ingresa el nombre de la nueva categoría para tareas:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: (name?: string) => {
            if (name && name.trim()) {
              createCategoryMutation.mutate({
                name: name.trim(),
                color: '#009497',
              });
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert(
      'Eliminar Categoría',
      `¿Deseas eliminar la categoría "${cat.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteCategoryMutation.mutate(cat.id),
        },
      ]
    );
  };

  const isLoading = activeTab === 'groups' ? loadingGroups : loadingCats;

  return (
    <View style={styles.flexContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Estructura Organizacional</Text>
          {activeTab === 'groups' ? (
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreateGroup}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Nuevo Grupo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={handlePromptCreateCategory}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Nueva Categoría</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
            onPress={() => setActiveTab('groups')}
          >
            <Ionicons
              name="layers-outline"
              size={18}
              color={activeTab === 'groups' ? '#009497' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'groups' && styles.tabTextActive,
              ]}
            >
              Áreas y Grupos ({groups.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
            onPress={() => setActiveTab('categories')}
          >
            <Ionicons
              name="pricetags-outline"
              size={18}
              color={activeTab === 'categories' ? '#009497' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'categories' && styles.tabTextActive,
              ]}
            >
              Categorías ({categories.length})
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#009497" style={{ marginTop: 40 }} />
        ) : activeTab === 'groups' ? (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={loadingGroups} onRefresh={refetchGroups} />
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.groupIconBox}>
                    <Ionicons name="people-outline" size={20} color="#009497" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.cardDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>

                {item.telegram_chat_id ? (
                  <View style={styles.telegramBox}>
                    <Ionicons name="paper-plane-outline" size={14} color="#0088CC" />
                    <Text style={styles.telegramText}>
                      Chat ID: {item.telegram_chat_id}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleOpenEditGroup(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#009497" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDeleteGroup(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={loadingCats} onRefresh={refetchCats} />
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.catCard}>
                <View
                  style={[
                    styles.catDot,
                    { backgroundColor: item.color || '#009497' },
                  ]}
                />
                <Text style={styles.catTitle}>{item.name}</Text>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handleDeleteCategory(item)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <GroupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSaveGroup}
        initialGroup={editingGroup}
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#E2F5F3',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#009497',
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E2F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  telegramBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  telegramText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0088CC',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  catTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});

export default GroupsScreen;
