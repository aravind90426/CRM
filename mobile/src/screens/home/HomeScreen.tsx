import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { MeqHeader } from '../../components/common/MeqHeader';
import { IconTile } from '../../components/common/IconTile';
import { GradientView } from '../../components/common/GradientView';
import { AttendanceCard } from '../../components/attendance/AttendanceCard';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboardApi';
import { salesApi } from '../../api/salesApi';
import { UserDashboardSummary, Sale, RootStackParamList } from '../../types';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, token, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const executeLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to sign out?') : true;
      if (confirmed) {
        executeLogout();
      }
    } else {
      Alert.alert('Confirm Sign Out', 'Are you sure you want to sign out of your account?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: executeLogout,
        },
      ]);
    }
  };

  const [dashboard, setDashboard] = useState<UserDashboardSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Target calculation (default monthly target e.g. ₹100,000)
  const monthlyTargetAmount = 100000;

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !token || authLoading) return;

    try {
      const [dashData, salesData] = await Promise.all([
        dashboardApi.getUserDashboard(),
        salesApi.getMySales(),
      ]);
      setDashboard(dashData);
      setSales(salesData);
    } catch (err: any) {
      console.warn('Failed to load dashboard data:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, token, authLoading]);

  useEffect(() => {
    if (isAuthenticated && token && !authLoading) {
      loadData();
    }
  }, [isAuthenticated, token, authLoading, loadData]);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Calculate current month's revenue and sales
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthSales = sales.filter((s) => {
    if (!s.convertedAt) return false;
    const d = new Date(s.convertedAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthRevenue = thisMonthSales.reduce((sum, s) => sum + (Number(s.dealValue) || 0), 0);
  const revenueToUse = dashboard?.totalRevenue ? Number(dashboard.totalRevenue) : monthRevenue;
  const progressPercent = Math.min(100, Math.round((revenueToUse / monthlyTargetAmount) * 100));

  // Animate progress bar fill on load/update
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, progressAnim]);

  if ((loading || authLoading) && !refreshing && !dashboard) {
    return <LoadingState message="Loading dashboard..." fullScreen />;
  }

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const todayDateFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <MeqHeader
        rightMode="home"
        avatarInitial={user?.name ? user.name.charAt(0) : 'K'}
        onPressAvatar={() => navigation.navigate('Settings')}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Section: Greeting & Date Row */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <Text style={styles.greetingTitle}>Hello, {user?.name || 'Kishore'} 👋</Text>
              <Text style={styles.greetingSubtitle}>Great to see you back!</Text>
            </View>
            <Text style={styles.dateText}>{todayDateFormatted}</Text>
          </View>

          {/* Section: Attendance Hero Card */}
          <AttendanceCard
            onViewHistory={() => navigation.navigate('AttendanceHistory')}
          />

          {/* Section: 4 Stat Tiles Row */}
          <View style={styles.statTilesRow}>
            <TouchableOpacity
              style={styles.statTile}
              onPress={() => (navigation as any).navigate('Dial')}
              activeOpacity={0.7}
            >
              <IconTile icon="call" variant="blue" size={38} iconSize={18} />
              <Text style={styles.statTileNum}>{dashboard?.myCallsToday || 0}</Text>
              <Text style={styles.statTileLabel} numberOfLines={1}>Calls Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statTile}
              onPress={() => (navigation as any).navigate('Dial')}
              activeOpacity={0.7}
            >
              <IconTile icon="link-outline" variant="green" size={38} iconSize={18} />
              <Text style={styles.statTileNum}>{dashboard?.myConnectedCallsToday || 0}</Text>
              <Text style={styles.statTileLabel} numberOfLines={1}>Connected</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statTile}
              onPress={() => navigation.navigate('FollowUps', { period: 'today' })}
              activeOpacity={0.7}
            >
              <IconTile icon="calendar" variant="orange" size={38} iconSize={18} />
              <Text style={styles.statTileNum}>{dashboard?.myPendingFollowUpsToday || 0}</Text>
              <Text style={styles.statTileLabel} numberOfLines={1}>Follow-ups</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statTile}
              onPress={() => (navigation as any).navigate('Leads')}
              activeOpacity={0.7}
            >
              <IconTile icon="people" variant="purple" size={38} iconSize={18} />
              <Text style={styles.statTileNum}>{dashboard?.myAssignedLeads || 1}</Text>
              <Text style={styles.statTileLabel} numberOfLines={1}>My Leads</Text>
            </TouchableOpacity>
          </View>

          {/* Section: Monthly Sales Target Card */}
          <Card style={styles.targetCard}>
            <View style={styles.targetHeader}>
              <View style={styles.targetLeft}>
                <GradientView colors={colors.trophyGradient} style={styles.trophyBadge}>
                  <Ionicons name="trophy" size={20} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.targetTitle}>Monthly Sales Target</Text>
              </View>
              <View style={styles.percentPill}>
                <Text style={styles.percentText}>{progressPercent}%</Text>
              </View>
            </View>

            {/* Progress Bar with Blue->Purple Gradient */}
            <View style={styles.progressBarBg}>
              <Animated.View style={{ width: progressBarWidth, height: '100%', borderRadius: 4, overflow: 'hidden' }}>
                <GradientView colors={colors.progressGradient} style={{ width: '100%', height: '100%' }} />
              </Animated.View>
            </View>

            <View style={styles.targetMetaRow}>
              <Text style={styles.achievedText}>₹{revenueToUse.toLocaleString()} Achieved</Text>
              <Text style={styles.targetText}>₹{monthlyTargetAmount.toLocaleString()} Target</Text>
            </View>
          </Card>

          {/* Section: 2 Compact Revenue & Sales Closed Cards */}
          <View style={styles.compactRow}>
            <Card style={styles.compactCard}>
              <View style={styles.compactHeader}>
                <IconTile icon="trending-up" variant="green" size={32} iconSize={16} />
                <StatusBadge label="Revenue" variant="success" showDot={false} />
              </View>
              <Text style={styles.compactNum}>₹{revenueToUse.toLocaleString()}</Text>
              <Text style={styles.compactLabel}>Month Revenue</Text>
            </Card>

            <Card style={styles.compactCard} onPress={() => navigation.navigate('Sales')}>
              <View style={styles.compactHeader}>
                <IconTile icon="cart" variant="purple" size={32} iconSize={16} />
                <StatusBadge label="Done" variant="primary" showDot={false} />
              </View>
              <Text style={styles.compactNum}>{dashboard?.myConversions || thisMonthSales.length}</Text>
              <Text style={styles.compactLabel}>Sales Closed</Text>
            </Card>
          </View>

          {/* Section: Motivational Quote Card */}
          <GradientView colors={colors.quoteGradient} style={styles.quoteCard}>
            <Ionicons name="disc" size={22} color={colors.primaryViolet} />
            <Text style={styles.quoteText}>“Discipline today leads to success tomorrow.”</Text>
          </GradientView>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 90,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.normal,
    marginTop: 2,
  },
  greetingLeft: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  statTilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: spacing.normal,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statTileNum: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 8,
  },
  statTileLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  targetCard: {
    padding: spacing.md,
    borderRadius: 20,
    marginBottom: spacing.normal,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trophyBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  targetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  percentPill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.pill,
  },
  percentText: {
    color: '#F97316',
    fontWeight: '800',
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    marginVertical: 10,
  },
  targetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievedText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  targetText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  compactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.normal,
  },
  compactCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 18,
    marginBottom: 0,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  compactNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  compactLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.4)',
    marginBottom: spacing.normal,
  },
  quoteText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
});
