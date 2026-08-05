import { listContextDomains } from './context/index.js'
import type { Prompter } from './input.js'
import { printLine } from './output.js'
import type { PromptRequest } from '../types/index.js'

const PORTFOLIO_MODIFIER_ID = 'portfolio-mode'

function parseContextSelection(raw: string, domains: ReturnType<typeof listContextDomains>): string[] {
  return raw
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= domains.length)
    .map((n) => domains[n - 1].id)
}

// Shared by every command that needs to build a build-feature PromptRequest
// interactively (feature, stats). Owns only input collection — the resulting
// request is handed to the Prompt Builder by the caller.
export async function collectPromptRequest(prompter: Prompter): Promise<PromptRequest> {
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

  return {
    templateId: 'build-feature',
    contextIds,
    modifierIds,
    variables: {
      feature_name: featureName,
      business_goal: businessGoal,
      technical_goal: technicalGoal,
    },
  }
}
