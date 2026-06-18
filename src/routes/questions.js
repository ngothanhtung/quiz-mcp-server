const express = require('express');
const router = express.Router();
const questions = require('../data/questions.json');

// Helper: ẩn đáp án
function hideAnswer(question) {
  const { correctAnswer, explanation, ...rest } = question;
  return rest;
}

// GET /api/questions - Lấy tất cả câu hỏi (ẩn đáp án)
router.get('/', (req, res) => {
  const { category } = req.query;
  let result = questions;

  if (category) {
    result = questions.filter(
      q => q.category.toLowerCase() === category.toLowerCase()
    );
  }

  res.json({
    total: result.length,
    questions: result.map(hideAnswer)
  });
});

// GET /api/questions/random - Lấy 1 câu hỏi ngẫu nhiên
router.get('/random', (req, res) => {
  const { category } = req.query;
  let pool = questions;

  if (category) {
    pool = questions.filter(
      q => q.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (pool.length === 0) {
    return res.status(404).json({ error: 'Không tìm thấy câu hỏi trong danh mục này' });
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  res.json(hideAnswer(pool[randomIndex]));
});

// GET /api/questions/category/:category - Lấy câu hỏi theo danh mục
router.get('/category/:category', (req, res) => {
  const { category } = req.params;
  const { limit } = req.query;

  let result = questions.filter(
    q => q.category.toLowerCase() === category.toLowerCase()
  );

  if (result.length === 0) {
    const availableCategories = [...new Set(questions.map(q => q.category))];
    return res.status(404).json({
      error: `Không tìm thấy danh mục '${category}'`,
      availableCategories
    });
  }

  if (limit) {
    const limitNum = parseInt(limit, 10);
    result = result.slice(0, limitNum);
  }

  res.json({
    category,
    total: result.length,
    questions: result.map(hideAnswer)
  });
});

// GET /api/questions/categories - Liệt kê tất cả danh mục
router.get('/categories', (req, res) => {
  const categoryCount = {};
  questions.forEach(q => {
    categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
  });
  res.json({ categories: categoryCount });
});

// GET /api/questions/:id - Lấy câu hỏi theo ID
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const question = questions.find(q => q.id === id);

  if (!question) {
    return res.status(404).json({
      error: `Không tìm thấy câu hỏi với id = ${id}`,
      validRange: `1 - ${questions.length}`
    });
  }

  res.json(hideAnswer(question));
});

// POST /api/questions/:id/check - Kiểm tra đáp án
router.post('/:id/check', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const question = questions.find(q => q.id === id);

  if (!question) {
    return res.status(404).json({
      error: `Không tìm thấy câu hỏi với id = ${id}`,
      validRange: `1 - ${questions.length}`
    });
  }

  const { answer } = req.body;

  if (!answer || !['A', 'B', 'C', 'D'].includes(answer.toUpperCase())) {
    return res.status(400).json({
      error: 'Đáp án không hợp lệ. Vui lòng gửi { "answer": "A" }, "B", "C", hoặc "D"'
    });
  }

  const isCorrect = answer.toUpperCase() === question.correctAnswer;

  res.json({
    id: question.id,
    question: question.question,
    yourAnswer: answer.toUpperCase(),
    correctAnswer: question.correctAnswer,
    isCorrect,
    explanation: question.explanation
  });
});

module.exports = router;
