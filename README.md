# LLM agent test

Experiments over agentic approaches with LLM. This is an educative project which selectively tries to avoid more structured frameworks.

It uses MCP as repositories for tools, prompts and resources. There is a custom MCP proxy allowing to host multiple MCPs in one server, eventually to be ported to a standalone library.

It includes a MCP for searching the web over serper.dev with more search options to add eventually (wikipedia, arxiv).

Let me know.

## Setup 
Create a `.env` in the root folder, mandatory fields are the api keys the rest is the defaults

```
OPENAI_API_KEY=...
SERPER_API_KEY=...

MCP_SERVER_URL=http://localhost:9999/mcp

MCP_SERVER_PREFIX=/mcp
MCP_SERVER_PORT=9999

PROVIDER=openai
OPENAI_MODEL=gpt-4o-mini
```

### Proxy setup

Allow to run SSE proxies 

`docker compose up -d`

The SSE transport will be available at `http://localhost:3006/sse`

## Usage

Terminal 1

`npm run dev:client`

Terminal 2

`npm run dev:server`

