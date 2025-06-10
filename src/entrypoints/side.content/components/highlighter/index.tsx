import type { HighlightState } from '@/types/highlight'
import { kebabCase } from 'case-anything'
import { Clipboard, Database, FileText, Highlighter, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAnki } from '@/hooks/useAnki'
import { useHighlighter } from '@/hooks/useHighlighter'
import { APP_NAME } from '@/utils/constants/app'
import { COLOR_OPTIONS, saveHighlightsToStorage } from '@/utils/highlight'

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

interface HighlighterSectionProps {
  className?: string
}

export function HighlighterSection({ className }: HighlighterSectionProps) {
  const {
    isActive,
    highlights,
    highlightColor,
    conflictMessage,
    highlightData,
    isExporting,
    isImporting,
    isGenerating,
    createHighlight,
    removeHighlight,
    removeAllHighlights,
    changeHighlightColor,
    toggleActive,
    setConflictMessage,
    copyPrompt,
    importExplanationsFromClipboard,
    generateExplanations,
    getHighlightData,
    getHighlightStats,
  } = useHighlighter({
    enabled: true,
    containerSelector: 'body',
  })

  const [showExplanations, setShowExplanations] = useState(true)
  const [highlightStats, setHighlightStats] = useState({ total: 0, highlight: 0, exportedToAnki: 0 })
  const [colorFilter, setColorFilter] = useState<Set<string>>(new Set(['highlight']))

  // Anki integration
  const {
    isExporting: isExportingToAnki,
    exportHighlightsWithExplanations,
  } = useAnki()

  // 颜色过滤切换功能
  const toggleColorFilter = (status: string) => {
    setColorFilter((prev) => {
      const newFilter = new Set(prev)
      if (newFilter.has(status)) {
        newFilter.delete(status)
      }
      else {
        newFilter.add(status)
      }
      // 如果全部取消选择，则默认选择 highlight
      if (newFilter.size === 0) {
        newFilter.add('highlight')
      }
      return newFilter
    })
  }

  // 获取过滤后的高亮列表
  const filteredHighlights = highlights.filter((highlight) => {
    const data = highlightData.find(d => d.id === highlight.id)
    const status = data?.status || 'highlight'
    return colorFilter.has(status)
  })

  // 获取按状态分组的统计信息
  const getStatusCounts = () => {
    const counts = {
      highlight: 0,
      highlight_and_anki: 0,
      interesting: 0,
      no_highlight: 0,
    }

    highlightData.forEach((data) => {
      const status = data.status || 'highlight'
      if (status in counts) {
        counts[status as keyof typeof counts]++
      }
    })

    return counts
  }

  const statusCounts = getStatusCounts()

  // 处理复制 Prompt
  const handleCopyPrompt = async () => {
    try {
      await copyPrompt()
      toast.success('Prompt copied to clipboard!')
    }
    catch (error) {
      toast.error(`Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 处理从剪贴板导入解释
  const handleImportFromClipboard = async () => {
    try {
      const count = await importExplanationsFromClipboard()
      toast.success(`Successfully imported ${count} explanations from clipboard!`)
      // 刷新数据显示
      await getHighlightData()
    }
    catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 处理生成解释
  const handleGenerateExplanations = async () => {
    try {
      const count = await generateExplanations()
      toast.success(`Successfully generated explanations for ${count} highlights!`)
      // 刷新数据显示
      await getHighlightData()
    }
    catch (error) {
      toast.error(`Generate explanations failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 处理导出到 Anki
  const handleExportToAnki = async () => {
    try {
      const result = await exportHighlightsWithExplanations()
      toast.success(`Successfully exported ${result.added} cards to Anki! Exported highlights are now marked as exported.`)

      // 如果有成功导出的高亮，将状态改为 'highlight_and_anki' 并更改颜色
      // if (result.exportedHighlightIds.length > 0) {
      //   const updatedHighlights = highlightsToExport.map((h) => {
      //     if (result.exportedHighlightIds.includes(h.id)) {
      //       return {
      //         ...h,
      //         status: 'highlight_and_anki' as const,
      //         color: '#f8d7da', // 红色，表示已导出到Anki
      //       }
      //     }
      //     return h
      //   })
      //   await saveHighlightsToStorage(updatedHighlights)
      // }

      if (result.exportedHighlightIds && result.exportedHighlightIds.length > 0) {
        // eslint-disable-next-line array-callback-return
        highlightData.map((h) => {
          if (result.exportedHighlightIds.includes(h.id)) {
            h.status = 'highlight_and_anki'
            h.color = '#f8d7da'
          }
        })
        await saveHighlightsToStorage(highlightData)
        await getHighlightData()
        await getHighlightStats()
      }
    }
    catch (error) {
      toast.error(`Anki export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 加载解释数据
  useEffect(() => {
    if (isActive && highlights.length > 0) {
      getHighlightData()
    }
  }, [isActive, highlights.length, getHighlightData])

  // 加载统计数据
  useEffect(() => {
    const loadStats = async () => {
      const stats = await getHighlightStats()
      setHighlightStats(stats)
    }
    if (isActive) {
      loadStats()
    }
  }, [isActive, highlights.length, getHighlightStats])

  // 滚动到高亮位置
  const scrollToHighlight = (highlight: HighlightState) => {
    const element = highlight.element
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })

      // 获取所有需要高亮的元素（包括segments）
      const elementsToHighlight = highlight.segments && highlight.segments.length > 0
        ? highlight.segments
        : [element]

      // 添加临时高亮效果到所有元素
      elementsToHighlight.forEach((el) => {
        el.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.5)'
        el.style.transition = 'box-shadow 0.3s ease'
      })

      setTimeout(() => {
        elementsToHighlight.forEach((el) => {
          el.style.boxShadow = ''
          el.style.transition = ''
        })
      }, 2000)
    }
  }

  // 监听文本选择事件
  useEffect(() => {
    if (!isActive || highlightColor === 'transparent')
      return

    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // 排除扩展自身的shadow root
      if (target.closest('[data-wxt-shadow-root]')
        || target.closest(`[id*="${kebabCase(APP_NAME)}"]`)) {
        return
      }

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
  }, [isActive, createHighlight])

  return (
    <div className={cn('border-b border-border', className)}>
      {/* Header */}
      <div className="flex w-full items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Highlighter size={16} className="text-blue-500" />
          <span className="text-sm font-medium">Text Highlighter</span>
          {highlightStats.total > 0 && (
            <div className="flex items-center gap-1">
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                {highlightStats.highlight}
              </span>
              {highlightStats.exportedToAnki > 0 && (
                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                  {highlightStats.exportedToAnki}
                </span>
              )}
            </div>
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
            onClick={() => toggleActive()}
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
            {/* Enhanced Color Picker */}
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
                    onClick={() => changeHighlightColor(color)}
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
                {' '}
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
                {highlights.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowExplanations(!showExplanations)}
                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      title="Toggle explanations view"
                    >
                      {showExplanations ? 'Hide' : 'Show'}
                      {' '}
                      Explanations
                    </button>
                  </div>
                )}
              </div>

              {/* Color Filter Buttons */}
              {highlights.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground">Filter by status:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {COLOR_OPTIONS.filter(option => option.meaning !== 'no_highlight').map(({ color, name, meaning }) => {
                      const count = statusCounts[meaning as keyof typeof statusCounts] || 0
                      const isActive = colorFilter.has(meaning)
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
                            isActive
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
                            isActive ? 'text-gray-700' : 'text-gray-500',
                          )}
                          >
                            {name}
                          </span>
                          <span className={cn(
                            'text-xs px-1 py-0.5 rounded-full',
                            isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600',
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
                    <div className="space-y-1.5 overflow-y-auto max-h-100">
                      {filteredHighlights.map((highlight) => {
                        const data = highlightData.find(d => d.id === highlight.id)
                        return (
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
                                {highlight.text.length > 30 ? `${highlight.text.substring(0, 30)}...` : highlight.text}
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
                            {showExplanations && data?.explanation && (
                              <div className="mt-2 p-2 bg-white/80 rounded border border-gray-200">
                                <div className="text-xs text-gray-700 mb-1">
                                  <strong>Explanation:</strong>
                                  {' '}
                                  {data.explanation}
                                </div>
                                {data.examples && data.examples.length > 0 && (
                                  <div className="text-xs text-gray-600 mb-1">
                                    <strong>Examples:</strong>
                                    <ul className="list-disc list-inside ml-2 mt-1">
                                      {data.examples.slice(0, 2).map((example, idx) => (
                                        <li key={idx}>{example}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {data.pronunciation && (
                                  <div className="text-xs text-gray-600">
                                    <strong>Pronunciation:</strong>
                                    {' '}
                                    {data.pronunciation}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
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

            {/* Export/Import Section */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">AI Explanations</h4>
              <div className="space-y-2">
                {/* Copy Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    disabled={isExporting}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    title="Copy AI prompt to clipboard for generating explanations"
                  >
                    <FileText size={12} />
                    {isExporting ? 'Copying...' : 'Copy Prompt'}
                  </button>
                  <button
                    type="button"
                    onClick={handleImportFromClipboard}
                    disabled={isImporting}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    title="Import AI explanations from clipboard"
                  >
                    <Clipboard size={12} />
                    {isImporting ? 'Importing...' : 'Import from Clipboard'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateExplanations}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    title="Generate explanations using configured AI model"
                  >
                    <Sparkles size={12} />
                    {isGenerating ? 'Generating...' : 'Generate Explanations'}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportToAnki}
                    disabled={isExportingToAnki}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    title="Export highlights with explanations to Anki"
                  >
                    <Database size={12} />
                    {isExportingToAnki ? 'Exporting...' : 'Export to Anki'}
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
              💡 Select text to highlight. Click highlighted text to jump to its location.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
