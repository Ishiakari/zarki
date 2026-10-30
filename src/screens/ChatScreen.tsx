import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceState, TransactionType } from '../types';
import { theme } from '../theme/colors';
import { formatCurrency } from '../domain/calculator';
import {
  ChatMessage,
  ChatTransactionDraft,
  ChatMemoryContext,
  processOfflineChatMessage,
} from '../domain/chatEngine';

interface ChatScreenProps {
  visible: boolean;
  onClose: () => void;
  state: FinanceState;
  onAddTransaction: (data: {
    type: TransactionType;
    amount: number;
    accountId: string;
    toAccountId?: string;
    categoryId: string;
    date: string;
    note?: string;
  }) => void;
  onAddTransactionsBatch?: (
    batch: Array<{
      type: TransactionType;
      amount: number;
      accountId: string;
      toAccountId?: string;
      categoryId: string;
      date: string;
      note?: string;
    }>
  ) => void;
}

const DEFAULT_QUICK_REPLIES = [
  'What is my balance?',
  'Spent this month?',
  'Spent today?',
  'Budget status',
  'Who owes me?',
  'Log Lunch ₱150',
  'Log Coffee ₱95 and Lunch ₱180',
  'Emergency fund guidance',
];

export const ChatScreen: React.FC<ChatScreenProps> = ({
  visible,
  onClose,
  state,
  onAddTransaction,
  onAddTransactionsBatch,
}) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [inputText, setInputText] = useState('');
  const [memory, setMemory] = useState<ChatMemoryContext>({});
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello${state.preferredName ? `, ${state.preferredName}` : ''}! I am your offline financial assistant. You can ask me about your account balances, spending, budgets, or tell me to log single or batch transactions (e.g. "Coffee 95 and lunch 180 on GCash").`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickReplies: DEFAULT_QUICK_REPLIES,
    },
  ]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 150);
    }
  }, [visible]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setInputText('');

    // Process offline via deterministic grounded engine with memory
    const result = processOfflineChatMessage(text, state, memory);

    // Update memory
    setMemory({
      lastAnsweredTopic: result.topic || memory.lastAnsweredTopic,
      pendingClarification: result.pendingClarification !== undefined ? result.pendingClarification : null,
    });

    const assistantMsg: ChatMessage = {
      id: `asst_${Date.now() + 1}`,
      sender: 'assistant',
      text: result.message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      drafts: result.drafts,
      draft: result.draft,
      quickReplies: result.quickReplies || DEFAULT_QUICK_REPLIES,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleConfirmSingleDraft = (msgId: string, draft: ChatTransactionDraft) => {
    onAddTransaction({
      type: draft.type,
      amount: draft.amount,
      accountId: draft.accountId,
      toAccountId: draft.toAccountId,
      categoryId: draft.categoryId,
      date: draft.date,
      note: draft.note,
    });

    setMessages(prev =>
      prev.map(m => {
        if (m.id !== msgId) return m;
        const currentConfirmed = m.confirmedDraftIds || [];
        const updatedConfirmed = [...currentConfirmed, draft.id];
        const allDone = m.drafts ? updatedConfirmed.length >= m.drafts.length : true;
        return {
          ...m,
          confirmedDraftIds: updatedConfirmed,
          isDraftConfirmed: allDone,
        };
      })
    );
  };

  const handleConfirmBatchDrafts = (msgId: string, drafts: ChatTransactionDraft[]) => {
    if (drafts.length === 0) return;

    if (onAddTransactionsBatch) {
      onAddTransactionsBatch(
        drafts.map(d => ({
          type: d.type,
          amount: d.amount,
          accountId: d.accountId,
          toAccountId: d.toAccountId,
          categoryId: d.categoryId,
          date: d.date,
          note: d.note,
        }))
      );
    } else {
      for (const d of drafts) {
        onAddTransaction({
          type: d.type,
          amount: d.amount,
          accountId: d.accountId,
          toAccountId: d.toAccountId,
          categoryId: d.categoryId,
          date: d.date,
          note: d.note,
        });
      }
    }

    setMessages(prev =>
      prev.map(m =>
        m.id === msgId
          ? {
              ...m,
              isDraftConfirmed: true,
              confirmedDraftIds: drafts.map(d => d.id),
            }
          : m
      )
    );
  };

  const handleCancelDrafts = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, drafts: undefined, draft: undefined } : m))
    );
  };

  const handleClearHistory = () => {
    Alert.alert('Clear Chat History', 'Are you sure you want to clear your conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMemory({});
          setMessages([
            {
              id: `welcome_${Date.now()}`,
              sender: 'assistant',
              text: 'Conversation cleared. How can I help you with your finances?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              quickReplies: DEFAULT_QUICK_REPLIES,
            },
          ]);
        },
      },
    ]);
  };

  const activeQuickReplies = messages.length > 0 && messages[messages.length - 1].sender === 'assistant'
    ? messages[messages.length - 1].quickReplies || DEFAULT_QUICK_REPLIES
    : DEFAULT_QUICK_REPLIES;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-down" size={24} color={theme.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <View style={styles.assistantBadge}>
              <Ionicons name="sparkles" size={14} color={theme.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Offline Assistant</Text>
              <Text style={styles.headerSub}>Deterministic Grounded Engine</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
            onPress={handleClearHistory}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Message Thread */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            const draftsList = msg.drafts || (msg.draft ? [msg.draft] : []);
            const isBatch = draftsList.length > 1;

            return (
              <View
                key={msg.id}
                style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAsst]}
              >
                {!isUser && (
                  <View style={styles.asstAvatar}>
                    <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                  </View>
                )}

                <View style={styles.bubbleCol}>
                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.bubbleUser : styles.bubbleAsst,
                    ]}
                  >
                    <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
                      {msg.text}
                    </Text>
                  </View>

                  {/* Proposal Cards */}
                  {draftsList.length > 0 && (
                    <View style={styles.draftCard}>
                      <View style={styles.draftCardHeader}>
                        <View
                          style={[
                            styles.draftTypePill,
                            isBatch && { backgroundColor: `${theme.primary}25` },
                            !isBatch && draftsList[0].type === 'income' && { backgroundColor: '#10B98125' },
                            !isBatch && draftsList[0].type === 'transfer' && { backgroundColor: '#38BDF825' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.draftTypeText,
                              isBatch && { color: theme.primary },
                              !isBatch && draftsList[0].type === 'income' && { color: '#10B981' },
                              !isBatch && draftsList[0].type === 'transfer' && { color: '#38BDF8' },
                            ]}
                          >
                            {isBatch ? `BATCH PROPOSAL (${draftsList.length})` : draftsList[0].type.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.draftDateText}>{draftsList[0].date}</Text>
                      </View>

                      {/* Items List in Card */}
                      {draftsList.map((d, dIdx) => {
                        const isConfirmed = msg.isDraftConfirmed || (msg.confirmedDraftIds && msg.confirmedDraftIds.includes(d.id));

                        return (
                          <View
                            key={d.id || `draft_${dIdx}`}
                            style={[
                              styles.draftItemRow,
                              dIdx > 0 && styles.draftItemRowBorder,
                            ]}
                          >
                            <View style={styles.draftItemLeft}>
                              <View
                                style={[
                                  styles.draftItemIcon,
                                  { backgroundColor: `${d.categoryColor || theme.primary}18` },
                                ]}
                              >
                                <Ionicons
                                  name={(d.categoryIcon as keyof typeof Ionicons.glyphMap) || 'pricetag-outline'}
                                  size={16}
                                  color={d.categoryColor || theme.primary}
                                />
                              </View>
                              <View style={styles.draftItemMeta}>
                                <Text style={styles.draftItemNote} numberOfLines={1}>
                                  {d.note || d.categoryName}
                                </Text>
                                <Text style={styles.draftItemSub}>
                                  {d.type === 'transfer'
                                    ? `${d.accountName} -> ${d.toAccountName}`
                                    : `${d.categoryName} • ${d.accountName}`}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.draftItemRight}>
                              <Text
                                style={[
                                  styles.draftItemAmount,
                                  d.type === 'income' && { color: '#10B981' },
                                ]}
                              >
                                {d.type === 'income' ? '+' : ''}
                                {formatCurrency(d.amount, state.preferredCurrency)}
                              </Text>

                              {isBatch && !msg.isDraftConfirmed && (
                                <Pressable
                                  disabled={isConfirmed}
                                  style={[
                                    styles.draftItemMiniBtn,
                                    isConfirmed && styles.draftItemMiniBtnDone,
                                  ]}
                                  onPress={() => handleConfirmSingleDraft(msg.id, d)}
                                >
                                  <Ionicons
                                    name={isConfirmed ? 'checkmark-circle' : 'checkmark'}
                                    size={14}
                                    color={isConfirmed ? '#10B981' : theme.textSecondary}
                                  />
                                </Pressable>
                              )}
                            </View>
                          </View>
                        );
                      })}

                      {/* Card Bottom Actions */}
                      {msg.isDraftConfirmed ? (
                        <View style={styles.draftConfirmedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={styles.draftConfirmedText}>
                            {isBatch ? 'All Items Logged to Ledger' : 'Logged to Ledger'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.draftActionButtons}>
                          <Pressable
                            style={styles.draftCancelBtn}
                            onPress={() => handleCancelDrafts(msg.id)}
                          >
                            <Text style={styles.draftCancelBtnText}>Dismiss</Text>
                          </Pressable>
                          <Pressable
                            style={styles.draftConfirmBtn}
                            onPress={() =>
                              isBatch
                                ? handleConfirmBatchDrafts(msg.id, draftsList)
                                : handleConfirmSingleDraft(msg.id, draftsList[0])
                            }
                          >
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            <Text style={styles.draftConfirmBtnText}>
                              {isBatch ? `Confirm All (${draftsList.length})` : 'Confirm & Log'}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={[styles.timestampText, isUser && { alignSelf: 'flex-end' }]}>
                    {msg.timestamp}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesScroll}
          >
            {activeQuickReplies.map((chip, idx) => (
              <Pressable
                key={`chip_${idx}`}
                style={({ pressed }) => [styles.quickReplyChip, pressed && { opacity: 0.7 }]}
                onPress={() => handleSendMessage(chip)}
              >
                <Text style={styles.quickReplyText}>{chip}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Input Dock */}
        <View style={[styles.inputDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask a question or log: Lunch 150 GCash..."
              placeholderTextColor={theme.textMuted}
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
            />

            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                Boolean(inputText.trim()) && styles.sendBtnActive,
                pressed && { opacity: 0.8 },
              ]}
              disabled={!inputText.trim()}
              onPress={() => handleSendMessage()}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputText.trim() ? '#FFFFFF' : theme.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.cardBorder,
    backgroundColor: theme.surface1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface2,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assistantBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${theme.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.textMuted,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '88%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageRowAsst: {
    alignSelf: 'flex-start',
  },
  asstAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubbleCol: {
    flexShrink: 1,
    gap: 6,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: theme.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAsst: {
    backgroundColor: theme.surface1,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.text,
  },
  messageTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  timestampText: {
    fontSize: 10,
    color: theme.textMuted,
    paddingHorizontal: 4,
  },
  /* Proposal Card */
  draftCard: {
    backgroundColor: theme.surface2,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    gap: 10,
    marginTop: 2,
  },
  draftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftTypePill: {
    backgroundColor: '#EF444425',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  draftTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  draftDateText: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '600',
  },
  draftItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  draftItemRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.cardBorder,
  },
  draftItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  draftItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftItemMeta: {
    flex: 1,
  },
  draftItemNote: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
  draftItemSub: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 1,
  },
  draftItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftItemAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
  },
  draftItemMiniBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  draftItemMiniBtnDone: {
    backgroundColor: '#10B98115',
    borderColor: '#10B98140',
  },
  draftActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  draftCancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  draftCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
  },
  draftConfirmBtn: {
    flex: 2,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  draftConfirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  draftConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: '#10B98115',
    borderRadius: 8,
  },
  draftConfirmedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  /* Quick Replies */
  quickRepliesContainer: {
    backgroundColor: theme.surface1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.cardBorder,
    paddingVertical: 8,
  },
  quickRepliesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickReplyChip: {
    backgroundColor: theme.surface2,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  quickReplyText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  /* Input Dock */
  inputDock: {
    backgroundColor: theme.surface1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface2,
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  textInput: {
    flex: 1,
    minHeight: 38,
    color: theme.text,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: theme.primary,
  },
});
