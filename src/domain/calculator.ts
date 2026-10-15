import { Account, AccountType, DebtReceivable, Transaction, Budget } from '../types';

/**
 * Liability accounts represent borrowed money or obligations (Credit cards, loans)
 * which reduce overall net worth.
 */
export function isLiabilityAccount(type: AccountType): boolean {
  return type === 'credit' || type === 'loans';
}

/**
 * Calculates total net worth:
 * Net Worth = (Assets + Debit + Investments) - (Credit Cards + Loans + Debts) + Receivables
 */
export function calculateNetWorth(accounts: Account[], debts: DebtReceivable[]): number {
  const accountTotal = accounts
    .filter(acc => acc.includeInNetBalance && !acc.archivedAt)
    .reduce((sum, acc) => {
      if (isLiabilityAccount(acc.type)) {
        return sum - acc.balance;
      }
      return sum + acc.balance;
    }, 0);

  const openDebts = debts
    .filter(d => !d.closedAt)
    .reduce((sum, d) => {
      if (d.type === 'debt') {
        return sum - d.amount; // Money you owe
      }
      return sum + d.amount;   // Money owed to you (receivable)
    }, 0);

  return accountTotal + openDebts;
}

export function calculateTotalAssets(accounts: Account[]): number {
  return accounts
    .filter(acc => !isLiabilityAccount(acc.type) && !acc.archivedAt)
    .reduce((sum, acc) => sum + Math.max(0, acc.balance), 0);
}

export function calculateTotalLiabilities(accounts: Account[], debts: DebtReceivable[]): number {
  const accountLiabilities = accounts
    .filter(acc => isLiabilityAccount(acc.type) && !acc.archivedAt)
    .reduce((sum, acc) => sum + Math.max(0, acc.balance), 0);

  const personalDebts = debts
    .filter(d => d.type === 'debt' && !d.closedAt)
    .reduce((sum, d) => sum + d.amount, 0);

  return accountLiabilities + personalDebts;
}

export function calculateMonthlySpending(
  transactions: Transaction[],
  yearMonth: string // "YYYY-MM"
): number {
  return transactions
    .filter(tx => tx.type === 'expense' && tx.date.startsWith(yearMonth))
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function calculateBudgetProgress(
  budget: Budget,
  transactions: Transaction[],
  yearMonth: string
): { spent: number; limit: number; remaining: number; percent: number } {
  const spent = transactions
    .filter(tx => tx.type === 'expense' && tx.categoryId === budget.categoryId && tx.date.startsWith(yearMonth))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const remaining = Math.max(0, budget.amount - spent);
  const percent = budget.amount > 0 ? Math.min(100, Math.round((spent / budget.amount) * 100)) : 0;

  return { spent, limit: budget.amount, remaining, percent };
}

export function formatCurrency(amount: number, currency = 'PHP'): string {
  try {
    const locale = currency === 'PHP' ? 'en-PH' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency;
    const formattedNum = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return amount < 0 ? `-${symbol}${formattedNum}` : `${symbol}${formattedNum}`;
  }
}
