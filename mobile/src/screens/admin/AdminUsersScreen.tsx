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
import { usersApi } from '../../api/usersApi';
import { User } from '../../types';

export const AdminUsersScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ROLE_ADMIN' | 'ROLE_USER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ROLE_USER' | 'ROLE_ADMIN'>('ROLE_USER');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'ROLE_USER' | 'ROLE_ADMIN'>('ROLE_USER');

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await usersApi.getUsers({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        search: searchQuery.trim() || undefined,
        size: 50,
      });
      setUsers(res.content || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(true);
  };

  const handleOpenCreate = () => {
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setNewRole('ROLE_USER');
    setCreateModalVisible(true);
  };

  const handleCreateUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      Alert.alert('Validation Error', 'Name, email, and password are required.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.createUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim() || undefined,
        password: newPassword,
        role: newRole,
      });
      Alert.alert('Success', 'User created successfully.');
      setCreateModalVisible(false);
      fetchUsers(true);
    } catch (err: any) {
      Alert.alert('Create User Failed', err.message || 'Unable to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditRole(user.role === 'ROLE_ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER');
    setEditModalVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.updateUser(editingUser.id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
      });
      Alert.alert('Success', 'User profile updated.');
      setEditModalVisible(false);
      fetchUsers(true);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Unable to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await usersApi.toggleStatus(user.id, nextStatus);
      fetchUsers(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update user status.');
    }
  };

  const handleDeleteUser = (user: User) => {
    Alert.alert(
      'Delete User',
      `Permanently delete ${user.name} (${user.email})? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await usersApi.deleteUser(user.id);
              fetchUsers(true);
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Unable to delete user.');
            }
          },
        },
      ]
    );
  };

  const renderUserCard = ({ item }: { item: User }) => {
    const isActive = item.status === 'ACTIVE';
    const isAdmin = item.role === 'ROLE_ADMIN';

    return (
      <Card style={styles.userCard}>
        <View style={styles.userCardTop}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeUser,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    isAdmin ? styles.roleTextAdmin : styles.roleTextUser,
                  ]}
                >
                  {isAdmin ? 'ADMIN' : 'USER'}
                </Text>
              </View>
            </View>

            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email}
            </Text>
            {item.phone ? (
              <Text style={styles.userPhone} numberOfLines={1}>
                {item.phone}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.userCardFooter}>
          <TouchableOpacity
            style={[
              styles.statusToggleBtn,
              isActive ? styles.statusBtnActive : styles.statusBtnInactive,
            ]}
            onPress={() => handleToggleStatus(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={isActive ? '#10b981' : '#ef4444'}
            />
            <Text
              style={[
                styles.statusToggleText,
                { color: isActive ? '#10b981' : '#ef4444' },
              ]}
            >
              {item.status}
            </Text>
          </TouchableOpacity>

          <View style={styles.userActionBtns}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleOpenEdit(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteUserBtn}
              onPress={() => handleDeleteUser(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
              <Text style={styles.deleteUserBtnText}>Delete</Text>
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
        title="User Management"
        subtitle="Manage employees, admin privileges & permissions"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.addUserHeaderBtn}
            onPress={handleOpenCreate}
            activeOpacity={0.7}
          >
            <GradientView
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addUserGradient}
            >
              <Ionicons name="person-add" size={16} color="#ffffff" />
            </GradientView>
          </TouchableOpacity>
        }
      />

      {/* Filter Segment & Search Input */}
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          {(['ALL', 'ROLE_USER', 'ROLE_ADMIN'] as const).map((r) => {
            const isActive = roleFilter === r;
            const label = r === 'ALL' ? 'All Roles' : r === 'ROLE_ADMIN' ? 'Admins' : 'Sales Agents';
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRoleFilter(r)}
                activeOpacity={0.7}
              >
                {isActive ? (
                  <GradientView
                    colors={colors.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.rolePillActive}
                  >
                    <Text style={styles.rolePillTextActive}>{label}</Text>
                  </GradientView>
                ) : (
                  <View style={styles.rolePill}>
                    <Text style={styles.rolePillText}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          placeholder="Search by name, email, phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
        />
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Loading users..." fullScreen />
      ) : users.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Users Found"
          message="Create a user to give team members access to the CRM."
          actionLabel="Add User"
          onAction={handleOpenCreate}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUserCard}
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

      {/* Add User Modal */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Full Name *"
              placeholder="e.g. Rahul Sharma"
              value={newName}
              onChangeText={setNewName}
            />

            <Input
              label="Email Address *"
              placeholder="rahul@crm.com"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />

            <Input
              label="Initial Password *"
              placeholder="At least 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
            />

            <View style={styles.rolePickerContainer}>
              <Text style={styles.fieldLabel}>Role *</Text>
              <View style={styles.rolePickerRow}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    newRole === 'ROLE_USER' && styles.roleOptionActive,
                  ]}
                  onPress={() => setNewRole('ROLE_USER')}
                >
                  <Ionicons
                    name="person"
                    size={14}
                    color={newRole === 'ROLE_USER' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleOptionText,
                      newRole === 'ROLE_USER' && styles.roleOptionTextActive,
                    ]}
                  >
                    User (Sales Agent)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    newRole === 'ROLE_ADMIN' && styles.roleOptionActive,
                  ]}
                  onPress={() => setNewRole('ROLE_ADMIN')}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={14}
                    color={newRole === 'ROLE_ADMIN' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleOptionText,
                      newRole === 'ROLE_ADMIN' && styles.roleOptionTextActive,
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setCreateModalVisible(false)}
                style={styles.modalActionBtn}
              />
              <Button
                title="Create User"
                onPress={handleCreateUser}
                loading={submitting}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit User Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Full Name *"
              value={editName}
              onChangeText={setEditName}
            />

            <Input
              label="Phone Number"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.rolePickerContainer}>
              <Text style={styles.fieldLabel}>Role *</Text>
              <View style={styles.rolePickerRow}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    editRole === 'ROLE_USER' && styles.roleOptionActive,
                  ]}
                  onPress={() => setEditRole('ROLE_USER')}
                >
                  <Ionicons
                    name="person"
                    size={14}
                    color={editRole === 'ROLE_USER' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleOptionText,
                      editRole === 'ROLE_USER' && styles.roleOptionTextActive,
                    ]}
                  >
                    User
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    editRole === 'ROLE_ADMIN' && styles.roleOptionActive,
                  ]}
                  onPress={() => setEditRole('ROLE_ADMIN')}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={14}
                    color={editRole === 'ROLE_ADMIN' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleOptionText,
                      editRole === 'ROLE_ADMIN' && styles.roleOptionTextActive,
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditModalVisible(false)}
                style={styles.modalActionBtn}
              />
              <Button
                title="Save Changes"
                onPress={handleUpdateUser}
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
  addUserHeaderBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addUserGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolePillActive: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rolePillTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  userCard: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  roleBadgeUser: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  roleTextAdmin: {
    color: colors.primary,
  },
  roleTextUser: {
    color: colors.success,
  },
  userEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  userPhone: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBtnInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusToggleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  deleteUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteUserBtnText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
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
  rolePickerContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleOptionTextActive: {
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
