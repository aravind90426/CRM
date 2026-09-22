import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { GradientView } from './GradientView';

export interface MeqHeaderProps {
  rightElement?: React.ReactNode;
  onBack?: () => void;
  showLogo?: boolean;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  avatarInitial?: string;
  hasNotification?: boolean;
  onPressBell?: () => void;
  onPressAvatar?: () => void;
  onPressSearch?: () => void;
  onPressFilter?: () => void;
  rightMode?: 'home' | 'dial' | 'date' | 'custom';
  dateText?: string;
}

export const MeqHeader: React.FC<MeqHeaderProps> = ({
  rightElement,
  onBack,
  showLogo = true,
  title,
  subtitle,
  style,
  avatarInitial = 'K',
  hasNotification = true,
  onPressBell,
  onPressAvatar,
  onPressSearch,
  onPressFilter,
  rightMode,
  dateText,
}) => {
  const renderRight = () => {
    if (rightElement) return rightElement;

    if (rightMode === 'home') {
      return (
        <View style={styles.rightGroup}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={onPressBell}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.textPrimary} />
            {hasNotification && <View style={styles.redDot} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={onPressAvatar} activeOpacity={0.7}>
            <GradientView colors={colors.avatarGradient} style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{avatarInitial.toUpperCase()}</Text>
            </GradientView>
          </TouchableOpacity>
        </View>
      );
    }

    if (rightMode === 'dial') {
      return (
        <View style={styles.rightGroup}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={onPressSearch}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={onPressFilter}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      );
    }

    if (rightMode === 'date') {
      return (
        <View style={styles.datePill}>
          <Ionicons name="calendar-outline" size={14} color={colors.textPrimary} />
          <Text style={styles.datePillText}>{dateText || '21 Sept 2026'}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftContainer}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}

        {showLogo ? (
          <View style={styles.brandRow}>
            {/* Blue circle Q mark */}
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>Q</Text>
            </View>
            <View style={styles.logoTextCol}>
              <Text style={styles.logoMeq}>MEQ</Text>
              <Text style={styles.logoCrm}>CRM</Text>
            </View>
          </View>
        ) : (
          <View style={styles.titleCol}>
            {title && <Text style={styles.screenTitle}>{title}</Text>}
            {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
          </View>
        )}
      </View>

      <View style={styles.rightContainer}>{renderRight()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'System',
  },
  logoTextCol: {
    justifyContent: 'center',
  },
  logoMeq: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  logoCrm: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 1.5,
    lineHeight: 10,
  },
  titleCol: {
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
