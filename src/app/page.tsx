"use client";
import { useState } from "react";
import Link from "next/link";
import type { Tone } from "@/lib/schemas";
import type { AgentResult } from "@/agent/loop";
import ResumeInput from "@/components/ResumeInput";
import UploadBox from "@/components/UploadBox";
import ToneSelector from "@/components/ToneSelector";
import LetterOutput from "@/components/LetterOutput";

export default function Home() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobScreenshot, setJobScreenshot] = useState<File | null>(null);
  const [jobInputMode, setJobInputMode] = useState<"text" | "screenshot">("text");
  const [tone, setTone] = useState<Tone>("formal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [letter, setLetter] = useState("");
  const hasJobInput = jobInputMode === "text" ? Boolean(jobDescription.trim()) : Boolean(jobScreenshot);

  async function generate() {
    if ((!resumeFile && !resumeText.trim()) || !hasJobInput || loading) return;
    setLoading(true);
    setError("");

    const fd = new FormData();
    if (resumeFile) fd.append("resume", resumeFile);
    else fd.append("resumeText", resumeText);
    if (jobInputMode === "screenshot" && jobScreenshot) fd.append("screenshot", jobScreenshot);
    else fd.append("jobDescription", jobDescription);
    fd.append("tone", tone);

    try {
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        /* the server sent something that is not JSON (for example a timeout page) */
      }

      if (!res.ok) {
        const message = (data as { error?: string } | null)?.error;
        setError(message ?? "The server failed or took too long. Try again in a moment.");
        return; // keep any earlier letter on screen
      }

      const next = data as AgentResult;
      setResult(next);
      setLetter(next.letter);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" href="/" aria-label="Draftly home">
          <span className="brand-mark">✳</span>
          <span className="brand-copy">draftly<small>CAREER WRITING STUDIO</small></span>
        </Link>

        <Link className="nav-item nav-item-active" href="/">
          <span aria-hidden="true">＋</span> New application
        </Link>

        <div className="sidebar-section">
          <span className="sidebar-label">Your application, your data</span>
          <div className="process-step"><span>1</span><div><b>Add your resume</b><small>Upload or paste your experience</small></div></div>
          <div className="process-step"><span>2</span><div><b>Share the job</b><small>We find relevant keywords</small></div></div>
          <div className="process-step"><span>3</span><div><b>Make it yours</b><small>Review and edit your letter</small></div></div>
        </div>

        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span aria-hidden="true">◇</span><div><b>Not stored by Draftly</b><small>Sent to the AI provider to create your letter.</small></div>
          </div>
          <p className="sidebar-footnote">Every applicant brings their own resume. Your letter only uses details you provide.</p>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-status"><span className="status-badge"><span className="status-dot" /> AI writing assistant</span><span className="topbar-subtitle">Tailored to your experience, not a template</span></div>
          <span className="topbar-link privacy-label">⌑ Your information stays yours</span>
        </header>

        <main className="output-area">
          <div className="conversation">
            <section className="welcome-block">
              <span className="eyebrow">YOUR NEXT OPPORTUNITY, BETTER TOLD</span>
              <h1>{result ? "Your first draft is ready." : <>Let’s make your<br className="desktop-break" /> next move count.</>}</h1>
              <p>{result ? "Review your tailored message, make it yours, then send it with confidence." : "Add your resume and the job description. Get a letter grounded in your experience and tailored to the role."}</p>
            </section>

            <section className="compose-card" aria-label="Create a cover letter">
              <div className="compose-heading"><span className="compose-number">01</span><div><h2>Bring your experience</h2><p>Your resume is used only to personalize this letter</p></div><span className="required-tag">RESUME</span></div>
              <ResumeInput file={resumeFile} onFile={setResumeFile} text={resumeText} onTextChange={setResumeText} disabled={loading} />

              <div className="job-field-heading"><span className="compose-number">02</span><div><h2>Add the job description</h2><p>Paste the text or upload a screenshot of the job post</p></div><span className="required-tag">JOB POST</span></div>
              <div className="input-tabs job-input-tabs" role="tablist" aria-label="Job description input method">
                <button type="button" role="tab" aria-selected={jobInputMode === "text"} className={jobInputMode === "text" ? "input-tab active" : "input-tab"} onClick={() => setJobInputMode("text")} disabled={loading}>Paste text</button>
                <button type="button" role="tab" aria-selected={jobInputMode === "screenshot"} className={jobInputMode === "screenshot" ? "input-tab active" : "input-tab"} onClick={() => setJobInputMode("screenshot")} disabled={loading}>Upload screenshot</button>
                {jobInputMode === "screenshot" && <span className="input-tab-help">PNG · JPG · WEBP</span>}
              </div>
              {jobInputMode === "text" ? (
                <>
                  <textarea className="job-description" aria-label="Job description" placeholder="Paste the job description here…" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} maxLength={30000} disabled={loading} />
                  <div className="job-meta"><span>We’ll pick out key requirements and relevant keywords.</span><span>{jobDescription.length.toLocaleString()} / 30,000</span></div>
                </>
              ) : (
                <UploadBox file={jobScreenshot} onFile={setJobScreenshot} disabled={loading} />
              )}

              <div className="compose-controls">
                <div className="tone-control"><span className="field-label">Choose your tone</span><ToneSelector value={tone} onChange={setTone} disabled={loading} /></div>
                <button
                  type="button"
                  className="btn btn-primary generate-button"
                  onClick={generate}
                  disabled={(!resumeFile && !resumeText.trim()) || !hasJobInput || loading}
                  aria-busy={loading}
                >
                  {loading ? <><span className="button-spinner" /> Writing your letter…</> : <>Create my letter <span aria-hidden="true">→</span></>}
                </button>
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              <p className="composer-trust"><span aria-hidden="true">✦</span> Your letter uses job keywords where they truthfully match your resume. No invented experience.</p>
            </section>

            <LetterOutput
              result={result}
              letter={letter}
              onLetterChange={setLetter}
              onRegenerate={generate}
              loading={loading}
            />
          </div>
        </main>
        <footer className="main-footer"><span>Made for your next opportunity.</span><span>Review every detail before you send.</span></footer>
      </div>
    </div>
  );
}