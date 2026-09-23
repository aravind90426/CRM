import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'dangerLight' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 4,
    }).start();
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceMuted;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.primaryLight;
      case 'success':
        return colors.success;
      case 'danger':
        return colors.danger;
      case 'dangerLight':
        return colors.dangerLight;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.border;
    if (variant === 'outline') return colors.border;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
      case 'success':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return colors.primary;
      case 'dangerLight':
        return colors.danger;
      case 'outline':
        return colors.textPrimary;
      case 'ghost':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 36;
      case 'lg':
        return 52;
      default:
        return 48;
    }
  };

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const {
    flex,
    flexGrow,
    flexShrink,
    width,
    minWidth,
    maxWidth,
    margin,
    marginHorizontal,
    marginVertical,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    alignSelf,
    ...touchableStyle
  } = flattenedStyle as any;

  const containerStyle: ViewStyle = {};
  if (flex !== undefined) containerStyle.flex = flex;
  if (flexGrow !== undefined) containerStyle.flexGrow = flexGrow;
  if (flexShrink !== undefined) containerStyle.flexShrink = flexShrink;
  if (width !== undefined) containerStyle.width = width;
  if (minWidth !== undefined) containerStyle.minWidth = minWidth;
  if (maxWidth !== undefined) containerStyle.maxWidth = maxWidth;
  if (margin !== undefined) containerStyle.margin = margin;
  if (marginHorizontal !== undefined) containerStyle.marginHorizontal = marginHorizontal;
  if (marginVertical !== undefined) containerStyle.marginVertical = marginVertical;
  if (marginLeft !== undefined) containerStyle.marginLeft = marginLeft;
  if (marginRight !== undefined) containerStyle.marginRight = marginRight;
  if (marginTop !== undefined) containerStyle.marginTop = marginTop;
  if (marginBottom !== undefined) containerStyle.marginBottom = marginBottom;
  if (alignSelf !== undefined) containerStyle.alignSelf = alignSelf;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, containerStyle]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            height: getHeight(),
            borderWidth: variant === 'outline' ? 1 : 0,
            width: width ? '100%' : undefined,
          },
          disabled && styles.disabled,
          touchableStyle,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: spacing.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  disabled: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
