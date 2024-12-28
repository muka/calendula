


import { LlmChunkTool, Message } from 'multi-llm-ts';
import { LLM } from './libs/llm.js';
import { McpTool } from './mcp/llm-plugin.js';
import { MCPClient } from './mcp/mcp-client.js';

export const main = async () => {

  const llm = new LLM()  

  const mcps = ['search-tools']

  for (const name of mcps) {
    console.log(`Adding MCP ${name}`)
    const mcp = new MCPClient(name)
    await mcp.init()

    const tools = await mcp.listTools()
    llm.registerMcpTools(tools as McpTool[], mcp)
  }
  
  await llm.init()

  const messages = [
    new Message('system', 'You are a helpful assistant'),
    new Message('user', `
Search for recent news in Trentino Alto Adige to date ${new Date().toDateString()}. 
Provide a summary of key events. 
Answer in Italian. 
Provide links
`),
  ]
  // const res =  await llm.complete(messages)
  const stream =  await llm.generate(messages)

  let response = ''
  const toolCalls: LlmChunkTool[] = []
  for await (const chunk of stream) {
    if (chunk.type == 'content') response += chunk.text
    else if (chunk.type == 'tool') toolCalls.push(chunk)
  }

  console.log('response', response)
  // console.log('toolCalls', toolCalls)

  
}

main().catch(e => console.error(e))