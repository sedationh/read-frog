import type { HighlightData } from '@/entrypoints/side.content/atoms'
import { sendMessage } from '@/utils/message'

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
- No need to use ** to wrap the highlighted text

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
 * Import highlights from clipboard content
 * @returns Array of imported highlight data
 */
export async function importHighlightsFromClipboard(): Promise<Array<{
  id: string
  explanation: string
  examples: string[]
  pronunciation: string
}>> {
  try {
    const clipboardText = await navigator.clipboard.readText().then(text => text.trim())

    // Try to parse as JSON first (AI response format)
    if (clipboardText.startsWith('[') && clipboardText.endsWith(']')) {
      const jsonData = JSON.parse(clipboardText)

      if (!Array.isArray(jsonData)) {
        throw new TypeError('JSON data should be an array')
      }

      const explanations = []

      for (const item of jsonData) {
        if (item.id && item.explanation) {
          explanations.push({
            id: item.id,
            explanation: item.explanation,
            examples: item.examples || [],
            pronunciation: item.pronunciation || '',
          })
        }
      }

      return explanations
    }

    // For prompt format, return empty array since it doesn't contain explanations
    return []
  }
  catch (error) {
    console.error('Failed to read from clipboard:', error)
    throw new Error('Failed to read from clipboard. Please make sure you have copied a valid JSON response.')
  }
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

const SERVER_URL = 'http://localhost:8765'
const API_VERSION = 6

export async function invokeAnkiConnect(action: string, params = {}) {
  const request = {
    action,
    version: API_VERSION,
    params,
  }

  // Use background script to bypass CORS
  const response = await sendMessage('ANKI_REQUEST', {
    url: SERVER_URL,
    request,
  })

  if (!response.success) {
    throw new Error(response.error || 'Failed to invoke AnkiConnect')
  }

  return response.result
}

export async function addNote(note: HighlightData) {
  const boldContext = note.context.replace(
    new RegExp(note.textContent, 'gi'),
    `<b>$&</b>`,
  )

  const ankiNote = {
    deckName: 'ReadFrog',
    modelName: '问题模板',
    fields: {
      问题: boldContext,
      答案: `${note.pronunciation}<br>${note.explanation}<br>${note.examples?.map(example => `- ${example}`).join('<br>') || ''}`,
      相关知识: `<a href="${note.pageUrl}">${note.pageUrl}</a>`,
    },
    options: {
      allowDuplicate: true,
      duplicateScope: 'deck',
    },
  }

  try {
    const result = await invokeAnkiConnect('addNote', { note: ankiNote })
    return { success: true, result }
  }
  catch (error) {
    console.error(`Error adding note:`, error)
    return { success: false, error }
  }
}
