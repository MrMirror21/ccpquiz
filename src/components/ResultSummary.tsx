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
