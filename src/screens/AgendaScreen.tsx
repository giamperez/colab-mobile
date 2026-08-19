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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agendaApi } from '../api/agenda.api';
import { BottomNavBar } from '../components/BottomNavBar';

export const AgendaScreen = () => {
  const queryClient = useQueryClient();
  const [meetingNotes, setMeetingNotes] = useState('');
  const [channel, setChannel] = useState<'comovamos' | 'desarrolladores' | 'general'>('comovamos');
  const [resultData, setResultData] = useState<any>(null);

  const processMutation = useMutation({
    mutationFn: (dto: any) => agendaApi.process(dto).then((res) => res.data),
    onSuccess: (data: any) => {
      setResultData(data);
      queryClient.invalidateQueries({ queryKey: ['all-tasks-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      Alert.alert('¡Éxito!', 'Notas procesadas y tareas creadas automáticamente.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Falló el procesamiento de la agenda con IA.');
    },
  });

  const handleProcessAgenda = () => {
    if (!meetingNotes.trim()) {
      Alert.alert('Atención', 'Ingresa las notas de la reunión antes de procesar.');
      return;
    }
    processMutation.mutate({
      rawText: meetingNotes,
      channel,
    });
  };

  return (
    <View style={styles.flexContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.aiBadge}>
            <Ionicons name="flash-outline" size={14} color="#D85A30" />
            <Text style={styles.aiBadgeText}>IA ASSISTANT</Text>
          </View>
          <Text style={styles.title}>Agenda Inteligente</Text>
          <Text style={styles.subtitle}>
            Pega las minutas o notas de tu reunión. La IA identificará compromisos, asignados y fechas automáticamente.
          </Text>
        </View>

        {/* Selector de Canal */}
        <Text style={styles.label}>Canal o Proyecto Destino</Text>
        <View style={styles.channelRow}>
          {[
            { id: 'comovamos', label: 'Cómo Vamos' },
            { id: 'desarrolladores', label: 'Dev Team' },
            { id: 'general', label: 'General' },
          ].map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.channelPill,
                channel === c.id && styles.channelPillActive,
              ]}
              onPress={() => setChannel(c.id as any)}
            >
              <Text
                style={[
                  styles.channelPillText,
                  channel === c.id && styles.channelPillTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input de Notas */}
        <Text style={styles.label}>Minuta / Transcripción de Reunión</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={8}
          placeholder="Ej: En la reunión acordamos que Juan diseñará el prototipo para el viernes y María configurará los servidores el lunes..."
          placeholderTextColor="#94A3B8"
          value={meetingNotes}
          onChangeText={setMeetingNotes}
          textAlignVertical="top"
        />

        {/* Botón de Procesar */}
        <TouchableOpacity
          style={[styles.processBtn, processMutation.isPending && { opacity: 0.7 }]}
          onPress={handleProcessAgenda}
          disabled={processMutation.isPending}
        >
          {processMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.processBtnText}>Procesar Notas con IA</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Resultado Procesado */}
        {resultData && (
          <View style={styles.resultBox}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.resultTitle}>Resumen de la Reunión</Text>
            </View>
            <Text style={styles.resultSummary}>
              {resultData.summary || resultData.message || 'Notas procesadas con éxito.'}
            </Text>

            {resultData.createdTasks && resultData.createdTasks.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.tasksCreatedTitle}>
                  Tareas Generadas ({resultData.createdTasks.length})
                </Text>
                {resultData.createdTasks.map((t: any, idx: number) => (
                  <View key={idx} style={styles.taskItemResult}>
                    <Ionicons name="checkbox-outline" size={16} color="#009497" />
                    <Text style={styles.taskItemText}>{t.title || t}</Text>
                  </View>
                ))}
              </View>
            )}
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
    marginBottom: 20,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D85A30',
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
    marginTop: 12,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  channelPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelPillActive: {
    backgroundColor: '#D85A30',
    borderColor: '#D85A30',
  },
  channelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  channelPillTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 160,
    marginBottom: 16,
  },
  processBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D85A30',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#D85A30',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  processBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  resultBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  resultSummary: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  tasksCreatedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#009497',
    marginBottom: 6,
  },
  taskItemResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  taskItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
});

export default AgendaScreen;
