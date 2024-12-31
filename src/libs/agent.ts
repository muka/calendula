import clc from "cli-color";
import { LlmChunkTool, Message } from 'multi-llm-ts';
import { v4 as uuid } from "uuid";
import { LLM } from './llm.js';
import { McpTool } from './mcp/llm-plugin.js';
import { MCPClient } from './mcp/mcp-client.js';

export type Colors = "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white"

type AgentConfig = {
  role: string
  capabilities: string
  tools?: string[]
  color?: Colors
}

export class Agent {
  
  public readonly id: string

  private mcp: MCPClient
  private llm: LLM

  private history: Message[] = []

  constructor(private readonly config: AgentConfig) {
    this.id = uuid()
    this.llm = new LLM()  
  }

  log(message: string, context?: string) {
    const color = this.config.color || 'cyan'
    console.log(`${clc[color]( this.config.role + (context ? ' -> ' + context : '') )}\n ${message}\n\n`)
  }

  getHistory() {
    return this.history
  }

  getConfig() {
    return this.config
  }

  async loadTools() {
    const tools = await this.mcp.listTools()

    if (this.config.tools.length) {
      for (const toolName of this.config.tools) {
        if (!tools.filter(t => t.name === toolName).length) {
          throw new Error(`Required tool ${toolName} not found`)
        }
      }
    }

    this.llm.registerMcpTools(tools as McpTool[], this.mcp)
  }

  async init() {
    
    this.mcp = new MCPClient()
    await this.mcp.init()

    await this.loadTools()
       
    await this.llm.init()
  }

  async run(messages: string | Message | Message[]) {

    if (typeof messages === 'string') {
      messages = [new Message('user', messages)]
    } else if (messages instanceof Array) {
      messages = messages as Message[]
    } else {
      messages = [messages as Message]
    }

    if (!this.history.length) {
      this.history.push(new Message('system', `
        You are a ${this.config.role} proficient in ${this.config.capabilities}. 
        Today is ${new Date().toString()}.
        Return only the response without additional comments or explanations.
        `))
    }

    this.history.push(...messages)

    const stream = await this.llm.generate(
      this.getHistory(),
    )

    let response = ''
    const toolCalls: LlmChunkTool[] = []
    for await (const chunk of stream) {
      if (chunk.type == 'content') response += chunk.text
      else if (chunk.type == 'tool') toolCalls.push(chunk)
    }

    this.history.push(new Message('assistant', response))

    return response
  }
}

export const createAgent = async (config: AgentConfig) => {
  const agent = new Agent(config)
  await agent.init()
  return agent
}
