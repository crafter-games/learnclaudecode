import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { toFile } from "openai";
import { db, schema } from "@/db";
import { aiForUser, assertBudget, MODELS, recordUsage, SYSTEM_USER, systemAI } from "./client";

const VOICE = process.env.OPENAI_TTS_VOICE ?? "alloy";

const INSTRUCTIONS = {
  en: "Read clearly at a moderate pace, like an exam proctor reading a question. Pronounce Claude Code commands, flags and file names correctly.",
  es: "Habla en español neutro latinoamericano, claro y a ritmo moderado. Pronuncia en inglés los comandos, flags, eventos y nombres de archivo de Claude Code (por ejemplo PreToolUse, settings.json, --output-format).",
};

async function synth(ai: Awaited<ReturnType<typeof aiForUser>>, text: string, lang: "en" | "es") {
  const res = await ai.audio.speech.create({
    model: MODELS.tts,
    voice: VOICE,
    input: text,
    response_format: "mp3",
    instructions: INSTRUCTIONS[lang],
  });
  return Buffer.from(await res.arrayBuffer());
}

const secondsFor = (text: string) => (text.split(/\s+/).length / 150) * 60; // ~150 wpm

/**
 * Shared content (questions, cards, narration): generated once with the server
 * key and cached for every user.
 */
export async function speakShared(text: string, lang: "en" | "es"): Promise<Buffer> {
  const key = createHash("sha256").update(`${MODELS.tts}|${VOICE}|${lang}|${text}`).digest("hex");
  const [hit] = await db.select().from(schema.audioCache).where(eq(schema.audioCache.key, key));
  if (hit) return hit.data;
  const data = await synth(systemAI(), text, lang);
  await db.insert(schema.audioCache).values({ key, mime: "audio/mpeg", data }).onConflictDoNothing();
  await recordUsage({ userId: SYSTEM_USER, purpose: "tts-shared", model: MODELS.tts, kind: "tts", audioSeconds: secondsFor(text) });
  return data;
}

/** Personal text (e.g. spoken feedback): user's key, never cached. */
export async function speakPersonal(userId: string, text: string, lang: "en" | "es"): Promise<Buffer> {
  await assertBudget(userId);
  const data = await synth(await aiForUser(userId), text, lang);
  await recordUsage({ userId, purpose: "tts", model: MODELS.tts, kind: "tts", audioSeconds: secondsFor(text) });
  return data;
}

export async function transcribe(userId: string, audio: Blob, durationSec: number): Promise<string> {
  await assertBudget(userId);
  // The extension must match the container: Chrome records webm, Safari/iOS records mp4.
  const type = (audio.type || "audio/webm").split(";")[0];
  const ext = ({ "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav" } as Record<string, string>)[type] ?? "webm";
  const file = await toFile(audio, `answer.${ext}`, { type });
  const res = await (await aiForUser(userId)).audio.transcriptions.create({
    model: MODELS.stt,
    file,
    prompt:
      "Claude Code study answer. May mix Spanish and English. Terms: Claude Code, CLAUDE.md, settings.json, SKILL.md, hooks, PreToolUse, PostToolUse, subagent, MCP, plugin, worktree, headless, Agent SDK, plan mode, slash command.",
  });
  await recordUsage({ userId, purpose: "stt", model: MODELS.stt, kind: "stt", audioSeconds: durationSec });
  return res.text;
}
