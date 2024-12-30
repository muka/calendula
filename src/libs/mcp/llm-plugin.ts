import { Plugin, PluginParameter } from "multi-llm-ts"
import { MCPClient } from "./mcp-client.js"

export type McpTool = {
    name: string
    description: string
    inputSchema: any
}

export class McpToolPlugin extends Plugin {

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
    
      getParameters(): PluginParameter[] {
        
        const parameters: PluginParameter[] = []

        const schema = this.tool.inputSchema

        // console.log(schema)

        for (const name in schema.properties) {
            
            const props = schema.properties[name] as {description?: string, type: string }
            const required = ((schema.required || []) as string[]).indexOf(name) > -1

            parameters.push({
                name,
                description: props.description,
                type: props.type,
                required
            })
        }

        return parameters
      }
    
       
      async execute(args: any): Promise<any> {
        console.log('execute', this.tool.name, args)
        const res = await this.mcp.callTool({
            name: this.tool.name,
            arguments: args
        })
        // console.log('execute', res)
        return res || ''
      }  
}