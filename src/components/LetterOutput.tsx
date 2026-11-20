"use client";
import { useEffect, useState } from "react";
import type { AgentResult } from "@/agent/loop";

interface Props {
  result: AgentResult | null;
  letter: string;
  onLetterChange: (text: string) => void;
  onRegenerate: () => void;
  loading: boolean;
}

export default function LetterOutput({ result, letter, onLetterChange, onRegenerate, loading }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  // Reset the "Copied" state whenever a new letter arrives.
  useEffect(() => {
    setCopied(false);
    setCopyFailed(false);
  }, [result]);

  // Hide "Copied" again after 2 seconds.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true); // clipboard blocked: the person can still select the text by hand
    }
  }

  const words = letter.trim() ? letter.trim().split(/\s+/).length : 0;
  const edited = result !== null && letter !== result.letter;

  /* ---- Empty and loading states ---- */
  if (!result) {
    return (
      <section className={`sheet empty-sheet${loading ? " is-loading" : ""}`} aria-live="polite">
        {loading ? (
          <div className="empty-content pulse">
            <span className="empty-symbol"><span className="loading-orbit" /></span>
            <div><h2>Putting your best foot forward</h2><p>Reading the role, matching your experience, and drafting a tailored letter. This usually takes 20–40 seconds.</p></div>
          </div>
        ) : (
          <div className="empty-content">
            <span className="empty-symbol" aria-hidden="true">✧</span>
            <div><h2>Your letter will take shape here</h2><p>Once you share the job post, your tailored first draft will appear here — ready for your review.</p></div>
          </div>
        )}
      </section>
    );
  }

  /* ---- Result ---- */
  return (
    <div>
      <section className="sheet">
        <div className="sheet-header">
          <div><span className="eyebrow">YOUR TAILORED DRAFT</span><p className="sheet-role">
            {result.job.title ?? "Role not found"}
            {result.job.company ? ` · ${result.job.company}` : ""}
          </p></div>
          <span className="draft-badge"><span aria-hidden="true">✦</span> First draft</span>
        </div>

        <textarea
          className={`letter${loading ? " pulse" : ""}`}
          aria-label="Your cover letter. You can edit it."
          value={letter}
          onChange={(e) => onLetterChange(e.target.value)}
          readOnly={loading}
        />

        <div className="sheet-actions">
          <button type="button" className="btn btn-copy" onClick={copy} disabled={loading}>
            {copied ? "✓ Copied" : "Copy letter"}
          </button>
          <button type="button" className="btn" onClick={onRegenerate} disabled={loading}>
            {loading ? "Rewriting…" : "↻ Rewrite"}
          </button>
          <span className="hint" style={{ marginLeft: "auto", alignSelf: "center" }}>
            {words} words
          </span>
        </div>
        <span className="visually-hidden" role="status">
          {copied ? "Message copied to clipboard" : ""}
        </span>
        {copyFailed && (
          <p className="error" role="alert">
            Your browser blocked copying. Select the text and press Ctrl+C.
          </p>
        )}
      </section>

      {/* Guardrail result: the fact-check could not clear the letter */}
      {!result.verification.ok && (
        <div className="note note-warn" role="alert">
          <b>Check these before you send.</b> The fact-check found claims that are not in your profile:
          <ul>
            {result.verification.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {edited && (
        <p className="hint" style={{ marginTop: 12 }}>
          You edited this message. The fact-check only covered the version the agent wrote.
        </p>
      )}

      {result.gaps.length > 0 && (
        <div className="note note-info">
          This job asks for skills your profile does not list, so the letter does not claim them:{" "}
          {result.gaps.join(", ")}.
        </div>
      )}

      <details style={{ marginTop: 16 }}>
        <summary>
          What the agent did ({result.revisions === 0 ? "no rewrites needed" : `${result.revisions} rewrite(s)`})
        </summary>
        <ol className="trace">
          {result.steps.map((s, i) => (
            <li key={i}>
              <span>
                {s.name}
                {s.note ? `: ${s.note}` : ""}
              </span>
              <span className="ms">{(s.ms / 1000).toFixed(1)}s</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}