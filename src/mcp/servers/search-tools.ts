import { zodToJsonSchema } from "zod-to-json-schema";
import { SerperClient } from "./libs/serper.js";
import { z } from "zod";
import { MCPServerInstance, ToolInput } from "../mcp-proxy.js";

// Define Zod schemas for validation
const SearchSchema = z.object({
  topic: z.string(),
});

export const searchTools: MCPServerInstance = {
    name: 'search-tools',
    tools: [
      {
        name: "web-search",
        description: "Search the web for a topic",
        inputSchema: zodToJsonSchema(SearchSchema) as ToolInput,
      },
    ],
    onTool: async (request) => {

      const { name, arguments: args } = request.params;
        console.log(`Call tool ${name}: ${args}`)
      try {
        if (name === "web-search") {
          const { topic } = SearchSchema.parse(args);
          
          console.log(`Search for ${topic}`)

          const client = new SerperClient()
          const res = await client.search(topic)
          
        //   console.log('res', res)

          if (!res) {
            console.warn(`Failed to retrieve results`)
            return {
              content: [
                {
                  type: "text",
                  text: "Failed to retrieve results",
                },
              ],
            };
          }

          if (res.organic.length === 0) {
            console.warn(`No results found`)
            return {
              content: [
                {
                  type: "text",
                  text: `No results found`,
                },
              ],
            };
          }

          const results = res.organic.map(({title, snippet, link}) => ({title, snippet, link})).slice(0, 10)

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(results),
              },
            ],
          };
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            `Invalid arguments: ${error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", ")}`
          );
        }
        throw error;
      }
    }
  }