import * as fs from "fs/promises";
import * as path from "path";

import { glob } from "glob";
import * as YAML from "js-yaml";
import { Agent, AgentConfig, createAgent } from "./agent.js";
import { CoordinatorAgentConfig, createCoordinator } from "./coordinator.js";
import { createLogger } from "./logger.js";
import { McpServer } from "./mcp/mcp-client.js";

export type CoordinatorAgentConfigYaml = Omit<CoordinatorAgentConfig, 'agents'> & {
    agents: string[]
}

export interface Tasks {
    mcp?: McpServer[]
    tasks: CoordinatorAgentConfigYaml[];
    agents: AgentConfig[];
}

export class TaskManger {

    private readonly logger = createLogger('task-manager')

    constructor() { }

    async runTasks() {

      const files = await this.listConfig()
      this.logger.info(`Found ${files.length} configurations`)
    
      for await (const file of files) {
    
        this.logger.info(`Running ${path.basename(file).replace(path.extname(file), '')} tasks`)
    
        const config = await this.readConfig(file)
    
        const agents: Agent[] = []
    
        for (const agentConfig of config.agents) {
    
          agentConfig.mcpServers = agentConfig.mcpServers || config.mcp
    
          agents.push(await createAgent(agentConfig))
        }
    
        this.logger.debug(`Loaded ${agents.length} agents`)
    
        for (const task of config.tasks) {
    
          const coordinatorConfig: CoordinatorAgentConfig = {
            ...task,
            agents: []
          }
    
          for (const agentName of task.agents) {
            const filtered = agents.filter(a => a.getConfig().name === agentName)
            if (!filtered) throw new Error(`Agent ${agentName} not found.`)
            coordinatorConfig.agents.push(filtered.at(0))
          }
          
          coordinatorConfig.mcpServers = coordinatorConfig.mcpServers || config.mcp
    
          const coordinator = await createCoordinator(coordinatorConfig)
          this.logger.info(`Starting task ${coordinatorConfig.task}`)
          const res = await coordinator.run(coordinatorConfig.task)
    
          await fs.mkdir('./tmp', { recursive: true })
          await fs.writeFile(`./tmp/run-${Date.now()}.yaml`, YAML.dump(res))

        }
    
      }
    }

    async listConfig(basePath?: string) {
        basePath = basePath || process.env.CONFIG_PATH || './config'
        try {
            const files = await glob(`${basePath}/**/*.yaml`)
            return files
        } catch (e) {
            this.logger.error(`Failed to list files from ${basePath}: ${e.message}`)
            throw e
        }
    }

    async readConfig(yamlPath: string) {
        try {
            const filepath = path.resolve(yamlPath)
            const raw = await fs.readFile(filepath)
            return YAML.load(raw.toString()) as Tasks
        } catch (e) {
          this.logger.error(`Failed to load ${yamlPath}: ${e.message}`)
            throw e
        }
    }

}