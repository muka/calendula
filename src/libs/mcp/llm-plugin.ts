import { Plugin } from "multi-llm-ts"
import { MCPClient } from "./mcp-client.js"
import { createLogger } from "../logger.js"

export type McpTool = {
    name: string
    description: string
    inputSchema: any
}

export class McpToolPlugin extends Plugin {

    private readonly logger = createLogger('mcp-tool-plugin')

    constructor(private readonly tool: McpTool, private readonly mcp: MCPClient) {
        super()
      }
    
      isEnabled(): boolean {
        return true
      }
    
      getName(): string {
        return this.tool.name
      }
    
      getDescription(): string {
        return this.tool.description
      }
    
      getPreparationDescription(): string {
        return `Preparing ${this.tool.name}`
      }
          
      getRunningDescription(): string {
        return `Running ${this.tool.name}`
      }

      isCustomTool(): boolean {
        return true
      }

      async getTools(): Promise<any|any[]> {
        return {
          type: 'function',
          function: {
            name: this.tool.name,
            description: this.tool.description,
            parameters: this.tool.inputSchema,
          },
        }
      }
       
      async execute(args: any): Promise<any> {
        this.logger.debug(`Execute tool ${this.tool.name} ${JSON.stringify(args)}`)
        const res = await this.mcp.callTool({
            name: this.tool.name,
            arguments: args
        })
        return res || {}
      }  
}