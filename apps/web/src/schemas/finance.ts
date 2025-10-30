/**
 * Finance-related validation schemas
 */

import { z } from 'zod';
import { uuidSchema, nonEmptyStringSchema, isoDateSchema, paginationSchema } from './common';

/**
 * Currency codes
 */
export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).or(z.string());

/**
 * Account types
 */
export const accountTypeSchema = z.enum(['checking', 'savings', 'credit', 'investment']).or(z.string());

/**
 * Category types
 */
export const categoryTypeSchema = z.enum(['income', 'expense', 'transfer']);

/**
 * Create account request body
 */
export const createAccountSchema = z.object({
  name: nonEmptyStringSchema.max(100),
  type: accountTypeSchema,
  currency: currencySchema,
  balance: z.number().default(0),
});

/**
 * Update account request body
 */
export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: accountTypeSchema.optional(),
  balance: z.number().optional(),
}).strict();

/**
 * Create category request body
 */
export const createCategorySchema = z.object({
  name: nonEmptyStringSchema.max(100),
  type: categoryTypeSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  icon: z.string().max(50).optional(),
  parent_id: uuidSchema.nullable().optional(),
});

/**
 * Update category request body
 */
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: categoryTypeSchema.optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parent_id: uuidSchema.nullable().optional(),
}).strict();

/**
 * Create transaction request body
 */
export const createTransactionSchema = z.object({
  account_id: uuidSchema,
  category_id: uuidSchema.nullable().optional(),
  amount: z.number(),
  currency: currencySchema,
  posted_at: isoDateSchema,
  description: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Update transaction request body
 */
export const updateTransactionSchema = z.object({
  category_id: uuidSchema.nullable().optional(),
  amount: z.number().optional(),
  description: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

/**
 * Import transaction item (from CSV or JSON)
 */
export const importTransactionItemSchema = z.object({
  date: z.string(), // Will be parsed to Date
  account: nonEmptyStringSchema,
  description: z.string().optional(),
  amount: z.number(),
  currency: currencySchema.optional(),
});

/**
 * Import transactions request body (JSON format)
 */
export const importTransactionsSchema = z.object({
  items: z.array(importTransactionItemSchema).min(1).max(10000), // Max 10k transactions per import
});

/**
 * Transaction list query parameters
 */
export const transactionListQuerySchema = paginationSchema.extend({
  q: z.string().optional(), // Search query
  from: isoDateSchema.optional(), // Start date
  to: isoDateSchema.optional(), // End date
  category: uuidSchema.optional(), // Filter by category
  account: uuidSchema.optional(), // Filter by account
});

/**
 * Financial summary query parameters
 */
export const financialSummaryQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  accounts: z.array(uuidSchema).optional(),
  categories: z.array(uuidSchema).optional(),
});
