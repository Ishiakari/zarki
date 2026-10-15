import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Platform,
  UIManager,
  LayoutAnimation,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account, DebtReceivable, Transaction } from '../types';
import {
  calculateNetWorth,
  calculateTotalAssets,
  calculateTotalLiabilities,
  formatCurrency,
} from '../domain/calculator';
import { theme, typography } from '../theme/colors';
import { getInstitution, INSTITUTIONS_LIST, Institution } from '../domain/institutions';

// Enable LayoutAnimation on Android legacy architecture without throwing New Architecture warning
const isFabricEnabled = (global as any)?.nativeFabricUIManager != null;
if (Platform.OS === 'android' && !isFabricEnabled && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch {
    // No-op in modern React Native architectures
  }
}

interface WalletScreenProps {
  accounts: Account[];
  debts: DebtReceivable[];
  transactions: Transaction[];
  currency: string;
  onOpenAddTransaction: (type?: 'expense' | 'income' | 'transfer') => void;
  onUpdateAccountBalance?: (accountId: string, newBalance: number) => void;
  onAddAccount?: (account: Omit<Account, 'id'>) => void;
  onDeleteAccount?: (accountId: string) => void;
  onArchiveAccount?: (accountId: string) => void;
  bottomInset?: number;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({
  accounts,
  debts,
  transactions,
  currency,
  onOpenAddTransaction,
  onUpdateAccountBalance,
  onAddAccount,
  onDeleteAccount,
  onArchiveAccount,
  bottomInset = 20,
}) => {
  const [period, setPeriod] = useState<'today' | 'month' | 'net'>('net');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editBalanceText, setEditBalanceText] = useState('');

  // Add Account Modal State
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(INSTITUTIONS_LIST[0]);
  const [newAccountName, setNewAccountName] = useState(INSTITUTIONS_LIST[0].name);
  const [newAccountBalance, setNewAccountBalance] = useState('');

  const handlePeriodChange = (newPeriod: 'today' | 'month' | 'net') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPeriod(newPeriod);
  };

  const handleSelectInstitution = (inst: Institution) => {
    setSelectedInstitution(inst);
    setNewAccountName(inst.name);
  };

  const handleCreateAccount = () => {
    if (!newAccountName.trim()) return;
    const balanceNum = parseFloat(newAccountBalance) || 0;

    onAddAccount?.({
      name: newAccountName.trim(),
      type: selectedInstitution?.type || 'debit',
      balance: balanceNum,
      currency: currency,
      includeInNetBalance: true,
      color: selectedInstitution?.color || '#508A59',
      icon: selectedInstitution?.category === 'wallet' ? 'phone-portrait-outline' : 'business-outline',
      institutionId: selectedInstitution?.id,
    });

    setIsAddAccountOpen(false);
    setNewAccountBalance('');
  };

  const netWorth = calculateNetWorth(accounts, debts);
  const totalAssets = calculateTotalAssets(accounts);
  const totalLiabilities = calculateTotalLiabilities(accounts, debts);

  // Calculate Money In (Income) & Money Out (Expenses) for Today & Month
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  const spentToday = transactions
    .filter(t => t.type === 'expense' && t.date === todayStr)
    .reduce((s, t) => s + t.amount, 0);

  const incomeToday = transactions
    .filter(t => t.type === 'income' && t.date === todayStr)
    .reduce((s, t) => s + t.amount, 0);

  const spentMonth = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(thisMonthStr))
    .reduce((s, t) => s + t.amount, 0);

  const incomeMonth = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(thisMonthStr))
    .reduce((s, t) => s + t.amount, 0);

  const netCashflowMonth = incomeMonth - spentMonth;
  const netCashflowToday = incomeToday - spentToday;

  // Last 7 days mini bar chart data
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    const amount = transactions
      .filter(t => t.type === 'expense' && t.date === dayKey)
      .reduce((s, t) => s + t.amount, 0);
    return { dayName, amount };
  });

  const maxBar = Math.max(...last7Days.map(d => d.amount), 50);

  // Group accounts by precise category (E-Wallets, Digital Banks, Traditional Banks, Cash, Credit, Investments)
  const walletAccounts = accounts.filter(a => {
    const inst = getInstitution(a.institutionId || a.name);
    return inst?.category === 'wallet';
  });

  const digitalBankAccounts = accounts.filter(a => {
    const inst = getInstitution(a.institutionId || a.name);
    return inst?.category === 'digital_bank';
  });

  const traditionalBankAccounts = accounts.filter(a => {
    const inst = getInstitution(a.institutionId || a.name);
    return inst?.category === 'traditional_bank' || (a.type === 'debit' && !inst && a.name.toLowerCase().includes('bank'));
  });

  const cashAccounts = accounts.filter(a => {
    const inst = getInstitution(a.institutionId || a.name);
    return !inst && a.type === 'debit' && !a.name.toLowerCase().includes('bank');
  });

  const creditAccounts = accounts.filter(a => a.type === 'credit');
  const investmentAccounts = accounts.filter(a => a.type === 'stocks' || a.type === 'crypto' || a.type === 'assets');

  const getAccountIconName = (acc: Account): keyof typeof Ionicons.glyphMap => {
    if (acc.type === 'credit') return 'card-outline';
    if (acc.type === 'stocks') return 'trending-up-outline';
    if (acc.type === 'crypto') return 'logo-bitcoin';
    if (acc.name.toLowerCase().includes('bank')) return 'business-outline';
    return 'cash-outline';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Home Summary Section */}
      <View style={styles.summaryContainer}>
        {/* Spent / Net Balance Card */}
        <View style={styles.spentTodayCard}>
          <View style={styles.periodRow}>
            <Pressable
              style={({ pressed }) => [
                styles.periodChip,
                period === 'net' && styles.periodChipActive,
                Platform.OS === 'ios' && pressed && styles.chipPressed,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: false }}
              onPress={() => handlePeriodChange('net')}
            >
              <Text style={[styles.periodChipText, period === 'net' && styles.periodChipTextActive]}>
                Net Worth
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.periodChip,
                period === 'month' && styles.periodChipActive,
                Platform.OS === 'ios' && pressed && styles.chipPressed,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: false }}
              onPress={() => handlePeriodChange('month')}
            >
              <Text style={[styles.periodChipText, period === 'month' && styles.periodChipTextActive]}>
                Month
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.periodChip,
                period === 'today' && styles.periodChipActive,
                Platform.OS === 'ios' && pressed && styles.chipPressed,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: false }}
              onPress={() => handlePeriodChange('today')}
            >
              <Text style={[styles.periodChipText, period === 'today' && styles.periodChipTextActive]}>
                Today
              </Text>
            </Pressable>
          </View>

          <Text style={styles.metricLabel}>
            {period === 'net' ? 'Total Net Worth' : period === 'month' ? 'Month Net Cash Flow' : 'Today Net Cash Flow'}
          </Text>

          <Text style={styles.metricBigAmount} numberOfLines={1} adjustsFontSizeToFit>
            {period === 'net'
              ? formatCurrency(netWorth, currency)
              : period === 'month'
              ? formatCurrency(netCashflowMonth, currency)
              : formatCurrency(netCashflowToday, currency)}
          </Text>

          {/* Tarsi Money In & Money Out Dual Inflow/Outflow Indicators */}
          <View style={styles.metricSubRow}>
            <View style={[styles.submetricPill, { backgroundColor: '#13231B' }]}>
              <Ionicons name="arrow-down" size={13} color={theme.success} />
              <Text style={[styles.submetricText, { color: theme.success }]}>
                {period === 'net'
                  ? `Assets: ${formatCurrency(totalAssets, currency)}`
                  : `In: ${formatCurrency(period === 'month' ? incomeMonth : incomeToday, currency)}`}
              </Text>
            </View>

            <View style={[styles.submetricPill, { backgroundColor: '#2C1717' }]}>
              <Ionicons name="arrow-up" size={13} color={theme.danger} />
              <Text style={[styles.submetricText, { color: theme.danger }]}>
                {period === 'net'
                  ? `Debts: ${formatCurrency(totalLiabilities, currency)}`
                  : `Out: ${formatCurrency(period === 'month' ? spentMonth : spentToday, currency)}`}
              </Text>
            </View>
          </View>
        </View>

        {/* 7-Day Mini Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>7-Day Activity</Text>
          <View style={styles.chartBars}>
            {last7Days.map((bar, idx) => {
              const heightPercent = Math.max(8, Math.round((bar.amount / maxBar) * 44));
              const isToday = idx === 6;
              return (
                <View key={idx} style={styles.barWrap}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: heightPercent,
                          backgroundColor: isToday ? theme.primary : '#22322C',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isToday && { color: theme.primary, fontWeight: '800' }]}>
                    {bar.dayName}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Core Quick Action Pills - Scrollable so it never overflows or overlaps on any screen */}
      <View style={styles.quickActionsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          <Pressable
            style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: false }}
            onPress={() => onOpenAddTransaction('expense')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#451A1A' }]}>
              <Ionicons name="arrow-down" size={18} color="#F87171" />
            </View>
            <Text style={styles.actionPillLabel} numberOfLines={1}>Expense</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: false }}
            onPress={() => onOpenAddTransaction('income')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="arrow-up" size={18} color={theme.primary} />
            </View>
            <Text style={styles.actionPillLabel} numberOfLines={1}>Income</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: false }}
            onPress={() => onOpenAddTransaction('transfer')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#1A293B' }]}>
              <Ionicons name="swap-horizontal" size={18} color="#38BDF8" />
            </View>
            <Text style={styles.actionPillLabel} numberOfLines={1}>Transfer</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: false }}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#2E2215' }]}>
              <Ionicons name="camera-outline" size={18} color={theme.warning} />
            </View>
            <Text style={styles.actionPillLabel} numberOfLines={1}>Scan</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: false }}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#2B1A3F' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#C084FC" />
            </View>
            <Text style={styles.actionPillLabel} numberOfLines={1}>AI Chat</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Section Header with Add Account Button */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Your Accounts</Text>
        <Pressable
          style={({ pressed }) => [styles.addAccountButton, pressed && { opacity: 0.7 }]}
          hitSlop={8}
          onPress={() => setIsAddAccountOpen(true)}
        >
          <Ionicons name="add" size={16} color={theme.primary} />
          <Text style={styles.addAccountButtonText}>Add Account</Text>
        </Pressable>
      </View>

      {/* 1. E-Wallets (GCash, Maya, ShopeePay, GrabPay, Coins.ph, PayPal) */}
      {walletAccounts.length > 0 && (
        <View style={styles.accountGroupContainer}>
          <View style={styles.accountGroupHeaderRow}>
            <View style={styles.groupBadgeDot} />
            <Text style={styles.accountGroupTitle}>E-Wallets & EMIs</Text>
            <Text style={styles.accountGroupCount}>{walletAccounts.length}</Text>
          </View>
          {walletAccounts.map(account => renderAccountCard(account))}
        </View>
      )}

      {/* 2. Licensed Digital Banks (GoTyme, MariBank, Maya Bank, Tonik, UNO, CIMB, OFBank) */}
      {digitalBankAccounts.length > 0 && (
        <View style={styles.accountGroupContainer}>
          <View style={styles.accountGroupHeaderRow}>
            <View style={[styles.groupBadgeDot, { backgroundColor: '#00F5FA' }]} />
            <Text style={styles.accountGroupTitle}>Digital Banks</Text>
            <Text style={styles.accountGroupCount}>{digitalBankAccounts.length}</Text>
          </View>
          {digitalBankAccounts.map(account => renderAccountCard(account))}
        </View>
      )}

      {/* 3. Traditional Commercial Banks (BPI, BDO, Metrobank, UnionBank, etc.) */}
      {traditionalBankAccounts.length > 0 && (
        <View style={styles.accountGroupContainer}>
          <View style={styles.accountGroupHeaderRow}>
            <View style={[styles.groupBadgeDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.accountGroupTitle}>Traditional Banks</Text>
            <Text style={styles.accountGroupCount}>{traditionalBankAccounts.length}</Text>
          </View>
          {traditionalBankAccounts.map(account => renderAccountCard(account))}
        </View>
      )}

      {/* 4. Physical Cash */}
      {cashAccounts.length > 0 && (
        <View style={styles.accountGroupContainer}>
          <View style={styles.accountGroupHeaderRow}>
            <View style={[styles.groupBadgeDot, { backgroundColor: '#508A59' }]} />
            <Text style={styles.accountGroupTitle}>Cash & Physical Wallets</Text>
            <Text style={styles.accountGroupCount}>{cashAccounts.length}</Text>
          </View>
          {cashAccounts.map(account => renderAccountCard(account))}
        </View>
      )}

      {/* 5. Credit Cards & Borrowing Liabilities */}
      {creditAccounts.length > 0 && (
        <View style={styles.accountGroupContainer}>
          <View style={styles.accountGroupHeaderRow}>
            <View style={[styles.groupBadgeDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.accountGroupTitle}>Credit Cards & Liabilities</Text>
            <Text style={styles.accountGroupCount}>{creditAccounts.length}</Text>
          </View>
          {creditAccounts.map(account => renderAccountCard(account, true))}
        </View>
      )}

      {/* 6. Investments, Crypto & Assets */}
      {investmentAccounts.length > 0 && (
        <View style={styles.accountGroupContainer}>
          <View style={styles.accountGroupHeaderRow}>
            <View style={[styles.groupBadgeDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.accountGroupTitle}>Investments & Assets</Text>
            <Text style={styles.accountGroupCount}>{investmentAccounts.length}</Text>
          </View>
          {investmentAccounts.map(account => renderAccountCard(account))}
        </View>
      )}

      {/* Bottom spacer calculated dynamically so the floating dock NEVER overlaps content */}
      <View style={{ height: bottomInset + 110 }} />

      {/* Edit Account Balance Modal */}
      <Modal
        visible={!!editingAccount}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingAccount(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoidContainer}
            >
              <View style={styles.editCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.editCardTitle}>Edit Balance</Text>
                  <Pressable
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={({ pressed }) => [styles.modalCloseButton, pressed && { opacity: 0.6 }]}
                    onPress={() => setEditingAccount(null)}
                  >
                    <Ionicons name="close" size={22} color={theme.textSecondary} />
                  </Pressable>
                </View>

                <Text style={styles.editCardSub}>{editingAccount?.name}</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.currencyPrefix}>
                    {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency}
                  </Text>
                  <TextInput
                    style={styles.balanceInput}
                    keyboardType="decimal-pad"
                    value={editBalanceText}
                    onChangeText={setEditBalanceText}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    autoFocus
                  />
                </View>

                <View style={styles.modalBtnRow}>
                  <Pressable
                    style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.8 }]}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
                    onPress={() => setEditingAccount(null)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                    onPress={() => {
                      if (editingAccount) {
                        const val = parseFloat(editBalanceText) || 0;
                        onUpdateAccountBalance?.(editingAccount.id, val);
                        setEditingAccount(null);
                      }
                    }}
                  >
                    <Text style={styles.saveBtnText}>Save</Text>
                  </Pressable>
                </View>

                {/* Account Actions: Archive & Delete / Trash */}
                <View style={styles.accountActionDivider} />
                <View style={styles.accountActionsRow}>
                  <Pressable
                    style={styles.archiveAccountBtn}
                    onPress={() => {
                      if (editingAccount) {
                        onArchiveAccount?.(editingAccount.id);
                        setEditingAccount(null);
                      }
                    }}
                  >
                    <Ionicons
                      name={editingAccount?.archivedAt ? 'arrow-undo-outline' : 'archive-outline'}
                      size={16}
                      color={theme.textSecondary}
                    />
                    <Text style={styles.archiveAccountBtnText}>
                      {editingAccount?.archivedAt ? 'Unarchive' : 'Archive'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.deleteAccountBtn}
                    onPress={() => {
                      if (editingAccount) {
                        onDeleteAccount?.(editingAccount.id);
                        setEditingAccount(null);
                      }
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                    <Text style={styles.deleteAccountBtnText}>Delete Account</Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add New Bank / Wallet Account Modal */}
      <Modal
        visible={isAddAccountOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddAccountOpen(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoidContainer}
            >
              <View style={styles.addAccountCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.editCardTitle}>Add Account or Wallet</Text>
                  <Pressable
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={({ pressed }) => [styles.modalCloseButton, pressed && { opacity: 0.6 }]}
                    onPress={() => setIsAddAccountOpen(false)}
                  >
                    <Ionicons name="close" size={24} color={theme.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 380 }}
                >
                  <Text style={styles.selectInstitutionLabel}>SELECT INSTITUTION</Text>

                  {/* Institutions Horizontal Carousel */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.institutionsScroll}
                  >
                    {INSTITUTIONS_LIST.map(inst => {
                      const isSelected = selectedInstitution?.id === inst.id;
                      return (
                        <Pressable
                          key={inst.id}
                          style={({ pressed }) => [
                            styles.institutionChip,
                            isSelected && styles.institutionChipActive,
                            pressed && { opacity: 0.8 },
                          ]}
                          onPress={() => handleSelectInstitution(inst)}
                        >
                          <View style={styles.institutionLogoBox}>
                            <Image source={inst.logo} style={styles.institutionLogoThumb} resizeMode="contain" />
                          </View>
                          <Text
                            style={[styles.institutionChipName, isSelected && styles.institutionChipNameActive]}
                            numberOfLines={1}
                          >
                            {inst.shortName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Account Name Input */}
                  <Text style={styles.inputFieldLabel}>ACCOUNT NAME</Text>
                  <TextInput
                    style={styles.textInputFull}
                    value={newAccountName}
                    onChangeText={setNewAccountName}
                    placeholder="e.g. My GCash, GoTyme Savings"
                    placeholderTextColor={theme.textMuted}
                  />

                  {/* Initial Balance Input */}
                  <Text style={[styles.inputFieldLabel, { marginTop: 14 }]}>STARTING BALANCE</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencyPrefix}>
                      {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency}
                    </Text>
                    <TextInput
                      style={styles.balanceInput}
                      keyboardType="decimal-pad"
                      value={newAccountBalance}
                      onChangeText={setNewAccountBalance}
                      placeholder="0.00"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </ScrollView>

                {/* Pinned Submit Button - Always visible without scrolling */}
                <Pressable
                  style={({ pressed }) => [styles.saveBtn, { marginTop: 14 }, pressed && { opacity: 0.88 }]}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                  onPress={handleCreateAccount}
                >
                  <Text style={styles.saveBtnText}>Create Account</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );

  function renderAccountCard(account: Account, isCredit = false) {
    const inst = getInstitution(account.institutionId || account.name);

    return (
      <Pressable
        key={account.id}
        style={({ pressed }) => [styles.accountCard, pressed && styles.accountCardPressed]}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.06)', borderless: false }}
        onPress={() => {
          setEditingAccount(account);
          setEditBalanceText(account.balance === 0 ? '' : account.balance.toString());
        }}
      >
        {/* Official Institution Logo Badge or Vector Icon */}
        <View style={[styles.accountIconFrame, { backgroundColor: inst ? '#FFFFFF' : `${account.color}22` }]}>
          {inst ? (
            <Image source={inst.logo} style={styles.accountOfficialLogo} resizeMode="contain" />
          ) : (
            <Ionicons name={getAccountIconName(account)} size={22} color={account.color} />
          )}
        </View>

        <View style={styles.accountNameCol}>
          <Text style={styles.accountTitle} numberOfLines={1}>{account.name}</Text>
          <Text style={styles.accountSub} numberOfLines={1}>
            {inst?.category === 'digital_bank'
              ? 'DIGITAL BANK'
              : inst?.category === 'wallet'
              ? 'E-WALLET'
              : isCredit && account.creditLimit
              ? `Limit: ${formatCurrency(account.creditLimit, account.currency)}`
              : `${account.type.toUpperCase()}`}
            {' • Tap to edit'}
          </Text>
        </View>

        <View style={styles.accountBalanceCol}>
          <Text style={[styles.accountBalanceText, isCredit && { color: theme.danger }]}>
            {isCredit ? `-${formatCurrency(account.balance, account.currency)}` : formatCurrency(account.balance, account.currency)}
          </Text>
          <Text style={styles.accountCurrencyLabel}>{account.currency}</Text>
        </View>
      </Pressable>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  summaryContainer: {
    gap: 12,
    marginBottom: 14,
  },
  spentTodayCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  periodChip: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#0F1614',
    borderWidth: 1,
    borderColor: '#1C2623',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipPressed: {
    opacity: 0.75,
  },
  periodChipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  periodChipTextActive: {
    color: '#FFFFFF',
  },
  metricLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricBigAmount: {
    color: theme.text,
    fontSize: typography.metricHero.fontSize,
    lineHeight: typography.metricHero.lineHeight,
    fontWeight: typography.metricHero.fontWeight,
    letterSpacing: typography.metricHero.letterSpacing,
    marginVertical: 4,
  },
  metricSubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  submetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  submetricText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: theme.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  chartTitle: {
    color: theme.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 56,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    width: 8,
    height: 44,
    backgroundColor: '#111816',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  quickActionsContainer: {
    marginVertical: 12,
    backgroundColor: theme.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    overflow: 'hidden',
  },
  quickActionsScroll: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 12,
  },
  actionPill: {
    alignItems: 'center',
    gap: 6,
    minWidth: 62,
    justifyContent: 'center',
  },
  actionPillPressed: {
    opacity: 0.7,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillLabel: {
    color: theme.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionHeading: {
    color: theme.text,
    fontSize: typography.headline.fontSize,
    lineHeight: typography.headline.lineHeight,
    fontWeight: typography.headline.fontWeight,
    letterSpacing: -0.2,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addAccountButtonText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  accountGroupContainer: {
    marginBottom: 14,
  },
  accountGroupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#005CE6',
  },
  accountGroupTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountGroupCount: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  accountCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  accountCardPressed: {
    backgroundColor: '#18221F',
    borderColor: theme.cardBorderFocus,
  },
  accountIconFrame: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  accountOfficialLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  accountNameCol: {
    flex: 1,
    marginRight: 10,
  },
  accountTitle: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  accountSub: {
    color: theme.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  accountBalanceCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  accountBalanceText: {
    color: theme.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  accountCurrencyLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoidContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  editCard: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  addAccountCard: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseButton: {
    padding: 4,
  },
  editCardTitle: {
    color: theme.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  editCardSub: {
    color: theme.textSecondary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  selectInstitutionLabel: {
    color: theme.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 10,
  },
  institutionsScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  institutionChip: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#0F1614',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    width: 80,
  },
  institutionChipActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  institutionLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  institutionLogoThumb: {
    width: 28,
    height: 28,
  },
  institutionChipName: {
    color: theme.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  institutionChipNameActive: {
    color: '#FFFFFF',
  },
  inputFieldLabel: {
    color: theme.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInputFull: {
    backgroundColor: '#0B0F0E',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0F0E',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  currencyPrefix: {
    color: theme.primary,
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  balanceInput: {
    flex: 1,
    color: theme.text,
    fontSize: 24,
    fontWeight: '800',
    paddingVertical: 6,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1C2422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  accountActionDivider: {
    height: 1,
    backgroundColor: theme.cardBorder,
    marginVertical: 16,
  },
  accountActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  archiveAccountBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  archiveAccountBtnText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteAccountBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteAccountBtnText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
