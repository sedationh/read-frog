import type { HighlightData } from '@/entrypoints/side.content/atoms'
import getXPath from 'get-xpath'
import { useAtom } from 'jotai'
import { Highlighter, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { highlightsAtom } from '@/entrypoints/side.content/atoms'
import { cn } from '@/utils/tailwind'

export function generateHighlightId(): string {
  return `highlight_${Date.now()}`
}

// Color options for highlighting
const COLOR_OPTIONS = [
  { color: '#fbbf24', name: 'Yellow', meaning: 'highlight' },
  { color: '#60a5fa', name: 'Blue', meaning: 'important' },
  { color: '#34d399', name: 'Green', meaning: 'good' },
  { color: '#f87171', name: 'Red', meaning: 'question' },
  { color: '#a78bfa', name: 'Purple', meaning: 'idea' },
  { color: 'transparent', name: 'Disabled', meaning: 'no_highlight' },
]

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

interface HighlightProps {
  className?: string
}

function Highlight({ className }: HighlightProps) {
  const [highlights, setHighlights] = useAtom(highlightsAtom)
  const [isActive, setIsActive] = useState(true)
  const [highlightColor, setHighlightColor] = useState('#fbbf24') // Default yellow
  const [conflictMessage, setConflictMessage] = useState('')
  const [colorFilter, setColorFilter] = useState<Set<string>>(new Set(['highlight', 'important', 'good', 'question', 'idea']))

  const addHighlight = (highlight: HighlightData) => {
    setHighlights(prev => [...prev, highlight])
  }

  const removeHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id))
    // Also remove from DOM
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

  const removeAllHighlights = () => {
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
    // Clear from state
    setHighlights([])
  }

  const createHighlight = (range: Range, textContent: string) => {
    // Don't create highlight if disabled
    if (!isActive || highlightColor === 'transparent') {
      return
    }

    // 冲突检测
    const conflictResult = checkHighlightConflicts(range)
    if (conflictResult.hasConflict) {
      setConflictMessage(conflictResult.reason || '高亮冲突')
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

      // 保存高亮数据
      addHighlight(highlightData)

      // 创建高亮元素
      if (range.startContainer === range.endContainer) {
        const highlightElement = createHighlightElement(highlightId, highlightColor, textContent)
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

            const span = createHighlightElement(highlightId, highlightColor, segmentRange.toString(), index)
            segmentRange.surroundContents(span)
          }
        })
      }
    }
    catch (error) {
      console.error('创建高亮失败:', error)
    }
  }

  // Get highlights grouped by color/meaning
  const getColorCounts = () => {
    const counts: Record<string, number> = {}
    COLOR_OPTIONS.forEach((option) => {
      counts[option.meaning] = highlights.filter(h => h.color === option.color).length
    })
    return counts
  }

  const colorCounts = getColorCounts()

  // Filter highlights based on selected colors
  const filteredHighlights = highlights.filter((highlight) => {
    const option = COLOR_OPTIONS.find(opt => opt.color === highlight.color)
    return option && colorFilter.has(option.meaning)
  })

  // Toggle color filter
  const toggleColorFilter = (meaning: string) => {
    setColorFilter((prev) => {
      const newFilter = new Set(prev)
      if (newFilter.has(meaning)) {
        newFilter.delete(meaning)
      }
      else {
        newFilter.add(meaning)
      }
      // If all are unchecked, check the first one
      if (newFilter.size === 0) {
        newFilter.add('highlight')
      }
      return newFilter
    })
  }

  // Scroll to highlight
  const scrollToHighlight = (highlight: HighlightData) => {
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

  useEffect(() => {
    if (!isActive || highlightColor === 'transparent')
      return

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
  }, [isActive, highlightColor, highlights])

  return (
    <div className={cn('border-b border-border', className)}>
      {/* Header */}
      <div className="flex w-full items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Highlighter size={16} className="text-blue-500" />
          <span className="text-sm font-medium">Text Highlighter</span>
          {highlights.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
              {highlights.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {highlights.length > 0 && (
            <button
              type="button"
              onClick={removeAllHighlights}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 size={12} />
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded transition-colors',
              isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {isActive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 space-y-3">
        {/* Conflict Message */}
        {conflictMessage && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div className="flex items-center justify-between">
              <span className="text-yellow-800">
                ⚠️
                {' '}
                {conflictMessage}
              </span>
              <button
                type="button"
                onClick={() => setConflictMessage('')}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {isActive && (
          <>
            {/* Color Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-muted-foreground">Colors</h4>
                <div className="text-xs text-muted-foreground">
                  Current:
                  {' '}
                  <span className="font-medium">{COLOR_OPTIONS.find(opt => opt.color === highlightColor)?.name}</span>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                {COLOR_OPTIONS.map(({ color, name, meaning }) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setHighlightColor(color)}
                    title={`${name} - ${meaning}`}
                    className={cn(
                      'w-7 h-7 rounded-md border-2 transition-all hover:scale-110 hover:shadow-md relative',
                      color === 'transparent' && 'bg-gray-100 border-dashed',
                      highlightColor === color
                        ? 'border-gray-600 ring-2 ring-blue-300 ring-opacity-50'
                        : 'border-gray-300 hover:border-gray-500',
                    )}
                    style={{ backgroundColor: color === 'transparent' ? 'transparent' : color }}
                  >
                    {highlightColor === color && color !== 'transparent' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-800 rounded-full opacity-70"></div>
                      </div>
                    )}
                    {highlightColor === color && color === 'transparent' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                {highlightColor === 'transparent' ? '🚫' : '💡'}
                {highlightColor === 'transparent'
                  ? '高亮功能已暂停，选择文本不会创建高亮'
                  : COLOR_OPTIONS.find(opt => opt.color === highlightColor)?.meaning || '选择颜色来标记不同类型的内容'}
              </div>
            </div>

            {/* Highlights List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  Highlights (
                  {filteredHighlights.length}
                  {' '}
                  of
                  {' '}
                  {highlights.length}
                  {' '}
                  shown)
                </h4>
              </div>

              {/* Color Filter Buttons */}
              {highlights.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground">Filter by status:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {COLOR_OPTIONS.filter(option => option.meaning !== 'no_highlight').map(({ color, name, meaning }) => {
                      const count = colorCounts[meaning] || 0
                      const isActiveFilter = colorFilter.has(meaning)
                      const isTransparent = color === 'transparent'

                      if (count === 0)
                        return null

                      return (
                        <button
                          key={meaning}
                          type="button"
                          onClick={() => toggleColorFilter(meaning)}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 text-xs rounded transition-all border',
                            isActiveFilter
                              ? 'border-gray-400 ring-1 ring-blue-300 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300',
                            isTransparent && 'border-dashed',
                          )}
                          title={`${name} highlights (${count})`}
                        >
                          <div
                            className={cn(
                              'w-3 h-3 rounded border border-gray-300',
                              isTransparent && 'bg-gray-100 border-dashed',
                            )}
                            style={{
                              backgroundColor: isTransparent ? 'transparent' : color,
                            }}
                          />
                          <span className={cn(
                            'font-medium',
                            isActiveFilter ? 'text-gray-700' : 'text-gray-500',
                          )}
                          >
                            {name}
                          </span>
                          <span className={cn(
                            'text-xs px-1 py-0.5 rounded-full',
                            isActiveFilter ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600',
                          )}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {filteredHighlights.length > 0
                ? (
                    <div className="space-y-1.5 overflow-y-auto max-h-[400px]">
                      {filteredHighlights.map(highlight => (
                        <div
                          key={highlight.id}
                          className="p-2 bg-muted/50 rounded text-xs group"
                        >
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => scrollToHighlight(highlight)}
                              className="flex-1 truncate text-left hover:text-blue-600 transition-colors cursor-pointer"
                              title="Click to jump to highlight"
                            >
                              "
                              {highlight.textContent.length > 30 ? `${highlight.textContent.substring(0, 30)}...` : highlight.textContent}
                              "
                            </button>
                            <button
                              type="button"
                              onClick={() => removeHighlight(highlight.id)}
                              className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove highlight"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                : (
                    <p className="text-xs text-muted-foreground italic py-2">
                      {highlights.length === 0
                        ? 'Select text on the page to highlight'
                        : `No highlights match the current filter. ${highlights.length} total highlights available.`}
                    </p>
                  )}
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
              💡 Select text to highlight. Click highlighted text to jump to its location.
            </div>

            {/* Debug Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  type="button"
                  onClick={() => {
                    restoreHighlights(highlights)
                  }}
                >
                  Restore All
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Highlight
