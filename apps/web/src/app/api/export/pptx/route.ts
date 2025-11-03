import { NextRequest, NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { z } from 'zod';

// Validation schemas
const SlideSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  bulletPoints: z.array(z.string()).optional(),
  layout: z.enum(['title', 'content', 'titleAndContent', 'twoColumn', 'blank']).default('titleAndContent'),
  notes: z.string().optional(),
});

const ExportPPTXSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().optional(),
  slides: z.array(SlideSchema).min(1).max(50),
  theme: z.enum(['light', 'dark', 'blue', 'professional']).default('professional'),
});

export type ExportPPTXRequest = z.infer<typeof ExportPPTXSchema>;
export type Slide = z.infer<typeof SlideSchema>;

/**
 * POST /api/export/pptx
 *
 * Generates a PowerPoint presentation from structured slide data.
 *
 * Features:
 * - Multiple slide layouts (title, content, title+content, two-column, blank)
 * - Bullet point support
 * - Speaker notes
 * - Theme selection (light, dark, blue, professional)
 * - Automatic formatting and styling
 *
 * Rate Limited: 30 req/min
 * Authentication: Required
 */
export async function POST(req: NextRequest) {
  const authResult = await withAuth(req);
  if (!authResult.ok) return authResult.response;

  const rateLimitResult = await withRateLimit(req, {
    maxRequests: 30,
    windowMs: 60000, // 30 requests per minute
  });
  if (!rateLimitResult.ok) return rateLimitResult.response;

  try {
    // Parse and validate request body
    const body: unknown = await req.json();
    const validation = ExportPPTXSchema.safeParse(body);

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

    const { title, author, slides, theme } = validation.data;

    // Create presentation
    const pres = new pptxgen();

    // Set metadata
    pres.title = title;
    pres.author = author || authResult.user.user.email || 'FROK User';
    pres.subject = 'Presentation created by FROK AI Assistant';
    pres.company = 'FROK';

    // Define theme colors
    const themeColors = {
      light: { bg: 'FFFFFF', text: '333333', accent: '3B82F6', secondary: 'F3F4F6' },
      dark: { bg: '1F2937', text: 'F9FAFB', accent: '60A5FA', secondary: '374151' },
      blue: { bg: '1E3A8A', text: 'FFFFFF', accent: 'FBBF24', secondary: '3B82F6' },
      professional: { bg: 'FFFFFF', text: '1F2937', accent: '2563EB', secondary: 'E5E7EB' },
    };

    const colors = themeColors[theme];

    // Generate slides
    for (const slideData of slides) {
      const slide = pres.addSlide();

      // Set background
      slide.background = { color: colors.bg };

      switch (slideData.layout) {
        case 'title': {
          // Title slide (centered)
          if (slideData.title) {
            slide.addText(slideData.title, {
              x: 0.5,
              y: '35%',
              w: '90%',
              h: 1.5,
              fontSize: 44,
              bold: true,
              color: colors.text,
              align: 'center',
            });
          }

          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 0.5,
              y: '55%',
              w: '90%',
              h: 1,
              fontSize: 24,
              color: colors.text,
              align: 'center',
            });
          }
          break;
        }

        case 'content': {
          // Content only (no title)
          if (slideData.bulletPoints && slideData.bulletPoints.length > 0) {
            slide.addText(slideData.bulletPoints.map((point) => ({ text: point, options: { bullet: true } })), {
              x: 0.5,
              y: 1.0,
              w: '90%',
              h: '80%',
              fontSize: 20,
              color: colors.text,
            });
          } else if (slideData.content) {
            slide.addText(slideData.content, {
              x: 0.5,
              y: 1.0,
              w: '90%',
              h: '80%',
              fontSize: 20,
              color: colors.text,
            });
          }
          break;
        }

        case 'titleAndContent': {
          // Title + content (most common)
          if (slideData.title) {
            slide.addText(slideData.title, {
              x: 0.5,
              y: 0.5,
              w: '90%',
              h: 0.8,
              fontSize: 32,
              bold: true,
              color: colors.accent,
            });
          }

          if (slideData.bulletPoints && slideData.bulletPoints.length > 0) {
            slide.addText(slideData.bulletPoints.map((point) => ({ text: point, options: { bullet: true } })), {
              x: 0.5,
              y: 1.5,
              w: '90%',
              h: '70%',
              fontSize: 18,
              color: colors.text,
            });
          } else if (slideData.content) {
            slide.addText(slideData.content, {
              x: 0.5,
              y: 1.5,
              w: '90%',
              h: '70%',
              fontSize: 18,
              color: colors.text,
            });
          }
          break;
        }

        case 'twoColumn': {
          // Two-column layout
          if (slideData.title) {
            slide.addText(slideData.title, {
              x: 0.5,
              y: 0.5,
              w: '90%',
              h: 0.8,
              fontSize: 32,
              bold: true,
              color: colors.accent,
            });
          }

          // Split bullet points into two columns
          if (slideData.bulletPoints && slideData.bulletPoints.length > 0) {
            const midpoint = Math.ceil(slideData.bulletPoints.length / 2);
            const leftPoints = slideData.bulletPoints.slice(0, midpoint);
            const rightPoints = slideData.bulletPoints.slice(midpoint);

            // Left column
            slide.addText(leftPoints.map((point) => ({ text: point, options: { bullet: true } })), {
              x: 0.5,
              y: 1.5,
              w: '43%',
              h: '70%',
              fontSize: 18,
              color: colors.text,
            });

            // Right column
            slide.addText(rightPoints.map((point) => ({ text: point, options: { bullet: true } })), {
              x: '52%',
              y: 1.5,
              w: '43%',
              h: '70%',
              fontSize: 18,
              color: colors.text,
            });
          }
          break;
        }

        case 'blank': {
          // Blank slide - user can add custom content via notes
          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 0.5,
              y: 0.5,
              w: '90%',
              h: '85%',
              fontSize: 18,
              color: colors.text,
            });
          }
          break;
        }
      }

      // Add speaker notes if provided
      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }

      // Add footer
      slide.addText(`${title}`, {
        x: 0.5,
        y: '95%',
        w: '50%',
        h: 0.3,
        fontSize: 10,
        color: colors.text,
      });

      slide.addText(`Generated by FROK`, {
        x: '55%',
        y: '95%',
        w: '40%',
        h: 0.3,
        fontSize: 10,
        color: colors.text,
        align: 'right',
      });
    }

    // Generate PPTX buffer
    const pptxBuffer = await pres.write({ outputType: 'arraybuffer' });

    // Return PPTX file
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;

    return new NextResponse(pptxBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pptxBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('[PPTX Export] Error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'export_failed',
        message: error instanceof Error ? error.message : 'Failed to generate PowerPoint presentation',
      },
      { status: 500 }
    );
  }
}
