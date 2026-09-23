import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { GradientView } from '../../components/common/GradientView';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { reportsApi, AdminAnalyticsDashboardData } from '../../api/reportsApi';
import { projectsApi } from '../../api/projectsApi';
import { usersApi } from '../../api/usersApi';
import { Project, User } from '../../types';

type DatePreset = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Filters State
  const [datePreset, setDatePreset] = useState<DatePreset>('LAST_7_DAYS');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string | undefined>(undefined);
  const [selectedCallStatus, setSelectedCallStatus] = useState<string | undefined>(undefined);
  const [selectedCallDirection, setSelectedCallDirection] = useState<string | undefined>(undefined);

  // Filter UI Modals
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  // Data State
  const [dashboardData, setDashboardData] = useState<AdminAnalyticsDashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initial reference lists
  useEffect(() => {
    Promise.all([
      projectsApi.getProjects().catch(() => []),
      usersApi.getActiveUsers().catch(() => []),
    ]).then(([projData, userData]) => {
      setProjects(projData || []);
      setUsers(userData || []);
    });
  }, []);

  const computeDateRange = (preset: DatePreset) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date = now;

    if (preset === 'TODAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
    } else if (preset === 'LAST_7_DAYS') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === 'LAST_30_DAYS') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === 'CUSTOM') {
      if (customStartDate) start = new Date(customStartDate);
      if (customEndDate) end = new Date(customEndDate);
    }

    return {
      start: start ? start.toISOString() : undefined,
      end: end ? end.toISOString() : undefined,
    };
  };

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const { start, end } = computeDateRange(datePreset);
        const data = await reportsApi.getAdminAnalyticsDashboard({
          projectId: selectedProjectId,
          userId: selectedUserId,
          leadStatus: selectedLeadStatus,
          callStatus: selectedCallStatus,
          callDirection: selectedCallDirection,
          start,
          end,
        });
        setDashboardData(data);
      } catch (err: any) {
        console.warn('Failed to fetch analytics dashboard:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      datePreset,
      customStartDate,
      customEndDate,
      selectedProjectId,
      selectedUserId,
      selectedLeadStatus,
      selectedCallStatus,
      selectedCallDirection,
    ]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard(true);
  };

  const handleResetFilters = () => {
    setDatePreset('LAST_7_DAYS');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedProjectId(undefined);
    setSelectedUserId(undefined);
    setSelectedLeadStatus(undefined);
    setSelectedCallStatus(undefined);
    setSelectedCallDirection(undefined);
    setShowFiltersModal(false);
  };

  const handleExportCsv = async (type: 'LEADS' | 'CALLS' | 'CONVERSIONS' | 'FOLLOWUPS') => {
    setDownloadingType(type);
    try {
      const { start, end } = computeDateRange(datePreset);
      const csvData = await reportsApi.exportReportCsv({
        type,
        projectId: selectedProjectId,
        userId: selectedUserId,
        leadStatus: selectedLeadStatus,
        callStatus: selectedCallStatus,
        callDirection: selectedCallDirection,
        start,
        end,
      });

      if (!csvData || csvData.length === 0) {
        Alert.alert('Empty Report', 'No records found matching current active filters.');
        return;
      }

      const rowsCount = csvData.split('\n').filter((r) => r.trim().length > 0).length - 1;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type.toLowerCase()}_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Export Complete', `${rowsCount} ${type.toLowerCase()} records downloaded successfully.`);
      } else {
        try {
          await Share.share({
            title: `${type} Report CSV`,
            message: csvData,
          });
        } catch {
          Alert.alert('Export Generated', `${rowsCount} ${type.toLowerCase()} rows prepared successfully.`);
        }
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Unable to download report CSV.');
    } finally {
      setDownloadingType(null);
    }
  };

  const formatSeconds = (sec?: number) => {
    if (!sec || sec <= 0) return '0s';
    const hrs = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) return `${hrs}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const selectedProjectName = projects.find((p) => p.id === selectedProjectId)?.name || 'All Projects';
  const selectedUserName = users.find((u) => u.id === selectedUserId)?.name || 'All Users';

  const kpis = dashboardData?.kpis;
  const callPerf = dashboardData?.callPerformance;
  const leadPerf = dashboardData?.leadPerformance;
  const projectStats = dashboardData?.projectPerformance || [];
  const userStats = dashboardData?.userActivity || [];
  const followUpReport = dashboardData?.followUpReport;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title="Reports & Analytics"
        subtitle="Live organization intelligence & pipeline analytics"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.filterToggleBtn}
            onPress={() => setShowFiltersModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={15} color={colors.primary} />
            <Text style={styles.filterToggleText}>Filters</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter Summary Header Strip */}
      <View style={styles.filterSummaryStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsStrip}>
          <View style={styles.summaryChip}>
            <Ionicons name="calendar-outline" size={12} color="#4F46E5" />
            <Text style={styles.summaryChipText}>
              {datePreset === 'TODAY'
                ? 'Today'
                : datePreset === 'YESTERDAY'
                ? 'Yesterday'
                : datePreset === 'LAST_7_DAYS'
                ? 'Last 7 Days'
                : datePreset === 'LAST_30_DAYS'
                ? 'Last 30 Days'
                : 'Custom Range'}
            </Text>
          </View>

          {selectedProjectId && (
            <View style={styles.summaryChip}>
              <Ionicons name="briefcase-outline" size={12} color="#059669" />
              <Text style={styles.summaryChipText}>{selectedProjectName}</Text>
            </View>
          )}

          {selectedUserId && (
            <View style={styles.summaryChip}>
              <Ionicons name="person-outline" size={12} color="#D97706" />
              <Text style={styles.summaryChipText}>{selectedUserName}</Text>
            </View>
          )}

          {selectedLeadStatus && (
            <View style={styles.summaryChip}>
              <Ionicons name="pricetag-outline" size={12} color="#7C3AED" />
              <Text style={styles.summaryChipText}>{selectedLeadStatus}</Text>
            </View>
          )}

          {selectedCallStatus && (
            <View style={styles.summaryChip}>
              <Ionicons name="call-outline" size={12} color="#DC2626" />
              <Text style={styles.summaryChipText}>{selectedCallStatus}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Aggregating live CRM analytics..." fullScreen />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
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
          {/* 1. 8 KPI SUMMARY CARDS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
            <Text style={styles.sectionBadge}>Live Data</Text>
          </View>

          <View style={styles.kpiGrid}>
            <Card style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="people" size={16} color="#4F46E5" />
              </View>
              <Text style={styles.kpiValue}>{kpis?.totalLeads ?? 0}</Text>
              <Text style={styles.kpiLabel}>Total Leads</Text>
            </Card>

            <Card style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="call" size={16} color="#16A34A" />
              </View>
              <Text style={styles.kpiValue}>{kpis?.connectedCalls ?? 0}</Text>
              <Text style={styles.kpiLabel}>Connected Calls</Text>
            </Card>

            <Card style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time" size={16} color="#D97706" />
              </View>
              <Text style={styles.kpiValue}>{formatSeconds(kpis?.totalTalkTimeSeconds)}</Text>
              <Text style={styles.kpiLabel}>Total Talk Time</Text>
            </Card>

            <Card style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="trophy" size={16} color="#9333EA" />
              </View>
              <Text style={styles.kpiValue}>{kpis?.conversions ?? 0}</Text>
              <Text style={styles.kpiLabel}>Conversions</Text>
            </Card>

            <Card style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="call-outline" size={16} color="#475569" />
              </View>
              <Text style={styles.kpiValue}>{kpis?.totalCalls ?? 0}</Text>
              <Text style={styles.kpiLabel}>Total Calls</Text>
            </Card>

            <Card style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle" size={16} color="#DC2626" />
              </View>
              <Text style={styles.kpiValue}>{kpis?.missedCalls ?? 0}</Text>
              <Text style={styles.kpiLabel}>Missed / Unanswered</Text>
            </Card>

            <Card style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="trending-up" size={16} color="#3730A3" />
              </View>
              <Text style={styles.kpiValue}>
                {kpis?.conversionRate ? `${kpis.conversionRate.toFixed(1)}%` : '0%'}
              </Text>
              <Text style={styles.kpiLabel}>Conversion Rate</Text>
            </Card>

            <Card style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="alarm" size={16} color="#EA580C" />
              </View>
              <Text style={styles.kpiValue}>
                {(kpis?.pendingFollowUps ?? 0) + (kpis?.overdueFollowUps ?? 0)}
              </Text>
              <Text style={styles.kpiLabel}>Follow-ups Due</Text>
            </Card>
          </View>

          {/* 2. CALL PERFORMANCE REPORT */}
          <Text style={styles.sectionTitle}>Call Performance & Outcomes</Text>
          <Card style={styles.detailCard}>
            <View style={styles.metricRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricSub}>Connected vs Missed</Text>
                <Text style={styles.metricMain}>
                  {callPerf?.connectedCount ?? 0} / {(callPerf?.connectedCount ?? 0) + (callPerf?.missedCount ?? 0)}
                </Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricSub}>Inbound / Outbound</Text>
                <Text style={styles.metricMain}>
                  {callPerf?.inboundCount ?? 0} In • {callPerf?.outboundCount ?? 0} Out
                </Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricSub}>Avg Duration</Text>
                <Text style={styles.metricMain}>{formatSeconds(kpis?.avgTalkTimeSeconds)}</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.subSectionTitle}>Call Outcome Distribution</Text>
            {callPerf?.classificationBreakdown && Object.keys(callPerf.classificationBreakdown).length > 0 ? (
              Object.entries(callPerf.classificationBreakdown).map(([label, count]) => (
                <View key={label} style={styles.breakdownRow}>
                  <Badge label={label} status={label} />
                  <Text style={styles.breakdownCount}>{count} calls</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No call outcomes recorded in this filter scope.</Text>
            )}

            {/* Timeline Volume */}
            {callPerf?.timelineData && callPerf.timelineData.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.subSectionTitle}>Calls Volume Over Time</Text>
                <View style={styles.timelineBarsRow}>
                  {callPerf.timelineData.map((pt, i) => (
                    <View key={i} style={styles.timelineBarCol}>
                      <Text style={styles.timelineBarVal}>{pt.calls}</Text>
                      <View style={[styles.timelineBarFill, { height: Math.min(60, Math.max(12, pt.calls * 8)) }]} />
                      <Text style={styles.timelineBarLabel} numberOfLines={1}>{pt.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>

          {/* 3. LEAD PERFORMANCE & PIPELINE */}
          <Text style={styles.sectionTitle}>Lead Performance & Stages</Text>
          <Card style={styles.detailCard}>
            <View style={styles.stageGrid}>
              {leadPerf?.stageBreakdown && Object.entries(leadPerf.stageBreakdown).map(([st, cnt]) => (
                <View key={st} style={styles.stageChip}>
                  <Text style={styles.stageChipLabel}>{st}</Text>
                  <Text style={styles.stageChipCount}>{cnt}</Text>
                </View>
              ))}
            </View>
            {leadPerf?.outcomeBreakdown && Object.keys(leadPerf.outcomeBreakdown).length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.subSectionTitle}>Business Outcomes</Text>
                {Object.entries(leadPerf.outcomeBreakdown).map(([out, cnt]) => (
                  <View key={out} style={styles.breakdownRow}>
                    <Text style={styles.outcomeLabel}>{out}</Text>
                    <Text style={styles.breakdownCount}>{cnt} leads</Text>
                  </View>
                ))}
              </>
            )}
          </Card>

          {/* 4. PROJECT PERFORMANCE */}
          <Text style={styles.sectionTitle}>Project Performance</Text>
          {projectStats.length > 0 ? (
            projectStats.map((p) => (
              <Card key={p.projectId} style={styles.detailCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.projectTitle}>{p.projectName}</Text>
                  <Badge label={`${p.conversionRate.toFixed(1)}% Conv.`} status="CONVERTED" />
                </View>
                <View style={styles.metaStatRow}>
                  <Text style={styles.metaStatText}>Leads: <Text style={styles.boldVal}>{p.totalLeads}</Text></Text>
                  <Text style={styles.metaStatText}>Calls: <Text style={styles.boldVal}>{p.totalCalls}</Text></Text>
                  <Text style={styles.metaStatText}>Conversions: <Text style={styles.boldVal}>{p.conversions}</Text></Text>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.detailCard}>
              <Text style={styles.emptyText}>No project performance records available.</Text>
            </Card>
          )}

          {/* 5. USER ACTIVITY REPORT (Factual, no leaderboard) */}
          <Text style={styles.sectionTitle}>User Activity Summary</Text>
          {userStats.length > 0 ? (
            userStats.map((u) => (
              <Card key={u.userId} style={styles.detailCard}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.userTitle}>{u.userName}</Text>
                    <Text style={styles.userRole}>{u.role}</Text>
                  </View>
                  <View style={styles.conversionsBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                    <Text style={styles.conversionsText}>{u.conversions} Won</Text>
                  </View>
                </View>
                <View style={styles.userMetricsRow}>
                  <View style={styles.userMetricCol}>
                    <Text style={styles.userMetricVal}>{u.assignedLeads}</Text>
                    <Text style={styles.userMetricLbl}>Assigned</Text>
                  </View>
                  <View style={styles.userMetricCol}>
                    <Text style={styles.userMetricVal}>{u.totalCalls}</Text>
                    <Text style={styles.userMetricLbl}>Calls</Text>
                  </View>
                  <View style={styles.userMetricCol}>
                    <Text style={styles.userMetricVal}>{u.connectedCalls}</Text>
                    <Text style={styles.userMetricLbl}>Connected</Text>
                  </View>
                  <View style={styles.userMetricCol}>
                    <Text style={styles.userMetricVal}>{formatSeconds(u.talkTimeSeconds)}</Text>
                    <Text style={styles.userMetricLbl}>Talk Time</Text>
                  </View>
                  <View style={styles.userMetricCol}>
                    <Text style={styles.userMetricVal}>{u.followUpsHandled}</Text>
                    <Text style={styles.userMetricLbl}>Follow-ups</Text>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.detailCard}>
              <Text style={styles.emptyText}>No user activity logged in this filter scope.</Text>
            </Card>
          )}

          {/* 6. FOLLOW-UP REPORT */}
          <Text style={styles.sectionTitle}>Follow-up Status</Text>
          <Card style={styles.detailCard}>
            <View style={styles.followUpGrid}>
              <View style={[styles.followUpBox, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.followUpCount, { color: '#D97706' }]}>
                  {followUpReport?.pendingCount ?? 0}
                </Text>
                <Text style={styles.followUpLbl}>Pending</Text>
              </View>
              <View style={[styles.followUpBox, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.followUpCount, { color: '#DC2626' }]}>
                  {followUpReport?.overdueCount ?? 0}
                </Text>
                <Text style={styles.followUpLbl}>Overdue</Text>
              </View>
              <View style={[styles.followUpBox, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.followUpCount, { color: '#16A34A' }]}>
                  {followUpReport?.completedCount ?? 0}
                </Text>
                <Text style={styles.followUpLbl}>Completed</Text>
              </View>
            </View>
          </Card>

          {/* 7. DEDICATED DOWNLOAD REPORTS SECTION (Single section for 4 filtered CSV exports) */}
          <Text style={styles.sectionTitle}>Download Reports (Filtered Scope)</Text>
          <Card style={styles.downloadCard}>
            <Text style={styles.downloadCardDesc}>
              Export full CRM intelligence records matching current filters to CSV spreadsheets.
            </Text>

            <View style={styles.downloadButtonsGrid}>
              <TouchableOpacity
                style={styles.downloadActionBtn}
                onPress={() => handleExportCsv('LEADS')}
                disabled={downloadingType !== null}
                activeOpacity={0.7}
              >
                <Ionicons name="people" size={16} color="#4F46E5" />
                <Text style={styles.downloadActionText}>
                  {downloadingType === 'LEADS' ? 'Exporting...' : 'Export Leads CSV'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.downloadActionBtn}
                onPress={() => handleExportCsv('CALLS')}
                disabled={downloadingType !== null}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={16} color="#16A34A" />
                <Text style={styles.downloadActionText}>
                  {downloadingType === 'CALLS' ? 'Exporting...' : 'Export Calls CSV'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.downloadActionBtn}
                onPress={() => handleExportCsv('CONVERSIONS')}
                disabled={downloadingType !== null}
                activeOpacity={0.7}
              >
                <Ionicons name="cash" size={16} color="#9333EA" />
                <Text style={styles.downloadActionText}>
                  {downloadingType === 'CONVERSIONS' ? 'Exporting...' : 'Export Conversions CSV'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.downloadActionBtn}
                onPress={() => handleExportCsv('FOLLOWUPS')}
                disabled={downloadingType !== null}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar" size={16} color="#D97706" />
                <Text style={styles.downloadActionText}>
                  {downloadingType === 'FOLLOWUPS' ? 'Exporting...' : 'Export Follow-ups CSV'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModalCard, { maxHeight: '85%' }]}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Analytics</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Date Presets */}
              <Text style={styles.filterFieldLabel}>Date Range</Text>
              <View style={styles.filterOptionsGrid}>
                {(
                  [
                    { id: 'TODAY', label: 'Today' },
                    { id: 'YESTERDAY', label: 'Yesterday' },
                    { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
                    { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
                    { id: 'CUSTOM', label: 'Custom' },
                  ] as const
                ).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.filterChip, datePreset === p.id && styles.filterChipActive]}
                    onPress={() => setDatePreset(p.id)}
                  >
                    <Text style={[styles.filterChipText, datePreset === p.id && styles.filterChipTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {datePreset === 'CUSTOM' && (
                <View style={{ marginTop: 8 }}>
                  <Input
                    label="Start Date (YYYY-MM-DD)"
                    placeholder="2026-09-01"
                    value={customStartDate}
                    onChangeText={setCustomStartDate}
                  />
                  <Input
                    label="End Date (YYYY-MM-DD)"
                    placeholder="2026-09-23"
                    value={customEndDate}
                    onChangeText={setCustomEndDate}
                  />
                </View>
              )}

              {/* Project Filter */}
              <Text style={styles.filterFieldLabel}>Project</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedProjectId === undefined && styles.filterChipActive]}
                  onPress={() => setSelectedProjectId(undefined)}
                >
                  <Text style={[styles.filterChipText, selectedProjectId === undefined && styles.filterChipTextActive]}>
                    All Projects
                  </Text>
                </TouchableOpacity>
                {projects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.filterChip, selectedProjectId === p.id && styles.filterChipActive]}
                    onPress={() => setSelectedProjectId(p.id)}
                  >
                    <Text style={[styles.filterChipText, selectedProjectId === p.id && styles.filterChipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* User Filter */}
              <Text style={styles.filterFieldLabel}>User / Agent</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedUserId === undefined && styles.filterChipActive]}
                  onPress={() => setSelectedUserId(undefined)}
                >
                  <Text style={[styles.filterChipText, selectedUserId === undefined && styles.filterChipTextActive]}>
                    All Users
                  </Text>
                </TouchableOpacity>
                {users.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.filterChip, selectedUserId === u.id && styles.filterChipActive]}
                    onPress={() => setSelectedUserId(u.id)}
                  >
                    <Text style={[styles.filterChipText, selectedUserId === u.id && styles.filterChipTextActive]}>
                      {u.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lead Status Filter */}
              <Text style={styles.filterFieldLabel}>Lead Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptionsRow}>
                {['ALL', 'NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'JUNK'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.filterChip,
                      (selectedLeadStatus === st || (st === 'ALL' && !selectedLeadStatus)) && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedLeadStatus(st === 'ALL' ? undefined : st)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        (selectedLeadStatus === st || (st === 'ALL' && !selectedLeadStatus)) && styles.filterChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Call Direction Filter */}
              <Text style={styles.filterFieldLabel}>Call Direction</Text>
              <View style={styles.filterOptionsGrid}>
                {['ALL', 'OUTBOUND', 'INBOUND'].map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    style={[
                      styles.filterChip,
                      (selectedCallDirection === dir || (dir === 'ALL' && !selectedCallDirection)) && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedCallDirection(dir === 'ALL' ? undefined : dir)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        (selectedCallDirection === dir || (dir === 'ALL' && !selectedCallDirection)) && styles.filterChipTextActive,
                      ]}
                    >
                      {dir}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
                  <Text style={styles.resetBtnText}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => {
                    setShowFiltersModal(false);
                    fetchDashboard(true);
                  }}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  filterSummaryStrip: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  filterChipsStrip: {
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  kpiCard: {
    width: '48.5%',
    padding: 12,
    alignItems: 'flex-start',
    marginBottom: 0,
    borderRadius: 14,
  },
  kpiIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  detailCard: {
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricMain: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  outcomeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timelineBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 90,
    paddingTop: 10,
  },
  timelineBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  timelineBarVal: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  timelineBarFill: {
    width: 14,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  timelineBarLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stageChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  stageChipCount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaStatText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  boldVal: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userRole: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
  conversionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  conversionsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  userMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  userMetricCol: {
    alignItems: 'center',
  },
  userMetricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userMetricLbl: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  followUpGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  followUpBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  followUpCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  followUpLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 2,
  },
  downloadCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  downloadCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  downloadButtonsGrid: {
    gap: 8,
  },
  downloadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  downloadActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  filterModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.md,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  filterFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterOptionsRow: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
