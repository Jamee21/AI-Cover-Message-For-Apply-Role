"use client";
import { useCallback, useEffect, useId, useState } from "react";

interface Props {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024; // same 8 MB limit as the server

export default function UploadBox({ file, onFile, disabled }: Props) {
  const inputId = useId();
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState("");

  // Validate on the client first so the person gets instant feedback.
  const accept = useCallback(
    (f: File | undefined) => {
      if (!f) return;
      if (!ALLOWED.includes(f.type)) {
        setProblem("Use a PNG, JPG or WEBP screenshot.");
        return;
      }
      if (f.size > MAX_BYTES) {
        setProblem("This screenshot is over 8 MB. Use a smaller one.");
        return;
      }
      setProblem("");
      onFile(f);
    },
    [onFile]
  );

  // Show a preview of the chosen image, and free the memory when it changes.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Ctrl+V: paste a screenshot straight from the clipboard.
  useEffect(() => {
    if (disabled) return;
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      );
      accept(item?.getAsFile() ?? undefined);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept, disabled]);

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`drop${over ? " is-over" : ""}`}
        style={{ opacity: disabled ? 0.6 : 1 }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) accept(e.dataTransfer.files[0]);
        }}
      >
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          onChange={(e) => accept(e.target.files?.[0])}
        />

        {preview && file ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="drop-preview" src={preview} alt="Preview of the job screenshot you chose" />
            <span className="hint">{file.name}. Click to change it.</span>
          </>
        ) : (
          <>
            <span className="drop-title">Drop a job screenshot here</span>
            <span className="hint">Click to choose a file, or paste one with Ctrl+V.</span>
          </>
        )}
      </label>

      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}