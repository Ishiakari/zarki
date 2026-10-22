import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/colors';
import { CalculatorKeypad } from './CalculatorKeypad';
import { parseCalculatorValue } from '../domain/calculatorEngine';

export interface CalculatorModalProps {
  visible: boolean;
  initialValue?: string | number;
  currency?: string;
  title?: string;
  onClose: () => void;
  onApply?: (value: number, formatted: string) => void;
  onQuickTransaction?: (type: 'expense' | 'income', amount: number) => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  visible,
  initialValue = '0',
  currency = 'PHP',
  title = 'Calculator',
  onClose,
  onApply,
  onQuickTransaction,
}) => {
  const [currentValue, setCurrentValue] = useState<number>(0);

  const handleApply = (val: number, formatted: string) => {
    onApply?.(val, formatted);
    onClose();
  };

  const handleQuickAdd = (type: 'expense' | 'income') => {
    if (currentValue > 0) {
      onQuickTransaction?.(type, currentValue);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Sheet Handle */}
              <View style={styles.handleContainer}>
                <View style={styles.handleBar} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Pressable
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>

              {/* Keypad */}
              <CalculatorKeypad
                currency={currency}
                initialValue={initialValue}
                onApply={handleApply}
                onValueChange={(val) => setCurrentValue(val)}
                showFooterAction={!onQuickTransaction}
                footerActionLabel="Apply Amount"
              />

              {/* Standalone Quick Transaction Actions */}
              {onQuickTransaction && (
                <View style={styles.quickActionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.quickActionBtn,
                      { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
                      pressed && { opacity: 0.8 },
                    ]}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
                    onPress={() => handleQuickAdd('expense')}
                  >
                    <Ionicons name="arrow-down" size={16} color={theme.danger} />
                    <Text style={[styles.quickActionText, { color: theme.danger }]}>
                      Add Expense
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.quickActionBtn,
                      { backgroundColor: theme.primarySoft, borderColor: theme.primary },
                      pressed && { opacity: 0.8 },
                    ]}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
                    onPress={() => handleQuickAdd('income')}
                  >
                    <Ionicons name="arrow-up" size={16} color={theme.primary} />
                    <Text style={[styles.quickActionText, { color: theme.primary }]}>
                      Add Income
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.surface1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
