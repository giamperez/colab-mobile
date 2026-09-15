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
  const { bgType, bgValue, isDark, colors } = useTheme();

  if (bgType === 'image' && bgValue) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: bgValue }}
          style={styles.imageBackground}
          imageStyle={{ opacity: 0.88, resizeMode: 'cover' }}
        >
          {/* Subtle dark glass overlay to guarantee text legibility while keeping mountains vibrant */}
          <View
            style={[
              styles.overlay,
              {
                backgroundColor: isDark
                  ? 'rgba(10, 14, 23, 0.52)'
                  : 'rgba(255, 255, 255, 0.45)',
              },
            ]}
          >
            {children}
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (bgType === 'color' && bgValue) {
    return (
      <View style={[styles.container, { backgroundColor: bgValue }]}>
        {children}
      </View>
    );
  }

  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
  },
});
