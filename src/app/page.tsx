"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import { useQuiz } from "@/context/QuizContext";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { parseQuestions } from "@/lib/pdf-parser";
import { hashFile } from "@/lib/hash";
import type { Question } from "@/lib/types";
import { MOCK_EXAM_COUNT } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const { startQuiz, resumeQuiz, questions, record, isLoaded } = useQuiz();
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<{
    total: number;
    skipped: number;
    pdfHash: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use ref to hold parsed questions between upload and start (avoids global mutable)
  const parsedQuestionsRef = useRef<Question[]>([]);
  const pdfHashRef = useRef<string>("");

  const handleFileSelected = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParseResult(null);

    try {
      const [rawText, pdfHash] = await Promise.all([
        extractTextFromPdf(file),
        hashFile(file),
      ]);

      const parsed = parseQuestions(rawText);

      if (parsed.length === 0) {
        setError("문제를 찾을 수 없습니다. PDF 형식을 확인해주세요.");
        return;
      }

      const totalBlocks = (rawText.match(/QUESTION\s+\d+/g) || []).length;
      const skipped = totalBlocks - parsed.length;

      parsedQuestionsRef.current = parsed;
      pdfHashRef.current = pdfHash;
      setParseResult({ total: parsed.length, skipped, pdfHash });
    } catch (e) {
      console.error("PDF parse error:", e);
      const message = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error && e.stack ? e.stack : "";
      setError(
        `PDF를 읽는 중 오류가 발생했습니다:\n${message}${stack ? "\n\n" + stack : ""}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStart = useCallback(
    (mode: "all" | "wrong-only" | "mock") => {
      const parsed = parsedQuestionsRef.current;
      const pdfHash = pdfHashRef.current;
      if (parsed.length === 0 || !pdfHash) return;
      startQuiz(parsed, pdfHash, mode);
      router.push("/quiz");
    },
    [startQuiz, router],
  );

  // Resume from existing localStorage record
  const handleResume = useCallback(() => {
    if (resumeQuiz()) {
      router.push("/quiz");
    }
  }, [resumeQuiz, router]);

  // Wrong-only retry from existing record (uses questions already in context, not from ref)
  const handleRetryWrong = useCallback(() => {
    if (record && questions.length > 0) {
      startQuiz(questions, record.pdfHash, "wrong-only");
      router.push("/quiz");
    }
  }, [startQuiz, questions, record, router]);

  if (!isLoaded) return null;

  // Derive resume state from context (not from direct localStorage read)
  const hasExistingRecord = !!record && questions.length > 0;
  const wrongCount = record
    ? Object.values(record.results).filter((r) => !r.correct).length
    : 0;
  const answeredCount = record ? Object.keys(record.results).length : 0;

  // Check if newly uploaded PDF matches existing record
  const isSamePdf =
    parseResult && record && parseResult.pdfHash === record.pdfHash;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AWS CCP Quiz</h1>
          <p className="mt-2 text-gray-500">CLF-C02 문제은행</p>
          <p className="mt-1 text-xs text-gray-700">v0.7.3 </p>
          <p className="mt-1 text-sm text-gray-700">
            에러, 버그 제보 - woojhan@koreanair.com
          </p>
        </div>

        <FileUpload onFileSelected={handleFileSelected} isLoading={isLoading} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg whitespace-pre-wrap break-all text-sm font-mono">
            {error}
          </div>
        )}

        {parseResult && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <p className="text-lg">
              <span className="font-semibold text-blue-600">
                {parseResult.total}개
              </span>{" "}
              문제 파싱 완료
              {parseResult.skipped > 0 && (
                <span className="text-sm text-gray-400 ml-2">
                  ({parseResult.skipped}개 건너뜀)
                </span>
              )}
            </p>
            {parseResult.total >= MOCK_EXAM_COUNT && (
              <button
                onClick={() => handleStart("mock")}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                모의고사 ({MOCK_EXAM_COUNT}문제)
              </button>
            )}
            <button
              onClick={() => handleStart("all")}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              전체 회독 ({parseResult.total}문제)
            </button>
            {/* If same PDF as before and not mock, offer resume */}
            {isSamePdf && answeredCount > 0 && record!.mode !== "mock" && (
              <button
                onClick={handleResume}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                이어서 풀기 ({answeredCount}/{record!.totalCount} 완료)
              </button>
            )}
          </div>
        )}

        {hasExistingRecord && !parseResult && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
            <p className="text-sm text-gray-500">이전 학습 기록이 있습니다</p>
            {record!.mode !== "mock" && (
              <button
                onClick={handleResume}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                이어서 풀기 ({answeredCount}/{record!.totalCount} 완료)
              </button>
            )}
            {wrongCount > 0 && (
              <button
                onClick={handleRetryWrong}
                className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                틀린 문제만 풀기 ({wrongCount}개)
              </button>
            )}
            {questions.length >= MOCK_EXAM_COUNT && (
              <button
                onClick={() => {
                  startQuiz(questions, record!.pdfHash, "mock");
                  router.push("/quiz");
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                모의고사 ({MOCK_EXAM_COUNT}문제)
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
