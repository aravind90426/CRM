import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { followUpApi } from '../../api/followUpApi';

interface FollowUpModalProps {
  visible: boolean;
  leadId: number;
  leadName?: string;
  onClose: () => void;
  onScheduled?: () => void;
  onFollowUpCreated?: () => void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  visible,
  leadId,
  leadName,
  onClose,
  onScheduled,
  onFollowUpCreated,
}) => {
  // Default tomorrow at 10:00 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [dateStr, setDateStr] = useState(defaultDate);
  const [timeStr, setTimeStr] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!dateStr.trim() || !timeStr.trim()) {
      Alert.alert('Validation Error', 'Please specify both follow-up date and time.');
      return;
    }

    // Ensure format YYYY-MM-DDTHH:mm:ss for backend LocalDateTime parser
    const scheduledTime = `${dateStr.trim()}T${timeStr.trim()}:00`;

    setSubmitting(true);
    try {
      await followUpApi.createFollowUp({
        leadId,
        scheduledTime,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Follow-up scheduled successfully.');
      if (onScheduled) onScheduled();
      else if (onFollowUpCreated) onFollowUpCreated();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule follow-up.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Schedule Follow-up</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {leadName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Input
              label="Follow-up Date (YYYY-MM-DD)"
              placeholder="e.g. 2026-09-20"
              value={dateStr}
              onChangeText={setDateStr}
              leftIcon="calendar-outline"
            />

            <Input
              label="Follow-up Time (HH:MM 24h format)"
              placeholder="e.g. 14:30"
              value={timeStr}
              onChangeText={setTimeStr}
              leftIcon="time-outline"
            />

            {/* Quick Suggestions for time */}
            <View style={styles.quickTimeRow}>
              {['10:00', '12:00', '15:00', '17:30'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.quickTimeChip, timeStr === t && styles.quickTimeChipActive]}
                  onPress={() => setTimeStr(t)}
                >
                  <Text
                    style={[
                      styles.quickTimeText,
                      timeStr === t && styles.quickTimeTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Agenda & Follow-up Notes"
              placeholder="e.g. Demo presentation, price negotiation..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              style={styles.footerBtn}
            />
            <Button
              title="Schedule"
              variant="primary"
              onPress={handleSave}
              loading={submitting}
              style={styles.footerBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: spacing.borderRadius.xl,
    borderTopRightRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollBody: {
    marginBottom: spacing.md,
  },
  quickTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickTimeChip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTimeChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  quickTimeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quickTimeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerBtn: {
    flex: 1,
  },
});
