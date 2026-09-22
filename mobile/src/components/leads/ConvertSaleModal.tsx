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
import { salesApi } from '../../api/salesApi';

interface ConvertSaleModalProps {
  visible: boolean;
  leadId: number;
  leadName: string;
  onClose: () => void;
  onConverted: () => void;
}

export const ConvertSaleModal: React.FC<ConvertSaleModalProps> = ({
  visible,
  leadId,
  leadName,
  onClose,
  onConverted,
}) => {
  const [dealValue, setDealValue] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConvert = async () => {
    const val = parseFloat(dealValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid deal value.');
      return;
    }

    setSubmitting(true);
    try {
      await salesApi.convertLead({
        leadId,
        dealValue: val,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Congratulations! 🎉', `Lead ${leadName} successfully converted to a Sale!`);
      onConverted();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to convert lead.');
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
              <Text style={styles.modalTitle}>Convert to Sale</Text>
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
              label="Deal Value (₹)"
              placeholder="e.g. 25000"
              value={dealValue}
              onChangeText={setDealValue}
              keyboardType="numeric"
              leftIcon="cash-outline"
            />

            <Input
              label="Sale Notes & Plan Details"
              placeholder="Payment method, plan term, etc..."
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
              title="Confirm Sale"
              variant="success"
              onPress={handleConvert}
              loading={submitting}
              style={styles.footerBtn}
              icon={<Ionicons name="checkmark-circle" size={18} color="#ffffff" />}
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
    maxHeight: '80%',
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
  textArea: {
    height: 80,
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
