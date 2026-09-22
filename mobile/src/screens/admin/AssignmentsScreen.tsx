import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { GradientView } from '../../components/common/GradientView';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { leadApi } from '../../api/leadApi';
import { usersApi } from '../../api/usersApi';
import { Lead, User } from '../../types';

export const AssignmentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { height: screenHeight } = useWindowDimensions();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterMode, setFilterMode] = useState<'ALL' | 'UNASSIGNED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reassignment Modal State
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Monitor keyboard visibility to dynamically adjust scrollable agent area
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Compute responsive maximum height for middle agent list:
  // Compact when keyboard is active, expansive when keyboard is hidden
  const maxAgentListHeight = keyboardVisible
    ? Math.max(80, Math.min(screenHeight * 0.2, 140))
    : Math.max(140, Math.min(screenHeight * 0.36, 280));

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [leadsRes, usersRes] = await Promise.all([
        leadApi.getLeads({ size: 100 }),
        usersApi.getUsers({ size: 100 }),
      ]);
      setLeads(leadsRes.content || []);
      setAgents((usersRes.content || []).filter((u) => u.status === 'ACTIVE'));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load assignments');
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

  const handleOpenReassign = (lead: Lead) => {
    setSelectedLead(lead);
    setSelectedAgentId(lead.currentOwner?.id || lead.assignedTo?.id || (agents[0]?.id ?? null));
    setReassignReason('');
    setReassignModalVisible(true);
  };

  const handleCloseReassign = () => {
    Keyboard.dismiss();
    setReassignModalVisible(false);
  };

  const handleConfirmReassign = async () => {
    if (!selectedLead || !selectedAgentId) {
      Alert.alert('Selection Required', 'Please select an agent to assign the lead to.');
      return;
    }

    setSubmitting(true);
    try {
      await leadApi.reassignLead(selectedLead.id, selectedAgentId, reassignReason.trim() || undefined);
      Alert.alert('Success', `Lead reassigned successfully.`);
      handleCloseReassign();
      loadData(true);
    } catch (err: any) {
      Alert.alert('Reassignment Failed', err.message || 'Unable to reassign lead.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery);

    const isAssigned = !!(l.currentOwner || l.assignedTo);
    if (filterMode === 'UNASSIGNED') {
      return matchesSearch && !isAssigned;
    }
    return matchesSearch;
  });

  const renderLeadCard = ({ item }: { item: Lead }) => {
    const ownerName = item.currentOwner?.name || item.assignedTo?.name;

    return (
      <Card style={styles.leadCard}>
        <View style={styles.leadCardTop}>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{item.name}</Text>
            <Text style={styles.leadPhone}>{item.phone}</Text>
            {item.project?.name && (
              <Text style={styles.projectText}>Project: {item.project.name}</Text>
            )}
          </View>
          <Badge label={item.status} status={item.status} />
        </View>

        <View style={styles.ownerRow}>
          <View style={styles.ownerBadge}>
            <Ionicons
              name={ownerName ? 'person-circle-outline' : 'alert-circle-outline'}
              size={15}
              color={ownerName ? colors.primary : colors.warning}
            />
            <Text style={styles.ownerText}>
              Owner: {ownerName || 'Unassigned'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reassignBtn}
            onPress={() => handleOpenReassign(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal" size={14} color="#ffffff" />
            <Text style={styles.reassignBtnText}>
              {ownerName ? 'Reassign' : 'Assign'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title="Lead Assignments"
        subtitle="Distribute & reassign leads across sales agents"
        onBack={() => navigation.goBack()}
      />

      {/* Filter Segment & Search Bar */}
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilterMode('ALL')}
            activeOpacity={0.7}
          >
            {filterMode === 'ALL' ? (
              <GradientView
                colors={colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterBtnActive}
              >
                <Text style={styles.filterTextActive}>
                  All Leads ({leads.length})
                </Text>
              </GradientView>
            ) : (
              <View style={styles.filterBtn}>
                <Text style={styles.filterText}>
                  All Leads ({leads.length})
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterMode('UNASSIGNED')}
            activeOpacity={0.7}
          >
            {filterMode === 'UNASSIGNED' ? (
              <GradientView
                colors={colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterBtnActive}
              >
                <Text style={styles.filterTextActive}>
                  Unassigned ({leads.filter((l) => !(l.currentOwner || l.assignedTo)).length})
                </Text>
              </GradientView>
            ) : (
              <View style={styles.filterBtn}>
                <Text style={styles.filterText}>
                  Unassigned ({leads.filter((l) => !(l.currentOwner || l.assignedTo)).length})
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Input
          placeholder="Search leads by name or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
        />
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Loading lead assignments..." fullScreen />
      ) : filteredLeads.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Leads Found"
          message={
            filterMode === 'UNASSIGNED'
              ? 'All leads are currently assigned to sales agents!'
              : 'No leads matched your search query.'
          }
        />
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!reassignModalVisible}
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

      {/* Reassign Lead Modal */}
      <Modal
        visible={reassignModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseReassign}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          {/* Backdrop click to dismiss */}
          <TouchableOpacity
            style={styles.modalBackdropTouchable}
            activeOpacity={1}
            onPress={handleCloseReassign}
          />

          <View
            style={[
              styles.modalCard,
              { maxHeight: Math.min(screenHeight * 0.88, 680) },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* 1. FIXED HEADER */}
            <View style={styles.modalFixedHeader}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reassign Lead</Text>
                <TouchableOpacity
                  onPress={handleCloseReassign}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {selectedLead && (
                <View style={styles.leadSummaryCard}>
                  <Text style={styles.leadSummaryName}>{selectedLead.name}</Text>
                  <Text style={styles.leadSummaryPhone}>{selectedLead.phone}</Text>
                  <Text style={styles.leadSummaryCurrent}>
                    Current Owner:{' '}
                    {selectedLead.currentOwner?.name || selectedLead.assignedTo?.name || 'Unassigned'}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>
                Select Target Sales Agent * {agents.length > 0 && `(${agents.length})`}
              </Text>
            </View>

            {/* 2. SCROLLABLE MIDDLE CONTENT AREA: Only sales agents scroll */}
            <View style={[styles.agentListWrapper, { maxHeight: maxAgentListHeight }]}>
              <ScrollView
                style={styles.agentScrollView}
                contentContainerStyle={styles.agentScrollContent}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {agents.map((ag) => (
                  <TouchableOpacity
                    key={ag.id}
                    style={[
                      styles.agentOption,
                      selectedAgentId === ag.id && styles.agentOptionActive,
                    ]}
                    onPress={() => setSelectedAgentId(ag.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={selectedAgentId === ag.id ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedAgentId === ag.id ? colors.primary : colors.textMuted}
                    />
                    <View style={styles.agentOptionInfo}>
                      <Text
                        style={[
                          styles.agentOptionName,
                          selectedAgentId === ag.id && styles.agentOptionNameActive,
                        ]}
                      >
                        {ag.name}
                      </Text>
                      <Text style={styles.agentOptionEmail}>{ag.email}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 3. FIXED FOOTER: Reason Input + Action Buttons */}
            <View style={styles.modalFixedFooter}>
              <Input
                label="Reassignment Reason (Optional)"
                placeholder="e.g. Workload balancing, language preference"
                value={reassignReason}
                onChangeText={setReassignReason}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={handleCloseReassign}
                  style={styles.modalActionBtn}
                />
                <Button
                  title="Assign Lead"
                  onPress={handleConfirmReassign}
                  loading={submitting}
                  style={styles.modalActionBtn}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  leadCard: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
  },
  leadCardTop: {
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
    fontSize: 12,
    color: colors.textSecondary,
  },
  projectText: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  reassignBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalBackdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalFixedHeader: {
    flexShrink: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  leadSummaryCard: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leadSummaryName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  leadSummaryPhone: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  leadSummaryCurrent: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  agentListWrapper: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  agentScrollView: {
    width: '100%',
  },
  agentScrollContent: {
    paddingVertical: 2,
  },
  agentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  agentOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  agentOptionInfo: {
    flex: 1,
  },
  agentOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  agentOptionNameActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  agentOptionEmail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  modalFixedFooter: {
    flexShrink: 0,
    paddingTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalActionBtn: {
    flex: 1,
  },
});
