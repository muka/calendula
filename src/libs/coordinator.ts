import { Message } from 'multi-llm-ts';
import { Agent } from './agent.js';
import { colorize, Colors } from './colors.js';
import { LLM, LLMConfig } from './llm.js';
import { createLogger } from './logger.js';
import { McpTool } from './mcp/llm-plugin.js';
import { MCPClient, McpServer } from './mcp/mcp-client.js';
import { v4 as uuid } from 'uuid';

export type PlanItem = {
  task: string;
  role: string;
};
export type Plan = PlanItem[];

export type ExecutionTrackerItem = PlanItem & {
  result: string;
  ts: Date;
};

export type ExecutionTracker = {
  id: string;
  ts: Date;
  items: ExecutionTrackerItem[];
};

export type CoordinatorAgentConfig = {
  agents: Agent[];
  task?: string;
  tools?: string[];
  mcpServers?: McpServer[];
  color?: Colors;
  llmConfig?: LLMConfig;
};

export class AgentCoordinator {
  private readonly logger = createLogger('agent-coordinator');
  private mcp: MCPClient;
  private llm: LLM;

  constructor(private readonly config: CoordinatorAgentConfig) {
    this.llm = new LLM(this.config.llmConfig);
  }

  async loadTools() {
    const tools = await this.mcp.listTools();
    this.llm.registerMcpTools(tools as McpTool[], this.mcp);
  }

  async init() {
    this.mcp = new MCPClient(this.config.mcpServers);
    await this.mcp.init();

    await this.loadTools();

    await this.llm.init();
  }

  log(message: string, context?: string) {
    this.logger.info(
      `${colorize(`coordinator${context ? ' -> ' + context : ''}`, this.config.color)}\n ${message}\n\n`,
    );
  }

  async run(task?: string) {
    const id = uuid();

    task = task || this.config.task;

    if (!task) throw new Error(`Provide a task to run`);

    const plan = await this.createPlan(task);
    const history: Message[] = [];

    const tracker: ExecutionTracker = {
      id,
      ts: new Date(),
      items: [],
    };

    for (const step of plan) {
      const filter = this.config.agents.filter(
        (a) => a.getConfig().role === step.role,
      );
      if (!filter.length) {
        throw new Error(`Agent with role '${step.role}' not found`);
      }
      const agent = filter.at(0);

      this.log(step.task, step.role);

      const result = await agent.run([
        ...history,
        new Message('user', step.task),
      ]);

      agent.log(result, 'task result');

      tracker.items.push({
        ...step,
        result,
        ts: new Date(),
      });

      history.push(new Message('user', step.task));
      history.push(new Message('assistant', result));
    }

    this.log(`Task completed`);

    return tracker;
  }

  async createPlan(objective: string): Promise<Plan> {
    const messages: Message[] = [];

    messages.push(
      new Message(
        'system',
        `
You are a software program coordinating expert agents capable of performing tasks to reach an objective. 
Your task is to provide precise indications to the agents based on their capabilities and monitor the progresses in subsequent tasks.
`,
      ),
    );

    messages.push(
      new Message(
        'user',
        `
Create a plan of activities to reach the following objective: 
${objective}

You can assign activities only to the following agents:
${JSON.stringify(
  this.config.agents.map((a) => ({
    role: a.getConfig().role,
    capabilities: a.getConfig().capabilities,
  })),
)}

Answer only with the work plan as a list of activities. Avoid reasoning, explanations and notes in your answer.
Return only the workplan as correct JSON without backtick following this format:
[{
  "task": "description of the activity",
  "role": "agent role field, without modification"
}]`,
      ),
    );

    const plannerRes = await this.llm.complete(messages);

    this.log(plannerRes.content, 'plan');

    const plan = this.llm.parseJSON(plannerRes.content);

    if (!plan) {
      throw new Error(`Failed to create plan.`);
    }

    return plan;
  }
}

export const createCoordinator = async (config: CoordinatorAgentConfig) => {
  const c = new AgentCoordinator(config);
  await c.init();
  return c;
};
