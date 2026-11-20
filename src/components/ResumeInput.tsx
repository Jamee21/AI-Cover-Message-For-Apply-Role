"use client";

import { useId, useState } from "react";

interface Props {
  file: File | null;
  onFile: (file: File | null) => void;
  text: string;
  onTextChange: (text: string) => void;
  disabled?: boolean;
}

const MAX_BYTES = 8 * 1024 * 1024;

type Mode = "upload" | "paste";

export default function ResumeInput({ file, onFile, text, onTextChange, disabled }: Props) {
  const inputId = useId();
  const [mode, setMode] = useState<Mode>("upload");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  function accept(next: File | undefined) {
    if (!next) return;
    const extension = next.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx", "txt"].includes(extension ?? "")) {
      setError("Choose a PDF, DOCX or TXT resume.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("Resume must be 8 MB or smaller.");
      return;
    }
    setError("");
    onFile(next);
    onTextChange("");
  }

  return (
    <div className="resume-input">
      <div className="input-tabs" role="tablist" aria-label="Resume input method">
        <button type="button" role="tab" aria-selected={mode === "upload"} className={mode === "upload" ? "input-tab active" : "input-tab"} onClick={() => setMode("upload")} disabled={disabled}>Upload file</button>
        <button type="button" role="tab" aria-selected={mode === "paste"} className={mode === "paste" ? "input-tab active" : "input-tab"} onClick={() => setMode("paste")} disabled={disabled}>Paste resume text</button>
        <span className="input-tab-help">PDF · DOCX · TXT</span>
      </div>
      {mode === "upload" ? (
        <div className={`resume-upload-row${dragging ? " is-over" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) accept(event.dataTransfer.files[0]); }}>
          <label className="resume-drop" htmlFor={inputId}>
          <input id={inputId} className="visually-hidden" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" disabled={disabled} onChange={(event) => accept(event.target.files?.[0])} />
          <span className="resume-file-icon" aria-hidden="true">↑</span>
          <span><b>{file ? file.name : "Choose your resume or drop it here"}</b><small>{file ? "Click to replace this file" : "PDF, DOCX or TXT · Up to 8 MB"}</small></span>
          </label>
          {file && <button className="remove-file" type="button" aria-label="Remove resume" disabled={disabled} onClick={() => onFile(null)}>×</button>}
        </div>
      ) : (
        <label className="resume-paste-label" htmlFor={`${inputId}-text`}>
          <textarea id={`${inputId}-text`} className="resume-textarea" placeholder="Paste the text from your resume here…" value={text} onChange={(event) => { onTextChange(event.target.value); onFile(null); setError(""); }} maxLength={40000} disabled={disabled} />
          <span className="textarea-count">{text.length.toLocaleString()} / 40,000</span>
        </label>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
