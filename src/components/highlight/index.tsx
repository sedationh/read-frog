import { useEffect } from 'react'

export function generateHighlightId(): string {
  return `highlight_${Date.now()}`
}

function createHighlightElement(color: string, selectedText: string, index?: number) {
  const highlightElement = document.createElement('span')
  highlightElement.style.backgroundColor = color
  highlightElement.textContent = selectedText
  highlightElement.setAttribute('data-highlight-id', generateHighlightId())
  highlightElement.setAttribute('data-segment-index', index?.toString() || '')

  return highlightElement
}

function Highlight() {
  const createHighlight = (range: Range, selectedText: string) => {
    try {
      // 创建高亮元素
      const highlightElement = createHighlightElement('yellow', selectedText)

      if (range.startContainer === range.endContainer) {
        range.surroundContents(highlightElement)
      }
      else {
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

            const span = createHighlightElement('yellow', selectedText, index)
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
  }, [])

  return (
    <div>Highlight</div>
  )
}

export default Highlight
