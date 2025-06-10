import type { HighlightData } from '../../types/highlight'
import { DEFAULT_HIGHLIGHT_COLOR, HIGHLIGHT_COLOR_STORAGE_KEY, STORAGE_KEY } from './constants'

// 从 localStorage 加载高亮数据
export async function loadHighlightsFromStorage(): Promise<HighlightData[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const highlightDataList: HighlightData[] = JSON.parse(stored)
      return highlightDataList
    }
    else {
      return []
    }
  }
  catch (error) {
    console.error('failed to load highlight data:', error)
    return []
  }
}

// 保存高亮数据到 localStorage
export async function saveHighlightsToStorage(highlightDataList: HighlightData[]): Promise<void> {
  try {
    const dataString = JSON.stringify(highlightDataList)
    localStorage.setItem(STORAGE_KEY, dataString)
  }
  catch (error) {
    console.error('failed to save highlight data:', error)
  }
}

// 清空缓存
export async function clearHighlightsFromStorage(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY)
}

// 从 localStorage 加载高亮颜色
export async function loadHighlightColorFromStorage(): Promise<string> {
  try {
    // 检查 localStorage 是否可用
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage is not available')
      return DEFAULT_HIGHLIGHT_COLOR
    }

    const stored = localStorage.getItem(HIGHLIGHT_COLOR_STORAGE_KEY)
    if (stored === null) {
      return DEFAULT_HIGHLIGHT_COLOR
    }

    // 验证颜色值是否有效
    if (typeof stored === 'string' && stored.length > 0) {
      return stored
    }

    return DEFAULT_HIGHLIGHT_COLOR
  }
  catch (error) {
    console.error('failed to load highlight color:', error)
    return DEFAULT_HIGHLIGHT_COLOR
  }
}

// 保存高亮颜色到 localStorage
export async function saveHighlightColorToStorage(color: string): Promise<void> {
  try {
    // 检查 localStorage 是否可用
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage is not available')
      return
    }

    // 验证颜色值
    if (typeof color !== 'string' || color.length === 0) {
      console.warn('Invalid color value:', color)
      return
    }

    localStorage.setItem(HIGHLIGHT_COLOR_STORAGE_KEY, color)
  }
  catch (error) {
    console.error('failed to save highlight color:', error)
    throw error // 重新抛出错误，让调用方知道保存失败
  }
}
