import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { GradientView } from '../../components/common/GradientView';
import { salesApi } from '../../api/salesApi';
import { Sale, RootStackParamList } from '../../types';

export const ConvertedLeadsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await salesApi.getAllSales();
      setSales(data || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load converted leads.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales;
    const q = searchQuery.toLowerCase().trim();
    return sales.filter((s) => {
      const leadName = (s.leadName || '').toLowerCase();
      const phone = (s.leadPhone || '').toLowerCase();
      const project = (s.projectName || '').toLowerCase();
      const agent = (s.assignedAgentName || s.userName || '').toLowerCase();
      const id = String(s.leadId || s.id);
      return (
        leadName.includes(q) ||
        phone.includes(q) ||
        project.includes(q) ||
        agent.includes(q) ||
        id.includes(q)
      );
    });
  }, [sales, searchQuery]);

  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.dealValue) || 0), 0);
  }, [sales]);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoStr.slice(0, 16);
    }
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const renderItem = ({ item }: { item: Sale }) => {
    const agentName = item.assignedAgentName || item.userName || 'Assigned Agent';
    const agentInitial = (agentName[0] || 'A').toUpperCase();

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (item.leadId) {
            navigation.navigate('LeadDetails', {
              leadId: item.leadId,
              leadName: item.leadName,
            });
          }
        }}
      >
        <Card style={styles.card}>
          {/* Header Row: Lead Name + Status */}
          <View style={styles.cardHeader}>
            <View style={styles.leadInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.leadName}>{item.leadName || 'Converted Customer'}</Text>
                <View style={styles.idBadge}>
                  <Text style={styles.idText}>#{item.leadId || item.id}</Text>
                </View>
              </View>

              {item.projectName ? (
                <View style={styles.projectPill}>
                  <Ionicons name="folder-outline" size={12} color={colors.primary} />
                  <Text style={styles.projectText}>{item.projectName}</Text>
                </View>
              ) : null}
            </View>

            <Badge
              label={item.status || 'CONVERTED'}
              variant="success"
            />
          </View>

          {/* Contact & Deal Value Row */}
          <View style={styles.metricsRow}>
            {item.leadPhone ? (
              <TouchableOpacity
                style={styles.phoneBtn}
                onPress={() => handleCall(item.leadPhone)}
                activeOpacity={0.7}
              >
                <View style={styles.phoneIconCircle}>
                  <Ionicons name="call" size={13} color="#FFFFFF" />
                </View>
                <Text style={styles.phoneText}>{item.leadPhone}</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <View style={styles.dealContainer}>
              <Text style={styles.dealLabel}>Deal Value</Text>
              <Text style={styles.dealValue}>{formatCurrency(item.dealValue)}</Text>
            </View>
          </View>

          {/* Notes / Remarks */}
          {item.notes ? (
            <View style={styles.notesBox}>
              <Ionicons name="document-text-outline" size={13} color={colors.textMuted} style={styles.noteIcon} />
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          ) : null}

          {/* Footer: Agent & Converted Time */}
          <View style={styles.cardFooter}>
            <View style={styles.agentRow}>
              <View style={styles.agentAvatar}>
                <Text style={styles.agentInitial}>{agentInitial}</Text>
              </View>
              <View>
                <Text style={styles.agentLabel}>Converted by</Text>
                <Text style={styles.agentName}>{agentName}</Text>
              </View>
            </View>

            <View style={styles.timeCol}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={styles.timeText}>{formatDateTime(item.convertedAt || item.createdAt)}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title="Converted Leads"
        subtitle={`${sales.length} Closed Deals Won`}
        onBack={() => navigation.goBack()}
      />

      {/* KPI Stats Ribbon */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Converted</Text>
          <Text style={styles.kpiValue}>{sales.length}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Closed Value</Text>
          <Text style={[styles.kpiValue, { color: '#16A34A' }]}>{formatCurrency(totalRevenue)}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Avg Deal</Text>
          <Text style={styles.kpiValue}>
            {formatCurrency(sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0)}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, project, agent..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List Body */}
      {loading && !refreshing ? (
        <LoadingState message="Loading converted leads..." fullScreen />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadData()} fullScreen />
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={searchQuery ? 'No matching leads' : 'No converted leads yet'}
              description={
                searchQuery
                  ? 'Try refining your search keyword or clearing the filter.'
                  : 'Leads converted into sales by your team will appear here.'
              }
              icon="trophy-outline"
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
  kpiContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  searchWrapper: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.sm + 2,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs + 2,
  },
  leadInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 3,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  idBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  projectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  projectText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 6,
  },
  phoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  phoneIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  dealContainer: {
    alignItems: 'flex-end',
  },
  dealLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  dealValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  notesBox: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.xs + 2,
    marginTop: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    alignItems: 'flex-start',
  },
  noteIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs + 2,
    marginTop: spacing.xs + 2,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agentAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  agentLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '500',
  },
  agentName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
