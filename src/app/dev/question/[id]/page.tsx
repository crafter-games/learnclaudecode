import { notFound } from "next/navigation";
import { getContent } from "@/lib/content/load";
import { chipsFor } from "@/lib/game/cues";
import { publicQuestion } from "@/lib/study/session";
import { QuestionPreview } from "./preview";

/** Development-only: play one question by id (or the first of a format: /dev/question/format:config). */
export default async function DevQuestion({ params }: PageProps<"/dev/question/[id]">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await params;
  const key = decodeURIComponent(id);
  const { questions, concepts } = getContent();
  const q = key.startsWith("format:") ? [...questions.values()].find((x) => (x.format ?? "scenario") === key.slice(7)) : questions.get(key);
  if (!q) notFound();
  const pub = publicQuestion(q);
  return <QuestionPreview question={{ ...pub, cues: q.keywordCues, chips: chipsFor(q.keywordCues, q.stem) }} conceptTitle={concepts.get(q.conceptId)?.titleEs} />;
}
