import { Router, type Request, type Response } from 'express';
import { createRequire } from 'node:module';
import { hideAnswer, type Answer, type QuizQuestion } from '../types.js';

const router = Router();
const require = createRequire(import.meta.url);
const questions = require('../data/questions.json') as QuizQuestion[];

function getQueryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function findByCategory(category: string): QuizQuestion[] {
  return questions.filter((question) => question.category.toLowerCase() === category.toLowerCase());
}

router.get('/', (req: Request, res: Response) => {
  const category = getQueryString(req.query.category);
  const result = category ? findByCategory(category) : questions;

  res.json({
    total: result.length,
    questions: result.map(hideAnswer),
  });
});

router.get('/random', (req: Request, res: Response) => {
  const category = getQueryString(req.query.category);
  const pool = category ? findByCategory(category) : questions;

  if (pool.length === 0) {
    return res.status(404).json({ error: 'Khong tim thay cau hoi trong danh muc nay' });
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return res.json(hideAnswer(pool[randomIndex]));
});

router.get('/category/:category', (req: Request, res: Response) => {
  const category = String(req.params.category);
  const limit = getQueryString(req.query.limit);
  let result = findByCategory(category);

  if (result.length === 0) {
    const availableCategories = [...new Set(questions.map((question) => question.category))];
    return res.status(404).json({
      error: `Khong tim thay danh muc '${category}'`,
      availableCategories,
    });
  }

  if (limit) {
    const limitNum = Number.parseInt(limit, 10);
    if (Number.isFinite(limitNum)) {
      result = result.slice(0, limitNum);
    }
  }

  return res.json({
    category,
    total: result.length,
    questions: result.map(hideAnswer),
  });
});

router.get('/categories', (_req: Request, res: Response) => {
  const categoryCount = questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.category] = (counts[question.category] ?? 0) + 1;
    return counts;
  }, {});

  res.json({ categories: categoryCount });
});

router.get('/:id', (req: Request, res: Response) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const question = questions.find((item) => item.id === id);

  if (!question) {
    return res.status(404).json({
      error: `Khong tim thay cau hoi voi id = ${id}`,
      validRange: `1 - ${questions.length}`,
    });
  }

  return res.json(hideAnswer(question));
});

router.post('/:id/check', (req: Request, res: Response) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const question = questions.find((item) => item.id === id);

  if (!question) {
    return res.status(404).json({
      error: `Khong tim thay cau hoi voi id = ${id}`,
      validRange: `1 - ${questions.length}`,
    });
  }

  const answer = typeof req.body?.answer === 'string' ? req.body.answer.toUpperCase() : undefined;

  if (!answer || !['A', 'B', 'C', 'D'].includes(answer)) {
    return res.status(400).json({
      error: 'Dap an khong hop le. Vui long gui { "answer": "A" }, "B", "C", hoac "D"',
    });
  }

  const normalizedAnswer = answer as Answer;
  const isCorrect = normalizedAnswer === question.correctAnswer;

  return res.json({
    id: question.id,
    question: question.question,
    yourAnswer: normalizedAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect,
    explanation: question.explanation,
  });
});

export default router;
