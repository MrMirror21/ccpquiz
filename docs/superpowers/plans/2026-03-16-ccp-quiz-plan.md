# AWS CCP Quiz Bank Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js quiz app that parses uploaded AWS CCP exam dump PDFs client-side and provides randomized quizzes with instant feedback and localStorage persistence.

**Architecture:** Client-only SPA using Next.js App Router. PDF parsed in-browser with pdfjs-dist. State managed via React Context, persisted to localStorage for resume and wrong-answer retry. Three pages: upload, quiz, result.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, pdfjs-dist

**Spec:** `docs/superpowers/specs/2026-03-16-ccp-quiz-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout, QuizProvider wrapper, global styles
│   ├── page.tsx              # Upload page
│   ├── quiz/
│   │   └── page.tsx          # Quiz page
│   └── result/
│       └── page.tsx          # Result page
├── components/
│   ├── FileUpload.tsx        # Drag-and-drop PDF upload
│   ├── QuestionCard.tsx      # Question text + options (radio/checkbox)
│   ├── ProgressBar.tsx       # Quiz progress indicator
│   └── ResultSummary.tsx     # Score + wrong question list
├── context/
│   └── QuizContext.tsx       # React Context + Provider + hooks
└── lib/
    ├── types.ts              # Question, QuizRecord, QuizState interfaces
    ├── pdf-parser.ts         # PDF text extraction + question parsing
    ├── storage.ts            # localStorage read/write/clear helpers
    ├── shuffle.ts            # Fisher-Yates shuffle
    └── hash.ts               # SHA-256 file hashing via Web Crypto API
```

---

## Chunk 1: Project Setup & Core Utilities

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create Next.js app with TypeScript and Tailwind**

```bash
cd /Users/han-ujun/Documents/GitHub/ccpquiz
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Accept defaults. This scaffolds the project with App Router, TypeScript, and Tailwind.

- [ ] **Step 2: Install dependencies**

```bash
npm install pdfjs-dist
```

- [ ] **Step 3: Verify setup**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js project with Tailwind, Vitest"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write type definitions**

```ts
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
  mode: "all" | "wrong-only";
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

export type QuizMode = "all" | "wrong-only";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add type definitions for Question and QuizRecord"
```

---

### Task 3: Shuffle Utility

**Files:**
- Create: `src/lib/shuffle.ts`

- [ ] **Step 1: Write implementation**

```ts
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shuffle.ts
git commit -m "feat: add Fisher-Yates shuffle utility"
```

---

### Task 4: SHA-256 Hash Utility

**Files:**
- Create: `src/lib/hash.ts`

- [ ] **Step 1: Write implementation**

```ts
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

Note: Web Crypto API is available in all modern browsers. No test needed — it's a thin wrapper over a platform API.

- [ ] **Step 2: Commit**

```bash
git add src/lib/hash.ts
git commit -m "feat: add SHA-256 file hashing utility"
```

---

### Task 5: localStorage Helpers

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Write implementation**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add localStorage helpers for quiz record and questions"
```

---

## Chunk 2: PDF Parser

### Task 6: PDF Parser

**Files:**
- Create: `src/lib/pdf-parser.ts`

- [ ] **Step 1: Write implementation**

```ts
import type { Question } from "./types";

export function parseQuestions(rawText: string): Question[] {
  const questions: Question[] = [];

  // Split by QUESTION N pattern
  const blocks = rawText.split(/(?=QUESTION\s+\d+)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    try {
      const question = parseBlock(trimmed);
      if (question) {
        questions.push(question);
      }
    } catch {
      // Skip malformed questions
    }
  }

  return questions;
}

function parseBlock(block: string): Question | null {
  // Extract question number
  const idMatch = block.match(/^QUESTION\s+(\d+)/);
  if (!idMatch) return null;
  const id = parseInt(idMatch[1], 10);

  // Remove everything from "Explanation" onward
  const withoutExplanation = block.split(/\nExplanation\b/)[0];

  // Extract correct answer
  const answerMatch = withoutExplanation.match(/Correct Answer:\s*([A-F][,\s]*[A-F]*)/i);
  if (!answerMatch) return null;
  const correctAnswers = answerMatch[1]
    .replace(/[\s,]+/g, "")
    .split("")
    .filter((c) => /[A-F]/.test(c));

  // Extract question text (between QUESTION N line and first option)
  const afterId = block.substring(idMatch[0].length).trim();
  const firstOptionIndex = afterId.search(/^[A-F]\.\s/m);
  if (firstOptionIndex === -1) return null;
  const text = afterId.substring(0, firstOptionIndex).trim();

  // Extract options by splitting on line-start option patterns
  const optionsSection = withoutExplanation
    .substring(withoutExplanation.indexOf(text) + text.length)
    .split(/Correct Answer:/)[0]
    .trim();

  // Split by option labels at line start (e.g., "\nA. "), then parse each piece
  const optionParts = optionsSection.split(/^(?=[A-F]\.\s)/m).filter((s) => s.trim());
  const options: { label: string; text: string }[] = [];
  for (const part of optionParts) {
    const labelMatch = part.match(/^([A-F])\.\s([\s\S]*)/);
    if (labelMatch) {
      options.push({
        label: labelMatch[1],
        text: labelMatch[2].trim().replace(/\n/g, " "),
      });
    }
  }

  if (options.length === 0) return null;

  return {
    id,
    text,
    options,
    correctAnswers,
    isMultiSelect: correctAnswers.length > 1,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pdf-parser.ts
git commit -m "feat: add PDF question parser with multi-answer support"
```

---

### Task 7: PDF Text Extraction

**Files:**
- Create: `src/lib/pdf-extract.ts`

- [ ] **Step 1: Write PDF text extractor**

This wraps `pdfjs-dist` to extract raw text from a PDF file. Not unit-tested (relies on pdfjs-dist internals).

```ts
import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // IMPORTANT: Use hasEOL to preserve line breaks from the PDF.
    // Without newlines, the parser's regex patterns (which use ^ with m flag) will fail.
    const pageText = content.items
      .map((item: any) => item.str + (item.hasEOL ? "\n" : ""))
      .join("");
    textParts.push(pageText);
  }

  return textParts.join("\n");
}
```

Note: The worker path may need adjustment based on the pdfjs-dist version. If `pdf.worker.min.mjs` doesn't resolve, try `pdf.worker.mjs` or use CDN fallback (see Task 16).

- [ ] **Step 2: Commit**

```bash
git add src/lib/pdf-extract.ts
git commit -m "feat: add PDF text extraction using pdfjs-dist"
```

---

## Chunk 3: Quiz Context & State Management

### Task 8: QuizContext Provider

**Files:**
- Create: `src/context/QuizContext.tsx`

- [ ] **Step 1: Write the context + provider**

```tsx
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
```

- [ ] **Step 2: Wire QuizProvider into root layout**

Edit `src/app/layout.tsx`: wrap `{children}` with `<QuizProvider>`.

```tsx
import { QuizProvider } from "@/context/QuizContext";

// Inside RootLayout body:
<body>
  <QuizProvider>{children}</QuizProvider>
</body>
```

- [ ] **Step 3: Commit**

```bash
git add src/context/QuizContext.tsx src/app/layout.tsx
git commit -m "feat: add QuizContext with localStorage persistence and resume"
```

---

## Chunk 4: Upload Page

### Task 9: FileUpload Component

**Files:**
- Create: `src/components/FileUpload.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState, useCallback, useRef } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileSelected, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        alert("PDF 파일만 업로드할 수 있습니다.");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
        ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
        ${isLoading ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
      />
      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-gray-600">PDF 파싱 중...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg text-gray-600">
            PDF 파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-gray-400">AWS CCP 덤프 파일 (CLF-C02)</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FileUpload.tsx
git commit -m "feat: add FileUpload component with drag-and-drop"
```

---

### Task 10: Upload Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement the upload page**

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import { useQuiz } from "@/context/QuizContext";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { parseQuestions } from "@/lib/pdf-parser";
import { hashFile } from "@/lib/hash";
import type { Question } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const { startQuiz, resumeQuiz, questions, record, isLoaded } = useQuiz();
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<{
    total: number;
    skipped: number;
    pdfHash: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use ref to hold parsed questions between upload and start (avoids global mutable)
  const parsedQuestionsRef = useRef<Question[]>([]);
  const pdfHashRef = useRef<string>("");

  const handleFileSelected = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParseResult(null);

    try {
      const [rawText, pdfHash] = await Promise.all([
        extractTextFromPdf(file),
        hashFile(file),
      ]);

      const parsed = parseQuestions(rawText);

      if (parsed.length === 0) {
        setError("문제를 찾을 수 없습니다. PDF 형식을 확인해주세요.");
        return;
      }

      const totalBlocks = (rawText.match(/QUESTION\s+\d+/g) || []).length;
      const skipped = totalBlocks - parsed.length;

      parsedQuestionsRef.current = parsed;
      pdfHashRef.current = pdfHash;
      setParseResult({ total: parsed.length, skipped, pdfHash });
    } catch {
      setError("PDF를 읽는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStart = useCallback(
    (mode: "all" | "wrong-only") => {
      const parsed = parsedQuestionsRef.current;
      const pdfHash = pdfHashRef.current;
      if (parsed.length === 0 || !pdfHash) return;
      startQuiz(parsed, pdfHash, mode);
      router.push("/quiz");
    },
    [startQuiz, router]
  );

  // Resume from existing localStorage record
  const handleResume = useCallback(() => {
    if (resumeQuiz()) {
      router.push("/quiz");
    }
  }, [resumeQuiz, router]);

  // Wrong-only retry from existing record (uses questions already in context, not from ref)
  const handleRetryWrong = useCallback(() => {
    if (record && questions.length > 0) {
      startQuiz(questions, record.pdfHash, "wrong-only");
      router.push("/quiz");
    }
  }, [startQuiz, questions, record, router]);

  if (!isLoaded) return null;

  // Derive resume state from context (not from direct localStorage read)
  const hasExistingRecord = !!record && questions.length > 0;
  const wrongCount = record
    ? Object.values(record.results).filter((r) => !r.correct).length
    : 0;
  const answeredCount = record
    ? Object.keys(record.results).length
    : 0;

  // Check if newly uploaded PDF matches existing record
  const isSamePdf = parseResult && record && parseResult.pdfHash === record.pdfHash;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AWS CCP Quiz</h1>
          <p className="mt-2 text-gray-500">CLF-C02 문제은행</p>
        </div>

        <FileUpload onFileSelected={handleFileSelected} isLoading={isLoading} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {parseResult && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <p className="text-lg">
              <span className="font-semibold text-blue-600">{parseResult.total}개</span> 문제 파싱 완료
              {parseResult.skipped > 0 && (
                <span className="text-sm text-gray-400 ml-2">
                  ({parseResult.skipped}개 건너뜀)
                </span>
              )}
            </p>
            <button
              onClick={() => handleStart("all")}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              시작하기
            </button>
            {/* If same PDF as before, offer resume with new upload too */}
            {isSamePdf && answeredCount > 0 && (
              <button
                onClick={handleResume}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                이어서 풀기 ({answeredCount}/{record!.totalCount} 완료)
              </button>
            )}
          </div>
        )}

        {hasExistingRecord && !parseResult && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
            <p className="text-sm text-gray-500">이전 학습 기록이 있습니다</p>
            <button
              onClick={handleResume}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              이어서 풀기 ({answeredCount}/{record!.totalCount} 완료)
            </button>
            {wrongCount > 0 && (
              <button
                onClick={handleRetryWrong}
                className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                틀린 문제만 풀기 ({wrongCount}개)
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: implement upload page with PDF parsing and resume"
```

---

## Chunk 5: Quiz Page

### Task 11: ProgressBar Component

**Files:**
- Create: `src/components/ProgressBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-500 mb-1">
        <span>{current} / {total}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProgressBar.tsx
git commit -m "feat: add ProgressBar component"
```

---

### Task 12: QuestionCard Component

**Files:**
- Create: `src/components/QuestionCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState, useCallback } from "react";
import type { Question } from "@/lib/types";

interface QuestionCardProps {
  question: Question;
  onSubmit: (selected: string[]) => boolean; // returns isCorrect
  onNext: () => void;
  isLast: boolean;
}

export default function QuestionCard({
  question,
  onSubmit,
  onNext,
  isLast,
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

    const isSelected = selected.includes(label);
    const isAnswer = question.correctAnswers.includes(label);

    if (isAnswer) return "border-green-500 bg-green-50";
    if (isSelected && !isAnswer) return "border-red-500 bg-red-50";
    return "border-gray-200 opacity-50";
  };

  const getIcon = (label: string) => {
    if (!submitted) return null;
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
          <p className={`font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
            {isCorrect ? "정답입니다!" : "오답입니다."}
          </p>
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuestionCard.tsx
git commit -m "feat: add QuestionCard with single/multi-select and feedback"
```

---

### Task 13: Quiz Page

**Files:**
- Create: `src/app/quiz/page.tsx`

- [ ] **Step 1: Write the quiz page**

```tsx
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
        <ProgressBar
          current={currentIndex + 1}
          total={shuffledIds.length}
        />
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/quiz/page.tsx
git commit -m "feat: implement quiz page with navigation guard"
```

---

## Chunk 6: Result Page

### Task 14: ResultSummary Component

**Files:**
- Create: `src/components/ResultSummary.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { QuizRecord, Question } from "@/lib/types";

interface ResultSummaryProps {
  record: QuizRecord;
  questions: Question[];
}

export default function ResultSummary({ record, questions }: ResultSummaryProps) {
  const results = Object.entries(record.results);
  const correctCount = results.filter(([, r]) => r.correct).length;
  const totalAnswered = results.length;
  const percentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const wrongQuestions = results
    .filter(([, r]) => !r.correct)
    .map(([id]) => {
      const q = questions.find((q) => q.id === parseInt(id, 10));
      return q;
    })
    .filter(Boolean) as Question[];

  const passingScore = 700;
  const score = percentage * 10; // rough mapping to 1000-point scale
  const passed = score >= passingScore;

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className={`rounded-xl p-8 text-center ${passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <p className="text-5xl font-bold mb-2" style={{ color: passed ? "#16a34a" : "#dc2626" }}>
          {percentage}%
        </p>
        <p className="text-lg text-gray-600">
          {totalAnswered}문제 중 {correctCount}문제 정답
        </p>
        <p className={`mt-2 text-sm font-medium ${passed ? "text-green-600" : "text-red-600"}`}>
          {passed ? "합격 기준 충족 (700/1000)" : "합격 기준 미달 (700/1000)"}
        </p>
      </div>

      {/* Wrong questions list */}
      {wrongQuestions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            틀린 문제 ({wrongQuestions.length}개)
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {wrongQuestions.map((q) => (
              <div key={q.id} className="flex gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
                <span className="text-red-500 font-medium shrink-0">Q{q.id}</span>
                <p className="text-gray-600 line-clamp-2">{q.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ResultSummary.tsx
git commit -m "feat: add ResultSummary component with score and wrong list"
```

---

### Task 15: Result Page

**Files:**
- Create: `src/app/result/page.tsx`

- [ ] **Step 1: Write the result page**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/result/page.tsx
git commit -m "feat: implement result page with retry and reset options"
```

---

### Task 16: Final Integration & Verification

**Files:**
- Modify: `src/app/layout.tsx` (verify QuizProvider is wired)
- Possibly adjust: `next.config.ts` (for pdfjs-dist worker)

- [ ] **Step 1: Configure pdfjs-dist worker in next.config.ts**

If the pdf.worker file doesn't resolve, add webpack config:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 2: Run the dev server and manually test**

Run: `npm run dev`
Test with an actual CCP PDF:
1. Upload PDF on `/`
2. Verify question count
3. Answer a few questions on `/quiz`
4. Refresh browser — verify resume works
5. Complete quiz — check `/result`
6. Try "틀린 문제만 다시 풀기"

- [ ] **Step 3: Fix any pdfjs-dist worker issues**

If the worker fails to load, try setting the worker source to a CDN:

```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
```

- [ ] **Step 4: Build for production**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: finalize integration, fix worker config"
```

---
