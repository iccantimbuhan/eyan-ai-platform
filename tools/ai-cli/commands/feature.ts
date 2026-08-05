import { buildPrompt } from '../core/builder/index.js'
import { listContextDomains } from '../core/context/index.js'
import { createPrompter } from '../core/input.js'
import { printLine } from '../core/output.js'
import type { PromptRequest } from '../types/index.js'

const PORTFOLIO_MODIFIER_ID = 'portfolio-mode'

function parseContextSelection(raw: string, domains: ReturnType<typeof listContextDomains>): string[] {
  return raw
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= domains.length)
    .map((n) => domains[n - 1].id)
}

// Thin orchestration layer: collect input, build a PromptRequest, call the Prompt
// Builder, print what it returns. No prompt/context/assembly logic lives here.
export async function runFeature(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout
): Promise<number> {
  const prompter = createPrompter(input, output)

  try {
    const featureName = await prompter.ask('Feature name: ')
    const businessGoal = await prompter.ask('Business goal: ')
    const technicalGoal = await prompter.ask('Technical goal: ')

    const domains = listContextDomains()
    printLine('Repository contexts:')
    domains.forEach((domain, index) => {
      printLine(`  ${index + 1}) ${domain.title} — ${domain.description}`)
    })
    const contextSelection = await prompter.ask(
      'Select contexts (comma-separated numbers, or Enter to skip): '
    )
    const contextIds = parseContextSelection(contextSelection, domains)

    const portfolioMode = await prompter.askYesNo('Enable Portfolio Mode?')
    const modifierIds = portfolioMode ? [PORTFOLIO_MODIFIER_ID] : []

    const request: PromptRequest = {
      templateId: 'build-feature',
      contextIds,
      modifierIds,
      variables: {
        feature_name: featureName,
        business_goal: businessGoal,
        technical_goal: technicalGoal,
      },
    }

    const prompt = buildPrompt(request)
    printLine()
    printLine(prompt)
    return 0
  } finally {
    prompter.close()
  }
}
