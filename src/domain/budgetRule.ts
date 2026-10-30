import { Category, Transaction } from '../types';

export type BudgetClassification = 'needs' | 'wants' | 'savings';

export interface BudgetRuleConfig {
  needsRatio: number;   // default 0.50
  wantsRatio: number;   // default 0.30
  savingsRatio: number; // default 0.20
}

export const DEFAULT_BUDGET_RULE_CONFIG: BudgetRuleConfig = {
  needsRatio: 0.50,
  wantsRatio: 0.30,
  savingsRatio: 0.20,
};

/**
 * Maps default category IDs and keywords to 50/30/20 buckets.
 */
export function inferCategoryClassification(category: Category): BudgetClassification {
  if (category.classification) {
    return category.classification;
  }

  const id = category.id.toLowerCase();
  const label = category.label.toLowerCase();

  // 1. Savings & Debt reduction
  if (
    id.includes('savings') ||
    id.includes('invest') ||
    id.includes('emergency') ||
    id.includes('debt') ||
    id.includes('loan') ||
    label.includes('savings') ||
    label.includes('investment') ||
    label.includes('emergency') ||
    label.includes('debt') ||
    label.includes('loan')
  ) {
    return 'savings';
  }

  // 2. Needs (Essentials: groceries, housing, utilities, commute, healthcare, family, tuition, insurance)
  if (
    id === 'cat_groceries' ||
    id === 'cat_bills' ||
    id === 'cat_housing' ||
    id === 'cat_internet' ||
    id === 'cat_transport' ||
    id === 'cat_healthcare' ||
    id === 'cat_education' ||
    id === 'cat_insurance' ||
    id === 'cat_family' ||
    label.includes('grocery') ||
    label.includes('groceries') ||
    label.includes('market') ||
    label.includes('palengke') ||
    label.includes('electricity') ||
    label.includes('water') ||
    label.includes('bill') ||
    label.includes('utility') ||
    label.includes('rent') ||
    label.includes('mortgage') ||
    label.includes('housing') ||
    label.includes('internet') ||
    label.includes('load') ||
    label.includes('commute') ||
    label.includes('gas') ||
    label.includes('fare') ||
    label.includes('medicine') ||
    label.includes('health') ||
    label.includes('tuition') ||
    label.includes('insurance') ||
    label.includes('tax') ||
    label.includes('family') ||
    label.includes('padala')
  ) {
    return 'needs';
  }

  // 3. Wants (Dining, coffee, shopping, entertainment, personal care, pets)
  return 'wants';
}

export interface BudgetRuleBreakdown {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  needs: {
    actual: number;
    target: number;
    ratio: number;
    percentOfIncome: number;
    diff: number; // positive = under budget, negative = over budget
    status: 'under' | 'on_track' | 'over';
  };
  wants: {
    actual: number;
    target: number;
    ratio: number;
    percentOfIncome: number;
    diff: number;
    status: 'under' | 'on_track' | 'over';
  };
  savings: {
    actual: number;
    target: number;
    ratio: number;
    percentOfIncome: number;
    diff: number; // positive = surplus, negative = deficit
    status: 'ahead' | 'on_track' | 'behind';
  };
}

export function compute503020Breakdown(
  transactions: Transaction[],
  categories: Category[],
  yearMonth: string, // YYYY-MM
  config: BudgetRuleConfig = DEFAULT_BUDGET_RULE_CONFIG
): BudgetRuleBreakdown {
  const monthTransactions = transactions.filter(t => t.date.startsWith(yearMonth));

  // Compute total income for the period
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // Map each category to its classification
  const categoryMap = new Map<string, BudgetClassification>();
  for (const cat of categories) {
    categoryMap.set(cat.id, inferCategoryClassification(cat));
  }

  let needsActual = 0;
  let wantsActual = 0;
  let savingsActualFromExpense = 0;

  for (const tx of monthTransactions) {
    if (tx.type === 'expense') {
      const classification = categoryMap.get(tx.categoryId) || 'wants';
      if (classification === 'needs') {
        needsActual += tx.amount;
      } else if (classification === 'wants') {
        wantsActual += tx.amount;
      } else if (classification === 'savings') {
        savingsActualFromExpense += tx.amount;
      }
    }
  }

  const totalExpenses = needsActual + wantsActual + savingsActualFromExpense;

  // In the 50/30/20 rule:
  // Base is total monthly income. If income is 0, base targets fallback to actual expenses or 0.
  const base = totalIncome > 0 ? totalIncome : totalExpenses;

  const needsTarget = Math.round(base * config.needsRatio);
  const wantsTarget = Math.round(base * config.wantsRatio);
  const savingsTarget = Math.round(base * config.savingsRatio);

  // Actual savings realized this month:
  // Net cash retained from income after all living expenses (needs, wants, and direct savings contributions)
  const netSurplus = Math.max(0, totalIncome - (needsActual + wantsActual + savingsActualFromExpense));
  const totalSavingsRealized = savingsActualFromExpense + netSurplus;

  const needsDiff = needsTarget - needsActual;
  const wantsDiff = wantsTarget - wantsActual;
  const savingsDiff = totalSavingsRealized - savingsTarget;

  const safeDiv = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

  return {
    month: yearMonth,
    totalIncome,
    totalExpenses,
    needs: {
      actual: needsActual,
      target: needsTarget,
      ratio: config.needsRatio,
      percentOfIncome: safeDiv(needsActual, base),
      diff: needsDiff,
      status: needsActual > needsTarget ? 'over' : needsActual >= needsTarget * 0.9 ? 'on_track' : 'under',
    },
    wants: {
      actual: wantsActual,
      target: wantsTarget,
      ratio: config.wantsRatio,
      percentOfIncome: safeDiv(wantsActual, base),
      diff: wantsDiff,
      status: wantsActual > wantsTarget ? 'over' : wantsActual >= wantsTarget * 0.9 ? 'on_track' : 'under',
    },
    savings: {
      actual: totalSavingsRealized,
      target: savingsTarget,
      ratio: config.savingsRatio,
      percentOfIncome: safeDiv(totalSavingsRealized, base),
      diff: savingsDiff,
      status: totalSavingsRealized >= savingsTarget ? 'ahead' : totalSavingsRealized >= savingsTarget * 0.8 ? 'on_track' : 'behind',
    },
  };
}
