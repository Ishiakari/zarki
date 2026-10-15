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

interface PlanScreenProps {
  budgets: Budget[];
  goals: Goal[];
  debts: DebtReceivable[];
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  recurring: RecurringTransaction[];
  shoppingList: ShoppingItem[];
  warranties: WarrantyItem[];
  notes: FinanceNote[];
  currency: string;
  bottomInset?: number;
  onSetBudget?: (categoryId: string, amount: number) => void;
  onAddGoal?: (goal: Omit<Goal, 'id'>) => void;
  onContributeGoal?: (goalId: string, amount: number) => void;
  onAddDebt?: (debt: Omit<DebtReceivable, 'id'>) => void;
  onToggleDebt?: (debtId: string) => void;
  onAddRecurring?: (rec: Omit<RecurringTransaction, 'id'>) => void;
  onToggleRecurring?: (recId: string) => void;
  onAddShoppingItem?: (title: string, cost?: number) => void;
  onToggleShoppingItem?: (id: string) => void;
  onAddWarranty?: (w: Omit<WarrantyItem, 'id'>) => void;
  onSaveNote?: (id: string | null, title: string, content: string) => void;
}

type PlanTab = 'overview' | 'recurring' | 'debts' | 'tools' | 'tax';

export const PlanScreen: React.FC<PlanScreenProps> = ({
  budgets,
  goals,
  debts,
  transactions,
  categories,
  accounts,
  recurring,
  shoppingList,
  warranties,
  notes,
  currency,
  bottomInset = 20,
  onSetBudget,
  onAddGoal,
  onContributeGoal,
  onAddDebt,
  onToggleDebt,
  onAddRecurring,
  onToggleRecurring,
  onAddShoppingItem,
  onToggleShoppingItem,
  onAddWarranty,
  onSaveNote,
}) => {
  const [activeTab, setActiveTab] = useState<PlanTab>('overview');

  // Modals
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedBudgetCatId, setSelectedBudgetCatId] = useState<string>(categories[0]?.id || '');
  const [budgetAmountInput, setBudgetAmountInput] = useState('');

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');

  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState<'debt' | 'receivable'>('debt');
  const [debtDueDate, setDebtDueDate] = useState('');

  const [recModalOpen, setRecModalOpen] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');
  const [recFrequency, setRecFrequency] = useState<'monthly' | 'weekly'>('monthly');

  // BIR Tax Calculator State
  const [taxAnnualIncome, setTaxAnnualIncome] = useState('600000');
  const [taxRegime, setTaxRegime] = useState<TaxRegimeMode>('compensation');

  // Tools Modal
  const [newShopTitle, setNewShopTitle] = useState('');
  const [newShopCost, setNewShopCost] = useState('');

  const currentYearMonth = new Date().toISOString().substring(0, 7);
  const totalMonthlySpend = calculateMonthlySpending(transactions, currentYearMonth);

  // Compute 12-month expected bills projection
  const monthlyRecurringBills = recurring
    .filter(r => r.isActive && r.type === 'expense')
    .reduce((sum, r) => sum + (r.frequency === 'weekly' ? r.amount * 4 : r.amount), 0);

  const monthlyRecurringIncome = recurring
    .filter(r => r.isActive && r.type === 'income')
    .reduce((sum, r) => sum + (r.frequency === 'weekly' ? r.amount * 4 : r.amount), 0);

  const handleSaveBudget = () => {
    const val = parseFloat(budgetAmountInput);
    if (!isNaN(val) && selectedBudgetCatId) {
      onSetBudget?.(selectedBudgetCatId, val);
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
        color: '#508A59',
      });
      setGoalModalOpen(false);
      setGoalName('');
      setGoalTargetAmount('');
    }
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
        accountId: accounts[0]?.id || '',
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

  const taxCalculation = computePhilippineIncomeTax2026(
    parseFloat(taxAnnualIncome) || 0,
    taxRegime
  );

  return (
    <View style={styles.screen}>
      {/* Plan Sub-Navigation Tabs */}
      <View style={styles.subTabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsContent}>
          <Pressable
            style={[styles.subTabButton, activeTab === 'overview' && styles.subTabButtonActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.subTabText, activeTab === 'overview' && styles.subTabTextActive]}>Overview</Text>
          </Pressable>
          <Pressable
            style={[styles.subTabButton, activeTab === 'recurring' && styles.subTabButtonActive]}
            onPress={() => setActiveTab('recurring')}
          >
            <Text style={[styles.subTabText, activeTab === 'recurring' && styles.subTabTextActive]}>Recurring Bills</Text>
          </Pressable>
          <Pressable
            style={[styles.subTabButton, activeTab === 'debts' && styles.subTabButtonActive]}
            onPress={() => setActiveTab('debts')}
          >
            <Text style={[styles.subTabText, activeTab === 'debts' && styles.subTabTextActive]}>Debts & Owed</Text>
          </Pressable>
          <Pressable
            style={[styles.subTabButton, activeTab === 'tax' && styles.subTabButtonActive]}
            onPress={() => setActiveTab('tax')}
          >
            <Text style={[styles.subTabText, activeTab === 'tax' && styles.subTabTextActive]}>BIR 2026 Tax</Text>
          </Pressable>
          <Pressable
            style={[styles.subTabButton, activeTab === 'tools' && styles.subTabButtonActive]}
            onPress={() => setActiveTab('tools')}
          >
            <Text style={[styles.subTabText, activeTab === 'tools' && styles.subTabTextActive]}>Tools & Lists</Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* TAB 1: OVERVIEW & BUDGETS */}
        {activeTab === 'overview' && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Month Budget & Spend</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalMonthlySpend, currency)}</Text>
              <Text style={styles.summarySub}>Active spending tracked across all categories</Text>
            </View>

            {/* Category Budgets Header with Add Button */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Category Budgets</Text>
              <Pressable
                style={styles.addSectionBtn}
                onPress={() => setBudgetModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>Set Budget</Text>
              </Pressable>
            </View>

            {budgets.map(budget => {
              const cat = categories.find(c => c.id === budget.categoryId);
              const { spent, limit, remaining, percent } = calculateBudgetProgress(
                budget,
                transactions,
                currentYearMonth
              );
              const isOver = spent > limit && limit > 0;
              const color = cat?.color || theme.primary;

              return (
                <View key={budget.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.catTitleRow}>
                      <View style={[styles.catIconBox, { backgroundColor: `${color}20` }]}>
                        <Ionicons name="pie-chart-outline" size={18} color={color} />
                      </View>
                      <Text style={styles.cardTitle}>{cat?.label || 'Budget'}</Text>
                    </View>
                    <Text style={[styles.cardSubtitle, isOver && { color: theme.danger }]}>
                      {formatCurrency(spent, currency)}{' '}
                      <Text style={{ color: theme.textMuted }}>/ {formatCurrency(limit, currency)}</Text>
                    </Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, percent)}%`,
                          backgroundColor: isOver ? theme.danger : color,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.footerNote}>
                      {isOver
                        ? `Over limit by ${formatCurrency(spent - limit, currency)}`
                        : `${formatCurrency(remaining, currency)} remaining`}
                    </Text>
                    <Text style={[styles.footerPercent, isOver && { color: theme.danger }]}>{percent}%</Text>
                  </View>
                </View>
              );
            })}

            {/* Savings Goals */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Personal Savings Goals</Text>
              <Pressable
                style={styles.addSectionBtn}
                onPress={() => setGoalModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>New Goal</Text>
              </Pressable>
            </View>

            {goals.length === 0 ? (
              <View style={styles.emptyGoalBox}>
                <Ionicons name="flag-outline" size={24} color={theme.textMuted} />
                <Text style={styles.emptyGoalText}>No savings goals set. Create one to start tracking.</Text>
              </View>
            ) : (
              goals.map(goal => {
                const progress =
                  goal.targetAmount > 0
                    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                    : 0;

                return (
                  <View key={goal.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.catTitleRow}>
                        <View style={[styles.catIconBox, { backgroundColor: `${goal.color || theme.primary}20` }]}>
                          <Ionicons name="trophy-outline" size={18} color={goal.color || theme.primary} />
                        </View>
                        <Text style={styles.cardTitle}>{goal.name}</Text>
                      </View>
                      <Text style={styles.cardSubtitle}>
                        {formatCurrency(goal.currentAmount, currency)}{' '}
                        <Text style={{ color: theme.textMuted }}>/ {formatCurrency(goal.targetAmount, currency)}</Text>
                      </Text>
                    </View>

                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${progress}%`, backgroundColor: goal.color || theme.primary },
                        ]}
                      />
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.footerNote}>{progress}% Achieved</Text>
                      <Pressable
                        style={styles.contributeChip}
                        onPress={() => onContributeGoal?.(goal.id, 500)}
                      >
                        <Text style={styles.contributeChipText}>+ {formatCurrency(500, currency)}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* TAB 2: RECURRING BILLS & CASHFLOW */}
        {activeTab === 'recurring' && (
          <>
            <View style={styles.forecastCard}>
              <Text style={styles.summaryLabel}>Expected Monthly Cashflow</Text>
              <View style={styles.forecastRow}>
                <View>
                  <Text style={styles.forecastMetricLabel}>Recurring Bills</Text>
                  <Text style={[styles.forecastMetricVal, { color: theme.danger }]}>
                    - {formatCurrency(monthlyRecurringBills, currency)}
                  </Text>
                </View>
                <View style={styles.forecastDivider} />
                <View>
                  <Text style={styles.forecastMetricLabel}>Recurring Income</Text>
                  <Text style={[styles.forecastMetricVal, { color: theme.primary }]}>
                    + {formatCurrency(monthlyRecurringIncome, currency)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Automated & Recurring Items</Text>
              <Pressable
                style={styles.addSectionBtn}
                onPress={() => setRecModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>Add Recurring</Text>
              </Pressable>
            </View>

            {recurring.length === 0 ? (
              <View style={styles.emptyGoalBox}>
                <Ionicons name="repeat-outline" size={24} color={theme.textMuted} />
                <Text style={styles.emptyGoalText}>
                  No recurring bills or subscriptions added. Track rent, internet, and Netflix to project cashflow.
                </Text>
              </View>
            ) : (
              recurring.map(rec => (
                <View key={rec.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.catTitleRow}>
                      <View
                        style={[
                          styles.catIconBox,
                          { backgroundColor: rec.type === 'expense' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(80, 138, 89, 0.15)' },
                        ]}
                      >
                        <Ionicons
                          name={rec.type === 'expense' ? 'arrow-up-outline' : 'arrow-down-outline'}
                          size={18}
                          color={rec.type === 'expense' ? theme.danger : theme.primary}
                        />
                      </View>
                      <View>
                        <Text style={styles.cardTitle}>{rec.name}</Text>
                        <Text style={styles.cardMetaText}>
                          {rec.frequency.toUpperCase()} &bull; Next: {rec.nextDueDate}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={[styles.statusToggle, !rec.isActive && styles.statusToggleInactive]}
                      onPress={() => onToggleRecurring?.(rec.id)}
                    >
                      <Text style={[styles.statusToggleText, !rec.isActive && { color: theme.textMuted }]}>
                        {rec.isActive ? 'Active' : 'Paused'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.recAmountText, { color: rec.type === 'expense' ? theme.danger : theme.primary }]}>
                    {rec.type === 'expense' ? '-' : '+'}{formatCurrency(rec.amount, currency)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {/* TAB 3: DEBTS & RECEIVABLES */}
        {activeTab === 'debts' && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Debts & Money Owed</Text>
              <Pressable
                style={styles.addSectionBtn}
                onPress={() => setDebtModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addSectionBtnText}>Add Entry</Text>
              </Pressable>
            </View>

            {debts.length === 0 ? (
              <View style={styles.emptyGoalBox}>
                <Ionicons name="receipt-outline" size={24} color={theme.textMuted} />
                <Text style={styles.emptyGoalText}>
                  No active debts or receivables. Track money you owe or money friends owe you.
                </Text>
              </View>
            ) : (
              debts.map(debt => {
                const isClosed = Boolean(debt.closedAt);
                const isDebt = debt.type === 'debt';

                return (
                  <View key={debt.id} style={[styles.card, isClosed && { opacity: 0.6 }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.catTitleRow}>
                        <View
                          style={[
                            styles.catIconBox,
                            {
                              backgroundColor: isDebt ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            },
                          ]}
                        >
                          <Ionicons
                            name={isDebt ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                            size={18}
                            color={isDebt ? theme.danger : '#3B82F6'}
                          />
                        </View>
                        <View>
                          <Text style={[styles.cardTitle, isClosed && styles.strikethrough]}>{debt.name}</Text>
                          <Text style={styles.cardMetaText}>
                            {isDebt ? 'You Owe' : 'Owed to You'}{debt.dueDate ? ` \u00B7 Due ${debt.dueDate}` : ''}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        style={[styles.statusToggle, isClosed && styles.statusToggleInactive]}
                        onPress={() => onToggleDebt?.(debt.id)}
                      >
                        <Text style={[styles.statusToggleText, isClosed && { color: theme.textMuted }]}>
                          {isClosed ? 'Settled' : 'Mark Settled'}
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.recAmountText, { color: isDebt ? theme.danger : '#3B82F6' }]}>
                      {formatCurrency(debt.amount, currency)}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* TAB 4: PHILIPPINE BIR 2026 INCOME TAX CALCULATOR */}
        {activeTab === 'tax' && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>BIR 2026 Income Tax Estimator</Text>
              <Text style={styles.summaryAmount}>
                {taxCalculation.taxDue !== null ? formatCurrency(taxCalculation.taxDue, 'PHP') : 'N/A'}
              </Text>
              <Text style={styles.summarySub}>
                Monthly: {taxCalculation.monthlyEquivalent !== null ? formatCurrency(taxCalculation.monthlyEquivalent, 'PHP') : 'N/A'} &bull; Effective Rate: {taxCalculation.effectiveRate ? `${(taxCalculation.effectiveRate * 100).toFixed(1)}%` : '0%'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.inputLabel}>Annual Gross / Taxable Income (PHP)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={taxAnnualIncome}
                onChangeText={setTaxAnnualIncome}
                placeholder="e.g. 600000"
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Tax Regime</Text>
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
                  <Text style={[styles.regimeBtnText, taxRegime === 'self-employed-8' && styles.regimeBtnTextActive]}>
                    8% Self-Employed
                  </Text>
                </Pressable>
              </View>

              <View style={styles.taxFormulaBox}>
                <Text style={styles.taxFormulaTitle}>Calculation Basis</Text>
                <Text style={styles.taxFormulaBody}>{taxCalculation.formulaLabel}</Text>
                {taxCalculation.statusMessage && (
                  <Text style={styles.taxFormulaSub}>{taxCalculation.statusMessage}</Text>
                )}
              </View>
            </View>
          </>
        )}

        {/* TAB 5: TOOLS & LISTS */}
        {activeTab === 'tools' && (
          <>
            {/* Shopping List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Shopping & Errands</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.addShopRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  placeholder="Add item (e.g., Milk, Batteries)"
                  placeholderTextColor={theme.textMuted}
                  value={newShopTitle}
                  onChangeText={setNewShopTitle}
                />
                <TextInput
                  style={[styles.modalInput, { width: 80, marginLeft: 8 }]}
                  placeholder="Price"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={newShopCost}
                  onChangeText={setNewShopCost}
                />
                <Pressable
                  style={styles.addShopSubmitBtn}
                  onPress={() => {
                    if (newShopTitle.trim()) {
                      onAddShoppingItem?.(newShopTitle.trim(), parseFloat(newShopCost) || undefined);
                      setNewShopTitle('');
                      setNewShopCost('');
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color="#000" />
                </Pressable>
              </View>

              {shoppingList.length === 0 ? (
                <Text style={styles.emptyNote}>No items on your shopping list.</Text>
              ) : (
                shoppingList.map(item => (
                  <Pressable
                    key={item.id}
                    style={styles.shopItemRow}
                    onPress={() => onToggleShoppingItem?.(item.id)}
                  >
                    <Ionicons
                      name={item.isCompleted ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={item.isCompleted ? theme.primary : theme.textMuted}
                    />
                    <Text style={[styles.shopItemText, item.isCompleted && styles.strikethrough]}>
                      {item.title}
                    </Text>
                    {item.estimatedCost && (
                      <Text style={styles.shopItemCost}>{formatCurrency(item.estimatedCost, currency)}</Text>
                    )}
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}

        <View style={{ height: bottomInset + 110 }} />
      </ScrollView>

      {/* Set Budget Modal */}
      <Modal visible={budgetModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Category Budget</Text>
            <Text style={styles.modalSub}>Select category and monthly limit</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPickerScroll}>
              {categories.map(c => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.catChip,
                    selectedBudgetCatId === c.id && { backgroundColor: c.color || theme.primary },
                  ]}
                  onPress={() => setSelectedBudgetCatId(c.id)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      selectedBudgetCatId === c.id && { color: '#000', fontWeight: '700' },
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Budget Amount (e.g. 5000)"
              placeholderTextColor={theme.textMuted}
              value={budgetAmountInput}
              onChangeText={setBudgetAmountInput}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setBudgetModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmit} onPress={handleSaveBudget}>
                <Text style={styles.modalSubmitText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Goal Modal */}
      <Modal visible={goalModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Savings Goal</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Goal Name (e.g. Emergency Fund)"
              placeholderTextColor={theme.textMuted}
              value={goalName}
              onChangeText={setGoalName}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 12 }]}
              keyboardType="numeric"
              placeholder="Target Amount"
              placeholderTextColor={theme.textMuted}
              value={goalTargetAmount}
              onChangeText={setGoalTargetAmount}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setGoalModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmit} onPress={handleSaveGoal}>
                <Text style={styles.modalSubmitText}>Create Goal</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Debt Modal */}
      <Modal visible={debtModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Track Debt / Receivable</Text>

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

            <TextInput
              style={styles.modalInput}
              placeholder="Description / Person (e.g. Maya Loan, Juan)"
              placeholderTextColor={theme.textMuted}
              value={debtName}
              onChangeText={setDebtName}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 12 }]}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor={theme.textMuted}
              value={debtAmount}
              onChangeText={setDebtAmount}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 12 }]}
              placeholder="Due Date (YYYY-MM-DD) optional"
              placeholderTextColor={theme.textMuted}
              value={debtDueDate}
              onChangeText={setDebtDueDate}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setDebtModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmit} onPress={handleSaveDebt}>
                <Text style={styles.modalSubmitText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Recurring Modal */}
      <Modal visible={recModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Recurring Bill / Income</Text>

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

            <TextInput
              style={styles.modalInput}
              placeholder="Title (e.g. Meralco, Fiber Wifi)"
              placeholderTextColor={theme.textMuted}
              value={recName}
              onChangeText={setRecName}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 12 }]}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor={theme.textMuted}
              value={recAmount}
              onChangeText={setRecAmount}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRecModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmit} onPress={handleSaveRecurring}>
                <Text style={styles.modalSubmitText}>Save Recurring</Text>
              </Pressable>
            </View>
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
  subTabBar: {
    backgroundColor: theme.surface1,
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
  },
  subTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  subTabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  subTabButtonActive: {
    backgroundColor: theme.primary,
  },
  subTabText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: theme.surface1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 20,
  },
  summaryLabel: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    color: theme.text,
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 4,
  },
  summarySub: {
    color: theme.textMuted,
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(80, 138, 89, 0.15)',
  },
  addSectionBtnText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.surface1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  cardMetaText: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerNote: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  footerPercent: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  contributeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(80, 138, 89, 0.15)',
  },
  contributeChipText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyGoalBox: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: theme.surface1,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    alignItems: 'center',
    gap: 8,
  },
  emptyGoalText: {
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  forecastCard: {
    backgroundColor: theme.surface1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 20,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  forecastDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.cardBorder,
  },
  forecastMetricLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  forecastMetricVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  recAmountText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  statusToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(80, 138, 89, 0.15)',
  },
  statusToggleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusToggleText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: theme.textMuted,
  },
  inputLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  regimeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  regimeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  regimeBtnActive: {
    backgroundColor: theme.primary,
  },
  regimeBtnText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  regimeBtnTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  taxFormulaBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  taxFormulaTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  taxFormulaBody: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  taxFormulaSub: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  addShopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addShopSubmitBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  shopItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  shopItemText: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    fontWeight: '500',
  },
  shopItemCost: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyNote: {
    color: theme.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.surface1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    color: theme.textMuted,
    fontSize: 12,
    marginBottom: 14,
  },
  catPickerScroll: {
    marginBottom: 14,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  catChipText: {
    color: theme.text,
    fontSize: 13,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmit: {
    backgroundColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  modalSubmitText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});
