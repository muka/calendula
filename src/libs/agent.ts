
import { LlmChunkTool, Message } from 'multi-llm-ts';
import { v4 as uuid } from "uuid";
import { colorize, Colors } from "./colors.js";
import { LLM } from './llm.js';
import { createLogger } from "./logger.js";
import { McpTool } from './mcp/llm-plugin.js';
import { MCPClient, McpServer } from './mcp/mcp-client.js';

export type AgentConfig = {
  name?: string
  role: string
  capabilities: string
  tools?: string[]
  mcpServers?: McpServer[]
  color?: Colors
}

export class Agent {
  
  private readonly logger = createLogger('agent')

  public readonly id: string

  private mcp: MCPClient
  private llm: LLM

  private history: Message[] = []

  constructor(private readonly config: AgentConfig) {
    this.id = uuid()
    this.llm = new LLM()  
  }

  log(message: string, context?: string) {
    this.logger.info(`${colorize( this.config.role + (context ? ' -> ' + context : ''), this.config.color )}\n ${message}\n\n`)
  }

  getHistory() {
    return this.history
  }

  getConfig() {
    return this.config
  }

  async loadTools() {
    const tools = await this.mcp.listTools()

    if (this.config.tools?.length) {
      for (const toolName of this.config.tools) {
        if (!tools.filter(t => t.name === toolName).length) {
          throw new Error(`Required tool ${toolName} not found`)
        }
      }
    }

    this.llm.registerMcpTools(tools as McpTool[], this.mcp)
  }

  async init() {
    
    this.mcp = new MCPClient(this.config.mcpServers)
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
Return only the response without additional comments or explanations.`))
    }

    this.history.push(...messages)

    const stream = await this.llm.generate(
      this.getHistory(),
    )

    let response = ''
    const toolCalls: LlmChunkTool[] = []
    for await (const chunk of stream) {
      if (chunk.type == 'content') response += chunk.text
      else if (chunk.type == 'tool') {
        this.logger.debug(`Called tool ${chunk.name}`)
        toolCalls.push(chunk)
      }
    }

    this.history.push(new Message('assistant', response))

    return response
  }
}

export const createAgent = async (config: AgentConfig) => {
  config.name = config.name || config.role
  const agent = new Agent(config)
  await agent.init()
  return agent
}
