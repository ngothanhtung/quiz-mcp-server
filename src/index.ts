import cors from 'cors';
import express, { type Request, type Response } from 'express';
import questionsRouter from './routes/questions.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.use('/api/questions', questionsRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'MCP Quiz Server - 100 cau trac nghiem lap trinh/IT',
    endpoints: {
      'GET /api/questions': 'Lay tat ca cau hoi',
      'GET /api/questions/random': 'Lay 1 cau hoi ngau nhien',
      'GET /api/questions/category/:category': 'Lay cau hoi theo danh muc',
      'GET /api/questions/:id': 'Lay cau hoi theo ID',
      'POST /api/questions/:id/check': 'Kiem tra dap an',
    },
  });
});

app.listen(port, () => {
  console.log(`MCP Quiz REST Server running at http://localhost:${port}`);
  console.log('API Docs:');
  console.log(`  GET  http://localhost:${port}/api/questions`);
  console.log(`  GET  http://localhost:${port}/api/questions/random`);
  console.log(`  GET  http://localhost:${port}/api/questions/category/JavaScript`);
  console.log(`  GET  http://localhost:${port}/api/questions/1`);
  console.log(`  POST http://localhost:${port}/api/questions/1/check`);
});
