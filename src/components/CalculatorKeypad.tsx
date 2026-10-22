import React, { useReducer, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/colors';
import {
  CALCULATOR_INITIAL_STATE,
  calculatorReducer,
  formatNumberWithCommas,
  parseCalculatorValue,
} from '../domain/calculatorEngine';

export interface CalculatorKeypadProps {
  currency?: string;
  initialValue?: string | number;
  onApply?: (value: number, formatted: string) => void;
  onValueChange?: (value: number, currentStr: string) => void;
  compact?: boolean;
  showFooterAction?: boolean;
  footerActionLabel?: string;
}

export const CalculatorKeypad: React.FC<CalculatorKeypadProps> = ({
  currency = 'PHP',
  initialValue = '0',
  onApply,
  onValueChange,
  compact = false,
  showFooterAction = true,
  footerActionLabel = 'Done',
}) => {
  const [state, dispatch] = useReducer(calculatorReducer, CALCULATOR_INITIAL_STATE);

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      const initStr = String(initialValue);
      dispatch({ type: 'restore', current: initStr });
    }
  }, [initialValue]);

  useEffect(() => {
    if (onValueChange) {
      const num = parseCalculatorValue(state.current);
      onValueChange(num, state.current);
    }
  }, [state.current, onValueChange]);

  const handleKey = (key: string) => {
    if (key === 'clear') {
      dispatch({ type: 'clear' });
    } else if (key === 'backspace') {
      dispatch({ type: 'backspace' });
    } else if (key === '=') {
      dispatch({ type: 'equals' });
    } else if (key === '.') {
      dispatch({ type: 'decimal' });
    } else if (['+', '−', '×', '÷', '%'].includes(key)) {
      dispatch({ type: 'operator', op: key });
    } else {
      dispatch({ type: 'digit', digit: key });
    }
  };

  const handleApply = () => {
    // Resolve any remaining calculation first
    let finalCurrent = state.current;
    if (state.prevValue !== null && state.operator && !state.waitingForOperand) {
      const resolved = calculatorReducer(state, { type: 'equals' });
      finalCurrent = resolved.current;
    }
    const num = parseCalculatorValue(finalCurrent);
    onApply?.(num, finalCurrent);
  };

  const currencySymbol = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : `${currency} `;
  const formattedDisplay = formatNumberWithCommas(state.current);

  const rows = [
    [
      { label: 'backspace', isIcon: true, iconName: 'backspace-outline', type: 'util' },
      { label: 'AC', key: 'clear', type: 'clear' },
      { label: '%', key: '%', type: 'op' },
      { label: '÷', key: '÷', type: 'op' },
    ],
    [
      { label: '7', key: '7', type: 'num' },
      { label: '8', key: '8', type: 'num' },
      { label: '9', key: '9', type: 'num' },
      { label: '×', key: '×', type: 'op' },
    ],
    [
      { label: '4', key: '4', type: 'num' },
      { label: '5', key: '5', type: 'num' },
      { label: '6', key: '6', type: 'num' },
      { label: '−', key: '−', type: 'op' },
    ],
    [
      { label: '1', key: '1', type: 'num' },
      { label: '2', key: '2', type: 'num' },
      { label: '3', key: '3', type: 'num' },
      { label: '+', key: '+', type: 'op' },
    ],
    [
      { label: '00', key: '00', type: 'num' },
      { label: '0', key: '0', type: 'num' },
      { label: '.', key: '.', type: 'num' },
      { label: '=', key: '=', type: 'equals' },
    ],
  ];

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Expression & Display Card */}
      <View style={styles.previewCard}>
        <Text style={styles.expressionText} numberOfLines={1}>
          {state.expression || ' '}
        </Text>
        <View style={styles.resultRow}>
          <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
          <Text style={styles.resultText} numberOfLines={1} adjustsFontSizeToFit>
            {formattedDisplay}
          </Text>
        </View>
      </View>

      {/* Grid Keypad */}
      <View style={styles.grid}>
        {rows.map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={styles.row}>
            {row.map((btn, cIdx) => {
              const isOp = btn.type === 'op';
              const isClear = btn.type === 'clear';
              const isEquals = btn.type === 'equals';

              return (
                <Pressable
                  key={`btn-${rIdx}-${cIdx}`}
                  style={({ pressed }) => [
                    styles.key,
                    compact && styles.keyCompact,
                    isOp && styles.keyOp,
                    isClear && styles.keyClear,
                    isEquals && styles.keyEquals,
                    pressed && styles.keyPressed,
                  ]}
                  android_ripple={{
                    color: isEquals ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)',
                    borderless: false,
                  }}
                  onPress={() => handleKey(btn.key || btn.label)}
                >
                  {btn.isIcon ? (
                    <Ionicons
                      name={btn.iconName as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={theme.textSecondary}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.keyText,
                        compact && styles.keyTextCompact,
                        isOp && styles.keyOpText,
                        isClear && styles.keyClearText,
                        isEquals && styles.keyEqualsText,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Footer Action */}
      {showFooterAction && (
        <Pressable
          style={({ pressed }) => [styles.footerButton, pressed && { opacity: 0.85 }]}
          android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
          onPress={handleApply}
        >
          <Text style={styles.footerButtonText}>{footerActionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface1,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  containerCompact: {
    padding: 12,
    borderRadius: 18,
  },
  previewCard: {
    backgroundColor: theme.surface2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  expressionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textMuted,
    minHeight: 18,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.primary,
    marginRight: 6,
  },
  resultText: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  keyCompact: {
    height: 44,
    borderRadius: 12,
  },
  keyPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  keyText: {
    fontSize: 19,
    fontWeight: '600',
    color: theme.text,
  },
  keyTextCompact: {
    fontSize: 17,
  },
  keyOp: {
    backgroundColor: theme.primarySoft,
    borderColor: 'transparent',
  },
  keyOpText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.primary,
  },
  keyClear: {
    backgroundColor: theme.dangerSoft,
    borderColor: 'transparent',
  },
  keyClearText: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.danger,
  },
  keyEquals: {
    backgroundColor: theme.primary,
    borderColor: 'transparent',
  },
  keyEqualsText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footerButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
