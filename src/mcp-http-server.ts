import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createQuizMcpServer } from './quiz-mcp-server.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const transports = new Map<string, StreamableHTTPServerTransport>();

function log(tag: string, message: string): void {
  const time = new Date().toLocaleTimeString('vi-VN');
  console.log(`[${time}] ${tag} ${message}`);
}

function getSessionId(req: Request): string | undefined {
  const sessionId = req.headers['mcp-session-id'];
  return Array.isArray(sessionId) ? sessionId[0] : sessionId;
}

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const sessionId = getSessionId(req);
  log('HTTP', `${req.method} /mcp (session: ${sessionId ?? 'new'})`);

  try {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId);
      await transport?.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId) {
      const server = createQuizMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports.set(newSessionId, transport);
          log('SESSION', `New session: ${newSessionId}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
          log('SESSION', `Closed session: ${transport.sessionId}`);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid session ID' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('ERROR', message);

    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' } });
    }
  }
}

app.use(cors());
app.use(express.json());

app.post('/mcp', handleMcpRequest);
app.get('/mcp', handleMcpRequest);

app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  log('HTTP', `DELETE /mcp (session: ${sessionId ?? 'missing'})`);

  try {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId);
      await transport?.handleRequest(req, res, req.body);
      transports.delete(sessionId);
      log('SESSION', `Deleted session: ${sessionId}`);
      return;
    }

    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid or missing session ID' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('ERROR', message);

    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' } });
    }
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'MCP Quiz Server',
    version: '1.0.0',
    status: 'running',
    activeSessions: transports.size,
    mcpEndpoint: `http://localhost:${port}/mcp`,
    tools: ['get_questions', 'get_random_question', 'get_question_by_id', 'check_answer', 'list_categories'],
  });
});

app.listen(port, () => {
  console.log(`MCP Quiz HTTP Server running at http://localhost:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  console.log('Tools: get_questions, get_random_question, get_question_by_id, check_answer, list_categories');
});
