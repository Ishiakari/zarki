# Zarki - Personal Offline Financial Ledger

Zarki is an offline-first personal finance and net-worth tracker built with **React Native** and **Expo**, engineered using clean-room domain specifications derived from reverse-engineering research on modern mobile personal finance architectures.

---

## 🌟 Key Features

1. **Unified Net Worth & Multi-Account Wallet**:
   - Supports 6 distinct account classifications: **Cash/Debit**, **Credit Cards**, **Loans**, **Fixed Assets**, **Stocks**, and **Cryptocurrencies**.
   - Accurately computes true Net Worth:
     $$\text{Net Worth} = \sum(\text{Assets} + \text{Debit} + \text{Investments}) - \sum(\text{Credit Cards} + \text{Loans} + \text{Debts}) + \text{Receivables}$$
   - Handles credit cards and loan balances as true negative liabilities while displaying their real limits and statement totals.

2. **Full Transaction Ledger**:
   - Log **Expenses**, **Income**, and internal **Transfers** between accounts.
   - Automatically recalibrates account balances upon saving without manual calculation.

3. **Planning, Category Budgets & Savings Goals**:
   - Monthly category spending caps with visual progress bars and over-budget alerts.
   - Savings goals with real-time percentage achievement indicators.

4. **100% Offline & Private**:
   - No external server dependencies, cloud accounts, or paywalls required.
   - State persists locally on the device using encrypted/local asynchronous storage.

---

## 📁 Project Structure

```text
D:\Zarki
├── App.tsx                     # Main entry point & bottom tab navigation
├── app.json                    # Expo application manifest
├── package.json                # Dependencies and launch scripts
├── tsconfig.json               # TypeScript configuration
└── src
    ├── domain
    │   └── calculator.ts       # Net worth, liability, and budget math
    ├── screens
    │   ├── AddTransactionModal.tsx  # Modal to log expenses/income/transfers
    │   ├── HistoryScreen.tsx   # Chronological transaction ledger
    │   ├── PlanScreen.tsx      # Budgets and goals progress
    │   └── WalletScreen.tsx    # Net worth hero card & accounts list
    ├── storage
    │   └── storage.ts          # Offline persistence & initial state
    ├── store
    │   └── useFinanceStore.ts  # State management & reactive hooks
    └── types
        └── index.ts            # Type definitions (Accounts, Transactions, etc.)
```

---

## 🚀 How to Run

1. Open a terminal in `D:\Zarki`:
   ```bash
   cd D:\Zarki
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npm start
   ```
4. Press **`a`** to open in an Android emulator/device, or scan the QR code using the **Expo Go** app on your phone!
