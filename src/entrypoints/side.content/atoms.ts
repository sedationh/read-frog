import { atom, createStore } from 'jotai'

export const store = createStore()

// 侧边栏打开状态的localStorage key
const SIDE_OPEN_STORAGE_KEY = 'read-frog-side-open'

// 从localStorage加载侧边栏状态
function getInitialSideOpenState(): boolean {
  try {
    const stored = localStorage.getItem(SIDE_OPEN_STORAGE_KEY)
    return stored ? JSON.parse(stored) : false
  }
  catch (error) {
    console.error('Failed to load side open state from localStorage:', error)
    return false
  }
}

// 侧边栏状态atom，支持localStorage持久化
export const isSideOpenAtom = atom(
  getInitialSideOpenState(),
  (get, set, newValue: boolean | ((prev: boolean) => boolean)) => {
    if (typeof newValue === 'function') {
      newValue = newValue(get(isSideOpenAtom))
    }
    set(isSideOpenAtom, newValue)
    // 保存到localStorage
    try {
      localStorage.setItem(SIDE_OPEN_STORAGE_KEY, JSON.stringify(newValue))
    }
    catch (error) {
      console.error('Failed to save side open state to localStorage:', error)
    }
  },
)

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
