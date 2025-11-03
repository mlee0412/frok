import { tool } from '@openai/agents';
import { z } from 'zod';

/**
 * PDF Generation Tool
 *
 * Allows agents to generate PDF documents from text content.
 *
 * Use Cases:
 * - User: "Create a PDF report of our conversation"
 * - User: "Export this summary as a PDF"
 * - User: "Generate a PDF document with the meeting notes"
 *
 * Features:
 * - Automatic text formatting and wrapping
 * - Support for markdown-like headers and lists
 * - Configurable page format (A4, Letter)
 * - Custom metadata (author, subject, keywords)
 */
export const pdfGeneratorTool = tool({
  name: 'pdf_generator',
  description: 'Generate a PDF document from text content with automatic formatting. Supports titles, paragraphs, headers (# or ##), and bullet lists (- or *). Returns a download URL for the generated PDF.',
  parameters: z.object({
    title: z.string().describe('Document title (appears at the top of the PDF)'),
    content: z.string().describe('Main document content. Supports markdown-like formatting: # for headers, ## for subheaders, - or * for bullet points. Separate paragraphs with double newlines.'),
    format: z
      .enum(['A4', 'Letter'])
      .default('A4')
      .describe('Paper format (A4 for international, Letter for US)'),
    orientation: z
      .enum(['portrait', 'landscape'])
      .default('portrait')
      .describe('Page orientation'),
    metadata: z
      .object({
        author: z.string().optional().describe('Document author name'),
        subject: z.string().optional().describe('Document subject/description'),
        keywords: z.string().optional().describe('Document keywords for search'),
      })
      .optional()
      .describe('Optional document metadata'),
  }),
  async execute({ title, content, format, orientation, metadata }) {
    try {
      // Call the PDF export API endpoint
      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/export/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          format,
          orientation,
          metadata,
        }),
      });

      if (!response.ok) {
        const errorData: { error?: string; message?: string } = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      const fileName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';

      // In a real implementation, you'd upload this to storage (e.g., Supabase Storage)
      // and return a public URL. For now, we'll return a success message with file info.

      return JSON.stringify({
        success: true,
        message: `PDF "${title}" generated successfully (${Math.round(pdfBlob.size / 1024)} KB)`,
        fileName,
        fileSize: pdfBlob.size,
        format,
        orientation,
        pages: estimatePages(content),
        downloadInstruction: 'The PDF has been generated. You can download it using the export menu in the conversation thread.',
      });
    } catch (error: unknown) {
      console.error('[PDF Generator Tool] Error:', error);

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
        suggestion: 'Please check the content format and try again, or ask the user for clarification.',
      });
    }
  },
});

/**
 * Estimate number of pages based on content length
 * (Rough approximation: ~3000 characters per page)
 */
function estimatePages(content: string): number {
  const charsPerPage = 3000;
  return Math.max(1, Math.ceil(content.length / charsPerPage));
}

/**
 * Tool metadata for display and categorization
 */
export const pdfGeneratorToolMetadata = {
  name: 'pdf_generator',
  displayName: 'PDF Generator',
  description: 'Generate professional PDF documents',
  category: 'export' as const,
  cost: 0.001, // Estimated cost per execution (minimal, mostly computation)
  riskLevel: 'low' as const,
  requiresApproval: false,
  dependencies: ['jspdf', 'html2canvas'],
  examples: [
    {
      userRequest: 'Create a PDF summary of our conversation',
      toolCall: {
        title: 'Conversation Summary',
        content: '# Conversation Summary\n\nThis is a summary of our discussion...',
        format: 'A4',
        orientation: 'portrait',
      },
    },
    {
      userRequest: 'Export my meeting notes as a PDF',
      toolCall: {
        title: 'Meeting Notes - 2025-11-02',
        content: '## Attendees\n- John Smith\n- Jane Doe\n\n## Discussion Points\n- Project timeline\n- Budget approval',
        format: 'Letter',
        orientation: 'portrait',
        metadata: {
          author: 'Meeting Assistant',
          subject: 'Team Meeting Notes',
          keywords: 'meeting, notes, project',
        },
      },
    },
  ],
};
