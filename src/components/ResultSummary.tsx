import type { QuizRecord, Question } from "@/lib/types";

interface ResultSummaryProps {
  record: QuizRecord;
  questions: Question[];
}

export default function ResultSummary({ record, questions }: ResultSummaryProps) {
  const results = Object.entries(record.results);
  const isMock = record.mode === "mock";
  const unscoredSet = new Set(record.unscoredIds ?? []);

  // Separate scored vs unscored results for mock mode
  const scoredResults = isMock
    ? results.filter(([id]) => !unscoredSet.has(parseInt(id, 10)))
    : results;
  const unscoredResults = isMock
    ? results.filter(([id]) => unscoredSet.has(parseInt(id, 10)))
    : [];

  const scoredCorrect = scoredResults.filter(([, r]) => r.correct).length;
  const scoredTotal = scoredResults.length;
  const scoredPercentage = scoredTotal > 0 ? Math.round((scoredCorrect / scoredTotal) * 100) : 0;

  const allCorrect = results.filter(([, r]) => r.correct).length;
  const allTotal = results.length;
  const allPercentage = allTotal > 0 ? Math.round((allCorrect / allTotal) * 100) : 0;

  const passingScore = 700;
  const score = scoredPercentage * 10;
  const passed = score >= passingScore;

  // Build full question list for mock review
  const allQuestionResults = record.shuffledIds
    .map((qid) => {
      const q = questions.find((q) => q.id === qid);
      const r = record.results[qid];
      if (!q || !r) return null;
      return {
        question: q,
        result: r,
        unscored: unscoredSet.has(qid),
      };
    })
    .filter(Boolean) as { question: Question; result: { selected: string[]; correct: boolean }; unscored: boolean }[];

  const wrongQuestions = allQuestionResults.filter((item) => !item.result.correct);

  return (
    <div className="space-y-6">
      {/* Score card */}
      {isMock ? (
        <div className={`rounded-xl p-8 text-center ${passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <p className="text-xs font-medium text-gray-400 mb-1">모의고사</p>
          <p className="text-5xl font-bold mb-2" style={{ color: passed ? "#16a34a" : "#dc2626" }}>
            {scoredPercentage}%
          </p>
          <p className="text-lg text-gray-600">
            채점 {scoredTotal}문제 중 {scoredCorrect}문제 정답
          </p>
          <p className="text-sm text-gray-400 mt-1">
            전체 {allTotal}문제 중 {allCorrect}문제 정답 (비채점 {unscoredResults.length}문제 포함)
          </p>
          <p className={`mt-2 text-sm font-medium ${passed ? "text-green-600" : "text-red-600"}`}>
            {passed ? `합격 (${score}/1000)` : `불합격 (${score}/1000, 합격 기준 700)`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl p-8 text-center bg-blue-50 border border-blue-200">
          <p className="text-xs font-medium text-gray-400 mb-1">문제 회독</p>
          <p className="text-5xl font-bold mb-2 text-blue-600">
            {allPercentage}%
          </p>
          <p className="text-lg text-gray-600">
            {allTotal}문제 중 {allCorrect}문제 정답
          </p>
        </div>
      )}

      {/* Mock: full question breakdown */}
      {isMock && allQuestionResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            전체 문제 결과
          </h2>
          <div className="flex gap-3 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> 정답</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> 오답</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" /> 비채점</span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {allQuestionResults.map((item, idx) => {
              const bg = item.unscored
                ? "bg-gray-100 border-gray-300 text-gray-400"
                : item.result.correct
                  ? "bg-green-50 border-green-400 text-green-700"
                  : "bg-red-50 border-red-400 text-red-700";
              return (
                <div
                  key={item.question.id}
                  className={`relative border rounded text-center text-xs font-medium py-1.5 ${bg}`}
                  title={`Q${item.question.id}${item.unscored ? " (비채점)" : ""}`}
                >
                  {idx + 1}
                  {item.unscored && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border border-white" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wrong questions list */}
      {wrongQuestions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            틀린 문제 ({wrongQuestions.length}개)
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {wrongQuestions.map((item) => (
              <div key={item.question.id} className="flex gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
                <span className="text-red-500 font-medium shrink-0">Q{item.question.id}</span>
                {isMock && item.unscored && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">비채점</span>
                )}
                <p className="text-gray-600 line-clamp-2">{item.question.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
