import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface BottomNavBarProps {
  onCenterPlusPress?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ onCenterPlusPress }) => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const handleCenterAction = () => {
    if (onCenterPlusPress) {
      onCenterPlusPress();
    } else {
      // Default to opening Kanban or navigation
      navigation.navigate('Kanban');
    }
  };

  const isTareasActive = route.name === 'Kanban';
  const isProyectosActive = route.name === 'Projects';
  const isGanttActive = route.name === 'Gantt';
  const isCalendarActive = route.name === 'Calendar';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.borderSubtle,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {/* 1. Tareas (Kanban / List) */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Kanban')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isTareasActive ? 'checkbox' : 'checkbox-outline'}
          size={21}
          color={isTareasActive ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.label,
            { color: isTareasActive ? colors.primary : colors.textMuted },
            isTareasActive && styles.activeLabel,
          ]}
          numberOfLines={1}
        >
          Tareas
        </Text>
      </TouchableOpacity>

      {/* 2. Proyectos */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Projects')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isProyectosActive ? 'folder' : 'folder-outline'}
          size={21}
          color={isProyectosActive ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.label,
            { color: isProyectosActive ? colors.primary : colors.textMuted },
            isProyectosActive && styles.activeLabel,
          ]}
          numberOfLines={1}
        >
          Proyectos
        </Text>
      </TouchableOpacity>

      {/* 3. Center Elevated + Action Button */}
      <View style={styles.centerFabContainer}>
        <TouchableOpacity
          style={[styles.centerFab, { backgroundColor: colors.primary }]}
          onPress={handleCenterAction}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 4. Gantt */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Gantt')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isGanttActive ? 'reorder-three' : 'reorder-three-outline'}
          size={22}
          color={isGanttActive ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.label,
            { color: isGanttActive ? colors.primary : colors.textMuted },
            isGanttActive && styles.activeLabel,
          ]}
          numberOfLines={1}
        >
          Gantt
        </Text>
      </TouchableOpacity>

      {/* 5. Calendario */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Calendar')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isCalendarActive ? 'calendar' : 'calendar-outline'}
          size={20}
          color={isCalendarActive ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.label,
            { color: isCalendarActive ? colors.primary : colors.textMuted },
            isCalendarActive && styles.activeLabel,
          ]}
          numberOfLines={1}
        >
          Calendario
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  centerFabContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  centerFab: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 3,
  },
  activeLabel: {
    fontWeight: '900',
  },
});

export default BottomNavBar;
