import type { ColorOption } from '../../types/highlight'

export const COLOR_OPTIONS: ColorOption[] = [
  { color: 'transparent', name: 'None', meaning: 'no_highlight' },
  { color: '#fff3cd', name: 'Yellow', meaning: 'highlight' },
  { color: '#f8d7da', name: 'Red', meaning: 'highlight_and_anki' },
  { color: '#d1ecf1', name: 'Blue', meaning: 'interesting' },
]

export const DEFAULT_HIGHLIGHT_COLOR = '#fff3cd'

export const STORAGE_KEY = 'read-frog-highlights'
export const HIGHLIGHT_COLOR_STORAGE_KEY = 'read-frog-highlight-color'

export const HIGHLIGHT_ATTRIBUTE = 'data-read-frog-highlight'
export const HIGHLIGHT_GROUP_ATTRIBUTE = 'data-highlight-group'
export const HIGHLIGHT_ID_ATTRIBUTE = 'data-highlight-id'
