const express = require('express');
const cors = require('cors');
const questionsRouter = require('./routes/questions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/questions', questionsRouter);

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'MCP Quiz Server - 100 Câu Trắc Nghiệm Lập trình/IT',
    endpoints: {
      'GET /api/questions': 'Lấy tất cả câu hỏi',
      'GET /api/questions/random': 'Lấy 1 câu hỏi ngẫu nhiên',
      'GET /api/questions/category/:category': 'Lấy câu hỏi theo danh mục',
      'GET /api/questions/:id': 'Lấy câu hỏi theo ID',
      'POST /api/questions/:id/check': 'Kiểm tra đáp án'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MCP Quiz Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📚 Có 100 câu hỏi trắc nghiệm IT/Programming`);
  console.log(`─────────────────────────────────────`);
  console.log(`📖 API Docs:`);
  console.log(`   GET  http://localhost:${PORT}/api/questions`);
  console.log(`   GET  http://localhost:${PORT}/api/questions/random`);
  console.log(`   GET  http://localhost:${PORT}/api/questions/category/JavaScript`);
  console.log(`   GET  http://localhost:${PORT}/api/questions/1`);
  console.log(`   POST http://localhost:${PORT}/api/questions/1/check`);
});
