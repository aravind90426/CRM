import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { callApi } from '../../api/callApi';
import { Call, CallEventPayload } from '../../types';

interface CallWrapUpModalProps {
  visible: boolean;
  leadId?: number;
  leadName?: string;
  phoneNumber: string;
  telephonyCallId: string;
  initialDurationSeconds: number;
  onClose: () => void;
  onCompleted: (call: Call) => void;
}

const OUTCOMES = [
  { id: 'CONNECTED', label: 'Connected', icon: 'checkmark-circle' },
  { id: 'MISSED', label: 'Missed / No Answer', icon: 'close-circle' },
  { id: 'REJECTED', label: 'Busy / Rejected', icon: 'remove-circle' },
  { id: 'CANCELLED', label: 'Cancelled', icon: 'ban' },
];

const CLASSIFICATIONS = [
  { id: 'INTERESTED', label: 'Interested', color: '#10b981' },
  { id: 'FOLLOW_UP', label: 'Follow-up Required', color: '#f59e0b' },
  { id: 'NOT_INTERESTED', label: 'Not Interested', color: '#ef4444' },
  { id: 'JUNK', label: 'Junk / Spam', color: '#6b7280' },
  { id: 'SALE', label: 'Sale Closed', color: '#8b5cf6' },
];

export const CallWrapUpModal: React.FC<CallWrapUpModalProps> = ({
  visible,
  leadId,
  leadName,
  phoneNumber,
  telephonyCallId,
  initialDurationSeconds,
  onClose,
  onCompleted,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [technicalStatus, setTechnicalStatus] = useState<string>('CONNECTED');
  const [durationSeconds, setDurationSeconds] = useState<number>(initialDurationSeconds);
  const [businessClassification, setBusinessClassification] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpDays, setFollowUpDays] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setDurationSeconds(initialDurationSeconds);

    if (initialDurationSeconds <= 0) {
      setTechnicalStatus('MISSED');
      setBusinessClassification('MISSED');
    } else {
      setTechnicalStatus('CONNECTED');
      if (initialDurationSeconds <= 30) {
        setBusinessClassification('VERY_SHORT');
      } else if (initialDurationSeconds <= 60) {
        setBusinessClassification('SHORT_CALL');
      } else {
        setBusinessClassification('CONNECTED');
      }
    }
  }, [initialDurationSeconds, visible]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      let followUpDate: string | undefined = undefined;
      if (followUpRequired) {
        const d = new Date();
        d.setDate(d.getDate() + followUpDays);
        d.setHours(10, 0, 0, 0); // default 10:00 AM
        followUpDate = d.toISOString();
      }

      const payload: CallEventPayload = {
        eventType: 'CALL_ENDED',
        telephonyCallId,
        leadId,
        customerPhone: phoneNumber,
        durationSeconds: technicalStatus === 'CONNECTED' ? Math.max(1, durationSeconds) : 0,
        technicalStatus,
        businessClassification: businessClassification || technicalStatus,
        notes: notes.trim() || undefined,
        followUpRequired,
        followUpDate,
        followUpNotes: followUpRequired ? `Follow up on call outcome: ${businessClassification}` : undefined,
      };

      const result = await callApi.sendCallEvent(payload);
      onCompleted(result);
    } catch (err: any) {
      console.warn('Failed to submit call wrap-up event:', err);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const modalHeight = Math.min(
    Math.max(screenHeight * 0.85, 450),
    620,
    screenHeight - (insets.top + insets.bottom + 20)
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheetContainer,
            { height: modalHeight },
          ]}
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.callIconBox}>
                <Ionicons name="call" size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {leadName || 'Customer Call'}
                </Text>
                <Text style={styles.sheetPhone}>{phoneNumber}</Text>
              </View>
            </View>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={styles.durationText}>{formatDuration(durationSeconds)}</Text>
            </View>
          </View>

          {/* Body: flex: 1, minHeight: 0 */}
          <View style={{ flex: 1, minHeight: 0, width: '100%' }}>
            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={styles.scrollArea}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
            {/* Step 1: Technical Outcome */}
            <Text style={styles.sectionLabel}>Call Technical Result</Text>
            <View style={styles.chipRow}>
              {OUTCOMES.map((item) => {
                const isSelected = technicalStatus === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.statusChip, isSelected && styles.statusChipActive]}
                    onPress={() => {
                      setTechnicalStatus(item.id);
                      if (item.id !== 'CONNECTED') {
                        setBusinessClassification(item.id);
                      } else {
                        setBusinessClassification(durationSeconds <= 30 ? 'VERY_SHORT' : 'CONNECTED');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={14}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Step 2: Business Classification (if connected) */}
            {technicalStatus === 'CONNECTED' && (
              <View style={styles.classificationSection}>
                <View style={styles.subHeaderRow}>
                  <Text style={styles.sectionLabel}>Business Classification</Text>
                  <Text style={styles.suggestionTag}>
                    Suggested: {durationSeconds <= 30 ? 'Very Short' : durationSeconds <= 60 ? 'Short Call' : 'Connected'}
                  </Text>
                </View>

                <View style={styles.chipGrid}>
                  {CLASSIFICATIONS.map((c) => {
                    const isSelected = businessClassification === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.classChip,
                          isSelected && { borderColor: c.color, backgroundColor: `${c.color}20` },
                        ]}
                        onPress={() => {
                          setBusinessClassification(c.id);
                          if (c.id === 'FOLLOW_UP') {
                            setFollowUpRequired(true);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.dot, { backgroundColor: c.color }]} />
                        <Text style={[styles.classChipText, isSelected && { color: c.color, fontWeight: '700' }]}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Step 3: Follow-up Checkbox & Quick Days */}
            <View style={styles.followUpCard}>
              <TouchableOpacity
                style={styles.followUpToggleRow}
                onPress={() => setFollowUpRequired(!followUpRequired)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={followUpRequired ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={followUpRequired ? colors.warning : colors.textMuted}
                />
                <Text style={styles.followUpToggleText}>Schedule Follow-up Call</Text>
              </TouchableOpacity>

              {followUpRequired && (
                <View style={styles.daysRow}>
                  {[
                    { label: 'Tomorrow', days: 1 },
                    { label: 'In 2 Days', days: 2 },
                    { label: 'In 3 Days', days: 3 },
                    { label: 'In 1 Week', days: 7 },
                  ].map((d) => (
                    <TouchableOpacity
                      key={d.days}
                      style={[styles.dayPill, followUpDays === d.days && styles.dayPillActive]}
                      onPress={() => setFollowUpDays(d.days)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayPillText, followUpDays === d.days && styles.dayPillTextActive]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Step 4: Notes */}
            <Text style={styles.sectionLabel}>Call Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Discussed pricing plan, customer requested proposal by email..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </ScrollView>
          </View>

          {/* Action Footer — FIXED sticky footer below ScrollView */}
          <View style={[styles.footerActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                  <Text style={styles.saveBtnText}>Save & Sync</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  callIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.callGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sheetPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  scrollArea: {
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  classificationSection: {
    marginBottom: spacing.md,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionTag: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  classChipText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  followUpCard: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  followUpToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followUpToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPillActive: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  dayPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayPillTextActive: {
    color: colors.warning,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 65,
    marginBottom: spacing.sm,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    flexShrink: 0,
    minHeight: 70,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    backgroundColor: '#F8FAFC',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
