import type { PrimitiveAtom, SetStateAction } from 'jotai'
import { atom, createStore } from 'jotai'

const storage = {
  getItem: (key: string) => {
    const storedValue = localStorage.getItem(key)
    if (storedValue === null) {
      throw new Error('no value stored')
    }
    return JSON.parse(storedValue)
  },
  setItem: (key: string, newValue: unknown) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  },
}

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
): PrimitiveAtom<Value> {
  const getInitialValue = () => {
    try {
      return storage.getItem(key)
    }
    catch {
      return null
    }
  }

  const _initialValue = getInitialValue()
  if (_initialValue === null) {
    storage.setItem(key, initialValue)
  }
  else {
    initialValue = _initialValue
  }

  const baseAtom = atom(initialValue)

  return atom(
    get => get(baseAtom),
    (get, set, update: SetStateAction<Value>) => {
      const newValue
        = typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(baseAtom))
          : update
      set(baseAtom, newValue)
      storage.setItem(key, newValue)
    },
  )
}

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
  // domain + pathname + query (注意考虑 hash 路由)
  pageUrl: string
  // AI explanation fields (optional)
  explanation?: string
  examples?: string[]
  pronunciation?: string
}

export const highlightsAtom = atomWithStorage<HighlightData[]>('highlightsAtom', [])
