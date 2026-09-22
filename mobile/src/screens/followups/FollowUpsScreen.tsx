import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { followUpApi } from '../../api/followUpApi';
import { FollowUp } from '../../types';

type FollowUpTab = 'today' | 'upcoming' | 'overdue' | 'completed';

export const FollowUpsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialPeriod = (route.params?.period as FollowUpTab) || 'today';
  const [activeTab, setActiveTab] = useState<FollowUpTab>(initialPeriod);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFollowUps = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      let params: any = { size: 50 };
      if (activeTab === 'completed') {
        params.status = 'COMPLETED';
      } else {
        params.period = activeTab;
      }
      const res = await followUpApi.getFollowUps(params);
      setFollowUps(res.content || []);
    } catch (err: any) {
      console.warn('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowUps(true);
  };

  const handleMarkCompleted = async (fu: FollowUp) => {
    try {
      await followUpApi.toggleStatus(fu.id, 'COMPLETED');
      Alert.alert('Follow-up Completed', 'The callback was marked as completed.');
      fetchFollowUps(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to update follow-up status.');
    }
  };

  const handleQuickCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Number', 'No phone number is available for this lead.');
      return;
    }
    Linking.openURL(`tel:${phone.trim()}`);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderFollowUpItem = ({ item }: { item: FollowUp }) => {
    const isCompleted = item.status === 'COMPLETED';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{item.leadName || `Lead #${item.leadId}`}</Text>
            {item.leadPhone ? (
              <Text style={styles.leadPhone}>{item.leadPhone}</Text>
            ) : null}
          </View>
          <Badge label={item.status} status={item.status} />
        </View>

        <View style={styles.timeRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={activeTab === 'overdue' ? colors.danger : colors.info}
          />
          <Text
            style={[
              styles.timeText,
              activeTab === 'overdue' && { color: colors.danger, fontWeight: '700' },
            ]}
          >
            Scheduled: {formatDateTime(item.scheduledTime || item.followUpDate)}
          </Text>
        </View>

        {item.notes ? (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          {item.leadPhone ? (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => handleQuickCall(item.leadPhone)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={13} color="#ffffff" />
              <Text style={styles.callBtnText}>Call Customer</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.viewLeadBtn}
            onPress={() =>
              navigation.navigate('LeadDetails', {
                leadId: item.leadId,
                leadName: item.leadName,
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.viewLeadBtnText}>View Details</Text>
          </TouchableOpacity>

          {!isCompleted && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => handleMarkCompleted(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={14} color="#10b981" />
              <Text style={styles.completeBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <Header
        title="Follow-ups Console"
        subtitle="Customer callback promises, appointments & scheduled visits"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* Segmented Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={styles.tabsScroll}
      >
        {(
          [
            { id: 'today', label: 'Today', icon: 'today-outline' },
            { id: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
            { id: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
            { id: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
          ] as const
        ).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, activeTab === t.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={t.icon as any}
              size={13}
              color={activeTab === t.id ? '#ffffff' : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <LoadingState message="Loading scheduled follow-ups..." fullScreen />
      ) : followUps.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={`No ${activeTab.toUpperCase()} Follow-ups`}
          message={`You have no ${activeTab} scheduled callbacks at this time.`}
        />
      ) : (
        <FlatList
          data={followUps}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFollowUpItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
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
  tabsScroll: {
    flexGrow: 0,
    marginBottom: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  card: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  leadPhone: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  notesContainer: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.xs + 2,
    borderRadius: spacing.borderRadius.sm,
    marginTop: spacing.xs,
  },
  notesText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  viewLeadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewLeadBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  completeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
});
