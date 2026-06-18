# MCP Quiz Server - 100 Câu Trắc Nghiệm IT

MCP Server với 100 câu hỏi trắc nghiệm lập trình/IT — chạy 2 chế độ: **REST API** (Express) và **MCP Protocol** (dùng với Claude Desktop).

## Cài đặt

```bash
npm install
```

## Chế độ 1: REST API (Express)

```bash
npm start
# Server chạy tại http://localhost:3000
```

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/questions` | Tất cả câu hỏi (ẩn đáp án) |
| GET | `/api/questions/random?category=JavaScript` | 1 câu ngẫu nhiên |
| GET | `/api/questions/categories` | Danh mục + số lượng |
| GET | `/api/questions/category/:cat?limit=5` | Câu hỏi theo danh mục |
| GET | `/api/questions/:id` | Câu hỏi theo ID |
| POST | `/api/questions/:id/check` | Kiểm tra đáp án `{ "answer": "C" }` |

---

## Chế độ 2: MCP Server (Claude Desktop)

### Cách tích hợp với Claude Desktop

**Bước 1:** Mở file config của Claude Desktop:

```
C:\Users\Tony\AppData\Roaming\Claude\claude_desktop_config.json
```

> Nếu file chưa có, tạo mới với nội dung `{}`.

**Bước 2:** Thêm cấu hình MCP server:

```json
{
  "mcpServers": {
    "quiz-it": {
      "command": "node",
      "args": ["D:\\Working\\GitHub\\MCP-Server\\src\\mcp-server.js"]
    }
  }
}
```

> ⚠️ **Lưu ý:** Nếu đã có các server khác trong config, thêm `"quiz-it"` vào object `mcpServers` đã có.

**Bước 3:** **Restart Claude Desktop** (đóng hoàn toàn và mở lại).

**Bước 4:** Mở Claude Desktop — icon 🔧 sẽ hiển thị ở góc dưới bên phải nếu MCP server hoạt động thành công. Nhấp vào để xem các tools có sẵn.

### Tools có sẵn trong MCP

| Tool | Mô tả |
|------|-------|
| `get_questions` | Lấy danh sách câu hỏi (có thể lọc theo category) |
| `get_random_question` | Lấy 1 câu hỏi ngẫu nhiên (có thể lọc theo category) |
| `get_question_by_id` | Lấy câu hỏi theo ID (1-100) |
| `check_answer` | Kiểm tra đáp án với id câu hỏi và A/B/C/D |
| `list_categories` | Liệt kê tất cả danh mục |

### Ví dụ sử dụng trong Claude Desktop

Sau khi tích hợp, bạn có thể chat với Claude Desktop:

- *"Cho mình 5 câu hỏi JavaScript ngẫu nhiên"*
- *"Kiểm tra câu hỏi ID 15 đáp án B"*
- *"Bắt đầu quiz 10 câu về Python"*
- *"Có bao nhiêu câu hỏi về networking?"*

Claude sẽ tự động gọi đúng tool để trả lời bạn.

### Kiểm tra MCP server chạy standalone

```bash
# Test trực tiếp từ terminal
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node src/mcp-server.js
```

---

## Danh mục câu hỏi

| Danh mục | Số câu |
|----------|--------|
| JavaScript | 20 |
| Python | 15 |
| HTML/CSS | 13 |
| SQL | 8 |
| Networking | 7 |
| OOP | 7 |
| General IT | 15 |

## Tech Stack

- **Runtime:** Node.js 18+
- **MCP SDK:** `@modelcontextprotocol/sdk` v1.29
- **Framework:** ExpressJS 4 (REST mode)
- **Validation:** Zod
- **Data:** JSON (100 câu hỏi)
