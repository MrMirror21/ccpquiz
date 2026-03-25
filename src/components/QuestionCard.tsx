"use client";

import { useState, useCallback } from "react";
import type { Question } from "@/lib/types";

interface QuestionCardProps {
  question: Question;
  onSubmit: (selected: string[]) => boolean; // returns isCorrect
  onNext: () => void;
  isLast: boolean;
  showFeedback?: boolean;
}

export default function QuestionCard({
  question,
  onSubmit,
  onNext,
  isLast,
  showFeedback = true,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSelect = useCallback(
    (label: string) => {
      if (submitted) return;

      if (question.isMultiSelect) {
        setSelected((prev) =>
          prev.includes(label)
            ? prev.filter((l) => l !== label)
            : [...prev, label]
        );
      } else {
        setSelected([label]);
      }
    },
    [submitted, question.isMultiSelect]
  );

  const handleSubmit = useCallback(() => {
    if (selected.length === 0) return;
    const correct = onSubmit(selected);
    setIsCorrect(correct);
    setSubmitted(true);
  }, [selected, onSubmit]);

  const handleNext = useCallback(() => {
    setSelected([]);
    setSubmitted(false);
    setIsCorrect(false);
    onNext();
  }, [onNext]);

  // Auto-submit for single-answer questions
  const handleOptionClick = useCallback(
    (label: string) => {
      if (submitted) return;

      if (!question.isMultiSelect) {
        setSelected([label]);
        const correct = onSubmit([label]);
        setIsCorrect(correct);
        setSubmitted(true);
      } else {
        handleSelect(label);
      }
    },
    [submitted, question.isMultiSelect, onSubmit, handleSelect]
  );

  const getOptionStyle = (label: string) => {
    if (!submitted) {
      return selected.includes(label)
        ? "border-blue-500 bg-blue-50"
        : "border-gray-200 hover:border-gray-300";
    }

    if (!showFeedback) {
      return selected.includes(label)
        ? "border-blue-500 bg-blue-50"
        : "border-gray-200 opacity-50";
    }

    const isSelected = selected.includes(label);
    const isAnswer = question.correctAnswers.includes(label);

    if (isAnswer) return "border-green-500 bg-green-50";
    if (isSelected && !isAnswer) return "border-red-500 bg-red-50";
    return "border-gray-200 opacity-50";
  };

  const getIcon = (label: string) => {
    if (!submitted || !showFeedback) return null;
    const isSelected = selected.includes(label);
    const isAnswer = question.correctAnswers.includes(label);

    if (isAnswer) return <span className="text-green-600 font-bold">✓</span>;
    if (isSelected && !isAnswer) return <span className="text-red-600 font-bold">✗</span>;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-3">
          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded shrink-0">
            Q{question.id}
          </span>
          <p className="text-gray-900 whitespace-pre-line">{question.text}</p>
        </div>
        {question.isMultiSelect && (
          <p className="mt-2 text-sm text-orange-600 font-medium">
            복수 선택 문제입니다 ({question.correctAnswers.length}개 선택)
          </p>
        )}
      </div>

      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.label}
            onClick={() => handleOptionClick(option.label)}
            disabled={submitted}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors flex items-center gap-3 ${getOptionStyle(option.label)}`}
          >
            <span className="font-medium text-gray-500 shrink-0">
              {option.label}.
            </span>
            <span className="flex-1">{option.text}</span>
            {getIcon(option.label)}
          </button>
        ))}
      </div>

      {question.isMultiSelect && !submitted && (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          제출하기
        </button>
      )}

      {submitted && (
        <div className="flex items-center justify-between">
          {showFeedback ? (
            <p className={`font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
              {isCorrect ? "정답입니다!" : "오답입니다."}
            </p>
          ) : (
            <p className="font-medium text-gray-400">답안 제출 완료</p>
          )}
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            {isLast ? "결과 보기" : "다음 문제"}
          </button>
        </div>
      )}
    </div>
  );
}
