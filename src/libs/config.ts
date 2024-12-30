import 'dotenv/config'

export type Config = {
    provider: string
    providerModel: string
    providerConfig: { apiKey: string }
    mcpServerUrl: string
}

export const config: Config = {
    provider: process.env.PROVIDER || 'openai',
    providerModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    providerConfig: { apiKey: process.env.OPENAI_API_KEY },
    mcpServerUrl:  process.env.MCP_SERVER_URL || 'http://localhost:3006/sse',
}