export type AccountType = 'debit' | 'credit' | 'loans' | 'assets' | 'stocks' | 'crypto';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  creditLimit?: number | null;
  includeInNetBalance: boolean;
  color: string;
  icon: string;
  institutionId?: string;
  archivedAt?: string | null;
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  accountId: string;          // Source account (deducted from for expense/transfer, added to for income)
  toAccountId?: string;       // Destination account (for transfers)
  categoryId: string;
  subcategoryId?: string;
  date: string;               // ISO date string (YYYY-MM-DD)
  note?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  kind: 'expense' | 'income';
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  interval: 'monthly' | 'weekly' | 'yearly';
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color: string;
}

export interface DebtReceivable {
  id: string;
  name: string;
  amount: number;
  type: 'debt' | 'receivable'; // debt = money you owe, receivable = money owed to you
  closedAt?: string | null;
  dueDate?: string;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: 'expense' | 'income';
  accountId: string;
  categoryId: string;
  frequency: RecurringFrequency;
  nextDueDate: string; // YYYY-MM-DD
  isActive: boolean;
  note?: string;
}

export interface ShoppingItem {
  id: string;
  title: string;
  estimatedCost?: number;
  isCompleted: boolean;
  dueDate?: string;
  note?: string;
}

export interface WarrantyItem {
  id: string;
  item: string;
  purchaseDate: string;
  warrantyEndDate: string;
  price?: number;
  serialNumber?: string;
}

export interface InstallmentPlan {
  id: string;
  name: string;
  totalAmount: number;
  monthlyAmount: number;
  totalTerms: number;
  paidTerms: number;
  accountId?: string;
  startDate?: string;
}

export interface FinanceNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface FinanceState {
  preferredCurrency: string;
  preferredName: string;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  debts: DebtReceivable[];
  recurring: RecurringTransaction[];
  installments?: InstallmentPlan[];
  shoppingList: ShoppingItem[];
  warranties: WarrantyItem[];
  notes: FinanceNote[];
}
