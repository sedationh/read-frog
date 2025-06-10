// import { onMessage } from "@/utils/message";
import { useSetAtom } from 'jotai'
import { X } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { cn } from '@/utils/tailwind'
import { shadowWrapper } from '../..'
import { isSideOpenAtom } from '../../atoms'

export function TopBar({ className }: { className?: string }) {
  const setIsSideOpen = useSetAtom(isSideOpenAtom)

  return (
    <div className={cn('flex justify-end', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-neutral-200 p-0.5 dark:bg-neutral-800"
            onClick={() => setIsSideOpen(false)}
          >
            <X strokeWidth={1.2} className="text-neutral-500" />
          </button>
        </TooltipTrigger>
        <TooltipContent container={shadowWrapper} side="left">
          <p>Close</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
