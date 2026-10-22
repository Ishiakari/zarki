import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceStore } from './src/store/useFinanceStore';
import { WalletScreen } from './src/screens/WalletScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { AddTransactionModal } from './src/screens/AddTransactionModal';
import { theme } from './src/theme/colors';

type Tab = 'wallet' | 'history' | 'plan';

function AppContent() {
  const insets = useSafeAreaInsets();
  const {
    state,
    isLoaded,
    addTransaction,
    addAccount,
    updateAccountBalance,
    deleteAccount,
    archiveAccount,
    setCategoryBudget,
    deleteCategoryBudget,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    addDebtReceivable,
    deleteDebt,
    toggleDebtSettled,
    addRecurring,
    deleteRecurring,
    toggleRecurringActive,
    addInstallment,
    incrementInstallmentTerm,
    deleteInstallment,
    addShoppingItem,
    toggleShoppingItem,
    addWarranty,
    saveNote,
    addCategory,
  } = useFinanceStore();
  const [activeTab, setActiveTab] = useState<Tab>('wallet');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [modalInitialAmount, setModalInitialAmount] = useState<number | undefined>(undefined);

  // Calculate safe insets for Android status bar and gesture navigation bar
  const androidStatusBarHeight = StatusBar.currentHeight || 28;
  const topInset = Platform.OS === 'android' ? Math.max(insets.top, androidStatusBarHeight) : insets.top;
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, 24);

  if (!isLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: theme.textSecondary }}>Loading Zarki...</Text>
      </View>
    );
  }

  const handleOpenAdd = (type: 'expense' | 'income' | 'transfer' = 'expense', amount?: number) => {
    setModalInitialType(type);
    setModalInitialAmount(amount);
    setIsModalOpen(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Header with Safe Top Padding to prevent status bar overlap */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarPill}>
            <Text style={styles.avatarInitial}>{state.preferredName ? state.preferredName[0] : 'Z'}</Text>
          </View>
          <View>
            <Text style={styles.greetingTitle}>Hi, {state.preferredName || 'there'}</Text>
            <Text style={styles.greetingSub}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            style={({ pressed }) => [styles.headerIconButton, pressed && { opacity: 0.7 }]}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true, radius: 22 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => handleOpenAdd('expense')}
          >
            <Ionicons name="add" size={22} color={theme.primary} />
          </Pressable>
        </View>
      </View>

      {/* Main Content View */}
      <View style={styles.contentBody}>
        {activeTab === 'wallet' && (
          <WalletScreen
            accounts={state.accounts}
            debts={state.debts}
            transactions={state.transactions}
            currency={state.preferredCurrency}
            onOpenAddTransaction={handleOpenAdd}
            onUpdateAccountBalance={updateAccountBalance}
            onAddAccount={addAccount}
            onDeleteAccount={deleteAccount}
            onArchiveAccount={archiveAccount}
            bottomInset={bottomInset}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            transactions={state.transactions}
            accounts={state.accounts}
            categories={state.categories}
            currency={state.preferredCurrency}
            bottomInset={bottomInset}
          />
        )}
        {activeTab === 'plan' && (
          <PlanScreen
            budgets={state.budgets}
            goals={state.goals}
            debts={state.debts}
            transactions={state.transactions}
            categories={state.categories}
            accounts={state.accounts}
            recurring={state.recurring}
            installments={state.installments}
            shoppingList={state.shoppingList}
            warranties={state.warranties}
            notes={state.notes}
            currency={state.preferredCurrency}
            bottomInset={bottomInset}
            onSetBudget={setCategoryBudget}
            onDeleteBudget={deleteCategoryBudget}
            onAddGoal={addGoal}
            onUpdateGoal={updateGoal}
            onDeleteGoal={deleteGoal}
            onContributeGoal={contributeToGoal}
            onAddDebt={addDebtReceivable}
            onDeleteDebt={deleteDebt}
            onToggleDebt={toggleDebtSettled}
            onAddRecurring={addRecurring}
            onDeleteRecurring={deleteRecurring}
            onToggleRecurring={toggleRecurringActive}
            onAddInstallment={addInstallment}
            onIncrementInstallment={incrementInstallmentTerm}
            onDeleteInstallment={deleteInstallment}
            onAddShoppingItem={addShoppingItem}
            onToggleShoppingItem={toggleShoppingItem}
            onAddWarranty={addWarranty}
            onSaveNote={saveNote}
          />
        )}
      </View>

      {/* Tarsi Floating Bottom Tab Bar Dock with Safe Bottom Padding */}
      <View style={[styles.tabBarFrame, { bottom: bottomInset }]}>
        <View style={styles.tabBarRow}>
          {/* Main Floating Island Shell */}
          <View style={styles.tabBarShell}>
            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === 'wallet' && styles.tabButtonActive,
                Platform.OS === 'ios' && pressed && { opacity: 0.7 },
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: true }}
              onPress={() => setActiveTab('wallet')}
            >
              <Ionicons
                name={activeTab === 'wallet' ? 'wallet' : 'wallet-outline'}
                size={20}
                color={activeTab === 'wallet' ? theme.primary : theme.textSecondary}
              />
              <Text style={[styles.tabLabel, activeTab === 'wallet' && styles.tabLabelActive]}>Wallet</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === 'history' && styles.tabButtonActive,
                Platform.OS === 'ios' && pressed && { opacity: 0.7 },
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: true }}
              onPress={() => setActiveTab('history')}
            >
              <Ionicons
                name={activeTab === 'history' ? 'receipt' : 'receipt-outline'}
                size={20}
                color={activeTab === 'history' ? theme.primary : theme.textSecondary}
              />
              <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>History</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === 'plan' && styles.tabButtonActive,
                Platform.OS === 'ios' && pressed && { opacity: 0.7 },
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: true }}
              onPress={() => setActiveTab('plan')}
            >
              <Ionicons
                name={activeTab === 'plan' ? 'compass' : 'compass-outline'}
                size={20}
                color={activeTab === 'plan' ? theme.primary : theme.textSecondary}
              />
              <Text style={[styles.tabLabel, activeTab === 'plan' && styles.tabLabelActive]}>Plan</Text>
            </Pressable>
          </View>

          {/* Elevated Circular Plus Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.floatingAddButton,
              Platform.OS === 'ios' && pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', borderless: true, radius: 29 }}
            onPress={() => handleOpenAdd('expense')}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={isModalOpen}
        initialType={modalInitialType}
        initialAmount={modalInitialAmount}
        currency={state.preferredCurrency}
        onClose={() => {
          setIsModalOpen(false);
          setModalInitialAmount(undefined);
        }}
        accounts={state.accounts}
        categories={state.categories}
        onAddTransaction={addTransaction}
        onAddCategory={addCategory}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
    backgroundColor: theme.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.primary}50`,
  },
  avatarInitial: {
    color: theme.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  greetingTitle: {
    color: theme.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  greetingSub: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  contentBody: {
    flex: 1,
  },
  // Floating bottom bar dock (Module 2310 CSS)
  tabBarFrame: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabBarShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabButtonActive: {
    backgroundColor: theme.primarySoft,
  },
  tabLabel: {
    color: theme.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: theme.primary,
  },
  floatingAddButton: {
    width: 58,
    height: 58,
    borderRadius: 24,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 18,
  },
});
