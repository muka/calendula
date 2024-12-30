import { igniteEngine, LlmChunk, LlmCompletionOpts, LlmEngine, LlmResponse, Message, Plugin } from "multi-llm-ts";
import { McpTool, McpToolPlugin } from "./mcp/llm-plugin.js";
import { MCPClient } from "./mcp/mcp-client.js";
import { config } from "./config.js";


export class LLM {
    llm: LlmEngine

    constructor() {
        this.llm = igniteEngine(config.provider, config.providerConfig)
    }

    async init() {
    }

    async destroy() {
        this.llm.clearPlugins()
        this.llm = undefined
    }

    complete(thread: Message[], opts?: LlmCompletionOpts): Promise<LlmResponse> {
        return this.llm.complete(config.providerModel, thread, opts)
    }

    generate(thread: Message[], opts?: LlmCompletionOpts): AsyncIterable<LlmChunk> {
        return this.llm.generate(config.providerModel, thread, opts)
    }

    addPlugin(plugin: Plugin) {
        return this.llm.addPlugin(plugin)
    }

    registerMcpTools(tools: McpTool[], mcp: MCPClient) {
        tools.forEach(t => {
            console.log(`LLM adding tool ${t.name}`)
            this.addPlugin(new McpToolPlugin(t, mcp))
        })
    }

}