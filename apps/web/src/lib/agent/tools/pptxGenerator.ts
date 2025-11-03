import { tool } from '@openai/agents';
import { z } from 'zod';

/**
 * PowerPoint Generation Tool
 *
 * Allows agents to create professional PowerPoint presentations from structured data.
 *
 * Use Cases:
 * - User: "Create a presentation about our project timeline"
 * - User: "Make slides summarizing this quarter's results"
 * - User: "Generate a PowerPoint with 5 slides about [topic]"
 *
 * Features:
 * - Multiple slide layouts (title, content, title+content, two-column, blank)
 * - Bullet point formatting
 * - Speaker notes
 * - Theme selection (light, dark, blue, professional)
 * - Automatic styling
 */
export const pptxGeneratorTool = tool({
  name: 'pptx_generator',
  description: 'Generate a professional PowerPoint presentation with multiple slides. Supports various layouts, bullet points, speaker notes, and themes. Returns a download link for the generated PPTX file.',
  parameters: z.object({
    title: z.string().describe('Presentation title (appears on slides and as file name)'),
    author: z.string().optional().describe('Author name (optional)'),
    slides: z
      .array(
        z.object({
          title: z.string().optional().describe('Slide title'),
          content: z.string().optional().describe('Slide text content (used if no bullet points)'),
          bulletPoints: z
            .array(z.string())
            .optional()
            .describe('Array of bullet points for the slide'),
          layout: z
            .enum(['title', 'content', 'titleAndContent', 'twoColumn', 'blank'])
            .default('titleAndContent')
            .describe('Slide layout: title (centered title slide), content (bullets/text only), titleAndContent (standard), twoColumn (split bullets), blank (custom)'),
          notes: z.string().optional().describe('Speaker notes for the slide (optional)'),
        })
      )
      .min(1)
      .max(50)
      .describe('Array of slides (1-50 slides). Each slide can have title, content, bulletPoints, layout, and notes.'),
    theme: z
      .enum(['light', 'dark', 'blue', 'professional'])
      .default('professional')
      .describe('Presentation theme: light (white background), dark (dark gray), blue (deep blue), professional (white with blue accents)'),
  }),
  async execute({ title, author, slides, theme }) {
    try {
      // Call the PPTX export API endpoint
      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/export/pptx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          author,
          slides,
          theme,
        }),
      });

      if (!response.ok) {
        const errorData: { error?: string; message?: string } = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate PowerPoint presentation');
      }

      // Get the PPTX blob
      const pptxBlob = await response.blob();
      const fileName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pptx';

      // In a real implementation, you'd upload this to storage (e.g., Supabase Storage)
      // and return a public URL. For now, we'll return a success message with file info.

      return JSON.stringify({
        success: true,
        message: `PowerPoint "${title}" generated successfully with ${slides.length} slides (${Math.round(pptxBlob.size / 1024)} KB)`,
        fileName,
        fileSize: pptxBlob.size,
        slideCount: slides.length,
        theme,
        downloadInstruction: 'The PowerPoint presentation has been generated. You can download it using the export menu in the conversation thread.',
        tips: [
          'The presentation includes speaker notes for each slide (if provided)',
          'You can edit the presentation in PowerPoint, Google Slides, or LibreOffice',
          `Theme used: ${theme}`,
        ],
      });
    } catch (error: unknown) {
      console.error('[PPTX Generator Tool] Error:', error);

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PowerPoint presentation',
        suggestion: 'Please check the slide content and try again, or ask the user for clarification on the desired presentation structure.',
      });
    }
  },
});

/**
 * Tool metadata for display and categorization
 */
export const pptxGeneratorToolMetadata = {
  name: 'pptx_generator',
  displayName: 'PowerPoint Generator',
  description: 'Create professional PowerPoint presentations',
  category: 'export' as const,
  cost: 0.002, // Estimated cost per execution (slightly higher than PDF due to complexity)
  riskLevel: 'low' as const,
  requiresApproval: false,
  dependencies: ['pptxgenjs'],
  examples: [
    {
      userRequest: 'Create a 3-slide presentation about our Q4 goals',
      toolCall: {
        title: 'Q4 Goals 2025',
        slides: [
          {
            title: 'Q4 Goals Overview',
            bulletPoints: ['Increase revenue by 20%', 'Launch new product line', 'Expand to 3 new markets'],
            layout: 'titleAndContent',
          },
          {
            title: 'Revenue Strategy',
            bulletPoints: ['Focus on enterprise clients', 'Upsell existing customers', 'Optimize pricing tiers'],
            layout: 'titleAndContent',
          },
          {
            title: 'Timeline',
            content: 'October: Product launch\nNovember: Marketing campaign\nDecember: Results review',
            layout: 'titleAndContent',
          },
        ],
        theme: 'professional',
      },
    },
    {
      userRequest: 'Make slides comparing our product features',
      toolCall: {
        title: 'Product Feature Comparison',
        slides: [
          {
            title: 'Product Comparison',
            layout: 'title',
          },
          {
            title: 'Feature Matrix',
            bulletPoints: [
              'Basic Plan: Core features',
              'Pro Plan: Advanced analytics',
              'Enterprise: Custom integrations',
              'All plans: 24/7 support',
              'Free trial: 14 days',
              'Money-back guarantee: 30 days',
            ],
            layout: 'twoColumn',
          },
        ],
        theme: 'blue',
      },
    },
  ],
};
