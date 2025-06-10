import type { HighlightData } from '@/entrypoints/side.content/atoms'
import getXPath from 'get-xpath'
import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { highlightsAtom } from '@/entrypoints/side.content/atoms'

export function generateHighlightId(): string {
  return `highlight_${Date.now()}`
}

function getNodeByXPath(xpath: string): Node | null {
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

function restoreHighlights(highlights: HighlightData[]) {
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

// 从范围恢复高亮
function restoreHighlightFromRange(range: Range, highlightData: HighlightData) {
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

function createHighlightElement(id: string, color: string, selectedText: string, index?: number) {
  const highlightElement = document.createElement('span')
  highlightElement.style.backgroundColor = color
  highlightElement.style.cursor = 'pointer'
  highlightElement.textContent = selectedText
  highlightElement.setAttribute('data-highlight-id', id)
  highlightElement.setAttribute('data-segment-index', index?.toString() || '')

  return highlightElement
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

function Highlight() {
  const [highlights, setHighlights] = useAtom(highlightsAtom)

  const addHighlight = (highlight: HighlightData) => {
    setHighlights(prev => [...prev, highlight])
  }

  const createHighlight = (range: Range, textContent: string) => {
    // 冲突检测
    const conflictResult = checkHighlightConflicts(range)
    if (conflictResult.hasConflict) {
      console.warn('conflictResult', conflictResult)
      return
    }

    try {
      const highlightId = generateHighlightId()

      // 获取开始和结束容器的详细信息
      const startContainer = range.startContainer
      const endContainer = range.endContainer

      // 构建高亮数据，支持跨元素
      const highlightData: HighlightData = {
        id: highlightId,
        textContent,
        color: 'yellow',
        startContainer: {
          xpath: getXPath(startContainer, { ignoreId: true }),
          offset: range.startOffset,
        },
        endContainer: {
          xpath: getXPath(endContainer, { ignoreId: true }),
          offset: range.endOffset,
        },
        timestamp: Date.now(),
      }

      // 保存高亮数据
      addHighlight(highlightData)

      // 创建高亮元素
      if (range.startContainer === range.endContainer) {
        const highlightElement = createHighlightElement(highlightId, 'yellow', textContent)
        range.surroundContents(highlightElement)
      }
      else {
        // 跨元素高亮处理
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

            const span = createHighlightElement(highlightId, 'yellow', segmentRange.toString(), index)
            segmentRange.surroundContents(span)
          }
        })
      }
    }
    catch (error) {
      console.error('创建高亮失败:', error)
    }
  }

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        return
      }

      const range = selection.getRangeAt(0)
      const selectedText = range.toString().trim()
      if (!selectedText.trim()) {
        return
      }

      createHighlight(range, selectedText)
      selection.removeAllRanges()
    }

    // 扩展向页面注入事件监听
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights])

  return (
    <div>
      <button
        className="bg-red-500 text-white p-2 rounded-md"
        type="button"
        onClick={() => {
          setHighlights([])
        }}
      >
        clear
      </button>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        type="button"
        onClick={() => {
          restoreHighlights(highlights)
        }}
      >
        restore
      </button>
      <pre className="max-h-[600px] overflow-y-auto">{JSON.stringify(highlights, null, 2)}</pre>
    </div>
  )
}

export default Highlight
