import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  PriorityLevel,
} from '../types';
import dayjs from 'dayjs';

interface Workspace {
  id: number;
  nombre: string;
  slug?: string;
  industria?: string;
  plan?: string;
  createdAt?: string;
  activeMembers?: number;
  taskCounts?: {
    pendientes: number;
    en_progreso: number;
    completadas: number;
    vencidas: number;
  };
}

export const SuperAdminScreen = () => {
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const { isSuperAdmin, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'workspaces' | 'tasks'>('workspaces');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | null>(null);

  // Fetch workspaces
  const {
    data: rawWorkspaces,
    isLoading: isLoadingWorkspaces,
    refetch: refetchWorkspaces,
  } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: () => client.get('/admin/workspaces').then((res) => res.data),
    enabled: isSuperAdmin || isAdmin,
  });

  // Fetch cross-company tasks
  const {
    data: rawTasks,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['admin-tasks', selectedWorkspace, selectedPriority],
    queryFn: () =>
      client
        .get('/admin/tasks', {
          params: {
            companyId: selectedWorkspace || undefined,
            priority: selectedPriority ? selectedPriority.toUpperCase() : undefined,
          },
        })
        .then((res) => res.data),
    enabled: activeTab === 'tasks' && (isSuperAdmin || isAdmin),
  });

  const workspaces: Workspace[] = useMemo(() => extractArray<Workspace>(rawWorkspaces), [rawWorkspaces]);
  const tasks: any[] = useMemo(() => extractArray<any>(rawTasks), [rawTasks]);

  // Toggle task status
  const toggleTaskMutation = useMutation({
    mutationFn: (id: number) => client.patch(`/admin/tasks/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo alternar el estado');
    },
  });

  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const q = searchQuery.toLowerCase();
    return workspaces.filter((w) => (w.nombre || '').toLowerCase().includes(q));
  }, [workspaces, searchQuery]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        (t.titulo || t.title || '').toLowerCase().includes(q) ||
        (t.descripcion || t.description || '').toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  const totalTasksCount = useMemo(() => {
    return workspaces.reduce((acc, w) => {
      const tc = w.taskCounts;
      return acc + (tc ? tc.pendientes + tc.en_progreso + tc.completadas + tc.vencidas : 0);
    }, 0);
  }, [workspaces]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader
        title="Consola Super Admin"
        subtitle="Monitoreo centralizado de empresas y tareas"
      />

      {/* Mode Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'workspaces' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('workspaces')}
        >
          <Ionicons
            name="business-outline"
            size={16}
            color={activeTab === 'workspaces' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'workspaces' && { color: colors.primary, fontWeight: '800' },
            ]}
          >
            Empresas ({workspaces.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('tasks')}
        >
          <Ionicons
            name="layers-outline"
            size={16}
            color={activeTab === 'tasks' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'tasks' && { color: colors.primary, fontWeight: '800' },
            ]}
          >
            Tareas Globales ({totalTasksCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={[styles.filterBar, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={activeTab === 'workspaces' ? 'Buscar empresa...' : 'Buscar tarea global...'}
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

        {activeTab === 'tasks' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                selectedWorkspace === null && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedWorkspace(null)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  selectedWorkspace === null && { color: colors.primary, fontWeight: '800' },
                ]}
              >
                Todas las Empresas
              </Text>
            </TouchableOpacity>

            {workspaces.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[
                  styles.chip,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                  selectedWorkspace === w.id && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedWorkspace(selectedWorkspace === w.id ? null : w.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    selectedWorkspace === w.id && { color: colors.primary, fontWeight: '800' },
                  ]}
                >
                  🏢 {w.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Content */}
      {activeTab === 'workspaces' ? (
        isLoadingWorkspaces ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando organizaciones...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredWorkspaces}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingWorkspaces}
                onRefresh={refetchWorkspaces}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => {
              const tc = item.taskCounts || { pendientes: 0, en_progreso: 0, completadas: 0, vencidas: 0 };
              const totalWTasks = tc.pendientes + tc.en_progreso + tc.completadas + tc.vencidas;

              return (
                <View
                  style={[
                    styles.workspaceCard,
                    {
                      backgroundColor: colors.bgSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.wsHeader}>
                    <View style={[styles.wsIconCircle, { backgroundColor: colors.primaryMuted }]}>
                      <Ionicons name="business" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.wsTitle, { color: colors.textPrimary }]}>{item.nombre}</Text>
                      <Text style={[styles.wsSub, { color: colors.textMuted }]}>
                        Plan: {item.plan || 'TRIAL'} • Miembros: {item.activeMembers || 1}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.kpiRow, { borderTopColor: colors.borderSubtle }]}>
                    <View style={styles.kpiCol}>
                      <Text style={[styles.kpiNum, { color: colors.primary }]}>{tc.pendientes}</Text>
                      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Pendientes</Text>
                    </View>
                    <View style={styles.kpiCol}>
                      <Text style={[styles.kpiNum, { color: '#3B82F6' }]}>{tc.en_progreso}</Text>
                      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>En curso</Text>
                    </View>
                    <View style={styles.kpiCol}>
                      <Text style={[styles.kpiNum, { color: colors.mint }]}>{tc.completadas}</Text>
                      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Completadas</Text>
                    </View>
                    <View style={styles.kpiCol}>
                      <Text style={[styles.kpiNum, { color: colors.danger }]}>{tc.vencidas}</Text>
                      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Vencidas</Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : (
        isLoadingTasks ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando tareas globales...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingTasks}
                onRefresh={refetchTasks}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => {
              const isCompleted = item.estado === 'COMPLETADA' || item.status === 'completada';
              const pColor = PRIORITY_COLORS[item.prioridad?.toLowerCase() as PriorityLevel] || colors.primary;

              return (
                <View
                  style={[
                    styles.taskCard,
                    {
                      backgroundColor: colors.bgSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.checkBtn}
                    onPress={() => toggleTaskMutation.mutate(item.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isCompleted ? colors.mint : colors.textMuted}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.taskTitle,
                        { color: colors.textPrimary },
                        isCompleted && { textDecorationLine: 'line-through', color: colors.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {item.titulo || item.title}
                    </Text>
                    <Text style={[styles.taskSub, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.company?.nombre ? `🏢 ${item.company.nombre} • ` : ''}
                      {item.responsable?.nombre || item.assignee?.nombre || 'Sin asignar'} •{' '}
                      {item.fechaVencimiento ? dayjs(String(item.fechaVencimiento).split('T')[0]).format('DD MMM') : 'Sin fecha'}
                    </Text>
                  </View>

                  <View style={[styles.priorityBadge, { backgroundColor: pColor + '20' }]}>
                    <Text style={[styles.priorityText, { color: pColor }]}>
                      {PRIORITY_LABELS[item.prioridad?.toLowerCase() as PriorityLevel] || item.prioridad}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )
      )}

      <BottomNavBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 90,
  },
  workspaceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  wsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  wsSub: {
    fontSize: 12,
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  kpiCol: {
    alignItems: 'center',
  },
  kpiNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  checkBtn: {
    padding: 2,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  taskSub: {
    fontSize: 11,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

export default SuperAdminScreen;
