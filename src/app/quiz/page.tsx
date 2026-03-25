"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";

export default function QuizPage() {
  const router = useRouter();
  const {
    shuffledIds,
    currentIndex,
    isLoaded,
    record,
    getCurrentQuestion,
    submitAnswer,
    nextQuestion,
  } = useQuiz();

  // Navigation guard: redirect if no quiz data
  useEffect(() => {
    if (isLoaded && shuffledIds.length === 0) {
      router.replace("/");
    }
  }, [isLoaded, shuffledIds.length, router]);

  const question = getCurrentQuestion();
  const isLast = currentIndex >= shuffledIds.length - 1;

  const results = record ? Object.values(record.results) : [];
  const correctCount = results.filter((r) => r.correct).length;
  const wrongCount = results.filter((r) => !r.correct).length;
  const answeredCount = results.length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const handleSubmit = useCallback(
    (selected: string[]): boolean => {
      if (!question) return false;
      return submitAnswer(question.id, selected);
    },
    [question, submitAnswer]
  );

  const handleNext = useCallback(() => {
    if (!nextQuestion()) {
      router.push("/result");
    }
  }, [nextQuestion, router]);

  if (!isLoaded || shuffledIds.length === 0 || !question) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <p className="text-xs text-gray-400 text-right">v0.5.0</p>
        <ProgressBar
          current={currentIndex + 1}
          total={shuffledIds.length}
        />
        {answeredCount > 0 && (
          <div className="flex justify-center gap-4 text-sm">
            <span className="text-green-600 font-medium">맞춘 문제 {correctCount}</span>
            <span className="text-red-500 font-medium">틀린 문제 {wrongCount}</span>
            <span className="text-gray-600 font-medium">정답률 {accuracy}%</span>
          </div>
        )}
        <QuestionCard
          key={question.id}
          question={question}
          onSubmit={handleSubmit}
          onNext={handleNext}
          isLast={isLast}
        />
      </div>
    </main>
  );
}
