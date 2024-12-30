


import { Agent, createAgent } from './libs/agent.js';

export const main = async () => {

  const researcher = await createAgent({
    role: 'LLM agent researcher',
    capabilities: 'search for documented best practices for LLM agents'
  })

  const evaluator = await createAgent({
    role: 'evaluate LLM prompt',
    capabilities: 'carefully evaluate LLM prompts and report improvements'
  })


  const promptSample = await researcher.run(`
Create a prompt for an LLM agent that enable parametrized task planning. 
Provide only the prompt as text and add variables placeholder in braces paretheses to be used in a programmatic way.
`)
  console.log('\npromptSample', promptSample)

  const improvements = await evaluator.run(
`Improve the following LLM prompt for parametrized task planning. 
Return a markdon list with precise improvement suggestions. 

PROMPT: 
${promptSample}
`
  )

  console.log('\nimprovements', improvements)

    const improvedPrompt = await researcher.run(`
Improve the prompt based on the following suggestions
${improvements}

The revised prompt must address precisely the suggestions, wihtout undecided options.
Return only the prompt text without additional comments
`)

console.log('\nimprovedPrompt', improvedPrompt)
      
    const tester = await createAgent({
      role: "LLM prompt tester",
      capabilities: "Test LLM prompts and evaluate the quality of response."
    })

    const promptTestResult = await tester.run(improvedPrompt)
    console.log(`\npromptTestResult`, promptTestResult)

    const resEval = await tester.run(`
Evaluate the response of the previous prompt. Only answer with your feedbacks to improve the LLM prompt as generic framework to create planning for tasks. 

${promptTestResult}`)

    console.log(`\nresEval`, resEval)



    const improvedPrompt2 = await researcher.run(`
Improve again the prompt based on the feedbacks collected from the LLM prompt usage. Answer only with the LLM prompt.

Feedbacks
${resEval}
`)

    console.log('\nimprovedPrompt2', improvedPrompt2)

}

main().catch(e => console.error(e))