
import 'dotenv/config';
import * as eventsource from 'eventsource';

import { config } from '../libs/config.js';

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

global.EventSource = eventsource.EventSource

export const createMCPClient = async (name: string) => {

  const transport = new SSEClientTransport(new URL(`${config.mcpBaseUrl}/${name}`));

  const client = new Client({
    name,
    version: "1.0.0",
  }, {
    capabilities: {}
  });
 
  await client.connect(transport);
  return client
}


export class MCPClient {

    client: Client

    constructor(private readonly name: string) {}

    async listTools() {
        const res = await this.client.listTools()
        return res.tools || []
    }

    callTool(params: any) {
      return this.client.callTool(params)
    }

    async init() {
        this.client = await createMCPClient(this.name)
    }

    async destroy() {
        await this.client?.close()
    }

}