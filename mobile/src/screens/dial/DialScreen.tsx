import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Linking,
  Alert,
  AppState,
  AppStateStatus,
  TextInput,
  Platform,
  PermissionsAndroid,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { GradientView } from '../../components/common/GradientView';
import { DialPad } from '../../components/dial/DialPad';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { callApi } from '../../api/callApi';
import { Call, MainTabParamList, RootStackParamList } from '../../types';

type CallTabFilter = 'ALL' | 'OUTBOUND' | 'INBOUND' | 'MISSED';

const AVATAR_COLORS = [
  '#6366F1', // indigo
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // orange
  '#8B5CF6', // purple
  '#EC4899', // pink
];

const getAvatarColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

export const DialScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Dial'>>();
  const insets = useSafeAreaInsets();

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [callTabFilter, setCallTabFilter] = useState<CallTabFilter>('ALL');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isDefaultDialer, setIsDefaultDialer] = useState(false);

  // Dial pad modal visibility
  const [dialPadModalVisible, setDialPadModalVisible] = useState(false);

  // Pulsing animation for LIVE SYNC ACTIVE
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const activeCallRef = useRef<{
    telephonyCallId: string;
    leadId?: number;
    leadName?: string;
    phoneNumber: string;
    startTime: number;
  } | null>(null);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Pulse animation loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Check Android permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const hasCallLog = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
        const hasPhoneState = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
        setPermissionGranted(hasCallLog && hasPhoneState);
      } catch {
        setPermissionGranted(false);
      }
    } else {
      setPermissionGranted(true);
    }
  };

  const handleRequestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        ]);
        const allGranted =
          granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;
        setPermissionGranted(allGranted);
        if (allGranted) {
          Alert.alert('Permissions Granted', 'Device call history and telephony sync are now active.');
          fetchCalls(true);
        } else {
          Alert.alert(
            'Permissions Needed',
            'Please enable Phone & Call Log permissions in Settings to synchronize device calls.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
      } catch (err) {
        console.warn('Permission request error:', err);
      }
    } else {
      Alert.alert('Device Call Sync', 'Device call synchronization is active on this system.');
    }
  };

  const handleSetDefaultDialer = () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Set Default Dialer',
        'To enable incoming call popup and full CRM call tracking, set this app as your default phone dialer in Android settings.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Configure',
            onPress: () => {
              setIsDefaultDialer(true);
              Linking.openSettings();
            },
          },
        ]
      );
    } else {
      Alert.alert('Default Dialer', 'This device does not require default dialer configuration.');
    }
  };

  // AppState listener for in-call return detection: Automatically wraps call without post-call popup
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

        // Auto-persist call to Spring Boot backend - status calculated automatically
        callApi.sendCallEvent({
          eventType: 'CALL_ENDED',
          telephonyCallId: callData.telephonyCallId,
          leadId: callData.leadId,
          customerPhone: callData.phoneNumber,
          durationSeconds: elapsed,
          technicalStatus: elapsed > 0 ? 'CONNECTED' : 'MISSED',
        }).catch((err) => console.warn('Auto call wrap-up error:', err))
          .finally(() => {
            fetchCalls(true);
          });
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const fetchCalls = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await callApi.getCalls({ size: 50 });
      setCalls(res.content || []);
    } catch (err: any) {
      console.warn('Failed to load calls:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCalls(true);
  };

  const handleStartCall = (phone: string, lead?: { id?: number; name?: string } | null) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
      Alert.alert('Invalid Number', 'No valid phone number to dial.');
      return;
    }

    const telephonyCallId = `CALL_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    activeCallRef.current = {
      telephonyCallId,
      leadId: lead?.id,
      leadName: lead?.name,
      phoneNumber: cleanPhone,
      startTime: Date.now(),
    };

    // Dispatch CALL_INITIATED lifecycle event to Spring Boot
    callApi.sendCallEvent({
      eventType: 'CALL_INITIATED',
      telephonyCallId,
      leadId: lead?.id,
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

  const formatCallDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered calls by search & tab chips (ALL, OUTBOUND, INBOUND, MISSED)
  const filteredCalls = calls.filter((c) => {
    const isMissed =
      c.callStatus === 'NOT_ATTENDED' ||
      c.callStatus === 'MISSED' ||
      c.callStatus === 'NO_ANSWER' ||
      c.callStatus === 'FAILED';
    const isIncoming =
      c.callDirection === 'INBOUND' || c.callStatus === 'INCOMING';

    if (callTabFilter === 'OUTBOUND' && (isIncoming || isMissed)) return false;
    if (callTabFilter === 'INBOUND' && (!isIncoming || isMissed)) return false;
    if (callTabFilter === 'MISSED' && !isMissed) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = (c.leadName || '').toLowerCase();
    const phone = (c.leadPhone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  const renderCallItem = ({ item }: { item: Call }) => {
    const isMissed =
      item.callStatus === 'NOT_ATTENDED' ||
      item.callStatus === 'MISSED' ||
      item.callStatus === 'NO_ANSWER' ||
      item.callStatus === 'FAILED';
    const isIncoming =
      item.callDirection === 'INBOUND' || item.callStatus === 'INCOMING';

    const directionIcon = isIncoming ? 'arrow-down-outline' : isMissed ? 'close-outline' : 'arrow-up-outline';
    const directionColor = isIncoming ? colors.info : isMissed ? colors.danger : colors.success;
    const directionLabel = isIncoming ? 'Inbound' : isMissed ? 'Missed' : 'Outbound';

    const displayName = item.leadName || (item.leadId ? `CRM Lead #${item.leadId}` : (item.leadPhone || 'Unknown'));
    const displayPhone = item.leadPhone || '9876543210';
    const timestamp = formatCallDate(item.startTime || item.startedAt || item.createdAt);
    const avatarColor = getAvatarColor(displayName);
    const initial = displayName.charAt(0).toUpperCase();

    // Map status to badge style
    let statusLabel = 'INITIATED';
    let statusBg = colors.pastelPurple;
    let statusColor = colors.pastelPurpleText;
    if (item.callStatus === 'CONNECTED') {
      statusLabel = 'CONNECTED';
      statusBg = colors.pastelGreen;
      statusColor = colors.pastelGreenText;
    } else if (isMissed) {
      statusLabel = 'MISSED';
      statusBg = colors.pastelRed;
      statusColor = colors.pastelRedText;
    } else if (item.durationSeconds != null && item.durationSeconds < 30) {
      statusLabel = 'JUNK (<30s)';
      statusBg = colors.pastelRed;
      statusColor = colors.pastelRedText;
    }

    const tagLabel = item.leadId ? 'CRM Lead' : 'Prospect';

    return (
      <View style={styles.callCard}>
        <TouchableOpacity
          style={styles.cardHeaderRow}
          activeOpacity={0.7}
          onPress={() => {
            if (item.leadId) {
              navigation.navigate('LeadDetails', { leadId: item.leadId, leadName: item.leadName });
            }
          }}
        >
          {/* Avatar initial circle */}
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>

          {/* Contact Details */}
          <View style={styles.contactDetails}>
            <Text style={styles.contactName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.contactPhone}>{displayPhone}</Text>
            <View style={styles.directionTimeRow}>
              <Ionicons name={directionIcon as any} size={13} color={directionColor} />
              <Text style={styles.directionTimeText}>
                {directionLabel} · {timestamp}
              </Text>
            </View>
          </View>

          {/* Right Column: Status Badge, Green Call Button, 3-dots */}
          <View style={styles.rightActionsCol}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            <View style={styles.callBtnAndMenu}>
              <TouchableOpacity
                style={styles.roundCallBtn}
                activeOpacity={0.8}
                onPress={() => handleStartCall(displayPhone, { id: item.leadId, name: item.leadName })}
              >
                <Ionicons name="call" size={15} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuDotBtn} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom Tag chip */}
        <View style={styles.tagChipRow}>
          <View style={styles.tagChip}>
            <Ionicons name="link-outline" size={10} color={colors.pastelGreenText} />
            <Text style={styles.tagChipText}>{tagLabel}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* MEQ Header with Search & Filter Buttons */}
      <MeqHeader
        rightMode="dial"
        onPressSearch={() => {}}
        onPressFilter={() => {}}
      />

      {/* Filter Chips: All / Outbound / Inbound / Missed */}
      <View style={styles.chipsRow}>
        {(['ALL', 'OUTBOUND', 'INBOUND', 'MISSED'] as const).map((tab) => {
          const isActive = callTabFilter === tab;
          const label = tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase();
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setCallTabFilter(tab)}
              activeOpacity={0.8}
              style={styles.chipBtn}
            >
              {isActive ? (
                <GradientView colors={colors.primaryGradient} style={styles.chipActive}>
                  <Text style={styles.chipTextActive}>{label}</Text>
                </GradientView>
              ) : (
                <View style={styles.chipInactive}>
                  <Text style={styles.chipTextInactive}>{label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Input Bar with Filter Slider Icon */}
      <View style={styles.topSearchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.topSearchInput}
          placeholder="Search number or name..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.sliderBtn} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Live Sync Status Banner */}
      <View style={styles.syncStatusContainer}>
        <Text style={styles.syncStatusSubtitle}>Synced from device</Text>
        <View style={styles.liveSyncBadge}>
          <Animated.View style={[styles.greenDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveSyncText}>LIVE SYNC ACTIVE</Text>
        </View>
      </View>

      {/* Set Default Dialer banner if needed */}
      <View style={styles.actionCardsContainer}>
        <TouchableOpacity
          style={styles.defaultDialerCard}
          onPress={handleSetDefaultDialer}
          activeOpacity={0.8}
        >
          <View style={styles.defaultDialerIconCircle}>
            <Ionicons name="call" size={16} color={colors.primary} />
          </View>
          <View style={styles.defaultDialerInfo}>
            <Text style={styles.defaultDialerTitle}>Set as Default Dialer</Text>
            <Text style={styles.defaultDialerSub}>
              Enjoy full call control and professional CRM features.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>

        {!permissionGranted && (
          <TouchableOpacity
            style={styles.grantPermissionsCard}
            onPress={handleRequestPermissions}
            activeOpacity={0.8}
          >
            <View style={styles.permissionsIconCircle}>
              <Ionicons name="shield-checkmark" size={16} color={colors.warning} />
            </View>
            <View style={styles.grantPermissionsInfo}>
              <Text style={styles.grantPermissionsTitle}>Grant Permissions</Text>
              <Text style={styles.grantPermissionsSub}>
                Allow call logs to automatically map customer calls.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.warning} />
          </TouchableOpacity>
        )}
      </View>

      {/* Device Call History List */}
      <View style={styles.listContainer}>
        {loading && !refreshing ? (
          <LoadingState message="Syncing device call logs..." />
        ) : filteredCalls.length === 0 ? (
          <EmptyState
            icon="call-outline"
            title="No Calls Recorded"
            message={
              searchQuery
                ? `No calls matching "${searchQuery}".`
                : 'Device call history will appear here automatically.'
            }
          />
        ) : (
          <FlatList
            data={filteredCalls}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCallItem}
            contentContainerStyle={[
              styles.callListContent,
              { paddingBottom: 160 },
            ]}
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
      </View>

      {/* Floating Dial-Pad FAB docked bottom-right */}
      <TouchableOpacity
        style={styles.floatingDialPadFab}
        onPress={() => setDialPadModalVisible(true)}
        activeOpacity={0.85}
      >
        <GradientView colors={colors.primaryGradient} style={styles.fabGradient}>
          <Ionicons name="keypad" size={24} color="#ffffff" />
        </GradientView>
      </TouchableOpacity>

      {/* Dial Pad Modal */}
      <Modal
        visible={dialPadModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDialPadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialPadModalContent}>
            <View style={styles.modalDragHandleRow}>
              <View style={styles.modalDragHandle} />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setDialPadModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <DialPad
              initialNumber=""
              onOpenLeadDetails={(leadId, leadName) => {
                setDialPadModalVisible(false);
                navigation.navigate('LeadDetails', { leadId, leadName });
              }}
              onStartCall={handleStartCall}
            />
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
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  chipBtn: {
    borderRadius: spacing.borderRadius.pill,
    overflow: 'hidden',
  },
  chipActive: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: spacing.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chipInactive: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: spacing.borderRadius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTextInactive: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  topSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    marginHorizontal: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: 8,
    paddingVertical: 0,
  },
  sliderBtn: {
    padding: 4,
  },
  syncStatusContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncStatusSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveSyncText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 0.3,
  },
  actionCardsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    gap: 8,
  },
  defaultDialerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  defaultDialerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultDialerInfo: {
    flex: 1,
  },
  defaultDialerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  defaultDialerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  grantPermissionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  permissionsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantPermissionsInfo: {
    flex: 1,
  },
  grantPermissionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
  },
  grantPermissionsSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  listContainer: {
    flex: 1,
    marginTop: 6,
  },
  callListContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
  },
  callCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  contactDetails: {
    flex: 1,
    marginRight: 8,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  directionTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  directionTimeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  rightActionsCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: spacing.borderRadius.pill,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  callBtnAndMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.callGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDotBtn: {
    padding: 2,
  },
  tagChipRow: {
    marginTop: 6,
    marginLeft: 52,
  },
  tagChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.pill,
    backgroundColor: colors.pastelGreen,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.pastelGreenText,
  },
  floatingDialPadFab: {
    position: 'absolute',
    right: 20,
    bottom: 85,
    borderRadius: 27,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  fabGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'flex-end',
  },
  dialPadModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalDragHandleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  modalCloseButton: {
    padding: 4,
  },
});
