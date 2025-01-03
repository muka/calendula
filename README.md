# LLM agent test

Experiments over agentic approaches with LLM. This is an educative project which selectively tries to avoid more structured frameworks.

It uses MCP as repositories for tools, prompts and resources. 

In `./config` there is a sample YAML to configure agents and tasks to perform to develop a TODO list web application. 

## Setup

1. Install dependencies with a package manger e.g. `npm i`
2. Build the base image for the MCP proxy

```sh
docker build ./mcp/mcp-proxy-base -f ./mcp/mcp-proxy-base/Dockerfile -t mcp-proxy/base
```
3. Create a `.env` in the root folder and set the those api keys

```
# openai api key
OPENAI_API_KEY=...
# serper.dev api key
SERPER_API_KEY=...

```

4. Add or edit tasks definition in `./config`

## Usage

Start the MCP servers to be used by the agents.

`docker compose -f docker-compose.mcp.yaml up -d`

Start the main runtime with `docker compose up`

## License

Copyright 2025 Luca Capra

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
