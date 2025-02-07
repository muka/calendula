import * as fs from 'fs/promises';
import * as path from 'path';

import { glob } from 'glob';
import * as YAML from 'js-yaml';
import { Agent, AgentConfig, createAgent } from './agent.js';
import { getConfig } from './config.js';
import {
  CoordinatorAgentConfig,
  createCoordinator,
  ExecutionTracker,
} from './coordinator.js';
import { createLogger } from './logger.js';
import { McpServer } from './mcp/mcp-client.js';

export interface TaskMangerConfig {
  tasksPath?: string;
  logsPath?: string;
  skipLogs?: boolean;
}

export type CoordinatorAgentConfigYaml = Omit<
  CoordinatorAgentConfig,
  'agents'
> & {
  agents: string[];
};

export interface Taskset {
  mcp?: McpServer[];
  tasks: CoordinatorAgentConfigYaml[];
  agents: AgentConfig[];
}

export type TasksetResult = Record<string, ExecutionTracker>;

export class TaskManger {
  private readonly logger = createLogger('task-manager');

  constructor(private readonly config?: TaskMangerConfig) {}

  async run(taskset?: string): Promise<TasksetResult> {
    const files = await this.listConfig();
    this.logger.info(`Found ${files.length} configurations`);

    if (taskset) {
      this.logger.info(`Running file ${taskset}`);
    }

    const tasksetResult: TasksetResult = {};

    for await (const file of files) {
      const basename = path.basename(file).replace(path.extname(file), '');

      if (taskset && basename !== taskset) {
        this.logger.debug(`Skip taskset ${basename}`);
        continue;
      }

      this.logger.info(`Running ${basename} taskset`);

      const config = await this.readConfig(file);

      config.mcp = config.mcp || [];
      config.agents = config.agents || [];

      const agents: Agent[] = [];

      for (const agentConfig of config.agents) {
        agentConfig.mcpServers = agentConfig.mcpServers || config.mcp;
        agents.push(await createAgent(agentConfig));
      }

      this.logger.debug(`Loaded ${agents.length} agents`);

      for (const task of config.tasks) {
        const coordinatorConfig: CoordinatorAgentConfig = {
          ...task,
          agents: [],
        };

        task.agents = task.agents || [];

        for (const agentName of task.agents) {
          const filtered = agents.filter(
            (a) => a.getConfig().name === agentName,
          );
          if (!filtered) throw new Error(`Agent ${agentName} not found.`);
          coordinatorConfig.agents.push(filtered.at(0));
        }

        coordinatorConfig.mcpServers =
          coordinatorConfig.mcpServers || config.mcp;

        const coordinator = await createCoordinator(coordinatorConfig);
        this.logger.info(`Starting task ${coordinatorConfig.task}`);
        const tracker = await coordinator.run(coordinatorConfig.task);

        const logsBasePath = this.config?.logsPath || './logs';

        if (this.config?.skipLogs !== true) {
          await fs.mkdir(`${logsBasePath}/${basename}`, { recursive: true });
          await fs.writeFile(
            `${logsBasePath}/${basename}/${tracker.ts.toISOString()}.yaml`,
            YAML.dump(tracker),
          );
        }

        tasksetResult[basename] = tracker;
      }
    }

    return tasksetResult;
  }

  async listConfig(basePath?: string) {
    basePath = basePath || this.config?.tasksPath || getConfig('CONFIG_PATH');
    try {
      const files = await glob(`${basePath}/**/*.yaml`);
      return files;
    } catch (e) {
      this.logger.error(`Failed to list files from ${basePath}: ${e.message}`);
      throw e;
    }
  }

  async readConfig(yamlPath: string) {
    try {
      const filepath = path.resolve(yamlPath);
      const raw = await fs.readFile(filepath);
      return YAML.load(raw.toString()) as Taskset;
    } catch (e) {
      this.logger.error(`Failed to load ${yamlPath}: ${e.message}`);
      throw e;
    }
  }
}
