import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import { extractArray } from '../api/utils';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { AppDatePicker } from '../components/AppDatePicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import type { Report } from '../types';
import dayjs from 'dayjs';

export const ReportsScreen = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  // Fetch report history
  const { data: rawReports, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['reports-history'],
    queryFn: () => reportsApi.getAll().then((res) => res.data),
  });

  const reports: Report[] = extractArray<Report>(rawReports);

  // Generate Report Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload = { from: dateFrom, to: dateTo, type: reportType };
      if (reportType === 'daily') return (await reportsApi.generateDaily(payload)).data;
      if (reportType === 'monthly') return (await reportsApi.generateMonthly(payload)).data;
      return (await reportsApi.generateWeekly(payload)).data;
    },
    onSuccess: (data) => {
      const content =
        typeof data === 'string'
          ? data
          : data?.content || data?.report || data?.text || JSON.stringify(data, null, 2);
      setGeneratedContent(content);
    },
    onError: (err: any) => {
      Alert.alert(
        'Error al generar reporte',
        err.response?.data?.message || 'No se pudo generar el reporte.'
      );
    },
  });

  // Save Report Mutation
  const saveMutation = useMutation({
    mutationFn: (contentToSave: string) =>
      reportsApi.save({
        type: reportType,
        content: contentToSave,
        channel: 'mobile',
      }),
    onSuccess: () => {
      Alert.alert('Guardado', 'El reporte se guardó correctamente en el historial.');
      queryClient.invalidateQueries({ queryKey: ['reports-history'] });
    },
  });

  const handleShare = async (text: string) => {
    try {
      await Share.share({
        message: text,
        title: `Reporte ${reportType.toUpperCase()} - COLAB`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader
        title="Reportes Ejecutivos"
        subtitle="Genera y consulta resúmenes de rendimiento con IA"
      />

      {/* Tabs */}
      <View
        style={[
          styles.tabsRow,
          {
            backgroundColor: colors.bgSecondary,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'generate' && { borderBottomColor: colors.primary },
          ]}
          onPress={() => setActiveTab('generate')}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeTab === 'generate' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'generate' && { color: colors.primary, fontWeight: '800' },
            ]}
          >
            Generar Reporte
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'history' && { borderBottomColor: colors.primary },
          ]}
          onPress={() => {
            setActiveTab('history');
            refetchHistory();
          }}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'history' && { color: colors.primary, fontWeight: '800' },
            ]}
          >
            Historial ({reports.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 8) + 85 },
        ]}
      >
        {activeTab === 'generate' ? (
          <>
            {/* Options Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>PERIODO / TIPO DE REPORTE</Text>
              <View style={styles.typeGrid}>
                {[
                  { id: 'daily', label: 'Diario' },
                  { id: 'weekly', label: 'Semanal' },
                  { id: 'monthly', label: 'Mensual' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                      },
                      reportType === t.id && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setReportType(t.id as any)}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        { color: colors.textSecondary },
                        reportType === t.id && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.datesRow}>
                <View style={{ flex: 1 }}>
                  <AppDatePicker
                    label="DESDE"
                    value={dateFrom}
                    onChange={(d) => setDateFrom(d)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppDatePicker
                    label="HASTA"
                    value={dateTo}
                    onChange={(d) => setDateTo(d)}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                  generateMutation.isPending && { opacity: 0.7 },
                ]}
                onPress={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.btnContent}>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.generateBtnText}>SINTETIZAR REPORTE</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Generated Report View */}
            {generatedContent && (
              <View
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: colors.bgSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.resultHeader, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.resultTitleRow}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                      Resumen Ejecutivo ({reportType.toUpperCase()})
                    </Text>
                  </View>
                  <View style={styles.actionIcons}>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.primaryMuted }]}
                      onPress={() => handleShare(generatedContent)}
                    >
                      <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.primaryMuted }]}
                      onPress={() => saveMutation.mutate(generatedContent)}
                      disabled={saveMutation.isPending}
                    >
                      <Ionicons name="save-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.reportContentText, { color: colors.textPrimary }]}>{generatedContent}</Text>
              </View>
            )}
          </>
        ) : (
          /* History View */
          <View style={styles.historyContainer}>
            {isLoadingHistory ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
            ) : reports.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="folder-open-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin reportes guardados</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Genera un reporte y guárdalo para consultarlo cuando quieras.
                </Text>
              </View>
            ) : (
              reports.map((r) => (
                <View
                  key={r.id}
                  style={[
                    styles.historyCard,
                    {
                      backgroundColor: colors.bgSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.historyHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primaryMuted }]}>
                      <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                        {r.type?.toUpperCase() || r.tipo?.toUpperCase() || 'REPORTE'}
                      </Text>
                    </View>
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                      {dayjs(r.created_at || r.createdAt).format('DD MMM YYYY, HH:mm')}
                    </Text>
                  </View>

                  <Text style={[styles.historyContent, { color: colors.textSecondary }]} numberOfLines={4}>
                    {r.content || r.contenido}
                  </Text>

                  <TouchableOpacity
                    style={[styles.historyShareBtn, { backgroundColor: colors.bgSurface }]}
                    onPress={() => handleShare(r.content || r.contenido || '')}
                  >
                    <Ionicons name="share-social-outline" size={14} color={colors.primary} />
                    <Text style={[styles.historyShareText, { color: colors.primary }]}>Compartir</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <BottomNavBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#009497',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#009497',
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: '#009497',
    borderColor: '#009497',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  datesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  generateBtn: {
    backgroundColor: '#009497',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#009497',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#E2F5F3',
  },
  reportContentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  historyContainer: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#E2F5F3',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#009497',
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  historyContent: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  historyShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  historyShareText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009497',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
});

export default ReportsScreen;
