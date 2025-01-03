import * as fs from 'fs/promises';
import YAML from 'js-yaml';
import { Agent, createAgent } from './libs/agent.js';
import { listConfig, readConfig } from './libs/config-loader.js';
import { CoordinatorAgentConfig, createCoordinator } from './libs/coordinator.js';

export const runTasks = async () => {

  const files = await listConfig()
  console.log(`Found ${files.length} configurations`)

  for await (const file of files) {

    console.log(`Running ${file}`)

    const config = await readConfig(file)

    const agents: Agent[] = []

    for (const agentConfig of config.agents) {
      agents.push(await createAgent(agentConfig))
    }

    console.log(`Loaded ${agents.length} agents`)

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
   
      const coordinator = await createCoordinator(coordinatorConfig)
      console.log(`Starting task ${coordinatorConfig.task}`)
      const res = await coordinator.run(coordinatorConfig.task)

      await fs.mkdir('./tmp', { recursive: true })
      await fs.writeFile(`./tmp/run-${Date.now()}.yaml`, YAML.dump(res))

    }

  }
}

// export const main = async () => {

//   const agent = await createAgent({
//     role: 'manage files',
//     capabilities: 'handle files on the filesystem',
//   })

//   const res = await agent.run('Create a file helloworld.txt with no content. Add a new file hello2.txt with ciao in it. List all available files. ')
//   agent.log(res)

// }

export const main = () => runTasks()

main().catch(e => console.error(e))