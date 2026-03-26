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
    goToQuestion,
  } = useQuiz();

  const isMock = mode === "mock";

  // Mock intro gate
  const [mockStarted, setMockStarted] = useState(false);

  // Expandable question navigator (mock only)
  const [navOpen, setNavOpen] = useState(false);

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
  const isFirst = currentIndex === 0;
  const isLast = currentIndex >= shuffledIds.length - 1;

  const results = record ? Object.values(record.results) : [];
  const correctCount = results.filter((r) => r.correct).length;
  const wrongCount = results.filter((r) => !r.correct).length;
  const answeredCount = results.length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  // Get previous answer for current question (for mock navigation)
  const currentQuestionId = question?.id;
  const previousAnswer = currentQuestionId && record?.results[currentQuestionId]
    ? record.results[currentQuestionId].selected
    : undefined;

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

  const handleMockPrev = useCallback(() => {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
  }, [currentIndex, goToQuestion]);

  const handleMockNext = useCallback(() => {
    if (currentIndex < shuffledIds.length - 1) goToQuestion(currentIndex + 1);
  }, [currentIndex, shuffledIds.length, goToQuestion]);

  const handleMockFinish = useCallback(() => {
    router.push("/result");
  }, [router]);

  if (!isLoaded || shuffledIds.length === 0 || !question) {
    return null;
  }

  // Mock intro screen
  if (isMock && !mockStarted) {
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
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">4</span>
                <span>
                  문제 간 <strong>자유롭게 이동</strong>하고 <strong>답안을 수정</strong>할 수 있습니다.
                  모든 문제에 응답해야 <strong>시험 제출</strong>이 가능합니다.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">5</span>
                <span>
                  모의고사는 <strong>이어서 풀기를 지원하지 않습니다.</strong> 시작하면 처음부터 끝까지 완료해야 합니다.
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

  const overTime = isMock && elapsed > MOCK_TIME_LIMIT;
  const unansweredCount = shuffledIds.length - answeredCount;
  const allAnswered = unansweredCount === 0;

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
            <span className="text-xs text-gray-400">v0.7.3</span>
          </div>
        </div>

        <ProgressBar
          current={currentIndex + 1}
          total={shuffledIds.length}
        />

        {/* Mock: expandable question navigator */}
        {isMock && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setNavOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>
                문제 목록
                <span className="ml-2 text-xs text-gray-400">
                  ({answeredCount}/{shuffledIds.length} 응답)
                </span>
              </span>
              <span className={`text-xs transition-transform ${navOpen ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {navOpen && (
              <div className="px-4 pb-4 pt-1">
                <div className="grid grid-cols-10 gap-1.5">
                  {shuffledIds.map((qid, idx) => {
                    const answered = !!record?.results[qid];
                    const isCurrent = idx === currentIndex;
                    let bg: string;
                    if (isCurrent) {
                      bg = "bg-indigo-600 text-white border-indigo-600";
                    } else if (answered) {
                      bg = "bg-blue-100 text-blue-700 border-blue-300";
                    } else {
                      bg = "bg-gray-50 text-gray-400 border-gray-200";
                    }
                    return (
                      <button
                        key={qid}
                        onClick={() => {
                          goToQuestion(idx);
                          setNavOpen(false);
                        }}
                        className={`border rounded text-center text-xs font-medium py-1.5 transition-colors hover:opacity-80 ${bg}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-600" /> 현재</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300" /> 응답 완료</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-50 border border-gray-200" /> 미응답</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats bar (non-mock only) */}
        {!isMock && answeredCount > 0 && (
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
          showFeedback={!isMock}
          editable={isMock}
          initialSelected={isMock ? previousAnswer : undefined}
        />

        {/* Mock mode navigation */}
        {isMock && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={handleMockPrev}
                disabled={isFirst}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                &larr; 이전
              </button>
              <button
                onClick={handleMockNext}
                disabled={isLast}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음 &rarr;
              </button>
            </div>
            <button
              onClick={handleMockFinish}
              disabled={!allAnswered}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              시험 제출
              {!allAnswered && (
                <span className="ml-2 text-indigo-200 text-sm">
                  (미응답 {unansweredCount}문제)
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
