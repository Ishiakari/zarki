import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account, Category, TransactionType } from '../types';
import { theme, typography } from '../theme/colors';
import { CalculatorModal } from '../components/CalculatorModal';

const CATEGORY_COLORS = [
  '#508A59', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4', '#10B981', '#F43F5E', '#D97706'
];

const AVAILABLE_CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'cart-outline', 'restaurant-outline', 'cafe-outline', 'car-outline', 'flash-outline',
  'wifi-outline', 'home-outline', 'bag-handle-outline', 'medkit-outline', 'sparkles-outline',
  'film-outline', 'school-outline', 'people-outline', 'shield-checkmark-outline', 'paw-outline',
  'cash-outline', 'laptop-outline', 'storefront-outline', 'trending-up-outline', 'wallet-outline',
  'gift-outline', 'fitness-outline', 'airplane-outline', 'book-outline', 'game-controller-outline'
];

interface AddTransactionModalProps {
  visible: boolean;
  initialType?: TransactionType;
  initialAmount?: number;
  currency?: string;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (data: {
    type: TransactionType;
    amount: number;
    accountId: string;
    toAccountId?: string;
    categoryId: string;
    date: string;
    note?: string;
  }) => void;
  onAddCategory?: (category: Omit<Category, 'id'>) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  initialType = 'expense',
  initialAmount,
  currency = 'PHP',
  onClose,
  accounts,
  categories,
  onAddTransaction,
  onAddCategory,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState(initialAmount ? String(initialAmount) : '');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [note, setNote] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Custom Category State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [customCatColor, setCustomCatColor] = useState(CATEGORY_COLORS[0]);
  const [customCatIcon, setCustomCatIcon] = useState<keyof typeof Ionicons.glyphMap>('pricetag-outline');

  useEffect(() => {
    if (visible) {
      setType(initialType);
      if (initialAmount !== undefined) {
        setAmountStr(String(initialAmount));
      }
    }
  }, [visible, initialType, initialAmount]);

  const filteredCategories = categories.filter(c => c.kind === (type === 'income' ? 'income' : 'expense'));

  const handleCreateCustomCategory = () => {
    if (!customCatName.trim()) return;
    const kind = type === 'income' ? 'income' : 'expense';
    onAddCategory?.({
      label: customCatName.trim(),
      icon: customCatIcon,
      color: customCatColor,
      kind,
    });
    setCustomCatName('');
    setIsCreatingCategory(false);
  };

  const handleSave = () => {
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) return;

    onAddTransaction({
      type,
      amount: num,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'transfer' ? 'transfer' : categoryId,
      date: new Date().toISOString().split('T')[0],
      note: note.trim() || undefined,
    });

    setAmountStr('');
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidContainer}
          >
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>New Transaction</Text>
                <Pressable
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>

              {/* Type Selector (Tarsi Segmented Switcher) */}
              <View style={styles.typeSelector}>
                {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => {
                  const isActive = type === t;
                  const activeColor = t === 'expense' ? theme.danger : t === 'income' ? theme.primary : '#38BDF8';
                  return (
                    <Pressable
                      key={t}
                      style={({ pressed }) => [
                        styles.typeBtn,
                        isActive && { backgroundColor: activeColor },
                        pressed && !isActive && { opacity: 0.7 },
                      ]}
                      android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
                      onPress={() => setType(t)}
                    >
                      <Text style={[styles.typeBtnText, isActive && styles.typeBtnTextActive]}>
                        {t.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Amount Input with Calculator */}
              <View style={styles.inputContainer}>
                <View style={styles.amountLabelRow}>
                  <Text style={styles.inputLabel}>Amount</Text>
                  <Pressable
                    style={({ pressed }) => [styles.calculatorBadge, pressed && { opacity: 0.7 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => setIsCalculatorOpen(true)}
                  >
                    <Ionicons name="calculator-outline" size={14} color={theme.primary} />
                    <Text style={styles.calculatorBadgeText}>Calculator</Text>
                  </Pressable>
                </View>
                <View style={styles.amountInputRow}>
                  <Text style={styles.amountCurrencyPrefix}>
                    {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency}
                  </Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    value={amountStr}
                    onChangeText={setAmountStr}
                  />
                  <Pressable
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={({ pressed }) => [styles.amountCalcIconBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setIsCalculatorOpen(true)}
                  >
                    <Ionicons name="calculator-outline" size={22} color={theme.primary} />
                  </Pressable>
                </View>
              </View>

              {/* Account Selector */}
              <Text style={styles.inputLabel}>
                {type === 'transfer' ? 'From Account' : 'Account'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollPills}>
                {accounts.map(acc => {
                  const isSelected = accountId === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      style={({ pressed }) => [
                        styles.pill,
                        isSelected && styles.pillActive,
                        pressed && { opacity: 0.75 },
                      ]}
                      android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
                      onPress={() => setAccountId(acc.id)}
                    >
                      <View style={[styles.pillDot, { backgroundColor: acc.color }]} />
                      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                        {acc.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Destination Account for Transfer */}
              {type === 'transfer' && (
                <>
                  <Text style={styles.inputLabel}>To Account</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollPills}>
                    {accounts.map(acc => {
                      const isSelected = toAccountId === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          style={({ pressed }) => [
                            styles.pill,
                            isSelected && styles.pillActive,
                            pressed && { opacity: 0.75 },
                          ]}
                          android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
                          onPress={() => setToAccountId(acc.id)}
                        >
                          <View style={[styles.pillDot, { backgroundColor: acc.color }]} />
                          <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                            {acc.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Category Selector */}
              {type !== 'transfer' && (
                <>
                  <View style={styles.categoryHeaderRow}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <Pressable
                      style={styles.addCategoryBtn}
                      hitSlop={8}
                      onPress={() => setIsCreatingCategory(true)}
                    >
                      <Ionicons name="add-circle-outline" size={15} color={theme.primary} />
                      <Text style={styles.addCategoryBtnText}>New Category</Text>
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollPills}>
                    {filteredCategories.map(cat => {
                      const isSelected = categoryId === cat.id;
                      const iconName = (cat.icon || (type === 'income' ? 'trending-up-outline' : 'pricetag-outline')) as keyof typeof Ionicons.glyphMap;
                      return (
                        <Pressable
                          key={cat.id}
                          style={({ pressed }) => [
                            styles.pill,
                            isSelected && styles.pillActive,
                            pressed && { opacity: 0.75 },
                          ]}
                          android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
                          onPress={() => setCategoryId(cat.id)}
                        >
                          <Ionicons
                            name={iconName}
                            size={15}
                            color={isSelected ? '#FFFFFF' : cat.color || theme.primary}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                            {cat.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Custom Category Quick Creator (Tarsi Pro Style) */}
              {isCreatingCategory && (
                <View style={styles.newCatCard}>
                  <Text style={styles.newCatTitle}>
                    Create Custom {type === 'income' ? 'Income' : 'Expense'} Category
                  </Text>
                  <TextInput
                    style={styles.newCatInput}
                    placeholder="Category name (e.g. Gym, Pet Food)"
                    placeholderTextColor={theme.textMuted}
                    value={customCatName}
                    onChangeText={setCustomCatName}
                  />

                  {/* Icon Selector Carousel */}
                  <Text style={styles.newCatSubLabel}>Select Icon</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPickerScroll}>
                    {AVAILABLE_CATEGORY_ICONS.map(ic => {
                      const isIconSelected = customCatIcon === ic;
                      return (
                        <Pressable
                          key={ic}
                          style={[
                            styles.iconChip,
                            isIconSelected && { backgroundColor: `${customCatColor}33`, borderColor: customCatColor },
                          ]}
                          onPress={() => setCustomCatIcon(ic)}
                        >
                          <Ionicons
                            name={ic}
                            size={18}
                            color={isIconSelected ? customCatColor : theme.textSecondary}
                          />
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Color Palette Selector */}
                  <Text style={[styles.newCatSubLabel, { marginTop: 10 }]}>Select Color</Text>
                  <View style={styles.colorPaletteRow}>
                    {CATEGORY_COLORS.map(c => (
                      <Pressable
                        key={c}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c },
                          customCatColor === c && styles.colorCircleActive,
                        ]}
                        onPress={() => setCustomCatColor(c)}
                      />
                    ))}
                  </View>

                  <View style={styles.newCatActions}>
                    <Pressable
                      style={styles.newCatCancelBtn}
                      onPress={() => {
                        setIsCreatingCategory(false);
                        setCustomCatName('');
                      }}
                    >
                      <Text style={styles.newCatCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.newCatSaveBtn} onPress={handleCreateCustomCategory}>
                      <Text style={styles.newCatSaveText}>Save Category</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Note Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Note (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Lunch, Coffee, Gas"
                  placeholderTextColor={theme.textMuted}
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                ]}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>Save Transaction</Text>
              </Pressable>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      {/* Tarsi Interactive Calculator Keypad Bottom Sheet */}
      <CalculatorModal
        visible={isCalculatorOpen}
        initialValue={amountStr || '0'}
        currency={currency}
        title="Enter Amount"
        onClose={() => setIsCalculatorOpen(false)}
        onApply={(_val, formatted) => {
          setAmountStr(formatted);
          setIsCalculatorOpen(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidContainer: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitle: {
    color: theme.text,
    fontSize: typography.title2.fontSize,
    lineHeight: typography.title2.lineHeight,
    fontWeight: typography.title2.fontWeight,
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#0A0E0D',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  typeBtn: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  typeBtnText: {
    color: theme.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: theme.primarySoft,
  },
  calculatorBadgeText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  amountCalcIconBtn: {
    padding: 6,
    marginLeft: 6,
    borderRadius: 10,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    color: theme.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0E0D',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  amountCurrencyPrefix: {
    color: theme.primary,
    fontSize: 28,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  textInput: {
    backgroundColor: '#0A0E0D',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    color: theme.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  scrollPills: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0E0D',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: 12,
    marginRight: 8,
  },
  pillActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pillText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCategoryBtnText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  newCatCard: {
    backgroundColor: '#0F1614',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 16,
  },
  newCatTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  newCatInput: {
    backgroundColor: '#0A0E0D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 10,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  newCatSubLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  iconPickerScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0A0E0D',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  newCatActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  newCatCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  newCatCancelText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  newCatSaveBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newCatSaveText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
});
