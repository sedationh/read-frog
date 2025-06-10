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
    const stored = localStorage.getItem(HIGHLIGHT_COLOR_STORAGE_KEY)
    return stored || DEFAULT_HIGHLIGHT_COLOR
  }
  catch (error) {
    console.error('failed to load highlight color:', error)
    return DEFAULT_HIGHLIGHT_COLOR
  }
}

// 保存高亮颜色到 localStorage
export async function saveHighlightColorToStorage(color: string): Promise<void> {
  try {
    localStorage.setItem(HIGHLIGHT_COLOR_STORAGE_KEY, color)
  }
  catch (error) {
    console.error('failed to save highlight color:', error)
  }
}
