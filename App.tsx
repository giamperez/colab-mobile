import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import KanbanScreen from './src/screens/KanbanScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import GanttScreen from './src/screens/GanttScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import AgendaScreen from './src/screens/AgendaScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import UsersScreen from './src/screens/UsersScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MenuScreen from './src/screens/MenuScreen';
import SuperAdminScreen from './src/screens/SuperAdminScreen';
import BackgroundPickerScreen from './src/screens/BackgroundPickerScreen';
import { AppBackground } from './src/components/AppBackground';
import { IronManCelebrationOverlay } from './src/components/IronManCelebrationOverlay';
import { IronManGuide } from './src/components/IronManGuide';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { MascotProvider } from './src/context/MascotContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const Stack = createNativeStackNavigator();

const NavigationContent = () => {
  const { token, isLoading } = useAuth();
  const { colors, isDark, bgType } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: bgType !== 'none' ? 'transparent' : colors.bgPrimary,
      card: colors.bgSecondary,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.bgPrimary,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AppBackground>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.bgSecondary} />
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {!token ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Kanban" component={KanbanScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Calendar" component={CalendarScreen} />
              <Stack.Screen name="Projects" component={ProjectsScreen} />
              <Stack.Screen name="Gantt" component={GanttScreen} />
              <Stack.Screen name="Agenda" component={AgendaScreen} />
              <Stack.Screen name="Reports" component={ReportsScreen} />
              <Stack.Screen name="Users" component={UsersScreen} />
              <Stack.Screen name="Groups" component={GroupsScreen} />
              <Stack.Screen name="SuperAdmin" component={SuperAdminScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Menu" component={MenuScreen} />
              <Stack.Screen name="BackgroundPicker" component={BackgroundPickerScreen} />
            </>
          )}
        </Stack.Navigator>
        {/* Global Mascot — visible on every authenticated screen except Kanban (which has its own with task data) */}
        <GlobalMascotOverlay isAuthenticated={!!token} />
        {/* Global Iron Man Task Completion Animation */}
        <IronManCelebrationOverlay />
      </NavigationContainer>
    </AppBackground>
  );
};

/**
 * Renders the mascot globally on all authenticated screens.
 * Skips Kanban because that screen already mounts its own IronManGuide
 * with full task data (stats, drag state, etc.).
 */
const SCREENS_WITHOUT_MASCOT = ['Kanban', 'Login', 'Register'];

const GlobalMascotOverlay: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const { user } = useAuth();
  // Get the name of the currently focused route
  const routeName = useNavigationState((state) => {
    if (!state || !state.routes || state.routes.length === 0) return null;
    return state.routes[state.index]?.name ?? null;
  });

  if (!isAuthenticated || !routeName || SCREENS_WITHOUT_MASCOT.includes(routeName)) {
    return null;
  }

  return (
    <IronManGuide
      tasks={[]}
      userId={user?.id}
      isAdminOrJefe={false}
    />
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MascotProvider>
            <AuthProvider>
              <NotificationProvider>
                <NavigationContent />
              </NotificationProvider>
            </AuthProvider>
          </MascotProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
