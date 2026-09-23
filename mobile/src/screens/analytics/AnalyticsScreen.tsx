import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { GradientView } from '../../components/common/GradientView';
import { MeqHeader } from '../../components/common/MeqHeader';
import { callApi } from '../../api/callApi';
import { CallAnalytics } from '../../types';

type DateFilterOption = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [selectedRange, setSelectedRange] = useState<DateFilterOption>('WEEK');
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Date Range Modal State
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [activeCustomRange, setActiveCustomRange] = useState<{ start: string; end: string } | null>(null);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const getDateRangeParams = useCallback(
    (range: DateFilterOption) => {
      const now = new Date();
      const pad2 = (n: number) => n.toString().padStart(2, '0');

      let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (range === 'TODAY') {
        // start and end already set to today
      } else if (range === 'WEEK') {
        // Monday of current week
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
        start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      } else if (range === 'MONTH') {
        // First day of current month
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      } else if (range === 'CUSTOM' && activeCustomRange) {
        return {
          startDate: activeCustomRange.start,
          endDate: activeCustomRange.end,
          headerTitle: `${activeCustomRange.start.slice(0, 10)} to ${activeCustomRange.end.slice(0, 10)}`,
        };
      }

      const formatIso = (d: Date) =>
        `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

      const formatHeaderDate = (d: Date) =>
        d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      return {
        startDate: formatIso(start),
        endDate: formatIso(end),
        headerTitle: formatHeaderDate(now),
      };
    },
    [activeCustomRange]
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const { startDate, endDate } = getDateRangeParams(selectedRange);
        const data = await callApi.getCallAnalytics(startDate, endDate);
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message || 'Unable to load analytics.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getDateRangeParams, selectedRange]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleApplyCustomDate = () => {
    if (!customFromDate.trim() || !customToDate.trim()) {
      return;
    }
    const startIso = `${customFromDate.trim()}T00:00:00`;
    const endIso = `${customToDate.trim()}T23:59:59`;
    setActiveCustomRange({ start: startIso, end: endIso });
    setSelectedRange('CUSTOM');
    setCustomModalVisible(false);
  };

  const handleResetCustomDate = () => {
    setActiveCustomRange(null);
    setCustomFromDate('');
    setCustomToDate('');
    setSelectedRange('WEEK');
    setCustomModalVisible(false);
  };

  const handleOpenCustomPicker = () => {
    const now = new Date();
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const pastStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;

    if (!customFromDate) setCustomFromDate(pastStr);
    if (!customToDate) setCustomToDate(todayStr);
    setCustomModalVisible(true);
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

  const { startDate, endDate, headerTitle } = getDateRangeParams(selectedRange);

  // Navigate directly to CallLogs with applied filter and dates
  const handleCardClick = (params: {
    status?: string;
    callDirection?: string;
    minDuration?: number;
    maxDuration?: number;
    filterTitle: string;
  }) => {
    navigation.navigate('CallLogs', {
      startDate,
      endDate,
      ...params,
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader rightMode="date" dateText={headerTitle} />

      {/* Date Filter Tabs Bar */}
      <View style={styles.filterPillsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {(['TODAY', 'WEEK', 'MONTH'] as DateFilterOption[]).map((tab) => {
            const label =
              tab === 'TODAY'
                ? 'Today'
                : tab === 'WEEK'
                ? 'This Week'
                : 'This Month';
            const isActive = selectedRange === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  setSelectedRange(tab);
                  setActiveCustomRange(null);
                }}
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

          {/* Custom Date Pill */}
          <TouchableOpacity
            onPress={handleOpenCustomPicker}
            activeOpacity={0.7}
          >
            {selectedRange === 'CUSTOM' ? (
              <GradientView
                colors={colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterPillActive}
              >
                <Ionicons name="calendar" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.filterPillTextActive}>
                  {activeCustomRange ? 'Custom (Active)' : 'Custom Range'}
                </Text>
              </GradientView>
            ) : (
              <View style={[styles.filterPill, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.filterPillText}>Custom Range</Text>
              </View>
            )}
          </TouchableOpacity>
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
          <LoadingState message="Fetching call analytics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadData()} />
        ) : (
          <>
            {/* Row 1: TOTAL CALLS & CONNECTED CALLS */}
            <View style={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.statCard, styles.totalCard]}
                activeOpacity={0.8}
                onPress={() =>
                  handleCardClick({
                    filterTitle: 'Total Calls',
                  })
                }
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="call" size={17} color="#2563EB" />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#93C5FD" />
                </View>
                <Text style={[styles.statNumber, { color: '#1E3A8A' }]}>
                  {analytics?.totalCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>TOTAL CALLS</Text>
                <Text style={styles.statSubtitle}>Tap to view all calls</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, styles.uniqueCard]}
                activeOpacity={0.8}
                onPress={() =>
                  handleCardClick({
                    status: 'CONNECTED',
                    filterTitle: 'Connected Calls',
                  })
                }
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="checkmark-circle" size={17} color="#7C3AED" />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4B5FD" />
                </View>
                <Text style={[styles.statNumber, { color: '#6D28D9' }]}>
                  {analytics?.connectedCalls ?? analytics?.acceptableCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>CONNECTED</Text>
                <Text style={styles.statSubtitle}>Tap to view connected</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: PROSPECT & JUNK */}
            <View style={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.statCard, styles.prospectCard]}
                activeOpacity={0.8}
                onPress={() =>
                  handleCardClick({
                    status: 'PROSPECT',
                    minDuration: 301,
                    filterTitle: 'Prospect Calls (> 5m)',
                  })
                }
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#CCFBF1' }]}>
                    <Ionicons name="trending-up" size={17} color="#0D9488" />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#99F6E4" />
                </View>
                <Text style={[styles.statNumber, { color: '#0F766E' }]}>
                  {analytics?.prospectCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>PROSPECT</Text>
                <Text style={styles.statSubtitle}>&gt; 5 mins duration</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, styles.junkCard]}
                activeOpacity={0.8}
                onPress={() =>
                  handleCardClick({
                    status: 'JUNK',
                    maxDuration: 20,
                    filterTitle: 'Junk Calls (< 20s)',
                  })
                }
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}>
                    <Ionicons name="warning" size={17} color="#EA580C" />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#FDBA74" />
                </View>
                <Text style={[styles.statNumber, { color: '#C2410C' }]}>
                  {analytics?.junkCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>JUNK</Text>
                <Text style={styles.statSubtitle}>&lt; 20s duration</Text>
              </TouchableOpacity>
            </View>

            {/* Row 3: NOT ATTENDED & MISSED */}
            <View style={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.statCard, styles.notAttendedCard]}
                activeOpacity={0.8}
                onPress={() =>
                  handleCardClick({
                    status: 'NOT_ATTENDED',
                    filterTitle: 'Not Attended Calls',
                  })
                }
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="close-circle" size={17} color="#DC2626" />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
                </View>
                <Text style={[styles.statNumber, { color: '#B91C1C' }]}>
                  {analytics?.notAttendedCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>NOT ATTENDED</Text>
                <Text style={styles.statSubtitle}>Unanswered / 0s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, styles.missedCard]}
                activeOpacity={0.8}
                onPress={() =>
                  handleCardClick({
                    status: 'MISSED',
                    filterTitle: 'Missed Calls',
                  })
                }
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="call-outline" size={17} color="#D97706" />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#FCD34D" />
                </View>
                <Text style={[styles.statNumber, { color: '#B45309' }]}>
                  {analytics?.missedCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>MISSED</Text>
                <Text style={styles.statSubtitle}>Missed calls</Text>
              </TouchableOpacity>
            </View>

            {/* Row 4: OUTBOUND & INBOUND */}
            <View style={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.statCard, styles.outboundCard]}
                activeOpacity={0.8}
                onPress={() =>
                  handleCardClick({
                    callDirection: 'OUTBOUND',
                    filterTitle: 'Outbound Calls',
                  })
                }
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="arrow-up-circle" size={17} color="#4F46E5" />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#A5B4FC" />
                </View>
                <Text style={[styles.statNumber, { color: '#3730A3' }]}>
                  {analytics?.outboundCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>OUTBOUND</Text>
                <Text style={styles.statSubtitle}>Outgoing calls</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, styles.inboundCard]}
                activeOpacity={0.8}
                onPress={() =>
                  handleCardClick({
                    callDirection: 'INBOUND',
                    filterTitle: 'Inbound Calls',
                  })
                }
              >
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="arrow-down-circle" size={17} color="#16A34A" />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#86EFAC" />
                </View>
                <Text style={[styles.statNumber, { color: '#15803D' }]}>
                  {analytics?.inboundCalls ?? 0}
                </Text>
                <Text style={styles.statTitle}>INBOUND</Text>
                <Text style={styles.statSubtitle}>Incoming calls</Text>
              </TouchableOpacity>
            </View>

            {/* Row 5: TALK TIME & AVG DURATION */}
            <View style={styles.cardsRow}>
              <View style={[styles.statCard, styles.talkTimeCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="time" size={17} color="#9333EA" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: '#6B21A8' }]}>
                  {formatSeconds(analytics?.totalTalkTimeSeconds)}
                </Text>
                <Text style={styles.statTitle}>TOTAL TALK TIME</Text>
                <Text style={styles.statSubtitle}>Cumulative duration</Text>
              </View>

              <View style={[styles.statCard, styles.avgDurationCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="speedometer" size={17} color="#059669" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: '#047857' }]}>
                  {formatSeconds(analytics?.averageDurationSeconds)}
                </Text>
                <Text style={styles.statTitle}>AVG DURATION</Text>
                <Text style={styles.statSubtitle}>Per connected call</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Custom Date Range Selection Modal */}
      <Modal
        visible={customModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customModalCard}>
            <View style={styles.customModalHeader}>
              <Text style={styles.customModalTitle}>Select Custom Date Range</Text>
              <TouchableOpacity onPress={() => setCustomModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>From Date (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="2026-09-01"
              value={customFromDate}
              onChangeText={setCustomFromDate}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>To Date (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="2026-09-23"
              value={customToDate}
              onChangeText={setCustomToDate}
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetCustomDate}
                activeOpacity={0.7}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApplyCustomDate}
                activeOpacity={0.8}
              >
                <GradientView
                  colors={colors.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyBtnGradient}
                >
                  <Text style={styles.applyBtnText}>Apply</Text>
                </GradientView>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'space-between',
  },
  totalCard: {
    backgroundColor: '#EFF6FF',
    borderColor: 'rgba(59, 130, 246, 0.22)',
  },
  uniqueCard: {
    backgroundColor: '#F5F3FF',
    borderColor: 'rgba(124, 58, 237, 0.22)',
  },
  prospectCard: {
    backgroundColor: '#F0FDFA',
    borderColor: 'rgba(20, 184, 166, 0.22)',
  },
  junkCard: {
    backgroundColor: '#FFF7ED',
    borderColor: 'rgba(249, 115, 22, 0.22)',
  },
  notAttendedCard: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.22)',
  },
  missedCard: {
    backgroundColor: '#FFFBEB',
    borderColor: 'rgba(245, 158, 11, 0.22)',
  },
  outboundCard: {
    backgroundColor: '#EEF2FF',
    borderColor: 'rgba(99, 102, 241, 0.22)',
  },
  inboundCard: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(34, 197, 94, 0.22)',
  },
  talkTimeCard: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(168, 85, 247, 0.22)',
  },
  avgDurationCard: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(16, 185, 129, 0.22)',
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
    fontSize: 22,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  customModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  customModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  applyBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyBtnGradient: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
