"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import { MOCK_EXAM_COUNT, MOCK_UNSCORED_COUNT, MOCK_SCORED_COUNT } from "@/lib/types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MOCK_TIME_LIMIT = 90 * 60; // 90 minutes in seconds

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

  // Mock intro gate
  const [mockStarted, setMockStarted] = useState(false);

  // Mock mode toggles (default OFF for exam-like experience)
  const [showStats, setShowStats] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Timer for mock mode
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isMock && mockStarted) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMock, mockStarted]);

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

  // Mock intro screen
  if (isMock && !mockStarted) {
    const overTime = elapsed > MOCK_TIME_LIMIT;
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">AWS CCP 모의고사</h1>
            <p className="mt-1 text-sm text-gray-400">CLF-C02</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">안내사항</h2>
            <ul className="space-y-4 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</span>
                <span>
                  총 <strong>{MOCK_EXAM_COUNT}문제</strong>가 출제되며, 이 중 <strong>{MOCK_UNSCORED_COUNT}문제</strong>는 랜덤으로 비채점 처리됩니다.
                  최종 점수는 나머지 <strong>{MOCK_SCORED_COUNT}문제</strong>의 정답률로 산출됩니다.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</span>
                <span>
                  시험이 시작되면 우측 상단에 경과 시간이 표시됩니다.
                  실제 시험 시간은 <strong>90분</strong>입니다.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">3</span>
                <span>
                  결과 화면에서 문제별 <strong>정답 여부</strong>와 <strong>비채점 여부</strong>를 확인할 수 있습니다.
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setMockStarted(true)}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-lg"
          >
            시험 시작
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            &larr; 홈으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  const statsVisible = isMock ? showStats : true;
  const feedbackVisible = isMock ? showFeedback : true;
  const overTime = isMock && elapsed > MOCK_TIME_LIMIT;

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
              <span className={`text-sm font-mono font-medium ${overTime ? "text-red-500" : "text-indigo-600"}`}>
                {formatTime(elapsed)}
                {overTime && <span className="ml-1 text-xs">(초과)</span>}
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
