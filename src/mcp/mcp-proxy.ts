import { Server, ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  ErrorCode,
  GetPromptRequestSchema,
  GetPromptResultSchema,
  Implementation,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  Progress,
  Prompt,
  ReadResourceRequestSchema,
  ReadResourceResultSchema,
  Resource,
  SetLevelRequestSchema,
  Tool,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import 'dotenv/config';
import express from "express";
import { z } from "zod";

import { Express } from 'express';
import { searchTools } from "./servers/search-tools.js";

export type ToolInput = z.infer<typeof ToolSchema.shape.inputSchema>;

export type ToolRequest = z.infer<typeof CallToolRequestSchema>
export type ToolResult = z.infer<typeof CallToolResultSchema>

export type PromptRequest = z.infer<typeof GetPromptRequestSchema>
export type PromptResult = z.infer<typeof GetPromptResultSchema>

export type ResourceRequest = z.infer<typeof ReadResourceRequestSchema>
export type ResourceResult = z.infer<typeof ReadResourceResultSchema>

export type CallbackComm = {
  sendProgress: (progress: Progress) => void,
  sendLog: (level: LogLevel, message: string, content?: Record<string, any>) => void
}

export interface MCPServerInstance {
  name: string
  info?: Implementation, 
  options?: ServerOptions
  
  tools?: Tool[]
  prompts?: Prompt[]
  resources?: Resource[]

  onTool?: (args: ToolRequest, comm: CallbackComm) => ToolResult | Promise<ToolResult>
  onPrompt?: (args: PromptRequest, comm: CallbackComm) => PromptResult | Promise<PromptResult>
  onResource?: (args: ResourceRequest, comm: CallbackComm) => ResourceResult | Promise<ResourceResult>
}

const LogLevelList = ["error" , "debug" , "info" , "notice" , "warning" , "critical" , "alert" , "emergency"] as const
export type LogLevel = typeof LogLevelList[number]

interface MCPServerInstanceWrapper extends MCPServerInstance {
  server?: Server
  transport?: SSEServerTransport
  logLevel?: LogLevel
}

export class MCPProxy {

  private app: Express
  private prefix: string = ""
  private instances: Record<string, MCPServerInstanceWrapper> = {}

  constructor() {}

  init() {
    this.prefix = process.env.MCP_SERVER_PREFIX || ''
    this.app = express();    
    this.app.get(`${this.prefix}/:name`, async (req, res) => {
      const instance = this.instances[req.params.name]
      if (!instance) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      console.log(`[${instance.name}] Received connection`);
      this.instances[instance.name].transport = new SSEServerTransport(`${this.prefix}/${instance.name}/message`, res);
      await instance.server.connect(this.instances[instance.name].transport);

      instance.server.onclose = async () => {
          // await server.close();
      };
    });

    this.app.post(`${this.prefix}/:name/message`, async (req, res) => {
      const instance = this.instances[req.params.name]
      if (!instance) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      console.log(`[${instance.name}] Received message`);
      await instance.transport.handlePostMessage(req, res);
    });

    const PORT = process.env.MCP_SERVER_PORT || 9999;
    return new Promise<void>((resolve) => {
      this.app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        resolve()
      });
    })
  }

  private toolHandler(instanceWrapper: MCPServerInstanceWrapper) {

    if (!instanceWrapper.tools?.length) return

    // List available tools
    instanceWrapper.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: instanceWrapper.tools
      };
    });

    // Handle tool execution
    instanceWrapper.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return await instanceWrapper.onTool(request, this.getComm(instanceWrapper, request.params?._meta?.progressToken))
      } catch(error) {
        return {
          content: [{ type: "text", text: error.message }],
          isError: true,
        };
      }
    });

  }

  private promptHandler(instanceWrapper: MCPServerInstanceWrapper) {

    if (!instanceWrapper.prompts?.length) return

    instanceWrapper.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: instanceWrapper.prompts.map((prompt) => {
          return {
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments,
          };
        }),
      };
    });

    instanceWrapper.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const prompt = instanceWrapper.prompts.find(
        (prompt) => prompt.name === request.params.name,
      );

      if (!prompt) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `${request.params.name} not found`,
        );
      }

      const args = request.params.arguments;

      if (prompt.arguments) {
        for (const arg of prompt.arguments) {
          if (arg.required && !(args && arg.name in args)) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Missing required argument: ${arg.name}`,
            );
          }
        }
      }

      try {
        return await instanceWrapper.onPrompt(request, this.getComm(instanceWrapper, request.params?._meta?.progressToken))
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error loading prompt: ${error}`,
        );
      }
    });

  }

  private resourceHandler(instanceWrapper: MCPServerInstanceWrapper) {

    if (!instanceWrapper.resources?.length) return


    instanceWrapper.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: instanceWrapper.resources.map((resource) => {
          return {
            uri: resource.uri,
            name: resource.name,
            mimeType: resource.mimeType,
          };
        }),
      };
    });

    instanceWrapper.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = instanceWrapper.resources.find(
        (resource) => resource.uri === request.params.uri,
      );

      if (!resource) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown resource: ${request.params.uri}`,
        );
      }

      try {
        return await instanceWrapper.onResource(request, this.getComm(instanceWrapper, request.params?._meta?.progressToken))
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error reading resource: ${error}`,
          {
            uri: resource.uri,
          },
        );
      }

    });
  }

  private getComm(instanceWrapper: MCPServerInstanceWrapper, progressToken?: string|number) : CallbackComm {
    return {
      sendLog: (level, message, content) => this.log(instanceWrapper, level, message, content),
      sendProgress: (progress) => this.progress(instanceWrapper, progress, progressToken)
    }
  }

  private async progress(instanceWrapper: MCPServerInstanceWrapper, progress: Progress, progressToken?: string|number) {
    await instanceWrapper.server?.notification({
      method: "notifications/progress",
      params: {
        ...progress,
        progressToken,
      },
    });
  };

  private log(instanceWrapper: MCPServerInstanceWrapper, level: LogLevel, message: string, context?: Record<string, any>) {
    instanceWrapper.server?.sendLoggingMessage({
      level,
      data: {
        message, context
      }
    })
  }

  register(instance: MCPServerInstance) {

    // Create server instance
    const instanceWrapper: MCPServerInstanceWrapper = { ...instance, transport: undefined }

    instanceWrapper.info = instanceWrapper.info || {}
    instanceWrapper.info.name = instanceWrapper.info.name || instanceWrapper.name
    instanceWrapper.info.version = instanceWrapper.info.version || '1.0.0'

    instanceWrapper.options = instanceWrapper.options || { capabilities: {} }
    instanceWrapper.options.capabilities = instanceWrapper.options.capabilities || {}

    instanceWrapper.options.capabilities.logging = {}
    if (instance.tools?.length)
      instanceWrapper.options.capabilities.tools = {}
    if (instance.prompts?.length)
      instanceWrapper.options.capabilities.prompts = {}
    if (instance.resources?.length)
      instanceWrapper.options.capabilities.resources = {}

    instanceWrapper.server = new Server(instanceWrapper.info, instanceWrapper.options);


    instanceWrapper.server.setRequestHandler(SetLevelRequestSchema, (request) => {
      instanceWrapper.logLevel = request.params.level;

      return {};
    });

    this.toolHandler(instanceWrapper)
    this.promptHandler(instanceWrapper)
    this.resourceHandler(instanceWrapper)
    
    this.instances[instanceWrapper.name] = instanceWrapper
    console.log(`[${instance.name}] server registered at ${this.prefix}/${instanceWrapper.name}`)
  }
}


// Start the server
const main = async () => {

  const server = new MCPProxy()
  await server.init()

  server.register(searchTools)


}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
