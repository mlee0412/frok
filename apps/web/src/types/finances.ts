/**
 * Finance-related type definitions
 * Replaces `any` types in finance routes
 */

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | string;

export type Transaction = {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  currency: Currency;
  date: string; // ISO date string
  description: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | string;
  currency: Currency;
  balance: number;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  color?: string;
  icon?: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type FinancialSummary = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  categorySummary: CategorySummary[];
  accountSummary: AccountSummary[];
};

export type CategorySummary = {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  percentage: number;
};

export type AccountSummary = {
  accountId: string;
  accountName: string;
  balance: number;
  currency: Currency;
  transactionCount: number;
};

export type ImportTransaction = {
  date: string;
  description: string;
  amount: number;
  category?: string;
  account?: string;
};

export type ImportResult = {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
};
