type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolsUsed?: string[];
  executionTime?: number;
};

type Thread = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

export function exportToMarkdown(thread: Thread): string {
  const date = new Date(thread.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let markdown = `# ${thread.title}\n\n`;
  markdown += `**Date**: ${date}  \n`;
  markdown += `**Messages**: ${thread.messages.length}  \n`;
  markdown += `**Thread ID**: \`${thread.id}\`\n\n`;
  markdown += `---\n\n`;

  thread.messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
    markdown += `## ${role}\n`;
    markdown += `*${msgDate}*\n\n`;
    markdown += `${msg.content}\n\n`;

    // Add metadata if present
    if (msg.role === 'assistant') {
      if (msg.toolsUsed && msg.toolsUsed.length > 0) {
        markdown += `> 🔧 **Tools used**: ${msg.toolsUsed.join(', ')}\n`;
      }
      if (msg.executionTime) {
        markdown += `> ⏱️ **Execution time**: ${(msg.executionTime / 1000).toFixed(2)}s\n`;
      }
      if (msg.toolsUsed || msg.executionTime) {
        markdown += `\n`;
      }
    }

    markdown += `---\n\n`;
  });

  markdown += `\n*Exported from FROK Agent*\n`;

  return markdown;
}

export function downloadMarkdown(thread: Thread) {
  const markdown = exportToMarkdown(thread);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${thread.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(thread: Thread): Promise<void> {
  const markdown = exportToMarkdown(thread);
  return navigator.clipboard.writeText(markdown);
}
