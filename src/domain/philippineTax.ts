/**
 * 2026 Philippine Income Tax & Statutory Contributions Engine
 * Reverse-Engineered from Tarsi Module 3486 (computePhilippineIncomeTax2026)
 * Follows BIR RR No. 8-2018 / TRAIN Law Revised Individual Tax Schedules
 */

export interface TaxBracket {
  over: number;
  notOver: number | null;
  basicTax: number;
  rate: number;
  excessOver: number;
}

export const PHILIPPINE_GRADUATED_TAX_BRACKETS_2026: TaxBracket[] = [
  { over: 0, notOver: 250000, basicTax: 0, rate: 0, excessOver: 0 },
  { over: 250000, notOver: 400000, basicTax: 0, rate: 0.15, excessOver: 250000 },
  { over: 400000, notOver: 800000, basicTax: 22500, rate: 0.20, excessOver: 400000 },
  { over: 800000, notOver: 2000000, basicTax: 102500, rate: 0.25, excessOver: 800000 },
  { over: 2000000, notOver: 8000000, basicTax: 402500, rate: 0.30, excessOver: 2000000 },
  { over: 8000000, notOver: null, basicTax: 2202500, rate: 0.35, excessOver: 8000000 },
];

export type TaxRegimeMode = 'compensation' | 'self-employed-graduated' | 'self-employed-8';

export interface TaxCalculationResult {
  mode: TaxRegimeMode;
  annualAmount: number;
  taxDue: number | null;
  monthlyEquivalent: number | null;
  effectiveRate: number | null;
  marginalRate: number | null;
  formulaLabel: string;
  status: 'ok' | 'not-eligible';
  statusMessage: string | null;
  basisLabel: string;
}

export function computePhilippineIncomeTax2026(
  annualAmount: number,
  mode: TaxRegimeMode = 'compensation'
): TaxCalculationResult {
  const bound = Math.max(annualAmount, 0);

  if (mode === 'self-employed-8') {
    if (bound > 3000000) {
      return {
        mode,
        annualAmount: bound,
        taxDue: null,
        monthlyEquivalent: null,
        effectiveRate: null,
        marginalRate: null,
        formulaLabel: '8% option not available above PHP 3,000,000 gross sales / receipts.',
        status: 'not-eligible',
        statusMessage:
          'Based on BIR rules, the 8% option is only for qualified non-VAT self-employed individuals and professionals within the PHP 3,000,000 threshold.',
        basisLabel: 'Annual gross sales / receipts',
      };
    }

    const taxDue = Math.max(bound - 250000, 0) * 0.08;
    const effectiveRate = bound > 0 ? taxDue / bound : 0;
    const formulaLabel =
      bound <= 250000
        ? 'No income tax because gross receipts do not exceed PHP 250,000.'
        : '8% of gross receipts in excess of PHP 250,000';

    return {
      mode,
      annualAmount: bound,
      taxDue,
      monthlyEquivalent: taxDue / 12,
      effectiveRate,
      marginalRate: 0.08,
      formulaLabel,
      status: 'ok',
      statusMessage: 'For qualified non-VAT self-employed and professionals.',
      basisLabel: 'Annual gross sales / receipts',
    };
  }

  // Graduated brackets (Compensation & Self-employed graduated)
  const bracket =
    PHILIPPINE_GRADUATED_TAX_BRACKETS_2026.find(b => {
      if (b.notOver === null) return bound > b.over;
      return bound <= b.notOver;
    }) || PHILIPPINE_GRADUATED_TAX_BRACKETS_2026[0];

  const taxDue = bracket.basicTax + Math.max(bound - bracket.excessOver, 0) * bracket.rate;
  const effectiveRate = bound > 0 ? taxDue / bound : 0;
  const basisLabel =
    mode === 'compensation' ? 'Taxable annual compensation income' : 'Taxable annual net income';

  let formulaLabel = 'No income tax on taxable income up to PHP 250,000.';
  if (bound > 250000) {
    formulaLabel = `PHP ${bracket.basicTax.toLocaleString()} + ${(bracket.rate * 100).toFixed(0)}% of the excess over PHP ${bracket.excessOver.toLocaleString()}`;
  }

  return {
    mode,
    annualAmount: bound,
    taxDue,
    monthlyEquivalent: taxDue / 12,
    effectiveRate,
    marginalRate: bracket.rate,
    formulaLabel,
    status: 'ok',
    statusMessage: null,
    basisLabel,
  };
}
