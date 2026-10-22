import { useState, useEffect, useCallback } from 'react';
import {
  FinanceState,
  Account,
  Transaction,
  Budget,
  Goal,
  DebtReceivable,
  RecurringTransaction,
  InstallmentPlan,
  ShoppingItem,
  WarrantyItem,
  FinanceNote,
  Category,
} from '../types';
import { loadFinanceState, saveFinanceState, INITIAL_STATE } from '../storage/storage';
import { isLiabilityAccount } from '../domain/calculator';

export function useFinanceStore() {
  const [state, setState] = useState<FinanceState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFinanceState().then(loaded => {
      setState(loaded);
      setIsLoaded(true);
    });
  }, []);

  const updateStateAndPersist = useCallback((updater: (prev: FinanceState) => FinanceState) => {
    setState(prev => {
      const next = updater(prev);
      saveFinanceState(next);
      return next;
    });
  }, []);

  // 1. Transactions
  const addTransaction = useCallback((txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    updateStateAndPersist(prev => {
      const updatedTransactions = [newTx, ...prev.transactions];

      const updatedAccounts = prev.accounts.map(acc => {
        if (acc.id === newTx.accountId) {
          if (newTx.type === 'expense') {
            const delta = isLiabilityAccount(acc.type) ? newTx.amount : -newTx.amount;
            return { ...acc, balance: acc.balance + delta };
          }
          if (newTx.type === 'income') {
            const delta = isLiabilityAccount(acc.type) ? -newTx.amount : newTx.amount;
            return { ...acc, balance: acc.balance + delta };
          }
          if (newTx.type === 'transfer') {
            const delta = isLiabilityAccount(acc.type) ? newTx.amount : -newTx.amount;
            return { ...acc, balance: acc.balance + delta };
          }
        }

        if (newTx.type === 'transfer' && acc.id === newTx.toAccountId) {
          const delta = isLiabilityAccount(acc.type) ? -newTx.amount : newTx.amount;
          return { ...acc, balance: acc.balance + delta };
        }

        return acc;
      });

      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: updatedTransactions,
      };
    });
  }, [updateStateAndPersist]);

  // 2. Accounts
  const addAccount = useCallback((accData: Omit<Account, 'id'>) => {
    const newAcc: Account = {
      ...accData,
      id: `acc_${Date.now()}`,
    };
    updateStateAndPersist(prev => ({
      ...prev,
      accounts: [...prev.accounts, newAcc],
    }));
  }, [updateStateAndPersist]);

  const updateAccountBalance = useCallback((accountId: string, newBalance: number) => {
    updateStateAndPersist(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => (a.id === accountId ? { ...a, balance: newBalance } : a)),
    }));
  }, [updateStateAndPersist]);

  const deleteAccount = useCallback((accountId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== accountId),
      // Also clean up or preserve transactions referencing this account
      transactions: prev.transactions.filter(t => t.accountId !== accountId && t.toAccountId !== accountId),
    }));
  }, [updateStateAndPersist]);

  const archiveAccount = useCallback((accountId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      accounts: prev.accounts.map(a =>
        a.id === accountId
          ? { ...a, archivedAt: a.archivedAt ? null : new Date().toISOString() }
          : a
      ),
    }));
  }, [updateStateAndPersist]);

  // 3. Budgets
  const setCategoryBudget = useCallback((categoryId: string, amount: number, interval: 'monthly' | 'weekly' | 'yearly' = 'monthly') => {
    updateStateAndPersist(prev => {
      const existing = prev.budgets.find(b => b.categoryId === categoryId);
      let updatedBudgets: Budget[];
      if (existing) {
        updatedBudgets = prev.budgets.map(b => (b.categoryId === categoryId ? { ...b, amount, interval } : b));
      } else {
        updatedBudgets = [
          ...prev.budgets,
          { id: `b_${Date.now()}`, categoryId, amount, interval },
        ];
      }
      return { ...prev, budgets: updatedBudgets };
    });
  }, [updateStateAndPersist]);

  const deleteCategoryBudget = useCallback((categoryId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      budgets: prev.budgets.filter(b => b.categoryId !== categoryId),
    }));
  }, [updateStateAndPersist]);

  // 4. Goals
  const addGoal = useCallback((goalData: Omit<Goal, 'id'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: `goal_${Date.now()}`,
    };
    updateStateAndPersist(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal],
    }));
  }, [updateStateAndPersist]);

  const updateGoal = useCallback((goalId: string, data: Partial<Goal>) => {
    updateStateAndPersist(prev => ({
      ...prev,
      goals: prev.goals.map(g => (g.id === goalId ? { ...g, ...data } : g)),
    }));
  }, [updateStateAndPersist]);

  const deleteGoal = useCallback((goalId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== goalId),
    }));
  }, [updateStateAndPersist]);

  const contributeToGoal = useCallback((goalId: string, amount: number, fromAccountId?: string) => {
    updateStateAndPersist(prev => {
      const targetGoal = prev.goals.find(g => g.id === goalId);
      if (!targetGoal) return prev;

      let updatedAccounts = prev.accounts;
      let newTransactions = prev.transactions;

      // If a funding account was selected, adjust its balance and record a ledger entry
      if (fromAccountId) {
        updatedAccounts = prev.accounts.map(acc => {
          if (acc.id === fromAccountId) {
            return { ...acc, balance: acc.balance - amount };
          }
          return acc;
        });

        const txTitle = amount >= 0
          ? `Deposit to Goal: ${targetGoal.name}`
          : `Withdraw from Goal: ${targetGoal.name}`;

        const newTx: Transaction = {
          id: `tx_${Date.now()}`,
          amount: Math.abs(amount),
          type: amount >= 0 ? 'expense' : 'income',
          accountId: fromAccountId,
          categoryId: 'goal-transfer',
          date: new Date().toISOString().substring(0, 10),
          createdAt: new Date().toISOString(),
          note: txTitle,
        };
        newTransactions = [newTx, ...prev.transactions];
      }

      const updatedGoals = prev.goals.map(g =>
        g.id === goalId ? { ...g, currentAmount: Math.max(0, g.currentAmount + amount) } : g
      );

      return {
        ...prev,
        goals: updatedGoals,
        accounts: updatedAccounts,
        transactions: newTransactions,
      };
    });
  }, [updateStateAndPersist]);

  // 5. Debts & Receivables
  const addDebtReceivable = useCallback((itemData: Omit<DebtReceivable, 'id'>) => {
    const newItem: DebtReceivable = {
      ...itemData,
      id: `debt_${Date.now()}`,
    };
    updateStateAndPersist(prev => ({
      ...prev,
      debts: [...prev.debts, newItem],
    }));
  }, [updateStateAndPersist]);

  const deleteDebt = useCallback((debtId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      debts: prev.debts.filter(d => d.id !== debtId),
    }));
  }, [updateStateAndPersist]);

  const toggleDebtSettled = useCallback((debtId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      debts: prev.debts.map(d =>
        d.id === debtId
          ? { ...d, closedAt: d.closedAt ? null : new Date().toISOString() }
          : d
      ),
    }));
  }, [updateStateAndPersist]);

  // 6. Recurring Transactions
  const addRecurring = useCallback((recData: Omit<RecurringTransaction, 'id'>) => {
    const newRec: RecurringTransaction = {
      ...recData,
      id: `rec_${Date.now()}`,
    };
    updateStateAndPersist(prev => ({
      ...prev,
      recurring: [...prev.recurring, newRec],
    }));
  }, [updateStateAndPersist]);

  const deleteRecurring = useCallback((recId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      recurring: prev.recurring.filter(r => r.id !== recId),
    }));
  }, [updateStateAndPersist]);

  const toggleRecurringActive = useCallback((recId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      recurring: prev.recurring.map(r => (r.id === recId ? { ...r, isActive: !r.isActive } : r)),
    }));
  }, [updateStateAndPersist]);

  // 7. Installments (Tarsi Pro)
  const addInstallment = useCallback((itemData: Omit<InstallmentPlan, 'id'>) => {
    const newInst: InstallmentPlan = {
      ...itemData,
      id: `inst_${Date.now()}`,
    };
    updateStateAndPersist(prev => ({
      ...prev,
      installments: [...(prev.installments || []), newInst],
    }));
  }, [updateStateAndPersist]);

  const incrementInstallmentTerm = useCallback((installmentId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      installments: (prev.installments || []).map(inst =>
        inst.id === installmentId ? { ...inst, paidTerms: Math.min(inst.totalTerms, inst.paidTerms + 1) } : inst
      ),
    }));
  }, [updateStateAndPersist]);

  const deleteInstallment = useCallback((installmentId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      installments: (prev.installments || []).filter(inst => inst.id !== installmentId),
    }));
  }, [updateStateAndPersist]);

  // 7. Shopping List
  const addShoppingItem = useCallback((title: string, estimatedCost?: number) => {
    const item: ShoppingItem = {
      id: `shop_${Date.now()}`,
      title,
      estimatedCost,
      isCompleted: false,
    };
    updateStateAndPersist(prev => ({
      ...prev,
      shoppingList: [...prev.shoppingList, item],
    }));
  }, [updateStateAndPersist]);

  const toggleShoppingItem = useCallback((itemId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      shoppingList: prev.shoppingList.map(s =>
        s.id === itemId ? { ...s, isCompleted: !s.isCompleted } : s
      ),
    }));
  }, [updateStateAndPersist]);

  // 8. Warranties
  const addWarranty = useCallback((itemData: Omit<WarrantyItem, 'id'>) => {
    const warranty: WarrantyItem = {
      ...itemData,
      id: `war_${Date.now()}`,
    };
    updateStateAndPersist(prev => ({
      ...prev,
      warranties: [...prev.warranties, warranty],
    }));
  }, [updateStateAndPersist]);

  // 9. Notes
  const saveNote = useCallback((id: string | null, title: string, content: string) => {
    updateStateAndPersist(prev => {
      const now = new Date().toISOString();
      if (id) {
        return {
          ...prev,
          notes: prev.notes.map(n => (n.id === id ? { ...n, title, content, updatedAt: now } : n)),
        };
      } else {
        const newNote: FinanceNote = {
          id: `note_${Date.now()}`,
          title,
          content,
          updatedAt: now,
        };
        return {
          ...prev,
          notes: [newNote, ...prev.notes],
        };
      }
    });
  }, [updateStateAndPersist]);

  // 10. Categories (Expense & Income)
  const addCategory = useCallback((catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    };
    updateStateAndPersist(prev => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));
  }, [updateStateAndPersist]);

  const deleteCategory = useCallback((categoryId: string) => {
    updateStateAndPersist(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== categoryId),
    }));
  }, [updateStateAndPersist]);

  return {
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
    deleteCategory,
  };
}
