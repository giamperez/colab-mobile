import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import { extractArray } from '../api/utils';
import { useAuth } from '../context/AuthContext';
import { BottomNavBar } from '../components/BottomNavBar';
import { ChangePinModal } from '../components/ChangePinModal';
import { PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel } from '../types';
import type { Task } from '../types';

export const DashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [showPinModal, setShowPinModal] = useState(false);

  const { data: rawTasks, isLoading, refetch } = useQuery({
    queryKey: ['all-tasks-dashboard'],
    queryFn: () => tasksApi.getAll({}).then((res) => res.data),
  });

  const tasks: Task[] = extractArray<Task>(rawTasks);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: Task) => t.status === 'completada').length;
  const inProgressTasks = tasks.filter((t: Task) => t.status === 'en_progreso').length;
  const blockedTasks = tasks.filter((t: Task) => t.status === 'bloqueada').length;
  const pendingTasks = tasks.filter((t: Task) => t.status === 'pendiente').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const priorityCounts: Record<PriorityLevel, number> = {
    muy_baja: tasks.filter((t: Task) => t.priority === 'muy_baja').length,
    baja: tasks.filter((t: Task) => t.priority === 'baja').length,
    media: tasks.filter((t: Task) => t.priority === 'media').length,
    alta: tasks.filter((t: Task) => t.priority === 'alta').length,
    muy_alta: tasks.filter((t: Task) => t.priority === 'muy_alta').length,
  };

  const sections = [
    { title: 'Kanban', icon: 'grid-outline', screen: 'Kanban', color: '#009497', desc: 'Tablero de trabajo' },
    { title: 'Gantt', icon: 'bar-chart-outline', screen: 'Gantt', color: '#534AB7', desc: 'Cronograma' },
    { title: 'Agenda IA', icon: 'flash-outline', screen: 'Agenda', color: '#D85A30', desc: 'Generador inteligente' },
    { title: 'Reportes', icon: 'document-text-outline', screen: 'Reports', color: '#0080a3', desc: 'Informes y tendencias' },
    { title: 'Usuarios', icon: 'people-outline', screen: 'Users', color: '#BA7517', desc: 'Gestión de equipo' },
    { title: 'Grupos', icon: 'layers-outline', screen: 'Groups', color: '#10B981', desc: 'Áreas y categorías' },
  ];

  return (
    <View style={styles.flexContainer}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.name || 'Usuario'}</Text>
            <View style={styles.userMetaRow}>
              <Text style={styles.roleBadge}>{user?.role?.toUpperCase() || 'USUARIO'}</Text>
              {user?.group_name && (
                <Text style={styles.groupMeta}>• {user.group_name}</Text>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowPinModal(true)}
            >
              <Ionicons name="key-outline" size={20} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumen de Métricas */}
        <Text style={styles.sectionTitle}>Métricas Globales</Text>
        
        {isLoading ? (
          <ActivityIndicator color="#009497" size="large" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#E2F5F3' }]}>
                <Text style={[styles.statNumber, { color: '#009497' }]}>{totalTasks}</Text>
                <Text style={styles.statLabel}>Total Tareas</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>{completedTasks}</Text>
                <Text style={styles.statLabel}>Completadas</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{inProgressTasks}</Text>
                <Text style={styles.statLabel}>En Progreso</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.statNumber, { color: '#EF4444' }]}>{blockedTasks}</Text>
                <Text style={styles.statLabel}>Bloqueadas</Text>
              </View>
            </View>

            {/* Barra de Progreso de Cumplimiento */}
            <View style={styles.progressCard}>
              <View style={styles.progressCardHeader}>
                <Text style={styles.progressCardTitle}>Tasa de Cumplimiento</Text>
                <Text style={styles.progressCardPercent}>{completionRate}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[styles.progressBarFill, { width: `${completionRate}%` }]}
                />
              </View>
            </View>

            {/* Distribución por Prioridad */}
            <View style={styles.priorityCard}>
              <Text style={styles.cardHeaderTitle}>Distribución por Prioridad</Text>
              {(Object.keys(PRIORITY_LABELS) as PriorityLevel[]).map((p) => {
                const count = priorityCounts[p];
                const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                return (
                  <View key={p} style={styles.priorityRow}>
                    <View style={styles.priorityRowLeft}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: PRIORITY_COLORS[p] },
                        ]}
                      />
                      <Text style={styles.priorityText}>{PRIORITY_LABELS[p]}</Text>
                    </View>
                    <View style={styles.priorityBarTrack}>
                      <View
                        style={[
                          styles.priorityBarFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: PRIORITY_COLORS[p],
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.priorityCountText}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Acceso Rápido a Secciones */}
        <Text style={styles.sectionTitle}>Secciones del Sistema</Text>
        <View style={styles.sectionGrid}>
          {sections.map((sec) => (
            <TouchableOpacity
              key={sec.screen}
              style={styles.navCard}
              onPress={() => navigation.navigate(sec.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.navIconBox, { backgroundColor: sec.color + '15' }]}>
                <Ionicons name={sec.icon as any} size={24} color={sec.color} />
              </View>
              <Text style={styles.navCardTitle}>{sec.title}</Text>
              <Text style={styles.navCardDesc}>{sec.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <ChangePinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
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
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#009497',
    backgroundColor: '#E2F5F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  groupMeta: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressCardPercent: {
    fontSize: 14,
    fontWeight: '900',
    color: '#009497',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#009497',
    borderRadius: 5,
  },
  priorityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  priorityRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  priorityBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  priorityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  priorityCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    width: 20,
    textAlign: 'right',
  },
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  navCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  navIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  navCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  navCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});

export default DashboardScreen;
