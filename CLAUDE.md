# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm install         # Install dependencies
npm run build       # Compile TypeScript (tsc → build/)
npm run facebook:stdio  # Run locally for testing
```

No test framework is configured yet.

## Project Architecture

Single entry point — STDIO MCP server for Facebook Page management.

### Source layout

- **`src/facebook-mcp-server.ts`** — Registers 7 MCP tools (`fb_set_config`, `fb_create_post`, `fb_get_post`, `fb_update_post`, `fb_delete_post`, `fb_list_posts`, `fb_get_insights`). Config is held in-memory via a `ServerState` closure — `fb_set_config` tool sets it at runtime, or pass initial config from env. Each tool handler wraps `createFacebookClient()` with try/catch.
- **`src/facebook-client.ts`** — Facebook Graph API v25.0 client. Closure-based with `pageId`/`pageAccessToken`. Three post types: photo (`/{pageId}/photos`), link (`/{pageId}/feed` with `link`), and text-only (`/{pageId}/feed`). Shared `request<T>()` helper for most calls; `getPost`/`listPosts`/`getInsights`/`verifyConfig` build their own URLs for field selection.
- **`src/mcp-facebook-stdio-server.ts`** — STDIO transport entry point. Reads `FB_PAGE_ID` and `FB_PAGE_ACCESS_TOKEN` from `.env` or process env.
- **`src/types/facebook.ts`** — All Facebook Graph API response types plus `FacebookConfig`.

### Design decisions

- **No dotenv dependency** — `.env` is parsed manually in `mcp-facebook-stdio-server.ts` via `loadDotEnv()`.
- **Facebook MCP config** — closure-based, set via tool or initial env. Rolled back if `verifyConfig()` fails.
- **Error handling** — `FacebookApiException` carries Graph API `code`, `type`, and `fbtraceId`.
- **TypeScript** — ES2022 target, Node16 module resolution, strict mode.

## Configuration Files

| File                    | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `.env`                  | Facebook credentials (gitignored, copy from `.env.example`) |
| `.mcp.json`             | Local MCP server registration for Claude Code               |
| `.claude/settings.json` | Permission allowlist for MCP tool calls                     |
