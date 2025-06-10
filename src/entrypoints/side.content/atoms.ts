import { atom, createStore } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const store = createStore()

export const isSideOpenAtom = atomWithStorage('isSideOpenAtom', false)

export const progressAtom = atom({
  completed: 0,
  total: 0,
})

// Translation port atom for browser.runtime.connect
export const translationPortAtom = atom<Browser.runtime.Port | null>(null)
export const enablePageTranslationAtom = atom(false)

// export const explainAtom = atomWithMutation(() => ({
//   mutationKey: ["explainArticle"],
//   mutationFn: mutationFn,
// }));

export const readStateAtom = atom<
  'extracting' | 'analyzing' | 'continue?' | 'explaining' | undefined
>(undefined)

// Highlight storage - storing only serializable data
interface StoredHighlight {
  id: string
  text: string
  color: string
  timestamp: number
  // Store selection info to recreate highlights
  selectionData: {
    startXPath: string
    startOffset: number
    endXPath: string
    endOffset: number
  }
  // Additional metadata
  url?: string
  title?: string
  isSegmented?: boolean
}

export const highlightsAtom = atomWithStorage<StoredHighlight[]>('highlightsAtom', [])
