import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";

interface ValidationIssue {
  id: string;
  question_text?: string;
  message?: string;
  category: string;
  severity: string;
  grammar_type?: string;
  explanation?: string;
}

interface ValidationResultsCardProps {
  validationResults: ValidationIssue[];
  onAutoFillQuestion: (id: string) => void;
  onFixGrammarType: (id: string, grammarType: string) => void;
  onFixExplanation: (id: string, explanation: string) => void;
  onAutoFillOptions: (id: string) => void;
  onDeleteQuestion: (id: string) => void;
  REVERSE_GRAMMAR_TYPE_MAPPING: Record<string, string>;
  getKoreanGrammarType: (type: string) => string;
}

const ValidationResultsCard: React.FC<ValidationResultsCardProps> = ({
  validationResults,
  onAutoFillQuestion,
  onFixGrammarType,
  onFixExplanation,
  onAutoFillOptions,
  onDeleteQuestion,
  REVERSE_GRAMMAR_TYPE_MAPPING,
  getKoreanGrammarType,
}) => {
  if (!validationResults || validationResults.length === 0) return null;
  return (
    <Card className="bg-red-50 border-red-200">
      <CardHeader>
        <CardTitle className="text-lg">문제 데이터 이슈별 조치</CardTitle>
        <CardDescription>아래 이슈별로 직접 수정/삭제/자동채움이 가능합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationResults.map((issue, idx) => (
          <div key={issue.id || idx} className="p-3 bg-white rounded-lg border mb-2">
            <div className="mb-1 text-sm text-gray-700">
              <b>문제:</b> {issue.question_text || issue.message}
            </div>
            <div className="mb-2 text-xs text-gray-500">{issue.category} / {issue.severity}</div>
            {/* 누락 필드 자동채움 */}
            {issue.category === 'Data Integrity' && (
              <Button size="sm" variant="outline" onClick={() => onAutoFillQuestion(issue.id)}>
                자동채움
              </Button>
            )}
            {/* 문법유형 오류/미지정 */}
            {issue.category === 'Grammar Type Validation' && (
              <div className="flex gap-2 items-center">
                <select value={issue.grammar_type || ''} onChange={e => onFixGrammarType(issue.id, e.target.value)} className="border rounded px-2 py-1">
                  <option value="">문법유형 선택</option>
                  {Object.keys(REVERSE_GRAMMAR_TYPE_MAPPING).map(type => (
                    <option key={type} value={type}>{getKoreanGrammarType(type)}</option>
                  ))}
                </select>
                <Button size="sm" onClick={() => onFixGrammarType(issue.id, issue.grammar_type!)}>
                  수정
                </Button>
              </div>
            )}
            {/* 설명 너무 짧음 */}
            {issue.category === 'Explanation Quality' && (
              <div className="flex gap-2 items-center">
                <input type="text" className="border rounded px-2 py-1 flex-1" value={issue.explanation || ''} onChange={e => onFixExplanation(issue.id, e.target.value)} />
                <Button size="sm" onClick={() => onFixExplanation(issue.id, issue.explanation!)}>
                  설명 수정
                </Button>
              </div>
            )}
            {/* 옵션 중복/누락 자동채움 */}
            {issue.category === 'Option Validation' && (
              <Button size="sm" variant="outline" onClick={() => onAutoFillOptions(issue.id)}>
                옵션 자동채움
              </Button>
            )}
            {/* 즉시 삭제 */}
            <Button size="sm" variant="destructive" className="ml-2" onClick={() => onDeleteQuestion(issue.id)}>
              삭제
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ValidationResultsCard;
