const VARIABLE_TOKEN_PATTERN = /\{\{\s*(\w+)\s*\}\}/g

/**
 * Unique variable names in a template's prompt body, in order of first
 * appearance. Backs the dynamic VariableForm inputs.
 */
export function extractVariables(promptBody: string): string[] {
  const seen = new Set<string>()
  const variables: string[] = []

  for (const match of promptBody.matchAll(VARIABLE_TOKEN_PATTERN)) {
    const name = match[1]

    if (!seen.has(name)) {
      seen.add(name)
      variables.push(name)
    }
  }

  return variables
}

/**
 * Replaces every {{token}} with the matching value. Values are looked up by
 * name; a variable with no supplied value resolves to an empty string.
 */
export function substituteVariables(
  promptBody: string,
  values: Record<string, string>
): string {
  return promptBody.replace(
    VARIABLE_TOKEN_PATTERN,
    (_match, name: string) => values[name] ?? ''
  )
}
