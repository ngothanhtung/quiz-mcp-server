# mcp-fb-page

MCP server for managing Facebook Page posts — create, read, update, delete, and get insights.

Works with any MCP client: Claude Desktop, Claude Code, Cline, Cursor, etc.

## Setup

```bash
npm install -g mcp-fb-page
```

Or use directly with `npx` (see config examples below).

## Prerequisites

You need:
- A **Facebook Page** (any type)
- A **Page Access Token** with permissions: `pages_manage_posts`, `pages_read_engagement`

### Get your token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your app, then "Get User Access Token" with `pages_manage_posts` + `pages_read_engagement`
3. Exchange for a long-lived token: `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=...`
4. Get Page token: `GET /me/accounts?access_token=...`

## Configuration

### Option 1: Env vars (recommended)

Set `FB_PAGE_ID` and `FB_PAGE_ACCESS_TOKEN` as environment variables in your MCP client config.

### Option 2: Runtime config

Leave env vars empty, then call `fb_set_config` tool in chat to provide Page ID + token at runtime.

## MCP Client Config

### Claude Desktop / Claude Code

Add to your `claude_desktop_config.json` or `.mcp.json`:

```json
{
  "mcpServers": {
    "fb-page": {
      "command": "npx",
      "args": ["-y", "mcp-fb-page"],
      "env": {
        "FB_PAGE_ID": "your_page_id",
        "FB_PAGE_ACCESS_TOKEN": "your_long_lived_token"
      }
    }
  }
}
```

### Cline / Cursor / Roo Code / Kilo

Same config object — add to the MCP servers section of each tool's settings.

## Tools

| Tool | Description |
|------|-------------|
| `fb_set_config` | Set Page ID + Access Token at runtime |
| `fb_create_post` | Create a new post (text, link, or photo) |
| `fb_get_post` | Get post details by ID |
| `fb_update_post` | Edit post message |
| `fb_delete_post` | Delete a post (irreversible) |
| `fb_list_posts` | List recent posts (with pagination) |
| `fb_get_insights` | Get post analytics (impressions, reach, engagements, etc.) |

## Build from source

```bash
git clone <repo-url>
cd mcp-fb-page
npm install
npm run build
```

## Tech Stack

- **Runtime:** Node.js 18+
- **MCP SDK:** `@modelcontextprotocol/sdk` v1.29
- **Validation:** Zod
- **API:** Facebook Graph API v25.0
