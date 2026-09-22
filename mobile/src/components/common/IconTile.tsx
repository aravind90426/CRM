import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export type IconTileVariant = 'blue' | 'green' | 'orange' | 'purple' | 'red';

export interface IconTileProps {
  icon?: keyof typeof Ionicons.glyphMap;
  name?: any;
  variant?: IconTileVariant;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export const IconTile: React.FC<IconTileProps> = ({
  icon,
  name,
  variant = 'blue',
  size = 40,
  iconSize = 20,
  style,
}) => {
  const iconName = (icon || name || 'cube') as keyof typeof Ionicons.glyphMap;
  const getColors = () => {
    switch (variant) {
      case 'green':
        return { bg: colors.pastelGreen, fg: colors.pastelGreenText };
      case 'orange':
        return { bg: colors.pastelOrange, fg: colors.pastelOrangeText };
      case 'purple':
        return { bg: colors.pastelPurple, fg: colors.pastelPurpleText };
      case 'red':
        return { bg: colors.pastelRed, fg: colors.pastelRedText };
      case 'blue':
      default:
        return { bg: colors.pastelBlue, fg: colors.pastelBlueText };
    }
  };

  const { bg, fg } = getColors();

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.min(spacing.borderRadius.tile, size / 2.5),
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={fg} />
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
