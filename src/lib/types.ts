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
  unscoredIds?: number[];
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
export const MOCK_UNSCORED_COUNT = 15;
export const MOCK_SCORED_COUNT = MOCK_EXAM_COUNT - MOCK_UNSCORED_COUNT;
