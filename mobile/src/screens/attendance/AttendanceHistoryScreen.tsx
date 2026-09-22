import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Header } from '../../components/common/Header';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { attendanceApi } from '../../api/attendanceApi';
import { AttendanceMonthlyResponse, Attendance } from '../../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const AttendanceHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [monthlyData, setMonthlyData] = useState<AttendanceMonthlyResponse | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(today.getDate());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthly = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.getMonthlyAttendance(currentYear, currentMonth);
      setMonthlyData(data);

      // Auto-select today's record if in current month
      const match = data.records?.find((r) => {
        const d = new Date(r.date).getDate();
        return d === selectedDayNumber;
      });
      setSelectedRecord(match || null);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch monthly attendance.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentYear, currentMonth, selectedDayNumber]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMonthly(true);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Calendar computation
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();

  const handleSelectDay = (day: number) => {
    setSelectedDayNumber(day);
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = monthlyData?.records?.find((r) => r.date === dateStr);
    setSelectedRecord(record || null);
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr.slice(11, 16);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <Header
        title="Attendance History"
        subtitle="Monthly logs & performance summary"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
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
        {/* Month Navigator Header */}
        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <LoadingState message="Loading attendance history..." fullScreen />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchMonthly()} />
        ) : (
          <>
            {/* Monthly Summary Cards Grid */}
            <View style={styles.summaryGrid}>
              <Card style={styles.summaryCard}>
                <Text style={[styles.summaryCount, { color: colors.success }]}>
                  {monthlyData?.presentDays || 0}
                </Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </Card>

              <Card style={styles.summaryCard}>
                <Text style={[styles.summaryCount, { color: colors.warning }]}>
                  {monthlyData?.halfDays || 0}
                </Text>
                <Text style={styles.summaryLabel}>Half Days</Text>
              </Card>

              <Card style={styles.summaryCard}>
                <Text style={[styles.summaryCount, { color: colors.danger }]}>
                  {monthlyData?.leaveDays || 0}
                </Text>
                <Text style={styles.summaryLabel}>Leaves</Text>
              </Card>

              <Card style={styles.summaryCard}>
                <Text style={[styles.summaryCount, { color: colors.primary }]}>
                  {monthlyData?.totalWorkingHours || 0}h
                </Text>
                <Text style={styles.summaryLabel}>Total Hours</Text>
              </Card>
            </View>

            {/* Calendar View Card */}
            <Card style={styles.calendarCard}>
              {/* Day Headers (Sun - Sat) */}
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((d) => (
                  <Text key={d} style={styles.weekdayText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Day Cells Grid */}
              <View style={styles.daysGrid}>
                {/* Empty cells before month start */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const record = monthlyData?.records?.find((r) => r.date === dateStr);
                  const isSelected = selectedDayNumber === day;

                  let statusDotColor: string | null = null;
                  if (record) {
                    if (record.status === 'PRESENT') statusDotColor = colors.success;
                    else if (record.status === 'HALF_DAY') statusDotColor = colors.warning;
                    else if (record.status === 'LEAVE') statusDotColor = colors.danger;
                    else if (record.status === 'HOLIDAY') statusDotColor = colors.info;
                  }

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                      ]}
                      onPress={() => handleSelectDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                      {statusDotColor && (
                        <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.legendText}>Present</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                  <Text style={styles.legendText}>Half Day</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.legendText}>Leave</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
                  <Text style={styles.legendText}>Holiday</Text>
                </View>
              </View>
            </Card>

            {/* Selected Date Detail Drawer */}
            <Card style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailDateText}>
                    {MONTH_NAMES[currentMonth - 1]} {selectedDayNumber}, {currentYear}
                  </Text>
                  <Text style={styles.detailSubText}>Daily Attendance Breakdown</Text>
                </View>
                <Badge
                  label={selectedRecord ? selectedRecord.status : 'No Record'}
                  status={selectedRecord ? selectedRecord.status : 'neutral'}
                />
              </View>

              {selectedRecord ? (
                <View style={styles.detailMetricsRow}>
                  <View style={styles.detailMetric}>
                    <Text style={styles.detailMetricLabel}>Clock In</Text>
                    <Text style={styles.detailMetricValue}>
                      {formatTime(selectedRecord.clockInTime)}
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.detailMetric}>
                    <Text style={styles.detailMetricLabel}>Clock Out</Text>
                    <Text style={styles.detailMetricValue}>
                      {formatTime(selectedRecord.clockOutTime)}
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.detailMetric}>
                    <Text style={styles.detailMetricLabel}>Duration</Text>
                    <Text style={[styles.detailMetricValue, { color: colors.primary }]}>
                      {Math.floor((selectedRecord.durationMinutes || 0) / 60)}h{' '}
                      {(selectedRecord.durationMinutes || 0) % 60}m
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noRecordContainer}>
                  <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                  <Text style={styles.noRecordText}>No attendance logged for this date.</Text>
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButton: {
    padding: spacing.xs,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceCard,
    marginBottom: 0,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  calendarCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: spacing.borderRadius.sm,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  detailCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceCard,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailDateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  detailMetricsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  detailMetric: {
    alignItems: 'center',
    flex: 1,
  },
  detailMetricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  detailMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  noRecordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
  },
  noRecordText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
