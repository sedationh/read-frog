import { Highlighter, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useHighlighter } from '../../hooks/useHighlighter'
import { ColorPicker } from '../ui/ColorPicker'
import { HighlightList } from '../ui/HighlightList'

interface HighlightPanelProps {
  containerSelector?: string
  enabled?: boolean
  className?: string
  onHighlightCreated?: () => void
  onHighlightRemoved?: () => void
}

export function HighlightPanel({
  containerSelector = 'body',
  enabled = true,
  className = '',
  onHighlightCreated,
  onHighlightRemoved,
}: HighlightPanelProps) {
  const {
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
  } = useHighlighter({
    enabled,
    containerSelector,
    onHighlightCreated: () => onHighlightCreated?.(),
    onHighlightRemoved: () => onHighlightRemoved?.(),
  })

  // 监听文本选择事件
  useEffect(() => {
    if (!isActive)
      return

    const handleMouseUp = (e: MouseEvent) => {
      // 只处理指定容器内的选择
      const target = e.target as HTMLElement
      const container = document.querySelector(containerSelector)
      if (!container?.contains(target))
        return

      const selection = window.getSelection()
      if (!selection || selection.isCollapsed)
        return

      const range = selection.getRangeAt(0)
      const selectedText = range.toString().trim()
      if (selectedText) {
        createHighlight(range, selectedText)
        selection.removeAllRanges()
      }
    }

    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isActive, createHighlight, containerSelector])

  return (
    <div className={`p-4 bg-white border rounded-lg shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Highlighter size={20} className="text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800">Text Highlighter</h3>
        </div>
        <button
          type="button"
          onClick={toggleActive}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isActive
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isActive ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {isActive && (
        <>
          {/* Conflict Message */}
          {conflictMessage && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-yellow-800">
                  ⚠️
                  {conflictMessage}
                </p>
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

          {/* Color Picker */}
          <ColorPicker
            selectedColor={highlightColor}
            onColorChange={changeHighlightColor}
          />

          {/* Highlight List */}
          <HighlightList
            highlights={highlights}
            onRemoveHighlight={removeHighlight}
          />

          {/* Actions */}
          {highlights.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={removeAllHighlights}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={16} />
                Clear All
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <RotateCcw size={16} />
                Test Restore
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-md">
            💡 Select any text in the target area to create highlights.
            Your highlights are automatically saved and will persist across page reloads.
          </div>
        </>
      )}
    </div>
  )
}
