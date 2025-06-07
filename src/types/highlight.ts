// 高亮数据接口定义
export interface HighlightData {
  id: string
  text: string
  color: string
  timestamp: number
  // 存储位置信息用于重建
  selector: string // 目标容器的选择器
  startPath: number[] // 起始文本节点的路径
  startOffset: number
  endPath: number[] // 结束文本节点的路径
  endOffset: number
  isSegmented: boolean // 是否为分段高亮
}

export interface HighlightState {
  id: string
  text: string
  element: HTMLElement
  segments?: HTMLElement[]
}

export interface ConflictCheckResult {
  hasConflict: boolean
  reason?: string
  conflictElement?: Element
}

export interface ColorOption {
  color: string
  name: string
}
