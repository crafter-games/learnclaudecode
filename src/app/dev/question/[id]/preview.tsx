"use client";

import { GameQuestion, type GameQuestionData } from "@/components/game/game-question";

export function QuestionPreview({ question, conceptTitle }: { question: GameQuestionData; conceptTitle?: string }) {
  return <GameQuestion question={question} mode="review" conceptTitle={conceptTitle} autoRead={false} onAnswered={() => {}} onNext={() => location.reload()} />;
}
