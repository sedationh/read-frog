import type { HighlightData } from '@/entrypoints/side.content/atoms'

/**
 * Generate English learning prompt from yellow highlights
 * @param highlights Array of highlight data
 * @returns Formatted prompt string for English learning
 */
export function generateEnglishLearningPrompt(highlights: HighlightData[]): string {
  const yellowHighlights = highlights.filter(h => h.color === '#fbbf24') // Yellow highlights

  if (yellowHighlights.length === 0) {
    return 'No highlighted text found for English learning.'
  }

  const validHighlights = yellowHighlights.filter(h => h.textContent.trim().length > 0)

  if (validHighlights.length === 0) {
    return 'No valid highlighted text found for English learning.'
  }

  const combinedText = validHighlights.map((item, index) => `
${index + 1}.
**Highlight**: "${item.textContent.trim()}"
**Context**: "${item.context}"
**ID**: ${item.id}
`).join('\n')

  return `You are a helpful assistant that explains English vocabulary.
Please explain the highlighted words/phrases from the text below:
- Provide simple definitions in English at this context
- Give 2-3 example sentences for each highlighted word/phrase
- Give American pronunciation for each highlighted word/phrase

${combinedText}

Please return the key points in a JSON format.
The JSON format should be like this:
[
  {
    "highlight": "highlight text",
    "context": "context text",
    "explanation": "explanation text",
    "examples": ["example 1", "example 2"],
    "pronunciation": "美 /ˌpɪktʃə'resk/",
    "id": "highlight_id"
  }
]`
}

/**
 * Copy text to clipboard with fallback
 * @param text Text to copy
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  }
  catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // Fallback: select and copy manually
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

/**
 * Copy English learning prompt to clipboard
 * @param highlights Array of highlight data
 */
export async function copyPromptToClipboard(highlights: HighlightData[]): Promise<void> {
  const prompt = generateEnglishLearningPrompt(highlights)
  await copyToClipboard(prompt)
}
