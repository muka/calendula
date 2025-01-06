import { igniteEngine, LlmChunk, LlmCompletionOpts, LlmEngine, LlmResponse, logger, Message, Plugin } from "multi-llm-ts";
import { createLogger } from "./logger.js";
import { McpTool, McpToolPlugin } from "./mcp/llm-plugin.js";
import { MCPClient } from "./mcp/mcp-client.js";

export type LLMConfig = {
    provider: string
    providerModel: string
    providerBaseURL?: string
    providerConfig: { apiKey: string, baseURL: string }
}

export class LLM {
    llm: LlmEngine

    private readonly logger = createLogger('llm')

    constructor(private config?: LLMConfig) {

        this.config = this.config || {} as LLMConfig

        this.config.provider = this.config.provider || process.env.PROVIDER || 'openai'
        this.config.providerModel = this.config.providerModel || process.env.PROVIDER_MODEL || 'gpt-4o-mini'

        this.config.providerConfig = this.config.providerConfig || {
            apiKey: process.env.PROVIDER_API_KEY,
            baseURL: process.env.PROVIDER_BASEURL || undefined,
        }

        if (this.config.providerBaseURL) {
            this.config.providerConfig.baseURL = this.config.providerBaseURL
        }

        this.logger.debug(`LLM config ${JSON.stringify({
            ...this.config,
            providerConfig: {
                ...this.config.providerConfig,
                apiKey: this.config.providerConfig.apiKey ? '***' : undefined
            },
        }, null, 2)}`)

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

    parseJSON(raw: string) {

        if (raw.startsWith('```json')) {
            raw = raw.replace('```json', '')
        }
        if (raw.startsWith('```')) {
            raw = raw.replace('```', '')
        }
        if (raw.endsWith('```')) {
            raw = raw.substring(0, raw.length-3)
        }

        try {
            return JSON.parse(raw)
        } catch(e) {
            this.logger.warn(`Failed to parse JSON response: ${e.message}`)
            this.logger.debug(`RAW: ${raw}`)
        }

        return null
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

