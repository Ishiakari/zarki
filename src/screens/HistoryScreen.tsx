import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, Account, Category } from '../types';
import { formatCurrency } from '../domain/calculator';
import { theme, typography } from '../theme/colors';

interface HistoryScreenProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currency: string;
  bottomInset?: number;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  transactions,
  accounts,
  categories,
  currency,
  bottomInset = 20,
}) => {
  const getCategory = (catId: string) => categories.find(c => c.id === catId);
  const getAccount = (accId: string) => accounts.find(a => a.id === accId);

  const getCategoryIcon = (catId?: string, type?: string): keyof typeof Ionicons.glyphMap => {
    if (type === 'transfer') return 'swap-horizontal';
    const cat = catId ? getCategory(catId) : null;
    if (cat?.icon) {
      return cat.icon as keyof typeof Ionicons.glyphMap;
    }
    return type === 'income' ? 'trending-up-outline' : 'pricetag-outline';
  };

  const renderTransactionItem = ({ item: tx }: { item: Transaction }) => {
    const cat = getCategory(tx.categoryId);
    const sourceAcc = getAccount(tx.accountId);
    const destAcc = tx.toAccountId ? getAccount(tx.toAccountId) : null;
    const isExpense = tx.type === 'expense';
    const isIncome = tx.type === 'income';
    const color = cat?.color || (isExpense ? theme.danger : isIncome ? theme.success : '#38BDF8');

    return (
      <View style={styles.txCard}>
        <View style={[styles.categoryCircle, { backgroundColor: `${color}20` }]}>
          <Ionicons name={getCategoryIcon(tx.categoryId, tx.type)} size={20} color={color} />
        </View>

        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>{tx.note || cat?.label || tx.type.toUpperCase()}</Text>
          <Text style={styles.txSub} numberOfLines={1}>
            {tx.date} • {sourceAcc?.name}
            {destAcc ? ` -> ${destAcc.name}` : ''}
          </Text>
        </View>

        <Text
          style={[
            styles.txAmount,
            isExpense && { color: theme.danger },
            isIncome && { color: theme.success },
          ]}
        >
          {isExpense ? `-${formatCurrency(tx.amount, currency)}` : ''}
          {isIncome ? `+${formatCurrency(tx.amount, currency)}` : ''}
          {tx.type === 'transfer' ? formatCurrency(tx.amount, currency) : ''}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>All chronological cashflows and payments</Text>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={32} color={theme.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Transactions Yet</Text>
          <Text style={styles.emptyText}>Tap the + button below to log your first cashflow.</Text>
        </View>
      ) : (
        <FlashList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 110 }]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    color: theme.text,
    fontSize: typography.title1.fontSize,
    lineHeight: typography.title1.lineHeight,
    fontWeight: typography.title1.fontWeight,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: 2,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#151C1A',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  txCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  categoryCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  txSub: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  txAmount: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
