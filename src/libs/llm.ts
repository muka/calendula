import { igniteEngine, LlmChunk, LlmCompletionOpts, LlmEngine, LlmResponse, Message, Plugin } from "multi-llm-ts";
import { McpTool, McpToolPlugin } from "./mcp/llm-plugin.js";
import { MCPClient } from "./mcp/mcp-client.js";
import { logger } from 'multi-llm-ts';
import { createLogger } from "./logger.js";

export type LLMConfig = {
    provider: string
    providerModel: string
    providerConfig: { apiKey: string }
}

export class LLM {
    llm: LlmEngine

    private readonly logger = createLogger('llm')

    private readonly config: LLMConfig

    constructor() {
        this.config = {
            provider: process.env.LLM_PROVIDER || 'openai',
            providerModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            providerConfig: { apiKey: process.env.OPENAI_API_KEY },
        }
        this.llm = igniteEngine(this.config.provider, this.config.providerConfig)
        
        logger.set((...args: any[]) => {
            this.logger.debug(args.join(' '))
        });

    }

    async init() {
    }

    async destroy() {
        this.llm.clearPlugins()
        this.llm = undefined
    }

    complete(thread: Message[], opts?: LlmCompletionOpts): Promise<LlmResponse> {
        return this.llm.complete(this.config.providerModel, thread, opts)
    }

    generate(thread: Message[], opts?: LlmCompletionOpts): AsyncIterable<LlmChunk> {
        return this.llm.generate(this.config.providerModel, thread, opts)
    }

    addPlugin(plugin: Plugin) {
        return this.llm.addPlugin(plugin)
    }

    registerMcpTools(tools: McpTool[], mcp: MCPClient) {
        tools.forEach(t => this.addPlugin(new McpToolPlugin(t, mcp)))
    }

}