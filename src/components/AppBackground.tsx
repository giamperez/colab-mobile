/**
 * AppBackground - Wraps screens to apply custom background (color or image).
 * Uses context from ThemeContext (bgType, bgValue).
 */
import React from 'react';
import { ImageBackground, View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AppBackgroundProps {
  children: React.ReactNode;
}

export const AppBackground: React.FC<AppBackgroundProps> = ({ children }) => {
  const { bgType, bgValue, colors } = useTheme();

  if (bgType === 'image' && bgValue) {
    return (
      <ImageBackground
        source={{ uri: bgValue }}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: 0.25, resizeMode: 'cover' }}
      >
        <View style={[styles.overlay, { backgroundColor: colors.bgPrimary + 'CC' }]}>
          {children}
        </View>
      </ImageBackground>
    );
  }

  if (bgType === 'color' && bgValue) {
    return (
      <View style={[styles.fill, { backgroundColor: bgValue }]}>
        {children}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
});
