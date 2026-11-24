/**
 * The body of an entry written with a framework: each answered prompt followed by its answer,
 * separated by a blank line. Unanswered (blank) prompts are left out, so an empty result means
 * there's nothing to save.
 */
export function composeFrameworkBody(prompts: readonly string[], answers: readonly string[]) {
  return prompts
    .map((prompt, index) => ({ prompt, answer: answers[index]?.trim() ?? '' }))
    .filter(({ answer }) => answer !== '')
    .map(({ prompt, answer }) => `${prompt}\n${answer}`)
    .join('\n\n')
}
