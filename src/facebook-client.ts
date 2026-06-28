/**
 * Facebook Graph API client
 * @see https://developers.facebook.com/docs/graph-api
 */

import type { FacebookApiError, FacebookConfig, FacebookCreatePostResponse, FacebookInsight, FacebookInsightsResponse, FacebookPost, FacebookPostList, FacebookSuccessResponse } from './types/facebook.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v25.0';

export class FacebookApiException extends Error {
  public readonly code: number;
  public readonly type: string;
  public readonly fbtraceId?: string;

  constructor(message: string, code: number, type: string, fbtraceId?: string) {
    super(message);
    this.name = 'FacebookApiException';
    this.code = code;
    this.type = type;
    this.fbtraceId = fbtraceId;
  }
}

export interface FacebookClient {
  createPost(params: { message: string; link?: string; imageUrl?: string }): Promise<FacebookCreatePostResponse>;
  getPost(postId: string): Promise<FacebookPost>;
  updatePost(postId: string, message: string): Promise<FacebookSuccessResponse>;
  deletePost(postId: string): Promise<FacebookSuccessResponse>;
  listPosts(params?: { limit?: number; after?: string }): Promise<FacebookPostList>;
  getInsights(postId: string, metrics?: string[]): Promise<FacebookInsight[]>;
  verifyConfig(): Promise<{ id: string; name: string }>;
}

export function createFacebookClient(config: FacebookConfig): FacebookClient {
  if (!config.pageId || !config.pageAccessToken) {
    throw new Error('FacebookConfig yêu cầu pageId và pageAccessToken');
  }

  const authParams = { access_token: config.pageAccessToken };

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(`${GRAPH_API_BASE}${path}`);
    for (const [key, value] of Object.entries(authParams)) {
      url.searchParams.set(key, value);
    }

    if (init.body && typeof init.body === 'string') {
      // Body đã là URL-encoded — gắn params từ body vào url thay vì gửi body
      const bodyParams = new URLSearchParams(init.body);
      for (const [key, value] of bodyParams.entries()) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      ...init,
      method: init.method ?? 'GET',
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
    });

    const data = (await response.json()) as unknown;

    if (!response.ok) {
      const err = data as FacebookApiError;
      throw new FacebookApiException(err?.error?.message ?? `HTTP ${response.status}`, err?.error?.code ?? response.status, err?.error?.type ?? 'UnknownError', err?.error?.fbtrace_id);
    }

    return data as T;
  }

  return {
    /**
     * Tạo bài viết mới trên Page
     * - Nếu có imageUrl: POST /{pageId}/photos với url + caption
     * - Nếu có link: POST /{pageId}/feed với link
     * - Nếu chỉ có text: POST /{pageId}/feed với message
     */
    async createPost({ message, link, imageUrl }) {
      if (imageUrl) {
        return request<FacebookCreatePostResponse>(`/${config.pageId}/photos`, {
          method: 'POST',
          body: new URLSearchParams({ url: imageUrl, caption: message }).toString(),
        });
      }

      const body: Record<string, string> = { message };
      if (link) body.link = link;

      return request<FacebookCreatePostResponse>(`/${config.pageId}/feed`, {
        method: 'POST',
        body: new URLSearchParams(body).toString(),
      });
    },

    /** Lấy chi tiết 1 bài viết */
    async getPost(postId) {
      const fields = ['id', 'message', 'story', 'full_picture', 'picture', 'link', 'name', 'caption', 'description', 'created_time', 'updated_time', 'type', 'status_type', 'permalink_url'].join(',');
      const url = new URL(`${GRAPH_API_BASE}/${postId}`);
      url.searchParams.set('fields', fields);
      url.searchParams.set('access_token', config.pageAccessToken);

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      const data = (await response.json()) as unknown;

      if (!response.ok) {
        const err = data as FacebookApiError;
        throw new FacebookApiException(err?.error?.message ?? `HTTP ${response.status}`, err?.error?.code ?? response.status, err?.error?.type ?? 'UnknownError', err?.error?.fbtrace_id);
      }

      return data as FacebookPost;
    },

    /** Chỉnh sửa nội dung bài viết */
    async updatePost(postId, message) {
      return request<FacebookSuccessResponse>(`/${postId}`, {
        method: 'POST',
        body: new URLSearchParams({ message }).toString(),
      });
    },

    /** Xóa bài viết */
    async deletePost(postId) {
      return request<FacebookSuccessResponse>(`/${postId}`, {
        method: 'DELETE',
      });
    },

    /** Liệt kê bài viết gần nhất của Page */
    async listPosts(params = {}) {
      const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
      const url = new URL(`${GRAPH_API_BASE}/${config.pageId}/posts`);
      url.searchParams.set('fields', 'id,message,picture,created_time,type,permalink_url');
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('access_token', config.pageAccessToken);
      if (params.after) url.searchParams.set('after', params.after);

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      const data = (await response.json()) as unknown;

      if (!response.ok) {
        const err = data as FacebookApiError;
        throw new FacebookApiException(err?.error?.message ?? `HTTP ${response.status}`, err?.error?.code ?? response.status, err?.error?.type ?? 'UnknownError', err?.error?.fbtrace_id);
      }

      return data as FacebookPostList;
    },

    /** Lấy insights (analytics) của 1 bài viết */
    async getInsights(postId, metrics) {
      const defaultMetrics = ['post_impressions', 'post_engagements', 'post_reach'];
      const metricList = (metrics && metrics.length > 0 ? metrics : defaultMetrics).join(',');
      const url = new URL(`${GRAPH_API_BASE}/${postId}/insights`);
      url.searchParams.set('metric', metricList);
      url.searchParams.set('access_token', config.pageAccessToken);

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      const data = (await response.json()) as unknown;

      if (!response.ok) {
        const err = data as FacebookApiError;
        throw new FacebookApiException(err?.error?.message ?? `HTTP ${response.status}`, err?.error?.code ?? response.status, err?.error?.type ?? 'UnknownError', err?.error?.fbtrace_id);
      }

      return (data as FacebookInsightsResponse).data;
    },

    /** Xác minh token + pageId có hợp lệ không */
    async verifyConfig() {
      const url = new URL(`${GRAPH_API_BASE}/${config.pageId}`);
      url.searchParams.set('fields', 'id,name');
      url.searchParams.set('access_token', config.pageAccessToken);

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      const data = (await response.json()) as unknown;

      if (!response.ok) {
        const err = data as FacebookApiError;
        throw new FacebookApiException(err?.error?.message ?? `HTTP ${response.status}`, err?.error?.code ?? response.status, err?.error?.type ?? 'UnknownError', err?.error?.fbtrace_id);
      }

      return data as { id: string; name: string };
    },
  };
}
