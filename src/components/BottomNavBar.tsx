import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

interface NavItem {
  name: string;
  screen: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', screen: 'Dashboard', icon: 'pie-chart', label: 'Inicio' },
  { name: 'Kanban', screen: 'Kanban', icon: 'grid', label: 'Kanban' },
  { name: 'Gantt', screen: 'Gantt', icon: 'bar-chart', label: 'Gantt' },
  { name: 'Agenda', screen: 'Agenda', icon: 'flash', label: 'Agenda IA' },
  { name: 'Reports', screen: 'Reports', icon: 'document-text', label: 'Reportes' },
  { name: 'Users', screen: 'Users', icon: 'people', label: 'Usuarios' },
  { name: 'Groups', screen: 'Groups', icon: 'layers', label: 'Grupos' },
];

export const BottomNavBar = () => {
  const navigation = useNavigation();
  const route = useRoute();

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = route.name === item.screen;
        return (
          <TouchableOpacity
            key={item.screen}
            style={styles.tabItem}
            onPress={() => navigation.navigate(item.screen as never)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={isActive ? '#009497' : '#94A3B8'}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#009497',
    fontWeight: '800',
  },
});

export default BottomNavBar;
