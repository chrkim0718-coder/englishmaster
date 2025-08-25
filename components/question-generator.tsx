"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { GRAMMAR_TYPES, normalizeGrammarType } from "@/lib/ai/types"

interface GeneratedQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  grammar_type: string
  difficulty_level: string
}

export default function QuestionGenerator() {
  const [rows, setRows] = useState([
    { grammarType: "", difficultyLevel: "", questionCount: 5 },
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [batchCount, setBatchCount] = useState(3)
  const [batchDifficulty, setBatchDifficulty] = useState("초급")
  const [aiProvider, setAiProvider] = useState("gemini")
  const { toast } = useToast()

  // 공통 문법유형 사용 ("랜덤" 제외)
  const grammarTypes = GRAMMAR_TYPES.filter(type => type !== "랜덤")

  // 행 추가
  const handleAddRow = () => {
    setRows((prev) => [...prev, { grammarType: "", difficultyLevel: "", questionCount: 5 }])
  }

  // 행 삭제
  const handleRemoveRow = (idx: number) => {
    setRows((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))
  }

  // 행 값 변경 (문법유형은 항상 대분류만 저장)
  const handleRowChange = (idx: number, key: string, value: string | number) => {
    if (key === "grammarType") {
      // @ts-ignore
      const { normalizeGrammarType } = require("@/lib/ai/types")
      value = normalizeGrammarType(value as string)
    }
    setRows((prev) => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row))
  }

  // 일괄 문제 생성 (모든 문법유형)
  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true)
    try {
      // 예상 소요 시간 안내
      const estimatedTime = Math.ceil(grammarTypes.length * 3) // 각 요청당 약 3초 + 딜레이
      toast({
        title: "배치 생성 시작",
        description: `모든 문법유형 처리 중... 예상 소요 시간: 약 ${estimatedTime}초`,
      })

      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchType: "all_grammar_types",
          difficultyLevel: batchDifficulty,
          countPerType: batchCount,
          aiProvider: aiProvider,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "배치 생성 실패")
      }

      setGeneratedQuestions(data.questions || [])
      toast({
        title: "배치 생성 완료! 🎉",
        description: `모든 문법유형에 대해 총 ${data.totalCount}개의 문제가 생성되었습니다. (성공: ${data.successCount}개 유형, 실패: ${data.failureCount}개 유형)`,
      })
    } catch (error) {
      console.error("Error in batch generation:", error)
      toast({
        title: "배치 생성 실패",
        description: error instanceof Error ? error.message : "배치 생성에 실패했습니다. 다시 시도해 주세요.",
        variant: "destructive",
      })
    } finally {
      setIsBatchGenerating(false)
    }
  }

  // 개별 문제 생성
  const handleGenerate = async () => {
    // 입력값 검증
    for (const row of rows) {
      if (!row.grammarType || !row.difficultyLevel || !row.questionCount) {
        toast({
          title: "입력 정보 부족",
          description: "모든 행의 문법유형, 난이도, 개수를 입력해 주세요.",
          variant: "destructive",
        })
        return
      }
    }
    setIsGenerating(true)
    try {
      // 모든 행에 대해 병렬로 문제 생성 요청
      const results = await Promise.all(
        rows.map((row) =>
          fetch("/api/generate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grammarType: row.grammarType,
              difficultyLevel: row.difficultyLevel,
              count: row.questionCount,
              aiProvider: aiProvider,
            }),
          }).then((res) => res.json())
        )
      )
      // 모든 결과 합치기
      const allQuestions = results.flatMap((data) => data.questions || [])
      setGeneratedQuestions(allQuestions)
      toast({
        title: "문제 생성 완료",
        description: `${allQuestions.length}개의 문제가 성공적으로 생성되었습니다.`,
      })
    } catch (error) {
      console.error("Error generating questions:", error)
      toast({
        title: "문제 생성 실패",
        description: error instanceof Error ? error.message : "문제 생성에 실패했습니다. 다시 시도해 주세요.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            문법 문제 일괄 생성
          </CardTitle>
          <CardDescription>AI를 활용해 영어 문법 4지선다 문제를 자동으로 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 배치 생성 섹션 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">🚀 빠른 배치 생성 (전체 문법유형)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-blue-800">각 문법유형별 문항 수</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                />
                <p className="text-xs text-blue-600">
                  총 {batchCount * grammarTypes.length}개 문제 생성됩니다
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-blue-800">난이도</Label>
                <Select value={batchDifficulty} onValueChange={setBatchDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="난이도 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="초급">초급</SelectItem>
                    <SelectItem value="중급">중급</SelectItem>
                    <SelectItem value="고급">고급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-blue-800">AI 제공자</Label>
                <Select value={aiProvider} onValueChange={setAiProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="AI 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini (Google)</SelectItem>
                    <SelectItem value="grok">Grok (xAI)</SelectItem>
                    <SelectItem value="lmstudio">LM Studio (로컬)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleBatchGenerate}
                disabled={isBatchGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isBatchGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                전체 문법유형 일괄 생성
              </Button>
            </div>
          </div>

          {/* 개별 설정 섹션 */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-700 mb-3">⚙️ 개별 설정 생성</h3>
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>문법유형</Label>
                  <Select value={row.grammarType} onValueChange={(v) => handleRowChange(idx, "grammarType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="문법유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {grammarTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>난이도</Label>
                  <Select value={row.difficultyLevel} onValueChange={(v) => handleRowChange(idx, "difficultyLevel", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="난이도 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="초급">초급</SelectItem>
                      <SelectItem value="중급">중급</SelectItem>
                      <SelectItem value="고급">고급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>문항 수</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={row.questionCount}
                    onChange={(e) => handleRowChange(idx, "questionCount", Number(e.target.value))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleAddRow} disabled={rows.length >= 10}>
                    + 행 추가
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => handleRemoveRow(idx)} disabled={rows.length === 1}>
                    삭제
                  </Button>
                </div>
              </div>
            ))}
            <Button
              className="mt-4"
              onClick={handleGenerate}
              disabled={isGenerating || isBatchGenerating || rows.some((row) => !row.grammarType || !row.difficultyLevel)}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              개별 설정 문제 생성
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">생성된 문제 ({generatedQuestions.length}개)</h3>
          </div>

          {generatedQuestions.map((question, index) => (
            <Card key={question.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-lg">문제 {index + 1}</h4>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{normalizeGrammarType(question.grammar_type)}</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded capitalize">
                        {question.difficulty_level}
                      </span>
                    </div>
                  </div>

                  <p className="text-lg">{question.question_text}</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className={`p-2 rounded ${question.correct_answer === "A" ? "bg-green-100 border-green-500 border" : "bg-gray-50"}`}
                    >
                      <span className="font-medium">A)</span> {question.option_a}
                    </div>
                    <div
                      className={`p-2 rounded ${question.correct_answer === "B" ? "bg-green-100 border-green-500 border" : "bg-gray-50"}`}
                    >
                      <span className="font-medium">B)</span> {question.option_b}
                    </div>
                    <div
                      className={`p-2 rounded ${question.correct_answer === "C" ? "bg-green-100 border-green-500 border" : "bg-gray-50"}`}
                    >
                      <span className="font-medium">C)</span> {question.option_c}
                    </div>
                    <div
                      className={`p-2 rounded ${question.correct_answer === "D" ? "bg-green-100 border-green-500 border" : "bg-gray-50"}`}
                    >
                      <span className="font-medium">D)</span> {question.option_d}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm">
                      <strong>정답:</strong> {question.correct_answer}
                    </p>
                    <p className="text-sm mt-1">
                      <strong>해설:</strong> {question.explanation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
