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

export const RegisterScreen = () => {
  const { register } = useAuth();
  const { colors } = useTheme();
  const { showError, showWarning } = useNotification();
  const navigation = useNavigation<any>();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [companyNombre, setCompanyNombre] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nombre.trim()) {
      showWarning('Campo Requerido', 'Por favor ingresa tu nombre completo.');
      return;
    }
    if (!email.trim()) {
      showWarning('Campo Requerido', 'Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!companyNombre.trim()) {
      showWarning('Campo Requerido', 'Por favor ingresa el nombre de tu empresa u organización.');
      return;
    }
    if (password.length < 6) {
      showWarning('Contraseña Corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await register({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        companyNombre: companyNombre.trim(),
        password: password.trim(),
      });
    } catch (error: any) {
      const serverMsg = error.response?.data?.message;
      const displayMsg = Array.isArray(serverMsg)
        ? serverMsg.join('\n')
        : serverMsg || 'Error al registrar la cuenta';
      showError('Error de Registro', displayMsg);
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
          <TouchableOpacity
            style={[
              styles.backBtn,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="business-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Crea tu Workspace</Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            Únete a COLAB y comienza a coordinar tu equipo
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
          <Text style={[styles.label, { color: colors.textSecondary }]}>TU NOMBRE COMPLETO</Text>
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
              placeholder="Ej: Carlos Mendoza"
              placeholderTextColor={colors.textMuted}
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>CORREO ELECTRÓNICO</Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="carlos@empresa.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            NOMBRE DE LA EMPRESA / ORGANIZACIÓN
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ej: Inversiones Global SAC"
              placeholderTextColor={colors.textMuted}
              value={companyNombre}
              onChangeText={setCompanyNombre}
            />
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            CONTRASEÑA (MÍN. 6 CARACTERES)
          </Text>
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
              placeholder="Crea una contraseña segura"
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
              styles.registerBtn,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>REGISTRARSE Y COMENZAR</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginBox}>
            <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>
              ¿Ya tienes una cuenta?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Iniciar Sesión</Text>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: '85%',
  },
  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  registerBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 22,
    elevation: 3,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  loginBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  loginPrompt: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default RegisterScreen;

