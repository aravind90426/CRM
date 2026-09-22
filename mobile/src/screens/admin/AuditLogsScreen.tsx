import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { GradientView } from '../../components/common/GradientView';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { auditApi } from '../../api/auditApi';
import { AuditLog } from '../../types';

export const AuditLogsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string>('');

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await auditApi.getAuditLogs({
        entityName: entityFilter || undefined,
        size: 50,
      });
      setLogs(res.content || []);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs(true);
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return '#10b981';
      case 'UPDATE':
      case 'OUTCOME_CHANGE':
        return '#3b82f6';
      case 'DELETE':
        return '#ef4444';
      case 'ASSIGN':
      case 'REASSIGN':
        return '#f59e0b';
      case 'STATUS_CHANGE':
        return '#8b5cf6';
      default:
        return colors.textSecondary;
    }
  };

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

  const renderLogItem = ({ item }: { item: AuditLog }) => {
    const actionColor = getActionColor(item.action);

    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={styles.logLeft}>
            <View style={[styles.actionTag, { backgroundColor: `${actionColor}18`, borderColor: `${actionColor}40` }]}>
              <Text style={[styles.actionTagText, { color: actionColor }]}>
                {item.action}
              </Text>
            </View>
            <Text style={styles.entityText}>{item.entityName} #{item.entityId || ''}</Text>
          </View>
          <Text style={styles.timeText}>{formatTimestamp(item.createdAt)}</Text>
        </View>

        {item.details ? (
          <Text style={styles.detailsText} numberOfLines={2}>
            {item.details}
          </Text>
        ) : null}

        <View style={styles.userFooter}>
          <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.userNameText}>
            By: {item.userName || `User #${item.userId || 'System'}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title="System Audit Trail"
        subtitle="Immutable stream of record modifications"
        onBack={() => navigation.goBack()}
      />

      {/* Entity Filter Pills */}
      <View style={styles.filterRow}>
        {['', 'Lead', 'User', 'Call', 'Project', 'Sale'].map((ent) => {
          const isActive = entityFilter === ent;
          return (
            <TouchableOpacity
              key={ent}
              onPress={() => setEntityFilter(ent)}
              activeOpacity={0.7}
            >
              {isActive ? (
                <GradientView
                  colors={colors.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterPillActive}
                >
                  <Text style={styles.filterPillTextActive}>{ent || 'All Entities'}</Text>
                </GradientView>
              ) : (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{ent || 'All Entities'}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Loading audit history..." fullScreen />
      ) : logs.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No Audit Logs"
          message="No activity records match your current filter."
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLogItem}
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
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
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
  logCard: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  actionTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entityText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  detailsText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userNameText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
