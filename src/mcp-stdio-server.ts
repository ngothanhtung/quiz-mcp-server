import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createQuizMcpServer } from './quiz-mcp-server.js';

async function main(): Promise<void> {
  const server = createQuizMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('MCP Quiz STDIO Server running');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Fatal error in MCP Quiz STDIO Server:', message);
  process.exit(1);
});
