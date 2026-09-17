import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMascot } from '../context/MascotContext';
import { useNotification } from '../context/NotificationContext';
import { agendaApi } from '../api/agenda.api';
import { tasksApi } from '../api/tasks.api';
import { usersApi } from '../api/users.api';
import { ganttApi } from '../api/gantt.api';
import { extractArray } from '../api/utils';
import { PixelMascot } from './PixelMascot';
import { parseTaskPrompt } from '../utils/aiPromptParser';
import type { User, GanttItem } from '../types';
import dayjs from 'dayjs';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: (name: string, handler: (event: any) => void) => void = () => {};
try {
  const speechModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechModule?.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule?.useSpeechRecognitionEvent || (() => {});
} catch (e) {
  // Graceful fallback when running in standard Expo Go without native module
}

export interface InstantVoiceModalProps {
  visible: boolean;
  onClose: () => void;
  selectedProjectId?: number | null;
  onTaskCreated?: (title: string) => void;
}

type VoiceState = 'listening' | 'processing' | 'success' | 'error';

const QUICK_VOICE_PROMPTS = [
  'Reunión con el equipo mañana a las 4pm',
  'Revisar arquitectura del proyecto el viernes',
  'Llamar a cliente urgente para hoy',
  'Preparar informe mensual para el lunes',
];

export const InstantVoiceModal: React.FC<InstantVoiceModalProps> = ({
  visible,
  onClose,
  selectedProjectId = null,
  onTaskCreated,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { mascotType } = useMascot();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const [voiceState, setVoiceState] = useState<VoiceState>('listening');
  const [transcript, setTranscript] = useState('');
  const [createdTaskTitle, setCreatedTaskTitle] = useState('');
  const [createdTaskMeta, setCreatedTaskMeta] = useState('');

  // ─── Animations for Sound Wave & Equalizer ──────────────────────────────────
  const pulseScale = useRef(new Animated.Value(1)).current;
  const ripple1Scale = useRef(new Animated.Value(1)).current;
  const ripple1Opacity = useRef(new Animated.Value(0.5)).current;
  const ripple2Scale = useRef(new Animated.Value(1)).current;
  const ripple2Opacity = useRef(new Animated.Value(0.3)).current;

  // 7 Equalizer audio frequency bars
  const bar1 = useRef(new Animated.Value(8)).current;
  const bar2 = useRef(new Animated.Value(18)).current;
  const bar3 = useRef(new Animated.Value(28)).current;
  const bar4 = useRef(new Animated.Value(36)).current;
  const bar5 = useRef(new Animated.Value(24)).current;
  const bar6 = useRef(new Animated.Value(16)).current;
  const bar7 = useRef(new Animated.Value(10)).current;

  // Silence auto-stop timer ref
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef('');

  // Fetch Users & Projects for NLP extraction
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

  const users: User[] = useMemo(() => extractArray<User>(rawUsers), [rawUsers]);
  const projects: GanttItem[] = useMemo(() => extractArray<GanttItem>(rawGantt), [rawGantt]);

  const mascotName = mascotType === 'dog' ? 'Cobi' : mascotType === 'cat' ? 'Labi' : 'Tony';

  // ─── Equalizer Soundwave & Mic Animation Loop ─────────────────────────────
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (visible && voiceState === 'listening') {
      const animateBar = (bar: Animated.Value, min: number, max: number, duration: number) =>
        Animated.sequence([
          Animated.timing(bar, { toValue: max, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(bar, { toValue: min, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]);

      animLoop = Animated.loop(
        Animated.parallel([
          // Mic pulse
          Animated.sequence([
            Animated.timing(pulseScale, { toValue: 1.14, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseScale, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
          // Ripples
          Animated.sequence([
            Animated.timing(ripple1Scale, { toValue: 1.6, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ripple1Scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ripple1Opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
            Animated.timing(ripple1Opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(ripple2Scale, { toValue: 2.0, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ripple2Scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(ripple2Opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
            Animated.timing(ripple2Opacity, { toValue: 0.35, duration: 0, useNativeDriver: true }),
          ]),
          // Equalizer sound bars
          animateBar(bar1, 6, 24, 280),
          animateBar(bar2, 10, 34, 340),
          animateBar(bar3, 12, 42, 260),
          animateBar(bar4, 16, 46, 320),
          animateBar(bar5, 12, 38, 290),
          animateBar(bar6, 8, 30, 350),
          animateBar(bar7, 6, 22, 270),
        ])
      );
      animLoop.start();
    }

    return () => {
      animLoop?.stop();
    };
  }, [visible, voiceState]);

  // ─── Core Task Creation Logic ──────────────────────────────────────────────
  const handleCreateFromSpeech = async (spokenText: string) => {
    const cleanText = spokenText.trim();
    if (!cleanText) {
      setVoiceState('listening');
      return;
    }

    setVoiceState('processing');

    try {
      // 1. Try Backend AI Agenda Process
      const res = await agendaApi.process({
        raw_text: cleanText,
        source: 'api',
        execution_date: dayjs().format('YYYY-MM-DD'),
      });

      const tasks = (res.data as any)?.tasks || (res.data as any)?.data || (Array.isArray(res.data) ? res.data : []);

      if (tasks.length > 0) {
        const first = tasks[0];
        const title = first.title || first.titulo || cleanText;
        const dateStr = first.due_date || first.fechaVencimiento || first.execution_date;
        const formattedDate = dateStr ? dayjs(dateStr).format('DD MMM') : 'Hoy';

        setCreatedTaskTitle(title);
        setCreatedTaskMeta(`📅 Para ${formattedDate} • ✨ Agendado con IA`);
        setVoiceState('success');

        queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
        queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
        queryClient.invalidateQueries({ queryKey: ['tasks-dashboard-all'] });
        queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
        queryClient.invalidateQueries({ queryKey: ['gantt-list'] });

        if (onTaskCreated) onTaskCreated(title);
        showSuccess('¡Tarea creada!', `"${title}"`);

        setTimeout(() => {
          onClose();
        }, 1300);
        return;
      }
    } catch (err) {
      console.log('AI Process fallback to local smart task creator:', err);
    }

    // 2. Fallback: Local Smart NLP Task Creator
    try {
      const parsed = parseTaskPrompt(cleanText, users, projects);
      const title = parsed.title || cleanText;
      const finalDate = parsed.date || dayjs().format('YYYY-MM-DD');
      const finalPriority = parsed.priority || 'media';
      const finalAssigneeId = parsed.assigneeId || user?.id;
      const finalProjectId = selectedProjectId || parsed.projectId;

      await tasksApi.create({
        title,
        titulo: title,
        execution_date: finalDate,
        due_date: finalDate,
        priority: finalPriority,
        assignee_id: finalAssigneeId,
        gantt_item_id: finalProjectId || undefined,
        status: 'pendiente',
      });

      queryClient.invalidateQueries({ queryKey: ['tasks-kanban-all'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-dashboard-all'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-items'] });
      queryClient.invalidateQueries({ queryKey: ['gantt-list'] });

      setCreatedTaskTitle(title);
      setCreatedTaskMeta(`📅 Para ${dayjs(finalDate).format('DD MMM')} • ${parsed.assigneeName ? `👤 ${parsed.assigneeName}` : 'Listo'}`);
      setVoiceState('success');

      if (onTaskCreated) onTaskCreated(title);
      showSuccess('¡Tarea creada!', `"${title}"`);

      setTimeout(() => {
        onClose();
      }, 1300);
    } catch (e: any) {
      setVoiceState('error');
      showError('Error al crear tarea', e?.response?.data?.message || 'No se pudo agendar la tarea.');
    }
  };

  // ─── Native Speech Recognition Hooks & Android OS Permission Dialog ────────
  useEffect(() => {
    let isCancelled = false;

    const initializeAudio = async () => {
      setVoiceState('listening');
      setTranscript('');
      setCreatedTaskTitle('');
      setCreatedTaskMeta('');
      transcriptRef.current = '';

      // 1. Explicitly request Android OS microphone permission popup
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Permiso de Micrófono',
              message: 'Colab necesita acceso al micrófono para que puedas dictar tareas y planificaciones con tu voz.',
              buttonPositive: 'Permitir',
              buttonNegative: 'Cancelar',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Android microphone permission denied or dismissed');
          }
        } catch (err) {
          console.warn('Error requesting PermissionsAndroid:', err);
        }
      }

      // 2. Request native speech recognition permission & start listening if module available
      if (ExpoSpeechRecognitionModule?.requestPermissionsAsync) {
        try {
          const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (isCancelled) return;
          if (res?.granted) {
            ExpoSpeechRecognitionModule.start({
              lang: 'es-ES',
              interimResults: true,
              continuous: true,
            });
          }
        } catch (e: any) {
          console.log('Speech module start info:', e);
        }
      }
    };

    if (visible) {
      initializeAudio();
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (ExpoSpeechRecognitionModule) {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (_) {}
      }
    }

    return () => {
      isCancelled = true;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (ExpoSpeechRecognitionModule) {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (_) {}
      }
    };
  }, [visible]);

  useSpeechRecognitionEvent('result', (event) => {
    if (voiceState !== 'listening') return;

    const text = event.results?.[0]?.transcript || '';
    if (text) {
      setTranscript(text);
      transcriptRef.current = text;

      // Auto-cut after 1.8s silence
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = setTimeout(() => {
        if (transcriptRef.current.trim().length > 2) {
          if (ExpoSpeechRecognitionModule) {
            try {
              ExpoSpeechRecognitionModule.stop();
            } catch (_) {}
          }
          handleCreateFromSpeech(transcriptRef.current);
        }
      }, 1800);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (voiceState === 'listening' && transcriptRef.current.trim().length > 2) {
      handleCreateFromSpeech(transcriptRef.current);
    }
  });

  const handleManualConfirm = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (ExpoSpeechRecognitionModule) {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (_) {}
    }
    if (transcript.trim().length > 0) {
      handleCreateFromSpeech(transcript);
    } else {
      onClose();
    }
  };

  const handleSelectQuickPrompt = (p: string) => {
    setTranscript(p);
    transcriptRef.current = p;
    handleCreateFromSpeech(p);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.containerCard}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.statusDot, { backgroundColor: voiceState === 'listening' ? '#EF4444' : colors.primary }]} />
              <Text style={styles.headerTitle}>
                {voiceState === 'listening'
                  ? 'Escuchando tu voz...'
                  : voiceState === 'processing'
                  ? 'Creando tarea con IA...'
                  : voiceState === 'success'
                  ? '¡Tarea agendada!'
                  : 'Dictado de voz'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Central Section with Ripple & Dancing Equalizer Bars */}
          <View style={styles.centerSection}>
            {voiceState === 'listening' && (
              <>
                <View style={styles.micBox}>
                  {/* Ripple 2 */}
                  <Animated.View
                    style={[
                      styles.rippleCircle,
                      {
                        borderColor: '#7C3AED',
                        transform: [{ scale: ripple2Scale }],
                        opacity: ripple2Opacity,
                      },
                    ]}
                  />

                  {/* Ripple 1 */}
                  <Animated.View
                    style={[
                      styles.rippleCircle,
                      {
                        borderColor: '#7C3AED',
                        transform: [{ scale: ripple1Scale }],
                        opacity: ripple1Opacity,
                      },
                    ]}
                  />

                  {/* Pulsing Central Mic */}
                  <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                    <TouchableOpacity
                      style={styles.mainMicCircle}
                      onPress={handleManualConfirm}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="mic" size={38} color="#FFFFFF" />
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                {/* Animated Equalizer Waveform Bars */}
                <View style={styles.equalizerRow}>
                  <Animated.View style={[styles.eqBar, { height: bar1 }]} />
                  <Animated.View style={[styles.eqBar, { height: bar2 }]} />
                  <Animated.View style={[styles.eqBar, { height: bar3 }]} />
                  <Animated.View style={[styles.eqBar, { height: bar4 }]} />
                  <Animated.View style={[styles.eqBar, { height: bar5 }]} />
                  <Animated.View style={[styles.eqBar, { height: bar6 }]} />
                  <Animated.View style={[styles.eqBar, { height: bar7 }]} />
                </View>
              </>
            )}

            {voiceState === 'processing' && (
              <View style={styles.processingBox}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.processingText}>
                  Organizando fecha, hora y responsable con IA...
                </Text>
              </View>
            )}

            {voiceState === 'success' && (
              <View style={styles.successBox}>
                <View style={styles.successCheckCircle}>
                  <Ionicons name="checkmark" size={34} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle} numberOfLines={2}>
                  {createdTaskTitle}
                </Text>
                <Text style={styles.successMeta}>
                  {createdTaskMeta}
                </Text>
              </View>
            )}

            {voiceState === 'error' && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={42} color="#EF4444" />
                <Text style={styles.errorText}>
                  No se detectó audio claro. Intenta nuevamente o escribe abajo.
                </Text>
              </View>
            )}

            {/* Cheerful Mascot on bottom-right */}
            <View style={styles.mascotFloatBox}>
              <PixelMascot pose={voiceState === 'success' ? 'celebrating' : 'flying'} pixelSize={1.8} />
              <Text style={styles.mascotTag}>{mascotName}</Text>
            </View>
          </View>

          {/* Interactive Live Input / Transcription Box */}
          <View style={styles.transcriptBubble}>
            <TextInput
              style={styles.transcriptInput}
              placeholder="Habla ahora o escribe aquí (ej. 'Reunión mañana a las 4pm')..."
              placeholderTextColor="#94A3B8"
              value={transcript}
              onChangeText={(text) => {
                setTranscript(text);
                transcriptRef.current = text;
              }}
              onSubmitEditing={handleManualConfirm}
              returnKeyType="done"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Quick Voice Chips (1-tap instant speech examples) */}
          {voiceState === 'listening' && transcript.length === 0 && (
            <View style={styles.quickChipsWrapper}>
              <Text style={styles.quickChipsLabel}>O toca un ejemplo rápido:</Text>
              <View style={styles.quickChipsRow}>
                {QUICK_VOICE_PROMPTS.slice(0, 2).map((p, idx) => (
                  <TouchableOpacity
                    key={`prompt-${idx}`}
                    style={styles.quickChip}
                    onPress={() => handleSelectQuickPrompt(p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash-outline" size={11} color="#7C3AED" />
                    <Text style={styles.quickChipText} numberOfLines={1}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons Footer */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelActionBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelActionText}>Cancelar</Text>
            </TouchableOpacity>

            {voiceState === 'listening' && (
              <TouchableOpacity
                style={styles.confirmActionBtn}
                onPress={handleManualConfirm}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
                <Text style={styles.confirmActionText}>
                  {transcript.length > 0 ? 'Crear ahora' : 'Listo'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  containerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  centerSection: {
    width: '100%',
    height: 155,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  micBox: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rippleCircle: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
  },
  mainMicCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 46,
    marginTop: 8,
  },
  eqBar: {
    width: 3.5,
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },
  processingBox: {
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
    textAlign: 'center',
  },
  successBox: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  successCheckCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  errorBox: {
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  mascotFloatBox: {
    position: 'absolute',
    right: 4,
    bottom: -2,
    alignItems: 'center',
  },
  mascotTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 1,
  },
  transcriptBubble: {
    width: '100%',
    minHeight: 56,
    maxHeight: 90,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    marginVertical: 8,
  },
  transcriptInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    padding: 0,
  },
  quickChipsWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  quickChipsLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  quickChipsRow: {
    gap: 4,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  footerActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  cancelActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmActionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
