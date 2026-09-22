import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { GradientView } from '../../components/common/GradientView';
import { MeqHeader } from '../../components/common/MeqHeader';
import { callApi } from '../../api/callApi';
import { Call, CallAnalytics } from '../../types';

type DateFilterOption = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

type MetricFilterType =
  | 'TOTAL'
  | 'UNIQUE'
  | 'NOT_ATTENDED'
  | 'FRESH'
  | 'PROSPECT'
  | 'JUNK'
  | 'ACCEPTABLE';

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [selectedRange, setSelectedRange] = useState<DateFilterOption>('WEEK');
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [callsList, setCallsList] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricFilterType | null>(null);
  const [modalTitle, setModalTitle] = useState('');

  const getDateRangeParams = useCallback((range: DateFilterOption) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    if (range === 'TODAY') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (range === 'YESTERDAY') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (range === 'WEEK') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'MONTH') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'CUSTOM') {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatHeaderDate = (d: Date) =>
      d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      startDate: start.toISOString().slice(0, 19),
      endDate: end.toISOString().slice(0, 19),
      headerTitle: formatHeaderDate(now),
      headerTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRangeParams(selectedRange);
      const [analyticsData, callsPage] = await Promise.all([
        callApi.getCallAnalytics(startDate, endDate),
        callApi.getCalls({ startDate, endDate, size: 100 }).catch(() => ({ content: [] })),
      ]);
      setAnalytics(analyticsData);
      setCallsList(callsPage.content || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateRangeParams, selectedRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleOpenMetricDetail = (type: MetricFilterType, title: string) => {
    setSelectedMetric(type);
    setModalTitle(title);
    setDetailModalVisible(true);
  };

  const getFilteredCallsForMetric = (type: MetricFilterType | null): Call[] => {
    if (!type) return [];
    switch (type) {
      case 'TOTAL':
        return callsList;
      case 'UNIQUE':
        return callsList.filter((c) => c.durationSeconds && c.durationSeconds >= 1);
      case 'NOT_ATTENDED':
        return callsList.filter(
          (c) =>
            c.callStatus === 'NOT_ATTENDED' ||
            c.callStatus === 'MISSED' ||
            c.callStatus === 'NO_ANSWER' ||
            c.durationSeconds === 0
        );
      case 'FRESH':
        return callsList.filter((c) => !c.leadId || c.callStatus === 'NEW');
      case 'PROSPECT':
        return callsList.filter(
          (c) => c.durationSeconds && c.durationSeconds >= 300
        );
      case 'JUNK':
        return callsList.filter(
          (c) =>
            c.callStatus === 'CONNECTED' &&
            c.durationSeconds &&
            c.durationSeconds > 0 &&
            c.durationSeconds < 30
        );
      case 'ACCEPTABLE':
        return callsList.filter(
          (c) =>
            c.callStatus === 'CONNECTED' &&
            c.durationSeconds &&
            c.durationSeconds >= 60 &&
            c.durationSeconds < 300
        );
      default:
        return callsList;
    }
  };

  const formatSeconds = (sec?: number) => {
    if (!sec || sec <= 0) return '0s';
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    if (mins > 0) {
      return `${mins}m ${remainder}s`;
    }
    return `${remainder}s`;
  };

  const formatHeaderTime = getDateRangeParams(selectedRange);
  const modalCalls = getFilteredCallsForMetric(selectedMetric);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* MEQ CRM Top Header with Calendar Date Pill */}
      <MeqHeader
        rightMode="date"
        dateText={formatHeaderTime.headerTitle}
      />

      {/* Date Filter Tabs Bar */}
      <View style={styles.filterPillsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'CUSTOM'] as DateFilterOption[]).map((tab) => {
            const label =
              tab === 'TODAY'
                ? 'Today'
                : tab === 'YESTERDAY'
                ? 'Yesterday'
                : tab === 'WEEK'
                ? 'This Week'
                : tab === 'MONTH'
                ? 'This Month'
                : 'Custom';
            const isActive = selectedRange === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedRange(tab)}
                activeOpacity={0.7}
              >
                {isActive ? (
                  <GradientView
                    colors={colors.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterPillActive}
                  >
                    <Text style={styles.filterPillTextActive}>{label}</Text>
                  </GradientView>
                ) : (
                  <View style={styles.filterPill}>
                    <Text style={styles.filterPillText}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
        {loading && !refreshing ? (
          <LoadingState message="Fetching real-time call analytics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadData()} />
        ) : (
          <>
            {/* Row 1: TOTAL CALLS & UNIQUE CALLS */}
            <View style={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.statCard, styles.totalCard]}
                activeOpacity={0.8}
                onPress={() => handleOpenMetricDetail('TOTAL', 'Total Calls')}
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="call" size={17} color="#2563EB" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: '#1E3A8A' }]}>
                  {analytics?.totalCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>TOTAL CALLS</Text>
                <Text style={styles.statSubtitle}>All activity</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, styles.uniqueCard]}
                activeOpacity={0.8}
                onPress={() => handleOpenMetricDetail('UNIQUE', 'Unique Calls (> 1s)')}
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="people" size={17} color="#7C3AED" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: '#6D28D9' }]}>
                  {analytics?.uniqueCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>UNIQUE CALLS</Text>
                <Text style={styles.statSubtitle}>Connected &gt; 1s</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: NOT ATTENDED & FRESH CALLS */}
            <View style={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.statCard, styles.notAttendedCard]}
                activeOpacity={0.8}
                onPress={() => handleOpenMetricDetail('NOT_ATTENDED', 'Not Attended Calls')}
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="close-circle" size={17} color="#DC2626" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: '#B91C1C' }]}>
                  {analytics?.notAttendedCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>NOT ATTENDED</Text>
                <Text style={styles.statSubtitle}>Missed / 0s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, styles.freshCard]}
                activeOpacity={0.8}
                onPress={() => handleOpenMetricDetail('FRESH', 'Fresh Calls (New Numbers)')}
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="sparkles" size={17} color="#16A34A" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: '#15803D' }]}>
                  {analytics?.freshCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>FRESH CALLS</Text>
                <Text style={styles.statSubtitle}>New numbers</Text>
              </TouchableOpacity>
            </View>

            {/* Row 3: PROSPECT CALLS & JUNK CALLS */}
            <View style={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.statCard, styles.prospectCard]}
                activeOpacity={0.8}
                onPress={() => handleOpenMetricDetail('PROSPECT', 'Prospect Calls (> 5 mins)')}
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#CCFBF1' }]}>
                    <Ionicons name="trending-up" size={17} color="#0D9488" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: '#0F766E' }]}>
                  {analytics?.prospectCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>PROSPECT CALLS</Text>
                <Text style={styles.statSubtitle}>&gt; 5 mins duration</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, styles.junkCard]}
                activeOpacity={0.8}
                onPress={() => handleOpenMetricDetail('JUNK', 'Junk Calls (< 30s)')}
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}>
                    <Ionicons name="warning" size={17} color="#EA580C" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: '#C2410C' }]}>
                  {analytics?.junkCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>JUNK CALLS</Text>
                <Text style={styles.statSubtitle}>&lt; 30 secs duration</Text>
              </TouchableOpacity>
            </View>

            {/* Row 4: ACCEPTABLE CALLS (Full Width Tinted Card) */}
            <TouchableOpacity
              style={styles.acceptableCard}
              activeOpacity={0.8}
              onPress={() => handleOpenMetricDetail('ACCEPTABLE', 'Acceptable Calls (> 60s)')}
            >
              <View style={styles.acceptableHeader}>
                <View style={styles.acceptableLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={styles.statTitle}>ACCEPTABLE CALLS</Text>
                    <Text style={styles.statSubtitle}>&gt; 60 secs • Qualified discussions</Text>
                  </View>
                </View>
                <Text style={styles.acceptableNumber}>
                  {analytics?.acceptableCalls ?? 0}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Section: System Breakdown */}
            <Text style={styles.sectionHeading}>System Breakdown</Text>

            <View style={styles.breakdownCard}>
              {/* Inbound Calls */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <View style={[styles.breakdownDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.breakdownLabel}>Inbound Calls</Text>
                </View>
                <Text style={styles.breakdownValue}>{analytics?.inboundCalls ?? 0}</Text>
              </View>

              {/* Outbound Calls */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <View style={[styles.breakdownDot, { backgroundColor: colors.info }]} />
                  <Text style={styles.breakdownLabel}>Outbound Calls</Text>
                </View>
                <Text style={styles.breakdownValue}>{analytics?.outboundCalls ?? 0}</Text>
              </View>

              {/* Missed Calls */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <View style={[styles.breakdownDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.breakdownLabel}>Missed Calls</Text>
                </View>
                <Text style={styles.breakdownValue}>{analytics?.missedCalls ?? 0}</Text>
              </View>

              <View style={styles.breakdownDivider} />

              {/* Talk Time & Average Duration */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricGridItem}>
                  <Text style={styles.metricGridLabel}>Total Talk Time</Text>
                  <Text style={styles.metricGridValue}>
                    {formatSeconds(analytics?.totalTalkTimeSeconds)}
                  </Text>
                </View>

                <View style={styles.metricGridItem}>
                  <Text style={styles.metricGridLabel}>Avg Duration</Text>
                  <Text style={styles.metricGridValue}>
                    {formatSeconds(analytics?.averageDurationSeconds)}
                  </Text>
                </View>

                <View style={styles.metricGridItem}>
                  <Text style={styles.metricGridLabel}>Connected</Text>
                  <Text style={styles.metricGridValue}>{analytics?.connectedCalls ?? 0}</Text>
                </View>

                <View style={styles.metricGridItem}>
                  <Text style={styles.metricGridLabel}>Today's Calls</Text>
                  <Text style={styles.metricGridValue}>{analytics?.todayCalls ?? 0}</Text>
                </View>

                <View style={styles.metricGridItem}>
                  <Text style={styles.metricGridLabel}>Upcoming Tasks</Text>
                  <Text style={[styles.metricGridValue, { color: colors.info }]}>
                    {analytics?.upcomingFollowUps ?? 0}
                  </Text>
                </View>

                <View style={styles.metricGridItem}>
                  <Text style={styles.metricGridLabel}>Missed Tasks</Text>
                  <Text style={[styles.metricGridValue, { color: colors.danger }]}>
                    {analytics?.missedFollowUps ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Clickable Card Detail Calls Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%', paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitleText}>{modalTitle}</Text>
                <Text style={styles.modalSubText}>
                  {modalCalls.length} call record{modalCalls.length === 1 ? '' : 's'} found
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setDetailModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {modalCalls.length === 0 ? (
              <EmptyState
                icon="call-outline"
                title="No matching calls"
                message="No records found in this category for the selected period."
              />
            ) : (
              <FlatList
                data={modalCalls}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs }}
                renderItem={({ item }) => (
                  <Card style={styles.modalCallCard}>
                    <View style={styles.modalCallHeader}>
                      <Text style={styles.modalCallName}>
                        {item.leadName || item.leadPhone || 'Unknown'}
                      </Text>
                      <StatusBadge label={item.callStatus} status={item.callStatus} />
                    </View>
                    <View style={styles.modalCallMetaRow}>
                      <Text style={styles.modalCallMeta}>
                        {item.durationSeconds ? `${item.durationSeconds}s` : '0s'} •{' '}
                        {item.callDirection || 'OUTBOUND'}
                      </Text>
                      {item.leadPhone && (
                        <TouchableOpacity
                          onPress={() => {
                            setDetailModalVisible(false);
                            Linking.openURL(`tel:${item.leadPhone}`);
                          }}
                        >
                          <Ionicons name="call" size={16} color={colors.callGreen} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card>
                )}
              />
            )}
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
  filterPillsRow: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPillsScroll: {
    paddingHorizontal: spacing.md,
    paddingRight: spacing.lg,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    padding: spacing.md,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: spacing.sm + 2,
  },
  totalCard: {
    backgroundColor: '#EFF6FF',
    borderColor: 'rgba(59, 130, 246, 0.22)',
  },
  uniqueCard: {
    backgroundColor: '#F5F3FF',
    borderColor: 'rgba(124, 58, 237, 0.22)',
  },
  notAttendedCard: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.22)',
  },
  freshCard: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(34, 197, 94, 0.22)',
  },
  prospectCard: {
    backgroundColor: '#F0FDFA',
    borderColor: 'rgba(20, 184, 166, 0.22)',
  },
  junkCard: {
    backgroundColor: '#FFF7ED',
    borderColor: 'rgba(249, 115, 22, 0.22)',
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  acceptableCard: {
    padding: spacing.md,
    backgroundColor: '#F5F3FF',
    borderColor: 'rgba(124, 58, 237, 0.22)',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: spacing.normal,
  },
  acceptableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  acceptableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  acceptableNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#6D28D9',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  breakdownCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    marginBottom: spacing.normal,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricGridItem: {
    width: '47%',
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: spacing.borderRadius.sm,
  },
  metricGridLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  metricGridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCallCard: {
    padding: spacing.sm + 4,
    marginBottom: spacing.xs + 2,
  },
  modalCallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCallName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCallMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  modalCallMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
