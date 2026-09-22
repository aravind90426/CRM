import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { GradientView } from './GradientView';

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 10);

  return (
    <View style={[styles.wrapper, { bottom: bottomInset }]}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const labelText = typeof label === 'string' ? label : route.name;

          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') {
            iconName = isFocused ? 'home' : 'home-outline';
          } else if (route.name === 'AdminDashboard') {
            iconName = isFocused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Dial') {
            iconName = isFocused ? 'keypad' : 'keypad-outline';
          } else if (route.name === 'Analytics') {
            iconName = isFocused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Leads') {
            iconName = isFocused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Reports') {
            iconName = isFocused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'AdminHub') {
            iconName = isFocused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Settings') {
            iconName = isFocused ? 'settings' : 'settings-outline';
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              {isFocused ? (
                <GradientView
                  colors={colors.primaryGradient}
                  style={styles.activePill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={iconName} size={18} color="#FFFFFF" />
                  <Text style={styles.activeLabel} numberOfLines={1}>
                    {labelText}
                  </Text>
                </GradientView>
              ) : (
                <View style={styles.inactiveItem}>
                  <Ionicons name={iconName} size={18} color={colors.textMuted} />
                  <Text style={styles.inactiveLabel} numberOfLines={1}>
                    {labelText}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activePill: {
    width: 52,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  activeLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  inactiveItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
});
