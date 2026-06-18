import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { categories, hideAnswer, type Answer, type Category, type QuizQuestion } from './types.js';

const require = createRequire(import.meta.url);
const questions = require('./data/questions.json') as QuizQuestion[];

function log(tag: string, message: string): void {
  const time = new Date().toLocaleTimeString('vi-VN');
  console.error(`[${time}] ${tag} ${message}`);
}

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function textContent(text: string, isError = false) {
  return {
    content: [{ type: 'text' as const, text }],
    isError,
  };
}

export function createQuizMcpServer(): McpServer {
  const server = new McpServer({
    name: 'quiz-mcp-server',
    version: '1.0.0',
  });

  server.registerTool(
    'get_questions',
    {
      description: 'Lay danh sach cau hoi trac nghiem. Co the loc theo category.',
      inputSchema: {
        category: z.enum(categories).optional().describe('Loc theo danh muc'),
        limit: z.number().int().min(1).max(100).optional().describe('Gioi han so cau'),
      },
    },
    async ({ category, limit }) => {
      log('TOOL', `get_questions (category=${category ?? 'all'}, limit=${limit ?? 'none'})`);
      let result = questions;

      if (category) {
        result = result.filter((question) => question.category.toLowerCase() === category.toLowerCase());
      }

      if (limit) {
        result = result.slice(0, limit);
      }

      return textContent(
        jsonText({
          total: result.length,
          category: category ?? 'Tat ca',
          questions: result.map(hideAnswer),
        }),
      );
    },
  );

  server.registerTool(
    'get_random_question',
    {
      description: 'Lay 1 cau hoi trac nghiem ngau nhien.',
      inputSchema: {
        category: z.enum(categories).optional().describe('Loc theo danh muc'),
      },
    },
    async ({ category }) => {
      log('TOOL', `get_random_question (category=${category ?? 'all'})`);
      const pool = category
        ? questions.filter((question) => question.category.toLowerCase() === category.toLowerCase())
        : questions;

      if (pool.length === 0) {
        return textContent('Khong tim thay cau hoi.', true);
      }

      const question = pool[Math.floor(Math.random() * pool.length)];
      return textContent(jsonText(hideAnswer(question)));
    },
  );

  server.registerTool(
    'get_question_by_id',
    {
      description: 'Lay cau hoi theo ID.',
      inputSchema: {
        id: z.number().int().min(1).max(questions.length).describe('ID cau hoi'),
      },
    },
    async ({ id }) => {
      log('TOOL', `get_question_by_id (id=${id})`);
      const question = questions.find((item) => item.id === id);

      if (!question) {
        return textContent(`Khong tim thay cau hoi id=${id}. ID hop le: 1-${questions.length}`, true);
      }

      return textContent(jsonText(hideAnswer(question)));
    },
  );

  server.registerTool(
    'check_answer',
    {
      description: 'Kiem tra dap an cau hoi trac nghiem.',
      inputSchema: {
        id: z.number().int().min(1).max(questions.length).describe('ID cau hoi'),
        answer: z.enum(['A', 'B', 'C', 'D']).describe('Dap an can kiem tra'),
      },
    },
    async ({ id, answer }) => {
      log('TOOL', `check_answer (id=${id}, answer=${answer})`);
      const question = questions.find((item) => item.id === id);

      if (!question) {
        return textContent(`Khong tim thay cau hoi id=${id}`, true);
      }

      const normalizedAnswer = answer as Answer;
      return textContent(
        jsonText({
          id: question.id,
          question: question.question,
          yourAnswer: normalizedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect: normalizedAnswer === question.correctAnswer,
          explanation: question.explanation,
        }),
      );
    },
  );

  server.registerTool(
    'list_categories',
    {
      description: 'Liet ke tat ca danh muc cau hoi va so luong.',
      inputSchema: {},
    },
    async () => {
      log('TOOL', 'list_categories');
      const categoryCount = questions.reduce<Record<string, number>>((counts, question) => {
        counts[question.category] = (counts[question.category] ?? 0) + 1;
        return counts;
      }, {});

      return textContent(jsonText({ total: questions.length, categories: categoryCount }));
    },
  );

  server.registerResource(
    'quiz-data',
    'quiz://questions',
    {
      mimeType: 'application/json',
      description: '100 cau hoi trac nghiem IT',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: jsonText(questions),
        },
      ],
    }),
  );

  server.registerPrompt(
    'start_quiz',
    {
      description: 'Bat dau bai quiz trac nghiem IT',
      argsSchema: {
        num_questions: z.number().int().min(1).max(10).default(5).describe('So cau hoi'),
        category: z.enum(categories).optional().describe('Loc danh muc'),
      },
    },
    async ({ num_questions, category }) => {
      const pool = category ? questions.filter((question) => question.category === category) : questions;
      const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, num_questions);
      const text = selected
        .map(
          (question, index) =>
            [
              `Cau ${index + 1} (ID: ${question.id}) [${question.category}]`,
              question.question,
              `A. ${question.options.A}`,
              `B. ${question.options.B}`,
              `C. ${question.options.C}`,
              `D. ${question.options.D}`,
            ].join('\n'),
        )
        .join('\n\n---\n\n');

      return {
        description: `Quiz ${num_questions} cau${category ? ` - ${category as Category}` : ''}`,
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Bai Quiz IT\n\n${text}\n\n---\n\nDung tool check_answer de kiem tra. ID: ${selected
                .map((question) => question.id)
                .join(', ')}`,
            },
          },
        ],
      };
    },
  );

  return server;
}
