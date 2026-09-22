import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { IconTile } from '../../components/common/IconTile';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../types';

export const AdminHubScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

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
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to sign out?') : true;
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

  const menuSections = [
    {
      title: 'Management & Control',
      items: [
        {
          title: 'User Management',
          subtitle: 'Create, edit & manage agent privileges',
          icon: 'people',
          variant: 'blue' as const,
          onPress: () => navigation.navigate('AdminUsers'),
        },
        {
          title: 'Project Campaigns',
          subtitle: 'Manage projects, pipelines & status',
          icon: 'briefcase',
          variant: 'purple' as const,
          onPress: () => navigation.navigate('AdminProjects'),
        },
        {
          title: 'Lead Assignments',
          subtitle: 'Distribute & reassign leads to agents',
          icon: 'shuffle',
          variant: 'orange' as const,
          onPress: () => navigation.navigate('Assignments'),
        },
      ],
    },
    {
      title: 'Intelligence & Operations',
      items: [
        {
          title: 'Reports & Analytics',
          subtitle: 'Pipeline, employee ROI & sales revenue',
          icon: 'bar-chart',
          variant: 'purple' as const,
          onPress: () => navigation.navigate('Reports'),
        },
        {
          title: 'Follow-ups Console',
          subtitle: 'Review team callback promises & schedules',
          icon: 'calendar-outline',
          variant: 'blue' as const,
          onPress: () => navigation.navigate('FollowUps', {}),
        },
        {
          title: 'Organization Call Logs',
          subtitle: 'Audit telemetry, duration & recordings',
          icon: 'call',
          variant: 'green' as const,
          onPress: () => navigation.navigate('CallLogs', {}),
        },
        {
          title: 'Google Sync History',
          subtitle: 'View Google Sheets synchronization history',
          icon: 'document-text',
          variant: 'green' as const,
          onPress: () => navigation.navigate('GoogleSheets'),
        },
        {
          title: 'System Audit Trail',
          subtitle: 'Immutable record modifications log',
          icon: 'shield-checkmark',
          variant: 'orange' as const,
          onPress: () => navigation.navigate('AuditLogs'),
        },
      ],
    },
    {
      title: 'Preferences & Session',
      items: [
        {
          title: 'Settings & Security',
          subtitle: 'Account details, server URL & password',
          icon: 'settings-outline',
          variant: 'blue' as const,
          onPress: () => navigation.navigate('Settings'),
        },
        {
          title: 'Sign Out',
          subtitle: 'End current administrative session',
          icon: 'log-out-outline',
          variant: 'red' as const,
          onPress: handleLogout,
        },
      ],
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MeqHeader
        showLogo={false}
        title="Admin Hub"
        subtitle={`Welcome, ${user?.name || 'Administrator'} (Role: ${user?.role || 'ADMIN'})`}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {menuSections.map((sec, secIdx) => (
          <View key={secIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.menuCard}>
              {sec.items.map((item, itemIdx) => (
                <TouchableOpacity
                  key={itemIdx}
                  style={[
                    styles.menuRow,
                    itemIdx < sec.items.length - 1 && styles.menuRowBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <IconTile
                    name={item.icon}
                    variant={item.variant}
                    size={38}
                    iconSize={18}
                  />
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.sm + 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs + 2,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuInfo: {
    flex: 1,
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
});

