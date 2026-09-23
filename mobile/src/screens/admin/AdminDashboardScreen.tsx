import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { MeqHeader } from '../../components/common/MeqHeader';
import { GradientView } from '../../components/common/GradientView';
import { IconTile } from '../../components/common/IconTile';
import { LoadingState } from '../../components/common/LoadingState';
import { AttendanceCard } from '../../components/attendance/AttendanceCard';
import { dashboardApi } from '../../api/dashboardApi';
import { projectsApi } from '../../api/projectsApi';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboardSummary, Project, RootStackParamList } from '../../types';

export const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, token, isLoading: authLoading, user } = useAuth();

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated || !token || authLoading) return;
    if (!isRefresh) setLoading(true);
    try {
      const [sumData, projData] = await Promise.all([
        dashboardApi.getAdminDashboard(),
        projectsApi.getProjects(),
      ]);
      setSummary(sumData);
      setProjects(projData);
    } catch (err) {
      console.warn('Failed to load admin dashboard:', err);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const formatCurrency = (val?: number) => {
    if (!val) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const connectedRate = summary?.totalCalls
    ? Math.round((summary.connectedCalls / summary.totalCalls) * 100)
    : 0;

  const conversionRate = summary?.totalLeads
    ? Math.round((summary.convertedLeads / summary.totalLeads) * 100)
    : 0;

  if (loading && !refreshing) {
    return <LoadingState message="Aggregating executive metrics..." fullScreen />;
  }

  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        rightMode="home"
        avatarInitial={avatarInitial}
        onPressAvatar={() => navigation.navigate('Settings')}
        onPressBell={() => navigation.navigate('Notifications' as any)}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
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
        {/* Section: Greeting Row */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingTitle}>Hello, {user?.name || 'Admin'} 👋</Text>
            <Text style={styles.greetingSubtitle}>Admin Dashboard · {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          </View>
        </View>

        {/* Section: Attendance Card */}
        <AttendanceCard
          onViewHistory={() => navigation.navigate('AttendanceHistory')}
        />

        {/* Banner: Revenue & Conversion */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View>
              <Text style={styles.bannerLabel}>Total Closed Revenue</Text>
              <Text style={styles.bannerValue}>{formatCurrency(summary?.totalRevenue)}</Text>
            </View>
            <View style={styles.badgeSuccess}>
              <Ionicons name="trending-up" size={14} color="#16A34A" />
              <Text style={styles.badgeSuccessText}>{conversionRate}% Conversion</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <GradientView
                colors={colors.progressGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.min(conversionRate, 100)}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {summary?.convertedLeads || 0} converted of {summary?.totalLeads || 0} total leads
            </Text>
          </View>
        </View>

        {/* 2x2 Grid KPI Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('Main' as any, {
                screen: 'Leads',
                params: {
                  screen: 'LeadsList',
                  params: { projectId: undefined, projectName: 'All Leads' },
                },
              } as any)
            }
          >
            <View style={styles.statHeader}>
              <IconTile name="people" variant="blue" size={36} iconSize={18} />
              <Text style={styles.statNumber}>{summary?.totalLeads ?? 0}</Text>
            </View>
            <Text style={styles.statLabel}>Total Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ConvertedLeads')}
          >
            <View style={styles.statHeader}>
              <IconTile name="trophy" variant="green" size={36} iconSize={18} />
              <Text style={styles.statNumber}>{summary?.convertedLeads ?? 0}</Text>
            </View>
            <Text style={styles.statLabel}>Converted Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('CallLogs', { initialTab: 'TODAY' } as any)
            }
          >
            <View style={styles.statHeader}>
              <IconTile name="call" variant="purple" size={36} iconSize={18} />
              <Text style={styles.statNumber}>{summary?.callsToday ?? 0}</Text>
            </View>
            <Text style={styles.statLabel}>Calls Today ({connectedRate}%)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AdminProjects')}
          >
            <View style={styles.statHeader}>
              <IconTile name="briefcase" variant="orange" size={36} iconSize={18} />
              <Text style={styles.statNumber}>{summary?.activeProjects ?? projects.length}</Text>
            </View>
            <Text style={styles.statLabel}>Active Projects</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Admin Actions */}
        <Text style={styles.sectionTitle}>Executive Management</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => navigation.navigate('AdminProjects')}
            activeOpacity={0.7}
          >
            <IconTile name="briefcase" variant="blue" size={32} iconSize={16} />
            <Text style={styles.actionPillText}>Projects</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => navigation.navigate('AdminUsers')}
            activeOpacity={0.7}
          >
            <IconTile name="person-add" variant="purple" size={32} iconSize={16} />
            <Text style={styles.actionPillText}>Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => navigation.navigate('Assignments')}
            activeOpacity={0.7}
          >
            <IconTile name="shuffle" variant="orange" size={32} iconSize={16} />
            <Text style={styles.actionPillText}>Assign</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => navigation.navigate('GoogleSheets')}
            activeOpacity={0.7}
          >
            <IconTile name="document-text" variant="green" size={32} iconSize={16} />
            <Text style={styles.actionPillText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Projects Pipeline Breakdown */}
        <View style={styles.projectsHeaderRow}>
          <Text style={styles.sectionTitle}>Active Projects Pipeline</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminProjects')}>
            <Text style={styles.seeAllText}>Manage All ›</Text>
          </TouchableOpacity>
        </View>

        {projects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No projects active currently.</Text>
          </View>
        ) : (
          projects.slice(0, 4).map((p) => (
            <View key={p.id} style={styles.projectCard}>
              <View style={styles.projectCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectName}>{p.name}</Text>
                  <Text style={styles.projectDesc} numberOfLines={1}>
                    {p.description || 'No description provided'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, p.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{p.status}</Text>
                </View>
              </View>

              <View style={styles.projectStatsRow}>
                <View style={styles.projectStatItem}>
                  <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.projectStatText}>
                    {p.assignedLeadsCount ?? p.totalLeads ?? 0} Leads
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewLeadsBtn}
                  onPress={() =>
                    navigation.navigate('Main' as any, {
                      screen: 'Leads',
                      params: {
                        screen: 'LeadsList',
                        params: { projectId: p.id, projectName: p.name },
                      },
                    } as any)
                  }
                >
                  <Text style={styles.viewLeadsBtnText}>View Leads ›</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 100,
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
  bannerCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#6D28D9',
    marginTop: 2,
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  progressContainer: {
    marginTop: spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  projectsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  projectCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  projectDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    maxWidth: 220,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  projectStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  projectStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectStatText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewLeadsBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  viewLeadsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyCard: {
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
