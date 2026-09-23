import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl, setApiBaseUrl } from '../../api/client';
import { API_BASE_URL, STORAGE_KEYS } from '../../config/constants';
import { Modal, Alert } from 'react-native';
import { FormModal } from '../../components/common/FormModal';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Server configuration
  const [activeServerUrl, setActiveServerUrl] = useState(getApiBaseUrl());
  const [showServerModal, setShowServerModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(getApiBaseUrl());

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  const handleSaveCustomUrl = async () => {
    if (!customUrlInput.trim()) return;
    try {
      const trimmed = customUrlInput.trim().replace(/\/+$/, '');
      const normalized = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
      setApiBaseUrl(normalized);
      setActiveServerUrl(normalized);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_API_URL, normalized);
      setShowServerModal(false);
      Alert.alert('Server Connected', `Targeting: ${normalized}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleResetDefaultUrl = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CUSTOM_API_URL);
      setApiBaseUrl(API_BASE_URL);
      setActiveServerUrl(API_BASE_URL);
      setCustomUrlInput(API_BASE_URL);
      setShowServerModal(false);
      Alert.alert('Reset', `Server URL reset to default: ${API_BASE_URL}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="call" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Calling CRM</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="Email Address"
            placeholder="agent@crm.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrorMessage('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrorMessage('');
            }}
            isPassword
            leftIcon="lock-closed-outline"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />
        </Card>

        {/* Quick Demo Fill Buttons */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Demo Sign In:</Text>
          <View style={styles.demoBtnRow}>
            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => setDemoCredentials('admin@crm.com', 'admin123')}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={styles.demoPillText}>Admin Role</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => setDemoCredentials('agent2@crm.com', 'agent123')}
              activeOpacity={0.7}
            >
              <Ionicons name="person" size={14} color={colors.success} />
              <Text style={styles.demoPillText}>Sales User Role</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Indicator Pill */}
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => {
            setCustomUrlInput(activeServerUrl);
            setShowServerModal(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="server-outline" size={13} color={colors.textMuted} />
          <Text style={styles.serverPillText} numberOfLines={1}>
            Server: {activeServerUrl.replace(/\/api\/v1$/, '')}
          </Text>
          <Ionicons name="create-outline" size={13} color={colors.primary} />
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Enterprise Security & JWT Authentication
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Server Config Modal */}
      <FormModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
        title="Backend Server URL"
        onSave={handleSaveCustomUrl}
        saveTitle="Save & Connect"
        saveVariant="primary"
        heightPercent={0.72}
        maxHeightPixels={480}
        customFooter={
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Reset Default"
                variant="outline"
                onPress={handleResetDefaultUrl}
                style={{ width: '100%' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Save & Connect"
                variant="primary"
                onPress={handleSaveCustomUrl}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        }
      >
        <Text style={styles.modalSubtitle}>
          Ensure your phone and PC are on the same Wi-Fi. Enter your computer's IP address:
        </Text>

        <Input
          label="API URL"
          value={customUrlInput}
          onChangeText={setCustomUrlInput}
          placeholder="http://192.168.1.43:8080"
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon="link-outline"
        />
      </FormModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderFocus,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    padding: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
  },
  loginBtn: {
    marginTop: spacing.xs,
  },
  demoSection: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  demoBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoPillText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  serverPill: {
    marginTop: spacing.sm + 4,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serverPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: 240,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalResetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalResetText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.primary,
  },
  modalSaveText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
