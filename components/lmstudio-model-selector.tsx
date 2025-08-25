'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface LMStudioModel {
  id: string
  created: number
  object: string
}

interface ModelSettings {
  defaultModel: string
  selectedModel: string | null
  currentModel: string
  availableModels: LMStudioModel[]
}


export function LMStudioModelSelector() {
  const [settings, setSettings] = useState<ModelSettings | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [apiBase, setApiBase] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  // 모델 설정 정보 로드
  const loadModelSettings = async (customApiBase?: string) => {
    try {
      setLoading(true)
      const url = '/api/lmstudio/model' + (customApiBase ? `?apiBase=${encodeURIComponent(customApiBase)}` : '');
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch model settings')
      }
      const data = await response.json()
      if (data.success) {
        setSettings(data)
        setSelectedModel(data.selectedModel || data.currentModel || data.defaultModel)
        if (data.localServer) {
          setApiBase(data.localServer)
          localStorage.setItem('lmstudioApiBase', data.localServer)
        }
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "LM Studio 모델 정보를 불러올 수 없습니다.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 모델 변경 적용
  const applyModelChange = async () => {
    if (!selectedModel) return
    try {
      setUpdating(true)
      const response = await fetch('/api/lmstudio/model' + (apiBase ? `?apiBase=${encodeURIComponent(apiBase)}` : ''), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modelName: selectedModel })
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: "성공",
          description: data.message,
        })
        // 설정 새로고침
        await loadModelSettings(apiBase)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "모델 설정을 변경할 수 없습니다.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  // API Base URL 초기화 (localStorage)
  useEffect(() => {
    const savedApiBase = localStorage.getItem('lmstudioApiBase')
    if (savedApiBase) {
      setApiBase(savedApiBase)
      loadModelSettings(savedApiBase)
    } else {
      loadModelSettings()
    }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LM Studio 모델 설정</CardTitle>
          <CardDescription>모델 정보를 불러오는 중...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LM Studio 모델 설정</CardTitle>
          <CardDescription className="text-red-500">
            LM Studio 연결에 실패했습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LM Studio 모델 설정</CardTitle>
        <CardDescription>
          LM Studio API 주소와 모델을 직접 설정할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Base URL 입력 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">LM Studio API 주소(URL):</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={apiBase}
            onChange={e => {
              setApiBase(e.target.value)
              localStorage.setItem('lmstudioApiBase', e.target.value)
            }}
            placeholder="예: http://localhost:1234"
            disabled={updating}
          />
          <Button
            variant="outline"
            onClick={() => loadModelSettings(apiBase)}
            disabled={updating || !apiBase}
          >
            주소 적용 및 모델 목록 새로고침
          </Button>
        </div>

        {/* 현재 상태 정보 */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">LM Studio 활성 모델:</span>
            <Badge variant="default">{settings.currentModel}</Badge>
          </div>
          {settings.selectedModel && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">선택된 모델:</span>
              <Badge variant="secondary">{settings.selectedModel}</Badge>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">환경변수 기본값:</span>
            <Badge variant="outline">{settings.defaultModel}</Badge>
          </div>
        </div>

        {/* 모델 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">사용할 모델 선택:</label>
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue placeholder="모델을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {settings.availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span>{model.id}</span>
                    <span className="text-xs text-gray-500">
                      생성: {new Date(model.created * 1000).toLocaleString()}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 사용 가능한 모델 목록 */}
        <div className="space-y-2">
          <span className="text-sm font-medium">
            사용 가능한 모델 ({settings.availableModels.length}개):
          </span>
          <div className="grid gap-2">
            {settings.availableModels.map((model) => (
              <div 
                key={model.id} 
                className="p-2 rounded border bg-gray-50 text-sm"
              >
                <div className="font-medium">{model.id}</div>
                <div className="text-xs text-gray-500">
                  생성: {new Date(model.created * 1000).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 적용 버튼 */}
        <div className="flex gap-2">
          <Button
            onClick={applyModelChange}
            disabled={updating || !selectedModel || selectedModel === (settings.selectedModel || settings.currentModel)}
            className="flex-1"
          >
            {updating ? '적용 중...' : '모델 변경 적용'}
          </Button>
          <Button
            variant="outline"
            onClick={() => loadModelSettings(apiBase)}
            disabled={updating}
          >
            새로고침
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
