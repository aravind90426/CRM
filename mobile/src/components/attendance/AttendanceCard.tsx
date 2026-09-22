import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { GradientView } from '../common/GradientView';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Attendance } from '../../types';
import { attendanceApi } from '../../api/attendanceApi';
import { useAuth } from '../../context/AuthContext';

interface AttendanceCardProps {
  initialAttendance?: Attendance | null;
  onViewHistory?: () => void;
  onAttendanceUpdated?: (attendance: Attendance) => void;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  initialAttendance,
  onViewHistory,
  onAttendanceUpdated,
}) => {
  const { isAuthenticated, token, isLoading: authLoading } = useAuth();
  const [attendance, setAttendance] = useState<Attendance | null>(initialAttendance || null);
  const [loadingAction, setLoadingAction] = useState<'clockIn' | 'clockOut' | null>(null);
  const [liveDuration, setLiveDuration] = useState<string>('0h 0m');

  useEffect(() => {
    if (initialAttendance) {
      setAttendance(initialAttendance);
    } else if (isAuthenticated && token && !authLoading) {
      fetchToday();
    }
  }, [initialAttendance, isAuthenticated, token, authLoading]);

  const fetchToday = async () => {
    if (!isAuthenticated || !token || authLoading) return;
    try {
      const data = await attendanceApi.getTodayAttendance();
      setAttendance(data);
      if (onAttendanceUpdated) onAttendanceUpdated(data);
    } catch (e: any) {
      console.warn('Failed to load today attendance:', e?.message || e);
    }
  };

  // Live duration ticker if clocked in and not clocked out
  useEffect(() => {
    if (attendance?.clockInTime && !attendance?.clockOutTime) {
      const updateDuration = () => {
        const start = new Date(attendance.clockInTime!).getTime();
        const now = Date.now();
        const diffMinutes = Math.max(0, Math.floor((now - start) / (1000 * 60)));
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        setLiveDuration(`${hours}h ${mins}m`);
      };

      updateDuration();
      const interval = setInterval(updateDuration, 60000); // every minute
      return () => clearInterval(interval);
    } else if (attendance?.durationMinutes != null && attendance?.durationMinutes > 0) {
      const hours = Math.floor(attendance.durationMinutes / 60);
      const mins = attendance.durationMinutes % 60;
      setLiveDuration(`${hours}h ${mins}m`);
    } else {
      setLiveDuration('0h 0m');
    }
  }, [attendance]);

  const handleClockIn = async () => {
    setLoadingAction('clockIn');
    try {
      const updated = await attendanceApi.clockIn();
      setAttendance(updated);
      if (onAttendanceUpdated) onAttendanceUpdated(updated);
      Alert.alert('Success', 'Clocked in successfully. Have a productive day!');
    } catch (err: any) {
      Alert.alert('Clock In Failed', err.message || 'Unable to clock in.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClockOut = async () => {
    Alert.alert(
      'Confirm Clock Out',
      'Are you sure you want to clock out for today?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          style: 'destructive',
          onPress: async () => {
            setLoadingAction('clockOut');
            try {
              const updated = await attendanceApi.clockOut();
              setAttendance(updated);
              if (onAttendanceUpdated) onAttendanceUpdated(updated);
              Alert.alert('Success', `Clocked out successfully. Total working duration: ${liveDuration}`);
            } catch (err: any) {
              Alert.alert('Clock Out Failed', err.message || 'Unable to clock out.');
            } finally {
              setLoadingAction(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr.slice(11, 16);
    }
  };

  const isClockedIn = !!attendance?.clockInTime;
  const isClockedOut = !!attendance?.clockOutTime;

  return (
    <GradientView
      colors={colors.heroAttendanceGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Top Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="time" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Today's Attendance</Text>
        </View>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.workingBadge,
              isClockedOut
                ? styles.badgeCompleted
                : isClockedIn
                ? styles.badgeWorking
                : styles.badgeNotClocked,
            ]}
          >
            <Text style={styles.workingBadgeText}>
              {isClockedOut
                ? attendance?.status === 'HALF_DAY'
                  ? 'Half Day'
                  : 'Completed'
                : isClockedIn
                ? 'Working'
                : 'Not Clocked In'}
            </Text>
          </View>

          {onViewHistory && (
            <TouchableOpacity onPress={onViewHistory} style={styles.historyBtn} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={15} color="rgba(255, 255, 255, 0.85)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3-Column White Punch Strip */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Clock In</Text>
          <Text style={styles.metricValue}>{formatTime(attendance?.clockInTime)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Clock Out</Text>
          <Text style={styles.metricValue}>{formatTime(attendance?.clockOutTime)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Duration</Text>
          <Text style={styles.metricValue}>{liveDuration}</Text>
        </View>
      </View>

      {/* Bottom Buttons Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            isClockedIn && styles.secondaryBtnDisabled,
          ]}
          onPress={handleClockIn}
          disabled={isClockedIn || loadingAction !== null}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isClockedIn ? 'checkmark-circle-outline' : 'enter-outline'}
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.secondaryBtnText}>
            {loadingAction === 'clockIn' ? 'Punching...' : isClockedIn ? 'Clocked In' : 'Clock In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.clockOutBtn,
            (!isClockedIn || isClockedOut) && styles.clockOutBtnDisabled,
          ]}
          onPress={handleClockOut}
          disabled={!isClockedIn || isClockedOut || loadingAction !== null}
          activeOpacity={0.8}
        >
          <Ionicons name="exit-outline" size={16} color="#FFFFFF" />
          <Text style={styles.clockOutBtnText}>
            {loadingAction === 'clockOut' ? 'Processing...' : isClockedOut ? 'Clocked Out' : 'Clock Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </GradientView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.pill,
  },
  badgeWorking: {
    backgroundColor: '#10B981',
  },
  badgeCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeNotClocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  workingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  historyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryBtnDisabled: {
    opacity: 0.85,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  clockOutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#9333EA',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  clockOutBtnDisabled: {
    opacity: 0.6,
  },
  clockOutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
