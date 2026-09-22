import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { GradientView } from '../../components/common/GradientView';
import { MeqHeader } from '../../components/common/MeqHeader';
import { IconTile } from '../../components/common/IconTile';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { usersApi } from '../../api/usersApi';
import { getApiBaseUrl, setApiBaseUrl } from '../../api/client';
import { API_BASE_URL, STORAGE_KEYS } from '../../config/constants';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, logout, isAdmin } = useAuth();

  // Request Admin Access state
  const [adminRequestStatus, setAdminRequestStatus] = useState<
    'NOT_REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  >('NOT_REQUESTED');
  const [requestingAdmin, setRequestingAdmin] = useState(false);
  const [showAdminRequestForm, setShowAdminRequestForm] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Server URL configuration
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);

  // About App info
  const [showAboutApp, setShowAboutApp] = useState(false);

  React.useEffect(() => {
    if (!isAdmin) {
      usersApi.getAdminAccessStatus().then((res) => {
        if (res?.status) {
          setAdminRequestStatus(res.status);
        }
      }).catch(() => {});
    }
  }, [isAdmin]);

  const handleRequestAdminAccess = () => {
    if (adminRequestStatus === 'PENDING') {
      Alert.alert('Request Pending', 'Your request for Admin access is already submitted and pending review.');
      return;
    }
    if (adminRequestStatus === 'APPROVED' || isAdmin) {
      Alert.alert('Already Admin', 'You already have administrator access.');
      return;
    }

    Alert.alert(
      'Request Admin Access',
      'Submit request to your CRM administrator for elevated administrative privileges?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Request',
          onPress: async () => {
            setRequestingAdmin(true);
            try {
              const res = await usersApi.requestAdminAccess('Elevated access requested from Settings');
              setAdminRequestStatus(res?.status || 'PENDING');
              Alert.alert('Success', 'Admin access requested successfully. Waiting for administrator review.');
            } catch (err: any) {
              Alert.alert('Request Failed', err.message || 'Unable to submit request.');
            } finally {
              setRequestingAdmin(false);
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation Error', 'Please enter your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const msg = await authApi.changePassword(currentPassword, newPassword);
      Alert.alert('Success', msg || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      Alert.alert('Password Change Failed', err.message || 'Unable to update password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveServerUrl = async () => {
    if (!serverUrl.trim()) return;
    try {
      const trimmed = serverUrl.trim();
      setApiBaseUrl(trimmed);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_API_URL, trimmed);
      Alert.alert('Success', `Backend API URL set to: ${trimmed}`);
      setShowServerConfig(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const executeLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to sign out of your account?') : true;
      if (confirmed) {
        executeLogout();
      }
    } else {
      Alert.alert('Confirm Sign Out', 'Are you sure you want to sign out of your account?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: executeLogout,
        },
      ]);
    }
  };

  const roleLabel = isAdmin ? 'ADMIN' : 'AGENT';
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'K';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* Top Header: MEQ CRM Branding */}
      <MeqHeader />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card (Screen 5 in Target Design) */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <GradientView
              colors={colors.avatarGradient}
              style={styles.avatarLarge}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </GradientView>

            <View style={styles.profileDetails}>
              <Text style={styles.userName}>{user?.name || 'Kishore Kumar'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'kishore@meqcrm.com'}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{roleLabel}</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.profileDivider} />

          <View style={styles.profileBottomRow}>
            <View style={styles.phoneGroup}>
              <Ionicons name="call-outline" size={15} color="#6B7280" />
              <Text style={styles.phoneText}>{user?.phone || '+91 98765 43210'}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.editProfileText}>Edit Profile ›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Navigation Menu Card */}
        <View style={styles.menuCard}>
          {/* 1. Account & Profile */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <IconTile name="person" variant="blue" size={38} iconSize={18} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Account & Profile</Text>
              <Text style={styles.menuSubtitle}>Personal details & role</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 2. Request Admin Access (for Agent) */}
          {!isAdmin && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => setShowAdminRequestForm(!showAdminRequestForm)}
              >
                <IconTile name="shield-checkmark" variant="orange" size={38} iconSize={18} />
                <View style={styles.menuInfo}>
                  <Text style={styles.menuTitle}>Request Admin Access</Text>
                  <Text style={styles.menuSubtitle}>
                    Status:{' '}
                    {adminRequestStatus === 'NOT_REQUESTED'
                      ? 'Not Requested'
                      : adminRequestStatus === 'PENDING'
                      ? 'Pending Review'
                      : adminRequestStatus === 'APPROVED'
                      ? 'Approved'
                      : 'Rejected'}
                  </Text>
                </View>
                <Ionicons
                  name={showAdminRequestForm ? 'chevron-up' : 'chevron-forward'}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {showAdminRequestForm && (
                <View style={styles.embeddedForm}>
                  <Text style={styles.embeddedFormText}>
                    Need elevated access? Submit request to your CRM administrator.
                  </Text>
                  {adminRequestStatus !== 'APPROVED' && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        adminRequestStatus === 'PENDING' && styles.actionBtnDisabled,
                      ]}
                      onPress={handleRequestAdminAccess}
                      disabled={requestingAdmin || adminRequestStatus === 'PENDING'}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={adminRequestStatus === 'PENDING' ? 'time-outline' : 'key-outline'}
                        size={15}
                        color="#ffffff"
                      />
                      <Text style={styles.actionBtnText}>
                        {adminRequestStatus === 'PENDING'
                          ? 'Request Pending Review'
                          : adminRequestStatus === 'REJECTED'
                          ? 'Re-request Admin Access'
                          : 'Submit Admin Request'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.menuDivider} />
            </>
          )}

          {/* 3. Change Password */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setShowPasswordForm(!showPasswordForm)}
          >
            <IconTile name="key" variant="purple" size={38} iconSize={18} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Change Password</Text>
              <Text style={styles.menuSubtitle}>Update security credentials</Text>
            </View>
            <Ionicons
              name={showPasswordForm ? 'chevron-up' : 'chevron-forward'}
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={styles.embeddedForm}>
              <Input
                label="Current Password"
                placeholder="••••••••"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />
              <Input
                label="New Password"
                placeholder="••••••••"
                value={newPassword}
                onChangeText={setNewPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />
              <Input
                label="Confirm New Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />
              <Button
                title="Update Password"
                onPress={handleChangePassword}
                loading={passwordLoading}
                variant="primary"
                size="sm"
                style={{ marginTop: 6 }}
              />
            </View>
          )}

          <View style={styles.menuDivider} />

          {/* 4. Call Permissions */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <IconTile name="call" variant="green" size={38} iconSize={18} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Call Permissions</Text>
              <Text style={styles.menuSubtitle}>Telephony, dialer & audio</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 5. Backend Connection */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <IconTile name="server" variant="blue" size={38} iconSize={18} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Backend Connection</Text>
              <Text style={styles.menuSubtitle}>Configure Spring Boot host URL</Text>
            </View>
            <Ionicons
              name={showServerConfig ? 'chevron-up' : 'chevron-forward'}
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.embeddedForm}>
              <Input
                label="API Base URL"
                placeholder={API_BASE_URL}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                leftIcon="globe-outline"
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={styles.presetPill}
                  onPress={() => setServerUrl(API_BASE_URL)}
                >
                  <Text style={styles.presetPillText}>Reset Default</Text>
                </TouchableOpacity>
              </View>
              <Button
                title="Save API URL"
                onPress={handleSaveServerUrl}
                variant="outline"
                size="sm"
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          <View style={styles.menuDivider} />

          {/* 6. Notifications */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <IconTile name="notifications" variant="red" size={38} iconSize={18} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Push alerts & call reminders</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 7. About App */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setShowAboutApp(!showAboutApp)}
          >
            <IconTile name="information-circle" variant="purple" size={38} iconSize={18} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>About App</Text>
              <Text style={styles.menuSubtitle}>Version 2.4.0 • Active Session</Text>
            </View>
            <Ionicons
              name={showAboutApp ? 'chevron-up' : 'chevron-forward'}
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {showAboutApp && (
            <View style={styles.embeddedForm}>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Application</Text>
                <Text style={styles.infoValue}>Calling CRM Mobile v2.4.0</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Active Role</Text>
                <Text style={styles.infoValue}>
                  {isAdmin ? 'Administrator (Full Access)' : 'Agent (Employee)'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Authentication</Text>
                <Text style={styles.infoValue}>Spring Boot JWT (Secured)</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoKey}>Session Status</Text>
                <Text style={[styles.infoValue, { color: '#16A34A', fontWeight: '700' }]}>
                  Active & Verified
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Full-width Red Gradient Log Out Button (Screen 5 Target Design) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleLogout}
          style={styles.logoutBtnContainer}
        >
          <GradientView
            colors={colors.logoutGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradientBtn}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </GradientView>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  rolePill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rolePillText: {
    color: '#4F46E5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activePillText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  profileBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  embeddedForm: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginVertical: 6,
  },
  embeddedFormText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  presetPillText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoKey: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  logoutBtnContainer: {
    marginTop: 4,
    marginBottom: 16,
  },
  logoutGradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
