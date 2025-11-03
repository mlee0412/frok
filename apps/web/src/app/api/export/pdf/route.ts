import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { z } from 'zod';

// Validation schemas
const ExportPDFSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  format: z.enum(['A4', 'Letter']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  metadata: z
    .object({
      author: z.string().optional(),
      subject: z.string().optional(),
      keywords: z.string().optional(),
    })
    .optional(),
});

export type ExportPDFRequest = z.infer<typeof ExportPDFSchema>;

/**
 * POST /api/export/pdf
 *
 * Generates a PDF document from text content.
 *
 * Features:
 * - Text wrapping and pagination
 * - Custom title and metadata
 * - Configurable format (A4, Letter)
 * - Support for markdown-like formatting (bold, italic, lists)
 *
 * Rate Limited: 60 req/min
 * Authentication: Required
 */
export async function POST(req: NextRequest) {
  const authResult = await withAuth(req);
  if (!authResult.ok) return authResult.response;

  const rateLimitResult = await withRateLimit(req, {
    maxRequests: 60,
    windowMs: 60000, // 60 requests per minute
  });
  if (!rateLimitResult.ok) return rateLimitResult.response;

  try {
    // Parse and validate request body
    const body: unknown = await req.json();
    const validation = ExportPDFSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, content, format, orientation, metadata } = validation.data;

    // Create PDF document
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: format === 'A4' ? 'a4' : 'letter',
    });

    // Set metadata
    doc.setProperties({
      title,
      author: metadata?.author || authResult.user.user.email || 'FROK User',
      subject: metadata?.subject || 'Document exported from FROK',
      keywords: metadata?.keywords || 'FROK, AI Assistant, Export',
      creator: 'FROK AI Assistant',
    });

    // Page configuration
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Helper: Add page if needed
    const addPageIfNeeded = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const titleLines = doc.splitTextToSize(title, maxLineWidth);
    addPageIfNeeded(titleLines.length * 10);
    doc.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 10 + 10;

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    addPageIfNeeded(6);
    doc.text(dateStr, margin, yPosition);
    yPosition += 15;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    // Parse content into paragraphs
    const paragraphs = content.split('\n\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      // Check for markdown-like headers
      if (paragraph.startsWith('# ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        const headerText = paragraph.substring(2);
        const headerLines = doc.splitTextToSize(headerText, maxLineWidth);
        addPageIfNeeded(headerLines.length * 8 + 5);
        doc.text(headerLines, margin, yPosition);
        yPosition += headerLines.length * 8 + 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        continue;
      }

      if (paragraph.startsWith('## ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        const headerText = paragraph.substring(3);
        const headerLines = doc.splitTextToSize(headerText, maxLineWidth);
        addPageIfNeeded(headerLines.length * 7 + 4);
        doc.text(headerLines, margin, yPosition);
        yPosition += headerLines.length * 7 + 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        continue;
      }

      // Check for list items
      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
        const listText = paragraph.substring(2);
        const listLines = doc.splitTextToSize(listText, maxLineWidth - 5);
        addPageIfNeeded(listLines.length * 6 + 2);
        doc.text('•', margin, yPosition);
        doc.text(listLines, margin + 5, yPosition);
        yPosition += listLines.length * 6 + 4;
        continue;
      }

      // Regular paragraph
      const lines = doc.splitTextToSize(paragraph, maxLineWidth);
      addPageIfNeeded(lines.length * 6 + 4);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 6 + 8;
    }

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      const footerText = `Page ${i} of ${totalPages}`;
      const textWidth = doc.getTextWidth(footerText);
      doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);

      // FROK branding
      const brandText = 'Generated by FROK AI Assistant';
      const brandWidth = doc.getTextWidth(brandText);
      doc.text(brandText, pageWidth - margin - brandWidth, pageHeight - 10);
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    // Return PDF file
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('[PDF Export] Error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'export_failed',
        message: error instanceof Error ? error.message : 'Failed to generate PDF',
      },
      { status: 500 }
    );
  }
}
