export interface Question {
  id: number;
  text: string;
  options: { label: string; text: string }[];
  correctAnswers: string[];
  isMultiSelect: boolean;
}

export interface QuizRecord {
  pdfHash: string;
  totalCount: number;
  shuffledIds: number[];
  currentIndex: number;
  mode: QuizMode;
  results: {
    [questionId: number]: {
      selected: string[];
      correct: boolean;
    };
  };
  lastUpdated: string;
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  mode: QuizMode;
  shuffledIds: number[];
}

export type QuizMode = "all" | "wrong-only" | "mock";

export const MOCK_EXAM_COUNT = 65;
