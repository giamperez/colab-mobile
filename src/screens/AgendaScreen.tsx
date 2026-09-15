import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agendaApi } from '../api/agenda.api';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppHeader } from '../components/AppHeader';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../types';
import type { Task } from '../types';

const SOURCE_OPTIONS = [
  { id: 'api', label: '📱 Móvil / API' },
  { id: 'whatsapp', label: '💬 WhatsApp' },
  { id: 'web', label: '💻 Web' },
  { id: 'telegram', label: '👥 Telegram' },
];

export const AgendaScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const [rawText, setRawText] = useState('');
  const [source, setSource] = useState('api');
  const [executionDate, setExecutionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [result, setResult] = useState<{ tasks_created: number; tasks?: Task[] } | null>(null);

  const processMutation = useMutation({
    mutationFn: (dto: any) => agendaApi.process(dto).then((res) => res.data),
    onSuccess: (data) => {
      setResult(data);
      Alert.alert(
        '¡Agenda Procesada!',
        `Se han estructurado y creado ${data.tasks_created || 0} tareas automáticamente.`
      );
      setRawText('');
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-dashboard-all'] });
    },
    onError: (err: any) => {
      Alert.alert(
        'Error al procesar',
        err.response?.data?.message || 'No se pudo procesar la agenda.'
      );
    },
  });

  const handleProcess = () => {
    if (!rawText.trim()) {
      Alert.alert('Texto Requerido', 'Por favor ingresa o pega el texto de la agenda o minuta.');
      return;
    }
    processMutation.mutate({
      raw_text: rawText.trim(),
      source,
      execution_date: executionDate,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <AppHeader
        title="Bitácora & Agenda"
        subtitle="Transforma notas y minutas en tareas estructuradas con IA"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 8) + 85 },
        ]}
      >
        {/* Intro Card */}
        <View
          style={[
            styles.introCard,
            {
              backgroundColor: colors.primaryMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={[styles.introIconCircle, { backgroundColor: colors.bgSurface }]}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.introTitle, { color: colors.textPrimary }]}>Extracción Inteligente</Text>
            <Text style={[styles.introDesc, { color: colors.primary }]}>
              Pega apuntes de reuniones o mensajes. El sistema detectará responsables,
              prioridades y creará las tareas.
            </Text>
          </View>
        </View>

        {/* Input Form */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.textSecondary }]}>NOTAS / MINUTA DE REUNIÓN *</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder={`Ejemplo:\n- Carlos debe enviar la cotización para el cliente Acero antes de las 5pm.\n- María actualizará el cronograma de la campaña en Gantt.\n- Revisar el estado de los pagos pendientes.`}
            placeholderTextColor={colors.textMuted}
            value={rawText}
            onChangeText={setRawText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>FECHA DE EJECUCIÓN</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={executionDate}
                onChangeText={setExecutionDate}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>ORIGEN DE LA INFORMACIÓN</Text>
          <View style={styles.sourceGrid}>
            {SOURCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.sourcePill,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.border,
                  },
                  source === opt.id && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setSource(opt.id)}
              >
                <Text
                  style={[
                    styles.sourcePillText,
                    { color: colors.textSecondary },
                    source === opt.id && styles.sourcePillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.processBtn,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
              processMutation.isPending && { opacity: 0.7 },
            ]}
            onPress={handleProcess}
            disabled={processMutation.isPending}
          >
            {processMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="flash-outline" size={18} color="#FFFFFF" />
                <Text style={styles.processBtnText}>PROCESAR Y CREAR TAREAS</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Results Box */}
        {result && (
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={22} color={colors.mint} />
              <Text style={[styles.resultTitle, { color: colors.mint }]}>
                ¡Se crearon {result.tasks_created} tareas con éxito!
              </Text>
            </View>
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
              DeepSeek extrajo las tareas asignadas por responsable y fechas de ejecución.
            </Text>

            {result.tasks && result.tasks.length > 0 && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {result.tasks.map((task: any, idx: number) => {
                  const pCol = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || colors.primary;
                  return (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, flex: 1 }}>
                          {task.title}
                        </Text>
                        <View style={{ backgroundColor: pCol + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: pCol, textTransform: 'uppercase' }}>
                            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}
                          </Text>
                        </View>
                      </View>
                      {task.description ? (
                        <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={2}>
                          {task.description}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14 }}>{task.assignee?.emoji || '👤'}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                            {task.assignee?.name || task.assignee?.nombre || 'Sin asignar'}
                          </Text>
                        </View>
                        {task.execution_date && (
                          <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>
                            📅 {String(task.execution_date).split('T')[0]}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              onPress={() => navigation.navigate('Kanban')}
            >
              <Ionicons name="grid-outline" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>IR AL TABLERO KANBAN</Text>
            </TouchableOpacity>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#E6F6F6',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  introIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  introDesc: {
    fontSize: 12,
    color: '#007072',
    lineHeight: 16,
    marginTop: 2,
  },
  formCard: {
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
    marginTop: 10,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 130,
  },
  row: {
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
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sourcePillActive: {
    backgroundColor: '#009497',
    borderColor: '#009497',
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sourcePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  processBtn: {
    backgroundColor: '#009497',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
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
  processBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 4,
  },
});

export default AgendaScreen;
