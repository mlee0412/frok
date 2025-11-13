import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { getSupabaseServer } from '@/lib/supabase/server';
import { errorHandler } from '@/lib/errorHandler';

// ============================================================================
// File Upload API Route
// ============================================================================

/**
 * POST /api/chat/upload
 *
 * Uploads files for chat messages
 *
 * Features:
 * - Authentication required
 * - Rate limiting (standard tier: 60 req/min)
 * - File validation (size, type, count)
 * - Supabase Storage integration
 * - Secure file URLs with expiration
 * - Multiple file support (max 5)
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export async function POST(req: NextRequest) {
  // Rate limiting (standard tier)
  const rateLimitResult = await withRateLimit(req, {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  const userId = auth.user.userId;

  try {
    // Parse form data
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    // Validate file count
    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { ok: false, error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    // Validate each file
    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            ok: false,
            error: `File "${file.name}" exceeds maximum size of 10MB`,
          },
          { status: 400 }
        );
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            ok: false,
            error: `File type "${file.type}" is not allowed`,
          },
          { status: 400 }
        );
      }
    }

    // Upload files to Supabase Storage
    const supabase = await getSupabaseServer();
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileName = `${userId}/${timestamp}-${randomId}-${file.name}`;

      // Convert File to ArrayBuffer for Supabase
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload ${file.name}`);
      }

      // Get public URL (with 1 hour expiration)
      const { data: urlData } = await supabase.storage
        .from('chat-files')
        .createSignedUrl(data.path, 3600);

      if (!urlData?.signedUrl) {
        throw new Error(`Failed to get URL for ${file.name}`);
      }

      uploadedUrls.push(urlData.signedUrl);
    }

    return NextResponse.json({
      ok: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high',
      context: { route: '/api/chat/upload', userId },
    });

    return NextResponse.json(
      { ok: false, error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/chat/upload
// Delete uploaded file (cleanup)
// ============================================================================

export async function DELETE(req: NextRequest) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(req, {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  const userId = auth.user.userId;

  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { ok: false, error: 'File path required' },
        { status: 400 }
      );
    }

    // Verify file belongs to user
    if (!filePath.startsWith(`${userId}/`)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete from Supabase Storage
    const supabase = await getSupabaseServer();
    const { error } = await supabase.storage
      .from('chat-files')
      .remove([filePath]);

    if (error) {
      throw new Error('Failed to delete file');
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high',
      context: { route: '/api/chat/upload (DELETE)', userId },
    });

    return NextResponse.json(
      { ok: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
