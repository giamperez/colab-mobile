import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number; // default: 3500ms
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface AlertOptions {
  title: string;
  message?: string;
  type?: ToastType;
  buttonText?: string;
  onOk?: () => void;
}

interface NotificationContextType {
  showToast: (options: ToastOptions) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showConfirm: (options: ConfirmOptions) => void;
  showAlert: (title: string, message?: string, onOk?: () => void) => void;
  showCustomAlert: (options: AlertOptions) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
  showInfo: () => {},
  showConfirm: () => {},
  showAlert: () => {},
  showCustomAlert: () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // ─── Toast State ───────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const toastAnimY = useRef(new Animated.Value(-120)).current;
  const toastAnimOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Modal Alert / Confirm State ───────────────────────────────────────────
  const [confirmConfig, setConfirmConfig] = useState<ConfirmOptions | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // ─── Toast Actions ─────────────────────────────────────────────────────────
  const hideToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(toastAnimY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(toastAnimOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [toastAnimOpacity, toastAnimY]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      setToast(options);
      toastAnimY.setValue(-80);
      toastAnimOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(toastAnimY, {
          toValue: insets.top > 0 ? insets.top + 8 : 24,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(toastAnimOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = options.duration || 3500;
      toastTimerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, insets.top, toastAnimOpacity, toastAnimY]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => showToast({ type: 'success', title, message }),
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => showToast({ type: 'error', title, message }),
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => showToast({ type: 'warning', title, message }),
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => showToast({ type: 'info', title, message }),
    [showToast]
  );

  // ─── Modal Dialog Actions ──────────────────────────────────────────────────
  const openModalAnimation = () => {
    modalScale.setValue(0.92);
    modalOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  };

  const showConfirm = useCallback(
    (options: ConfirmOptions) => {
      setConfirmConfig(options);
      openModalAnimation();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const showCustomAlert = useCallback(
    (options: AlertOptions) => {
      setAlertConfig(options);
      openModalAnimation();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const showAlert = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      showCustomAlert({ title, message, onOk });
    },
    [showCustomAlert]
  );

  const handleCloseConfirm = (confirmed: boolean) => {
    if (!confirmConfig) return;
    const cfg = confirmConfig;
    Animated.parallel([
      Animated.timing(modalScale, { toValue: 0.94, duration: 140, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setConfirmConfig(null);
      if (confirmed) {
        cfg.onConfirm();
      } else if (cfg.onCancel) {
        cfg.onCancel();
      }
    });
  };

  const handleCloseAlert = () => {
    if (!alertConfig) return;
    const cfg = alertConfig;
    Animated.parallel([
      Animated.timing(modalScale, { toValue: 0.94, duration: 140, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setAlertConfig(null);
      if (cfg.onOk) cfg.onOk();
    });
  };

  // ─── Theme icon helper ─────────────────────────────────────────────────────
  const getToastColors = (type?: ToastType) => {
    switch (type) {
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: '#EF4444',
          bg: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
          border: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
        };
      case 'warning':
        return {
          icon: 'warning-outline' as const,
          color: '#F59E0B',
          bg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
          border: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FCD34D',
        };
      case 'info':
        return {
          icon: 'information-circle' as const,
          color: '#3B82F6',
          bg: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF',
          border: isDark ? 'rgba(59, 130, 246, 0.4)' : '#93C5FD',
        };
      case 'success':
      default:
        return {
          icon: 'checkmark-circle' as const,
          color: '#10B981',
          bg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5',
          border: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0',
        };
    }
  };

  const toastStyle = getToastColors(toast?.type);

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
        showAlert,
        showCustomAlert,
      }}
    >
      {children}

      {/* ─── Top Floating Toast Notification ─────────────────────────────────── */}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: toastAnimY }],
              opacity: toastAnimOpacity,
              backgroundColor: colors.bgSecondary,
              borderColor: toastStyle.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.toastInner}
            activeOpacity={0.9}
            onPress={hideToast}
          >
            <View style={[styles.toastIconBox, { backgroundColor: toastStyle.bg }]}>
              <Ionicons name={toastStyle.icon} size={22} color={toastStyle.color} />
            </View>

            <View style={styles.toastTextBox}>
              <Text style={[styles.toastTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {toast.title}
              </Text>
              {toast.message ? (
                <Text style={[styles.toastMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                  {toast.message}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.toastCloseBtn} onPress={hideToast}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ─── Confirmation Modal Dialog ───────────────────────────────────────── */}
      <Modal visible={!!confirmConfig} transparent animationType="none" statusBarTranslucent>
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.dialogCard,
              {
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Top Icon Badge */}
            <View
              style={[
                styles.dialogIconBadge,
                {
                  backgroundColor: confirmConfig?.isDestructive
                    ? 'rgba(239, 68, 68, 0.16)'
                    : colors.primaryMuted,
                },
              ]}
            >
              <Ionicons
                name={
                  confirmConfig?.icon ||
                  (confirmConfig?.isDestructive ? 'trash-outline' : 'help-circle-outline')
                }
                size={28}
                color={confirmConfig?.isDestructive ? '#EF4444' : colors.primary}
              />
            </View>

            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
              {confirmConfig?.title}
            </Text>

            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
              {confirmConfig?.message}
            </Text>

            {/* Buttons Row */}
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtnCancel, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}
                onPress={() => handleCloseConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dialogBtnCancelText, { color: colors.textSecondary }]}>
                  {confirmConfig?.cancelText || 'Cancelar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dialogBtnConfirm,
                  {
                    backgroundColor: confirmConfig?.isDestructive ? '#EF4444' : colors.primary,
                  },
                ]}
                onPress={() => handleCloseConfirm(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dialogBtnConfirmText}>
                  {confirmConfig?.confirmText || 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Information / Alert Modal Dialog ────────────────────────────────── */}
      <Modal visible={!!alertConfig} transparent animationType="none" statusBarTranslucent>
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.dialogCard,
              {
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.dialogIconBadge,
                {
                  backgroundColor:
                    alertConfig?.type === 'error'
                      ? 'rgba(239, 68, 68, 0.16)'
                      : alertConfig?.type === 'success'
                      ? 'rgba(16, 185, 129, 0.16)'
                      : colors.primaryMuted,
                },
              ]}
            >
              <Ionicons
                name={
                  alertConfig?.type === 'error'
                    ? 'alert-circle'
                    : alertConfig?.type === 'success'
                    ? 'checkmark-circle'
                    : 'information-circle'
                }
                size={28}
                color={
                  alertConfig?.type === 'error'
                    ? '#EF4444'
                    : alertConfig?.type === 'success'
                    ? '#10B981'
                    : colors.primary
                }
              />
            </View>

            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
              {alertConfig?.title}
            </Text>

            {alertConfig?.message ? (
              <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
                {alertConfig?.message}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.dialogBtnSingle, { backgroundColor: colors.primary }]}
              onPress={handleCloseAlert}
              activeOpacity={0.8}
            >
              <Text style={styles.dialogBtnConfirmText}>
                {alertConfig?.buttonText || 'Entendido'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    zIndex: 999999,
    elevation: 999,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  toastIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTextBox: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  toastMessage: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  toastCloseBtn: {
    padding: 6,
    borderRadius: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 20,
  },
  dialogIconBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dialogBtnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dialogBtnConfirm: {
    flex: 1.2,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  dialogBtnConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dialogBtnSingle: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});

export default NotificationProvider;
