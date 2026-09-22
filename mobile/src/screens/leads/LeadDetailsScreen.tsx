import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  AppState,
  AppStateStatus,
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
import { LogCallModal } from '../../components/leads/LogCallModal';
import { FollowUpModal } from '../../components/leads/FollowUpModal';
import { ConvertSaleModal } from '../../components/leads/ConvertSaleModal';
import { AddNoteModal } from '../../components/leads/AddNoteModal';
import { leadApi } from '../../api/leadApi';
import { callApi } from '../../api/callApi';
import { noteApi } from '../../api/noteApi';
import { followUpApi } from '../../api/followUpApi';
import { usersApi } from '../../api/usersApi';
import { useAuth } from '../../context/AuthContext';
import { LeadDetailResponse, Call, Note, FollowUp, User, LeadTimelineItem } from '../../types';

type DetailTab = 'OVERVIEW' | 'TIMELINE' | 'CALLS' | 'FOLLOWUPS' | 'NOTES' | 'ASSIGNMENTS' | 'CONVERSION';

export const LeadDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const leadId = route.params?.leadId;
  const { isAdmin, user } = useAuth();

  const [lead, setLead] = useState<LeadDetailResponse | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [timeline, setTimeline] = useState<LeadTimelineItem[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>('OVERVIEW');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [logCallVisible, setLogCallVisible] = useState(false);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [convertVisible, setConvertVisible] = useState(false);
  const [addNoteVisible, setAddNoteVisible] = useState(false);

  const activeCallRef = useRef<{
    telephonyCallId: string;
    leadId?: number;
    leadName?: string;
    phoneNumber: string;
    startTime: number;
  } | null>(null);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Call Classification Override Modal State
  const [overrideVisible, setOverrideVisible] = useState(false);
  const [overrideCall, setOverrideCall] = useState<Call | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [overrideNotes, setOverrideNotes] = useState<string>('');
  const [savingOverride, setSavingOverride] = useState(false);

  // Admin Reassign Modal
  const [reassignVisible, setReassignVisible] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // AppState listener for in-call return detection: Auto-wraps call without post-call popup
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        activeCallRef.current
      ) {
        const elapsed = Math.max(0, Math.round((Date.now() - activeCallRef.current.startTime) / 1000));
        const callData = activeCallRef.current;
        activeCallRef.current = null;

        // Immediately auto-wrap call to Spring Boot backend without any popup
        callApi.sendCallEvent({
          eventType: 'CALL_ENDED',
          telephonyCallId: callData.telephonyCallId,
          leadId: callData.leadId,
          customerPhone: callData.phoneNumber,
          durationSeconds: elapsed,
          technicalStatus: elapsed > 0 ? 'CONNECTED' : 'MISSED',
        }).catch((err) => console.warn('Call end event error:', err))
          .finally(() => {
            loadData(true);
          });
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [leadData, callsData, notesData, timelineData] = await Promise.all([
        leadApi.getLeadDetails(leadId),
        callApi.getCallsForLead(leadId).catch(() => []),
        noteApi.getNotes(leadId).catch(() => []),
        callApi.getLeadTimeline(leadId).catch(() => []),
      ]);
      setLead(leadData);
      setCalls(callsData || []);
      setNotes(notesData || []);
      setTimeline(timelineData || []);
      if (leadData.followUps && leadData.followUps.length > 0) {
        setFollowUps(leadData.followUps);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load lead details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadData();
    if (isAdmin) {
      usersApi.getActiveUsers().then((data) => {
        setAgents(data || []);
      }).catch(() => {});
    }
  }, [loadData, isAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleCallCustomer = () => {
    if (!lead?.phone) {
      Alert.alert('No Number', 'Customer does not have a valid phone number.');
      return;
    }
    const cleanPhone = lead.phone.trim();
    const telephonyCallId = 'mob-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    activeCallRef.current = {
      telephonyCallId,
      leadId: lead.id,
      leadName: lead.name,
      phoneNumber: cleanPhone,
      startTime: Date.now(),
    };

    // Dispatch automated CALL_INITIATED lifecycle event
    callApi.sendCallEvent({
      eventType: 'CALL_INITIATED',
      telephonyCallId,
      leadId: lead.id,
      customerPhone: cleanPhone,
    }).catch((err) => console.warn('Initiate call event failed:', err));

    const url = `tel:${cleanPhone}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        activeCallRef.current = null;
        Alert.alert('Dialer Unavailable', `Cannot dial ${cleanPhone} on this device.`);
      }
    });
  };

  const handleOpenOverride = (c: Call) => {
    setOverrideCall(c);
    setSelectedClassification(c.finalClassification || c.automaticClassification || c.businessOutcome || 'INTERESTED');
    setOverrideNotes(c.notes || '');
    setOverrideVisible(true);
  };

  const handleSaveOverride = async () => {
    if (!overrideCall || !selectedClassification) return;
    setSavingOverride(true);
    try {
      await callApi.updateCallClassification(overrideCall.id, selectedClassification, overrideNotes.trim() || undefined);
      setOverrideVisible(false);
      setOverrideCall(null);
      Alert.alert('Updated', 'Call classification updated successfully.');
      loadData(true);
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update call classification.');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleUpdateStatus = (newStatus: string) => {
    Alert.alert('Update Status', `Change lead status to ${newStatus}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            await leadApi.updateLeadStatus(leadId, newStatus);
            loadData(true);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleUpdateOutcome = (newOutcome: string) => {
    Alert.alert('Update Outcome', `Change business outcome to ${newOutcome}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            await leadApi.updateLeadOutcome(leadId, newOutcome);
            loadData(true);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleCompleteFollowUp = async (fuId: number) => {
    try {
      await followUpApi.toggleStatus(fuId, 'COMPLETED');
      Alert.alert('Success', 'Follow-up marked as completed');
      loadData(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update follow-up');
    }
  };

  const handleReassignSubmit = async () => {
    if (!selectedAgentId) {
      Alert.alert('Error', 'Please select an agent to assign this lead to.');
      return;
    }
    setReassigning(true);
    try {
      await leadApi.reassignLead(leadId, selectedAgentId, reassignReason.trim() || undefined);
      setReassignVisible(false);
      setSelectedAgentId(null);
      setReassignReason('');
      Alert.alert('Success', 'Lead successfully reassigned');
      loadData(true);
    } catch (e: any) {
      Alert.alert('Reassign Failed', e.message || 'Unable to reassign lead');
    } finally {
      setReassigning(false);
    }
  };

  const handleDeleteLead = () => {
    Alert.alert(
      'Delete Lead',
      `Are you sure you want to permanently delete lead "${lead?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await leadApi.deleteLead(leadId);
              Alert.alert('Deleted', 'Lead has been permanently deleted.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete lead');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <Header title="Lead Details" onBack={() => navigation.goBack()} />
        <LoadingState message="Loading complete lead profile..." fullScreen />
      </SafeAreaView>
    );
  }

  if (error || !lead) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <Header title="Lead Details" onBack={() => navigation.goBack()} />
        <ErrorState message={error || 'Lead not found'} onRetry={() => loadData()} fullScreen />
      </SafeAreaView>
    );
  }

  const assignedOwner = lead.currentOwner || lead.assignedTo;
  const assignments = lead.assignmentHistory || lead.assignments || [];
  const saleRecord = lead.sale;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <Header
        title={lead.name}
        subtitle={`#${lead.id} • ${lead.project?.name || 'CRM'}`}
        onBack={() => navigation.goBack()}
        rightAction={
          isAdmin ? (
            <TouchableOpacity onPress={handleDeleteLead} style={styles.headerDeleteBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          ) : undefined
        }
      />

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
        {/* Section 23: View Only Banner for Other Employees' Leads */}
        {!isAdmin && assignedOwner?.name && user?.name && assignedOwner.name !== user.name && (
          <View style={styles.viewOnlyBanner}>
            <Ionicons name="eye" size={16} color="#f59e0b" />
            <Text style={styles.viewOnlyBannerText}>
              VIEW ONLY: Lead assigned to {assignedOwner.name}. You cannot modify this record.
            </Text>
          </View>
        )}

        {/* Quick Action Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsBar}
          style={{ marginBottom: 12 }}
        >
          {/* Native Call Button */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.callGreen }]}
            onPress={handleCallCustomer}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={15} color="#ffffff" />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>

          {/* Log Call */}
          {(!assignedOwner?.name || isAdmin || assignedOwner.name === user?.name) && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => setLogCallVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text" size={15} color="#ffffff" />
              <Text style={styles.actionBtnText}>Log Call</Text>
            </TouchableOpacity>
          )}

          {/* Follow-up */}
          {(!assignedOwner?.name || isAdmin || assignedOwner.name === user?.name) && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.warning }]}
              onPress={() => setFollowUpVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar" size={15} color="#ffffff" />
              <Text style={styles.actionBtnText}>Follow-up</Text>
            </TouchableOpacity>
          )}

          {/* Section 21: CONVERT TO SALES with Confirmation Dialog */}
          {(!assignedOwner?.name || isAdmin || assignedOwner.name === user?.name) &&
            lead.status !== 'CONVERTED' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                onPress={() => {
                  Alert.alert(
                    'Convert to Sale',
                    `Convert lead "${lead.name}" to Sale?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Proceed', onPress: () => setConvertVisible(true) },
                    ]
                  );
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="trophy" size={15} color="#ffffff" />
                <Text style={styles.actionBtnText}>Convert to Sales</Text>
              </TouchableOpacity>
            )}

          {isAdmin && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              onPress={() => {
                setSelectedAgentId(assignedOwner?.id || null);
                setReassignVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-horizontal" size={15} color="#ffffff" />
              <Text style={styles.actionBtnText}>Reassign</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Scrollable Section Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContainer}
          style={styles.tabsScroll}
        >
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.tabItemActive]}
            onPress={() => setActiveTab('OVERVIEW')}
          >
            <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'TIMELINE' && styles.tabItemActive]}
            onPress={() => setActiveTab('TIMELINE')}
          >
            <Text style={[styles.tabText, activeTab === 'TIMELINE' && styles.tabTextActive]}>
              Timeline ({timeline.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'CALLS' && styles.tabItemActive]}
            onPress={() => setActiveTab('CALLS')}
          >
            <Text style={[styles.tabText, activeTab === 'CALLS' && styles.tabTextActive]}>
              Calls ({calls.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'FOLLOWUPS' && styles.tabItemActive]}
            onPress={() => setActiveTab('FOLLOWUPS')}
          >
            <Text style={[styles.tabText, activeTab === 'FOLLOWUPS' && styles.tabTextActive]}>
              Follow-ups ({followUps.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'NOTES' && styles.tabItemActive]}
            onPress={() => setActiveTab('NOTES')}
          >
            <Text style={[styles.tabText, activeTab === 'NOTES' && styles.tabTextActive]}>
              Notes ({notes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'ASSIGNMENTS' && styles.tabItemActive]}
            onPress={() => setActiveTab('ASSIGNMENTS')}
          >
            <Text style={[styles.tabText, activeTab === 'ASSIGNMENTS' && styles.tabTextActive]}>
              Assignments ({assignments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'CONVERSION' && styles.tabItemActive]}
            onPress={() => setActiveTab('CONVERSION')}
          >
            <Text style={[styles.tabText, activeTab === 'CONVERSION' && styles.tabTextActive]}>
              Sale / Deal
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <View>
            {/* Status & Outcome Card */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardHeader}>Status & Business Outcome</Text>
              <View style={styles.statusRow}>
                <View>
                  <Text style={styles.metaLabel}>Current Status</Text>
                  <Badge label={lead.status} status={lead.status} style={styles.badgeMargin} />
                </View>
                <View>
                  <Text style={styles.metaLabel}>Business Outcome</Text>
                  <Badge
                    label={lead.businessOutcome || 'None'}
                    status={lead.businessOutcome || 'neutral'}
                    style={styles.badgeMargin}
                  />
                </View>
              </View>

              {/* Status change chips */}
              <Text style={styles.subLabel}>Quick Change Status</Text>
              <View style={styles.chipsContainer}>
                {['NEW', 'CONTACTED', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'CLOSED'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.smallChip, lead.status === st && styles.smallChipSelected]}
                    onPress={() => handleUpdateStatus(st)}
                  >
                    <Text style={[styles.smallChipText, lead.status === st && styles.smallChipTextSelected]}>
                      {st.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Outcome change chips */}
              <Text style={styles.subLabel}>Quick Change Outcome</Text>
              <View style={styles.chipsContainer}>
                {['INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'WRONG_NUMBER', 'JUNK'].map((oc) => (
                  <TouchableOpacity
                    key={oc}
                    style={[styles.smallChip, lead.businessOutcome === oc && styles.smallChipSelected]}
                    onPress={() => handleUpdateOutcome(oc)}
                  >
                    <Text style={[styles.smallChipText, lead.businessOutcome === oc && styles.smallChipTextSelected]}>
                      {oc.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Contact Information Card */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardHeader}>Contact Information</Text>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{lead.name}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{lead.phone}</Text>
                </View>
                <TouchableOpacity onPress={handleCallCustomer} style={styles.inlineActionBtn}>
                  <Ionicons name="call" size={16} color={colors.callGreen} />
                </TouchableOpacity>
              </View>

              {lead.email ? (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{lead.email}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`mailto:${lead.email}`)}
                    style={styles.inlineActionBtn}
                  >
                    <Ionicons name="mail" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {(lead.city || lead.state || lead.address) && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Location / Address</Text>
                    <Text style={styles.infoValue}>
                      {[lead.address, lead.city, lead.state].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              {lead.source ? (
                <View style={styles.infoRow}>
                  <Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Lead Source</Text>
                    <Text style={styles.infoValue}>{lead.source}</Text>
                  </View>
                </View>
              ) : null}
            </Card>

            {/* Call Lifecycle & Engagement Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeader}>Call & Engagement Metrics</Text>
                <TouchableOpacity onPress={handleCallCustomer} style={styles.quickCallMiniBtn} activeOpacity={0.8}>
                  <Ionicons name="call" size={12} color="#ffffff" />
                  <Text style={styles.quickCallMiniText}>Call Now</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{lead.totalCallCount ?? calls.length}</Text>
                  <Text style={styles.metricLbl}>Total Calls</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: colors.success }]}>{lead.connectedCallCount ?? 0}</Text>
                  <Text style={styles.metricLbl}>Connected</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: colors.warning }]}>{lead.shortCallCount ?? 0}</Text>
                  <Text style={styles.metricLbl}>Short (&lt;60s)</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: colors.danger }]}>
                    {(lead.missedCallCount ?? 0) + (lead.rejectedCallCount ?? 0) + (lead.failedCallCount ?? 0)}
                  </Text>
                  <Text style={styles.metricLbl}>Missed/Fail</Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Last Contacted</Text>
                  <Text style={styles.infoValue}>
                    {lead.lastContactedAt
                      ? new Date(lead.lastContactedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Not contacted yet'}
                  </Text>
                </View>
                {lead.lastCallStatus && (
                  <Badge label={lead.lastCallStatus} status={lead.lastCallStatus} />
                )}
              </View>

              {lead.followUpRequired && (
                <View style={[styles.infoRow, { borderBottomWidth: 0, paddingTop: 4 }]}>
                  <Ionicons name="calendar-outline" size={16} color={colors.warning} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Next Follow-up</Text>
                    <Text style={[styles.infoValue, { color: colors.warning }]}>
                      {lead.nextFollowUpAt
                        ? new Date(lead.nextFollowUpAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                        : 'Action Required'}
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            {/* Project & Assignment Card */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardHeader}>Project & Assignment</Text>

              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Project Campaign</Text>
                  <Text style={styles.infoValue}>{lead.project?.name || 'CRM Lead'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Assigned Agent</Text>
                  <Text style={styles.infoValue}>{assignedOwner?.name || 'Unassigned'}</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.inlineChangeBtn}
                    onPress={() => {
                      setSelectedAgentId(assignedOwner?.id || null);
                      setReassignVisible(true);
                    }}
                  >
                    <Text style={styles.inlineChangeText}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>

              {lead.createdAt && (
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Created On</Text>
                    <Text style={styles.infoValue}>
                      {new Date(lead.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                  </View>
                </View>
              )}

              {lead.additionalInfo ? (
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Additional Info</Text>
                    <Text style={styles.infoValue}>{lead.additionalInfo}</Text>
                  </View>
                </View>
              ) : null}
            </Card>
          </View>
        )}

        {/* TAB: TIMELINE */}
        {activeTab === 'TIMELINE' && (
          <View>
            <View style={styles.tabActionsRow}>
              <Text style={styles.tabSectionTitle}>Customer Lifecycle Timeline</Text>
              <TouchableOpacity
                style={styles.tabAddButton}
                onPress={() => loadData(true)}
              >
                <Ionicons name="refresh" size={14} color={colors.primary} />
                <Text style={styles.tabAddText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {timeline.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="git-commit-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No lifecycle events recorded for this lead yet.</Text>
              </Card>
            ) : (
              timeline.map((item, idx) => (
                <Card key={idx} style={styles.timelineCard}>
                  <View style={styles.timelineHeader}>
                    <View style={styles.timelineTypeRow}>
                      <View style={[
                        styles.timelineIconBadge,
                        item.type === 'CALL' ? { backgroundColor: colors.callGreen + '20' } :
                        item.type === 'FOLLOW_UP' ? { backgroundColor: colors.warning + '20' } :
                        item.type === 'NOTE' ? { backgroundColor: colors.primary + '20' } :
                        { backgroundColor: colors.secondary + '20' }
                      ]}>
                        <Ionicons
                          name={
                            item.type === 'CALL' ? 'call' :
                            item.type === 'FOLLOW_UP' ? 'calendar' :
                            item.type === 'NOTE' ? 'document-text' : 'swap-horizontal'
                          }
                          size={14}
                          color={
                            item.type === 'CALL' ? colors.callGreen :
                            item.type === 'FOLLOW_UP' ? colors.warning :
                            item.type === 'NOTE' ? colors.primary : colors.secondary
                          }
                        />
                      </View>
                      <Text style={styles.timelineTitle}>{item.title}</Text>
                    </View>

                    <Text style={styles.timelineTime}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </Text>
                  </View>

                  {/* Metadata Chips / Badges */}
                  <View style={styles.timelineBadgesRow}>
                    {item.technicalStatus && (
                      <Badge label={item.technicalStatus} status={item.technicalStatus} />
                    )}
                    {item.businessClassification && (
                      <Badge label={item.businessClassification} status={item.businessClassification} />
                    )}
                    {item.durationSeconds !== undefined && item.durationSeconds !== null && item.durationSeconds > 0 && (
                      <Text style={styles.timelineDurationBadge}>
                        ⏱️ {item.durationSeconds}s
                      </Text>
                    )}
                    {item.callDirection && (
                      <Text style={styles.timelineDirectionBadge}>
                        {item.callDirection === 'INBOUND' ? '📥 Inbound' : '📤 Outbound'}
                      </Text>
                    )}
                    {item.classificationChangedManually && (
                      <View style={styles.manualBadge}>
                        <Ionicons name="pencil" size={10} color="#8b5cf6" />
                        <Text style={styles.manualBadgeText}>Manual Override</Text>
                      </View>
                    )}
                  </View>

                  {item.notes ? (
                    <Text style={styles.timelineNotes}>"{item.notes}"</Text>
                  ) : null}

                  {item.userName && (
                    <Text style={styles.timelineAgent}>Logged by {item.userName}</Text>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* TAB 2: CALL HISTORY */}
        {activeTab === 'CALLS' && (
          <View>
            <View style={styles.tabActionsRow}>
              <Text style={styles.tabSectionTitle}>Call History</Text>
              <TouchableOpacity
                style={styles.tabAddButton}
                onPress={() => setLogCallVisible(true)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.tabAddText}>Log Call</Text>
              </TouchableOpacity>
            </View>

            {calls.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="call-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No calls logged for this lead yet.</Text>
              </Card>
            ) : (
              calls.map((c) => {
                const isMissed =
                  c.callStatus === 'NOT_ATTENDED' ||
                  c.callStatus === 'MISSED' ||
                  c.callStatus === 'NO_ANSWER' ||
                  c.callStatus === 'FAILED';
                const isIncoming = c.callDirection === 'INBOUND';
                const duration = c.durationSeconds || 0;
                const formattedDuration = duration > 0 && !isMissed
                  ? (duration >= 60
                      ? `${Math.floor(duration / 60)}m ${duration % 60}s`
                      : `${duration}s`)
                  : '';

                return (
                  <Card key={c.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyHeaderLeft}>
                        <Badge
                          label={c.callStatus || (isMissed ? 'NOT_ATTENDED' : 'ACCEPTANCE')}
                          status={c.callStatus || (isMissed ? 'NOT_ATTENDED' : 'ACCEPTANCE')}
                        />
                        <Text style={[styles.historyDate, { marginLeft: 8 }]}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : 'Recent'}
                        </Text>
                      </View>
                      <Text style={styles.callDirectionLabel}>
                        {isIncoming ? '📥 Incoming' : '📤 Outgoing'}
                      </Text>
                    </View>

                    <View style={styles.historyMetaRow}>
                      {formattedDuration ? (
                        <Text style={styles.historyDuration}>Duration: {formattedDuration}</Text>
                      ) : null}
                      {c.userName && <Text style={styles.historyAgent}>• Caller: {c.userName}</Text>}
                      {c.classificationChangedManually && (
                        <View style={styles.manualBadge}>
                          <Ionicons name="pencil" size={10} color="#8b5cf6" />
                          <Text style={styles.manualBadgeText}>Manual</Text>
                        </View>
                      )}
                    </View>

                    {c.followUpDate && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="calendar-outline" size={12} color={colors.warning} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 12, color: colors.warning, fontWeight: '500' }}>
                          Follow-up: {new Date(c.followUpDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}

                    {c.notes ? <Text style={styles.historyNotes}>"{c.notes}"</Text> : null}
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: FOLLOW-UPS */}
        {activeTab === 'FOLLOWUPS' && (
          <View>
            <View style={styles.tabActionsRow}>
              <Text style={styles.tabSectionTitle}>Scheduled Follow-ups</Text>
              <TouchableOpacity
                style={styles.tabAddButton}
                onPress={() => setFollowUpVisible(true)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.tabAddText}>Schedule</Text>
              </TouchableOpacity>
            </View>

            {followUps.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No follow-ups scheduled for this lead.</Text>
              </Card>
            ) : (
              followUps.map((fu) => (
                <Card key={fu.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyHeaderLeft}>
                      <Ionicons
                        name={fu.status === 'COMPLETED' ? 'checkmark-circle' : 'time-outline'}
                        size={18}
                        color={fu.status === 'COMPLETED' ? colors.success : colors.warning}
                      />
                      <Text style={styles.historyDate}>
                        {fu.scheduledTime ? new Date(fu.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending'}
                      </Text>
                    </View>
                    <Badge label={fu.status} status={fu.status} />
                  </View>

                  {fu.notes ? <Text style={styles.historyNotes}>{fu.notes}</Text> : null}

                  {fu.status === 'PENDING' && (
                    <View style={styles.followUpActionRow}>
                      <TouchableOpacity
                        style={styles.completeFuBtn}
                        onPress={() => handleCompleteFollowUp(fu.id)}
                      >
                        <Ionicons name="checkmark-done" size={14} color="#ffffff" />
                        <Text style={styles.completeFuBtnText}>Mark as Done</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* TAB 4: NOTES */}
        {activeTab === 'NOTES' && (
          <View>
            <View style={styles.tabActionsRow}>
              <Text style={styles.tabSectionTitle}>Internal Notes</Text>
              <TouchableOpacity
                style={styles.tabAddButton}
                onPress={() => setAddNoteVisible(true)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.tabAddText}>Add Note</Text>
              </TouchableOpacity>
            </View>

            {notes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No notes added for this lead yet.</Text>
              </Card>
            ) : (
              notes.map((n) => (
                <Card key={n.id} style={styles.noteCard}>
                  <Text style={styles.noteContent}>{n.content}</Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteAuthor}>{n.userName || 'Agent'}</Text>
                    <Text style={styles.noteDate}>
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* TAB 5: ASSIGNMENTS (Full Audit History) */}
        {activeTab === 'ASSIGNMENTS' && (
          <View>
            <View style={styles.tabActionsRow}>
              <Text style={styles.tabSectionTitle}>Assignment Trail</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.tabAddButton}
                  onPress={() => {
                    setSelectedAgentId(assignedOwner?.id || null);
                    setReassignVisible(true);
                  }}
                >
                  <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                  <Text style={styles.tabAddText}>Reassign</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Current Active Owner Card */}
            <Card style={styles.currentOwnerCard}>
              <View style={styles.currentOwnerHeader}>
                <Ionicons name="person-circle" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.currentOwnerTitle}>Current Lead Owner</Text>
                  <Text style={styles.currentOwnerName}>{assignedOwner?.name || 'Unassigned'}</Text>
                  {assignedOwner?.email && (
                    <Text style={styles.currentOwnerEmail}>{assignedOwner.email}</Text>
                  )}
                </View>
                <Badge label="ACTIVE" status="ACTIVE" />
              </View>
            </Card>

            {/* Assignment History Log */}
            {assignments.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="time-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No previous reassignment records found.</Text>
              </Card>
            ) : (
              assignments.map((item, idx) => (
                <Card key={item.id || idx} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeader}>
                    <Text style={styles.assignmentAgent}>
                      {item.userName || item.assignedTo?.name || 'Assigned Agent'}
                    </Text>
                    <Badge
                      label={item.isActive ? 'CURRENT' : 'PREVIOUS'}
                      status={item.isActive ? 'ACTIVE' : 'INACTIVE'}
                    />
                  </View>

                  <View style={styles.assignmentMetaRow}>
                    <Text style={styles.assignmentMetaLabel}>Assigned By:</Text>
                    <Text style={styles.assignmentMetaVal}>
                      {item.assignedByName || item.assignedBy?.name || 'System Admin'}
                    </Text>
                  </View>

                  <View style={styles.assignmentMetaRow}>
                    <Text style={styles.assignmentMetaLabel}>Assigned At:</Text>
                    <Text style={styles.assignmentMetaVal}>
                      {item.assignedAt ? new Date(item.assignedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                    </Text>
                  </View>

                  {item.unassignedAt && (
                    <View style={styles.assignmentMetaRow}>
                      <Text style={styles.assignmentMetaLabel}>Unassigned At:</Text>
                      <Text style={styles.assignmentMetaVal}>
                        {new Date(item.unassignedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </Text>
                    </View>
                  )}

                  {item.reason && (
                    <View style={styles.assignmentReasonBox}>
                      <Text style={styles.assignmentReasonLabel}>Reason:</Text>
                      <Text style={styles.assignmentReasonText}>{item.reason}</Text>
                    </View>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* TAB 6: SALE / CONVERSION */}
        {activeTab === 'CONVERSION' && (
          <View>
            <View style={styles.tabActionsRow}>
              <Text style={styles.tabSectionTitle}>Conversion & Deal Info</Text>
            </View>

            {saleRecord || lead.status === 'CONVERTED' ? (
              <Card style={styles.saleSuccessCard}>
                <View style={styles.saleBadgeRow}>
                  <Ionicons name="trophy" size={28} color="#f59e0b" />
                  <Badge label="CONVERTED" status="CONVERTED" />
                </View>

                <Text style={styles.dealValueLabel}>Total Deal Value</Text>
                <Text style={styles.dealValueText}>
                  ₹{(saleRecord?.dealValue ?? 0).toLocaleString()}
                </Text>

                {saleRecord?.userName && (
                  <View style={styles.saleInfoRow}>
                    <Text style={styles.saleInfoLabel}>Converted By Agent:</Text>
                    <Text style={styles.saleInfoValue}>{saleRecord.userName}</Text>
                  </View>
                )}

                {saleRecord?.convertedAt && (
                  <View style={styles.saleInfoRow}>
                    <Text style={styles.saleInfoLabel}>Conversion Date:</Text>
                    <Text style={styles.saleInfoValue}>
                      {new Date(saleRecord.convertedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                  </View>
                )}

                {saleRecord?.notes && (
                  <View style={styles.saleNotesBox}>
                    <Text style={styles.saleInfoLabel}>Sale Notes:</Text>
                    <Text style={styles.saleNotesText}>{saleRecord.notes}</Text>
                  </View>
                )}
              </Card>
            ) : (
              <Card style={styles.notConvertedCard}>
                <Ionicons name="cart-outline" size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.notConvertedTitle}>Lead Not Converted Yet</Text>
                <Text style={styles.notConvertedDesc}>
                  Once you finalize the deal with this customer, record the sale deal value and notes here.
                </Text>
                <TouchableOpacity
                  style={styles.convertCtaBtn}
                  onPress={() => setConvertVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text style={styles.convertCtaBtnText}>Convert to Sale Now</Text>
                </TouchableOpacity>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Admin Reassign Modal */}
      <Modal
        visible={reassignVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReassignVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Lead</Text>
              <TouchableOpacity onPress={() => setReassignVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Select an active agent to take ownership of {lead.name}:
            </Text>

            <ScrollView style={[styles.agentsSelectScroll, { maxHeight: 180 }]}>
              {agents.map((ag) => (
                <TouchableOpacity
                  key={ag.id}
                  style={[
                    styles.agentSelectRow,
                    selectedAgentId === ag.id && styles.agentSelectRowActive,
                  ]}
                  onPress={() => setSelectedAgentId(ag.id)}
                >
                  <View style={styles.agentAvatar}>
                    <Text style={styles.agentAvatarText}>{ag.name?.charAt(0) || 'U'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.agentSelectName}>{ag.name}</Text>
                    <Text style={styles.agentSelectRole}>{ag.role} • {ag.email}</Text>
                  </View>
                  {selectedAgentId === ag.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.modalDesc, { marginTop: 12 }]}>Reason for reassignment (optional):</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Workload balancing, specialized product demo..."
              placeholderTextColor={colors.textMuted}
              value={reassignReason}
              onChangeText={setReassignReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setReassignVisible(false)}
                disabled={reassigning}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalBtn}
                onPress={handleReassignSubmit}
                disabled={reassigning}
              >
                {reassigning ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmModalBtnText}>Confirm Reassign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Standard Modals */}
      <LogCallModal
        visible={logCallVisible}
        leadId={lead.id}
        leadName={lead.name}
        leadPhone={lead.phone}
        onClose={() => setLogCallVisible(false)}
        onCallLogged={() => loadData(true)}
      />

      <FollowUpModal
        visible={followUpVisible}
        leadId={lead.id}
        leadName={lead.name}
        onClose={() => setFollowUpVisible(false)}
        onScheduled={() => loadData(true)}
      />

      <ConvertSaleModal
        visible={convertVisible}
        leadId={lead.id}
        leadName={lead.name}
        onClose={() => setConvertVisible(false)}
        onConverted={() => loadData(true)}
      />

      <AddNoteModal
        visible={addNoteVisible}
        leadId={lead.id}
        leadName={lead.name}
        onClose={() => setAddNoteVisible(false)}
        onNoteAdded={() => loadData(true)}
      />

      {/* Manual Classification Override Modal */}
      <Modal
        visible={overrideVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOverrideVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Call Outcome</Text>
              <TouchableOpacity onPress={() => setOverrideVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Select the correct business outcome for this call:
            </Text>

            <View style={styles.classificationGrid}>
              {[
                { id: 'INTERESTED', label: 'Interested', color: '#10b981' },
                { id: 'FOLLOW_UP', label: 'Follow-up Needed', color: '#f59e0b' },
                { id: 'NOT_INTERESTED', label: 'Not Interested', color: '#ef4444' },
                { id: 'WRONG_NUMBER', label: 'Wrong Number', color: '#6b7280' },
                { id: 'JUNK', label: 'Junk / Spam', color: '#64748b' },
                { id: 'SALE', label: 'Sale Closed', color: '#8b5cf6' },
              ].map((cls) => {
                const isSelected = selectedClassification === cls.id;
                return (
                  <TouchableOpacity
                    key={cls.id}
                    style={[
                      styles.classificationOption,
                      isSelected && { borderColor: cls.color, backgroundColor: cls.color + '15' },
                    ]}
                    onPress={() => setSelectedClassification(cls.id)}
                  >
                    <View style={[styles.colorDot, { backgroundColor: cls.color }]} />
                    <Text
                      style={[
                        styles.classificationOptionText,
                        isSelected && { color: cls.color, fontWeight: '700' },
                      ]}
                    >
                      {cls.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalDesc, { marginTop: 12 }]}>Override notes / reason (optional):</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Customer requested callback..."
              placeholderTextColor={colors.textMuted}
              value={overrideNotes}
              onChangeText={setOverrideNotes}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setOverrideVisible(false)}
                disabled={savingOverride}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalBtn}
                onPress={handleSaveOverride}
                disabled={savingOverride}
              >
                {savingOverride ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmModalBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* End of Lead Details */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: spacing.xxl,
  },
  headerDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceHighlight,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: spacing.borderRadius.md,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsScroll: {
    marginBottom: 12,
  },
  tabsScrollContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tabItem: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sectionCard: {
    padding: 12,
    backgroundColor: colors.surfaceCard,
    marginBottom: 10,
    borderRadius: 12,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  badgeMargin: {
    marginTop: 2,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  smallChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  smallChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  smallChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoCol: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 1,
  },
  inlineActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.surfaceHighlight,
  },
  inlineChangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  inlineChangeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  tabActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tabAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: spacing.borderRadius.sm,
  },
  tabAddText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  historyCard: {
    padding: 12,
    backgroundColor: colors.surfaceCard,
    marginBottom: 8,
    borderRadius: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  historyDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyAgent: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  historyNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  followUpActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  completeFuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  completeFuBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  noteCard: {
    padding: 12,
    backgroundColor: colors.surfaceCard,
    marginBottom: 8,
    borderRadius: 10,
  },
  noteContent: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  noteAuthor: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  noteDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  currentOwnerCard: {
    padding: 12,
    backgroundColor: colors.surfaceCard,
    marginBottom: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  currentOwnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentOwnerTitle: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  currentOwnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  currentOwnerEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  assignmentCard: {
    padding: 12,
    backgroundColor: colors.surfaceCard,
    marginBottom: 8,
    borderRadius: 10,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  assignmentAgent: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  assignmentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  assignmentMetaLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  assignmentMetaVal: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  assignmentReasonBox: {
    marginTop: 6,
    padding: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
  },
  assignmentReasonLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  assignmentReasonText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saleSuccessCard: {
    padding: 16,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    alignItems: 'center',
  },
  saleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dealValueLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealValueText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.success,
    marginBottom: 16,
  },
  saleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  saleInfoLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  saleInfoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saleNotesBox: {
    width: '100%',
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
  },
  saleNotesText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notConvertedCard: {
    padding: 24,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    alignItems: 'center',
  },
  notConvertedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  notConvertedDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  convertCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: spacing.borderRadius.md,
  },
  convertCtaBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalDialog: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  agentsSelectScroll: {
    marginVertical: 4,
  },
  agentSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  agentSelectRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  agentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  agentSelectName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  agentSelectRole: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelModalBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmModalBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  confirmModalBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quickCallMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.callGreen,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  quickCallMiniText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLbl: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  timelineCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timelineTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  timelineIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  timelineTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  timelineBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  timelineDurationBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineDirectionBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  timelineAgent: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  manualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#8b5cf620',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  callCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callDirectionLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  overrideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overrideBtnText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  classificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  classificationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  classificationOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  viewOnlyBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
    flex: 1,
  },
});
