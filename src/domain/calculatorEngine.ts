export interface CalculatorState {
  current: string;
  prevValue: number | null;
  operator: string | null;
  waitingForOperand: boolean;
  expression: string;
  isResult?: boolean;
}

export const CALCULATOR_INITIAL_STATE: CalculatorState = {
  current: '0',
  prevValue: null,
  operator: null,
  waitingForOperand: false,
  expression: '',
  isResult: false,
};

export type CalculatorAction =
  | { type: 'digit'; digit: string; minorUnits?: number }
  | { type: 'decimal'; minorUnits?: number }
  | { type: 'operator'; op: string; minorUnits?: number }
  | { type: 'equals'; minorUnits?: number }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'restore'; current: string };

const MAX_DIGITS = 12;

export function formatNumberWithCommas(str: string): string {
  if (!str) return '0';
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function resolvePendingCalculation(state: CalculatorState, minorUnits = 2): CalculatorState {
  if (state.prevValue !== null && state.operator) {
    const prev = state.prevValue;
    const curr = state.waitingForOperand ? prev : (parseFloat(state.current) || 0);
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
      sum = prev * (curr / 100);
    }

    const rounded = Math.round((sum + Number.EPSILON) * 10 ** minorUnits) / 10 ** minorUnits;
    const formattedPrev = formatNumberWithCommas(String(prev));
    const formattedCurr = formatNumberWithCommas(String(curr));

    return {
      current: String(rounded),
      prevValue: null,
      operator: null,
      waitingForOperand: false,
      expression: `${formattedPrev} ${state.operator} ${formattedCurr} =`,
      isResult: true,
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

      // If user just solved a calculation and types a digit, start a brand new number
      if (state.isResult) {
        return {
          ...CALCULATOR_INITIAL_STATE,
          current: isZeros ? '0' : digit,
          isResult: false,
        };
      }

      if (state.waitingForOperand) {
        return {
          ...state,
          current: isZeros ? '0' : digit,
          waitingForOperand: false,
          isResult: false,
        };
      }

      if (state.current === '0') {
        if (isZeros) return state;
        return { ...state, current: digit, isResult: false };
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
        isResult: false,
      };
    }

    case 'decimal': {
      if (minorUnits <= 0) return state;

      if (state.isResult) {
        return {
          ...CALCULATOR_INITIAL_STATE,
          current: '0.',
          isResult: false,
        };
      }

      if (state.waitingForOperand) {
        return {
          ...state,
          current: '0.',
          waitingForOperand: false,
          isResult: false,
        };
      }

      if (state.current.includes('.')) {
        return state;
      }

      return {
        ...state,
        current: `${state.current}.`,
        isResult: false,
      };
    }

    case 'operator': {
      // Percentage calculation
      if (action.op === '%') {
        const currNum = parseFloat(state.current) || 0;
        if (state.prevValue !== null && state.operator) {
          if (state.operator === '+' || state.operator === '−' || state.operator === '-') {
            const pct = state.prevValue * (currNum / 100);
            return {
              ...state,
              current: String(pct),
              waitingForOperand: false,
              isResult: false,
            };
          }
          if (state.operator === '×' || state.operator === '*' || state.operator === '÷' || state.operator === '/') {
            const pct = currNum / 100;
            return {
              ...state,
              current: String(pct),
              waitingForOperand: false,
              isResult: false,
            };
          }
        }
        const pct = currNum / 100;
        return {
          ...state,
          current: String(pct),
          expression: `${formatNumberWithCommas(state.current)} %`,
          isResult: false,
        };
      }

      let currentState = state;

      // If there is already a calculation in progress and user hasn't pressed an operator right before, resolve first
      if (state.prevValue !== null && state.operator && !state.waitingForOperand) {
        currentState = resolvePendingCalculation(state, minorUnits);
      }

      const currentNum = parseFloat(currentState.current) || 0;
      const formattedPrev = formatNumberWithCommas(currentState.current);

      return {
        ...currentState,
        prevValue: currentNum,
        operator: action.op,
        waitingForOperand: true,
        expression: `${formattedPrev} ${action.op}`,
        isResult: false,
      };
    }

    case 'equals': {
      return resolvePendingCalculation(state, minorUnits);
    }

    case 'backspace': {
      if (state.isResult) {
        return {
          ...state,
          expression: '',
          isResult: false,
        };
      }

      if (state.waitingForOperand) {
        return {
          ...state,
          operator: null,
          waitingForOperand: false,
          prevValue: null,
          expression: '',
          isResult: false,
        };
      }

      const sliced = state.current.slice(0, -1);
      const nextCurrent = (sliced && sliced !== '-') ? sliced : '0';
      return {
        ...state,
        current: nextCurrent,
        isResult: false,
      };
    }

    case 'clear': {
      return CALCULATOR_INITIAL_STATE;
    }

    case 'restore': {
      const clean = action.current ? String(action.current).replace(/,/g, '') : '0';
      return {
        ...CALCULATOR_INITIAL_STATE,
        current: clean && !isNaN(Number(clean)) ? clean : '0',
        isResult: false,
      };
    }

    default:
      return state;
  }
}

export function parseCalculatorValue(str: string): number {
  if (!str) return 0;
  const clean = String(str).replace(/,/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}
