import type { HighlightData } from '@/entrypoints/side.content/atoms'
import { useGetState, useLocalStorageState } from 'ahooks'
import { useAtom } from 'jotai'
import { Check, ChevronDown, ChevronRight, Copy, Download, FileText, Highlighter, Loader2, Palette, StickyNote, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { highlightsAtom } from '@/entrypoints/side.content/atoms'
import { addNote, copyPromptToClipboard, importHighlightsFromClipboard } from '@/entrypoints/side.content/utils/anki'
import { cn } from '@/utils/tailwind'
import { buildPageUrl, checkHighlightConflicts, createHighlightData, removeAllHighlights, removeHighlight, restoreHighlightFromRange, restoreHighlights, scrollToHighlight } from '../../utils/highlight'
import { NoteDialog } from './NoteDialog'

// Color options for highlighting
const COLOR_OPTIONS = [
  { color: 'transparent', name: 'Disabled', meaning: 'no_highlight' },
  { color: '#fbbf24', name: 'Yellow', meaning: 'highlight' },
  { color: '#e5e7eb', name: 'Gray', meaning: 'has_add_to_anki' },
  { color: '#34d399', name: 'Light Green', meaning: 'good' },
]

function Highlight() {
  const [highlights, setHighlights] = useAtom(highlightsAtom)
  const [isActive, setIsActive] = useState(true)
  const [highlightColor, setHighlightColor] = useLocalStorageState('highlightColor', {
    defaultValue: COLOR_OPTIONS[0].color,
  }) // Default yellow
  const [conflictMessage, setConflictMessage] = useState('')
  const [colorFilter, setColorFilter] = useState<Set<string>>(() => new Set(COLOR_OPTIONS.map(v => v.meaning)))
  const [buttonStates, setButtonStates] = useState<Record<string, 'idle' | 'loading' | 'success'>>({
    copyPrompt: 'idle',
    importPrompt: 'idle',
    exportAnki: 'idle',
  })
  const [openColorPicker, setOpenColorPicker] = useState<string | null>(null)
  const [noteDialog, setNoteDialog] = useState<{ isOpen: boolean, highlightId: string | null, initialNote?: string }>({
    isOpen: false,
    highlightId: null,
  })
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  // const lastPageUrl = useRef(buildPageUrl())
  const [_, setLastPageUrl, getLastPageUrl] = useGetState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePageChange = () => {
      removeAllHighlights(highlights)
      restoreHighlights(highlights)
    }
    // 用 setInterval 来监听
    const interval = setInterval(() => {
      if (getLastPageUrl() === buildPageUrl()) {
        return
      }
      handlePageChange()
      setLastPageUrl(() => buildPageUrl())
    }, 200)
    return () => {
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights])

  const addHighlight = (highlight: HighlightData) => {
    setHighlights(prev => [...prev, highlight])
  }

  // Change color of existing highlight
  const changeHighlightColor = (highlightId: string, newColor: string) => {
    const newHighlights = highlights.map(h => h.id === highlightId ? { ...h, color: newColor } : h)
    setHighlights(newHighlights)
    removeAllHighlights(highlights)
    restoreHighlights(newHighlights)
  }

  // Handle button feedback
  const handleButtonClick = async (buttonKey: string, action: () => Promise<void> | void) => {
    setButtonStates(prev => ({ ...prev, [buttonKey]: 'loading' }))
    try {
      await action()
      setButtonStates(prev => ({ ...prev, [buttonKey]: 'success' }))
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, [buttonKey]: 'idle' }))
      }, 2000)
    }
    catch (error) {
      console.error('Button action failed:', error)
      setButtonStates(prev => ({ ...prev, [buttonKey]: 'idle' }))
    }
  }

  const createHighlight = (range: Range) => {
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
      const highlightData = createHighlightData(range, highlightColor)

      // 保存高亮数据
      addHighlight(highlightData)

      restoreHighlightFromRange(range, highlightData)
    }
    catch (error) {
      console.error('创建高亮失败:', error)
    }
  }

  // Get highlights grouped by color/meaning
  const getColorCounts = () => {
    const counts: Record<string, number> = {}
    COLOR_OPTIONS.forEach((option) => {
      counts[option.meaning] = highlights.filter(h => h.color === option.color && h.pageUrl === buildPageUrl()).length
    })
    return counts
  }

  const colorCounts = getColorCounts()

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

  function scrollToHighlightWithList(highlight: HighlightData) {
    const listItem = containerRef?.current?.querySelector(`[data-highlight-item="${highlight.id}"]`)
    if (!listItem) {
      return
    }
    listItem.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })
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

      createHighlight(range)
      selection.removeAllRanges()
    }

    // 扩展向页面注入事件监听
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, highlightColor, highlights])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const highlightId = target?.getAttribute('data-highlight-id')
      if (highlightId) {
        // 在当前 highlights 中查找对应的 highlight
        const highlight = highlights.find(h => h.id === highlightId)
        if (highlight) {
          scrollToHighlightWithList(highlight)
        }
      }
    }
    window.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('click', handleClick)
    }
  }, [highlights])

  const currentHighlights = highlights.filter(h => h.pageUrl === buildPageUrl())

  // Filter highlights based on selected colors
  const filteredHighlights = currentHighlights.filter((highlight) => {
    const option = COLOR_OPTIONS.find(opt => opt.color === highlight.color)
    return option && colorFilter.has(option.meaning)
  })

  return (
    <div className={cn('border-b border-border')}>
      <div className="flex w-full items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Highlighter size={16} className="text-blue-500" />
          <span className="text-sm font-medium">Text Highlighter</span>
          {currentHighlights.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
              {currentHighlights.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentHighlights.length > 0 && (
            <button
              type="button"
              onClick={() => {
                removeAllHighlights(highlights)
                setHighlights(highlights.filter(h => h.pageUrl !== buildPageUrl()))
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 size={12} />
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const nextState = !isActive
              setIsActive(nextState)
              if (nextState === false) {
                removeAllHighlights(highlights)
              }
              else {
                restoreHighlights(highlights)
              }
            }}
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
                  {currentHighlights.length}
                  {' '}
                  shown)
                </h4>
              </div>

              {/* Color Filter Buttons */}
              {currentHighlights.length > 0 && (
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
                    <div
                      className="space-y-2 overflow-y-auto max-h-[600px]"
                      ref={containerRef}
                    >
                      {filteredHighlights.map(highlight => (
                        <div
                          key={highlight.id}
                          className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm group transition-colors duration-200 border border-gray-200"
                          data-highlight-item={highlight.id}
                        >
                          <div
                            style={{
                              backgroundColor: highlight.color,
                            }}
                            className="flex items-center justify-between p-1 rounded"
                          >
                            <button
                              type="button"
                              onClick={() => scrollToHighlight(highlight)}
                              className="flex-1 truncate text-left hover:text-blue-600 transition-colors cursor-pointer font-medium"
                              title="Click to jump to highlight"
                            >
                              "
                              {highlight.textContent.length > 40 ? `${highlight.textContent.substring(0, 40)}...` : highlight.textContent}
                              "
                            </button>
                            <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                              {/* Color change dropdown */}
                              <div className="relative color-picker-container">
                                <button
                                  type="button"
                                  onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${highlight.textContent} meaning`)}`, '_blank')}
                                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                                  title="Search on Google"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setOpenColorPicker(openColorPicker === highlight.id ? null : highlight.id)}
                                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Change color"
                                >
                                  <Palette size={14} />
                                </button>
                                {openColorPicker === highlight.id && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                    <div className="p-2 flex gap-1">
                                      {COLOR_OPTIONS.map(({ color, name }) => (
                                        <button
                                          key={color}
                                          type="button"
                                          onClick={() => {
                                            changeHighlightColor(highlight.id, color)
                                            setOpenColorPicker(null)
                                          }}
                                          title={`Change to ${name}`}
                                          className={cn(
                                            'w-6 h-6 rounded-md border-2 transition-all hover:scale-110',
                                            color === 'transparent' && 'bg-gray-100 border-dashed',
                                            highlight.color === color
                                              ? 'border-gray-600 ring-2 ring-blue-300 ring-opacity-50'
                                              : 'border-gray-300 hover:border-gray-500',
                                          )}
                                          style={{ backgroundColor: color === 'transparent' ? 'transparent' : color }}
                                        >
                                          {highlight.color === color && color !== 'transparent' && (
                                            <div className="w-1 h-1 bg-gray-800 rounded-full mx-auto"></div>
                                          )}
                                          {highlight.color === color && color === 'transparent' && (
                                            <div className="w-1 h-1 bg-blue-600 rounded-full mx-auto"></div>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNoteDialog({
                                    isOpen: true,
                                    highlightId: highlight.id,
                                    initialNote: highlight.note,
                                  })
                                }}
                                className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded-md transition-colors"
                                title="Add or edit note"
                              >
                                <StickyNote size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  removeHighlight(highlight.id)
                                  setHighlights(prev => prev.filter(h => h.id !== highlight.id))
                                }}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                                title="Remove highlight"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Show AI explanation if available */}
                          {highlight.explanation && (
                            <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
                              <div>
                                <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                                  <span>📖</span>
                                  {' '}
                                  Explanation:
                                </div>
                                <div className="text-gray-700 leading-relaxed">{highlight.explanation}</div>
                              </div>

                              {highlight.pronunciation && (
                                <div>
                                  <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                                    <span>🔊</span>
                                    {' '}
                                    Pronunciation:
                                  </div>
                                  <div className="text-gray-700 font-mono bg-white px-2 py-1 rounded border">{highlight.pronunciation}</div>
                                </div>
                              )}

                              {highlight.examples && highlight.examples.length > 0 && (
                                <div>
                                  <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                                    <span>💡</span>
                                    {' '}
                                    Examples:
                                  </div>
                                  <ul className="text-gray-700 space-y-1.5">
                                    {highlight.examples.map((example, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-1 text-xs">•</span>
                                        <span className="leading-relaxed">{example}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {highlight.note && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedNotes((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(highlight.id)) {
                                          next.delete(highlight.id)
                                        }
                                        else {
                                          next.add(highlight.id)
                                        }
                                        return next
                                      })
                                    }}
                                    className="w-full flex items-center gap-1 text-left font-semibold text-gray-800 mb-2 hover:text-gray-900"
                                  >
                                    {expandedNotes.has(highlight.id)
                                      ? (
                                          <ChevronDown size={16} className="text-gray-500" />
                                        )
                                      : (
                                          <ChevronRight size={16} className="text-gray-500" />
                                        )}
                                    <span>📝</span>
                                    {' '}
                                    Note
                                  </button>
                                  {expandedNotes.has(highlight.id) && (
                                    <div className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border font-mono text-sm whitespace-pre-wrap break-words">
                                      {highlight.note}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">📝</div>
                      <p className="text-sm text-gray-600 font-medium">
                        {currentHighlights.length === 0
                          ? 'Select text on the page to highlight'
                          : `No highlights match the current filter. ${currentHighlights.length} total highlights available.`}
                      </p>
                    </div>
                  )}
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
              💡 Select text to highlight. Click highlighted text to jump to its location.
            </div>

            {/* Buttons */}
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => handleButtonClick('copyPrompt', () => copyPromptToClipboard(currentHighlights))}
                disabled={buttonStates.copyPrompt === 'loading'}
                className={cn(
                  'flex flex-1 items-center gap-1 px-3 py-2 text-xs font-medium border rounded transition-colors',
                  buttonStates.copyPrompt === 'success'
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
                  buttonStates.copyPrompt === 'loading' && 'opacity-70 cursor-not-allowed',
                )}
                title="Copy formatted prompt"
              >
                {buttonStates.copyPrompt === 'loading' && <Loader2 size={14} className="animate-spin" />}
                {buttonStates.copyPrompt === 'success' && <Check size={14} />}
                {buttonStates.copyPrompt === 'idle' && <Copy size={14} />}
                {buttonStates.copyPrompt === 'success' ? 'Copied!' : 'Copy Prompt'}
              </button>

              <button
                type="button"
                onClick={() => handleButtonClick('importPrompt', async () => {
                  const explanationData = await importHighlightsFromClipboard()
                  if (explanationData.length > 0) {
                    // Update existing highlights with explanation data
                    setHighlights((prev) => {
                      return prev.map((highlight) => {
                        const explanation = explanationData.find(exp => exp.id === highlight.id)
                        if (explanation) {
                          return {
                            ...highlight,
                            explanation: explanation.explanation,
                            examples: explanation.examples,
                            pronunciation: explanation.pronunciation,
                          }
                        }
                        return highlight
                      })
                    })
                  }
                  else {
                    throw new Error('No valid explanation data found in clipboard')
                  }
                })}
                disabled={buttonStates.importPrompt === 'loading'}
                className={cn(
                  'flex flex-1 items-center gap-1 px-3 py-2 text-xs font-medium border rounded transition-colors',
                  buttonStates.importPrompt === 'success'
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200',
                  buttonStates.importPrompt === 'loading' && 'opacity-70 cursor-not-allowed',
                )}
                title="Import highlights from prompt"
              >
                {buttonStates.importPrompt === 'loading' && <Loader2 size={14} className="animate-spin" />}
                {buttonStates.importPrompt === 'success' && <Check size={14} />}
                {buttonStates.importPrompt === 'idle' && <FileText size={14} />}
                {buttonStates.importPrompt === 'success' ? 'Imported!' : 'Import From Prompt'}
              </button>

              <button
                type="button"
                onClick={() => handleButtonClick('exportAnki', async () => {
                  // Export highlights that have explanation data to Anki
                  const highlightsWithExplanations = currentHighlights.filter(h => h.explanation?.trim?.()?.length && h.color === '#fbbf24')

                  if (highlightsWithExplanations.length === 0) {
                    throw new Error('No highlights with explanations found. Please import explanations first.')
                  }

                  const results: { success: boolean, id: string }[] = []
                  for (const highlight of highlightsWithExplanations) {
                    const result = await addNote(highlight)
                    results.push({
                      success: result.success,
                      id: highlight.id,
                    })
                  }

                  const successful = results.filter(r => r.success).length
                  const failed = results.filter(r => !r.success).length

                  if (failed > 0) {
                    throw new Error(`Exported ${successful} cards successfully, ${failed} failed. Make sure Anki is running with AnkiConnect addon.`)
                  }

                  const newHighlights = highlights.map((h) => {
                    const result = results.find(r => r.success && r.id === h.id)
                    if (result) {
                      return {
                        ...h,
                        color: '#e5e7eb',
                      }
                    }
                    else {
                      return h
                    }
                  })
                  // to Gray
                  setHighlights(newHighlights)
                  removeAllHighlights(newHighlights)
                  restoreHighlights(newHighlights)
                })}
                disabled={buttonStates.exportAnki === 'loading'}
                className={cn(
                  'flex flex-1 items-center gap-1 px-3 py-2 text-xs font-medium border rounded transition-colors',
                  buttonStates.exportAnki === 'success'
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200',
                  buttonStates.exportAnki === 'loading' && 'opacity-70 cursor-not-allowed',
                )}
                title="Export highlights to Anki"
              >
                {buttonStates.exportAnki === 'loading' && <Loader2 size={14} className="animate-spin" />}
                {buttonStates.exportAnki === 'success' && <Check size={14} />}
                {buttonStates.exportAnki === 'idle' && <Download size={14} />}
                {buttonStates.exportAnki === 'success' ? 'Exported!' : 'Export To Anki'}
              </button>
            </div>
          </>
        )}
      </div>
      <NoteDialog
        isOpen={noteDialog.isOpen}
        onClose={() => setNoteDialog({ isOpen: false, highlightId: null })}
        onSave={(note) => {
          if (noteDialog.highlightId) {
            setHighlights(prev => prev.map(h =>
              h.id === noteDialog.highlightId ? { ...h, note } : h,
            ))
          }
        }}
        initialNote={noteDialog.initialNote}
      />
      <pre className="text-xs max-w-full overflow-x-auto">
        {JSON.stringify(highlights, null, 2)}
      </pre>
    </div>
  )
}

export default Highlight
