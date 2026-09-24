import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { attendanceApi } from '../../api/attendanceApi';
import { colors } from '../../theme/colors';
import { startMobileEmergencyAlarm, stopMobileEmergencyAlarm } from '../../utils/alarmSound';

export const EmergencyCheckInModal: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOverdue, setIsOverdue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkIntervalRef = useRef<any>(null);
  const clockIntervalRef = useRef<any>(null);

  const shiftDisplayName = user?.shiftDisplayName || '10:00 AM – 07:00 PM';
  const shiftStartTime = user?.shiftStartTime || '10:00:00';

  // Pulse animation loop
  useEffect(() => {
    if (isOverdue) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isOverdue, pulseAnim]);

  const checkAttendance = async () => {
    if (!isAuthenticated || !user) return;
    try {
      const today = await attendanceApi.getTodayAttendance();
      if (!today) return;

      // If user is already clocked in or clocked out, no alert is needed
      if (today.clockedIn || today.clockedOut) {
        setIsOverdue(false);
        stopMobileEmergencyAlarm();
        return;
      }

      // Check if current time is past shift start time
      const now = new Date();
      const [startHours, startMinutes] = shiftStartTime.split(':').map(Number);
      const shiftStartDate = new Date();
      shiftStartDate.setHours(startHours || 10, startMinutes || 0, 0, 0);

      const isPastShiftStart = now.getTime() >= shiftStartDate.getTime();
      const shouldAlert = !today.clockedIn && !today.clockedOut && isPastShiftStart;

      setIsOverdue(shouldAlert);
      if (shouldAlert) {
        startMobileEmergencyAlarm();
      } else {
        stopMobileEmergencyAlarm();
      }
    } catch (e) {
      console.warn('Error checking attendance in EmergencyCheckInModal:', e);
    }
  };

  useEffect(() => {
    // Initial check
    checkAttendance();

    // Clock ticker every second
    clockIntervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 5-minute repeating check interval (300,000 ms)
    checkIntervalRef.current = setInterval(() => {
      checkAttendance();
    }, 300000);

    return () => {
      stopMobileEmergencyAlarm();
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    };
  }, [isAuthenticated, user, shiftStartTime]);

  useEffect(() => {
    if (isOverdue) {
      startMobileEmergencyAlarm();
    } else {
      stopMobileEmergencyAlarm();
    }
    return () => {
      stopMobileEmergencyAlarm();
    };
  }, [isOverdue]);

  const handleClockIn = async () => {
    setError(null);
    setSubmitting(true);
    stopMobileEmergencyAlarm();
    try {
      await attendanceApi.clockIn();
      setIsOverdue(false);
      stopMobileEmergencyAlarm();
      await checkAttendance();
    } catch (err: any) {
      setError(err.message || 'Unable to record check-in. Please try again.');
      startMobileEmergencyAlarm();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOverdue) {
    return null;
  }

  const formattedCurrentTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <Modal
      visible={isOverdue}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a0406" />
      <View style={styles.container}>
        {/* Glow backdrop circle */}
        <View style={styles.glowCircle} />

        {/* Warning Icon with Pulse */}
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="warning" size={54} color="#EF4444" />
        </Animated.View>

        {/* Header Badge */}
        <View style={styles.badgeRow}>
          <Ionicons name="alert-circle" size={15} color="#FCA5A5" />
          <Text style={styles.badgeText}>MANDATORY ATTENDANCE ALERT</Text>
        </View>

        {/* Urgent Titles */}
        <Text style={styles.mainTitle}>CHECK-IN REQUIRED</Text>
        <Text style={styles.subTitle}>
          You have not checked in for today's shift. Check-in is required to continue using the application.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Shift Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>YOUR ASSIGNED SHIFT</Text>
            <Text style={styles.infoValue}>{shiftDisplayName}</Text>
          </View>

          <View style={styles.dividerVertical} />

          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>CURRENT TIME</Text>
            <View style={styles.timeRow}>
              <Ionicons name="time" size={14} color="#EF4444" />
              <Text style={styles.timeValue}>{formattedCurrentTime}</Text>
            </View>
          </View>
        </View>

        {/* Check In Action Button */}
        <TouchableOpacity
          style={[styles.checkInBtn, submitting && styles.checkInBtnDisabled]}
          onPress={handleClockIn}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.checkInBtnText}>RECORDING CHECK-IN...</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.checkInBtnText}>CHECK IN NOW</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120204',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glowCircle: {
    position: 'absolute',
    top: '15%',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 13,
    color: '#FECACA',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  errorBox: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    marginBottom: 16,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 12,
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(26, 7, 10, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  infoCol: {
    flex: 1,
  },
  dividerVertical: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    marginHorizontal: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  checkInBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  checkInBtnDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
