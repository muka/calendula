# LLM agent test

Experiments over agentic approaches with LLM. This is an educative project which selectively tries to avoid more structured frameworks.

It uses MCP as repositories for tools, prompts and resources. 

Let me know.

## Configuration

In `./config` there is a sample YAML to configur a series of agents and the high level tasks to perform.

The `todo-list.yaml` focuses on developing a TODO list web application. 


## Setup 
Create a `.env` in the root folder, mandatory fields are the api keys the rest is the defaults

```
OPENAI_API_KEY=...
SERPER_API_KEY=...

```

### MCP setup

Allow to run SSE proxies 

`docker compose up -d`

The SSE transport will be available at `http://localhost:3006/sse`

## Usage

`npm run dev`

