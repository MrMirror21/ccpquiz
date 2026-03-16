# AWS CCP Quiz Bank — Design Spec

## Overview

A Next.js web app where users upload an AWS CCP (CLF-C02) exam dump PDF, which is parsed client-side into quiz questions. Users take randomized quizzes with instant feedback, and progress is persisted in localStorage for wrong-answer review.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **PDF Parsing:** pdfjs-dist (client-side)
- **State Management:** React Context
- **Persistence:** localStorage
- **Deployment:** Vercel (static export compatible)

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| Upload | `/` | PDF upload, parse, start quiz |
| Quiz | `/quiz` | One question at a time, instant feedback |
| Result | `/result` | Score summary, wrong question list, retry options |

## PDF Parsing

### Input Format

The PDF contains ~719 questions in this format:

```
QUESTION N
<question text>
A. <option A>
B. <option B>
C. <option C>
D. <option D>
Correct Answer: X
Explanation
Explanation/Reference:
...
```

### Parsing Strategy

1. Extract all text from PDF using `pdfjs-dist`
2. Split by `QUESTION \d+` pattern to isolate each question block
3. For each block:
   - Question text: everything before the first option (`A.`)
   - Options: lines starting with `A.`, `B.`, `C.`, `D.` (and optionally `E.`, `F.`)
   - Correct answer: value after `Correct Answer:`
   - Ignore everything after `Explanation`

### Data Structure

```ts
interface Question {
  id: number;
  text: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
}
```

## State Management

### React Context (QuizContext)

```ts
interface QuizState {
  questions: Question[];       // parsed questions
  currentIndex: number;        // index in shuffled array
  mode: "all" | "wrong-only";  // quiz mode
  shuffledIds: number[];       // shuffled question order
}
```

### localStorage Structure

Key: `ccpquiz-record`

```ts
interface QuizRecord {
  totalCount: number;
  results: {
    [questionId: number]: {
      selected: string;
      correct: boolean;
    };
  };
  lastUpdated: string; // ISO timestamp
}
```

- Saved immediately after each answer
- Cleared on new PDF upload
- "Wrong only" mode filters `correct: false` entries

## UI/UX Flow

### Upload Page (`/`)

- Drag-and-drop or click-to-upload for PDF
- Loading spinner during parse
- On success: "N questions found — Start" button
- If previous record exists:
  - "Continue (N/M completed)" button
  - "Wrong answers only (N questions)" button

### Quiz Page (`/quiz`)

- Top: progress bar (current / total)
- Question text
- 4-6 option buttons
- On option click:
  - Correct: green highlight on selected
  - Wrong: red highlight on selected + green on correct answer
- "Next" button appears after answering
- After last question: auto-navigate to result

### Result Page (`/result`)

- Score: correct / total (percentage)
- List of wrong questions (question number + preview)
- Buttons: "Start over", "Retry wrong answers", "Upload new file"

## Key Design Decisions

1. **Client-only PDF parsing:** No server needed. User's file never leaves the browser. Simpler deployment, better privacy.
2. **No question count selection:** Full question set or wrong-only mode. Keeps the UI simple.
3. **Shuffle on every session:** Questions are re-shuffled each time the user starts a quiz, preventing memorization of order.
4. **Immediate save:** Each answer is persisted to localStorage instantly, so browser refresh doesn't lose progress.
