
import 'dotenv/config';
import * as eventsource from 'eventsource';

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { createLogger } from '../logger.js';

global.EventSource = global.EventSource ?? eventsource.EventSource

const WAIT_MS = 2500
const MAX_RETRIES = 3
const SEPARATOR = "__"

const sleep = (time: number) => new Promise<void>(resolve => setTimeout(() => resolve(), time))

export type McpServerStdio = {
    type: 'stdio'
    command: string
    args: string[]
    env: string[]
}

export type McpServerSSE = {
    type: 'sse'
    url: string
}

export type McpServer = {
  name: string
} & (McpServerSSE | McpServerStdio)


export const createMCPClient = async (server: McpServer) => {

  const logger = createLogger('create-mcp-client')

  let count = 0
  let retry = true

  let client: Client

  while(retry) {

    let transport: Transport

    if (server.type === 'sse') {
      transport = new SSEClientTransport(new URL(server.url));
    } else {
      transport = new StdioClientTransport({
        command: server.command,
        args: server.args,
        env: (server.env || []).reduce((o, envName) => ({
          ...o,
          [envName]: process.env[envName]
        }), {})
      });
    } 

    const clientName = 'mcp-client-' + (server.name || Date.now())
    client = new Client({
      name: clientName,
      version: "1.0.0",
    }, {
      capabilities: {}
    });
    
    try {
      logger.debug(`Connecting client ${server.name}`)
      await client.connect(transport);
      break
    } catch(e) {
      logger.error(`[${clientName}] Connection error: ${e.stack}`)
      count++
      retry = count <= MAX_RETRIES
      if (retry) {
        logger.info(`[${clientName}] Reconnecting in ${WAIT_MS} ${count}/${MAX_RETRIES}`)
        await sleep(2500)
        try {
          await client.close()
        } catch {
          //
        }
        try {
          await transport.close()
        } catch {
          //
        }
      } else {
        throw new Error(`Failed to connect to MCP server ${server.name}`)
      }
    }
  }

  logger.debug(`Connected to ${server.name}`)
  return client
}


export class MCPClient {

    private readonly logger = createLogger('mcp-client')

    clients: Record<string, Client> = {}

    constructor(private readonly servers: McpServer[] = []) {}

    async listTools() {

        const tools: any[] = []

        for (const clientName in this.clients) {
          const client = this.clients[clientName]
          const res = await client.listTools()
          const clientTools = (res.tools || []).map(t => ({
            ...t,
            name: `${clientName}${SEPARATOR}${t.name}`
          }))

          clientTools.forEach(t => this.logger.debug(`- ${t.name}: ${t.description} `))
          tools.push(...clientTools)
        }

        return tools
    }

    callTool(params: {name: string} & any) {
      const [clientName, toolName] = params.name.split(SEPARATOR)
      return this.clients[clientName].callTool({
        ...params,
        name: toolName
      })
    }

    async init() {
        for (const server of this.servers) {
          try {
            this.logger.debug(`Adding ${server.name}`)
            this.clients[server.name] = await createMCPClient(server)
          } catch(e) {
            console.error(`Skip MCP server ${server.name}: ${e.message}`)
          }
        }
        this.logger.debug(`${Object.keys(this.clients).length} servers available`)
    }

    async destroy() {
        for (const clientName in this.servers) {
          this.logger.debug(`Closing ${clientName}`)
          await this.clients[clientName].close()
        }
    }

}