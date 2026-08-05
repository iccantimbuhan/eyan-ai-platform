import { createPrompter } from '../core/input.js'
import { printLine, printStats } from '../core/output.js'
import { collectPromptRequest } from '../core/promptRequest.js'
import { analyzePromptRequest } from '../core/stats/index.js'

// Thin orchestration layer, same shape as `feature`: collect input, build a
// PromptRequest, hand it to the Stats engine, print what it returns. No
// analysis logic lives here.
export async function runStats(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout
): Promise<number> {
  const prompter = createPrompter(input, output)

  try {
    const request = await collectPromptRequest(prompter)
    const stats = analyzePromptRequest(request)
    printLine()
    printStats(stats)
    return 0
  } finally {
    prompter.close()
  }
}
