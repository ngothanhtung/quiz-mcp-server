#!/usr/bin/env node

/**
 * MCP Facebook Page Server — STDIO Entry Point
 *
 * Đọc config theo thứ tự ưu tiên:
 *   1. process.env (FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN)
 *   2. File .env ở thư mục làm việc
 *   3. Gọi tool fb_set_config trong chat
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFacebookMcpServer } from './facebook-mcp-server.js';
import type { FacebookConfig } from './types/facebook.js';

/** Load biến môi trường từ file .env (không cần thêm dotenv dependency) */
function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Bỏ quote bao ngoài nếu có
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadDotEnv();

  const envPageId = process.env.FB_PAGE_ID;
  const envToken = process.env.FB_PAGE_ACCESS_TOKEN;

  let initialConfig: FacebookConfig | undefined;
  if (envPageId && envToken) {
    initialConfig = { pageId: envPageId, pageAccessToken: envToken };
    console.error('[fb-page] Đã tải cấu hình từ environment.');
  } else {
    console.error('[fb-page] Chưa có cấu hình. Gọi tool `fb_set_config` để bắt đầu.');
  }

  const server = createFacebookMcpServer(initialConfig);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[fb-page] MCP Facebook Page Server đang chạy (STDIO).');
}

main().catch((error) => {
  console.error('Fatal:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});