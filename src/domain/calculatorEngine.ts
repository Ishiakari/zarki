export interface CalculatorState {
  current: string;
  prevValue: number | null;
  operator: string | null;
  waitingForOperand: boolean;
  expression: string;
}

export const CALCULATOR_INITIAL_STATE: CalculatorState = {
  current: '0',
  prevValue: null,
  operator: null,
  waitingForOperand: false,
  expression: '',
};

export type CalculatorAction =
  | { type: 'digit'; digit: string; minorUnits?: number }
  | { type: 'decimal'; minorUnits?: number }
  | { type: 'operator'; op: string; minorUnits?: number }
  | { type: 'equals'; minorUnits?: number }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'restore'; current: string };

const MAX_DIGITS = 11;
const OPERATORS = new Set(['+', '−', '-', '×', '*', '÷', '/', '%']);

export function formatNumberWithCommas(str: string): string {
  if (!str) return '0';
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function resolvePendingCalculation(state: CalculatorState, minorUnits = 2): CalculatorState {
  if (state.prevValue !== null && state.operator && !state.waitingForOperand) {
    const prev = state.prevValue;
    const curr = parseFloat(state.current) || 0;
    let sum = prev;

    if (state.operator === '+') {
      sum = prev + curr;
    } else if (state.operator === '−' || state.operator === '-') {
      sum = prev - curr;
    } else if (state.operator === '×' || state.operator === '*') {
      sum = prev * curr;
    } else if (state.operator === '÷' || state.operator === '/') {
      sum = curr !== 0 ? prev / curr : prev;
    } else if (state.operator === '%') {
      sum = curr !== 0 ? prev % curr : prev;
    }

    const rounded = Math.round((sum + Number.EPSILON) * 10 ** minorUnits) / 10 ** minorUnits;
    const formattedPrev = formatNumberWithCommas(String(prev));
    const formattedCurr = formatNumberWithCommas(state.current);

    return {
      current: String(rounded),
      prevValue: null,
      operator: null,
      waitingForOperand: false,
      expression: `${formattedPrev} ${state.operator} ${formattedCurr}`,
    };
  }

  return state;
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  const minorUnits = ('minorUnits' in action && typeof action.minorUnits === 'number') ? action.minorUnits : 2;

  switch (action.type) {
    case 'digit': {
      const { digit } = action;
      const isZeros = /^0+$/.test(digit);

      if (state.waitingForOperand) {
        return {
          ...state,
          current: isZeros ? '0' : digit,
          waitingForOperand: false,
        };
      }

      if (state.current === '0') {
        if (isZeros) return state;
        return { ...state, current: digit };
      }

      if (state.current.includes('.')) {
        const decimals = state.current.split('.')[1] || '';
        if (decimals.length + digit.length > minorUnits) {
          return state;
        }
      }

      const nextVal = state.current === '0' ? digit : state.current + digit;
      if (nextVal.replace('.', '').length > Math.max(MAX_DIGITS, minorUnits + 1)) {
        return state;
      }

      return {
        ...state,
        current: nextVal,
      };
    }

    case 'decimal': {
      if (minorUnits <= 0) return state;

      if (state.waitingForOperand) {
        return {
          ...state,
          current: '0.',
          waitingForOperand: false,
        };
      }

      if (state.current.includes('.')) {
        return state;
      }

      return {
        ...state,
        current: `${state.current}.`,
      };
    }

    case 'operator': {
      const currentNum = parseFloat(state.current) || 0;
      let currentState = state;

      // If we already have a calculation in progress and user types another operator, resolve the first one first
      if (state.prevValue !== null && state.operator && !state.waitingForOperand) {
        currentState = resolvePendingCalculation(state, minorUnits);
      }

      const resolvedNum = parseFloat(currentState.current) || currentNum;
      const formattedPrev = formatNumberWithCommas(currentState.current);

      return {
        ...currentState,
        prevValue: resolvedNum,
        operator: action.op,
        waitingForOperand: true,
        expression: `${formattedPrev} ${action.op}`,
      };
    }

    case 'equals': {
      return resolvePendingCalculation(state, minorUnits);
    }

    case 'backspace': {
      if (state.waitingForOperand) {
        return {
          ...state,
          operator: null,
          waitingForOperand: false,
          prevValue: null,
          expression: '',
        };
      }

      if (state.prevValue !== null && state.operator) {
        const sliced = state.current.slice(0, -1);
        if (sliced) {
          return { ...state, current: sliced };
        }
        return {
          ...state,
          current: String(state.prevValue),
          waitingForOperand: true,
        };
      }

      const sliced = state.current.slice(0, -1);
      const nextCurrent = (sliced && sliced !== '-') ? sliced : '0';
      return {
        ...state,
        current: nextCurrent,
        expression: '',
      };
    }

    case 'clear': {
      return CALCULATOR_INITIAL_STATE;
    }

    case 'restore': {
      const clean = action.current ? action.current.replace(/,/g, '') : '0';
      return {
        ...CALCULATOR_INITIAL_STATE,
        current: clean && !isNaN(Number(clean)) ? clean : '0',
      };
    }

    default:
      return state;
  }
}

export function parseCalculatorValue(str: string): number {
  const clean = str.replace(/,/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}
