import * as fs from "fs/promises";
import * as path from "path";

import { glob } from "glob";
import * as YAML from "js-yaml";
import { AgentConfig } from "./agent.js";
import { CoordinatorAgentConfig } from "./coordinator.js";

export type CoordinatorAgentConfigYaml = Omit<CoordinatorAgentConfig, 'agents'> & {
    agents: string[]
}

export interface Tasks {
    tasks:  CoordinatorAgentConfigYaml[];
    agents: AgentConfig[];
}
 
export const listConfig = async (basePath?: string) => {
    basePath = basePath || process.env.CONFIG_PATH || './config'
    try {
        const files = await glob(`${basePath}/**/*.yaml`)
        return files
    } catch(e) {
        console.error(`Failed to list files from ${basePath}: ${e.message}`)
        throw e
    }
}

export const readConfig = async (yamlPath: string) => {
    try {
        const filepath = path.resolve(yamlPath)
        const raw = await fs.readFile(filepath)
        return YAML.load(raw.toString()) as Tasks
    } catch(e) {
        console.error(`Failed to load ${yamlPath}: ${e.message}`)
        throw e
    }
}

export const loadConfigs = async function* (basePath?: string): AsyncIterable<Tasks> {
    const files = await listConfig(basePath)
    for (const file of files) {
        yield await readConfig(file)
    }
}
