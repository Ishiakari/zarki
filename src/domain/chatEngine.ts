import { Account, Category, FinanceState, Transaction, TransactionType } from '../types';
import { formatCurrency, calculateMonthlySpending, calculateBudgetProgress, isLiabilityAccount } from './calculator';
import { compute503020Breakdown, DEFAULT_BUDGET_RULE_CONFIG } from './budgetRule';

export interface ChatTransactionDraft {
  id: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  accountName: string;
  toAccountId?: string;
  toAccountName?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  date: string;
  dateLabel?: string;
  note: string;
}

export type ChatResponseKind = 'transaction_proposal' | 'answer' | 'clarification' | 'help';

export interface ChatEngineResult {
  kind: ChatResponseKind;
  message: string;
  drafts?: ChatTransactionDraft[];
  draft?: ChatTransactionDraft; // Backwards compatibility for single proposal
  quickReplies?: string[];
  pendingClarification?: {
    originalText: string;
    missingField: 'account' | 'category' | 'amount';
  } | null;
  topic?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  drafts?: ChatTransactionDraft[];
  draft?: ChatTransactionDraft;
  isDraftConfirmed?: boolean;
  confirmedDraftIds?: string[];
  quickReplies?: string[];
}

export interface ChatMemoryContext {
  lastAnsweredTopic?: string | null;
  pendingClarification?: {
    originalText: string;
    missingField: 'account' | 'category' | 'amount';
  } | null;
}

// ==========================================
// 1. KNOWLEDGE PACK (AUTHENTIC OFFLINE ADVICE)
// ==========================================

export interface KnowledgeEntry {
  id: string;
  kind: 'capability' | 'grammar' | 'finance_guidance';
  title: string;
  summary: string;
  content: string[];
  synonyms: string[];
  topics: string[];
}

export const OFFLINE_CHAT_KNOWLEDGE_PACK: KnowledgeEntry[] = [
  {
    id: 'capability-log-transactions',
    kind: 'capability',
    title: 'Transaction Logging Coverage',
    summary: 'Zarki can log expenses, income, transfers, and batch entries completely offline from natural language.',
    content: [
      'Offline chat logs expenses, income, and transfers directly to your device storage without any server latency.',
      'Supports batch multi-item logging in a single message, for example: "Coffee 95 and lunch 180 on GCash".',
      'Follow-up messages like "use GCash" or "yesterday instead" are merged smoothly into your recent entries.',
    ],
    synonyms: ['can you log', 'what can you log', 'supported actions', 'transaction types', 'batch logging', 'multi entry'],
    topics: ['app_capability', 'logging'],
  },
  {
    id: 'capability-questions',
    kind: 'capability',
    title: 'Supported Financial Questions',
    summary: 'Offline chat answers grounded questions about balances, spending, budgets, debts, and receivables.',
    content: [
      'Answers questions grounded in your local data: "What is my balance?", "How much did I spend this week?", "Budget status".',
      'Filters period spending by category: "How much did I spend on groceries this month?", "Dining yesterday".',
      'Provides practical Philippine personal finance guidance on emergency funds, debt prioritization, and the 50-30-20 rule.',
    ],
    synonyms: ['what can you answer', 'what can i ask', 'supported questions', 'balances', 'budget', 'spending', 'debts'],
    topics: ['app_capability', 'questions'],
  },
  {
    id: 'finance-emergency-fund-ph',
    kind: 'finance_guidance',
    title: 'Emergency Fund Guidance',
    summary: 'A realistic Philippine emergency fund starts with one month of essential expenses, then scales to 3 to 6 months.',
    content: [
      'A realistic first milestone in the Philippines is 1 month of essential expenses (rent/mortgage, utilities, food, transport, loan minimums).',
      'Once established, expand toward 3 to 6 months of essential living expenses depending on your income stability.',
      'Store your emergency fund in liquid, high-yield digital bank accounts or accessible savings accounts (e.g. Maya, GoTyme, Seabank) rather than locked investments.',
    ],
    synonyms: ['emergency fund', 'savings buffer', 'rainy day fund', 'how much should i save', 'ipon'],
    topics: ['savings', 'finance_guidance'],
  },
  {
    id: 'finance-debt-priority',
    kind: 'finance_guidance',
    title: 'Debt Payoff Priority',
    summary: 'High-interest debt and credit card balances should take priority over non-essential discretionary spending.',
    content: [
      'If you carry revolving credit card debt, paying it down usually yields the highest guaranteed return due to 36%+ annual interest rates.',
      'Avalanche Method: Pay minimums on all obligations, then channel extra cash toward the highest interest rate balance.',
      'Snowball Method: Pay off the smallest debt balance first to build quick psychological momentum.',
      'Ensure you preserve a basic cash buffer so an unexpected expense does not force you back into high-interest borrowing.',
    ],
    synonyms: ['pay debt', 'credit card debt', 'loan priority', 'what should i pay first', 'utang', 'snowball', 'avalanche'],
    topics: ['debt', 'finance_guidance'],
  },
  {
    id: 'finance-budget-basics',
    kind: 'finance_guidance',
    title: 'Budget Pacing and Tradeoffs',
    summary: 'Overspending is usually a matter of daily spending pace and recurring leaks rather than a single isolated purchase.',
    content: [
      'A budget overrun usually means spending velocity for a category is exceeding daily allowances.',
      'Identify recurring friction points: dining delivery apps, frequent ride-hailing, and unmonitored digital subscriptions.',
      'Follow the 50-30-20 rule as a benchmark: 50% Needs (housing, groceries, utilities), 30% Wants (dining out, entertainment), and 20% Savings/Debt reduction.',
    ],
    synonyms: ['overspending', 'budget', 'too much', 'cut back', '50 30 20', '50-30-20', 'spending too much', 'gastos'],
    topics: ['budget', 'finance_guidance'],
  },
  {
    id: 'finance-goal-tradeoff',
    kind: 'finance_guidance',
    title: 'Savings Goal Tradeoffs',
    summary: 'Savings goals compete with daily lifestyle spending; a goal is achievable when backed by regular automated transfers.',
    content: [
      'A savings goal succeeds when funded by an automated transfer immediately after payday (pay yourself first).',
      'If your goal pace falls behind, review discretionary categories like Dining and Shopping in your Plan tab.',
      'Keep goal funds distinct from your daily checking account to remove temptation.',
    ],
    synonyms: ['goal', 'saving goal', 'travel fund', 'target', 'paano mag-ipon'],
    topics: ['goal', 'finance_guidance'],
  },
];

export function retrieveOfflineChatKnowledge(queryText: string): KnowledgeEntry | null {
  const clean = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  const words = clean.split(' ').filter(w => w.length >= 2);

  let bestEntry: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of OFFLINE_CHAT_KNOWLEDGE_PACK) {
    let score = 0;

    // Check synonym matches
    for (const syn of entry.synonyms) {
      if (clean.includes(syn)) {
        score += 8;
      }
    }

    // Check topic matches
    for (const topic of entry.topics) {
      if (clean.includes(topic)) {
        score += 3;
      }
    }

    // Check word overlap with title & summary
    const entryText = `${entry.title} ${entry.summary}`.toLowerCase();
    for (const w of words) {
      if (w.length >= 3 && entryText.includes(w)) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestScore >= 5 ? bestEntry : null;
}

// ==========================================
// 2. TEXT PROCESSING & REJECTION LOGIC
// ==========================================

/**
 * Checks if the message is an explicit cancellation / rejection.
 */
export function isRejectedTransactionMessage(text: string): boolean {
  const clean = text
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/^(?:please|hey|hi)[, ]+/, '');

  if (/^(?:never mind|nevermind|cancel(?: that)?|forget (?:it|that)|stop|wag na|huwag na|ayoko na)[.!?]*$/i.test(clean)) {
    return true;
  }

  if (/\b(?:do not|don't|did not|didn't|does not|doesn't|never|not)\s+(?:log|record|add|track|spend|save)\b/i.test(clean)) {
    return true;
  }

  return /^(?:hindi|di|huwag|wag)\b/i.test(clean);
}

/**
 * Merges previous draft context with follow-up clarification.
 */
export function mergeChatTransactionClarification(priorText: string, followupText: string): string {
  const p = priorText.trim();
  const f = followupText.trim();
  if (!p) return f;
  if (!f) return p;

  if (p.toLowerCase().includes(f.toLowerCase())) {
    return p;
  }
  return `${p} ${f}`;
}

/**
 * Splits complex multi-action messages into distinct transaction segments.
 * e.g. "Coffee 95 and lunch 180 on GCash" -> ["Coffee 95 on GCash", "lunch 180 on GCash"]
 */
export function splitChatTransactionSegments(text: string): string[] {
  const rawSegments: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\n' || char === ';') {
      if (current.trim()) rawSegments.push(current.trim());
      current = '';
    } else if (char === ',') {
      // Check if comma is inside a number like 1,000
      const prev = i > 0 ? text[i - 1] : '';
      let nextIdx = i + 1;
      while (nextIdx < text.length && /\s/.test(text[nextIdx])) nextIdx++;
      const next = nextIdx < text.length ? text[nextIdx] : '';

      if (/\d/.test(prev) && /\d/.test(next)) {
        current += char;
      } else {
        if (current.trim()) rawSegments.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    rawSegments.push(current.trim());
  }

  // Split on "and then" or "and"/"then" followed by amounts or action keywords
  const step1 = rawSegments.flatMap(item => item.split(/\s+and\s+then\s+/i));
  const step2 = step1.flatMap(item =>
    item.split(
      /\s+(?:and|then)\s+(?=(?:(?:₱|\$|php\s*)?\d|\b(?:spent|paid|bought|salary|allowance|bonus|earned|received|freelance|sideline|refund|deposit|got|coffee|lunch|dinner|breakfast|groceries|rent|fare|taxi|grab)\b))/i
    )
  );

  return step2.map(s => s.trim()).filter(Boolean);
}

/**
 * Extracts a numeric amount from natural language.
 * Supports patterns like "150", "₱250.50", "php 500", "1.5k", "25k".
 */
export function extractAmount(text: string): { amount: number; raw: string } | null {
  // Check for 'k' notation (e.g. 1.5k, 25k)
  const kMatch = text.match(/(?:₱|\$|php\s*)?(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]) * 1000;
    if (!isNaN(val) && val > 0) {
      return { amount: val, raw: kMatch[0] };
    }
  }

  // Check for standard numbers
  const numMatch = text.match(/(?:₱|\$|php\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/i);
  if (numMatch) {
    const clean = numMatch[1].replace(/,/g, '');
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0) {
      return { amount: val, raw: numMatch[0] };
    }
  }

  return null;
}

/**
 * Resolves an account from natural language text.
 */
export function findMentionedAccount(text: string, accounts: Account[]): Account | null {
  const lower = text.toLowerCase();

  // First pass: specific digital wallet / bank institutions and exact names
  for (const acc of accounts) {
    if (acc.institutionId === 'gcash' && /\bgcash\b/i.test(lower)) return acc;
    if (acc.institutionId === 'maya' && /\b(?:maya|paymaya)\b/i.test(lower)) return acc;
    if (acc.institutionId === 'gotyme' && /\bgotyme\b/i.test(lower)) return acc;

    const accName = acc.name.toLowerCase();
    if (accName.length >= 3 && lower.includes(accName)) {
      return acc;
    }

    // Check individual significant name tokens (e.g. 'BPI' in 'BPI Checking')
    const tokens = accName.split(/\s+/).filter(t => t.length >= 3 && !['checking', 'savings', 'wallet', 'account'].includes(t));
    for (const token of tokens) {
      if (new RegExp(`\\b${token}\\b`, 'i').test(lower)) {
        return acc;
      }
    }
  }

  // Second pass: credit cards or standalone cash with strict word boundaries
  for (const acc of accounts) {
    if (acc.type === 'credit' && /\b(?:card|credit|visa|mastercard)\b/i.test(lower)) return acc;
    if (acc.type === 'debit' && /\bcash\b/i.test(lower) && !/\bgcash\b/i.test(lower)) return acc;
  }

  return null;
}

/**
 * Resolves appropriate expense category based on keywords.
 */
export function inferExpenseCategory(text: string, categories: Category[]): Category {
  const lower = text.toLowerCase();
  const expenseCategories = categories.filter(c => c.kind === 'expense');

  const keywordMap: Record<string, string[]> = {
    cat_dining: ['lunch', 'dinner', 'breakfast', 'food', 'snack', 'coffee', 'starbucks', 'jollibee', 'mcdo', 'restaurant', 'meal', 'kain', 'milktea', 'cafe', 'takeout', 'burger', 'pizza', 'fastfood'],
    cat_groceries: ['grocery', 'groceries', 'market', 'supermarket', 'palengke', 'puregold', 'sm market', 'meat', 'vegetables', 'fruit', 'robinsons'],
    cat_transport: ['grab', 'taxi', 'gas', 'commute', 'jeep', 'bus', 'train', 'lrt', 'mrt', 'toll', 'parking', 'pamasahe', 'angkas', 'joyride', 'moveit', 'fuel', 'petron', 'shell', 'caltex'],
    cat_bills: ['electricity', 'meralco', 'water', 'maynilad', 'manila water', 'kuryente', 'tubig', 'bill', 'utility', 'utilities'],
    cat_internet: ['internet', 'pldt', 'globe', 'smart', 'converge', 'wifi', 'load', 'data', 'prepaid'],
    cat_housing: ['rent', 'mortgage', 'upa', 'bahay', 'apartment', 'condo dues'],
    cat_shopping: ['shopee', 'lazada', 'amazon', 'shopping', 'clothes', 'gadget', 'bili', 'shoes', 'apparel', 'mall', 'zara', 'uniqlo'],
    cat_healthcare: ['medicine', 'pharmacy', 'mercury drug', 'doctor', 'hospital', 'gamot', 'clinic', 'vitamins', 'dental', 'watsons'],
    cat_entertainment: ['netflix', 'spotify', 'cinema', 'movie', 'game', 'steam', 'concert', 'subscription', 'youtube'],
    cat_personal: ['haircut', 'salon', 'barber', 'spa', 'skincare', 'laundry'],
    cat_pets: ['pet', 'dog', 'cat', 'vet', 'dog food', 'cat food'],
  };

  for (const [catId, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(k => lower.includes(k))) {
      const match = expenseCategories.find(c => c.id === catId);
      if (match) return match;
    }
  }

  // Match category label directly if user said it
  for (const cat of expenseCategories) {
    if (lower.includes(cat.label.toLowerCase())) {
      return cat;
    }
  }

  return expenseCategories.find(c => c.id === 'cat_dining') || expenseCategories[0] || categories[0];
}

/**
 * Resolves appropriate income category based on keywords.
 */
export function inferIncomeCategory(text: string, categories: Category[]): Category {
  const lower = text.toLowerCase();
  const incomeCategories = categories.filter(c => c.kind === 'income');

  if (lower.includes('freelance') || lower.includes('client') || lower.includes('upwork')) {
    const match = incomeCategories.find(c => c.id === 'cat_freelance');
    if (match) return match;
  }
  if (lower.includes('business') || lower.includes('sales') || lower.includes('benta')) {
    const match = incomeCategories.find(c => c.id === 'cat_business');
    if (match) return match;
  }
  if (lower.includes('bonus') || lower.includes('13th')) {
    const match = incomeCategories.find(c => c.id === 'cat_bonus');
    if (match) return match;
  }
  if (lower.includes('allowance') || lower.includes('remittance') || lower.includes('padala')) {
    const match = incomeCategories.find(c => c.id === 'cat_allowance');
    if (match) return match;
  }

  for (const cat of incomeCategories) {
    if (lower.includes(cat.label.toLowerCase())) {
      return cat;
    }
  }

  return incomeCategories.find(c => c.id === 'cat_salary') || incomeCategories[0] || categories[0];
}

/**
 * Cleans the input text to extract a clean note description.
 */
export function cleanTransactionNote(text: string): string {
  const note = text
    .replace(/[.,!?]+$/g, '')
    .replace(/(?:₱|\$|php\s*)?(\d+(?:,\d{3})*(?:\.\d+)?|\d+k)\b/gi, '')
    .replace(/\b(?:paki-log|ilog|pakirecord|please\s+log|log|record|add|track|spent|spend|paid|pay|bought|buy|earned|receive|received|transferred|transfer|send|sent|move)\b/gi, '')
    .replace(/\b(?:for|on|via|using|through|with|in|to|from|yesterday|kahapon|today|ngayon)\b/gi, '')
    .replace(/\b(?:gcash|maya|paymaya|gotyme|bpi|bdo|metrobank|unionbank|seabank|cash|card|credit)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!note) {
    return 'Quick Log';
  }

  return note.charAt(0).toUpperCase() + note.slice(1);
}

// ==========================================
// 3. PERIOD & GROUNDED FINANCIAL QUERIES
// ==========================================

export interface QueryPeriod {
  start: string;
  end: string;
  label: string;
}

export function parseQueryPeriod(text: string): QueryPeriod {
  const lower = text.toLowerCase();
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);

  if (/\byesterday\b|\bkahapon\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    const dateStr = d.toISOString().substring(0, 10);
    return { start: dateStr, end: dateStr, label: 'yesterday' };
  }

  if (/\blast week\b|\bpast week\b/.test(lower)) {
    const d = new Date(now);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday - 7);
    const startStr = d.toISOString().substring(0, 10);
    const endObj = new Date(d);
    endObj.setDate(endObj.getDate() + 6);
    const endStr = endObj.toISOString().substring(0, 10);
    return { start: startStr, end: endStr, label: 'last week' };
  }

  if (/\blast month\b|\bpast month\b/.test(lower)) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);
    return {
      start: startDate.toISOString().substring(0, 10),
      end: endDate.toISOString().substring(0, 10),
      label: 'last month',
    };
  }

  if (/\bthis week\b|\bweek\b|\blinggo\b/.test(lower)) {
    const d = new Date(now);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    const startStr = d.toISOString().substring(0, 10);
    return { start: startStr, end: todayStr, label: 'this week' };
  }

  if (/\btoday\b|\bngayon\b|\baraw\b/.test(lower)) {
    return { start: todayStr, end: todayStr, label: 'today' };
  }

  // Default: this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
  return { start: startOfMonth, end: todayStr, label: 'this month' };
}

export function buildExactSpendingReply(state: FinanceState, input: string): ChatEngineResult | null {
  const lower = input.toLowerCase();
  const isSpending = /\b(?:spend|spent|gastos|expenses|spending|nakagastos)\b/i.test(lower);
  if (!isSpending) return null;

  const period = parseQueryPeriod(lower);

  // Check if a category is specified
  const expenseCategories = state.categories.filter(c => c.kind === 'expense');
  let matchedCat: Category | null = null;

  for (const cat of expenseCategories) {
    if (lower.includes(cat.label.toLowerCase())) {
      matchedCat = cat;
      break;
    }
  }

  // Keyword category check if no direct label match
  if (!matchedCat) {
    const diningKeywords = ['lunch', 'dinner', 'food', 'coffee', 'meal'];
    const groceryKeywords = ['grocery', 'groceries', 'supermarket', 'palengke'];
    const transportKeywords = ['grab', 'taxi', 'gas', 'commute', 'fare'];
    if (diningKeywords.some(k => lower.includes(k))) matchedCat = expenseCategories.find(c => c.id === 'cat_dining') || null;
    else if (groceryKeywords.some(k => lower.includes(k))) matchedCat = expenseCategories.find(c => c.id === 'cat_groceries') || null;
    else if (transportKeywords.some(k => lower.includes(k))) matchedCat = expenseCategories.find(c => c.id === 'cat_transport') || null;
  }

  const filtered = state.transactions.filter(t => {
    if (t.type !== 'expense') return false;
    if (t.date < period.start || t.date > period.end) return false;
    if (matchedCat && t.categoryId !== matchedCat.id) return false;
    return true;
  });

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);
  const formattedTotal = formatCurrency(total, state.preferredCurrency);
  const catSuffix = matchedCat ? ` on ${matchedCat.label}` : '';

  if (total === 0) {
    return {
      kind: 'answer',
      message: `You have no logged expenses${catSuffix} ${period.label}.`,
      quickReplies: ['What is my balance?', 'Budget status', 'Log lunch ₱150'],
    };
  }

  let detail = `${filtered.length} logged expense${filtered.length === 1 ? '' : 's'} counted.`;

  // If no specific category was asked, determine biggest category
  if (!matchedCat && filtered.length > 0) {
    const catTotals = new Map<string, number>();
    for (const t of filtered) {
      catTotals.set(t.categoryId, (catTotals.get(t.categoryId) || 0) + t.amount);
    }
    let topCatId = '';
    let topCatAmount = 0;
    for (const [id, amt] of catTotals.entries()) {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatId = id;
      }
    }
    const topCatObj = state.categories.find(c => c.id === topCatId);
    if (topCatObj) {
      detail += `\nBiggest category: ${topCatObj.label} at ${formatCurrency(topCatAmount, state.preferredCurrency)}.`;
    }
  }

  return {
    kind: 'answer',
    message: `You spent ${formattedTotal}${catSuffix} ${period.label}.\n\n${detail}`,
    quickReplies: ['Spent this month?', 'Budget status', 'What is my balance?'],
  };
}

export function buildExactBalanceReply(state: FinanceState, input: string): ChatEngineResult | null {
  const lower = input.toLowerCase();
  const isBalance = /\b(?:balance|pera|savings|net worth|pera ko|magkano pera|how much money|cash|wallet)\b/i.test(lower);
  if (!isBalance) return null;

  // Single account query
  const specificAcc = findMentionedAccount(lower, state.accounts);
  if (specificAcc) {
    if (specificAcc.type === 'credit') {
      const debt = Math.max(0, specificAcc.balance);
      const limit = specificAcc.creditLimit || 0;
      const available = Math.max(0, limit - debt);
      return {
        kind: 'answer',
        message: `${specificAcc.name} has ${formatCurrency(debt, specificAcc.currency)} in card debt and ${formatCurrency(available, specificAcc.currency)} still available.`,
        quickReplies: ['What is my total balance?', 'Spent this month?', 'Budget status'],
      };
    }
    if (specificAcc.type === 'loans') {
      return {
        kind: 'answer',
        message: `${specificAcc.name} has ${formatCurrency(Math.max(0, specificAcc.balance), specificAcc.currency)} still owed.`,
        quickReplies: ['What is my total balance?', 'Who owes me?'],
      };
    }
    return {
      kind: 'answer',
      message: `Your balance in ${specificAcc.name} is ${formatCurrency(specificAcc.balance, specificAcc.currency || state.preferredCurrency)}.`,
      quickReplies: ['What is my total balance?', 'Spent this month?', 'Budget status'],
    };
  }

  // Overall account summary
  const debitAccounts = state.accounts.filter(a => !isLiabilityAccount(a.type) && !a.archivedAt);
  if (debitAccounts.length === 0) {
    return {
      kind: 'answer',
      message: 'You have no active debit or cash accounts logged yet. Add one in Wallet first.',
      quickReplies: ['Budget status', 'Help'],
    };
  }

  const liquidTotal = debitAccounts.reduce((sum, a) => sum + a.balance, 0);
  const highest = [...debitAccounts].sort((a, b) => b.balance - a.balance)[0];

  const breakdown = debitAccounts
    .map(a => `• ${a.name}: ${formatCurrency(a.balance, a.currency || state.preferredCurrency)}`)
    .join('\n');

  return {
    kind: 'answer',
    message: `You have ${formatCurrency(liquidTotal, state.preferredCurrency)} across ${debitAccounts.length} active account${debitAccounts.length === 1 ? '' : 's'}.${highest ? ` Most sits in ${highest.name} (${formatCurrency(highest.balance, highest.currency)}).` : ''}\n\n${breakdown}`,
    quickReplies: ['Spent this month?', 'Budget status', 'Who owes me?'],
  };
}

export function buildExactAccountSummaryReply(state: FinanceState, input: string): ChatEngineResult | null {
  const lower = input.toLowerCase();
  const isSummary = /\b(?:what accounts|which accounts|show accounts|list accounts|all accounts|account balances)\b/i.test(lower);
  if (!isSummary) return null;

  if (state.accounts.length === 0) {
    return {
      kind: 'answer',
      message: 'You have no accounts tracked yet. Add an account in Wallet first.',
      quickReplies: ['Help', 'Budget status'],
    };
  }

  const list = state.accounts
    .filter(a => !a.archivedAt)
    .map(a => {
      if (a.type === 'credit') {
        const debt = Math.max(0, a.balance);
        const limit = a.creditLimit || 0;
        return `• ${a.name} (Credit): debt ${formatCurrency(debt, a.currency)}, available ${formatCurrency(Math.max(0, limit - debt), a.currency)}`;
      }
      if (a.type === 'loans') {
        return `• ${a.name} (Loan): owed ${formatCurrency(Math.max(0, a.balance), a.currency)}`;
      }
      return `• ${a.name} (${a.type}): ${formatCurrency(a.balance, a.currency)}`;
    })
    .join('\n');

  return {
    kind: 'answer',
    message: `You have ${state.accounts.length} tracked account(s):\n\n${list}`,
    quickReplies: ['What is my balance?', 'Spent this month?', 'Budget status'],
  };
}

export function buildExactBudgetReply(state: FinanceState, input: string): ChatEngineResult | null {
  const lower = input.toLowerCase();
  const isBudget = /\b(?:budget|budgets|spending limit|matitira)\b/i.test(lower);
  if (!isBudget) return null;

  if (state.budgets.length === 0) {
    return {
      kind: 'answer',
      message: 'You have no active category budgets yet. Open the Plan tab to set monthly spending limits for Groceries, Dining, or Transport.',
      quickReplies: ['What is my balance?', 'Spent this month?'],
    };
  }

  const currentYearMonth = new Date().toISOString().substring(0, 7);

  // Check if specific category budget asked
  const matchedCat = state.categories.find(c => lower.includes(c.label.toLowerCase()));
  if (matchedCat) {
    const b = state.budgets.find(item => item.categoryId === matchedCat.id);
    if (!b) {
      return {
        kind: 'answer',
        message: `You do not have an active budget for ${matchedCat.label} yet. Set one in the Plan tab and I can track it for you.`,
        quickReplies: ['Budget status', 'Spent this month?'],
      };
    }

    const p = calculateBudgetProgress(b, state.transactions, currentYearMonth);
    const statusText = p.remaining >= 0
      ? `Your ${matchedCat.label} budget has ${formatCurrency(p.remaining, state.preferredCurrency)} left (${formatCurrency(p.spent, state.preferredCurrency)} used of ${formatCurrency(b.amount, state.preferredCurrency)} limit).`
      : `You are over your ${matchedCat.label} budget by ${formatCurrency(Math.abs(p.remaining), state.preferredCurrency)} (${formatCurrency(p.spent, state.preferredCurrency)} spent against ${formatCurrency(b.amount, state.preferredCurrency)} limit).`;

    return {
      kind: 'answer',
      message: `${statusText}\nThat is ${p.percent}% of the limit.`,
      quickReplies: ['Budget status', 'Spent this month?'],
    };
  }

  // All budgets summary
  const progressList = state.budgets.map(b => {
    const cat = state.categories.find(c => c.id === b.categoryId);
    const p = calculateBudgetProgress(b, state.transactions, currentYearMonth);
    return { b, cat, p };
  });

  const overBudgets = progressList.filter(item => item.p.remaining < 0);
  const totalLimit = state.budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = progressList.reduce((sum, item) => sum + item.p.spent, 0);
  const remainingTotal = Math.max(0, totalLimit - totalSpent);

  const headline = overBudgets.length > 0
    ? `${overBudgets.length} of your ${state.budgets.length} budget(s) is over the limit.`
    : `All ${state.budgets.length} of your budgets are currently within their limits.`;

  const summaries = progressList.map(item => {
    const label = item.cat?.label || 'Category';
    if (item.p.remaining < 0) {
      return `• ${label}: over by ${formatCurrency(Math.abs(item.p.remaining), state.preferredCurrency)} (${item.p.percent}%)`;
    }
    return `• ${label}: ${formatCurrency(item.p.remaining, state.preferredCurrency)} left of ${formatCurrency(item.b.amount, state.preferredCurrency)} (${item.p.percent}%)`;
  }).join('\n');

  return {
    kind: 'answer',
    message: `${headline}\nOverall: ${formatCurrency(totalSpent, state.preferredCurrency)} used of ${formatCurrency(totalLimit, state.preferredCurrency)} limit (${formatCurrency(remainingTotal, state.preferredCurrency)} remaining).\n\n${summaries}`,
    quickReplies: ['Spent this month?', 'What is my balance?'],
  };
}

export function buildExact503020Reply(state: FinanceState, input: string): ChatEngineResult | null {
  const lower = input.toLowerCase();
  const is503020 =
    /\b(?:50\/30\/20|50-30-20|50 30 20)\b/i.test(lower) ||
    (/\b(?:needs?|wants?|savings?)\b/i.test(lower) && /\b(?:rule|split|ratio|breakdown|how much)\b/i.test(lower));

  if (!is503020) return null;

  const currentYearMonth = new Date().toISOString().substring(0, 7);
  const config = state.budgetRuleConfig || DEFAULT_BUDGET_RULE_CONFIG;
  const b = compute503020Breakdown(state.transactions, state.categories, currentYearMonth, config);

  const baseDesc = b.totalIncome > 0
    ? `income of ${formatCurrency(b.totalIncome, state.preferredCurrency)}`
    : `monthly outflow of ${formatCurrency(b.totalExpenses, state.preferredCurrency)}`;

  const needsLine = `• Needs (${Math.round(b.needs.ratio * 100)}% cap): ${formatCurrency(b.needs.actual, state.preferredCurrency)} used (${b.needs.percentOfIncome}% of base, target ${formatCurrency(b.needs.target, state.preferredCurrency)})`;
  const wantsLine = `• Wants (${Math.round(b.wants.ratio * 100)}% cap): ${formatCurrency(b.wants.actual, state.preferredCurrency)} used (${b.wants.percentOfIncome}% of base, target ${formatCurrency(b.wants.target, state.preferredCurrency)})`;
  const savingsLine = `• Savings (${Math.round(b.savings.ratio * 100)}% goal): ${formatCurrency(b.savings.actual, state.preferredCurrency)} realized (${b.savings.percentOfIncome}% of base, target ${formatCurrency(b.savings.target, state.preferredCurrency)})`;

  let advice = 'Your spending is currently within the 50/30/20 benchmark.';
  if (b.needs.status === 'over') {
    advice = 'Needs are exceeding 50%. In tight months, adapt to a 70/20/10 split until fixed costs ease.';
  } else if (b.wants.status === 'over') {
    advice = 'Wants are exceeding 30%. Cutting back on non-essential dining and shopping can help replenish savings.';
  }

  return {
    kind: 'answer',
    message: `50/30/20 Rule Breakdown (This Month based on ${baseDesc}):\n\n${needsLine}\n${wantsLine}\n${savingsLine}\n\n${advice}`,
    topic: 'budget',
    quickReplies: ['Budget status', 'Spent this month?', 'What is my balance?'],
  };
}

export function buildExactDebtReply(state: FinanceState, input: string): ChatEngineResult | null {
  const lower = input.toLowerCase();
  const isDebt = /\b(?:what do i owe|how much do i owe|my debts?|debt status|outstanding debt)\b/i.test(lower);
  if (!isDebt) return null;

  const openDebts = state.debts.filter(d => d.type === 'debt' && !d.closedAt);
  if (openDebts.length === 0) {
    return {
      kind: 'answer',
      message: 'You have no outstanding debts logged. Nothing owed right now.',
      quickReplies: ['Who owes me?', 'What is my balance?'],
    };
  }

  const totalOwed = openDebts.reduce((sum, d) => sum + d.amount, 0);
  const list = openDebts.map(d => `• To ${d.name}: ${formatCurrency(d.amount, state.preferredCurrency)}${d.dueDate ? ` (Due: ${d.dueDate})` : ''}`).join('\n');

  return {
    kind: 'answer',
    message: `You owe ${formatCurrency(totalOwed, state.preferredCurrency)} across ${openDebts.length} debt(s):\n\n${list}`,
    quickReplies: ['Who owes me?', 'What is my balance?'],
  };
}

export function buildExactReceivableReply(state: FinanceState, input: string): ChatEngineResult | null {
  const lower = input.toLowerCase();
  const isReceivable = /\b(?:who owes me|receivables?|owed to me|singil|pautang)\b/i.test(lower);
  if (!isReceivable) return null;

  const openReceivables = state.debts.filter(d => d.type === 'receivable' && !d.closedAt);
  if (openReceivables.length === 0) {
    return {
      kind: 'answer',
      message: 'Nobody owes you money right now. All logged receivables are settled.',
      quickReplies: ['My debts', 'What is my balance?'],
    };
  }

  const totalReceivable = openReceivables.reduce((sum, d) => sum + d.amount, 0);
  const list = openReceivables.map(d => `• ${d.name}: ${formatCurrency(d.amount, state.preferredCurrency)}${d.dueDate ? ` (Due: ${d.dueDate})` : ''}`).join('\n');

  return {
    kind: 'answer',
    message: `You have ${formatCurrency(totalReceivable, state.preferredCurrency)} owed to you across ${openReceivables.length} receivable(s):\n\n${list}`,
    quickReplies: ['What is my balance?', 'Budget status'],
  };
}

export function buildBiggestExpenseReply(state: FinanceState, input: string): ChatEngineResult | null {
  const lower = input.toLowerCase();
  const isBiggest = /\b(?:biggest|highest|pinakamalaki|largest)\b/i.test(lower) && /\b(?:expense|spent|gastos)\b/i.test(lower);
  if (!isBiggest) return null;

  const currentYearMonth = new Date().toISOString().substring(0, 7);
  const monthExpenses = state.transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentYearMonth));

  if (monthExpenses.length === 0) {
    return {
      kind: 'answer',
      message: 'No expenses logged for this month yet.',
      quickReplies: ['What is my balance?', 'Budget status'],
    };
  }

  const sorted = [...monthExpenses].sort((a, b) => b.amount - a.amount);
  const biggest = sorted[0];
  const cat = state.categories.find(c => c.id === biggest.categoryId);

  return {
    kind: 'answer',
    message: `Your biggest expense this month is ${formatCurrency(biggest.amount, state.preferredCurrency)} for "${biggest.note || cat?.label || 'Purchase'}" on ${biggest.date}.`,
    quickReplies: ['Spent this month?', 'Budget status', 'What is my balance?'],
  };
}

// ==========================================
// 4. TRANSACTION DRAFT BUILDER
// ==========================================

export function parseSingleTransactionDraft(
  segment: string,
  state: FinanceState,
  inheritedAccount?: Account,
  inheritedDate?: string
): ChatTransactionDraft | null {
  const trimmed = segment.trim();
  const lower = trimmed.toLowerCase();
  const amountData = extractAmount(trimmed);
  if (!amountData) return null;

  const amount = amountData.amount;

  // Resolve date
  let txDate = inheritedDate;
  if (!txDate) {
    const isYesterday = /\b(?:yesterday|kahapon)\b/i.test(lower);
    const dateObj = new Date();
    if (isYesterday) {
      dateObj.setDate(dateObj.getDate() - 1);
    }
    txDate = dateObj.toISOString().substring(0, 10);
  }

  // Resolve source account
  const account = findMentionedAccount(lower, state.accounts) || inheritedAccount || state.accounts.find(a => !isLiabilityAccount(a.type)) || state.accounts[0];
  if (!account) return null;

  // 1. Transfer intent
  const isTransfer = /\b(?:transfer|lipat|move|send|sent)\b/i.test(lower);
  if (isTransfer) {
    const toAcc = state.accounts.find(a => a.id !== account.id) || account;
    return {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'transfer',
      amount,
      accountId: account.id,
      accountName: account.name,
      toAccountId: toAcc.id,
      toAccountName: toAcc.name,
      categoryId: 'cat_transfer',
      categoryName: 'Transfer',
      categoryIcon: 'swap-horizontal-outline',
      categoryColor: '#38BDF8',
      date: txDate,
      note: `Transfer to ${toAcc.name}`,
    };
  }

  // 2. Income intent
  const isIncome = /\b(?:salary|sahod|sweldo|income|earned|receive|received|deposit|bonus|freelance|sideline|allowance|remittance)\b/i.test(lower);
  if (isIncome) {
    const category = inferIncomeCategory(lower, state.categories);
    const note = cleanTransactionNote(trimmed) || category.label;
    return {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'income',
      amount,
      accountId: account.id,
      accountName: account.name,
      categoryId: category.id,
      categoryName: category.label,
      categoryIcon: category.icon,
      categoryColor: category.color || '#10B981',
      date: txDate,
      note,
    };
  }

  // 3. Expense (default)
  const category = inferExpenseCategory(lower, state.categories);
  const note = cleanTransactionNote(trimmed) || category.label;
  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'expense',
    amount,
    accountId: account.id,
    accountName: account.name,
    categoryId: category.id,
    categoryName: category.label,
    categoryIcon: category.icon,
    categoryColor: category.color || '#EF4444',
    date: txDate,
    note,
  };
}

// ==========================================
// 5. MAIN DETERMINISTIC OFFLINE NLP DISPATCHER
// ==========================================

export function processOfflineChatMessage(
  input: string,
  state: FinanceState,
  memory?: ChatMemoryContext
): ChatEngineResult {
  let trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      kind: 'help',
      message: 'Type a message or question, such as "Spent 150 lunch on GCash" or "What is my total balance?".',
      quickReplies: ['What is my balance?', 'Spent this month?', 'Budget status', 'Who owes me?'],
    };
  }

  // 1. REJECTION / CANCELLATION HANDLER
  if (isRejectedTransactionMessage(trimmed)) {
    return {
      kind: 'answer',
      message: 'Cancelled. Let me know whenever you want to log another transaction or ask about your finances.',
      pendingClarification: null,
      quickReplies: ['What is my balance?', 'Spent this month?', 'Budget status'],
    };
  }

  // 2. CONVERSATIONAL CLARIFICATION MERGING
  if (memory?.pendingClarification) {
    trimmed = mergeChatTransactionClarification(memory.pendingClarification.originalText, trimmed);
  }

  // 3. GROUNDED FINANCIAL QUERIES
  const reply503020 = buildExact503020Reply(state, trimmed);
  if (reply503020) return reply503020;

  const biggestExpenseReply = buildBiggestExpenseReply(state, trimmed);
  if (biggestExpenseReply) return biggestExpenseReply;

  const exactBudgetReply = buildExactBudgetReply(state, trimmed);
  if (exactBudgetReply) return exactBudgetReply;

  const exactDebtReply = buildExactDebtReply(state, trimmed);
  if (exactDebtReply) return exactDebtReply;

  const exactReceivableReply = buildExactReceivableReply(state, trimmed);
  if (exactReceivableReply) return exactReceivableReply;

  const exactSpendingReply = buildExactSpendingReply(state, trimmed);
  if (exactSpendingReply) return exactSpendingReply;

  const exactSummaryReply = buildExactAccountSummaryReply(state, trimmed);
  if (exactSummaryReply) return exactSummaryReply;

  const exactBalanceReply = buildExactBalanceReply(state, trimmed);
  if (exactBalanceReply) return exactBalanceReply;

  // 4. KNOWLEDGE PACK RETRIEVAL
  const knowledge = retrieveOfflineChatKnowledge(trimmed);
  if (knowledge) {
    const contentText = knowledge.content.join('\n\n');
    return {
      kind: 'answer',
      message: `${knowledge.title}\n${knowledge.summary}\n\n${contentText}`,
      topic: knowledge.topics[0],
      quickReplies: ['What is my balance?', 'Spent this month?', 'Budget status'],
    };
  }

  // 5. GREETINGS & SMALL TALK
  const isGreeting = /^(?:hi|hello|hey|kamusta|kumusta|good morning|good evening|good afternoon)\b/i.test(lower);
  if (isGreeting && trimmed.split(/\s+/).length <= 4) {
    const nameStr = state.preferredName ? `, ${state.preferredName}` : '';
    return {
      kind: 'answer',
      message: `Hello${nameStr}! I am your offline financial assistant. I can log single or batch transactions, report your account balances, track budget limits, and check pending debts directly on your device.`,
      quickReplies: ['What is my balance?', 'Spent today?', 'Budget status', 'Log lunch ₱150'],
    };
  }

  // 6. HELP & CAPABILITIES
  const isHelp = /^(?:help|tulong|what can you do|features|commands|capabilities|ano pwede mong gawin)\b/i.test(lower);
  if (isHelp) {
    return {
      kind: 'help',
      message: 'Here is what you can ask me completely offline:\n\n' +
        '1. Log Expenses: "Coffee 95", "Spent 180 lunch on GCash", "Grab 250 Maya"\n' +
        '2. Multi-Item Batch: "Coffee 95 and lunch 180 on GCash"\n' +
        '3. Log Income: "Salary 25000 to BPI", "Received 3000 freelance"\n' +
        '4. Log Transfers: "Transfer 1000 from BPI to GCash"\n' +
        '5. Account Balances: "What is my balance?", "GCash balance", "Show all accounts"\n' +
        '6. Filtered Spending: "Spent today?", "Food this month?", "Groceries this week?"\n' +
        '7. Budgets & Debts: "Budget status", "Who owes me?", "My debts"',
      quickReplies: ['What is my balance?', 'Spent this month?', 'Budget status', 'Log Coffee ₱95'],
    };
  }

  // 7. TRANSACTION BATCH & SINGLE LOGGING
  const segments = splitChatTransactionSegments(trimmed);
  if (segments.length > 0) {
    const parsedDrafts: ChatTransactionDraft[] = [];

    // Context sharing: find shared account or date from the whole input
    const sharedAccount = findMentionedAccount(trimmed, state.accounts) || undefined;
    const isYesterday = /\b(?:yesterday|kahapon)\b/i.test(trimmed);
    let sharedDate: string | undefined = undefined;
    if (isYesterday) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      sharedDate = d.toISOString().substring(0, 10);
    }

    for (const seg of segments) {
      const draft = parseSingleTransactionDraft(seg, state, sharedAccount, sharedDate);
      if (draft) {
        parsedDrafts.push(draft);
      }
    }

    if (parsedDrafts.length > 1) {
      const totalBatch = parsedDrafts.reduce((sum, d) => sum + d.amount, 0);
      const itemsOverview = parsedDrafts
        .map(d => `• ${d.note}: ${formatCurrency(d.amount, state.preferredCurrency)} (${d.categoryName} via ${d.accountName})`)
        .join('\n');

      return {
        kind: 'transaction_proposal',
        message: `I prepared a batch of ${parsedDrafts.length} transactions totaling ${formatCurrency(totalBatch, state.preferredCurrency)}:\n\n${itemsOverview}\n\nConfirm below to record them.`,
        drafts: parsedDrafts,
        draft: parsedDrafts[0], // Backwards compatibility
        pendingClarification: null,
        quickReplies: ['Cancel'],
      };
    }

    if (parsedDrafts.length === 1) {
      const d = parsedDrafts[0];
      const typeDesc = d.type === 'transfer'
        ? `transfer of ${formatCurrency(d.amount, state.preferredCurrency)} from ${d.accountName} to ${d.toAccountName || 'destination'}`
        : `${d.type} of ${formatCurrency(d.amount, state.preferredCurrency)} under ${d.categoryName} via ${d.accountName}`;

      return {
        kind: 'transaction_proposal',
        message: `I prepared a proposal for a ${typeDesc}. Confirm below to log it.`,
        drafts: [d],
        draft: d,
        pendingClarification: null,
        quickReplies: ['Cancel'],
      };
    }
  }

  // 8. FALLBACK UNRECOGNIZED INPUT
  return {
    kind: 'help',
    message: 'I could not recognize that offline request. You can log an entry (e.g. "Lunch 150 GCash" or "Coffee 95 and lunch 180"), ask about your finances ("What is my balance?", "Food this month?", "Budget status"), or ask for financial tips ("Emergency fund guidance").',
    quickReplies: ['What is my balance?', 'Spent this month?', 'Budget status', 'Help'],
  };
}
