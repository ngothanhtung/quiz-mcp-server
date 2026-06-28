/**
 * MCP Facebook Page Server
 * Đăng ký 7 tools: set_config, create_post, get_post, update_post, delete_post, list_posts, get_insights
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createFacebookClient, FacebookApiException } from './facebook-client.js';
import type { FacebookConfig } from './types/facebook.js';

const INSIGHT_METRICS = ['post_impressions', 'post_impressions_unique', 'post_engaged_users', 'post_engagements', 'post_clicks', 'post_reach', 'post_reach_unique', 'post_reactions_by_type_total'] as const;

interface ServerState {
  config: FacebookConfig | null;
}

function textContent(text: string, isError = false) {
  return {
    content: [{ type: 'text' as const, text }],
    isError,
  };
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function errorMessage(err: unknown): string {
  if (err instanceof FacebookApiException) {
    return `[Facebook API ${err.code}] ${err.message}` + (err.fbtraceId ? ` (trace: ${err.fbtraceId})` : '');
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function createFacebookMcpServer(initialConfig?: FacebookConfig): McpServer {
  const server = new McpServer({
    name: 'facebook-page-mcp',
    version: '1.0.0',
  });

  const state: ServerState = {
    config: initialConfig ?? null,
  };

  function requireClient() {
    if (!state.config) {
      throw new Error('Chưa cấu hình Facebook Page. Vui lòng gọi tool `fb_set_config` trước, hoặc set env FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN.');
    }
    return createFacebookClient(state.config);
  }

  // 1. fb_set_config — Đặt Page Access Token + Page ID
  server.registerTool(
    'fb_set_config',
    {
      description: 'Cấu hình Facebook Page: nhập Page ID và Page Access Token. Token có quyền pages_manage_posts, pages_read_engagement, pages_show_list.',
      inputSchema: {
        pageId: z.string().min(1).describe('Facebook Page ID'),
        pageAccessToken: z.string().min(1).describe('Page Access Token (long-lived)'),
      },
    },
    async ({ pageId, pageAccessToken }) => {
      state.config = { pageId, pageAccessToken };
      try {
        const client = requireClient();
        const info = await client.verifyConfig();
        return textContent(
          toJson({
            success: true,
            page: info,
            message: `Đã kết nối tới Page "${info.name}" (id: ${info.id}).`,
          }),
        );
      } catch (err) {
        // Rollback nếu verify thất bại
        state.config = null;
        return textContent(`Cấu hình đã lưu nhưng verify thất bại: ${errorMessage(err)}`, true);
      }
    },
  );

  // 2. fb_create_post — Đăng bài mới
  server.registerTool(
    'fb_create_post',
    {
      description: 'Đăng bài viết mới lên Facebook Page. Hỗ trợ text thuần, kèm link, hoặc kèm ảnh (URL).',
      inputSchema: {
        message: z.string().min(1).max(63206).describe('Nội dung bài viết (tối đa 63.206 ký tự)'),
        link: z.string().url().optional().describe('URL liên kết đính kèm (optional)'),
        imageUrl: z.string().url().optional().describe('URL ảnh để đăng (optional — nếu có sẽ tạo post ảnh)'),
      },
    },
    async ({ message, link, imageUrl }) => {
      try {
        const client = requireClient();
        const result = await client.createPost({ message, link, imageUrl });
        return textContent(
          toJson({
            success: true,
            postId: result.id,
            message: `Đã đăng bài thành công. Post ID: ${result.id}`,
          }),
        );
      } catch (err) {
        return textContent(errorMessage(err), true);
      }
    },
  );

  // 3. fb_get_post — Xem chi tiết 1 bài viết
  server.registerTool(
    'fb_get_post',
    {
      description: 'Lấy thông tin chi tiết của 1 bài viết theo Post ID.',
      inputSchema: {
        postId: z.string().min(1).describe('Facebook Post ID'),
      },
    },
    async ({ postId }) => {
      try {
        const client = requireClient();
        const post = await client.getPost(postId);
        return textContent(toJson(post));
      } catch (err) {
        return textContent(errorMessage(err), true);
      }
    },
  );

  // 4. fb_update_post — Chỉnh sửa nội dung
  server.registerTool(
    'fb_update_post',
    {
      description: 'Chỉnh sửa nội dung (message) của 1 bài viết đã đăng.',
      inputSchema: {
        postId: z.string().min(1).describe('Facebook Post ID'),
        message: z.string().min(1).max(63206).describe('Nội dung mới'),
      },
    },
    async ({ postId, message }) => {
      try {
        const client = requireClient();
        const result = await client.updatePost(postId, message);
        return textContent(
          toJson({
            success: result.success,
            message: result.success ? 'Đã cập nhật bài viết.' : 'Cập nhật thất bại.',
          }),
        );
      } catch (err) {
        return textContent(errorMessage(err), true);
      }
    },
  );

  // 5. fb_delete_post — Xóa bài viết
  server.registerTool(
    'fb_delete_post',
    {
      description: 'Xóa 1 bài viết khỏi Facebook Page (không thể khôi phục).',
      inputSchema: {
        postId: z.string().min(1).describe('Facebook Post ID cần xóa'),
      },
    },
    async ({ postId }) => {
      try {
        const client = requireClient();
        const result = await client.deletePost(postId);
        return textContent(
          toJson({
            success: result.success,
            message: result.success ? `Đã xóa bài viết ${postId}.` : 'Xóa thất bại.',
          }),
        );
      } catch (err) {
        return textContent(errorMessage(err), true);
      }
    },
  );

  // 6. fb_list_posts — Liệt kê bài viết gần nhất
  server.registerTool(
    'fb_list_posts',
    {
      description: 'Liệt kê các bài viết gần nhất trên Page (hỗ trợ phân trang qua cursor).',
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(10).describe('Số bài viết tối đa (1-100, mặc định 10)'),
        after: z.string().optional().describe('Cursor để phân trang (từ response trước)'),
      },
    },
    async ({ limit, after }) => {
      try {
        const client = requireClient();
        const result = await client.listPosts({ limit, after });
        return textContent(toJson(result));
      } catch (err) {
        return textContent(errorMessage(err), true);
      }
    },
  );

  // 7. fb_get_insights — Lấy analytics
  server.registerTool(
    'fb_get_insights',
    {
      description: 'Lấy chỉ số analytics (insights) của 1 bài viết: impressions, reach, engagements, clicks, reactions.',
      inputSchema: {
        postId: z.string().min(1).describe('Facebook Post ID'),
        metrics: z.array(z.enum(INSIGHT_METRICS)).optional().describe('Danh sách metric cần lấy. Mặc định: post_impressions, post_engagements, post_reach'),
      },
    },
    async ({ postId, metrics }) => {
      try {
        const client = requireClient();
        const insights = await client.getInsights(postId, metrics);
        return textContent(toJson(insights));
      } catch (err) {
        return textContent(errorMessage(err), true);
      }
    },
  );

  return server;
}
