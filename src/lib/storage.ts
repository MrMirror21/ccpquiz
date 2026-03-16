import type { QuizRecord, Question } from "./types";

const RECORD_KEY = "ccpquiz-record";
const QUESTIONS_KEY = "ccpquiz-questions";

export function saveRecord(record: QuizRecord): void {
  localStorage.setItem(RECORD_KEY, JSON.stringify(record));
}

export function loadRecord(): QuizRecord | null {
  const data = localStorage.getItem(RECORD_KEY);
  if (!data) return null;
  return JSON.parse(data) as QuizRecord;
}

export function clearRecord(): void {
  localStorage.removeItem(RECORD_KEY);
}

export function saveQuestions(questions: Question[]): void {
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

export function loadQuestions(): Question[] | null {
  const data = localStorage.getItem(QUESTIONS_KEY);
  if (!data) return null;
  return JSON.parse(data) as Question[];
}

export function clearQuestions(): void {
  localStorage.removeItem(QUESTIONS_KEY);
}
