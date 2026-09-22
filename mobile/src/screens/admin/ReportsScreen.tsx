import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { GradientView } from '../../components/common/GradientView';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';
import { reportsApi } from '../../api/reportsApi';
import { projectsApi } from '../../api/projectsApi';
import { Project } from '../../types';

type ReportTab = 'leads' | 'calls' | 'employees' | 'projects' | 'sales';

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<ReportTab>('leads');
  const [reportData, setReportData] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    projectsApi.getProjects().then(setProjects).catch(console.warn);
  }, []);

  const loadReport = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      let data: any;
      if (activeTab === 'leads') {
        data = await reportsApi.getLeadReport({ projectId: selectedProjectId });
      } else if (activeTab === 'calls') {
        data = await reportsApi.getCallReport();
      } else if (activeTab === 'employees') {
        data = await reportsApi.getEmployeeReport();
      } else if (activeTab === 'projects') {
        data = await reportsApi.getProjectReport();
      } else if (activeTab === 'sales') {
        data = await reportsApi.getSalesReport();
      }
      setReportData(data);
    } catch (err) {
      console.warn('Failed to load report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedProjectId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport(true);
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (!val) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const formatSeconds = (sec?: number) => {
    if (!sec) return '0m 0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title="Reports Hub"
        subtitle="In-depth CRM intelligence, performance & revenue"
        onBack={() => navigation.goBack()}
      />

      {/* Tabs Row */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {(
            [
              { id: 'leads', label: 'Leads Pipeline', icon: 'people-outline' },
              { id: 'calls', label: 'Call Metrics', icon: 'call-outline' },
              { id: 'employees', label: 'Agents', icon: 'person-outline' },
              { id: 'projects', label: 'Projects ROI', icon: 'briefcase-outline' },
              { id: 'sales', label: 'Sales & Revenue', icon: 'cash-outline' },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                {isActive ? (
                  <GradientView
                    colors={colors.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabPillActive}
                  >
                    <Ionicons name={tab.icon as any} size={14} color="#ffffff" />
                    <Text style={styles.tabPillTextActive}>{tab.label}</Text>
                  </GradientView>
                ) : (
                  <View style={styles.tabPill}>
                    <Ionicons name={tab.icon as any} size={14} color={colors.textSecondary} />
                    <Text style={styles.tabPillText}>{tab.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Project selector if on leads tab */}
      {activeTab === 'leads' && projects.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.projectFilters}
        >
          <TouchableOpacity
            style={[
              styles.projFilterPill,
              selectedProjectId === undefined && styles.projFilterPillActive,
            ]}
            onPress={() => setSelectedProjectId(undefined)}
          >
            <Text
              style={[
                styles.projFilterText,
                selectedProjectId === undefined && styles.projFilterTextActive,
              ]}
            >
              All Projects
            </Text>
          </TouchableOpacity>
          {projects.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.projFilterPill,
                selectedProjectId === p.id && styles.projFilterPillActive,
              ]}
              onPress={() => setSelectedProjectId(p.id)}
            >
              <Text
                style={[
                  styles.projFilterText,
                  selectedProjectId === p.id && styles.projFilterTextActive,
                ]}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading && !refreshing ? (
        <LoadingState message="Aggregating reports..." fullScreen />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
          {/* TAB 1: LEADS REPORT */}
          {activeTab === 'leads' && (
            <View>
              <View style={styles.kpiRow}>
                <Card style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{reportData?.totalLeads ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Total Leads</Text>
                </Card>
                <Card style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{reportData?.convertedLeads ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Converted</Text>
                </Card>
                <Card style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>
                    {reportData?.totalLeads
                      ? `${Math.round((reportData.convertedLeads / reportData.totalLeads) * 100)}%`
                      : '0%'}
                  </Text>
                  <Text style={styles.kpiLabel}>Conversion Rate</Text>
                </Card>
              </View>

              <Text style={styles.sectionTitle}>Status Distribution</Text>
              <Card style={styles.detailCard}>
                {reportData?.statusBreakdown && Object.keys(reportData.statusBreakdown).length > 0 ? (
                  Object.entries(reportData.statusBreakdown).map(([status, count]: [string, any]) => (
                    <View key={status} style={styles.statRow}>
                      <Text style={styles.statKey}>{status}</Text>
                      <Text style={styles.statCount}>{count} leads</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No status distribution records.</Text>
                )}
              </Card>

              <Text style={styles.sectionTitle}>Business Outcomes</Text>
              <Card style={styles.detailCard}>
                {reportData?.outcomeBreakdown && Object.keys(reportData.outcomeBreakdown).length > 0 ? (
                  Object.entries(reportData.outcomeBreakdown).map(([outcome, count]: [string, any]) => (
                    <View key={outcome} style={styles.statRow}>
                      <Text style={styles.statKey}>{outcome || 'PENDING'}</Text>
                      <Text style={styles.statCount}>{count}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No business outcome records.</Text>
                )}
              </Card>
            </View>
          )}

          {/* TAB 2: CALLS REPORT */}
          {activeTab === 'calls' && (
            <View>
              <View style={styles.kpiRow}>
                <Card style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{reportData?.totalCalls ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Total Calls</Text>
                </Card>
                <Card style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{reportData?.connectedCalls ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Connected</Text>
                </Card>
                <Card style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>
                    {formatSeconds(reportData?.totalDurationSeconds)}
                  </Text>
                  <Text style={styles.kpiLabel}>Total Talk Time</Text>
                </Card>
              </View>

              <Text style={styles.sectionTitle}>Call Outcomes</Text>
              <Card style={styles.detailCard}>
                {reportData?.statusBreakdown &&
                  Object.entries(reportData.statusBreakdown).map(([status, count]: [string, any]) => (
                    <View key={status} style={styles.statRow}>
                      <Text style={styles.statKey}>{status}</Text>
                      <Text style={styles.statCount}>{count} calls</Text>
                    </View>
                  ))}
              </Card>
            </View>
          )}

          {/* TAB 3: EMPLOYEES REPORT */}
          {activeTab === 'employees' && (
            <View>
              <Text style={styles.sectionTitle}>Agent Performance Leaderboard</Text>
              {Array.isArray(reportData) && reportData.length > 0 ? (
                reportData.map((emp: any, idx: number) => (
                  <Card key={emp.userId || idx} style={styles.empCard}>
                    <View style={styles.empHeader}>
                      <View style={styles.empRankBadge}>
                        <Text style={styles.empRankText}>#{idx + 1}</Text>
                      </View>
                      <View style={styles.empInfo}>
                        <Text style={styles.empName}>{emp.userName || emp.name}</Text>
                        <Text style={styles.empEmail}>{emp.email}</Text>
                      </View>
                      <Text style={styles.empRevenue}>{formatCurrency(emp.revenue)}</Text>
                    </View>

                    <View style={styles.empMetricsRow}>
                      <View style={styles.empMetric}>
                        <Text style={styles.empMetricNum}>{emp.callsCount ?? 0}</Text>
                        <Text style={styles.empMetricLabel}>Calls</Text>
                      </View>
                      <View style={styles.empMetric}>
                        <Text style={styles.empMetricNum}>{emp.conversionsCount ?? 0}</Text>
                        <Text style={styles.empMetricLabel}>Deals</Text>
                      </View>
                      <View style={styles.empMetric}>
                        <Text style={styles.empMetricNum}>
                          {emp.conversionRate ? `${emp.conversionRate}%` : '0%'}
                        </Text>
                        <Text style={styles.empMetricLabel}>Win Rate</Text>
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.detailCard}>
                  <Text style={styles.emptyText}>No employee metrics recorded yet.</Text>
                </Card>
              )}
            </View>
          )}

          {/* TAB 4: PROJECTS ROI */}
          {activeTab === 'projects' && (
            <View>
              <Text style={styles.sectionTitle}>Campaign Performance</Text>
              {Array.isArray(reportData) && reportData.length > 0 ? (
                reportData.map((p: any) => (
                  <Card key={p.projectId || p.id} style={styles.detailCard}>
                    <View style={styles.projectReportHeader}>
                      <Text style={styles.statKeyBold}>{p.projectName || p.name}</Text>
                      <Text style={styles.empRevenue}>{formatCurrency(p.revenue)}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>Total Leads Assigned</Text>
                      <Text style={styles.statCount}>{p.totalLeads ?? 0}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>Deals Converted</Text>
                      <Text style={styles.statCount}>{p.convertedLeads ?? 0}</Text>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.detailCard}>
                  <Text style={styles.emptyText}>No project reports available.</Text>
                </Card>
              )}
            </View>
          )}

          {/* TAB 5: SALES REVENUE */}
          {activeTab === 'sales' && (
            <View>
              <Card style={styles.bannerRevenue} variant="elevated">
                <Text style={styles.bannerRevLabel}>Total Closed Sales Revenue</Text>
                <Text style={styles.bannerRevNum}>{formatCurrency(reportData?.totalRevenue)}</Text>
                <Text style={styles.bannerRevMeta}>
                  {reportData?.conversionsCount ?? 0} closed deals • Avg:{' '}
                  {formatCurrency(reportData?.averageDealValue)}
                </Text>
              </Card>

              <Text style={styles.sectionTitle}>Recent Closed Deals</Text>
              {reportData?.recentSales && reportData.recentSales.length > 0 ? (
                reportData.recentSales.map((s: any) => (
                  <Card key={s.id} style={styles.saleItemCard}>
                    <View style={styles.saleItemHeader}>
                      <Text style={styles.saleLeadName}>{s.leadName || `Lead #${s.leadId}`}</Text>
                      <Text style={styles.saleDealValue}>{formatCurrency(s.dealValue)}</Text>
                    </View>
                    <Text style={styles.saleAgent}>Closed by: {s.userName}</Text>
                  </Card>
                ))
              ) : (
                <Card style={styles.detailCard}>
                  <Text style={styles.emptyText}>No conversion sales recorded yet.</Text>
                </Card>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsWrapper: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  projectFilters: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  projFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  projFilterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  projFilterText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  projFilterTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.sm,
    alignItems: 'center',
    marginBottom: 0,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  detailCard: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statKey: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statKeyBold: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  empCard: {
    padding: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  empHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  empRankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  empEmail: {
    fontSize: 10,
    color: colors.textMuted,
  },
  empRevenue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.success,
  },
  empMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  empMetric: {
    alignItems: 'center',
  },
  empMetricNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  empMetricLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  projectReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  bannerRevenue: {
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderColor: colors.borderFocus,
    marginBottom: spacing.xs,
  },
  bannerRevLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  bannerRevNum: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.success,
    marginTop: 2,
  },
  bannerRevMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  saleItemCard: {
    padding: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  saleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleLeadName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saleDealValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.success,
  },
  saleAgent: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
