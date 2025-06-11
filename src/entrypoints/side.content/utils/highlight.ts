import type { HighlightData } from '../atoms'
import getXPath from 'get-xpath'

export function generateHighlightId(): string {
  return `highlight_${Date.now()}`
}

export function getNodeByXPath(xpath: string): Node | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    )
    return result.singleNodeValue
  }
  catch (error) {
    console.error('XPath查找失败:', error, xpath)
    return null
  }
}

export function createHighlightData(range: Range, highlightColor: string) {
  const highlightId = generateHighlightId()

  // 获取开始和结束容器的详细信息
  const startContainer = range.startContainer
  const endContainer = range.endContainer

  // 构建高亮数据，支持跨元素
  const highlightData: HighlightData = {
    id: highlightId,
    textContent: range.toString().trim(),
    color: highlightColor,
    startContainer: {
      xpath: getXPath(startContainer, { ignoreId: true }),
      offset: range.startOffset,
    },
    endContainer: {
      xpath: getXPath(endContainer, { ignoreId: true }),
      offset: range.endOffset,
    },
    timestamp: Date.now(),
    context: '',
    pageUrl: window.location.origin + window.location.pathname,
  }

  return highlightData
}

export function removeHighlight(id: string) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  elements.forEach((element) => {
    const parent = element.parentNode
    if (parent) {
      parent.insertBefore(document.createTextNode(element.textContent || ''), element)
      parent.removeChild(element)
      parent.normalize()
    }
  })
}

export function removeAllHighlights(highlights: HighlightData[]) {
  // Remove from DOM
  highlights.forEach((highlight) => {
    const elements = document.querySelectorAll(`[data-highlight-id="${highlight.id}"]`)
    elements.forEach((element) => {
      const parent = element.parentNode
      if (parent) {
        parent.insertBefore(document.createTextNode(element.textContent || ''), element)
        parent.removeChild(element)
        parent.normalize()
      }
    })
  })
}

// 从范围恢复高亮
export function restoreHighlightFromRange(range: Range, highlightData: HighlightData) {
  if (range.startContainer === range.endContainer) {
    const highlightElement = createHighlightElement(
      highlightData.id,
      highlightData.color,
      highlightData.textContent,
    )
    range.surroundContents(highlightElement)
  }
  else {
    // 跨元素高亮
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        },
      },
    )

    const textNodes: Node[] = []
    let currentNode = walker.nextNode()
    while (currentNode) {
      textNodes.push(currentNode)
      currentNode = walker.nextNode()
    }

    textNodes.forEach((textNode, index) => {
      let nodeStartOffset = 0
      let nodeEndOffset = textNode.textContent?.length || 0

      if (textNode === range.startContainer) {
        nodeStartOffset = range.startOffset
      }
      if (textNode === range.endContainer) {
        nodeEndOffset = range.endOffset
      }

      if (nodeStartOffset < nodeEndOffset) {
        const segmentRange = document.createRange()
        segmentRange.setStart(textNode, nodeStartOffset)
        segmentRange.setEnd(textNode, nodeEndOffset)

        const highlightElement = createHighlightElement(
          highlightData.id,
          highlightData.color,
          segmentRange.toString(),
          index,
        )
        segmentRange.surroundContents(highlightElement)
      }
    })
  }
}

export function createHighlightElement(id: string, color: string, selectedText: string, index?: number) {
  const highlightElement = document.createElement('span')
  highlightElement.style.backgroundColor = color
  highlightElement.style.cursor = 'pointer'
  highlightElement.textContent = selectedText
  highlightElement.setAttribute('data-highlight-id', id)
  highlightElement.setAttribute('data-segment-index', index?.toString() || '')

  return highlightElement
}

export function restoreHighlights(highlights: HighlightData[]) {
  highlights.forEach((highlight) => {
    try {
      const startNode = getNodeByXPath(highlight.startContainer.xpath)
      const endNode = getNodeByXPath(highlight.endContainer.xpath)

      if (!startNode || !endNode) {
        console.warn('无法找到高亮的起始或结束节点:', highlight)
        return
      }

      const range = document.createRange()

      range.setStart(startNode, highlight.startContainer.offset)
      range.setEnd(endNode, highlight.endContainer.offset)

      restoreHighlightFromRange(range, highlight)
    }
    catch (error) {
      console.error('恢复高亮失败:', error, highlight)
    }
  })
}

interface ConflictCheckResult {
  hasConflict: boolean
  reason?: string
  conflictElement?: Element
}

export function checkHighlightConflicts(range: Range): ConflictCheckResult {
  // 检查选择范围内是否已包含高亮元素
  const container = range.commonAncestorContainer instanceof Element
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement || document

  const existingHighlights = container.querySelectorAll('[data-highlight-id]') as NodeListOf<Element>

  for (const highlight of existingHighlights) {
    // 检查是否在选择范围内
    if (range.intersectsNode(highlight)) {
      return {
        hasConflict: true,
        reason: '选择范围与现有高亮重叠',
        conflictElement: highlight,
      }
    }
  }

  // 检查选择范围是否完全在某个高亮内部
  let currentNode = range.startContainer
  while (currentNode && currentNode !== document.body) {
    if (currentNode instanceof Element && currentNode.hasAttribute('data-highlight-id')) {
      return {
        hasConflict: true,
        reason: '选择范围在现有高亮内部',
        conflictElement: currentNode,
      }
    }
    currentNode = currentNode.parentNode as Node
  }

  return { hasConflict: false }
}

// Scroll to highlight
export function scrollToHighlight(highlight: HighlightData) {
  const element = document.querySelector(`[data-highlight-id="${highlight.id}"]`)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })

    // Add temporary highlight effect
    const originalBoxShadow = (element as HTMLElement).style.boxShadow
    const originalTransition = (element as HTMLElement).style.transition

      ;(element as HTMLElement).style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.5)'
    ;(element as HTMLElement).style.transition = 'box-shadow 0.3s ease'

    setTimeout(() => {
      ;(element as HTMLElement).style.boxShadow = originalBoxShadow
      ;(element as HTMLElement).style.transition = originalTransition
    }, 2000)
  }
}
