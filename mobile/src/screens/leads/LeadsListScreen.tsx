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
  Platform,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { LogCallModal } from '../../components/leads/LogCallModal';
import { useAuth } from '../../context/AuthContext';
import { leadApi } from '../../api/leadApi';
import { projectsApi } from '../../api/projectsApi';
import { usersApi } from '../../api/usersApi';
import { Lead, Project, User } from '../../types';

const STATUS_FILTERS = ['ALL', 'NEW', 'CONTACTED', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'CLOSED'];

export const LeadsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isAdmin, user } = useAuth();
  const isMyLeadsMode = route.params?.mode === 'MY_LEADS';

  const [projectId, setProjectId] = useState<number | undefined>(route.params?.projectId);
  const [projectName, setProjectName] = useState<string>(route.params?.projectName || 'All Leads');

  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Project Bottom Sheet Modal
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  // Status Counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: leads.length };
    leads.forEach((l) => {
      if (l.status) {
        counts[l.status] = (counts[l.status] || 0) + 1;
      }
    });
    return counts;
  }, [leads]);

  // Add Lead Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadCity, setNewLeadCity] = useState('');
  const [newLeadProject, setNewLeadProject] = useState<number | null>(null);
  const [newLeadAgent, setNewLeadAgent] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Log Call Modal
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);

  useEffect(() => {
    projectsApi.getProjects().then((projs) => {
      setProjects(projs);
      if (projs.length > 0 && !projectId && route.params?.projectId) {
        setProjectId(route.params.projectId);
      }
    }).catch(console.warn);

    if (isAdmin) {
      usersApi.getUsers({ size: 100 }).then((res) => {
        setAgents((res.content || []).filter((u) => u.status === 'ACTIVE'));
      }).catch(console.warn);
    }
  }, [isAdmin]);

  const fetchLeads = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const res = await leadApi.getLeads({
          projectId: projectId,
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          search: searchQuery.trim() || undefined,
          size: 50,
        });
        setLeads(res.content || []);
      } catch (err: any) {
        console.warn('Failed to fetch leads:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId, selectedStatus, searchQuery]
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads(true);
  };

  const handleOpenAddLead = () => {
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadEmail('');
    setNewLeadCity('');
    setNewLeadProject(projectId || (projects[0]?.id ?? null));
    setNewLeadAgent(null);
    setAddModalVisible(true);
  };

  const handleCreateLead = async () => {
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      Alert.alert('Validation Error', 'Lead name and phone number are required.');
      return;
    }
    if (!newLeadProject) {
      Alert.alert('Validation Error', 'Please select a project for this lead.');
      return;
    }

    setSubmitting(true);
    try {
      await leadApi.createLead({
        name: newLeadName.trim(),
        phone: newLeadPhone.trim(),
        email: newLeadEmail.trim() || undefined,
        city: newLeadCity.trim() || undefined,
        projectId: newLeadProject,
        assignedUserId: newLeadAgent || undefined,
      });
      Alert.alert('Success', 'Lead created successfully.');
      setAddModalVisible(false);
      fetchLeads(true);
    } catch (err: any) {
      Alert.alert('Failed to Create Lead', err.message || 'Unable to save lead.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLead = (lead: Lead) => {
    Alert.alert(
      'Delete Lead',
      `Are you sure you want to delete lead "${lead.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await leadApi.deleteLead(lead.id);
              fetchLeads(true);
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Unable to delete lead.');
            }
          },
        },
      ]
    );
  };

  const handleOpenLead = (lead: Lead) => {
    navigation.navigate('LeadDetails', {
      leadId: lead.id,
      leadName: lead.name,
    });
  };

  const handleQuickCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Number', 'No phone number available for this lead.');
      return;
    }
    Linking.openURL(`tel:${phone.trim()}`);
  };

  const renderLeadCard = ({ item }: { item: Lead }) => {
    const ownerName = item.currentOwner?.name || item.assignedTo?.name;
    const isOtherEmployeeLead = !isAdmin && ownerName && user?.name && ownerName !== user?.name;

    // Section 12: MY LEADS mode - show ONLY Lead Name, Project Name, and Calls Count
    if (isMyLeadsMode) {
      return (
        <TouchableOpacity
          style={styles.myLeadCard}
          activeOpacity={0.7}
          onPress={() => handleOpenLead(item)}
        >
          <View style={styles.myLeadCardContent}>
            <View style={styles.myLeadTextCol}>
              <Text style={styles.myLeadName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.myLeadProject} numberOfLines={1}>
                {item.project?.name || item.projectName || 'CRM Project'}
              </Text>
              <View style={styles.myLeadCallsBadge}>
                <Ionicons name="call" size={12} color="#22c55e" />
                <Text style={styles.myLeadCallsText}>
                  Calls: {item.totalCallCount ?? 0}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </View>
        </TouchableOpacity>
      );
    }

    // Section 22 & 23: Project Leads & Other Project Leads
    return (
      <Card style={styles.leadCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleOpenLead(item)}
        >
          <View style={styles.leadHeader}>
            <View style={styles.leadInfo}>
              <Text style={styles.leadName}>{item.name}</Text>
              <Text style={styles.leadPhone}>{item.phone}</Text>
              {item.email ? <Text style={styles.leadEmail}>{item.email}</Text> : null}
            </View>
            <View style={styles.badgeCol}>
              {isOtherEmployeeLead && (
                <View style={styles.viewOnlyBadge}>
                  <Text style={styles.viewOnlyBadgeText}>VIEW ONLY</Text>
                </View>
              )}
              <Badge label={item.status} status={item.status} />
              {item.businessOutcome ? (
                <Badge label={item.businessOutcome} status={item.businessOutcome} />
              ) : null}
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.projectText}>
              Project: {item.project?.name || item.projectName || 'CRM Campaign'}
            </Text>
            {ownerName ? (
              <Text style={styles.ownerText}>Assigned: {ownerName}</Text>
            ) : (
              <Text style={styles.unassignedText}>Unassigned</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.callActionBtn}
            onPress={() => handleQuickCall(item.phone)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={13} color="#ffffff" />
            <Text style={styles.callActionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsActionBtn}
            onPress={() => handleOpenLead(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={13} color={colors.primary} />
            <Text style={styles.detailsActionText}>Details</Text>
          </TouchableOpacity>

          {!isOtherEmployeeLead && (
            <TouchableOpacity
              style={styles.logActionBtn}
              onPress={() => setSelectedLeadForCall(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.logActionText}>Log</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={styles.deleteActionBtn}
              onPress={() => handleDeleteLead(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title={projectName}
        subtitle={
          projectId !== undefined
            ? 'Dedicated project campaign & pipeline'
            : isAdmin
            ? 'Complete organization leads directory & pipeline'
            : 'Assigned customer leads'
        }
        onBack={
          projectId !== undefined
            ? () => {
                if (route.params?.projectId) {
                  navigation.goBack();
                } else {
                  setProjectId(undefined);
                  setProjectName('All Leads');
                }
              }
            : () => navigation.goBack()
        }
        rightElement={
          <TouchableOpacity
            style={styles.addLeadBtn}
            onPress={handleOpenAddLead}
            activeOpacity={0.7}
          >
            <GradientView
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addLeadGradient}
            >
              <Ionicons name="person-add" size={15} color="#ffffff" />
            </GradientView>
          </TouchableOpacity>
        }
      />

      {/* 1. Project Selector / Dedicated Context */}
      {projectId !== undefined ? (
        <View style={styles.projectContextBanner}>
          <View style={styles.projectContextInfo}>
            <View style={styles.projectContextIconCircle}>
              <Ionicons name="folder-open" size={16} color={colors.primary} />
            </View>
            <View style={styles.projectContextTextCol}>
              <Text style={styles.projectContextTitle} numberOfLines={1}>
                {projectName}
              </Text>
              <Text style={styles.projectContextSubtitle}>
                {leads.length} Leads • {leads.filter((l) => l.status === 'FOLLOW_UP').length} Follow-ups • {leads.filter((l) => l.businessOutcome === 'INTERESTED').length} Interested
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.switchProjectBtn}
            onPress={() => setProjectModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.switchProjectBtnText}>Switch</Text>
            <Ionicons name="chevron-down" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.projectSelectorRow}>
          <Text style={styles.projectSelectorLabel}>Project</Text>
          <TouchableOpacity
            style={styles.projectDropdownBtn}
            onPress={() => setProjectModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.projectDropdownLeft}>
              <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
              <Text style={styles.projectDropdownText} numberOfLines={1}>
                All Projects
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Compact Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusFiltersContainer}
      >
        {STATUS_FILTERS.map((s) => {
          const isSelected = selectedStatus === s;
          const count = statusCounts[s];
          const label =
            s === 'ALL'
              ? 'All'
              : s === 'IN_PROGRESS'
              ? 'In Progress'
              : s === 'FOLLOW_UP'
              ? 'Follow Up'
              : s.charAt(0) + s.slice(1).toLowerCase();
          const displayLabel = count !== undefined && count > 0 ? `${label} ${count}` : label;

          return (
            <TouchableOpacity
              key={s}
              onPress={() => setSelectedStatus(s)}
              activeOpacity={0.7}
            >
              {isSelected ? (
                <GradientView
                  colors={colors.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.statusChipActive}
                >
                  <Text style={styles.statusChipTextActive}>{displayLabel}</Text>
                </GradientView>
              ) : (
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>{displayLabel}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 3. Compact Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or email..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4. Lead Cards List */}
      {loading && !refreshing ? (
        <LoadingState message="Loading leads..." fullScreen />
      ) : leads.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={searchQuery || selectedStatus !== 'ALL' ? 'No Leads Found' : 'No Leads Available'}
          description={
            searchQuery || selectedStatus !== 'ALL'
              ? 'No leads match the selected filters or search.'
              : 'No leads available in this project.'
          }
          actionTitle={searchQuery || selectedStatus !== 'ALL' ? 'Clear Filters' : 'Add Lead'}
          onAction={
            searchQuery || selectedStatus !== 'ALL'
              ? () => {
                  setSelectedStatus('ALL');
                  setSearchQuery('');
                }
              : handleOpenAddLead
          }
        />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLeadCard}
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

      {/* Quick Log Call Modal */}
      {selectedLeadForCall && (
        <LogCallModal
          visible={!!selectedLeadForCall}
          leadId={selectedLeadForCall.id}
          leadName={selectedLeadForCall.name}
          leadPhone={selectedLeadForCall.phone}
          onClose={() => setSelectedLeadForCall(null)}
          onCallLogged={() => {
            fetchLeads(true);
          }}
        />
      )}

      {/* Add Lead Modal */}
      <Modal visible={addModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Lead</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Input
                label="Customer Name *"
                placeholder="e.g. John Doe"
                value={newLeadName}
                onChangeText={setNewLeadName}
              />

              <Input
                label="Phone Number *"
                placeholder="+91 98765 43210"
                value={newLeadPhone}
                onChangeText={setNewLeadPhone}
                keyboardType="phone-pad"
              />

              <Input
                label="Email Address"
                placeholder="john@example.com"
                value={newLeadEmail}
                onChangeText={setNewLeadEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="City / Location"
                placeholder="e.g. Mumbai"
                value={newLeadCity}
                onChangeText={setNewLeadCity}
              />

              {/* Project Selector */}
              <Text style={styles.fieldLabel}>Select Project *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.modalProjectPicker}
              >
                {projects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.modalProjPill,
                      newLeadProject === p.id && styles.modalProjPillActive,
                    ]}
                    onPress={() => setNewLeadProject(p.id)}
                  >
                    <Text
                      style={[
                        styles.modalProjPillText,
                        newLeadProject === p.id && styles.modalProjPillTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Agent Assign (Admin only) */}
              {isAdmin && agents.length > 0 && (
                <View style={{ marginTop: spacing.xs }}>
                  <Text style={styles.fieldLabel}>Assign To Agent (Optional)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.modalProjectPicker}
                  >
                    <TouchableOpacity
                      style={[
                        styles.modalProjPill,
                        newLeadAgent === null && styles.modalProjPillActive,
                      ]}
                      onPress={() => setNewLeadAgent(null)}
                    >
                      <Text
                        style={[
                          styles.modalProjPillText,
                          newLeadAgent === null && styles.modalProjPillTextActive,
                        ]}
                      >
                        Unassigned
                      </Text>
                    </TouchableOpacity>
                    {agents.map((ag) => (
                      <TouchableOpacity
                        key={ag.id}
                        style={[
                          styles.modalProjPill,
                          newLeadAgent === ag.id && styles.modalProjPillActive,
                        ]}
                        onPress={() => setNewLeadAgent(ag.id)}
                      >
                        <Text
                          style={[
                            styles.modalProjPillText,
                            newLeadAgent === ag.id && styles.modalProjPillTextActive,
                          ]}
                        >
                          {ag.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setAddModalVisible(false)}
                style={styles.modalActionBtn}
              />
              <Button
                title="Save Lead"
                onPress={handleCreateLead}
                loading={submitting}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Project Bottom Sheet Modal */}
      <Modal
        visible={projectModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProjectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setProjectModalVisible(false)}
          />
          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Project</Text>
              <TouchableOpacity
                onPress={() => setProjectModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {projects.length > 4 && (
              <View style={styles.sheetSearchBox}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.sheetSearchInput}
                  placeholder="Search projects..."
                  placeholderTextColor={colors.textMuted}
                  value={projectSearch}
                  onChangeText={setProjectSearch}
                />
                {projectSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setProjectSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <ScrollView
              style={styles.sheetList}
              contentContainerStyle={styles.sheetListContent}
              showsVerticalScrollIndicator={false}
            >
              {/* All Projects Option */}
              <TouchableOpacity
                style={[
                  styles.sheetItem,
                  projectId === undefined && styles.sheetItemActive,
                ]}
                onPress={() => {
                  setProjectId(undefined);
                  setProjectName('All Leads');
                  setProjectModalVisible(false);
                }}
              >
                <View style={styles.sheetItemLeft}>
                  <Ionicons
                    name={projectId === undefined ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={projectId === undefined ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.sheetItemText,
                      projectId === undefined && styles.sheetItemTextActive,
                    ]}
                  >
                    All Projects
                  </Text>
                </View>
                <Badge label="All" variant="neutral" />
              </TouchableOpacity>

              {/* Individual Projects */}
              {projects
                .filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                .map((p) => {
                  const isSelected = projectId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.sheetItem, isSelected && styles.sheetItemActive]}
                      onPress={() => {
                        setProjectId(p.id);
                        setProjectName(p.name);
                        setProjectModalVisible(false);
                      }}
                    >
                      <View style={styles.sheetItemLeft}>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.sheetItemText,
                            isSelected && styles.sheetItemTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                      </View>
                      {p.assignedLeadsCount !== undefined ? (
                        <Text style={styles.sheetCountText}>
                          {p.assignedLeadsCount} leads
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
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
  addLeadBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addLeadGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dedicated Project Context Banner
  projectContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.normal,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  projectContextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  projectContextIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  projectContextTextCol: {
    flex: 1,
  },
  projectContextTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  projectContextSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  switchProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    marginLeft: 8,
  },
  switchProjectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  // Compact Project Selector Row
  projectSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  projectSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  projectDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 150,
    maxWidth: 220,
  },
  projectDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  projectDropdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  // Compact Status Filter Chips
  statusFiltersContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipActive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  // Search Bar
  searchWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    marginLeft: 6,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 2,
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
  leadHeader: {
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
    marginTop: 1,
  },
  leadEmail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
  },
  projectText: {
    fontSize: 11,
    color: colors.primary,
  },
  ownerText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  unassignedText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  callActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  logActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logActionText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsActionText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  modalProjectPicker: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  modalProjPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalProjPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  modalProjPillText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  modalProjPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalActionBtn: {
    flex: 1,
  },
  // Bottom Sheet Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 38,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: 6,
    paddingVertical: 0,
  },
  sheetList: {
    maxHeight: 360,
  },
  sheetListContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  sheetItemActive: {
    backgroundColor: colors.primaryLight,
  },
  sheetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sheetItemText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
  },
  sheetItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sheetCountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  myLeadCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  myLeadCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myLeadTextCol: {
    flex: 1,
    marginRight: 10,
  },
  myLeadName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  myLeadProject: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  myLeadCallsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  myLeadCallsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  viewOnlyBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
    marginBottom: 3,
  },
  viewOnlyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 0.5,
  },
});
