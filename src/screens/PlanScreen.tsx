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
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Budget,
  Goal,
  DebtReceivable,
  Transaction,
  Category,
  Account,
  RecurringTransaction,
  InstallmentPlan,
  ShoppingItem,
  WarrantyItem,
  FinanceNote,
} from '../types';
import {
  calculateBudgetProgress,
  calculateMonthlySpending,
  formatCurrency,
} from '../domain/calculator';
import { computePhilippineIncomeTax2026, TaxRegimeMode } from '../domain/philippineTax';
import { theme, typography } from '../theme/colors';
import { CalculatorKeypad } from '../components/CalculatorKeypad';
import { formatNumberWithCommas } from '../domain/calculatorEngine';

interface PlanScreenProps {
  budgets: Budget[];
  goals: Goal[];
  debts: DebtReceivable[];
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  recurring: RecurringTransaction[];
  installments?: InstallmentPlan[];
  shoppingList?: ShoppingItem[];
  warranties?: WarrantyItem[];
  notes?: FinanceNote[];
  currency: string;
  bottomInset?: number;
  onSetBudget?: (categoryId: string, amount: number, interval?: 'monthly' | 'weekly' | 'yearly') => void;
  onDeleteBudget?: (categoryId: string) => void;
  onAddGoal?: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoal?: (goalId: string, data: Partial<Goal>) => void;
  onDeleteGoal?: (goalId: string) => void;
  onContributeGoal?: (goalId: string, amount: number, fromAccountId?: string) => void;
  onAddDebt?: (debt: Omit<DebtReceivable, 'id'>) => void;
  onDeleteDebt?: (debtId: string) => void;
  onToggleDebt?: (debtId: string) => void;
  onAddRecurring?: (rec: Omit<RecurringTransaction, 'id'>) => void;
  onDeleteRecurring?: (recId: string) => void;
  onToggleRecurring?: (recId: string) => void;
  onAddInstallment?: (inst: Omit<InstallmentPlan, 'id'>) => void;
  onIncrementInstallment?: (installmentId: string) => void;
  onDeleteInstallment?: (installmentId: string) => void;
  onAddShoppingItem?: (title: string, cost?: number) => void;
  onToggleShoppingItem?: (id: string) => void;
  onAddWarranty?: (w: Omit<WarrantyItem, 'id'>) => void;
  onSaveNote?: (id: string | null, title: string, content: string) => void;
}

type PlanFilter = 'all' | 'budgets' | 'goals' | 'bills' | 'installments' | 'debts' | 'tax';

interface AmountDisplayCardProps {
  label: string;
  value: string;
  currency?: string;
  expression?: string;
  isActive?: boolean;
  onPress: () => void;
}

const AmountDisplayCard: React.FC<AmountDisplayCardProps> = ({
  label,
  value,
  currency = 'PHP',
  expression,
  isActive = false,
  onPress,
}) => {
  const currencySymbol = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : `${currency} `;
  return (
    <View style={styles.amountCardWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.interactiveAmountCard,
          isActive && styles.interactiveAmountCardActive,
          pressed && { opacity: 0.9 },
        ]}
        onPress={onPress}
      >
        <View style={styles.amountCardLeft}>
          {expression ? (
            <Text style={styles.amountCardExpression} numberOfLines={1}>
              {expression}
            </Text>
          ) : null}
          <View style={styles.amountCardValueRow}>
            <Text style={styles.amountCardCurrency}>{currencySymbol}</Text>
            <Text style={styles.amountCardValueText} numberOfLines={1}>
              {formatNumberWithCommas(value || '0')}
            </Text>
            {isActive && <View style={styles.amountCardCursor} />}
          </View>
        </View>
        <View style={[styles.amountCardIconBadge, isActive && styles.amountCardIconBadgeActive]}>
          <Ionicons
            name="calculator"
            size={18}
            color={isActive ? '#FFFFFF' : theme.textSecondary}
          />
        </View>
      </Pressable>
    </View>
  );
};

export const PlanScreen: React.FC<PlanScreenProps> = ({
  budgets,
  goals,
  debts,
  transactions,
  categories,
  accounts,
  recurring,
  installments = [],
  currency,
  bottomInset = 20,
  onSetBudget,
  onDeleteBudget,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onContributeGoal,
  onAddDebt,
  onDeleteDebt,
  onToggleDebt,
  onAddRecurring,
  onDeleteRecurring,
  onToggleRecurring,
  onAddInstallment,
  onIncrementInstallment,
  onDeleteInstallment,
}) => {
  const [activeFilter, setActiveFilter] = useState<PlanFilter>('all');

  // Modals State
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedBudgetCatId, setSelectedBudgetCatId] = useState<string>(categories[0]?.id || '');
  const [budgetAmountInput, setBudgetAmountInput] = useState('');
  const [budgetInterval, setBudgetInterval] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');

  // Goal Creation & Contribution State
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  // Selected Goal for Manage/Deposit Sheet (Tarsi Style)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [selectedFundingAccountId, setSelectedFundingAccountId] = useState<string>(accounts[0]?.id || '');
  const [goalActionTab, setGoalActionTab] = useState<'deposit' | 'withdraw' | 'edit'>('deposit');
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');

  // Debt State
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState<'debt' | 'receivable'>('debt');
  const [debtDueDate, setDebtDueDate] = useState('');

  // Recurring State
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');
  const [recFrequency, setRecFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [recAccountId, setRecAccountId] = useState(accounts[0]?.id || '');

  // Installment State
  const [instModalOpen, setInstModalOpen] = useState(false);
  const [instName, setInstName] = useState('');
  const [instTotalAmount, setInstTotalAmount] = useState('');
  const [instTotalTerms, setInstTotalTerms] = useState('12');
  const [instAccountId, setInstAccountId] = useState(accounts[0]?.id || '');

  // BIR Tax Calculator State
  const [taxAnnualIncome, setTaxAnnualIncome] = useState('600000');
  const [taxRegime, setTaxRegime] = useState<TaxRegimeMode>('compensation');

  // Keypad & Calculator visibility states for Plan inputs
  const [taxCalculatorModalOpen, setTaxCalculatorModalOpen] = useState(false);
  const [depositExpression, setDepositExpression] = useState('');
  const [isEditGoalKeypadOpen, setIsEditGoalKeypadOpen] = useState(false);
  const [isNewGoalKeypadOpen, setIsNewGoalKeypadOpen] = useState(false);
  const [isDebtKeypadOpen, setIsDebtKeypadOpen] = useState(false);
  const [isRecKeypadOpen, setIsRecKeypadOpen] = useState(false);
  const [isInstKeypadOpen, setIsInstKeypadOpen] = useState(false);

  const openGoalSheet = (goal: Goal, action: 'deposit' | 'withdraw' = 'deposit') => {
    setSelectedGoal(goal);
    setDepositAmountInput('');
    setDepositExpression('');
    setGoalActionTab(action);
    setEditGoalName(goal.name);
    setEditGoalTarget(String(goal.targetAmount));
    setIsEditGoalKeypadOpen(false);
  };

  const currentYearMonth = new Date().toISOString().substring(0, 7);
  const totalMonthlySpend = calculateMonthlySpending(transactions, currentYearMonth);
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.amount, 0);

  const monthlyRecurringBills = recurring
    .filter(r => r.isActive && r.type === 'expense')
    .reduce((sum, r) => sum + (r.frequency === 'weekly' ? r.amount * 4 : r.amount), 0);

  const monthlyInstallmentBills = installments.reduce((sum, inst) => {
    const isCompleted = inst.paidTerms >= inst.totalTerms;
    return isCompleted ? sum : sum + inst.monthlyAmount;
  }, 0);

  // Handlers
  const handleSaveBudget = () => {
    const val = parseFloat(budgetAmountInput);
    if (!isNaN(val) && val > 0 && selectedBudgetCatId) {
      onSetBudget?.(selectedBudgetCatId, val, budgetInterval);
      setBudgetModalOpen(false);
      setBudgetAmountInput('');
    }
  };

  const handleSaveGoal = () => {
    const val = parseFloat(goalTargetAmount);
    if (goalName.trim() && !isNaN(val) && val > 0) {
      onAddGoal?.({
        name: goalName.trim(),
        targetAmount: val,
        currentAmount: 0,
        targetDate: goalTargetDate.trim() || undefined,
        color: '#508A59',
      });
      setGoalModalOpen(false);
      setGoalName('');
      setGoalTargetAmount('');
      setGoalTargetDate('');
    }
  };

  const handleGoalDepositConfirm = () => {
    if (!selectedGoal) return;
    const val = parseFloat(depositAmountInput);
    if (isNaN(val) || val <= 0) return;

    if (goalActionTab === 'deposit') {
      onContributeGoal?.(selectedGoal.id, val, selectedFundingAccountId);
    } else if (goalActionTab === 'withdraw') {
      onContributeGoal?.(selectedGoal.id, -val, selectedFundingAccountId);
    }

    setDepositAmountInput('');
    setSelectedGoal(null);
  };

  const handleUpdateGoalConfirm = () => {
    if (!selectedGoal) return;
    const target = parseFloat(editGoalTarget);
    if (editGoalName.trim() && !isNaN(target) && target > 0) {
      onUpdateGoal?.(selectedGoal.id, {
        name: editGoalName.trim(),
        targetAmount: target,
      });
      setSelectedGoal(null);
    }
  };

  const handleDeleteGoalConfirm = () => {
    if (!selectedGoal) return;
    onDeleteGoal?.(selectedGoal.id);
    setSelectedGoal(null);
  };

  const handleSaveDebt = () => {
    const val = parseFloat(debtAmount);
    if (debtName.trim() && !isNaN(val) && val > 0) {
      onAddDebt?.({
        name: debtName.trim(),
        amount: val,
        type: debtType,
        dueDate: debtDueDate.trim() || undefined,
      });
      setDebtModalOpen(false);
      setDebtName('');
      setDebtAmount('');
      setDebtDueDate('');
    }
  };

  const handleSaveRecurring = () => {
    const val = parseFloat(recAmount);
    if (recName.trim() && !isNaN(val) && val > 0) {
      onAddRecurring?.({
        name: recName.trim(),
        amount: val,
        type: recType,
        accountId: recAccountId || accounts[0]?.id || '',
        categoryId: categories[0]?.id || '',
        frequency: recFrequency,
        nextDueDate: new Date().toISOString().substring(0, 10),
        isActive: true,
      });
      setRecModalOpen(false);
      setRecName('');
      setRecAmount('');
    }
  };

  const handleSaveInstallment = () => {
    const total = parseFloat(instTotalAmount);
    const terms = parseInt(instTotalTerms, 10) || 12;
    if (instName.trim() && !isNaN(total) && total > 0 && terms > 0) {
      const monthly = Math.round((total / terms) * 100) / 100;
      onAddInstallment?.({
        name: instName.trim(),
        totalAmount: total,
        monthlyAmount: monthly,
        totalTerms: terms,
        paidTerms: 0,
        accountId: instAccountId || accounts[0]?.id,
        startDate: new Date().toISOString().substring(0, 10),
      });
      setInstModalOpen(false);
      setInstName('');
      setInstTotalAmount('');
      setInstTotalTerms('12');
    }
  };

  const taxCalculation = computePhilippineIncomeTax2026(
    parseFloat(taxAnnualIncome) || 0,
    taxRegime
  );

  const budgetUsagePercent = totalBudgetLimit > 0
    ? Math.min(100, Math.round((totalMonthlySpend / totalBudgetLimit) * 100))
    : 0;

  return (
    <View style={styles.screen}>
      {/* Plan Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Plan</Text>
        <Text style={styles.pageSubtitle}>Manage your budgets, goals, recurring commitments, and taxes.</Text>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <Pressable
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              All Plans
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'budgets' && styles.filterChipActive]}
            onPress={() => setActiveFilter('budgets')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'budgets' && styles.filterChipTextActive]}>
              Budgets ({budgets.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'goals' && styles.filterChipActive]}
            onPress={() => setActiveFilter('goals')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'goals' && styles.filterChipTextActive]}>
              Goals ({goals.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'bills' && styles.filterChipActive]}
            onPress={() => setActiveFilter('bills')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'bills' && styles.filterChipTextActive]}>
              Bills ({recurring.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'installments' && styles.filterChipActive]}
            onPress={() => setActiveFilter('installments')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'installments' && styles.filterChipTextActive]}>
              Installments ({installments.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'debts' && styles.filterChipActive]}
            onPress={() => setActiveFilter('debts')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'debts' && styles.filterChipTextActive]}>
              Debts ({debts.filter(d => !d.closedAt).length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'tax' && styles.filterChipActive]}
            onPress={() => setActiveFilter('tax')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'tax' && styles.filterChipTextActive]}>
              BIR 2026 Tax
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* High-Level Overview Card */}
        {activeFilter === 'all' && (
          <View style={styles.heroOverviewCard}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>Monthly Budget Limit</Text>
                <Text style={styles.heroAmount}>{formatCurrency(totalBudgetLimit, currency)}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{budgetUsagePercent}% Spent</Text>
              </View>
            </View>

            <View style={styles.heroProgressBarBg}>
              <View
                style={[
                  styles.heroProgressBarFill,
                  {
                    width: `${Math.min(100, budgetUsagePercent)}%`,
                    backgroundColor: budgetUsagePercent > 100 ? theme.danger : theme.primary,
                  },
                ]}
              />
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Spent this Month</Text>
                <Text style={[styles.heroStatValue, { color: budgetUsagePercent > 100 ? theme.danger : theme.text }]}>
                  {formatCurrency(totalMonthlySpend, currency)}
                </Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Recurring & Loans</Text>
                <Text style={[styles.heroStatValue, { color: theme.textSecondary }]}>
                  {formatCurrency(monthlyRecurringBills + monthlyInstallmentBills, currency)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* SECTION 1: CATEGORY BUDGETS */}
        {(activeFilter === 'all' || activeFilter === 'budgets') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="pie-chart-outline" size={18} color={theme.primary} />
                <Text style={styles.sectionTitle}>Category Budgets</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addSectionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setBudgetModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>Set Budget</Text>
              </Pressable>
            </View>

            {budgets.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="pie-chart-outline" size={28} color={theme.textMuted} />
                <Text style={styles.emptyStateTitle}>No Category Budgets Set</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Set spending limits on Food, Transport, or Shopping to prevent overspending.
                </Text>
              </View>
            ) : (
              budgets.map(budget => {
                const cat = categories.find(c => c.id === budget.categoryId);
                const { spent, limit, remaining, percent } = calculateBudgetProgress(
                  budget,
                  transactions,
                  currentYearMonth
                );
                const isOver = spent > limit && limit > 0;
                const catColor = cat?.color || theme.primary;

                return (
                  <View key={budget.id} style={styles.planCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.catTitleGroup}>
                        <View style={[styles.iconBox, { backgroundColor: `${catColor}20` }]}>
                          <Ionicons
                            name={(cat?.icon as keyof typeof Ionicons.glyphMap) || 'pricetag-outline'}
                            size={16}
                            color={catColor}
                          />
                        </View>
                        <View>
                          <Text style={styles.cardTitleText}>{cat?.label || 'Budget'}</Text>
                          <Text style={styles.cardSubText}>
                            {isOver
                              ? `Exceeded by ${formatCurrency(spent - limit, currency)}`
                              : `${formatCurrency(remaining, currency)} remaining`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardRightGroup}>
                        <Text style={[styles.cardAmountHighlight, isOver && { color: theme.danger }]}>
                          {formatCurrency(spent, currency)}
                        </Text>
                        <Text style={styles.cardLimitSub}>of {formatCurrency(limit, currency)}</Text>
                      </View>
                    </View>

                    <View style={styles.cardProgressBarBg}>
                      <View
                        style={[
                          styles.cardProgressBarFill,
                          {
                            width: `${Math.min(100, percent)}%`,
                            backgroundColor: isOver ? theme.danger : catColor,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.cardFooterRow}>
                      <Text style={[styles.percentLabel, isOver && { color: theme.danger }]}>
                        {percent}% utilized
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable
                          style={styles.cardEditAction}
                          onPress={() => {
                            setSelectedBudgetCatId(budget.categoryId);
                            setBudgetAmountInput(String(budget.amount));
                            setBudgetModalOpen(true);
                          }}
                        >
                          <Text style={styles.cardEditActionText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.cardEditAction, { backgroundColor: theme.dangerSoft }]}
                          onPress={() => onDeleteBudget?.(budget.categoryId)}
                        >
                          <Ionicons name="trash-outline" size={13} color={theme.danger} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* SECTION 2: SAVINGS GOALS (Tarsi Pro Goal Architecture) */}
        {(activeFilter === 'all' || activeFilter === 'goals') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="flag-outline" size={18} color={theme.primary} />
                <Text style={styles.sectionTitle}>Savings Goals</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addSectionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setGoalModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>New Goal</Text>
              </Pressable>
            </View>

            {goals.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="trophy-outline" size={28} color={theme.textMuted} />
                <Text style={styles.emptyStateTitle}>No Active Goals</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Create a savings goal for an Emergency Fund, Travel, or New Gadget.
                </Text>
              </View>
            ) : (
              goals.map(goal => {
                const progress =
                  goal.targetAmount > 0
                    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                    : 0;

                return (
                  <Pressable
                    key={goal.id}
                    style={({ pressed }) => [styles.planCard, pressed && { opacity: 0.9 }]}
                    onPress={() => openGoalSheet(goal, 'deposit')}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.catTitleGroup}>
                        <View style={[styles.iconBox, { backgroundColor: `${goal.color || theme.primary}25` }]}>
                          <Ionicons name="trophy-outline" size={16} color={goal.color || theme.primary} />
                        </View>
                        <View>
                          <Text style={styles.cardTitleText}>{goal.name}</Text>
                          <Text style={styles.cardSubText}>
                            {progress}% reached &bull; Needs {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount), currency)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardRightGroup}>
                        <Text style={styles.cardAmountHighlight}>
                          {formatCurrency(goal.currentAmount, currency)}
                        </Text>
                        <Text style={styles.cardLimitSub}>target {formatCurrency(goal.targetAmount, currency)}</Text>
                      </View>
                    </View>

                    <View style={styles.cardProgressBarBg}>
                      <View
                        style={[
                          styles.cardProgressBarFill,
                          { width: `${progress}%`, backgroundColor: goal.color || theme.primary },
                        ]}
                      />
                    </View>

                    {/* Action Row */}
                    <View style={styles.cardFooterRow}>
                      <Text style={styles.percentLabel}>
                        {goal.targetDate ? `Target: ${goal.targetDate}` : 'Open-ended'}
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable
                          style={styles.contributeButton}
                          onPress={() => openGoalSheet(goal, 'deposit')}
                        >
                          <Ionicons name="arrow-down-circle-outline" size={14} color={theme.primary} />
                          <Text style={styles.contributeButtonText}>Deposit Funds</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.contributeButton, { backgroundColor: theme.surface2 }]}
                          onPress={() => openGoalSheet(goal, 'withdraw')}
                        >
                          <Ionicons name="arrow-up-circle-outline" size={14} color={theme.textSecondary} />
                          <Text style={[styles.contributeButtonText, { color: theme.textSecondary }]}>Withdraw</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* SECTION 3: RECURRING BILLS & SUBSCRIPTIONS */}
        {(activeFilter === 'all' || activeFilter === 'bills') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="repeat-outline" size={18} color={theme.primary} />
                <Text style={styles.sectionTitle}>Recurring Bills & Subs</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addSectionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setRecModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>Add Bill</Text>
              </Pressable>
            </View>

            {recurring.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="repeat-outline" size={28} color={theme.textMuted} />
                <Text style={styles.emptyStateTitle}>No Recurring Items</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Track your monthly rent, internet, Spotify, or Netflix to forecast upcoming expenses.
                </Text>
              </View>
            ) : (
              recurring.map(rec => {
                const isExpense = rec.type === 'expense';
                const acc = accounts.find(a => a.id === rec.accountId);
                return (
                  <View key={rec.id} style={[styles.planCard, !rec.isActive && { opacity: 0.6 }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.catTitleGroup}>
                        <View
                          style={[
                            styles.iconBox,
                            { backgroundColor: isExpense ? 'rgba(239, 68, 68, 0.15)' : theme.primarySoft },
                          ]}
                        >
                          <Ionicons
                            name={isExpense ? 'arrow-up-outline' : 'arrow-down-outline'}
                            size={16}
                            color={isExpense ? theme.danger : theme.primary}
                          />
                        </View>
                        <View>
                          <Text style={styles.cardTitleText}>{rec.name}</Text>
                          <Text style={styles.cardSubText}>
                            {rec.frequency.toUpperCase()} &bull; {acc ? acc.name : 'All Accounts'} &bull; Next: {rec.nextDueDate || 'Active'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardRightGroup}>
                        <Text
                          style={[
                            styles.cardAmountHighlight,
                            { color: isExpense ? theme.danger : theme.primary },
                          ]}
                        >
                          {isExpense ? '-' : '+'}{formatCurrency(rec.amount, currency)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <Pressable
                            style={[styles.statusTogglePill, !rec.isActive && styles.statusTogglePillPaused]}
                            onPress={() => onToggleRecurring?.(rec.id)}
                          >
                            <Text style={[styles.statusToggleText, !rec.isActive && { color: theme.textMuted }]}>
                              {rec.isActive ? 'Active' : 'Paused'}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.statusTogglePill, { backgroundColor: theme.dangerSoft }]}
                            onPress={() => onDeleteRecurring?.(rec.id)}
                          >
                            <Ionicons name="trash-outline" size={12} color={theme.danger} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* SECTION 4: INSTALLMENTS & LOANS (Tarsi Pro) */}
        {(activeFilter === 'all' || activeFilter === 'installments') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="card-outline" size={18} color={theme.primary} />
                <Text style={styles.sectionTitle}>Installment Plans</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addSectionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setInstModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>Add Plan</Text>
              </Pressable>
            </View>

            {installments.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="card-outline" size={28} color={theme.textMuted} />
                <Text style={styles.emptyStateTitle}>No Installment Plans</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Track 0% interest credit card purchases, gadgets, or personal loans term by term.
                </Text>
              </View>
            ) : (
              installments.map(inst => {
                const isCompleted = inst.paidTerms >= inst.totalTerms;
                const progress = Math.min(100, Math.round((inst.paidTerms / inst.totalTerms) * 100));

                return (
                  <View key={inst.id} style={[styles.planCard, isCompleted && { opacity: 0.6 }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.catTitleGroup}>
                        <View style={[styles.iconBox, { backgroundColor: '#1A293B' }]}>
                          <Ionicons name="card-outline" size={16} color="#38BDF8" />
                        </View>
                        <View>
                          <Text style={styles.cardTitleText}>{inst.name}</Text>
                          <Text style={styles.cardSubText}>
                            {inst.paidTerms} of {inst.totalTerms} terms paid &bull; {formatCurrency(inst.monthlyAmount, currency)}/mo
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardRightGroup}>
                        <Text style={styles.cardAmountHighlight}>
                          {formatCurrency(inst.totalAmount, currency)}
                        </Text>
                        <Text style={styles.cardLimitSub}>
                          {isCompleted ? 'Completed' : `${formatCurrency(inst.totalAmount - (inst.paidTerms * inst.monthlyAmount), currency)} remaining`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardProgressBarBg}>
                      <View
                        style={[
                          styles.cardProgressBarFill,
                          { width: `${progress}%`, backgroundColor: isCompleted ? theme.success : '#38BDF8' },
                        ]}
                      />
                    </View>

                    <View style={styles.cardFooterRow}>
                      <Text style={styles.percentLabel}>{progress}% amortized</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {!isCompleted && (
                          <Pressable
                            style={styles.contributeButton}
                            onPress={() => onIncrementInstallment?.(inst.id)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={14} color={theme.primary} />
                            <Text style={styles.contributeButtonText}>+1 Term Paid</Text>
                          </Pressable>
                        )}
                        <Pressable
                          style={[styles.cardEditAction, { backgroundColor: theme.dangerSoft }]}
                          onPress={() => onDeleteInstallment?.(inst.id)}
                        >
                          <Ionicons name="trash-outline" size={13} color={theme.danger} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* SECTION 5: DEBTS & RECEIVABLES */}
        {(activeFilter === 'all' || activeFilter === 'debts') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="swap-horizontal-outline" size={18} color={theme.primary} />
                <Text style={styles.sectionTitle}>Money Owed (Debts)</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addSectionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setDebtModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>Add Entry</Text>
              </Pressable>
            </View>

            {debts.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="receipt-outline" size={28} color={theme.textMuted} />
                <Text style={styles.emptyStateTitle}>No Outstanding Debts</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Keep track of money you owe or personal money borrowed by friends.
                </Text>
              </View>
            ) : (
              debts.map(debt => {
                const isClosed = Boolean(debt.closedAt);
                const isDebt = debt.type === 'debt';

                return (
                  <View key={debt.id} style={[styles.planCard, isClosed && { opacity: 0.5 }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.catTitleGroup}>
                        <View
                          style={[
                            styles.iconBox,
                            {
                              backgroundColor: isDebt ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            },
                          ]}
                        >
                          <Ionicons
                            name={isDebt ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                            size={16}
                            color={isDebt ? theme.danger : '#38BDF8'}
                          />
                        </View>
                        <View>
                          <Text style={[styles.cardTitleText, isClosed && styles.strikethrough]}>
                            {debt.name}
                          </Text>
                          <Text style={styles.cardSubText}>
                            {isDebt ? 'You Owe' : 'Owed to You'}
                            {debt.dueDate ? ` \u2022 Due ${debt.dueDate}` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardRightGroup}>
                        <Text
                          style={[
                            styles.cardAmountHighlight,
                            { color: isDebt ? theme.danger : '#38BDF8' },
                          ]}
                        >
                          {formatCurrency(debt.amount, currency)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <Pressable
                            style={[styles.statusTogglePill, isClosed && styles.statusTogglePillPaused]}
                            onPress={() => onToggleDebt?.(debt.id)}
                          >
                            <Text style={[styles.statusToggleText, isClosed && { color: theme.textMuted }]}>
                              {isClosed ? 'Settled' : 'Mark Settled'}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.statusTogglePill, { backgroundColor: theme.dangerSoft }]}
                            onPress={() => onDeleteDebt?.(debt.id)}
                          >
                            <Ionicons name="trash-outline" size={12} color={theme.danger} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* SECTION 6: BIR 2026 INCOME TAX ESTIMATOR */}
        {(activeFilter === 'all' || activeFilter === 'tax') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="calculator-outline" size={18} color={theme.primary} />
                <Text style={styles.sectionTitle}>BIR 2026 Tax Estimator</Text>
              </View>
            </View>

            <View style={styles.planCard}>
              <View style={styles.taxResultBanner}>
                <Text style={styles.taxBannerLabel}>Estimated Annual Tax</Text>
                <Text style={styles.taxBannerAmount}>
                  {taxCalculation.taxDue !== null ? formatCurrency(taxCalculation.taxDue, 'PHP') : '₱0.00'}
                </Text>
                <Text style={styles.taxBannerSub}>
                  Monthly Equivalent:{' '}
                  {taxCalculation.monthlyEquivalent !== null
                    ? formatCurrency(taxCalculation.monthlyEquivalent, 'PHP')
                    : '₱0.00'}{' '}
                  &bull; Effective Rate:{' '}
                  {taxCalculation.effectiveRate ? `${(taxCalculation.effectiveRate * 100).toFixed(1)}%` : '0%'}
                </Text>
              </View>

              <AmountDisplayCard
                label="Annual Taxable Income (PHP)"
                value={taxAnnualIncome}
                currency="PHP"
                isActive={taxCalculatorModalOpen}
                onPress={() => setTaxCalculatorModalOpen(true)}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Tax Regime</Text>
              <View style={styles.regimeRow}>
                <Pressable
                  style={[styles.regimeBtn, taxRegime === 'compensation' && styles.regimeBtnActive]}
                  onPress={() => setTaxRegime('compensation')}
                >
                  <Text style={[styles.regimeBtnText, taxRegime === 'compensation' && styles.regimeBtnTextActive]}>
                    Employed (Graduated)
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.regimeBtn, taxRegime === 'self-employed-8' && styles.regimeBtnActive]}
                  onPress={() => setTaxRegime('self-employed-8')}
                >
                  <Text
                    style={[
                      styles.regimeBtnText,
                      taxRegime === 'self-employed-8' && styles.regimeBtnTextActive,
                    ]}
                  >
                    8% Self-Employed
                  </Text>
                </Pressable>
              </View>

              <View style={styles.taxFormulaBox}>
                <Text style={styles.taxFormulaTitle}>Rule Basis</Text>
                <Text style={styles.taxFormulaBody}>{taxCalculation.formulaLabel}</Text>
                {taxCalculation.statusMessage ? (
                  <Text style={styles.taxFormulaSub}>{taxCalculation.statusMessage}</Text>
                ) : null}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: bottomInset + 120 }} />
      </ScrollView>

      {/* ================= MODALS ================= */}

      {/* BIR Tax Keypad Modal */}
      <Modal
        visible={taxCalculatorModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTaxCalculatorModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '88%' }]}>
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Annual Taxable Income</Text>
                <Text style={styles.modalSubheading}>
                  Calculate monthly compensation x months or enter annual gross
                </Text>
              </View>
              <Pressable
                style={styles.closeCircleBtn}
                onPress={() => setTaxCalculatorModalOpen(false)}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <CalculatorKeypad
                currency="PHP"
                initialValue={taxAnnualIncome || '600000'}
                showPreview={true}
                showFooterAction={true}
                footerActionLabel="Apply Tax Income"
                onApply={(val) => {
                  setTaxAnnualIncome(String(val));
                  setTaxCalculatorModalOpen(false);
                }}
                onHidePress={() => setTaxCalculatorModalOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* TARSI GOAL MANAGE / DEPOSIT SHEET */}
      <Modal
        visible={Boolean(selectedGoal)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedGoal(null);
          setIsEditGoalKeypadOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.goalSheetCard, { height: '92%' }]}>
            <View style={styles.sheetHandleBar} />

            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetTitle}>{selectedGoal?.name}</Text>
                <Text style={styles.sheetSub}>
                  Saved {formatCurrency(selectedGoal?.currentAmount || 0, currency)} of{' '}
                  {formatCurrency(selectedGoal?.targetAmount || 0, currency)}
                </Text>
              </View>
              <Pressable
                style={styles.closeCircleBtn}
                onPress={() => {
                  setSelectedGoal(null);
                  setIsEditGoalKeypadOpen(false);
                }}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            {/* Action Segmented Switcher */}
            <View style={styles.goalActionSwitcher}>
              <Pressable
                style={[styles.switcherBtn, goalActionTab === 'deposit' && styles.switcherBtnActive]}
                onPress={() => {
                  setGoalActionTab('deposit');
                  setIsEditGoalKeypadOpen(false);
                }}
              >
                <Text style={[styles.switcherBtnText, goalActionTab === 'deposit' && styles.switcherBtnTextActive]}>
                  Deposit Funds
                </Text>
              </Pressable>
              <Pressable
                style={[styles.switcherBtn, goalActionTab === 'withdraw' && styles.switcherBtnActive]}
                onPress={() => {
                  setGoalActionTab('withdraw');
                  setIsEditGoalKeypadOpen(false);
                }}
              >
                <Text style={[styles.switcherBtnText, goalActionTab === 'withdraw' && styles.switcherBtnTextActive]}>
                  Withdraw
                </Text>
              </Pressable>
              <Pressable
                style={[styles.switcherBtn, goalActionTab === 'edit' && styles.switcherBtnActive]}
                onPress={() => setGoalActionTab('edit')}
              >
                <Text style={[styles.switcherBtnText, goalActionTab === 'edit' && styles.switcherBtnTextActive]}>
                  Edit Goal
                </Text>
              </Pressable>
            </View>

            {/* TAB: DEPOSIT OR WITHDRAW */}
            {(goalActionTab === 'deposit' || goalActionTab === 'withdraw') && (
              <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  <Text style={styles.fieldLabel}>
                    {goalActionTab === 'deposit' ? 'From Account' : 'To Account'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountPillsScroll}>
                    {accounts.map(acc => {
                      const isSelected = selectedFundingAccountId === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          style={[styles.accPill, isSelected && styles.accPillActive]}
                          onPress={() => setSelectedFundingAccountId(acc.id)}
                        >
                          <View style={[styles.accDot, { backgroundColor: acc.color }]} />
                          <Text style={[styles.accPillText, isSelected && styles.accPillTextActive]}>
                            {acc.name} ({formatCurrency(acc.balance, currency)})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Quick Presets */}
                  <View style={styles.quickChipsRow}>
                    {[500, 1000, 2500, 5000].map(amt => (
                      <Pressable
                        key={amt}
                        style={styles.presetChip}
                        onPress={() => {
                          const curr = parseFloat(depositAmountInput) || 0;
                          setDepositAmountInput(String(curr + amt));
                          setDepositExpression('');
                        }}
                      >
                        <Text style={styles.presetChipText}>+{amt.toLocaleString()}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <AmountDisplayCard
                    label={goalActionTab === 'deposit' ? 'Deposit Amount' : 'Withdrawal Amount'}
                    value={depositAmountInput}
                    currency={currency}
                    expression={depositExpression}
                    isActive={true}
                    onPress={() => {}}
                  />
                </ScrollView>

                <View style={styles.keypadDock}>
                  <CalculatorKeypad
                    compact
                    showPreview={false}
                    initialValue={depositAmountInput || '0'}
                    onValueChange={(val, cur, expr) => {
                      setDepositAmountInput(cur);
                      setDepositExpression(expr);
                    }}
                    showFooterAction
                    footerActionLabel={goalActionTab === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                    onFooterActionPress={handleGoalDepositConfirm}
                  />
                </View>
              </View>
            )}

            {/* TAB: EDIT GOAL */}
            {goalActionTab === 'edit' && (
              <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={styles.fieldLabel}>Goal Title</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editGoalName}
                    onChangeText={setEditGoalName}
                    placeholder="Goal Title"
                    placeholderTextColor={theme.textMuted}
                    onFocus={() => setIsEditGoalKeypadOpen(false)}
                  />

                  <AmountDisplayCard
                    label="Target Amount"
                    value={editGoalTarget}
                    currency={currency}
                    isActive={isEditGoalKeypadOpen}
                    onPress={() => {
                      Keyboard.dismiss();
                      setIsEditGoalKeypadOpen(true);
                    }}
                  />

                  {!isEditGoalKeypadOpen && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                      <Pressable
                        style={styles.deleteDangerBtn}
                        onPress={handleDeleteGoalConfirm}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.danger} />
                        <Text style={styles.deleteDangerBtnText}>Delete</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.primaryActionBtn, { flex: 2, marginTop: 0 }]}
                        onPress={handleUpdateGoalConfirm}
                      >
                        <Text style={styles.primaryActionBtnText}>Save Changes</Text>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>

                {isEditGoalKeypadOpen && (
                  <View style={styles.keypadDock}>
                    <CalculatorKeypad
                      compact
                      showPreview={false}
                      initialValue={editGoalTarget || '0'}
                      onValueChange={(val, cur) => setEditGoalTarget(cur)}
                      showFooterAction
                      footerActionLabel="Done"
                      onFooterActionPress={() => setIsEditGoalKeypadOpen(false)}
                      onHidePress={() => setIsEditGoalKeypadOpen(false)}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Set Category Budget Modal */}
      <Modal visible={budgetModalOpen} transparent animationType="fade" onRequestClose={() => setBudgetModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '90%' }]}>
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Set Category Budget</Text>
                <Text style={styles.modalSubheading}>Choose category and spending limit</Text>
              </View>
              <Pressable style={styles.closeCircleBtn} onPress={() => setBudgetModalOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Interval Switcher */}
              <View style={styles.regimeRow}>
                {(['monthly', 'weekly', 'yearly'] as const).map(inv => (
                  <Pressable
                    key={inv}
                    style={[styles.regimeBtn, budgetInterval === inv && styles.regimeBtnActive]}
                    onPress={() => setBudgetInterval(inv)}
                  >
                    <Text style={[styles.regimeBtnText, budgetInterval === inv && styles.regimeBtnTextActive]}>
                      {inv.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.catPickerScroll, { marginTop: 14 }]}>
                {categories.map(c => {
                  const isSelected = selectedBudgetCatId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.catChip,
                        isSelected && { backgroundColor: c.color || theme.primary, borderColor: c.color || theme.primary },
                      ]}
                      onPress={() => setSelectedBudgetCatId(c.id)}
                    >
                      <Text style={[styles.catChipText, isSelected && { color: '#FFFFFF', fontWeight: '700' }]}>
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <AmountDisplayCard
                label="Budget Spending Limit"
                value={budgetAmountInput}
                currency={currency}
                isActive={true}
                onPress={() => {}}
              />
            </ScrollView>

            <View style={styles.keypadDock}>
              <CalculatorKeypad
                compact
                showPreview={false}
                initialValue={budgetAmountInput || '0'}
                onValueChange={(val, cur) => setBudgetAmountInput(cur)}
                showFooterAction
                footerActionLabel="Save Budget"
                onFooterActionPress={handleSaveBudget}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* New Goal Creation Modal */}
      <Modal visible={goalModalOpen} transparent animationType="fade" onRequestClose={() => { setGoalModalOpen(false); setIsNewGoalKeypadOpen(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isNewGoalKeypadOpen && { height: '90%' }]}>
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>New Savings Goal</Text>
                <Text style={styles.modalSubheading}>Set a target to achieve over time</Text>
              </View>
              <Pressable style={styles.closeCircleBtn} onPress={() => { setGoalModalOpen(false); setIsNewGoalKeypadOpen(false); }}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Goal Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Goal Name (e.g. Emergency Fund, Japan Trip)"
                placeholderTextColor={theme.textMuted}
                value={goalName}
                onChangeText={setGoalName}
                onFocus={() => setIsNewGoalKeypadOpen(false)}
              />

              <AmountDisplayCard
                label="Target Amount"
                value={goalTargetAmount}
                currency={currency}
                isActive={isNewGoalKeypadOpen}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsNewGoalKeypadOpen(true);
                }}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Target Date (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Target Date (YYYY-MM-DD)"
                placeholderTextColor={theme.textMuted}
                value={goalTargetDate}
                onChangeText={setGoalTargetDate}
                onFocus={() => setIsNewGoalKeypadOpen(false)}
              />
            </ScrollView>

            {isNewGoalKeypadOpen ? (
              <View style={styles.keypadDock}>
                <CalculatorKeypad
                  compact
                  showPreview={false}
                  initialValue={goalTargetAmount || '0'}
                  onValueChange={(val, cur) => setGoalTargetAmount(cur)}
                  showFooterAction
                  footerActionLabel="Done"
                  onFooterActionPress={() => setIsNewGoalKeypadOpen(false)}
                  onHidePress={() => setIsNewGoalKeypadOpen(false)}
                />
              </View>
            ) : (
              <View style={styles.modalBtnRow}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setGoalModalOpen(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={handleSaveGoal}>
                  <Text style={styles.modalSaveBtnText}>Create Goal</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Debt / Receivable Modal */}
      <Modal visible={debtModalOpen} transparent animationType="fade" onRequestClose={() => { setDebtModalOpen(false); setIsDebtKeypadOpen(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDebtKeypadOpen && { height: '90%' }]}>
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Track Debt or Owed Money</Text>
                <Text style={styles.modalSubheading}>Record money borrowed or lent</Text>
              </View>
              <Pressable style={styles.closeCircleBtn} onPress={() => { setDebtModalOpen(false); setIsDebtKeypadOpen(false); }}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.regimeRow}>
                <Pressable
                  style={[styles.regimeBtn, debtType === 'debt' && styles.regimeBtnActive]}
                  onPress={() => setDebtType('debt')}
                >
                  <Text style={[styles.regimeBtnText, debtType === 'debt' && styles.regimeBtnTextActive]}>
                    I Owe Money
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.regimeBtn, debtType === 'receivable' && styles.regimeBtnActive]}
                  onPress={() => setDebtType('receivable')}
                >
                  <Text style={[styles.regimeBtnText, debtType === 'receivable' && styles.regimeBtnTextActive]}>
                    Owed to Me
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Person / Description</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Person / Description (e.g. Juan, Maya Loan)"
                placeholderTextColor={theme.textMuted}
                value={debtName}
                onChangeText={setDebtName}
                onFocus={() => setIsDebtKeypadOpen(false)}
              />

              <AmountDisplayCard
                label="Amount"
                value={debtAmount}
                currency={currency}
                isActive={isDebtKeypadOpen}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsDebtKeypadOpen(true);
                }}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Due Date (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Due Date (YYYY-MM-DD)"
                placeholderTextColor={theme.textMuted}
                value={debtDueDate}
                onChangeText={setDebtDueDate}
                onFocus={() => setIsDebtKeypadOpen(false)}
              />
            </ScrollView>

            {isDebtKeypadOpen ? (
              <View style={styles.keypadDock}>
                <CalculatorKeypad
                  compact
                  showPreview={false}
                  initialValue={debtAmount || '0'}
                  onValueChange={(val, cur) => setDebtAmount(cur)}
                  showFooterAction
                  footerActionLabel="Done"
                  onFooterActionPress={() => setIsDebtKeypadOpen(false)}
                  onHidePress={() => setIsDebtKeypadOpen(false)}
                />
              </View>
            ) : (
              <View style={styles.modalBtnRow}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setDebtModalOpen(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={handleSaveDebt}>
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Recurring Modal */}
      <Modal visible={recModalOpen} transparent animationType="fade" onRequestClose={() => { setRecModalOpen(false); setIsRecKeypadOpen(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isRecKeypadOpen && { height: '90%' }]}>
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Add Recurring Bill / Sub</Text>
                <Text style={styles.modalSubheading}>Automate cash flow commitments</Text>
              </View>
              <Pressable style={styles.closeCircleBtn} onPress={() => { setRecModalOpen(false); setIsRecKeypadOpen(false); }}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.regimeRow}>
                <Pressable
                  style={[styles.regimeBtn, recType === 'expense' && styles.regimeBtnActive]}
                  onPress={() => setRecType('expense')}
                >
                  <Text style={[styles.regimeBtnText, recType === 'expense' && styles.regimeBtnTextActive]}>
                    Bill / Expense
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.regimeBtn, recType === 'income' && styles.regimeBtnActive]}
                  onPress={() => setRecType('income')}
                >
                  <Text style={[styles.regimeBtnText, recType === 'income' && styles.regimeBtnTextActive]}>
                    Recurring Income
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Title (e.g. Fiber Wifi, Rent, Netflix)"
                placeholderTextColor={theme.textMuted}
                value={recName}
                onChangeText={setRecName}
                onFocus={() => setIsRecKeypadOpen(false)}
              />

              <AmountDisplayCard
                label="Amount"
                value={recAmount}
                currency={currency}
                isActive={isRecKeypadOpen}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsRecKeypadOpen(true);
                }}
              />
            </ScrollView>

            {isRecKeypadOpen ? (
              <View style={styles.keypadDock}>
                <CalculatorKeypad
                  compact
                  showPreview={false}
                  initialValue={recAmount || '0'}
                  onValueChange={(val, cur) => setRecAmount(cur)}
                  showFooterAction
                  footerActionLabel="Done"
                  onFooterActionPress={() => setIsRecKeypadOpen(false)}
                  onHidePress={() => setIsRecKeypadOpen(false)}
                />
              </View>
            ) : (
              <View style={styles.modalBtnRow}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setRecModalOpen(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={handleSaveRecurring}>
                  <Text style={styles.modalSaveBtnText}>Save Recurring</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Installment Plan Modal (Tarsi Pro) */}
      <Modal visible={instModalOpen} transparent animationType="fade" onRequestClose={() => { setInstModalOpen(false); setIsInstKeypadOpen(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isInstKeypadOpen && { height: '92%' }]}>
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Add Installment Plan</Text>
                <Text style={styles.modalSubheading}>Track 0% interest and loan amortizations</Text>
              </View>
              <Pressable style={styles.closeCircleBtn} onPress={() => { setInstModalOpen(false); setIsInstKeypadOpen(false); }}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Item Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Item Name (e.g. MacBook Pro, Phone)"
                placeholderTextColor={theme.textMuted}
                value={instName}
                onChangeText={setInstName}
                onFocus={() => setIsInstKeypadOpen(false)}
              />

              <AmountDisplayCard
                label="Total Plan Amount"
                value={instTotalAmount}
                currency={currency}
                isActive={isInstKeypadOpen}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsInstKeypadOpen(true);
                }}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Amortization Terms</Text>
              <View style={styles.regimeRow}>
                {['3', '6', '12', '18', '24', '36'].map(term => (
                  <Pressable
                    key={term}
                    style={[styles.regimeBtn, instTotalTerms === term && styles.regimeBtnActive]}
                    onPress={() => setInstTotalTerms(term)}
                  >
                    <Text style={[styles.regimeBtnText, instTotalTerms === term && styles.regimeBtnTextActive]}>
                      {term} mos
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Monthly breakdown summary */}
              {parseFloat(instTotalAmount) > 0 && (
                <View style={styles.instSummaryBanner}>
                  <Text style={styles.instSummaryLabel}>Estimated Monthly Payment</Text>
                  <Text style={styles.instSummaryAmount}>
                    {formatCurrency(
                      (parseFloat(instTotalAmount) || 0) / (parseInt(instTotalTerms, 10) || 12),
                      currency
                    )}{' '}
                    / month
                  </Text>
                </View>
              )}
            </ScrollView>

            {isInstKeypadOpen ? (
              <View style={styles.keypadDock}>
                <CalculatorKeypad
                  compact
                  showPreview={false}
                  initialValue={instTotalAmount || '0'}
                  onValueChange={(val, cur) => setInstTotalAmount(cur)}
                  showFooterAction
                  footerActionLabel="Done"
                  onFooterActionPress={() => setIsInstKeypadOpen(false)}
                  onHidePress={() => setIsInstKeypadOpen(false)}
                />
              </View>
            ) : (
              <View style={styles.modalBtnRow}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setInstModalOpen(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={handleSaveInstallment}>
                  <Text style={styles.modalSaveBtnText}>Save Plan</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  filterBar: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.cardBorder,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: theme.surface1,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  heroOverviewCard: {
    backgroundColor: theme.surface1,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.primary,
  },
  heroProgressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.surface2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.cardBorder,
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.cardBorder,
    marginHorizontal: 14,
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.3,
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
  },
  addSectionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.primary,
  },
  emptyStateCard: {
    backgroundColor: theme.surface1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
    marginTop: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  planCard: {
    backgroundColor: theme.surface1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  cardSubText: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 1,
  },
  cardRightGroup: {
    alignItems: 'flex-end',
  },
  cardAmountHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
  },
  cardLimitSub: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 1,
  },
  cardProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.surface2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
  },
  cardEditAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.surface2,
  },
  cardEditActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  contributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
  },
  contributeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
  },
  statusTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.primarySoft,
  },
  statusTogglePillPaused: {
    backgroundColor: theme.surface2,
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.primary,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: theme.textMuted,
  },
  taxResultBanner: {
    backgroundColor: theme.surface2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  taxBannerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taxBannerAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.primary,
    marginVertical: 4,
  },
  taxBannerSub: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#0A0E0D',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    color: theme.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  regimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  regimeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  regimeBtnActive: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  regimeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  regimeBtnTextActive: {
    color: theme.primary,
  },
  taxFormulaBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.surface2,
  },
  taxFormulaTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textMuted,
    textTransform: 'uppercase',
  },
  taxFormulaBody: {
    fontSize: 12,
    color: theme.text,
    marginTop: 4,
    lineHeight: 17,
  },
  taxFormulaSub: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.surface1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.3,
  },
  modalSubheading: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
    marginBottom: 16,
  },
  catPickerScroll: {
    marginBottom: 14,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Tarsi Goal Manage Sheet Styles */
  goalSheetCard: {
    backgroundColor: theme.surface1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.cardBorder,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalActionSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0A0E0D',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  switcherBtn: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  switcherBtnActive: {
    backgroundColor: theme.primary,
  },
  switcherBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  switcherBtnTextActive: {
    color: '#FFFFFF',
  },
  accountPillsScroll: {
    marginBottom: 12,
  },
  accPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: theme.surface2,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  accPillActive: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  accDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  accPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  accPillTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.text,
  },
  primaryActionBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteDangerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteDangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.danger,
  },
  amountCardWrapper: {
    marginTop: 12,
  },
  interactiveAmountCard: {
    backgroundColor: theme.surface2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: theme.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  interactiveAmountCardActive: {
    borderColor: theme.primary,
    backgroundColor: theme.surface1,
  },
  amountCardLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  amountCardExpression: {
    fontSize: 12,
    color: theme.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  amountCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountCardCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.primary,
    marginRight: 6,
  },
  amountCardValueText: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  amountCardCursor: {
    width: 2,
    height: 22,
    backgroundColor: theme.primary,
    marginLeft: 4,
    borderRadius: 1,
  },
  amountCardIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.surface1,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  amountCardIconBadgeActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  keypadDock: {
    backgroundColor: theme.surface1,
    borderTopWidth: 1,
    borderTopColor: theme.cardBorder,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  instSummaryBanner: {
    backgroundColor: theme.surface2,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  instSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  instSummaryAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.primary,
  },
  taxIncomeTouchCard: {
    backgroundColor: theme.surface2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  taxIncomeTouchSub: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textMuted,
    marginBottom: 2,
  },
  taxIncomeTouchValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  taxCalcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surface1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  taxCalcBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
  },
});
