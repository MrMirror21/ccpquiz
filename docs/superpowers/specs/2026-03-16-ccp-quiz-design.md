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

### Multi-Answer Questions

Some questions are "select TWO/THREE" style. The correct answer field may contain multiple letters (e.g., `Correct Answer: AC` or `Correct Answer: A, C`). The parser normalizes these into an array of single letters.

- UI: multi-select questions use checkboxes; single-answer questions use radio buttons.
- A "Submit" button appears for multi-select questions (user selects all choices, then submits).
- Scoring: all-or-nothing. Partial selections are scored as wrong.

### Parsing Error Handling

- **Invalid file type:** Reject non-PDF files immediately with an error message.
- **Zero questions parsed:** Show error "No questions found. Please check the PDF format."
- **Partial failures:** Skip malformed questions silently. Show "N questions parsed (M skipped)" so the user knows.
- **Image-based PDFs:** `pdfjs-dist` extracts no text. Falls into the "zero questions" case above.

### Data Structure

```ts
interface Question {
  id: number;
  text: string;
  options: { label: string; text: string }[];
  correctAnswers: string[];  // ["A"] for single, ["A","C"] for multi
  isMultiSelect: boolean;
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
  pdfHash: string;            // SHA-256 hash of uploaded file for identity check
  totalCount: number;
  shuffledIds: number[];      // persisted shuffle order for resume
  currentIndex: number;       // persisted progress index
  mode: "all" | "wrong-only";
  results: {
    [questionId: number]: {
      selected: string[];     // user's selected answers
      correct: boolean;
    };
  };
  lastUpdated: string;        // ISO timestamp
}
```

- Saved immediately after each answer (including shuffledIds and currentIndex)
- On new PDF upload: compare `pdfHash`. If different, discard old record. If same, offer resume.
- "Wrong only" mode filters `correct: false` entries

### Navigation Guards & Refresh Handling

- **Direct navigation to `/quiz` or `/result` without data:** Redirect to `/`.
- **Page refresh mid-quiz:** Parsed questions are also persisted to localStorage (key: `ccpquiz-questions`). On refresh, restore questions + shuffle order + progress from localStorage. User resumes exactly where they left off.
- **Estimated localStorage size:** ~719 questions serialized to JSON is well under 1 MB. No size concerns.

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
- Single-answer: radio buttons. Multi-select: checkboxes + "Submit" button.
- On answer submit:
  - Correct: green highlight on selected + checkmark icon
  - Wrong: red highlight on selected + green on correct answer + X icon
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
