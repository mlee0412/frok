/**
 * Session Storage with Encryption for OpenAI Agents SDK
 *
 * Implements encrypted session storage using Supabase backend.
 * Ensures conversation data is encrypted at rest for compliance (GDPR, HIPAA).
 *
 * Features:
 * - AES-256-GCM encryption for session data
 * - User isolation with RLS policies
 * - Automatic expiration after 30 days
 * - Type-safe storage interface
 *
 * @module sessionStorage
 * @see packages/db/migrations/0008_encrypted_sessions.sql
 */

import { createClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * Storage interface for encrypted sessions
 */
interface SessionStorage {
  save(data: string): Promise<void>;
  load(): Promise<string | null>;
  delete(): Promise<void>;
}

/**
 * Encrypted session data structure stored in Supabase
 */
interface EncryptedSessionRow {
  thread_id: string;
  user_id: string;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase-backed encrypted session storage
 *
 * Encrypts conversation data before storing in database.
 * Uses AES-256-GCM for authenticated encryption.
 */
export class SupabaseEncryptedStorage implements SessionStorage {
  private encryptionKey: Buffer;

  constructor(
    private threadId: string,
    private userId: string,
    private supabase: ReturnType<typeof createClient>,
    encryptionKey: string
  ) {
    // Validate and prepare encryption key
    if (!encryptionKey || encryptionKey.length !== KEY_LENGTH * 2) {
      throw new Error(
        `SESSION_ENCRYPTION_KEY must be a ${KEY_LENGTH * 2}-character hex string (${KEY_LENGTH} bytes)`
      );
    }
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * Encrypt data using AES-256-GCM
   *
   * @param plaintext - Data to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  private encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   *
   * @param encrypted - Encrypted data
   * @param iv - Initialization vector
   * @param authTag - Authentication tag
   * @returns Decrypted plaintext
   */
  private decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv(
      ALGORITHM,
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Save encrypted session data to Supabase
   *
   * @param data - Session data to encrypt and store
   */
  async save(data: string): Promise<void> {
    try {
      const { encrypted, iv, authTag } = this.encrypt(data);

      const { error } = await (this.supabase as any)
        .from('encrypted_sessions')
        .upsert(
          {
            thread_id: this.threadId,
            user_id: this.userId,
            encrypted_data: encrypted,
            iv,
            auth_tag: authTag,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'thread_id,user_id',
          }
        );

      if (error) {
        console.error('[SupabaseEncryptedStorage] Save error:', error);
        throw new Error(`Failed to save encrypted session: ${error.message}`);
      }
    } catch (err) {
      console.error('[SupabaseEncryptedStorage] Save exception:', err);
      throw err;
    }
  }

  /**
   * Load and decrypt session data from Supabase
   *
   * @returns Decrypted session data or null if not found
   */
  async load(): Promise<string | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('encrypted_sessions')
        .select('encrypted_data, iv, auth_tag')
        .eq('thread_id', this.threadId)
        .eq('user_id', this.userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No session found (not an error)
          return null;
        }
        console.error('[SupabaseEncryptedStorage] Load error:', error);
        throw new Error(`Failed to load encrypted session: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      const row = data as unknown as EncryptedSessionRow;
      const decrypted = this.decrypt(row.encrypted_data, row.iv, row.auth_tag);

      return decrypted;
    } catch (err) {
      console.error('[SupabaseEncryptedStorage] Load exception:', err);
      throw err;
    }
  }

  /**
   * Delete encrypted session from Supabase
   */
  async delete(): Promise<void> {
    try {
      const { error} = await (this.supabase as any)
        .from('encrypted_sessions')
        .delete()
        .eq('thread_id', this.threadId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('[SupabaseEncryptedStorage] Delete error:', error);
        throw new Error(`Failed to delete encrypted session: ${error.message}`);
      }
    } catch (err) {
      console.error('[SupabaseEncryptedStorage] Delete exception:', err);
      throw err;
    }
  }
}

/**
 * Create encrypted session storage for a chat thread
 *
 * @param threadId - Chat thread ID
 * @param userId - User ID
 * @param supabase - Supabase client
 * @returns Encrypted storage instance
 *
 * @example
 * ```typescript
 * const storage = createEncryptedStorage(threadId, userId, supabase);
 * await storage.save(JSON.stringify(sessionData));
 * const data = await storage.load();
 * ```
 */
export function createEncryptedStorage(
  threadId: string,
  userId: string,
  supabase: ReturnType<typeof createClient>
): SupabaseEncryptedStorage {
  const encryptionKey = process.env['SESSION_ENCRYPTION_KEY'];

  if (!encryptionKey) {
    throw new Error(
      'SESSION_ENCRYPTION_KEY environment variable is required for encrypted sessions'
    );
  }

  return new SupabaseEncryptedStorage(threadId, userId, supabase, encryptionKey);
}
