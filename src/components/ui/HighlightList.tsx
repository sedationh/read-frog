import type { HighlightState } from '../../types/highlight'
import { Trash2 } from 'lucide-react'
import { truncateText } from '../../utils/highlight'

interface HighlightListProps {
  highlights: HighlightState[]
  onRemoveHighlight: (id: string) => void
  className?: string
}

export function HighlightList({ highlights, onRemoveHighlight, className = '' }: HighlightListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          Highlights (
          {highlights.length}
          )
        </h4>
      </div>

      {highlights.length > 0
        ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {highlights.map(highlight => (
                <div
                  key={highlight.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 break-words">
                      "
                      {truncateText(highlight.text, 60)}
                      "
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveHighlight(highlight.id)}
                    className="ml-3 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove highlight"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )
        : (
            <p className="text-sm text-gray-500 italic py-4 text-center">
              No highlights yet. Select text to create highlights.
            </p>
          )}
    </div>
  )
}
