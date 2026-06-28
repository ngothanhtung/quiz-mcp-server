/**
 * Facebook Graph API types
 * @see https://developers.facebook.com/docs/graph-api
 */

export interface FacebookConfig {
  pageId: string;
  pageAccessToken: string;
}

export interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  full_picture?: string;
  picture?: string;
  link?: string;
  name?: string;
  caption?: string;
  description?: string;
  created_time: string;
  updated_time?: string;
  type?: string;
  status_type?: string;
  permalink_url?: string;
}

export interface FacebookPostList {
  data: FacebookPost[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
    previous?: string;
  };
}

export interface FacebookInsightValue {
  value: number;
  end_time?: string;
}

export interface FacebookInsight {
  name: string;
  period: string;
  values: FacebookInsightValue[];
  title?: string;
  description?: string;
  id?: string;
}

export interface FacebookInsightsResponse {
  data: FacebookInsight[];
}

export interface FacebookCreatePostResponse {
  id: string;
  post_id?: string;
}

export interface FacebookSuccessResponse {
  success: boolean;
}

export interface FacebookApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id?: string;
  };
}