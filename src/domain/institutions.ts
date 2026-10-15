import { ImageSourcePropType } from 'react-native';

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  category: 'digital_bank' | 'wallet' | 'traditional_bank';
  color: string;
  logo: ImageSourcePropType;
  type: 'debit' | 'credit';
  interestRate?: number;
  description: string;
}

export const INSTITUTIONS: Record<string, Institution> = {
  // E-Wallets & EMIs
  gcash: {
    id: 'gcash',
    name: 'GCash',
    shortName: 'GCash',
    category: 'wallet',
    color: '#005CE6',
    logo: require('../../assets/images/banks/gcash.webp'),
    type: 'debit',
    description: 'Everyday peer-to-peer and QR Ph payments',
  },
  maya: {
    id: 'maya',
    name: 'Maya Wallet',
    shortName: 'Maya',
    category: 'wallet',
    color: '#05EB8A',
    logo: require('../../assets/images/banks/maya.webp'),
    type: 'debit',
    description: 'Consumer wallet and virtual card payments',
  },
  shopeepay: {
    id: 'shopeepay',
    name: 'ShopeePay',
    shortName: 'ShopeePay',
    category: 'wallet',
    color: '#EE4D2D',
    logo: require('../../assets/images/banks/shopeepay.webp'),
    type: 'debit',
    description: 'Shopee e-commerce checkout & vouchers',
  },
  grabpay: {
    id: 'grabpay',
    name: 'GrabPay',
    shortName: 'GrabPay',
    category: 'wallet',
    color: '#00B14F',
    logo: require('../../assets/images/banks/grabpay.webp'),
    type: 'debit',
    description: 'Grab rides, food delivery, and QR Ph',
  },
  coinsph: {
    id: 'coinsph',
    name: 'Coins.ph',
    shortName: 'Coins.ph',
    category: 'wallet',
    color: '#002DFF',
    logo: require('../../assets/images/banks/coinsph.webp'),
    type: 'debit',
    description: 'Digital remittances and crypto trading',
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    shortName: 'PayPal',
    category: 'wallet',
    color: '#0079C1',
    logo: require('../../assets/images/banks/paypal.webp'),
    type: 'debit',
    description: 'Cross-border payments & freelance earnings',
  },

  // Licensed Digital Banks
  gotyme: {
    id: 'gotyme',
    name: 'GoTyme Bank',
    shortName: 'GoTyme',
    category: 'digital_bank',
    color: '#00F5FA',
    logo: require('../../assets/images/banks/gotyme.webp'),
    type: 'debit',
    interestRate: 4.0,
    description: 'High-interest GoSave with kiosk debit card',
  },
  maribank: {
    id: 'maribank',
    name: 'MariBank',
    shortName: 'MariBank',
    category: 'digital_bank',
    color: '#FF5722',
    logo: require('../../assets/images/banks/maribank.webp'),
    type: 'debit',
    interestRate: 4.5,
    description: 'Shopee integrated daily-interest savings',
  },
  mayabank: {
    id: 'mayabank',
    name: 'Maya Bank',
    shortName: 'Maya Bank',
    category: 'digital_bank',
    color: '#05EB8A',
    logo: require('../../assets/images/banks/maya.webp'),
    type: 'debit',
    interestRate: 3.5,
    description: 'Tiered interest savings and personal goals',
  },
  tonik: {
    id: 'tonik',
    name: 'Tonik Bank',
    shortName: 'Tonik',
    category: 'digital_bank',
    color: '#4922A6',
    logo: require('../../assets/images/banks/tonik.webp'),
    type: 'debit',
    interestRate: 4.5,
    description: 'Solo & group stashes with time deposits',
  },
  unobank: {
    id: 'unobank',
    name: 'UNO Digital Bank',
    shortName: 'UNO Bank',
    category: 'digital_bank',
    color: '#00BFFF',
    logo: require('../../assets/images/banks/unobank.webp'),
    type: 'debit',
    interestRate: 4.25,
    description: 'High-yield savings & quick digital credit',
  },
  cimb: {
    id: 'cimb',
    name: 'CIMB Bank Philippines',
    shortName: 'CIMB Bank',
    category: 'digital_bank',
    color: '#780000',
    logo: require('../../assets/images/banks/cimb.webp'),
    type: 'debit',
    interestRate: 4.0,
    description: 'High promotional rates and GSave integration',
  },
  ofbank: {
    id: 'ofbank',
    name: 'Overseas Filipino Bank',
    shortName: 'OFBank',
    category: 'digital_bank',
    color: '#006837',
    logo: require('../../assets/images/banks/landbank.webp'),
    type: 'debit',
    description: 'LandBank digital subsidiary for OFWs',
  },

  // Major Traditional Banks
  bpi: {
    id: 'bpi',
    name: 'BPI',
    shortName: 'BPI',
    category: 'traditional_bank',
    color: '#B91C1C',
    logo: require('../../assets/images/banks/bpi.webp'),
    type: 'debit',
    description: 'Bank of the Philippine Islands',
  },
  bdo: {
    id: 'bdo',
    name: 'BDO Unibank',
    shortName: 'BDO',
    category: 'traditional_bank',
    color: '#1D4ED8',
    logo: require('../../assets/images/banks/bdo.webp'),
    type: 'debit',
    description: 'Banco de Oro',
  },
  unionbank: {
    id: 'unionbank',
    name: 'UnionBank',
    shortName: 'UnionBank',
    category: 'traditional_bank',
    color: '#F59E0B',
    logo: require('../../assets/images/banks/unionbank.webp'),
    type: 'debit',
    description: 'Union Bank of the Philippines',
  },
  metrobank: {
    id: 'metrobank',
    name: 'Metrobank',
    shortName: 'Metrobank',
    category: 'traditional_bank',
    color: '#1E3A8A',
    logo: require('../../assets/images/banks/metrobank.webp'),
    type: 'debit',
    description: 'Metropolitan Bank and Trust Company',
  },
  securitybank: {
    id: 'securitybank',
    name: 'Security Bank',
    shortName: 'Security Bank',
    category: 'traditional_bank',
    color: '#059669',
    logo: require('../../assets/images/banks/securitybank.webp'),
    type: 'debit',
    description: 'BetterBanking savings and credit',
  },
  rcbc: {
    id: 'rcbc',
    name: 'RCBC',
    shortName: 'RCBC',
    category: 'traditional_bank',
    color: '#2563EB',
    logo: require('../../assets/images/banks/rcbc.webp'),
    type: 'debit',
    description: 'Rizal Commercial Banking Corporation',
  },
};

export const INSTITUTIONS_LIST = Object.values(INSTITUTIONS);

export function getInstitution(idOrName?: string | null): Institution | undefined {
  if (!idOrName) return undefined;
  const key = idOrName.toLowerCase().replace(/[\s\-_]/g, '');
  for (const inst of INSTITUTIONS_LIST) {
    const instKey = inst.id.toLowerCase().replace(/[\s\-_]/g, '');
    const instName = inst.name.toLowerCase().replace(/[\s\-_]/g, '');
    const instShort = inst.shortName.toLowerCase().replace(/[\s\-_]/g, '');
    if (key === instKey || key.includes(instKey) || instName.includes(key) || instShort === key) {
      return inst;
    }
  }
  return undefined;
}
