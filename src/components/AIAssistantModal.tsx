import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { agendaApi } from '../api/agenda.api';
import { tasksApi } from '../api/tasks.api';
import { usersApi } from '../api/users.api';
import { ganttApi } from '../api/gantt.api';
import { groupsApi } from '../api/groups.api';
import { extractArray } from '../api/utils';
import { PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel } from '../types';
import type { Task, User, GanttItem, Group } from '../types';
import dayjs from 'dayjs';
import { parseTaskPrompt } from '../utils/aiPromptParser';

// Voice Dictation enabled for continuous Spanish speech-to-text
const VOICE_DICTATION_ENABLED = true;

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: (name: string, handler: (event: any) => void) => void = () => {};
try {
  const speechModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechModule?.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule?.useSpeechRecognitionEvent || (() => {});
} catch (e) {
  // Graceful fallback when running in standard Expo Go without native build
}

// The /agenda/process response returns raw Prisma task rows (titulo, prioridad,
// fechaVencimiento, responsableId...) plus two fields that only ever live in this
// response, never persisted to the DB: hora and recordatorioMinutos.
interface ProcessedTaskResult {
  id: number;
  titulo: string;
  prioridad?: string;
  fechaVencimiento?: string;
  responsableId?: number | null;
  hora?: string | null;
  recordatorioMinutos?: number | null;
}

const formatFriendlyDate = (d: dayjs.Dayjs) => {
  const today = dayjs().startOf('day');
  const target = d.startOf('day');
  if (target.isSame(today, 'day')) return 'Hoy';
  if (target.isSame(today.add(1, 'day'), 'day')) return 'Mañana';
  return d.format('DD MMM');
};

export interface AIAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
  isVoiceMode?: boolean;
  selectedProjectId?: number | null;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  visible,
  onClose,
  initialPrompt = '',
  isVoiceMode = false,
  selectedProjectId = null,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();

  const [promptText, setPromptText] = useState(initialPrompt);
  const [isRecording, setIsRecording] = useState(VOICE_DICTATION_ENABLED && isVoiceMode);
  const [clarificationData, setClarificationData] = useState<{
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    timeFormatted?: string;
    assigneeId?: number;
    assigneeName?: string;
    priority?: PriorityLevel;
    projectId?: number;
    projectName?: string;
    groupId?: number;
    groupName?: string;
  }>({});

  const [userOverrides, setUserOverrides] = useState<{
    title?: boolean;
    date?: boolean;
    assignee?: boolean;
    priority?: boolean;
    project?: boolean;
    group?: boolean;
  }>({});

  const [processedTasks, setProcessedTasks] = useState<ProcessedTaskResult[]>([]);
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const micWaveAnim = useRef(new Animated.Value(0)).current;

  // Accumulates finalized speech segments across a continuous dictation session —
  // interim (not-yet-final) results are shown live but never committed here.
  const finalTranscriptRef = useRef('');

  // Fetch Users & Projects for quick clarification
  const { data: rawUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
    enabled: visible,
  });

  const { data: rawGantt } = useQuery({
    queryKey: ['gantt-list'],
    queryFn: () => ganttApi.getAll().then((res) => res.data),
    enabled: visible,
  });

  const { data: rawGroups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupsApi.getAll().then((res) => res.data),
    enabled: visible,
  });

  const users: User[] = useMemo(() => extractArray<User>(rawUsers), [rawUsers]);
  const projects: GanttItem[] = useMemo(() => extractArray<GanttItem>(rawGantt), [rawGantt]);
  const groups: Group[] = useMemo(() => extractArray<Group>(rawGroups), [rawGroups]);

  const lastParsedPromptRef = useRef('');

  const getAssigneeName = (responsableId?: number | null) => {
    if (!responsableId) return null;
    const match = users.find((u) => u.id === responsableId);
    return match?.nombre || match?.name || null;
  };

  // Safe unique date chips that never collide in React keys
  const dateOptions = useMemo(() => {
    const today = dayjs();
    const tomorrow = today.add(1, 'day');
    const dayOfWeek = today.day(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

    let weekendDate = today.day(6);
    let weekendLabel = '🗓️ Sábado';
    if (dayOfWeek === 5) {
      // If today is Friday, tomorrow is Saturday, so offer Sunday to avoid duplicate dates
      weekendDate = today.day(7); // Sunday
      weekendLabel = '🗓️ Domingo';
    } else if (dayOfWeek === 6) {
      weekendDate = today.add(1, 'day');
      weekendLabel = '🗓️ Domingo';
    } else {
      weekendLabel = '🗓️ Fin de semana';
    }

    return [
      { key: 'chip-today', date: today.format('YYYY-MM-DD'), label: '📅 Hoy' },
      { key: 'chip-tomorrow', date: tomorrow.format('YYYY-MM-DD'), label: '☀️ Mañana' },
      { key: 'chip-weekend', date: weekendDate.format('YYYY-MM-DD'), label: weekendLabel },
      { key: 'chip-in-7-days', date: today.add(7, 'day').format('YYYY-MM-DD'), label: '⏳ En 7 días' },
    ];
  }, []);

  // Sync initial prompt, run initial NLP extraction & voice mode
  useEffect(() => {
    if (visible) {
      setPromptText(initialPrompt);
      setIsRecording(VOICE_DICTATION_ENABLED && isVoiceMode);
      setUserOverrides({});
      lastParsedPromptRef.current = initialPrompt.trim();

      const parsed = initialPrompt.trim() ? parseTaskPrompt(initialPrompt, users, projects) : null;
      setClarificationData({
        title: parsed?.title,
        description: parsed?.description,
        date: parsed?.date,
        time: parsed?.time,
        timeFormatted: parsed?.timeFormatted,
        assigneeId: parsed?.assigneeId,
        assigneeName: parsed?.assigneeName,
        priority: parsed?.priority || 'media',
        projectId: selectedProjectId || parsed?.projectId || undefined,
        projectName: parsed?.projectName,
        groupId: undefined,
        groupName: undefined,
      });
      setProcessedTasks([]);
      setCreatedCount(null);
    }
  }, [visible, initialPrompt, isVoiceMode, selectedProjectId, users, projects]);

  // Real-time NLP parsing as user types in the input box
  useEffect(() => {
    if (!visible || !promptText.trim()) return;
    if (lastParsedPromptRef.current === promptText.trim()) return;
    lastParsedPromptRef.current = promptText.trim();

    const parsed = parseTaskPrompt(promptText, users, projects);

    setClarificationData((prev) => ({
      ...prev,
      title: userOverrides.title ? prev.title : parsed.title,
      description: parsed.description,
      date: userOverrides.date ? prev.date : (parsed.date || prev.date),
      time: parsed.time,
      timeFormatted: parsed.timeFormatted,
      assigneeId: userOverrides.assignee ? prev.assigneeId : (parsed.assigneeId ?? prev.assigneeId),
      assigneeName: userOverrides.assignee ? prev.assigneeName : (parsed.assigneeName ?? prev.assigneeName),
      priority: userOverrides.priority ? prev.priority : (parsed.priority || prev.priority || 'media'),
      projectId: userOverrides.project ? prev.projectId : (prev.projectId || parsed.projectId),
      projectName: userOverrides.project ? prev.projectName : (prev.projectName || parsed.projectName),
    }));
  }, [promptText, visible, users, projects, userOverrides]);

  // Recording pulse animation
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRecording]);

  // Drives the real on-device speech recognizer from isRecording — this is the
  // single source of truth for start/stop, so the mic button and the "open in
  // voice mode" path (isVoiceMode from the header) both just toggle isRecording.
  useEffect(() => {
    if (!VOICE_DICTATION_ENABLED) return;
    let cancelled = false;

    const startRecording = async () => {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Permiso de Micrófono',
              message: 'Colab necesita acceso al micrófono para el dictado por voz.',
              buttonPositive: 'Permitir',
              buttonNegative: 'Cancelar',
            }
          );
        } catch (err) {
          console.warn('PermissionsAndroid error in AIAssistantModal:', err);
        }
      }

      if (ExpoSpeechRecognitionModule?.requestPermissionsAsync) {
        finalTranscriptRef.current = promptText;
        ExpoSpeechRecognitionModule.requestPermissionsAsync()
          .then((result: any) => {
            if (cancelled) return;
            if (!result?.granted) {
              setIsRecording(false);
              showError('Permiso denegado', 'Activa el micrófono y el reconocimiento de voz en Ajustes para dictar.');
              return;
            }
            ExpoSpeechRecognitionModule.start({
              lang: 'es-ES',
              interimResults: true,
              continuous: true,
            });
          })
          .catch((err: any) => {
            if (!cancelled) {
              setIsRecording(false);
              showError('Error de micrófono', 'No se pudo iniciar el reconocimiento de voz.');
            }
          });
      }
    };

    if (visible && isRecording) {
      startRecording();
    } else if (ExpoSpeechRecognitionModule) {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (_) {}
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isRecording]);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    if (event.isFinal) {
      finalTranscriptRef.current = [finalTranscriptRef.current, text].filter(Boolean).join(' ');
      setPromptText(finalTranscriptRef.current);
    } else {
      setPromptText([finalTranscriptRef.current, text].filter(Boolean).join(' '));
    }
  });

  useSpeechRecognitionEvent('end', () => {
    // Dictation only fills the text field — the user reviews/edits it and taps
    // "Agendar con IA" explicitly before anything gets sent to the AI or created.
    setIsRecording(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecording(false);
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      showError('Error de dictado', event.message || 'No se pudo transcribir el audio.');
    }
  });

  // AI Agenda Process Mutation
  const processAIMutation = useMutation({
    mutationFn: async (text: string) => {
      // Send raw text with context; source must be a valid backend enum: web, whatsapp, telegram, api
      const fullText = buildEnrichedPrompt(text);
      const res = await agendaApi.process({
        raw_text: fullText,
        source: 'api',
        execution_date: clarificationData.date || dayjs().format('YYYY-MM-DD'),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-dashboard-all'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-agenda'] });

      const rawTasks = (data as any)?.tasks || (data as any)?.data || (Array.isArray(data) ? data : []);
      const mapped: ProcessedTaskResult[] = rawTasks.map((t: any) => ({
        id: t.id,
        titulo: t.title || t.titulo || 'Tarea creada con IA',
        prioridad: t.priority || t.prioridad,
        fechaVencimiento: t.due_date || t.fechaVencimiento || t.execution_date,
        responsableId: t.assignee_id || t.responsableId || t.assignee?.id,
        hora: t.time || t.hora || null,
        recordatorioMinutos: t.recordatorioMinutos || null,
      }));

      setProcessedTasks(mapped);
      setCreatedCount(mapped.length);
      showSuccess(
        'Procesado con éxito',
        mapped.length === 1
          ? `Se agendó 1 tarea: "${mapped[0].titulo}"`
          : `Se agendaron ${mapped.length} tareas en tu calendario.`
      );
    },
    onError: (err: any) => {
      console.error('Error processing AI prompt:', err);
      showError('Error al procesar', err.response?.data?.message || 'No se pudo procesar la instrucción con IA.');
    },
  });

  // Helper to append clarification details if selected
  const buildEnrichedPrompt = (base: string) => {
    let result = base;
    if (clarificationData.title) {
      result += ` [Título: ${clarificationData.title}]`;
    }
    if (clarificationData.date) {
      result += ` [Fecha: ${clarificationData.date}]`;
    }
    if (clarificationData.timeFormatted) {
      result += ` [Hora: ${clarificationData.timeFormatted}]`;
    }
    if (clarificationData.assigneeName) {
      result += ` [Asignado a: ${clarificationData.assigneeName}]`;
    }
    if (clarificationData.priority) {
      result += ` [Prioridad: ${clarificationData.priority}]`;
    }
    if (clarificationData.projectId) {
      result += ` [Proyecto ID: ${clarificationData.projectId}]`;
    }
    if (clarificationData.groupId) {
      result += ` [Grupo: ${clarificationData.groupName}]`;
    }
    return result;
  };

  // Helper to get formatted priority text & color
  const getPriorityInfo = (pri?: string) => {
    const p = (pri?.toLowerCase() as PriorityLevel) || 'media';
    return {
      label: PRIORITY_LABELS[p] || 'Media',
      color: PRIORITY_COLORS[p] || colors.primary,
    };
  };

  // Quick action to add directly with clarified parameters (bypass full AI parse if user just wants simple add)
  const handleQuickAddDirectly = async () => {
    const finalTitle = clarificationData.title?.trim() || promptText.trim();
    if (!finalTitle) return;

    try {
      const parsed = parseTaskPrompt(promptText, users, projects);
      const finalDate = clarificationData.date || parsed.date || dayjs().format('YYYY-MM-DD');
      const finalPriority = clarificationData.priority || parsed.priority || 'media';
      const finalAssigneeId = clarificationData.assigneeId !== undefined ? clarificationData.assigneeId : parsed.assigneeId;
      const finalProjectId = clarificationData.projectId !== undefined ? clarificationData.projectId : parsed.projectId;

      const res = await tasksApi.create({
        title: finalTitle,
        titulo: finalTitle,
        execution_date: finalDate,
        due_date: finalDate,
        priority: finalPriority,
        assignee_id: finalAssigneeId || undefined,
        gantt_item_id: finalProjectId || undefined,
        status: 'pendiente',
      });

      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });

      const newTaskId = (res as any)?.data?.id || Date.now();
      setCreatedCount(1);
      setProcessedTasks([
        {
          id: newTaskId,
          titulo: finalTitle,
          prioridad: finalPriority,
          fechaVencimiento: finalDate,
          responsableId: finalAssigneeId,
          hora: clarificationData.timeFormatted || parsed.timeFormatted || null,
        },
      ]);
      showSuccess('Tarea creada', `Se ha agendado "${finalTitle}"`);
    } catch (e: any) {
      showError('Error al crear', e.response?.data?.message || 'No se pudo agendar la tarea.');
    }
  };

  // Trigger AI processing
  const handleAnalyzeAndSchedule = () => {
    if (!promptText.trim()) return;
    setIsRecording(false);
    processAIMutation.mutate(promptText.trim());
  };

  // Check if prompt seems incomplete/brief (under 4 words or lacking context)
  const isPromptBrief = promptText.trim().split(/\s+/).length < 4 && !clarificationData.date;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheetContainer, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={styles.handleBox}>
            <View style={[styles.handlePill, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleCol}>
              <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
                Creación inteligente por voz
              </Text>
              <Text style={[styles.mainSubtitle, { color: colors.textMuted }]}>
                Colab identifica tarea, fecha, hora, prioridad y recordatorio.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {createdCount === null ? (
              <>
                {/* Input & Dictation Area */}
                <View style={[styles.inputBox, { backgroundColor: colors.bgSurface, borderColor: isRecording ? colors.primary : colors.borderSubtle }]}>
                  <TextInput
                    style={[styles.mainInput, { color: colors.textPrimary }]}
                    placeholder="Escribe o dicta una tarea, minuta o planificación (ej. 'Crear campaña de lanzamiento para el viernes con Juan')..."
                    placeholderTextColor={colors.textMuted}
                    value={promptText}
                    onChangeText={setPromptText}
                    multiline
                    numberOfLines={3}
                    autoFocus={!isVoiceMode}
                  />

                  {/* Dictation Bottom Control */}
                  <View style={styles.inputFooter}>
                    <TouchableOpacity
                      style={[
                        styles.micBtn,
                        {
                          backgroundColor: isRecording ? colors.primaryMuted : colors.bgSecondary,
                          borderColor: isRecording ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        setIsRecording((prev) => !prev);
                      }}
                      activeOpacity={0.75}
                    >
                      <Animated.View style={isRecording ? { transform: [{ scale: pulseAnim }] } : undefined}>
                        <Ionicons
                          name={isRecording ? 'mic' : 'mic-outline'}
                          size={18}
                          color={colors.primary}
                        />
                      </Animated.View>
                      <Text style={[styles.micLabel, { color: isRecording ? colors.primary : colors.textSecondary }]}>
                        {isRecording ? 'Escuchando tu voz...' : 'Dictar por voz'}
                      </Text>
                    </TouchableOpacity>

                    {promptText.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setPromptText('');
                          finalTranscriptRef.current = '';
                          lastParsedPromptRef.current = '';
                          setClarificationData({});
                        }}
                        style={styles.clearBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>Borrar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Smart Clarification Section */}
                {promptText.trim().length > 0 && (
                  <View style={[styles.clarificationSection, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="options" size={14} color={colors.primary} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        {isPromptBrief ? 'Detalles clave sugeridos' : 'Detalles detectados por la IA'}
                      </Text>
                    </View>

                    {/* Título limpio sugerido */}
                    {clarificationData.title && (
                      <View style={[styles.cleanTitleBox, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}>
                        <Ionicons name="create-outline" size={15} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cleanTitleLabel, { color: colors.textMuted }]}>TÍTULO DE LA TAREA</Text>
                          <TextInput
                            style={[styles.cleanTitleInput, { color: colors.textPrimary }]}
                            value={clarificationData.title}
                            onChangeText={(txt) => {
                              setUserOverrides((m) => ({ ...m, title: true }));
                              setClarificationData((prev) => ({ ...prev, title: txt }));
                            }}
                            placeholder="Título estructurado..."
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                      </View>
                    )}

                    {/* 1. Fecha de entrega */}
                    <View style={styles.chipHeaderLine}>
                      <Text style={[styles.chipGroupLabel, { color: colors.textMuted }]}>FECHA LÍMITE</Text>
                      {clarificationData.timeFormatted && (
                        <View style={[styles.timeBadge, { backgroundColor: colors.primaryMuted }]}>
                          <Ionicons name="time-outline" size={11} color={colors.primary} />
                          <Text style={[styles.timeBadgeText, { color: colors.primary }]}>
                            {clarificationData.timeFormatted}
                          </Text>
                        </View>
                      )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                      {dateOptions.map((d: { key: string; date: string; label: string }) => {
                        const isSelected = clarificationData.date === d.date;
                        return (
                          <TouchableOpacity
                            key={d.key}
                            style={[
                              styles.chip,
                              { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle },
                              isSelected && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                            ]}
                            onPress={() => {
                              setUserOverrides((m) => ({ ...m, date: true }));
                              setClarificationData((prev) => ({
                                ...prev,
                                date: isSelected ? undefined : d.date,
                              }));
                            }}
                          >
                            <Text style={[styles.chipText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                              {d.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* 2. Responsable / Asignado */}
                    {users.length > 0 && (
                      <>
                        <Text style={[styles.chipGroupLabel, { color: colors.textMuted }]}>RESPONSABLE</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                          {users.slice(0, 10).map((u) => {
                            const isSelected = clarificationData.assigneeId === u.id;
                            return (
                              <TouchableOpacity
                                key={`user-${u.id}`}
                                style={[
                                  styles.chip,
                                  { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle },
                                  isSelected && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                                ]}
                                onPress={() => {
                                  setUserOverrides((m) => ({ ...m, assignee: true }));
                                  setClarificationData((prev) => ({
                                    ...prev,
                                    assigneeId: isSelected ? undefined : u.id,
                                    assigneeName: isSelected ? undefined : u.nombre,
                                  }));
                                }}
                              >
                                <Ionicons name="person-circle-outline" size={13} color={isSelected ? colors.primary : colors.textMuted} />
                                <Text style={[styles.chipText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                                  {u.nombre?.split(' ')[0]}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </>
                    )}

                    {/* 3. Prioridad */}
                    <Text style={[styles.chipGroupLabel, { color: colors.textMuted }]}>PRIORIDAD</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                      {(['baja', 'media', 'alta', 'muy_alta'] as PriorityLevel[]).map((p) => {
                        const isSelected = (clarificationData.priority || 'media') === p;
                        const pCol = PRIORITY_COLORS[p] || colors.primary;
                        return (
                          <TouchableOpacity
                            key={`prio-${p}`}
                            style={[
                              styles.chip,
                              { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle },
                              isSelected && { backgroundColor: `${pCol}25`, borderColor: pCol },
                            ]}
                            onPress={() => {
                              setUserOverrides((m) => ({ ...m, priority: true }));
                              setClarificationData((prev) => ({ ...prev, priority: p }));
                            }}
                          >
                            <View style={[styles.resultPriorityDot, { backgroundColor: pCol }]} />
                            <Text style={[styles.chipText, { color: isSelected ? pCol : colors.textSecondary }]}>
                              {PRIORITY_LABELS[p]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* 4. Proyecto / Planificación vinculada */}
                    {projects.length > 0 && (
                      <>
                        <Text style={[styles.chipGroupLabel, { color: colors.textMuted }]}>VINCULAR A PLAN</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                          {projects.slice(0, 6).map((p) => {
                            const isSelected = clarificationData.projectId === p.id;
                            return (
                              <TouchableOpacity
                                key={`plan-${p.id}`}
                                style={[
                                  styles.chip,
                                  { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle },
                                  isSelected && { backgroundColor: '#8B5CF625', borderColor: '#8B5CF6' },
                                ]}
                                onPress={() => {
                                  setUserOverrides((m) => ({ ...m, project: true }));
                                  setClarificationData((prev) => ({
                                    ...prev,
                                    projectId: isSelected ? undefined : p.id,
                                    projectName: isSelected ? undefined : (p.title || p.nombre),
                                  }));
                                }}
                              >
                                <Ionicons name="folder-outline" size={13} color={isSelected ? '#8B5CF6' : colors.textMuted} />
                                <Text style={[styles.chipText, { color: isSelected ? '#8B5CF6' : colors.textSecondary }]}>
                                  {p.title || p.nombre}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </>
                    )}

                    {/* 5. Grupo / Equipo */}
                    {groups.length > 0 && (
                      <>
                        <Text style={[styles.chipGroupLabel, { color: colors.textMuted }]}>GRUPO / EQUIPO</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                          {groups.slice(0, 6).map((g) => {
                            const isSelected = clarificationData.groupId === g.id;
                            const gCol = g.color || '#009497';
                            return (
                              <TouchableOpacity
                                key={`group-${g.id}`}
                                style={[
                                  styles.chip,
                                  { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle },
                                  isSelected && { backgroundColor: `${gCol}25`, borderColor: gCol },
                                ]}
                                onPress={() => {
                                  setUserOverrides((m) => ({ ...m, group: true }));
                                  setClarificationData((prev) => ({
                                    ...prev,
                                    groupId: isSelected ? undefined : g.id,
                                    groupName: isSelected ? undefined : (g.nombre || g.name),
                                  }));
                                }}
                              >
                                <Ionicons name="people-outline" size={13} color={isSelected ? gCol : colors.textMuted} />
                                <Text style={[styles.chipText, { color: isSelected ? gCol : colors.textSecondary }]}>
                                  {g.nombre || g.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </>
                    )}
                  </View>
                )}
              </>
            ) : (
              /* Success confirmation view matching user's design */
              <View style={styles.resultWrap}>
                {/* Green Checkmark Badge */}
                <View style={styles.resultCheckBadge}>
                  <Ionicons name="checkmark" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.resultHeaderLabel}>TAREA CREADA AUTOMÁTICAMENTE</Text>

                {processedTasks.map((task) => {
                  // fechaVencimiento comes back as a UTC timestamp (e.g. "...T00:00:00.000Z");
                  // parsing it directly with dayjs converts to local time and rolls back a day
                  // in negative UTC offsets. Take only the calendar date part.
                  const dueDate = task.fechaVencimiento ? dayjs(String(task.fechaVencimiento).split('T')[0]) : null;
                  const priorityKey = (task.prioridad || 'media').toLowerCase() as PriorityLevel;
                  const assigneeName = getAssigneeName(task.responsableId) || (user?.nombre || user?.name || 'Vertex');
                  const projectName = clarificationData.projectName || (user?.companyName ? user.companyName : 'Colab App');

                  const hourDisplay = task.hora
                    ? task.hora
                    : clarificationData.time || (clarificationData.timeFormatted ? clarificationData.timeFormatted.split(' ')[0] : '09:00');

                  const dateDisplay = dueDate ? formatFriendlyDate(dueDate) : 'Mañana';
                  const reminderDisplay = typeof task.recordatorioMinutos === 'number'
                    ? `${task.recordatorioMinutos} min antes`
                    : '30 min antes';
                  const pCol = PRIORITY_COLORS[priorityKey] || '#EF4444';

                  return (
                    <View key={task.id} style={styles.successBlock}>
                      {/* Big Task Title */}
                      <Text style={[styles.resultTaskTitle, { color: colors.textPrimary }]}>
                        {task.titulo}
                      </Text>

                      {/* 2x2 Grid Pills */}
                      <View style={styles.grid2x2}>
                        {/* Row 1: Fecha & Hora */}
                        <View style={styles.gridRow}>
                          <View style={[styles.resultPill, { backgroundColor: isDark ? colors.bgSurface : '#FFFFFF', borderColor: colors.borderSubtle }]}>
                            <Ionicons name="calendar-outline" size={17} color="#6366F1" />
                            <Text style={[styles.resultPillText, { color: colors.textPrimary }]}>
                              {dateDisplay}
                            </Text>
                          </View>

                          <View style={[styles.resultPill, { backgroundColor: isDark ? colors.bgSurface : '#FFFFFF', borderColor: colors.borderSubtle }]}>
                            <Ionicons name="time-outline" size={17} color="#6366F1" />
                            <Text style={[styles.resultPillText, { color: colors.textPrimary }]}>
                              {hourDisplay}
                            </Text>
                          </View>
                        </View>

                        {/* Row 2: Prioridad & Recordatorio */}
                        <View style={styles.gridRow}>
                          <View style={[styles.resultPill, { backgroundColor: isDark ? colors.bgSurface : '#FFFFFF', borderColor: colors.borderSubtle }]}>
                            <View style={[styles.resultPriorityDot, { backgroundColor: pCol }]} />
                            <Text style={[styles.resultPillText, { color: colors.textPrimary }]}>
                              {PRIORITY_LABELS[priorityKey] || 'Media'}
                            </Text>
                          </View>

                          <View style={[styles.resultPill, { backgroundColor: isDark ? colors.bgSurface : '#FFFFFF', borderColor: colors.borderSubtle }]}>
                            <Ionicons name="notifications-outline" size={17} color="#6366F1" />
                            <Text style={[styles.resultPillText, { color: colors.textPrimary }]}>
                              {reminderDisplay}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Assignee Card */}
                      <View style={[styles.resultAssigneeRow, { backgroundColor: isDark ? colors.bgSurface : '#FFFFFF', borderColor: colors.borderSubtle }]}>
                        <Ionicons name="sparkles" size={15} color="#6366F1" />
                        <Text style={[styles.resultAssigneeText, { color: colors.textSecondary }]}>
                          Colab la asignó a <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{assigneeName}</Text> · {projectName}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.borderSubtle }]}>
            {createdCount !== null ? (
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#6366F1' }]}
                onPress={() => {
                  onClose();
                  navigation.navigate('Kanban');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Ver en mis tareas</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: promptText.trim() ? '#6366F1' : colors.textMuted },
                ]}
                onPress={handleAnalyzeAndSchedule}
                disabled={!promptText.trim() || processAIMutation.isPending}
                activeOpacity={0.85}
              >
                {processAIMutation.isPending ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Procesando con IA...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {isPromptBrief ? 'Agendar con IA' : 'Procesar y Agendar con IA'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  handleBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handlePill: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerTitleCol: {
    flex: 1,
    gap: 3,
    paddingRight: 10,
  },
  mainTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  mainSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  inputBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
  },
  mainInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 65,
    textAlignVertical: 'top',
    padding: 0,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  micBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  micLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  clarificationSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  cleanTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  cleanTitleLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cleanTitleInput: {
    fontSize: 13,
    fontWeight: '700',
    padding: 0,
    marginTop: 1,
  },
  chipHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  chipGroupLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  resultWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  resultCheckBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  resultHeaderLabel: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  successBlock: {
    width: '100%',
    alignItems: 'center',
  },
  resultTaskTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
    lineHeight: 28,
  },
  grid2x2: {
    width: '100%',
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  resultPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  resultPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultPriorityDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  resultAssigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.2,
    marginTop: 12,
  },
  resultAssigneeText: {
    fontSize: 12.5,
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default AIAssistantModal;
