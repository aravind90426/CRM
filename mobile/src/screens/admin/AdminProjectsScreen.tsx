import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { projectsApi } from '../../api/projectsApi';
import { Project } from '../../types';

export const AdminProjectsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add / Edit Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await projectsApi.getProjects();
      setProjects(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects(true);
  };

  const handleOpenCreate = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectDescription('');
    setProjectStatus('ACTIVE');
    setModalVisible(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setProjectName(p.name);
    setProjectDescription(p.description || '');
    setProjectStatus(p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      Alert.alert('Validation Error', 'Project name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingProject) {
        await projectsApi.updateProject(editingProject.id, {
          name: projectName.trim(),
          description: projectDescription.trim() || undefined,
          status: projectStatus,
        });
        Alert.alert('Success', 'Project updated successfully.');
      } else {
        await projectsApi.createProject({
          name: projectName.trim(),
          description: projectDescription.trim() || undefined,
          status: projectStatus,
        });
        Alert.alert('Success', 'Project created successfully.');
      }
      setModalVisible(false);
      fetchProjects(true);
    } catch (err: any) {
      Alert.alert('Operation Failed', err.message || 'Unable to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (p: Project) => {
    const nextStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await projectsApi.toggleStatus(p.id, nextStatus);
      fetchProjects(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update project status.');
    }
  };

  const handleDelete = (p: Project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to permanently delete project "${p.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsApi.deleteProject(p.id);
              fetchProjects(true);
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Unable to delete project.');
            }
          },
        },
      ]
    );
  };

  const renderProjectCard = ({ item }: { item: Project }) => {
    const isActive = item.status === 'ACTIVE';

    return (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.nameText}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.descText} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}
            onPress={() => handleToggleStatus(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? 'checkmark-circle' : 'close-circle'}
              size={12}
              color={isActive ? '#10b981' : '#ef4444'}
            />
            <Text style={[styles.statusBadgeText, { color: isActive ? '#10b981' : '#ef4444' }]}>
              {item.status}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate('Main', {
                screen: 'Leads',
                params: { projectId: item.id, projectName: item.name },
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={14} color={colors.primary} />
            <Text style={styles.actionBtnText}>View Leads ({item.assignedLeadsCount ?? 0})</Text>
          </TouchableOpacity>

          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleOpenEdit(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title="Project Management"
        subtitle="Create campaigns, toggle active status & assign leads"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={handleOpenCreate}
            activeOpacity={0.7}
          >
            <GradientView
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addHeaderGradient}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </GradientView>
          </TouchableOpacity>
        }
      />

      {loading && !refreshing ? (
        <LoadingState message="Loading projects..." fullScreen />
      ) : projects.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="No Projects Found"
          message="Create your first CRM project to start organizing leads."
          actionLabel="Create Project"
          onAction={handleOpenCreate}
        />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProjectCard}
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

      {/* Add / Edit Project Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProject ? 'Edit Project' : 'New CRM Project'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Project Name *"
              placeholder="e.g. Prestige Heights Phase 2"
              value={projectName}
              onChangeText={setProjectName}
            />

            <Input
              label="Description (Optional)"
              placeholder="Campaign objective or property details"
              value={projectDescription}
              onChangeText={setProjectDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.statusToggleContainer}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    projectStatus === 'ACTIVE' && styles.statusOptionActive,
                  ]}
                  onPress={() => setProjectStatus('ACTIVE')}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      projectStatus === 'ACTIVE' && styles.statusOptionTextActive,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    projectStatus === 'INACTIVE' && styles.statusOptionActive,
                  ]}
                  onPress={() => setProjectStatus('INACTIVE')}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      projectStatus === 'INACTIVE' && styles.statusOptionTextActive,
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={styles.modalActionBtn}
              />
              <Button
                title={editingProject ? 'Update' : 'Create'}
                onPress={handleSubmit}
                loading={submitting}
                style={styles.modalActionBtn}
              />
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
  addHeaderBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addHeaderGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  descText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
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
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusToggleContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
