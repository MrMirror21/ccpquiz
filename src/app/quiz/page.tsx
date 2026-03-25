"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function QuizPage() {
  const router = useRouter();
  const {
    shuffledIds,
    currentIndex,
    isLoaded,
    record,
    mode,
    getCurrentQuestion,
    submitAnswer,
    nextQuestion,
  } = useQuiz();

  const isMock = mode === "mock";

  // Mock mode toggles (default OFF for exam-like experience)
  const [showStats, setShowStats] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Timer for mock mode
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isMock) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMock]);

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

  const statsVisible = isMock ? showStats : true;
  const feedbackVisible = isMock ? showFeedback : true;

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Top bar: home + version + timer */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            &larr; 홈
          </button>
          <div className="flex items-center gap-3">
            {isMock && (
              <span className="text-sm font-mono text-indigo-600 font-medium">
                {formatTime(elapsed)}
              </span>
            )}
            <span className="text-xs text-gray-400">v0.5.0</span>
          </div>
        </div>

        <ProgressBar
          current={currentIndex + 1}
          total={shuffledIds.length}
        />

        {/* Mock mode toggles */}
        {isMock && (
          <div className="flex justify-center gap-4 text-xs">
            <button
              onClick={() => setShowStats((v) => !v)}
              className={`px-3 py-1 rounded-full border transition-colors ${
                showStats
                  ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              통계 {showStats ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => setShowFeedback((v) => !v)}
              className={`px-3 py-1 rounded-full border transition-colors ${
                showFeedback
                  ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              즉시 정답 {showFeedback ? "ON" : "OFF"}
            </button>
          </div>
        )}

        {/* Stats bar */}
        {statsVisible && answeredCount > 0 && (
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
          showFeedback={feedbackVisible}
        />
      </div>
    </main>
  );
}
