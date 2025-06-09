import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAnki } from '@/hooks/useAnki'
import { ConfigCard } from '../../components/config-card'
import { FieldWithLabel } from '../../components/field-with-label'

function AnkiConfig() {
  const {
    config,
    updateConfig,
    isConnected,
    isLoading,
    availableDecks,
    checkConnection,
    fetchAvailableDecks,
    initialize,
  } = useAnki()

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleDeckNameChange = (value: string) => {
    updateConfig({ deckName: value })
  }

  const handleDeckSelect = (selectedDeck: string) => {
    updateConfig({ deckName: selectedDeck })
  }

  const handleCheckConnection = async () => {
    const connected = await checkConnection()
    if (connected) {
      await fetchAvailableDecks()
    }
  }

  return (
    <ConfigCard
      title="Anki 配置"
      description="配置 Anki 卡片导出选项，包括牌组名称等设置"
    >
      <div className="space-y-4">
        {/* 连接状态 */}
        <div className="flex items-center gap-2">
          <span className="text-sm">
            连接状态:
            {' '}
            <span className={isLoading ? '' : isConnected ? 'text-green-600 font-medium' : 'text-red-500'}>
              {isLoading ? '检查中...' : isConnected ? '已连接' : '未连接'}
            </span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckConnection}
            disabled={isLoading}
          >
            检查连接
          </Button>
        </div>

        {/* 牌组名称配置 */}
        <FieldWithLabel id="ankiDeckName" label="牌组名称">
          <div className="space-y-2">
            <Input
              id="ankiDeckName"
              value={config.deckName}
              onChange={e => handleDeckNameChange(e.target.value)}
              placeholder="输入牌组名称，如：ReadFrog"
            />

            {/* 可用牌组选择器 */}
            {isConnected && availableDecks.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  或选择现有牌组:
                </label>
                <Select onValueChange={handleDeckSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择现有牌组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {availableDecks.map(deck => (
                        <SelectItem key={deck} value={deck}>
                          {deck}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </FieldWithLabel>
      </div>
    </ConfigCard>
  )
}

export default AnkiConfig
