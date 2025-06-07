import type { HighlightData, HighlightState } from '../types/highlight'
import { useCallback, useEffect, useState } from 'react'
import {
  checkHighlightConflicts,
  clearHighlightsFromStorage,
  createHighlightElement,
  DEFAULT_HIGHLIGHT_COLOR,
  generateHighlightId,
  getTextNodeByPath,
  getTextNodePath,
  loadHighlightsFromStorage,
  removeHighlightElement,
  saveHighlightsToStorage,
} from '../utils/highlight'

export interface UseHighlighterOptions {
  enabled?: boolean
  containerSelector?: string
  onHighlightCreated?: (highlight: HighlightData) => void
  onHighlightRemoved?: (id: string) => void
}

export function useHighlighter(options: UseHighlighterOptions = {}) {
  const {
    enabled = true,
    containerSelector = 'body',
    onHighlightCreated,
    onHighlightRemoved,
  } = options

  const [isActive, setIsActive] = useState(enabled)
  const [highlights, setHighlights] = useState<HighlightState[]>([])
  const [highlightColor, setHighlightColor] = useState(DEFAULT_HIGHLIGHT_COLOR)
  const [conflictMessage, setConflictMessage] = useState('')

  // 创建单元素高亮
  const createSingleElementHighlight = useCallback((
    range: Range,
    text: string,
    color: string,
    id: string,
    isRestoringMode: boolean = false,
    restoredHighlights?: HighlightState[],
  ) => {
    const span = createHighlightElement(color, id)
    range.surroundContents(span)

    const newHighlight: HighlightState = {
      id,
      text,
      element: span,
    }

    if (isRestoringMode && restoredHighlights) {
      restoredHighlights.push(newHighlight)
    }
    else if (!isRestoringMode) {
      setHighlights(prev => [...prev, newHighlight])
    }
  }, [])

  // 创建分段高亮
  const createSegmentedHighlight = useCallback((
    range: Range,
    text: string,
    color: string,
    id: string,
    isRestoringMode: boolean = false,
    restoredHighlights?: HighlightState[],
  ) => {
    const segments: HTMLElement[] = []

    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        },
      },
    )

    const textNodes: Text[] = []
    let currentNode = walker.nextNode() as Text
    while (currentNode) {
      textNodes.push(currentNode)
      currentNode = walker.nextNode() as Text
    }

    textNodes.forEach((textNode, index) => {
      let startOffset = 0
      let endOffset = textNode.textContent?.length || 0

      if (textNode === range.startContainer) {
        startOffset = range.startOffset
      }
      if (textNode === range.endContainer) {
        endOffset = range.endOffset
      }

      if (startOffset < endOffset) {
        const segmentRange = document.createRange()
        segmentRange.setStart(textNode, startOffset)
        segmentRange.setEnd(textNode, endOffset)

        const span = createHighlightElement(color, id, true, index)
        segmentRange.surroundContents(span)
        segments.push(span)
      }
    })

    const newHighlight: HighlightState = {
      id,
      text,
      element: segments[0],
      segments,
    }

    if (isRestoringMode && restoredHighlights) {
      restoredHighlights.push(newHighlight)
    }
    else if (!isRestoringMode) {
      setHighlights(prev => [...prev, newHighlight])
    }
  }, [])

  // 从 Range 创建高亮（支持持久化恢复）
  const createHighlightFromRange = useCallback((
    range: Range,
    text: string,
    color: string,
    id: string,
    isRestoringMode: boolean = false,
    restoredHighlights?: HighlightState[],
  ) => {
    if (range.startContainer === range.endContainer) {
      createSingleElementHighlight(range, text, color, id, isRestoringMode, restoredHighlights)
    }
    else {
      createSegmentedHighlight(range, text, color, id, isRestoringMode, restoredHighlights)
    }
  }, [createSingleElementHighlight, createSegmentedHighlight])

  // 从存储的数据恢复高亮
  const restoreHighlights = useCallback(async (highlightDataList: HighlightData[]) => {
    const container = document.querySelector(containerSelector)
    if (!container) {
      console.error(`Container not found: ${containerSelector}`)
      return
    }

    const restoredHighlights: HighlightState[] = []

    for (const data of highlightDataList) {
      try {
        const startNode = getTextNodeByPath(data.startPath, container as Element)
        const endNode = getTextNodeByPath(data.endPath, container as Element)

        if (startNode && endNode) {
          const range = document.createRange()
          range.setStart(startNode, data.startOffset)
          range.setEnd(endNode, data.endOffset)

          createHighlightFromRange(range, data.text, data.color, data.id, true, restoredHighlights)
        }
        else {
          console.warn(`Failed to restore highlight ${data.id}: text nodes not found`)
        }
      }
      catch (error) {
        console.error(`Failed to restore highlight ${data.id}:`, error)
      }
    }

    if (restoredHighlights.length > 0) {
      setHighlights(restoredHighlights)
    }
  }, [containerSelector, createHighlightFromRange])

  // 创建高亮（用户选择时调用）
  const createHighlight = useCallback((range: Range, text: string) => {
    const conflictCheck = checkHighlightConflicts(range)
    if (conflictCheck.hasConflict) {
      setConflictMessage(conflictCheck.reason || 'Selection range has conflicts')
      setTimeout(() => setConflictMessage(''), 3000)
      return
    }

    const highlightId = generateHighlightId()
    const containerDom = document.querySelector(containerSelector)
    if (!containerDom) {
      console.error(`Container not found: ${containerSelector}`)
      return
    }

    const originalData: HighlightData = {
      id: highlightId,
      text,
      color: highlightColor,
      timestamp: Date.now(),
      selector: containerSelector,
      startPath: getTextNodePath(range.startContainer, containerDom as Element),
      startOffset: range.startOffset,
      endPath: getTextNodePath(range.endContainer, containerDom as Element),
      endOffset: range.endOffset,
      isSegmented: range.startContainer !== range.endContainer,
    }

    createHighlightFromRange(range, text, highlightColor, highlightId)

    // 保存到存储
    loadHighlightsFromStorage().then((stored) => {
      const updatedData = [...stored, originalData]
      saveHighlightsToStorage(updatedData)
      onHighlightCreated?.(originalData)
    })
  }, [highlightColor, containerSelector, onHighlightCreated, createHighlightFromRange])

  // 移除高亮
  const removeHighlight = useCallback((id: string) => {
    const highlight = highlights.find(h => h.id === id)
    if (!highlight)
      return

    if (highlight.segments && highlight.segments.length > 0) {
      highlight.segments.forEach((segment) => {
        removeHighlightElement(segment)
      })
    }
    else {
      removeHighlightElement(highlight.element)
    }

    setHighlights(prev => prev.filter(h => h.id !== id))

    // 从存储中移除
    setTimeout(() => {
      loadHighlightsFromStorage().then((stored) => {
        const filteredData = stored.filter(data => data.id !== id)
        saveHighlightsToStorage(filteredData)
        onHighlightRemoved?.(id)
      })
    }, 100)
  }, [highlights, onHighlightRemoved])

  // 移除所有高亮
  const removeAllHighlights = useCallback(() => {
    highlights.forEach((highlight) => {
      if (highlight.segments && highlight.segments.length > 0) {
        highlight.segments.forEach((segment) => {
          removeHighlightElement(segment)
        })
      }
      else {
        removeHighlightElement(highlight.element)
      }
    })
    setHighlights([])
    clearHighlightsFromStorage()
  }, [highlights])

  // 更改高亮颜色
  const changeHighlightColor = useCallback((color: string) => {
    setHighlightColor(color)
  }, [])

  // 切换扩展状态
  const toggleActive = useCallback(() => {
    setIsActive(!isActive)
    if (isActive) {
      removeAllHighlights()
    }
  }, [isActive, removeAllHighlights])

  // 页面加载时恢复高亮数据
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        loadHighlightsFromStorage().then((stored) => {
          if (stored.length > 0) {
            restoreHighlights(stored)
          }
        })
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isActive, restoreHighlights])

  return {
    isActive,
    highlights,
    highlightColor,
    conflictMessage,
    createHighlight,
    removeHighlight,
    removeAllHighlights,
    changeHighlightColor,
    toggleActive,
    setConflictMessage,
  }
}
