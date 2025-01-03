import 'dotenv/config'
import { createAgent } from './libs/agent.js'
import { TaskManger } from './libs/task-manger.js'

export const doTests = async () => {

  const agent = await createAgent({
    role: 'manage files',
    capabilities: 'handle files on the filesystem',
  })

  const res = await agent.run('Create a directory called test as working dir. Create a file helloworld.txt with no content. Add a new file hello2.txt with ciao in it. List all available files. ')
  agent.log(res)

}

// export const main = () => doTests()
export const main = () => new TaskManger().runTasks()

main().catch(e => console.error(e))