import React, { useReducer, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/colors';
import {
  CALCULATOR_INITIAL_STATE,
  calculatorReducer,
  formatNumberWithCommas,
  parseCalculatorValue,
  resolvePendingCalculation,
} from '../domain/calculatorEngine';

export interface CalculatorKeypadProps {
  currency?: string;
  initialValue?: string | number;
  onApply?: (value: number, formatted: string) => void;
  onValueChange?: (value: number, currentStr: string, expression: string) => void;
  compact?: boolean;
  showPreview?: boolean;
  showFooterAction?: boolean;
  footerActionLabel?: string;
  onFooterActionPress?: () => void;
  onHidePress?: () => void;
}

export const CalculatorKeypad: React.FC<CalculatorKeypadProps> = ({
  currency = 'PHP',
  initialValue = '0',
  onApply,
  onValueChange,
  compact = false,
  showPreview = true,
  showFooterAction = true,
  footerActionLabel = 'Done',
  onFooterActionPress,
  onHidePress,
}) => {
  const [state, dispatch] = useReducer(calculatorReducer, CALCULATOR_INITIAL_STATE);

  // Keep a stable ref to onValueChange to prevent re-render loops from unmemoized parent callbacks
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  // Track the last value emitted to parent so we don't restore values that the keypad just emitted
  const lastEmittedValueRef = useRef<string>(String(initialValue ?? '0'));

  // Sync initialValue when it changes from outside (e.g. modal opens or preset chip clicked)
  useEffect(() => {
    const initStr = String(initialValue ?? '0');
    if (initStr !== lastEmittedValueRef.current && initStr !== state.current) {
      lastEmittedValueRef.current = initStr;
      dispatch({ type: 'restore', current: initStr });
    }
  }, [initialValue, state.current]);

  // Notify parent ONLY when state.current or state.expression changes
  useEffect(() => {
    if (onValueChangeRef.current) {
      const num = parseCalculatorValue(state.current);
      lastEmittedValueRef.current = state.current;
      onValueChangeRef.current(num, state.current, state.expression);
    }
  }, [state.current, state.expression]);

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
    // Resolve any remaining pending calculation before applying
    let finalCurrent = state.current;
    if (state.prevValue !== null && state.operator) {
      const resolved = resolvePendingCalculation(state);
      finalCurrent = resolved.current;
      dispatch({ type: 'equals' });
    }
    const num = parseCalculatorValue(finalCurrent);
    if (onFooterActionPress) {
      onFooterActionPress();
      return;
    }
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
      {/* Optional Hide / Collapse Handle */}
      {onHidePress && (
        <Pressable
          style={styles.hideHandle}
          hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
          onPress={onHidePress}
        >
          <View style={styles.hideBar} />
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} style={{ marginTop: -2 }} />
        </Pressable>
      )}

      {/* Expression & Display Card */}
      {showPreview && (
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
      )}

      {/* Grid Keypad */}
      <View style={[styles.grid, compact && styles.gridCompact]}>
        {rows.map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={[styles.row, compact && styles.rowCompact]}>
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
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  hideHandle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    marginBottom: 6,
  },
  hideBar: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.cardBorder,
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
  gridCompact: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowCompact: {
    gap: 6,
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
    height: 40,
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
    marginTop: 8,
    height: 46,
    borderRadius: 14,
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
