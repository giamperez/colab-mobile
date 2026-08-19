import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import { groupsApi } from '../api/groups.api';
import { BottomNavBar } from '../components/BottomNavBar';
import type { Group } from '../types';

export const ReportsScreen = () => {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(undefined);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups-list'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
  });

  const { data: weeklyTrend, isLoading: loadingTrend } = useQuery({
    queryKey: ['weekly-trend'],
    queryFn: () => reportsApi.getWeeklyTrend().then((res) => res.data),
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: (dto: any) => reportsApi.generate(dto).then((res) => res.data),
    onSuccess: (data: any) => {
      setGeneratedReport(data);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo generar el reporte.');
    },
  });

  const sendTelegramMutation = useMutation({
    mutationFn: (dto: any) => reportsApi.sendTelegram(dto).then((res) => res.data),
    onSuccess: () => {
      Alert.alert('¡Enviado!', 'El reporte ha sido enviado exitosamente al canal de Telegram.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Falló el envío por Telegram.');
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      type: reportType,
      channel: 'mobile',
      group_id: selectedGroupId,
    });
  };

  const handleSendTelegram = () => {
    if (!generatedReport) return;
    sendTelegramMutation.mutate({
      type: reportType,
      channel: 'general',
      content: generatedReport.summary || JSON.stringify(generatedReport),
      group_id: selectedGroupId,
    });
  };

  const handleShareNative = async () => {
    if (!generatedReport) return;
    try {
      await Share.share({
        message: `📊 Reporte Ejecutivo (${reportType.toUpperCase()})\n\n${
          generatedReport.summary || JSON.stringify(generatedReport)
        }`,
      });
    } catch (e) {
      // cancel or error
    }
  };

  return (
    <View style={styles.flexContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Informes y Reportes</Text>
          <Text style={styles.subtitle}>
            Genera métricas consolidadas, tendencias semanales e informes ejecutivos para compartir.
          </Text>
        </View>

        {/* Tipo de Reporte */}
        <Text style={styles.label}>Periodo del Reporte</Text>
        <View style={styles.pillRow}>
          {[
            { id: 'daily', label: 'Diario' },
            { id: 'weekly', label: 'Semanal' },
            { id: 'monthly', label: 'Mensual' },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.pill,
                reportType === t.id && styles.pillActive,
              ]}
              onPress={() => setReportType(t.id as any)}
            >
              <Text
                style={[
                  styles.pillText,
                  reportType === t.id && styles.pillTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grupo o Área */}
        <Text style={styles.label}>Filtrar por Área / Grupo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <TouchableOpacity
            style={[
              styles.pill,
              selectedGroupId === undefined && styles.pillActive,
              { marginRight: 8 },
            ]}
            onPress={() => setSelectedGroupId(undefined)}
          >
            <Text
              style={[
                styles.pillText,
                selectedGroupId === undefined && styles.pillTextActive,
              ]}
            >
              Todas las áreas
            </Text>
          </TouchableOpacity>
          {groups.map((g: Group) => (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.pill,
                selectedGroupId === g.id && styles.pillActive,
                { marginRight: 8 },
              ]}
              onPress={() => setSelectedGroupId(g.id)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedGroupId === g.id && styles.pillTextActive,
                ]}
              >
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Botón Generar */}
        <TouchableOpacity
          style={[styles.generateBtn, generateMutation.isPending && { opacity: 0.7 }]}
          onPress={handleGenerate}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="pie-chart-outline" size={20} color="#FFFFFF" />
              <Text style={styles.generateBtnText}>Generar Reporte Ahora</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Resultado del Reporte */}
        {generatedReport && (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Ionicons name="document-text-outline" size={22} color="#009497" />
              <Text style={styles.reportTitle}>Reporte Generado</Text>
            </View>
            <Text style={styles.reportText}>
              {generatedReport.summary || JSON.stringify(generatedReport, null, 2)}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShareNative}
              >
                <Ionicons name="share-social-outline" size={16} color="#009497" />
                <Text style={styles.shareBtnText}>Compartir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.telegramBtn}
                onPress={handleSendTelegram}
                disabled={sendTelegramMutation.isPending}
              >
                <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" />
                <Text style={styles.telegramBtnText}>Enviar a Telegram</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tendencias Semanales */}
        <Text style={[styles.label, { marginTop: 24 }]}>Tendencias de la Semana</Text>
        {loadingTrend ? (
          <ActivityIndicator color="#009497" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <Ionicons name="trending-up-outline" size={20} color="#10B981" />
              <Text style={styles.trendTitle}>Rendimiento del Equipo</Text>
            </View>
            <Text style={styles.trendDesc}>
              {weeklyTrend?.summary || 'Métricas de avance semanal acumuladas.'}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
    marginTop: 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#009497',
    borderColor: '#009497',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#009497',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#009497',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  reportText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#009497',
    backgroundColor: '#E2F5F3',
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#009497',
  },
  telegramBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0088CC',
    gap: 6,
  },
  telegramBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  trendTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  trendDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});

export default ReportsScreen;
