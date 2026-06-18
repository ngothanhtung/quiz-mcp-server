const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');
const express = require('express');
const cors = require('cors');
const questions = require('./data/questions.json');
const { randomUUID } = require('crypto');

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function hideAnswer(q) {
  const { correctAnswer, explanation, ...rest } = q;
  return rest;
}

function log(icon, msg) {
  const t = new Date().toLocaleTimeString('vi-VN');
  console.log(`[${t}] ${icon} ${msg}`);
}

// ══════════════════════════════════════════════════════════════
// FACTORY — tạo McpServer mới cho mỗi session
// ══════════════════════════════════════════════════════════════
function createServer() {
  const server = new McpServer({
    name: 'quiz-mcp-server',
    version: '1.0.0',
  });

  // ── Tools ──────────────────────────────────────────────────

  server.tool(
    'get_questions',
    'Lấy danh sách câu hỏi trắc nghiệm. Có thể lọc theo category.',
    {
      category: z.enum(['JavaScript', 'Python', 'HTML/CSS', 'SQL', 'Networking', 'OOP', 'General IT']).optional().describe('Lọc theo danh mục'),
      limit: z.number().min(1).max(100).optional().describe('Giới hạn số câu'),
    },
    async ({ category, limit }) => {
      log('🔧', `TOOL: get_questions (category=${category || 'all'}, limit=${limit || 'none'})`);
      let result = questions;
      if (category) result = result.filter((q) => q.category.toLowerCase() === category.toLowerCase());
      if (limit) result = result.slice(0, limit);
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: result.length, category: category || 'Tất cả', questions: result.map(hideAnswer) }, null, 2) }],
      };
    },
  );

  server.tool(
    'get_random_question',
    'Lấy 1 câu hỏi trắc nghiệm ngẫu nhiên.',
    {
      category: z.enum(['JavaScript', 'Python', 'HTML/CSS', 'SQL', 'Networking', 'OOP', 'General IT']).optional().describe('Lọc theo danh mục'),
    },
    async ({ category }) => {
      log('🔧', `TOOL: get_random_question (category=${category || 'all'})`);
      let pool = questions;
      if (category) pool = questions.filter((q) => q.category.toLowerCase() === category.toLowerCase());
      if (pool.length === 0) return { content: [{ type: 'text', text: 'Không tìm thấy câu hỏi.' }], isError: true };
      const q = pool[Math.floor(Math.random() * pool.length)];
      return { content: [{ type: 'text', text: JSON.stringify(hideAnswer(q), null, 2) }] };
    },
  );

  server.tool('get_question_by_id', 'Lấy câu hỏi theo ID (1-100).', { id: z.number().min(1).max(100).describe('ID câu hỏi') }, async ({ id }) => {
    log('🔧', `TOOL: get_question_by_id (id=${id})`);
    const q = questions.find((x) => x.id === id);
    if (!q) return { content: [{ type: 'text', text: `Không tìm thấy câu hỏi id=${id}. ID hợp lệ: 1-100` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify(hideAnswer(q), null, 2) }] };
  });

  server.tool(
    'check_answer',
    'Kiểm tra đáp án câu hỏi trắc nghiệm.',
    {
      id: z.number().min(1).max(100).describe('ID câu hỏi'),
      answer: z.enum(['A', 'B', 'C', 'D']).describe('Đáp án cần kiểm tra'),
    },
    async ({ id, answer }) => {
      log('🔧', `TOOL: check_answer (id=${id}, answer=${answer})`);
      const q = questions.find((x) => x.id === id);
      if (!q) return { content: [{ type: 'text', text: `Không tìm thấy câu hỏi id=${id}` }], isError: true };
      const isCorrect = answer === q.correctAnswer;
      return {
        content: [{ type: 'text', text: JSON.stringify({ id: q.id, question: q.question, yourAnswer: answer, correctAnswer: q.correctAnswer, isCorrect, explanation: q.explanation }, null, 2) }],
      };
    },
  );

  server.tool('list_categories', 'Liệt kê tất cả danh mục câu hỏi và số lượng.', {}, async () => {
    log('🔧', `TOOL: list_categories`);
    const cats = {};
    questions.forEach((q) => {
      cats[q.category] = (cats[q.category] || 0) + 1;
    });
    return { content: [{ type: 'text', text: JSON.stringify({ total: questions.length, categories: cats }, null, 2) }] };
  });

  // ── Resource ───────────────────────────────────────────────

  server.resource('quiz-data', 'quiz://questions', { mimeType: 'application/json', description: '100 câu hỏi trắc nghiệm IT' }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(questions, null, 2) }] }));

  // ── Prompt ─────────────────────────────────────────────────

  server.prompt(
    'start_quiz',
    'Bắt đầu bài quiz trắc nghiệm IT',
    {
      num_questions: z.number().min(1).max(10).default(5).describe('Số câu hỏi'),
      category: z.enum(['JavaScript', 'Python', 'HTML/CSS', 'SQL', 'Networking', 'OOP', 'General IT']).optional().describe('Lọc danh mục'),
    },
    async ({ num_questions, category }) => {
      let pool = category ? questions.filter((q) => q.category === category) : questions;
      const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, num_questions);
      const text = selected.map((q, i) => `**Câu ${i + 1} (ID: ${q.id})** [${q.category}]\n${q.question}\nA. ${q.options.A}\nB. ${q.options.B}\nC. ${q.options.C}\nD. ${q.options.D}`).join('\n\n---\n\n');
      return {
        descriptions: [`Quiz ${num_questions} câu${category ? ` - ${category}` : ''}`],
        messages: [{ role: 'user', content: { type: 'text', text: `📝 **Bài Quiz IT**\n\n${text}\n\n---\n\nDùng \`check_answer\` để kiểm tra. ID: ${selected.map((q) => q.id).join(', ')}` } }],
      };
    },
  );

  return server;
}

// ══════════════════════════════════════════════════════════════
// EXPRESS APP + HTTP TRANSPORT
// ══════════════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Session store — key = sessionId, value = StreamableHTTPServerTransport
const transports = new Map();

/**
 * Create a transport bound to a new server instance.
 * Resolves with { transport, sessionId } after initialize completes.
 */
function createSessionTransport() {
  return new Promise((resolve) => {
    const server = createServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports.set(sessionId, transport);
        log('🆕', `New session: ${sessionId}`);
        resolve({ transport, sessionId });
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
        log('🗑️', `Session closed: ${transport.sessionId}`);
      }
    };

    server.connect(transport);

    // Return transport immediately; resolve fires after initialize
    resolve({ transport, sessionId: null });
  });
}

// MCP endpoint — POST (JSON-RPC)
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  log('📨', `POST /mcp (session: ${sessionId || 'new'})`);

  try {
    // Existing session → reuse transport
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId);
      // Pass req.body as parsedBody — express.json() already consumed the stream
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // New session → create transport + server
    if (!sessionId) {
      const server = createServer();

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
          log('🆕', `New session: ${sid}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
          log('🗑️', `Session closed: ${transport.sessionId}`);
        }
      };

      await server.connect(transport);
      // Pass req.body as parsedBody — express.json() already consumed the stream
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Invalid session
    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid session ID' } });
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' } });
  }
});

// MCP endpoint — GET (SSE / streamable notifications)
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  log('📨', `GET /mcp (session: ${sessionId || 'new'})`);

  try {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId) {
      const server = createServer();

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
          log('🆕', `New session: ${sid}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
          log('🗑️', `Session closed: ${transport.sessionId}`);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid session ID' } });
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' } });
  }
});

// MCP endpoint — DELETE (close session)
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  log('📨', `DELETE /mcp (session: ${sessionId})`);

  try {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId);
      await transport.handleRequest(req, res, req.body);
      transports.delete(sessionId);
      log('🗑️', `Session deleted: ${sessionId}`);
      return;
    }

    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid or missing session ID' } });
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' } });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Quiz Server',
    version: '1.0.0',
    status: 'running',
    activeSessions: transports.size,
    mcpEndpoint: `http://localhost:${PORT}/mcp`,
    tools: ['get_questions', 'get_random_question', 'get_question_by_id', 'check_answer', 'list_categories'],
  });
});

// Start
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         🚀 MCP Quiz Server - HTTP Mode               ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Server:    http://localhost:${PORT}                  ║`);
  console.log(`║  📡 MCP:       http://localhost:${PORT}/mcp              ║`);
  console.log('║  📚 Tools:     5 tools available                     ║');
  console.log('║  📋 Questions: 100 câu hỏi IT/Programming            ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  Claude Desktop config:                              ║');
  console.log(`║  "url": "http://localhost:${PORT}/mcp"                  ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
});
