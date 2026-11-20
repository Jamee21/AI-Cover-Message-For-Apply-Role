"use client";
import { TONES, type Tone } from "@/lib/schemas";

interface Props {
  value: Tone;
  onChange: (tone: Tone) => void;
  disabled?: boolean;
}

const LABELS: Record<Tone, { name: string; hint: string }> = {
  formal: { name: "Formal", hint: "About 200 words. Good for email and company portals." },
  friendly: { name: "Friendly", hint: "About 170 words. Warm but still professional." },
  short: { name: "Short", hint: "60 to 90 words. Good for LinkedIn or WhatsApp." },
};

export default function ToneSelector({ value, onChange, disabled }: Props) {
  // Arrow keys move between options, like a normal radio group.
  function onKeyDown(e: React.KeyboardEvent) {
    const i = TONES.indexOf(value);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(TONES[(i + 1) % TONES.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(TONES[(i - 1 + TONES.length) % TONES.length]);
    }
  }

  return (
    <div>
      <div className="tones" role="radiogroup" aria-label="Tone of the message" onKeyDown={onKeyDown}>
        {TONES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={value === t}
            tabIndex={value === t ? 0 : -1}
            disabled={disabled}
            className="tone"
            onClick={() => onChange(t)}
          >
            {LABELS[t].name}
          </button>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        {LABELS[value].hint}
      </p>
    </div>
  );
}