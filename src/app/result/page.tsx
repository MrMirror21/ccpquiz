"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import ResultSummary from "@/components/ResultSummary";

export default function ResultPage() {
  const router = useRouter();
  const { record, questions, isLoaded, startQuiz, resetQuiz } = useQuiz();

  // Navigation guard
  useEffect(() => {
    if (isLoaded && (!record || questions.length === 0)) {
      router.replace("/");
    }
  }, [isLoaded, record, questions.length, router]);

  if (!isLoaded || !record || questions.length === 0) {
    return null;
  }

  const wrongCount = Object.values(record.results).filter((r) => !r.correct).length;

  const handleRetryWrong = () => {
    startQuiz(questions, record.pdfHash, "wrong-only");
    router.push("/quiz");
  };

  const handleStartOver = () => {
    startQuiz(questions, record.pdfHash, "all");
    router.push("/quiz");
  };

  const handleNewFile = () => {
    resetQuiz();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center">결과</h1>

        <ResultSummary record={record} questions={questions} />

        <div className="space-y-3">
          <button
            onClick={handleStartOver}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            처음부터 다시 풀기
          </button>

          {wrongCount > 0 && (
            <button
              onClick={handleRetryWrong}
              className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              틀린 문제만 다시 풀기 ({wrongCount}개)
            </button>
          )}

          <button
            onClick={handleNewFile}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            새 파일 업로드
          </button>
        </div>
      </div>
    </main>
  );
}
