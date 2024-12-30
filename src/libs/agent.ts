import { LlmChunkTool, Message } from 'multi-llm-ts';
import { LLM } from './llm.js';
import { McpTool } from './mcp/llm-plugin.js';
import { MCPClient } from './mcp/mcp-client.js';

type AgentConfig = {
  role: string
  capabilities: string
  tools?: string[]
}

export class Agent {
  
  private mcp: MCPClient
  private llm: LLM

  private history: Message[] = []

  constructor(private readonly config: AgentConfig) {
    this.llm = new LLM()  
  }

  getHistory() {
    return this.history
  }

  async loadTools() {
    const tools = await this.mcp.listTools()
    this.llm.registerMcpTools(tools as McpTool[], this.mcp)
  }

  async init() {
    
    this.mcp = new MCPClient()
    await this.mcp.init()

    await this.loadTools()
       
    await this.llm.init()
  }

  async run(task: string) {
    const messages = [
      new Message('system', `
You are a ${this.config.role} proficient in ${this.config.capabilities}. 
Today is ${new Date().toString()}.
Return only the response without additional comments or explanations.
`),
      new Message('user', `Task: ${task}`),
    ]

    const stream = await this.llm.generate([
      ...this.getHistory(),
      ...messages
    ])

    let response = ''
    const toolCalls: LlmChunkTool[] = []
    for await (const chunk of stream) {
      if (chunk.type == 'content') response += chunk.text
      else if (chunk.type == 'tool') toolCalls.push(chunk)
    }

    // console.log('response', response)

    this.history.push(...messages)
    this.history.push(new Message('assistant', response))

    return response
  }
}

export const createAgent = async (config: AgentConfig) => {
  const agent = new Agent(config)
  await agent.init()
  return agent
}
