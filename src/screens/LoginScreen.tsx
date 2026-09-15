import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigation } from '@react-navigation/native';

export const LoginScreen = () => {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showWarning } = useNotification();
  const navigation = useNavigation<any>();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedId = identifier.trim();
    const trimmedPass = password.trim();

    if (!trimmedId) {
      showWarning('Acceso Requerido', 'Por favor ingresa tu correo electrónico o DNI.');
      return;
    }
    if (!trimmedPass) {
      showWarning('Clave Requerida', 'Por favor ingresa tu contraseña o PIN de acceso.');
      return;
    }

    setLoading(true);
    try {
      await login({
        email: trimmedId.toLowerCase(),
        dni: trimmedId,
        password: trimmedPass,
        pin: trimmedPass,
      });
    } catch (error: any) {
      const serverMsg = error.response?.data?.message;
      const displayMsg = Array.isArray(serverMsg)
        ? serverMsg.join('\n')
        : serverMsg || 'Correo / DNI o contraseña / PIN incorrectos';
      showError('Error de Autenticación', displayMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flexContainer, { backgroundColor: colors.bgPrimary }]}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Encabezado */}
        <View style={styles.brandBox}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="sparkles" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Colab</Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            Gestión corporativa de objetivos, proyectos y equipos
          </Text>
        </View>

        {/* Formulario */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Iniciar Sesión</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>CORREO ELECTRÓNICO O DNI</Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="usuario@empresa.com o 70123456"
              placeholderTextColor={colors.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>CONTRASEÑA O PIN</Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Tu contraseña o PIN"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.loginBtn,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>INGRESAR AL SISTEMA</Text>
            )}
          </TouchableOpacity>

          {/* Enlace a Registro */}
          <View style={styles.registerBox}>
            <Text style={[styles.registerPrompt, { color: colors.textSecondary }]}>
              ¿No tienes una cuenta aún?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>
                Registrar mi Empresa
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: '85%',
    lineHeight: 18,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
    elevation: 3,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  registerBox: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  registerPrompt: {
    fontSize: 13,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default LoginScreen;

