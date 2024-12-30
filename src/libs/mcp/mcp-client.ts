
import 'dotenv/config';
import * as eventsource from 'eventsource';

import { config } from '../config.js';

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

global.EventSource = eventsource.EventSource

export const createMCPClient = async (url?: string) => {

  url = url || config.mcpServerUrl
  console.log(`mcp client connecting to ${url}`)

  const transport = new SSEClientTransport(new URL(url));

  const client = new Client({
    name: 'mcp-client-' + Date.now(),
    version: "1.0.0",
  }, {
    capabilities: {}
  });
 
  await client.connect(transport);
  return client
}


export class MCPClient {

    client: Client

    constructor(private readonly url?: string) {}

    async listTools() {
        const res = await this.client.listTools()
        const tools = res.tools || []
        tools.forEach(t => console.log(`- ${t.name}: ${t.description} `))
        return tools
    }

    callTool(params) {
      return this.client.callTool(params)
    }

    async init() {
        this.client = await createMCPClient(this.url)
    }

    async destroy() {
        await this.client?.close()
    }

}