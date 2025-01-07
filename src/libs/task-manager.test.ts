import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TaskManger } from './task-manger.js';

import { Message } from 'multi-llm-ts';
import { beforeEach } from 'node:test';
import * as agent from './agent.js';
import * as coordinator from './coordinator.js';

import * as os from 'os';

const configDir = './test/config';

describe('task manager', () => {
  beforeAll(() => {
    process.env['PROVIDER_API_KEY'] = '***';
  });

  beforeEach(() => {
    vi.spyOn(agent, 'createAgent');
    vi.mock('./agent.js', async (importOriginal) => {
      return {
        ...(await importOriginal<typeof import('./agent.js')>()),
        createAgent: async (config: agent.AgentConfig) => {
          return new (class extends agent.Agent {
            constructor(config: agent.AgentConfig) {
              super(config);
            }

            async run(messages: string | Message | Message[]): Promise<string> {
              expect(messages).toBeTruthy();
              return '';
            }
          })(config);
        },
      };
    });

    vi.spyOn(coordinator, 'createCoordinator');
    vi.mock('./coordinator.js', async (importOriginal) => {
      return {
        ...(await importOriginal<typeof import('./coordinator.js')>()),
        createCoordinator: async (
          config: coordinator.CoordinatorAgentConfig,
        ) => {
          return new (class extends coordinator.AgentCoordinator {
            constructor(config: coordinator.CoordinatorAgentConfig) {
              super(config);
            }

            async createPlan(objective: string): Promise<coordinator.Plan> {
              expect(objective).toBeTruthy();
              return [
                {
                  role: 'hello',
                  task: 'say hello',
                },
                {
                  role: 'world',
                  task: 'say world',
                },
              ];
            }
          })(config);
        },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list', async () => {
    const taskManger = new TaskManger();

    const list = await taskManger.listConfig(configDir);

    expect(list.length).toBeGreaterThan(0);
    expect(list.filter((f) => f.indexOf('test1') > -1).length).toEqual(1);
  });

  it('read', async () => {
    const taskManger = new TaskManger();

    const list = await taskManger.listConfig(configDir);
    expect(list.length).toBeGreaterThan(0);

    const taskset = await taskManger.readConfig(list[0]);
    expect(taskset).not.toBeFalsy();
  });

  it('run', async () => {
    const taskManger = new TaskManger({
      tasksPath: './test/config',
      logsPath: os.tmpdir(),
    });
    const result = await taskManger.run('test1');
    expect(result).not.toBeFalsy();
    expect(result['test1']).not.toBeFalsy();
  });
});
