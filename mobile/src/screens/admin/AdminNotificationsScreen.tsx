import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { IconTile } from '../../components/common/IconTile';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { notificationApi } from '../../api/notificationApi';
import { AdminNotification } from '../../types';

type FilterType = 'ALL' | 'PERMISSIONS' | 'ASSIGNMENTS' | 'SYSTEM';

export const AdminNotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await notificationApi.getAdminNotifications();
      setNotifications(data || []);
    } catch (err: any) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleReviewPermission = async (
    item: AdminNotification,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    if (!item.referenceId) return;

    const actionText = decision === 'APPROVED' ? 'approve' : 'reject';
    Alert.alert(
      `${decision === 'APPROVED' ? 'Approve' : 'Reject'} Request`,
      `Are you sure you want to ${actionText} Admin access for this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'APPROVED' ? 'Approve' : 'Reject',
          style: decision === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            setProcessingId(item.id);
            try {
              await notificationApi.reviewAccessRequest(
                item.referenceId!,
                decision,
                `Reviewed from Admin Notifications`
              );
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === item.id ? { ...n, status: decision, read: true } : n
                )
              );
              Alert.alert('Success', `Request has been ${decision.toLowerCase()}.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Unable to complete review.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PERMISSIONS') return item.type === 'PERMISSION_REQUEST';
    if (activeFilter === 'ASSIGNMENTS')
      return (
        item.type === 'LEAD_ASSIGNMENT' || item.type === 'LEAD_REASSIGNMENT'
      );
    if (activeFilter === 'SYSTEM')
      return (
        item.type === 'SYSTEM_EVENT' || item.type === 'PROJECT_EVENT'
      );
    return true;
  });

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PERMISSION_REQUEST':
        return { name: 'shield-checkmark', variant: 'orange' as const };
      case 'LEAD_ASSIGNMENT':
        return { name: 'person-add', variant: 'blue' as const };
      case 'LEAD_REASSIGNMENT':
        return { name: 'shuffle', variant: 'purple' as const };
      case 'PROJECT_EVENT':
        return { name: 'briefcase', variant: 'green' as const };
      default:
        return { name: 'notifications', variant: 'blue' as const };
    }
  };

  const renderItem = ({ item }: { item: AdminNotification }) => {
    const iconConfig = getNotificationIcon(item.type);
    const isPermission = item.type === 'PERMISSION_REQUEST';
    const isPending = item.status === 'PENDING';
    const isProcessing = processingId === item.id;

    return (
      <Card style={[styles.card, isPending && styles.cardPending]}>
        {/* Top Header: User & Request info */}
        <View style={styles.cardHeaderTop}>
          <View style={styles.cardHeaderLeft}>
            <IconTile
              name={iconConfig.name}
              variant={iconConfig.variant}
              size={36}
              iconSize={18}
            />
            <View style={styles.headerTitleCol}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text style={styles.timestamp}>
                  {formatTimestamp(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {isPermission && (
            <View
              style={[
                styles.statusBadge,
                item.status === 'APPROVED'
                  ? styles.statusApproved
                  : item.status === 'REJECTED'
                  ? styles.statusRejected
                  : styles.statusPending,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  item.status === 'APPROVED'
                    ? styles.statusTextApproved
                    : item.status === 'REJECTED'
                    ? styles.statusTextRejected
                    : styles.statusTextPending,
                ]}
              >
                {item.status || 'PENDING'}
              </Text>
            </View>
          )}
        </View>

        {/* Content with proper wrapping */}
        <View style={styles.messageBox}>
          <Text style={styles.message}>{item.message}</Text>
        </View>

        {/* Clean, separated action buttons at bottom */}
        {isPermission && isPending && (
          <View style={styles.actionsFooter}>
            {isProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.processingText}>Processing request...</Text>
              </View>
            ) : (
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReviewPermission(item, 'REJECTED')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleReviewPermission(item, 'APPROVED')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title="Admin Notifications"
        subtitle="Approvals, lead assignments & system alerts"
        onBack={() => navigation.goBack()}
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'PERMISSIONS', 'ASSIGNMENTS', 'SYSTEM'] as FilterType[]).map(
          (tab) => {
            const isActive = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {tab === 'ALL'
                    ? 'All'
                    : tab === 'PERMISSIONS'
                    ? 'Approvals'
                    : tab === 'ASSIGNMENTS'
                    ? 'Assignments'
                    : 'System'}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Loading notifications..." fullScreen />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="There are no alerts matching the selected category."
          icon="notifications-off-outline"
        />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardPending: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  messageBox: {
    marginTop: spacing.sm,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionsFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  processingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#d97706',
  },
  statusTextApproved: {
    color: '#10b981',
  },
  statusTextRejected: {
    color: '#ef4444',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
