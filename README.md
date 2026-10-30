# Zarki

An offline-first, private personal finance ledger and wealth planner built with React Native and Expo (SDK 58).

Zarki gives you complete financial visibility without cloud sync, subscription paywalls, or privacy compromises. Everything runs locally on your device with zero latency, an on-device natural language engine, and grounded budgeting frameworks.

---

## Why Zarki?

Most finance apps lock your data behind paid clouds or sell your spending habits to third-party ad networks. Zarki is designed around three principles:

1. **Complete Local Privacy**: Your accounts, balances, transactions, and notes never leave your device.
2. **Instant Latency & Offline Intelligence**: An embedded natural language assistant parses conversational inputs, handles batch logging, and analyzes your finances with zero internet requirement.
3. **Structured Wealth Planning**: Grounded budgeting, the 50/30/20 rule, Philippine tax estimations (TRAIN Law 2026), installment tracking, and debt management in one unified interface.

---

## Core Capabilities

### 1. 50/30/20 Rule Analysis
Automatically divides your monthly cash flow into three clear buckets:
- **Needs (50%)**: Essential living costs such as housing, groceries, utilities, commute, tuition, insurance, and medical care.
- **Wants (30%)**: Lifestyle expenses including dining out, shopping, coffee, and entertainment.
- **Savings (20%)**: Retained net surplus, emergency fund deposits, and debt principal payoff.
- **Interactive Classification**: Customize or override how any category is categorized with a single tap.

### 2. On-Device Natural Language Assistant
A fully offline assistant powered by a deterministic, rule-grounded state-machine parser:
- **Multi-Item Batch Logging**: Log multiple purchases at once (e.g. *"Coffee 95 and lunch 180 on GCash"*).
- **Conversational Memory**: Follow up to complete missing details (e.g. *"Spent 250"*, followed by *"GCash"*).
- **Period & Category Inquiries**: Ask questions like *"How much did I spend on groceries this week?"* or *"What is my biggest expense this month?"*.
- **Curated Philippine Financial Pack**: Instant guidance on emergency fund targets, high-interest debt avalanche/snowball methods, and budget pacing.

### 3. Unified Net Worth & Multi-Account Wallet
- Supports 6 account classifications: Cash/Debit, Credit Cards, Loans, Investments/Stocks, Crypto, and Fixed Assets.
- Mathematical liability balance treatment:
  $$\text{Net Worth} = \sum(\text{Assets} + \text{Debit} + \text{Investments}) - \sum(\text{Credit Debt} + \text{Loans} + \text{Payables}) + \text{Receivables}$$
- Real credit limit tracking with available credit calculations.

### 4. Planning, Installments & Philippine Tax Calculator
- **Category Spending Limits**: Monthly spending caps with real-time progress bars and overspend alerts.
- **Installment Management**: Tracks remaining balances, terms paid, and monthly due dates for 0% and term installment plans.
- **Debt & Receivable Tracker**: Monitor who owes you and what you owe, with due date tracking and settlement toggles.
- **BIR 2026 Tax Estimator**: Accurately computes Philippine withholding income tax under both the graduated TRAIN Law bracket and the 8% gross income tax regime.

### 5. Interactive In-App Calculator Keypad
- Built-in floating calculator keypad supporting chained arithmetic (`+`, `-`, `*`, `/`) with live previews.
- Replaces native keyboard friction for numerical inputs across transactions, goals, debts, and budgets.

---

## Architecture and Tech Stack

- **Framework**: React Native 0.88 & Expo SDK 58 (Fabric / New Architecture compatible)
- **Language**: TypeScript
- **State Management**: Reactive Zustand-style React hooks with asynchronous local storage persistence
- **Styling**: Tokenized dark theme with high-contrast accessibility and safe-area inset management
- **Components**: FlashList virtualized rendering, vector icon primitives, and custom calculator engine

---

## Project Structure

```text
D:\Zarki
├── App.tsx                     # Main application entry & tab navigation
├── app.json                    # Expo application configuration
├── package.json                # Project dependencies (Expo SDK 58)
├── tsconfig.json               # TypeScript compiler configuration
└── src
    ├── components
    │   └── CalculatorKeypad.tsx # Custom numerical and arithmetic input engine
    ├── domain
    │   ├── budgetRule.ts       # 50/30/20 rule allocation math and categorization
    │   ├── calculator.ts       # Net worth, liabilities, and monthly spending
    │   ├── calculatorEngine.ts # Arithmetic evaluation and formatting
    │   ├── chatEngine.ts       # Offline grounded NLU assistant and knowledge pack
    │   └── philippineTax.ts    # BIR 2026 graduated and 8% tax calculation engine
    ├── screens
    │   ├── AddTransactionModal.tsx # Transaction modal with custom category creator
    │   ├── ChatScreen.tsx      # Offline AI chat interface and batch confirmation
    │   ├── HistoryScreen.tsx   # Chronological transaction ledger with search
    │   ├── PlanScreen.tsx      # 50/30/20 rule, category budgets, goals, and taxes
    │   └── WalletScreen.tsx    # Net worth summary, liquid balance, and account list
    ├── storage
    │   └── storage.ts          # Offline local storage layer and initial state
    ├── store
    │   └── useFinanceStore.ts  # Central state dispatcher and persistent actions
    ├── theme
    │   └── colors.ts           # Design tokens, typography, and palette
    └── types
        └── index.ts            # Domain contracts and schema definitions
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Expo Go app on iOS/Android or an emulator

### Installation and Setup

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone https://github.com/Ishiakari/zarki.git
   cd zarki
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Run on a device:
   - Press `a` for Android emulator or device connected via ADB.
   - Press `i` for iOS simulator (macOS required).
   - Scan the terminal QR code using the Expo Go mobile app.

---

## Verification and Quality Checks

To verify type safety and compilation:
```bash
npx tsc --noEmit
```

---

## License

This project is open-source and available under the MIT License.
