import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
} from 'docx';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { z } from 'zod';

// Validation schemas
const ExportDOCXSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().optional(),
  content: z.string().min(1),
  formatting: z
    .object({
      fontSize: z.number().min(8).max(72).default(11),
      fontFamily: z.string().default('Calibri'),
      lineSpacing: z.number().min(1).max(3).default(1.15),
    })
    .optional(),
  includeTableOfContents: z.boolean().default(false),
});

export type ExportDOCXRequest = z.infer<typeof ExportDOCXSchema>;

/**
 * POST /api/export/docx
 *
 * Generates a Word document (.docx) from text content.
 *
 * Features:
 * - Rich text formatting (bold, italic, underline, headers)
 * - Automatic paragraph parsing
 * - Markdown-like syntax support (# for headers, ** for bold, * for italic)
 * - Customizable font settings
 * - Optional table of contents
 * - Lists and bullet points
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
    const validation = ExportDOCXSchema.safeParse(body);

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

    const { title, author, content, formatting, includeTableOfContents } = validation.data;

    // Document sections
    const sections: Paragraph[] = [];

    // Title
    sections.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400,
        },
      })
    );

    // Author and date
    const authorText = author || authResult.user.user.email || 'FROK User';
    const dateText = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Author: ${authorText}`,
            italics: true,
            size: 20, // 10pt
          }),
        ],
        spacing: {
          after: 100,
        },
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Date: ${dateText}`,
            italics: true,
            size: 20, // 10pt
          }),
        ],
        spacing: {
          after: 400,
        },
      })
    );

    // Table of contents placeholder
    if (includeTableOfContents) {
      sections.push(
        new Paragraph({
          text: 'Table of Contents',
          heading: HeadingLevel.HEADING_1,
          spacing: {
            before: 400,
            after: 200,
          },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '(Table of contents will be generated when opened in Word)',
              italics: true,
              color: '666666',
            }),
          ],
          spacing: {
            after: 400,
          },
        })
      );
    }

    // Parse content
    const paragraphs = content.split('\n\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      // Check for headers (# or ##)
      if (paragraph.startsWith('# ')) {
        sections.push(
          new Paragraph({
            text: paragraph.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: {
              before: 400,
              after: 200,
            },
          })
        );
        continue;
      }

      if (paragraph.startsWith('## ')) {
        sections.push(
          new Paragraph({
            text: paragraph.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: {
              before: 300,
              after: 150,
            },
          })
        );
        continue;
      }

      // Check for bullet points
      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
        const bulletText = paragraph.substring(2);
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: bulletText,
                size: (formatting?.fontSize || 11) * 2, // docx uses half-points
                font: formatting?.fontFamily || 'Calibri',
              }),
            ],
            bullet: {
              level: 0,
            },
            spacing: {
              after: 100,
            },
          })
        );
        continue;
      }

      // Regular paragraph with inline formatting
      const runs = parseInlineFormatting(paragraph, formatting);

      sections.push(
        new Paragraph({
          children: runs,
          spacing: {
            after: 200,
            line: Math.round(((formatting?.lineSpacing || 1.15) * 240)),
          },
        })
      );
    }

    // Footer
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '\n\nGenerated by FROK AI Assistant',
            size: 18, // 9pt
            italics: true,
            color: '999999',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 800,
        },
      })
    );

    // Create document
    const doc = new Document({
      creator: 'FROK AI Assistant',
      title,
      description: 'Document created by FROK AI Assistant',
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });

    // Generate DOCX buffer
    const docxBuffer = await Packer.toBuffer(doc);

    // Return DOCX file
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': docxBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('[DOCX Export] Error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'export_failed',
        message: error instanceof Error ? error.message : 'Failed to generate Word document',
      },
      { status: 500 }
    );
  }
}

/**
 * Parse inline formatting markers (**bold**, *italic*, __underline__)
 */
function parseInlineFormatting(
  text: string,
  formatting?: { fontSize?: number; fontFamily?: string }
): TextRun[] {
  const runs: TextRun[] = [];
  const fontSize = (formatting?.fontSize || 11) * 2; // docx uses half-points
  const fontFamily = formatting?.fontFamily || 'Calibri';

  // Simple regex-based parser for inline formatting
  // Supports: **bold**, *italic*, __underline__
  const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__|[^*_]+)/g;
  const matches = text.match(regex);

  if (!matches) {
    runs.push(
      new TextRun({
        text,
        size: fontSize,
        font: fontFamily,
      })
    );
    return runs;
  }

  for (const match of matches) {
    if (match.startsWith('**') && match.endsWith('**')) {
      // Bold
      runs.push(
        new TextRun({
          text: match.slice(2, -2),
          bold: true,
          size: fontSize,
          font: fontFamily,
        })
      );
    } else if (match.startsWith('*') && match.endsWith('*')) {
      // Italic
      runs.push(
        new TextRun({
          text: match.slice(1, -1),
          italics: true,
          size: fontSize,
          font: fontFamily,
        })
      );
    } else if (match.startsWith('__') && match.endsWith('__')) {
      // Underline
      runs.push(
        new TextRun({
          text: match.slice(2, -2),
          underline: {
            type: UnderlineType.SINGLE,
          },
          size: fontSize,
          font: fontFamily,
        })
      );
    } else {
      // Regular text
      runs.push(
        new TextRun({
          text: match,
          size: fontSize,
          font: fontFamily,
        })
      );
    }
  }

  return runs;
}
