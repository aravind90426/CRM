import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tint?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  badgeLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  tint = 'primary',
  badgeLabel,
  onPress,
  style,
}) => {
  const getTintColors = () => {
    switch (tint) {
      case 'success':
        return { bg: colors.successLight, text: colors.success };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'danger':
        return { bg: colors.dangerLight, text: colors.danger };
      case 'info':
        return { bg: colors.infoLight, text: colors.info };
      default:
        return { bg: colors.primaryLight, text: colors.primary };
    }
  };

  const t = getTintColors();

  return (
    <Card style={[styles.card, style]} onPress={onPress}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: t.bg }]}>
            <Ionicons name={icon} size={18} color={t.text} />
          </View>
        )}
        {badgeLabel && <StatusBadge label={badgeLabel} variant={tint} showDot={false} />}
      </View>

      <Text style={[styles.value, { color: t.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.md,
    marginBottom: spacing.normal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
