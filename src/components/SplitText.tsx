/**
 * Заголовок проявляется по словам. Серверный компонент: только разметка + CSS-задержки,
 * ни байта JS. Стиль — глобальный .split-word (globals.css), reduced-motion учтён там же.
 */
export function SplitText({ text, className }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span
            className="split-word"
            style={{ animationDelay: `${Math.min(i * 45, 700)}ms` }}
          >
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
