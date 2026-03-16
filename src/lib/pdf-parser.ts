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
