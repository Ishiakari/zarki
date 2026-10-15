import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinanceState } from '../types';

const STORAGE_KEY = '@zarki_finance_state_v5_pro';

// In-memory fallback if AsyncStorage native module is temporarily unlinked or reloading
let memoryCacheState: FinanceState | null = null;

export const INITIAL_STATE: FinanceState = {
  preferredCurrency: 'PHP',
  preferredName: '',
  accounts: [
    {
      id: 'acc_cash',
      name: 'Physical Cash',
      type: 'debit',
      balance: 0.00,
      currency: 'PHP',
      includeInNetBalance: true,
      color: '#508A59',
      icon: 'cash-outline',
    },
    {
      id: 'acc_gcash',
      name: 'GCash',
      institutionId: 'gcash',
      type: 'debit',
      balance: 0.00,
      currency: 'PHP',
      includeInNetBalance: true,
      color: '#005CE6',
      icon: 'phone-portrait-outline',
    },
    {
      id: 'acc_maya',
      name: 'Maya Wallet',
      institutionId: 'maya',
      type: 'debit',
      balance: 0.00,
      currency: 'PHP',
      includeInNetBalance: true,
      color: '#05EB8A',
      icon: 'phone-portrait-outline',
    },
    {
      id: 'acc_gotyme',
      name: 'GoTyme Bank',
      institutionId: 'gotyme',
      type: 'debit',
      balance: 0.00,
      currency: 'PHP',
      includeInNetBalance: true,
      color: '#00F5FA',
      icon: 'business-outline',
    },
    {
      id: 'acc_card',
      name: 'Credit Card',
      type: 'credit',
      balance: 0.00,
      currency: 'PHP',
      creditLimit: 0,
      includeInNetBalance: true,
      color: '#F59E0B',
      icon: 'card-outline',
    }
  ],
  transactions: [],
  categories: [
    // Expense Categories
    { id: 'cat_groceries', label: 'Groceries & Market', icon: 'cart-outline', color: '#508A59', kind: 'expense' },
    { id: 'cat_dining', label: 'Dining & Takeout', icon: 'restaurant-outline', color: '#F59E0B', kind: 'expense' },
    { id: 'cat_coffee', label: 'Coffee & Drinks', icon: 'cafe-outline', color: '#D97706', kind: 'expense' },
    { id: 'cat_transport', label: 'Commute & Gas', icon: 'car-outline', color: '#3B82F6', kind: 'expense' },
    { id: 'cat_bills', label: 'Electricity & Water', icon: 'flash-outline', color: '#EF4444', kind: 'expense' },
    { id: 'cat_internet', label: 'Internet & Mobile Load', icon: 'wifi-outline', color: '#6366F1', kind: 'expense' },
    { id: 'cat_housing', label: 'Rent & Mortgage', icon: 'home-outline', color: '#8B5CF6', kind: 'expense' },
    { id: 'cat_shopping', label: 'Shopping & E-Commerce', icon: 'bag-handle-outline', color: '#EC4899', kind: 'expense' },
    { id: 'cat_healthcare', label: 'Medicine & Health', icon: 'medkit-outline', color: '#10B981', kind: 'expense' },
    { id: 'cat_personal', label: 'Personal Care', icon: 'sparkles-outline', color: '#F472B6', kind: 'expense' },
    { id: 'cat_entertainment', label: 'Entertainment & Subs', icon: 'film-outline', color: '#A855F7', kind: 'expense' },
    { id: 'cat_education', label: 'Tuition & Books', icon: 'school-outline', color: '#2563EB', kind: 'expense' },
    { id: 'cat_family', label: 'Family & Padala', icon: 'people-outline', color: '#14B8A6', kind: 'expense' },
    { id: 'cat_insurance', label: 'Insurance & Taxes', icon: 'shield-checkmark-outline', color: '#64748B', kind: 'expense' },
    { id: 'cat_pets', label: 'Pet Care', icon: 'paw-outline', color: '#FB923C', kind: 'expense' },

    // Income Categories
    { id: 'cat_salary', label: 'Primary Salary', icon: 'cash-outline', color: '#508A59', kind: 'income' },
    { id: 'cat_freelance', label: 'Freelance & Side Hustle', icon: 'laptop-outline', color: '#06B6D4', kind: 'income' },
    { id: 'cat_business', label: 'Business & Sales', icon: 'storefront-outline', color: '#10B981', kind: 'income' },
    { id: 'cat_investments', label: 'Dividends & Interest', icon: 'trending-up-outline', color: '#8B5CF6', kind: 'income' },
    { id: 'cat_allowance', label: 'Remittance & Allowance', icon: 'wallet-outline', color: '#3B82F6', kind: 'income' },
    { id: 'cat_bonus', label: '13th Month & Bonus', icon: 'gift-outline', color: '#F59E0B', kind: 'income' },
    { id: 'cat_refunds', label: 'Reimbursement & Cashback', icon: 'refresh-outline', color: '#64748B', kind: 'income' },
  ],
  budgets: [
    { id: 'b_groceries', categoryId: 'cat_groceries', amount: 0, interval: 'monthly' },
    { id: 'b_dining', categoryId: 'cat_dining', amount: 0, interval: 'monthly' },
  ],
  goals: [],
  debts: [],
  recurring: [],
  shoppingList: [],
  warranties: [],
  notes: [],
};

export async function loadFinanceState(): Promise<FinanceState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: FinanceState = JSON.parse(raw);
      if (parsed.preferredCurrency === 'USD') {
        parsed.preferredCurrency = 'PHP';
      }
      parsed.accounts = (parsed.accounts || []).map(a => a.currency === 'USD' ? { ...a, currency: 'PHP' } : a);
      const merged: FinanceState = {
        ...INITIAL_STATE,
        ...parsed,
        accounts: parsed.accounts || INITIAL_STATE.accounts,
        transactions: parsed.transactions || [],
        categories: parsed.categories || INITIAL_STATE.categories,
        budgets: parsed.budgets || INITIAL_STATE.budgets,
        goals: parsed.goals || [],
        debts: parsed.debts || [],
        recurring: parsed.recurring || [],
        shoppingList: parsed.shoppingList || [],
        warranties: parsed.warranties || [],
        notes: parsed.notes || [],
      };
      memoryCacheState = merged;
      return merged;
    }
  } catch (err) {
    // If native storage module is initializing or in Expo Go bundle handover, return in-memory cache or initial state gracefully
    if (memoryCacheState) {
      return memoryCacheState;
    }
  }
  return INITIAL_STATE;
}

export async function saveFinanceState(state: FinanceState): Promise<void> {
  memoryCacheState = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently fall back to in-memory state if native module is briefly unavailable
  }
}

export async function clearAllFinanceData(): Promise<void> {
  memoryCacheState = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore error
  }
}
