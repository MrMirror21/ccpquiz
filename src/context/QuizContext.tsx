"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Question, QuizRecord, QuizMode } from "@/lib/types";
import { shuffleArray } from "@/lib/shuffle";
import {
  saveRecord,
  loadRecord,
  clearRecord,
  saveQuestions,
  loadQuestions,
  clearQuestions,
} from "@/lib/storage";

interface QuizContextValue {
  // State
  questions: Question[];
  currentIndex: number;
  mode: QuizMode;
  shuffledIds: number[];
  record: QuizRecord | null;
  isLoaded: boolean;

  // Actions
  startQuiz: (questions: Question[], pdfHash: string, mode: QuizMode) => void;
  resumeQuiz: () => boolean;
  submitAnswer: (questionId: number, selected: string[]) => boolean;
  nextQuestion: () => boolean; // returns false if last question
  resetQuiz: () => void;
  getCurrentQuestion: () => Question | null;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<QuizMode>("all");
  const [shuffledIds, setShuffledIds] = useState<number[]>([]);
  const [record, setRecord] = useState<QuizRecord | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    const savedRecord = loadRecord();
    const savedQuestions = loadQuestions();
    if (savedRecord && savedQuestions) {
      setRecord(savedRecord);
      setQuestions(savedQuestions);
      setShuffledIds(savedRecord.shuffledIds);
      setCurrentIndex(savedRecord.currentIndex);
      setMode(savedRecord.mode);
    }
    setIsLoaded(true);
  }, []);

  const startQuiz = useCallback(
    (newQuestions: Question[], pdfHash: string, newMode: QuizMode) => {
      let targetQuestions = newQuestions;
      const existingRecord = loadRecord();

      if (newMode === "wrong-only" && existingRecord) {
        const wrongIds = Object.entries(existingRecord.results)
          .filter(([, r]) => !r.correct)
          .map(([id]) => parseInt(id, 10));
        targetQuestions = newQuestions.filter((q) => wrongIds.includes(q.id));
      }

      const ids = shuffleArray(targetQuestions.map((q) => q.id));
      const newRecord: QuizRecord = {
        pdfHash,
        totalCount: ids.length,
        shuffledIds: ids,
        currentIndex: 0,
        mode: newMode,
        results: {},
        lastUpdated: new Date().toISOString(),
      };

      setQuestions(newQuestions);
      setShuffledIds(ids);
      setCurrentIndex(0);
      setMode(newMode);
      setRecord(newRecord);

      saveQuestions(newQuestions);
      saveRecord(newRecord);
    },
    []
  );

  const resumeQuiz = useCallback((): boolean => {
    const savedRecord = loadRecord();
    const savedQuestions = loadQuestions();
    if (!savedRecord || !savedQuestions) return false;

    setQuestions(savedQuestions);
    setShuffledIds(savedRecord.shuffledIds);
    setCurrentIndex(savedRecord.currentIndex);
    setMode(savedRecord.mode);
    setRecord(savedRecord);
    return true;
  }, []);

  const submitAnswer = useCallback(
    (questionId: number, selected: string[]): boolean => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return false;

      const sortedSelected = [...selected].sort();
      const sortedCorrect = [...question.correctAnswers].sort();
      const isCorrect =
        sortedSelected.length === sortedCorrect.length &&
        sortedSelected.every((v, i) => v === sortedCorrect[i]);

      setRecord((prev) => {
        if (!prev) return prev;
        const updated: QuizRecord = {
          ...prev,
          results: {
            ...prev.results,
            [questionId]: { selected, correct: isCorrect },
          },
          lastUpdated: new Date().toISOString(),
        };
        saveRecord(updated);
        return updated;
      });

      return isCorrect;
    },
    [questions]
  );

  const nextQuestion = useCallback((): boolean => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= shuffledIds.length) return false;

    setCurrentIndex(nextIdx);
    setRecord((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, currentIndex: nextIdx };
      saveRecord(updated);
      return updated;
    });

    return true;
  }, [currentIndex, shuffledIds.length]);

  const getCurrentQuestion = useCallback((): Question | null => {
    if (shuffledIds.length === 0) return null;
    const questionId = shuffledIds[currentIndex];
    return questions.find((q) => q.id === questionId) ?? null;
  }, [questions, shuffledIds, currentIndex]);

  const resetQuiz = useCallback(() => {
    setQuestions([]);
    setShuffledIds([]);
    setCurrentIndex(0);
    setRecord(null);
    clearRecord();
    clearQuestions();
  }, []);

  return (
    <QuizContext.Provider
      value={{
        questions,
        currentIndex,
        mode,
        shuffledIds,
        record,
        isLoaded,
        startQuiz,
        resumeQuiz,
        submitAnswer,
        nextQuestion,
        resetQuiz,
        getCurrentQuestion,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz(): QuizContextValue {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
}
