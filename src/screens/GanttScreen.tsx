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
import { ganttApi } from '../api/gantt.api';
import { groupsApi } from '../api/groups.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { GanttModal } from '../components/GanttModal';
import type { GanttItem, Group, GanttSubtask } from '../types';

export const GanttScreen = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<GanttItem | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtaskInputForId, setSubtaskInputForId] = useState<number | null>(null);

  // Data
  const { data: rawGantt, isLoading, refetch } = useQuery({
    queryKey: ['gantt-projects'],
    queryFn: () => ganttApi.getAll().then((res) => res.data),
  });

  const { data: rawGroups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const ganttItems: GanttItem[] = extractArray<GanttItem>(rawGantt);
  const groups: Group[] = extractArray<Group>(rawGroups);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (dto: any) => ganttApi.create(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gantt-projects'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => ganttApi.update(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gantt-projects'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ganttApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gantt-projects'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => ganttApi.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gantt-projects'] }),
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ ganttId, taskId }: { ganttId: number; taskId: number }) =>
      ganttApi.toggleSubtask(ganttId, taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gantt-projects'] }),
  });

  const createSubtaskMutation = useMutation({
    mutationFn: ({ ganttId, dto }: { ganttId: number; dto: any }) =>
      ganttApi.createSubtask(ganttId, dto),
    onSuccess: () => {
      setNewSubtaskTitle('');
      setSubtaskInputForId(null);
      queryClient.invalidateQueries({ queryKey: ['gantt-projects'] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: ({ ganttId, taskId }: { ganttId: number; taskId: number }) =>
      ganttApi.deleteSubtask(ganttId, taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gantt-projects'] }),
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (item: GanttItem) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleSaveGantt = async (data: any) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, dto: data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = (item: GanttItem) => {
    Alert.alert(
      'Eliminar Proyecto',
      `¿Deseas eliminar el proyecto "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ]
    );
  };

  const handleAddSubtask = (ganttId: number) => {
    if (!newSubtaskTitle.trim()) return;
    createSubtaskMutation.mutate({
      ganttId,
      dto: { title: newSubtaskTitle, priority: 'normal' },
    });
  };

  return (
    <View style={styles.flexContainer}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cronogramas Gantt</Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreate}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Nuevo Proyecto</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#009497" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={ganttItems || []}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={refetch} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="bar-chart-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No hay proyectos Gantt registrados</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isExpanded = expandedId === item.id;
              const subtasks = item.subtasks || [];
              const completedSubtasks = subtasks.filter(
                (s: GanttSubtask) => s.status === 'completada'
              ).length;
              const subtaskProgress =
                subtasks.length > 0
                  ? Math.round((completedSubtasks / subtasks.length) * 100)
                  : item.progress || 0;

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {item.type ? item.type.toUpperCase() : 'PROYECTO'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: item.color || '#009497' },
                      ]}
                    />
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.cardDesc}>{item.description}</Text>
                  ) : null}

                  {/* Fechas */}
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <Text style={styles.dateText}>
                      {item.start_date?.split('T')[0]} → {item.end_date?.split('T')[0]}
                    </Text>
                  </View>

                  {/* Progreso */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTextRow}>
                      <Text style={styles.progressLabel}>Progreso</Text>
                      <Text style={styles.progressValue}>{subtaskProgress}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${subtaskProgress}%`,
                            backgroundColor: item.color || '#009497',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Acciones principales */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#009497"
                      />
                      <Text style={styles.expandBtnText}>
                        Subtareas ({completedSubtasks}/{subtasks.length})
                      </Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => duplicateMutation.mutate(item.id)}
                      >
                        <Ionicons name="copy-outline" size={16} color="#534AB7" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleOpenEdit(item)}
                      >
                        <Ionicons name="create-outline" size={16} color="#009497" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleDelete(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Subtareas Desplegables */}
                  {isExpanded && (
                    <View style={styles.subtasksSection}>
                      <Text style={styles.subtasksTitle}>Lista de Subtareas</Text>

                      {subtasks.map((st: GanttSubtask) => (
                        <View key={st.id} style={styles.subtaskRow}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() =>
                              toggleSubtaskMutation.mutate({
                                ganttId: item.id,
                                taskId: st.id,
                              })
                            }
                          >
                            <Ionicons
                              name={
                                st.status === 'completada'
                                  ? 'checkbox'
                                  : 'square-outline'
                              }
                              size={20}
                              color={
                                st.status === 'completada'
                                  ? '#10B981'
                                  : '#94A3B8'
                              }
                            />
                          </TouchableOpacity>
                          <Text
                            style={[
                              styles.subtaskTitle,
                              st.status === 'completada' &&
                                styles.subtaskTitleDone,
                            ]}
                          >
                            {st.title}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              deleteSubtaskMutation.mutate({
                                ganttId: item.id,
                                taskId: st.id,
                              })
                            }
                          >
                            <Ionicons name="close" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Agregar Subtarea Input */}
                      {subtaskInputForId === item.id ? (
                        <View style={styles.addSubtaskRow}>
                          <TextInput
                            style={styles.subtaskInput}
                            placeholder="Nombre de la subtarea..."
                            value={newSubtaskTitle}
                            onChangeText={setNewSubtaskTitle}
                          />
                          <TouchableOpacity
                            style={styles.subtaskAddSubmit}
                            onPress={() => handleAddSubtask(item.id)}
                          >
                            <Ionicons name="checkmark" size={18} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addSubtaskBtn}
                          onPress={() => setSubtaskInputForId(item.id)}
                        >
                          <Ionicons name="add-circle-outline" size={18} color="#009497" />
                          <Text style={styles.addSubtaskBtnText}>Añadir subtarea</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>

      <GanttModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSaveGantt}
        initialItem={editingItem}
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
    fontSize: 22,
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
  listContent: {
    paddingBottom: 30,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 10,
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009497',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtasksSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subtasksTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    marginRight: 8,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  subtaskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  addSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  addSubtaskBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009497',
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  subtaskAddSubmit: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#009497',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GanttScreen;
