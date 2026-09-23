import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Header } from '../../components/common/Header';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { callApi } from '../../api/callApi';
import { followUpApi } from '../../api/followUpApi';
import { Call, FollowUp } from '../../types';

type CallLogTab = 'HISTORY' | 'TODAY' | 'UPCOMING' | 'MISSED';

export const CallLogsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialTabParam = route.params?.initialTab;
  const initialTab: CallLogTab =
    initialTabParam === 'TODAY' || initialTabParam === 'UPCOMING' || initialTabParam === 'MISSED'
      ? initialTabParam
      : 'HISTORY';

  const [activeTab, setActiveTab] = useState<CallLogTab>(initialTab);
  const [customFilter, setCustomFilter] = useState<{
    status?: string;
    callDirection?: string;
    minDuration?: number;
    maxDuration?: number;
    startDate?: string;
    endDate?: string;
    filterTitle?: string;
  } | null>(
    route.params?.status || route.params?.filterTitle || route.params?.callDirection || route.params?.startDate
      ? {
          status: route.params?.status,
          callDirection: route.params?.callDirection,
          minDuration: route.params?.minDuration,
          maxDuration: route.params?.maxDuration,
          startDate: route.params?.startDate,
          endDate: route.params?.endDate,
          filterTitle: route.params?.filterTitle,
        }
      : null
  );

  const [calls, setCalls] = useState<Call[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      if (activeTab === 'UPCOMING') {
        const res = await followUpApi.getUpcomingFollowUps();
        setFollowUps(res);
      } else {
        let statusFilter = customFilter?.status;
        let directionFilter = customFilter?.callDirection;
        let startDate = customFilter?.startDate;
        let endDate = customFilter?.endDate;

        if (activeTab === 'TODAY') {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          const pad = (n: number) => n.toString().padStart(2, '0');
          startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T00:00:00`;
          endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T23:59:59`;
        } else if (activeTab === 'MISSED') {
          statusFilter = 'MISSED';
        }

        const res = await callApi.getCalls({
          status: statusFilter,
          startDate,
          endDate,
          size: 100,
        });

        let list = res.content || [];

        // Apply client-side filters if direction or duration thresholds are specified
        if (directionFilter) {
          list = list.filter((c) => (c.callDirection || 'OUTBOUND').toUpperCase() === directionFilter!.toUpperCase());
        }
        if (customFilter?.minDuration !== undefined) {
          list = list.filter((c) => (c.durationSeconds || 0) >= customFilter.minDuration!);
        }
        if (customFilter?.maxDuration !== undefined) {
          list = list.filter((c) => (c.durationSeconds || 0) <= customFilter.maxDuration!);
        }

        setCalls(list);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to fetch call logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, customFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleDirectCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleOpenLead = (leadId: number, leadName?: string) => {
    navigation.navigate('LeadDetails', { leadId, leadName });
  };

  const handleClearFilter = () => {
    setCustomFilter(null);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso.slice(0, 16);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <Header
        title="Call Logs"
        subtitle={customFilter?.filterTitle ? `Filtered by ${customFilter.filterTitle}` : "Call records & customer interactions"}
        onBack={() => navigation.goBack()}
      />

      {/* Custom Filter Active Banner */}
      {customFilter && (
        <View style={styles.filterBanner}>
          <View style={styles.filterBannerLeft}>
            <Ionicons name="funnel" size={14} color={colors.primary} />
            <Text style={styles.filterBannerText} numberOfLines={1}>
              {customFilter.filterTitle || `Status: ${customFilter.status || 'Active Filter'}`}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClearFilter} style={styles.clearFilterBtn}>
            <Text style={styles.clearFilterText}>Clear</Text>
            <Ionicons name="close-circle" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'HISTORY' && styles.tabActive]}
          onPress={() => {
            setActiveTab('HISTORY');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]} numberOfLines={1}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'TODAY' && styles.tabActive]}
          onPress={() => {
            setActiveTab('TODAY');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'TODAY' && styles.tabTextActive]} numberOfLines={1}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'UPCOMING' && styles.tabActive]}
          onPress={() => {
            setActiveTab('UPCOMING');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'UPCOMING' && styles.tabTextActive]} numberOfLines={1}>
            Follow-ups
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'MISSED' && styles.tabActive]}
          onPress={() => {
            setActiveTab('MISSED');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'MISSED' && styles.tabTextActive]} numberOfLines={1}>
            Missed
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Loading call records..." fullScreen />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadData()} fullScreen />
      ) : activeTab === 'UPCOMING' ? (
        <FlatList
          data={followUps}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <Card
              style={styles.logCard}
              onPress={() => handleOpenLead(item.leadId, item.leadName)}
            >
              <View style={styles.cardTop}>
                <View style={styles.leadHeaderLeft}>
                  <View style={[styles.iconBox, { backgroundColor: colors.warningLight }]}>
                    <Ionicons name="alarm-outline" size={18} color={colors.warning} />
                  </View>
                  <View>
                    <Text style={styles.leadName} numberOfLines={1}>
                      {item.leadName || `Lead #${item.leadId}`}
                    </Text>
                    <Text style={styles.scheduledTimeText}>
                      Scheduled: {formatDateTime(item.scheduledTime)}
                    </Text>
                  </View>
                </View>

                {item.leadPhone ? (
                  <TouchableOpacity
                    style={styles.quickCallBtn}
                    onPress={() => handleDirectCall(item.leadPhone)}
                  >
                    <Ionicons name="call" size={16} color="#ffffff" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {item.notes ? (
                <Text style={styles.notesText} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Badge label={item.status} status={item.status} />
                <View style={styles.viewDetailsLink}>
                  <Text style={styles.viewDetailsText}>View Lead</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No Upcoming Follow-ups"
              description="You have no scheduled follow-ups pending."
            />
          }
        />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const isMissed =
              item.callStatus === 'NOT_ATTENDED' ||
              item.callStatus === 'MISSED' ||
              item.callStatus === 'NO_ANSWER' ||
              item.callStatus === 'FAILED' ||
              item.durationSeconds === 0;
            const phone = item.leadPhone || (item as any).phoneNumber || '';
            const title = item.leadName || (item.leadId ? `Lead #${item.leadId}` : (phone || 'Call Record'));

            return (
              <Card
                style={styles.logCard}
                onPress={() => (item.leadId ? handleOpenLead(item.leadId, item.leadName) : undefined)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.leadHeaderLeft}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: !isMissed
                            ? colors.successLight
                            : 'rgba(239, 68, 68, 0.12)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={!isMissed ? 'call' : 'call-outline'}
                        size={18}
                        color={!isMissed ? colors.success : colors.danger}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leadName} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.phoneText}>
                        {phone || 'No Phone'} • {formatDateTime(item.createdAt || item.startedAt)}
                      </Text>
                    </View>
                  </View>

                  {phone ? (
                    <TouchableOpacity
                      style={styles.quickCallBtn}
                      onPress={() => handleDirectCall(phone)}
                    >
                      <Ionicons name="call" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.metaChipsRow}>
                  <Badge label={item.callStatus || (isMissed ? 'NOT_ATTENDED' : 'CONNECTED')} status={item.callStatus || (isMissed ? 'NOT_ATTENDED' : 'CONNECTED')} />
                  {item.projectName && (
                    <View style={styles.projectPill}>
                      <Text style={styles.projectPillText}>{item.projectName}</Text>
                    </View>
                  )}
                  {item.callDirection && (
                    <View style={styles.projectPill}>
                      <Text style={styles.projectPillText}>{item.callDirection}</Text>
                    </View>
                  )}
                  {item.durationSeconds !== undefined && item.durationSeconds > 0 ? (
                    <Text style={styles.durationPill}>
                      {`${item.durationSeconds}s`}
                    </Text>
                  ) : null}
                </View>

                {item.notes ? (
                  <Text style={styles.notesText} numberOfLines={2}>
                    {item.notes}
                  </Text>
                ) : null}
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="call-outline"
              title="No Call Records"
              description="No calls found for the selected period or filter."
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  filterBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  filterBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: spacing.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  logCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.sm + 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leadHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  phoneText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scheduledTimeText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
    marginTop: 1,
  },
  quickCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.callGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  projectPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.sm,
  },
  projectPillText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  durationPill: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  notesText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
