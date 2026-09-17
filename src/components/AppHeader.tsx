import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { WorkspaceSwitcherModal } from './WorkspaceSwitcherModal';
import { SidebarDrawer } from './SidebarDrawer';
import { useNotification } from '../context/NotificationContext';
import { ganttApi } from '../api/gantt.api';
import { extractArray } from '../api/utils';
import { AIAssistantModal } from './AIAssistantModal';
import { InstantVoiceModal } from './InstantVoiceModal';
import { TrashModal } from './TrashModal';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onQuickAdd?: () => void;
  showWorkspaceSelector?: boolean;
  showSelectors?: boolean;
  showQuickInput?: boolean;
  selectedProjectId?: number | null;
  selectedProjectName?: string;
  onSelectProject?: (projId: number | null, projName: string) => void;
  onFilterPress?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchPress?: () => void;
  onTaskCreated?: (title: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  onQuickAdd,
  showWorkspaceSelector = true,
  showSelectors = true,
  showQuickInput = true,
  selectedProjectId = null,
  selectedProjectName = 'Todas las planificaciones',
  onSelectProject,
  onFilterPress,
  searchQuery,
  onSearchChange,
  onSearchPress,
  onTaskCreated,
}) => {
  const { user } = useAuth();
  const { colors, isDark, bgType } = useTheme();
  const navigation = useNavigation<any>();
  const { showInfo, showSuccess } = useNotification();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trashModalVisible, setTrashModalVisible] = useState(false);
  const [workspaceModalVisible, setWorkspaceModalVisible] = useState(false);
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [aiVoiceMode, setAiVoiceMode] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [currentProjectName, setCurrentProjectName] = useState(selectedProjectName);
  const [planificaciones, setPlanificaciones] = useState<Array<{ id: number; title: string; color?: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const activeSearch = searchQuery !== undefined ? searchQuery : localSearchQuery;

  const companyName = user?.companyName || user?.companies?.[0]?.nombre || 'Vertex';

  // Load real planificaciones/projects from backend
  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await ganttApi.getAll();
        if (isMounted) {
          const raw = extractArray<any>(res.data);
          const mapped = raw.map((item: any) => ({
            id: item.id,
            title: item.title || item.titulo || item.name || `Plan #${item.id}`,
            color: item.color || '#6366F1',
          }));
          setPlanificaciones(mapped);
          if (mapped.length > 0 && selectedProjectName === 'Colab App' && !selectedProjectId) {
            // keep current or default
          }
        }
      } catch (e) {
        console.log('Error fetching planificaciones for header:', e);
      } finally {
        if (isMounted) setLoadingProjects(false);
      }
    };
    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickSubmit = () => {
    const text = quickTitle.trim();
    setQuickTitle('');
    setAiInitialPrompt(text);
    setAiVoiceMode(false);
    setAiModalVisible(true);
  };

  const handleDictate = () => {
    setVoiceModalVisible(true);
  };

  const handleSelectPlan = (id: number | null, name: string) => {
    setCurrentProjectName(name);
    setProjectModalVisible(false);
    if (onSelectProject) {
      onSelectProject(id, name);
    }
  };

  const firstName = user?.nombre?.split(' ')[0] || user?.name?.split(' ')[0] || (user as any)?.first_name || 'Carlos';
  const displayTitle = title || 'Colab';
  const displaySubtitle = subtitle || user?.companyName || user?.companies?.[0]?.nombre || 'BY VERTEX';

  return (
    <View style={[styles.rootContainer, { backgroundColor: bgType !== 'none' ? 'transparent' : colors.bgPrimary }]}>
      {/* ─── 1. TOP BRAND BAR ────────────────────────────────────────────── */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: bgType !== 'none'
              ? (isDark ? 'rgba(20, 24, 34, 0.75)' : 'rgba(255, 255, 255, 0.85)')
              : colors.bgSecondary,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        {/* Left: Brand Icon & Logo */}
        <TouchableOpacity
          style={styles.brandBox}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Kanban')}
        >
          {/* Glowing Colab Node Icon */}
          <View style={[styles.logoSquare, { backgroundColor: colors.primary }]}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx={6} cy={6} r={3} fill="#FFFFFF" />
              <Circle cx={18} cy={10} r={3.5} fill="#FFFFFF" />
              <Circle cx={9} cy={18} r={3} fill="#FFFFFF" />
              <Path d="M6 6L18 10M18 10L9 18" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </View>

          <View style={styles.brandTextCol}>
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
              {displayTitle}
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
              {displaySubtitle}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: "Más" Menu */}
        <View style={styles.topRightActions}>
          {/* "Más" Menu Button */}
          <TouchableOpacity
            style={[
              styles.moreMenuBtn,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
            onPress={() => setSidebarOpen(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="menu" size={17} color={colors.textPrimary} />
            <Text style={[styles.moreMenuText, { color: colors.textPrimary }]}>Más</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 2. WORKSPACE & PROJECT SELECTOR ROW / SEARCH BAR ────────────────── */}
      {showSelectors && (
        isSearching ? (
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Ionicons name="search" size={17} color={colors.primary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Buscar tareas, proyectos..."
                placeholderTextColor={colors.textMuted}
                value={activeSearch}
                onChangeText={(txt) => {
                  setLocalSearchQuery(txt);
                  if (onSearchChange) onSearchChange(txt);
                }}
                autoFocus
                returnKeyType="search"
              />
              {activeSearch ? (
                <TouchableOpacity
                  onPress={() => {
                    setLocalSearchQuery('');
                    if (onSearchChange) onSearchChange('');
                  }}
                  style={styles.clearSearchBtn}
                >
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Close / Cancel Search Button */}
            <TouchableOpacity
              style={[
                styles.cancelSearchBtn,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
              onPress={() => {
                setIsSearching(false);
                setLocalSearchQuery('');
                if (onSearchChange) onSearchChange('');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.selectorsRow}>
            {/* Workspace / Company Pill: 💼 Vertex ⌵ */}
            <TouchableOpacity
              style={[
                styles.selectorPill,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
              onPress={() => setWorkspaceModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
              <Text style={[styles.selectorText, { color: colors.textPrimary }]} numberOfLines={1}>
                {companyName}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Project / Planificaciones Pill: 📁 Colab App ⌵ */}
            <TouchableOpacity
              style={[
                styles.selectorPill,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
              onPress={() => setProjectModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="folder-outline" size={16} color={colors.primary} />
              <Text style={[styles.selectorText, { color: colors.textPrimary }]} numberOfLines={1}>
                {currentProjectName}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Search Button: 🔍 */}
            <TouchableOpacity
              style={[
                styles.filterBtn,
                {
                  backgroundColor: activeSearch ? colors.primaryMuted : colors.bgSurface,
                  borderColor: activeSearch ? colors.primary : colors.borderSubtle,
                },
              ]}
              onPress={() => {
                setIsSearching(true);
                if (onSearchPress) onSearchPress();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={19} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )
      )}

      {/* ─── 3. QUICK TASK INPUT BAR ────────────────────────────────────────── */}
      {showQuickInput && (
        <View style={styles.quickInputWrapper}>
          <View
            style={[
              styles.quickInputBar,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            {/* Plus Action Button */}
            <TouchableOpacity
              style={[styles.quickPlusBtn, { backgroundColor: colors.primary }]}
              onPress={handleQuickSubmit}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Input */}
            <TextInput
              style={[styles.quickTextInput, { color: colors.textPrimary }]}
              placeholder="Dicta o escribe con IA (ej. tarea o plan)..."
              placeholderTextColor={colors.textMuted}
              value={quickTitle}
              onChangeText={setQuickTitle}
              onSubmitEditing={handleQuickSubmit}
              returnKeyType="done"
            />

            {/* Voice Dictation Button */}
            <TouchableOpacity
              style={[styles.dictateBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={handleDictate}
              activeOpacity={0.7}
            >
              <Ionicons name="mic-outline" size={18} color={colors.primary} />
              <Text style={[styles.dictateText, { color: colors.primary }]}>Dictar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Side Menu Drawer — consistent across every screen that renders AppHeader */}
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenTrash={() => setTrashModalVisible(true)}
      />

      {/* Trash / Papelera Modal (30 days) */}
      <TrashModal
        visible={trashModalVisible}
        onClose={() => setTrashModalVisible(false)}
      />

      {/* Workspace Switcher Modal (Empresas) */}
      <WorkspaceSwitcherModal
        visible={workspaceModalVisible}
        onClose={() => setWorkspaceModalVisible(false)}
      />

      {/* Instant Audio Listening & Auto-Task Creation Modal */}
      <InstantVoiceModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        selectedProjectId={selectedProjectId}
        onTaskCreated={(title) => {
          if (onTaskCreated) onTaskCreated(title);
        }}
      />

      {/* AI Assistant Dictator & Task/Project Scheduler Modal */}
      <AIAssistantModal
        visible={aiModalVisible}
        onClose={() => {
          setAiModalVisible(false);
          setAiVoiceMode(false);
        }}
        initialPrompt={aiInitialPrompt}
        isVoiceMode={aiVoiceMode}
        selectedProjectId={selectedProjectId}
      />

      {/* Projects & Planificaciones Picker Modal */}
      <Modal
        visible={projectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProjectModalVisible(false)}
        >
          <View
            style={[
              styles.projectModalContent,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.projectModalHeader}>
              <Ionicons name="folder" size={20} color={colors.primary} />
              <Text style={[styles.projectModalTitle, { color: colors.textPrimary }]}>
                Planificaciones / Proyectos
              </Text>
            </View>

            {loadingProjects ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {/* Option to show all */}
                <TouchableOpacity
                  style={[
                    styles.projectItem,
                    !selectedProjectId && currentProjectName === 'Todas las planificaciones' && {
                      backgroundColor: colors.primaryMuted,
                    },
                  ]}
                  onPress={() => handleSelectPlan(null, 'Todas las planificaciones')}
                >
                  <Ionicons name="apps-outline" size={17} color={colors.primary} />
                  <Text style={[styles.projectItemText, { color: colors.textPrimary, fontWeight: '800' }]}>
                    Todas las planificaciones (Ver todo)
                  </Text>
                  {!selectedProjectId && currentProjectName === 'Todas las planificaciones' && (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>

                {planificaciones.length === 0 ? (
                  <View style={{ padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Sin proyectos registrados en esta empresa</Text>
                  </View>
                ) : (
                  planificaciones.map((plan) => {
                    const isSelected = selectedProjectId === plan.id || currentProjectName === plan.title;
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.projectItem,
                          isSelected && { backgroundColor: colors.primaryMuted },
                        ]}
                        onPress={() => handleSelectPlan(plan.id, plan.title)}
                      >
                        <View style={[styles.planDot, { backgroundColor: plan.color || colors.primary }]} />
                        <Text
                          style={[
                            styles.projectItemText,
                            {
                              color: isSelected ? colors.primary : colors.textPrimary,
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {plan.title}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    width: '100%',
    paddingBottom: 6,
  },

  // 1. Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  logoSquare: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
  },
  brandTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 1,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  moreMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexShrink: 0,
  },
  moreMenuText: {
    fontSize: 12.5,
    fontWeight: '800',
  },

  // 2. Selectors Row
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    marginBottom: 8,
  },
  selectorPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 14,
  },
  selectorText: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
    marginHorizontal: 6,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },
  cancelSearchBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 3. Quick Task Input Bar
  quickInputWrapper: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  quickInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  quickPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextInput: {
    flex: 1,
    paddingHorizontal: 9,
    fontSize: 13,
    fontWeight: '600',
  },
  dictateBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 42,
  },
  dictateText: {
    fontSize: 8.5,
    fontWeight: '800',
    marginTop: 1,
  },

  // Project Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  projectModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  projectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  projectModalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 8,
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectItemText: {
    flex: 1,
    fontSize: 13.5,
  },
});

export default AppHeader;
