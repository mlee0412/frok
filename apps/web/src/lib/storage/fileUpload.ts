/**
 * File upload utilities for Supabase Storage
 */

import { supabaseClient } from '@/lib/supabaseClient';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export const STORAGE_BUCKET = 'chat-attachments';

// ============================================================================
// Types
// ============================================================================

export interface UploadProgress {
  file: File;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds 10MB limit (${formatFileSize(file.size)})`,
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not supported. Allowed: images, PDF, Word, text files.`,
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): { valid: boolean; error?: string } {
  if (files.length === 0) {
    return { valid: false, error: 'No files provided' };
  }

  if (files.length > 5) {
    return { valid: false, error: 'Maximum 5 files allowed per message' };
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Generate unique file path for storage
 * Format: {userId}/{threadId}/{timestamp}-{randomId}-{filename}
 */
function generateFilePath(userId: string, threadId: string, filename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${threadId}/${timestamp}-${randomId}-${sanitizedFilename}`;
}

/**
 * Upload single file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  userId: string,
  threadId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate file path
    const filePath = generateFilePath(userId, threadId, file.name);

    // Upload to Supabase Storage
    const client = supabaseClient();
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[uploadFile] Storage error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    if (onProgress) {
      onProgress(100);
    }

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error: unknown) {
    console.error('[uploadFile] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload multiple files with progress tracking
 */
export async function uploadFiles(
  files: File[],
  userId: string,
  threadId: string,
  onProgress?: (progress: UploadProgress[]) => void
): Promise<UploadResult[]> {
  // Validate all files first
  const validation = validateFiles(files);
  if (!validation.valid) {
    return files.map(() => ({ success: false, error: validation.error }));
  }

  // Initialize progress tracking
  const progressMap: UploadProgress[] = files.map((file) => ({
    file,
    progress: 0,
    status: 'pending',
  }));

  if (onProgress) {
    onProgress([...progressMap]);
  }

  // Upload files sequentially (to avoid overwhelming the server)
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;

    // Update status to uploading
    progressMap[i]!.status = 'uploading';
    if (onProgress) {
      onProgress([...progressMap]);
    }

    // Upload file
    const result = await uploadFile(file, userId, threadId, (progress) => {
      progressMap[i]!.progress = progress;
      if (onProgress) {
        onProgress([...progressMap]);
      }
    });

    // Update status based on result
    if (result.success) {
      progressMap[i]!.status = 'completed';
      progressMap[i]!.url = result.url;
      progressMap[i]!.progress = 100;
    } else {
      progressMap[i]!.status = 'error';
      progressMap[i]!.error = result.error;
    }

    if (onProgress) {
      onProgress([...progressMap]);
    }

    results.push(result);
  }

  return results;
}

/**
 * Delete file from storage
 */
export async function deleteFile(fileUrl: string, userId: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex((part) => part === STORAGE_BUCKET);

    if (bucketIndex === -1) {
      console.error('[deleteFile] Invalid file URL:', fileUrl);
      return false;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    // Verify user owns the file
    if (!filePath.startsWith(userId)) {
      console.error('[deleteFile] User does not own file:', filePath);
      return false;
    }

    // Delete from storage
    const client = supabaseClient();
    const { error } = await client.storage.from(STORAGE_BUCKET).remove([filePath]);

    if (error) {
      console.error('[deleteFile] Storage error:', error);
      return false;
    }

    return true;
  } catch (error: unknown) {
    console.error('[deleteFile] Unexpected error:', error);
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? (parts[parts.length - 1] || '').toLowerCase() : '';
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

/**
 * Check if file URL is an image
 */
export function isImageUrl(url: string): boolean {
  const ext = getFileExtension(url);
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
}

/**
 * Get file type icon emoji
 */
export function getFileIcon(filename: string): string {
  const ext = getFileExtension(filename);

  switch (ext) {
    case 'pdf':
      return '📕';
    case 'doc':
    case 'docx':
      return '📘';
    case 'txt':
      return '📄';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'gif':
      return '🖼️';
    default:
      return '📎';
  }
}
