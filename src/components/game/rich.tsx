/**
 * Renders `inline code` spans (commands, flags, file names) as code chips, so learners see
 * exactly what they would type. Everything else stays plain text.
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith("`") && p.endsWith("`") ? (
          <code key={i} className="rounded-md bg-ink/10 px-1 py-px font-mono text-[0.9em] font-bold [overflow-wrap:anywhere]">
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
