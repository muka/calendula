
import 'dotenv/config';
import { FastMCP } from "fastmcp";
import { z } from "zod";

import * as fs from 'fs/promises';
import * as path from 'path';

const MkdirSchema = z.object({
  dir: z.string(),
});

const FileSaveSchema = z.object({
  filepath: z.string(),
  content: z.string()
});

export const main = async() => {

  const WORKDIR = process.env.WORKDIR || './tmp/workbench'

  const server = new FastMCP({
    name: "workbench",
    version: "1.0.0",
  });

  server.addTool({
    name: "mkdir",
    description: "Execute shell command to handle files",
    parameters: MkdirSchema,
    execute: async (args) => {

      try {
        const { dir } = MkdirSchema.parse(args);
        
        const dirpath = path.resolve(WORKDIR, dir)
        console.log(`mkdir ${dirpath}`)
        
        await fs.mkdir(dirpath, {
          recursive: true,
        })

        return {
          content: [
            {
              type: "text",
              text: `Directory ${dir} created. Fullpath is ${dirpath}`,
            },
          ],
        };

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

    },
  });

  server.addTool({
    name: "save_file",
    description: "Save a file providing the path and the content",
    parameters: FileSaveSchema,
    execute: async (args) => {

      try {
        const { filepath : fpath, content } = FileSaveSchema.parse(args);
        
        const filepath = path.resolve(WORKDIR, fpath)
        
        await fs.mkdir(path.dirname(filepath), {
          recursive: true,
        })

        await fs.writeFile(filepath, content)

        return {
          content: [
            {
              type: "text",
              text: `File ${fpath} saved. Fullpath is ${filepath}`,
            },
          ],
        };

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

    },
  });

  const config: any = process.env.TRANSPORT === 'sse' ? {
    transportType: "sse",
    sse: {
      endpoint: '/sse',
      port: +(process.env.PORT || 3008),
    }
  } : {
    transportType: "stdio",
  }

  server.start(config);

}

main().catch(e => console.error(e))