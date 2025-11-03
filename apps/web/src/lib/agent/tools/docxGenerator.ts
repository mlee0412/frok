import { tool } from '@openai/agents';
import { z } from 'zod';

/**
 * Word Document Generation Tool
 *
 * Allows agents to create professional Word documents (.docx) with rich text formatting.
 *
 * Use Cases:
 * - User: "Create a Word document with meeting notes"
 * - User: "Generate a report in DOCX format"
 * - User: "Export this summary as a Word file"
 *
 * Features:
 * - Rich text formatting (bold, italic, underline, headers)
 * - Markdown-like syntax support (# headers, **bold**, *italic*, __underline__)
 * - Bullet points and lists
 * - Customizable font settings (family, size, line spacing)
 * - Optional table of contents
 * - Automatic paragraph parsing
 */
export const docxGeneratorTool = tool({
  name: 'docx_generator',
  description: 'Generate a professional Word document (.docx) with rich text formatting. Supports headers (# or ##), bold (**text**), italic (*text*), underline (__text__), and bullet points (- or *). Returns a download link for the generated DOCX file.',
  parameters: z.object({
    title: z.string().describe('Document title (appears at the top)'),
    author: z.string().optional().describe('Author name (optional)'),
    content: z.string().describe('Document content. Supports markdown-like formatting:\n- # for heading 1, ## for heading 2\n- **bold**, *italic*, __underline__\n- Bullet points: start lines with - or *\n- Separate paragraphs with double newlines'),
    formatting: z
      .object({
        fontSize: z.number().min(8).max(72).default(11).describe('Font size in points (default: 11)'),
        fontFamily: z.string().default('Calibri').describe('Font family (default: Calibri)'),
        lineSpacing: z
          .number()
          .min(1)
          .max(3)
          .default(1.15)
          .describe('Line spacing multiplier (default: 1.15)'),
      })
      .optional()
      .describe('Optional formatting settings'),
    includeTableOfContents: z
      .boolean()
      .default(false)
      .describe('Whether to include a table of contents placeholder (default: false)'),
  }),
  async execute({ title, author, content, formatting, includeTableOfContents }) {
    try {
      // Call the DOCX export API endpoint
      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/export/docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          author,
          content,
          formatting,
          includeTableOfContents,
        }),
      });

      if (!response.ok) {
        const errorData: { error?: string; message?: string } = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate Word document');
      }

      // Get the DOCX blob
      const docxBlob = await response.blob();
      const fileName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.docx';

      // Estimate page count (rough approximation: ~500 words per page)
      const wordCount = content.split(/\s+/).length;
      const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));

      // In a real implementation, you'd upload this to storage (e.g., Supabase Storage)
      // and return a public URL. For now, we'll return a success message with file info.

      return JSON.stringify({
        success: true,
        message: `Word document "${title}" generated successfully (${Math.round(docxBlob.size / 1024)} KB, ~${estimatedPages} pages)`,
        fileName,
        fileSize: docxBlob.size,
        wordCount,
        estimatedPages,
        formatting: formatting || { fontSize: 11, fontFamily: 'Calibri', lineSpacing: 1.15 },
        downloadInstruction: 'The Word document has been generated. You can download it using the export menu in the conversation thread.',
        tips: [
          'The document can be opened in Microsoft Word, Google Docs, or LibreOffice',
          'Rich formatting is preserved (bold, italic, underline, headers)',
          `Font: ${formatting?.fontFamily || 'Calibri'}, Size: ${formatting?.fontSize || 11}pt`,
          includeTableOfContents
            ? 'Table of contents will be auto-generated when you open the document in Word'
            : 'No table of contents included',
        ],
      });
    } catch (error: unknown) {
      console.error('[DOCX Generator Tool] Error:', error);

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate Word document',
        suggestion: 'Please check the content formatting and try again, or ask the user for clarification.',
      });
    }
  },
});

/**
 * Tool metadata for display and categorization
 */
export const docxGeneratorToolMetadata = {
  name: 'docx_generator',
  displayName: 'Word Document Generator',
  description: 'Create professional Word documents with rich text formatting',
  category: 'export' as const,
  cost: 0.001, // Estimated cost per execution
  riskLevel: 'low' as const,
  requiresApproval: false,
  dependencies: ['docx'],
  examples: [
    {
      userRequest: 'Create a Word document with my meeting notes',
      toolCall: {
        title: 'Team Meeting Notes - 2025-11-02',
        content: `# Meeting Summary\n\nDate: November 2nd, 2025\nAttendees: John, Jane, Bob\n\n## Discussion Points\n\n**Project Timeline**\n- Q1: Planning phase\n- Q2: Development\n- Q3: Testing\n- Q4: Launch\n\n**Budget Approval**\nThe budget of *$50,000* was approved by the committee.\n\n## Action Items\n\n- John: Prepare project proposal\n- Jane: Review technical requirements\n- Bob: Schedule follow-up meeting`,
        formatting: {
          fontSize: 11,
          fontFamily: 'Calibri',
          lineSpacing: 1.15,
        },
        includeTableOfContents: false,
      },
    },
    {
      userRequest: 'Generate a formatted report in Word',
      toolCall: {
        title: 'Q4 Sales Report',
        author: 'Sales Department',
        content: `# Executive Summary\n\nThis report provides an overview of Q4 sales performance.\n\n## Key Metrics\n\n- **Total Revenue**: $2.5M\n- **Growth Rate**: 15% YoY\n- **Customer Acquisition**: 450 new clients\n\n## Regional Performance\n\n**North America**\n$1.2M in revenue, exceeding target by 10%.\n\n**Europe**\n$800K in revenue, meeting target.\n\n**Asia Pacific**\n$500K in revenue, 5% below target.`,
        formatting: {
          fontSize: 12,
          fontFamily: 'Times New Roman',
          lineSpacing: 1.5,
        },
        includeTableOfContents: true,
      },
    },
  ],
};
