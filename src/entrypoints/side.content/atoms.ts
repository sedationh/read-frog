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

export const readStateAtom = atom<
  'extracting' | 'analyzing' | 'continue?' | 'explaining' | undefined
>(undefined)

// 定义高亮数据结构
export interface HighlightData {
  id: string
  textContent: string
  color: string
  startContainer: {
    xpath: string
    offset: number
  }
  endContainer: {
    xpath: string
    offset: number
  }
  timestamp: number
  context: string
  // domain + pathname
  pageUrl: string
}

export const highlightsAtom = atomWithStorage<HighlightData[]>('highlightsAtom', [])
