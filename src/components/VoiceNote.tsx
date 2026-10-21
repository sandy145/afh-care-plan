"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ASSIST_LABELS, fieldOf, sectionOf } from "@/lib/ncp-template";

type Proposed = { field_id: string; new_value: string; reason: string; significant: boolean };
type Decision = "confirm" | "skip";

// Minimal typing for the Web Speech API
type SR = { start(): void; stop(): void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export default function VoiceNote({ residentId, sectionHint, authorName }: { residentId: string; sectionHint?: string; authorName: string }) {
  const router = useRouter();
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [changes, setChanges] = useState<Proposed[]>([]);
  const [current, setCurrent] = useState<Record<string, string | null>>({});
  const [dailyNote, setDailyNote] = useState("");
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [edits, setEdits] = useState<Record<number, string>>({});
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return setSupported(false);
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript + " ";
        else interimText += res[0].transcript;
      }
      if (finalText) setTranscript((t) => (t + " " + finalText).trim());
      setInterim(interimText);
    };
    r.onend = () => setRecording(false);
    r.onerror = (e) => {
      setRecording(false);
      if (e.error !== "no-speech") setError(`Microphone: ${e.error}`);
    };
    recRef.current = r;
  }, []);

  function toggle() {
    if (!recRef.current) return;
    setError(null);
    if (recording) recRef.current.stop();
    else {
      recRef.current.start();
      setRecording(true);
    }
  }

  async function map() {
    setBusy(true);
    setError(null);
    setWarning(null);
    const res = await fetch("/api/voice-map", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ residentId, transcript, sectionHint }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not process the note");
    setNoteId(data.noteId);
    setChanges(data.changes ?? []);
    setCurrent(data.current ?? {});
    setDailyNote(data.daily_note ?? "");
    setWarning(data.warning ?? null);
    const d: Record<number, Decision> = {};
    (data.changes ?? []).forEach((_: Proposed, i: number) => (d[i] = "confirm"));
    setDecisions(d);
  }

  async function apply() {
    const toApply = changes.map((c, i) => ({ ...c, new_value: edits[i] ?? c.new_value })).filter((_, i) => decisions[i] === "confirm");
    setBusy(true);
    setError(null);
    if (toApply.length === 0) {
      router.push(`/residents/${residentId}`);
      return;
    }
    const res = await fetch("/api/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ residentId, changes: toApply, voiceNoteId: noteId }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Could not apply");
    router.push(`/residents/${residentId}?s=${toApply[0].field_id.split(".")[0]}`);
    router.refresh();
  }

  const show = (fieldId: string, v: string | null) => (v == null ? "(blank)" : fieldOf(fieldId)?.type === "assist" ? ASSIST_LABELS[v] ?? v : v);

  return (
    <div className="flex-1 flex flex-col p-5 gap-4 pb-28">
      {changes.length === 0 && !noteId && (
        <>
          <div className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3">
            {!supported && <p className="text-sm text-red-700">This browser does not support speech recognition. Use Chrome or Safari, or type the note below.</p>}
            <button type="button" onClick={toggle} disabled={!supported} className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${recording ? "bg-red-600 animate-pulse" : "bg-navy"} disabled:opacity-40`} aria-label={recording ? "Stop recording" : "Start recording"}>
              {recording ? <span className="w-7 h-7 bg-white rounded-sm" /> : <MicIcon />}
            </button>
            <p className="text-center text-sm text-muted">{recording ? "Listening… tap to stop" : "Tap to record. Say what changed and why."}</p>
            <textarea value={transcript + (interim ? " " + interim : "")} onChange={(e) => setTranscript(e.target.value)} rows={5} placeholder='e.g. "Mr. Taylor started hospice Monday. He is a two-person transfer now. His daughter Linda is the first call."' className="text-sm p-3 rounded-xl border border-gray-300" />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="button" onClick={map} disabled={busy || !transcript.trim()} className="h-13 py-3.5 rounded-xl bg-navy text-white font-semibold disabled:opacity-50">
            {busy ? "Reading the plan…" : "Find what changed in the care plan"}
          </button>
        </>
      )}

      {noteId && (
        <>
          <div className="bg-white border border-line rounded-2xl p-4 text-sm italic text-muted">“{transcript}”</div>
          {warning && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{warning}</p>}
          {dailyNote && (
            <p className="text-xs text-muted">
              Saved as a daily note (not a plan change): <em>{dailyNote}</em>
            </p>
          )}
          <div className="text-sm font-semibold">{changes.length} proposed change{changes.length === 1 ? "" : "s"} to the care plan</div>
          {changes.map((c, i) => {
            const sec = sectionOf(c.field_id);
            const f = fieldOf(c.field_id);
            const dec = decisions[i];
            return (
              <div key={i} className={`bg-white border rounded-2xl p-3.5 flex flex-col gap-2.5 ${dec === "skip" ? "opacity-50 border-line" : "border-line"}`}>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-semibold text-navy bg-blue-100 px-2 py-1 rounded-md">
                    {sec?.title} · {f?.column === 1 ? f.label : f?.column === 2 ? "Strengths" : "Caregiver will"}
                  </span>
                  {c.significant && <span className="text-[11px] font-semibold text-red-800">Significant</span>}
                </div>
                <div className="text-sm">
                  <div className="text-red-800 line-through">{show(c.field_id, current[c.field_id] ?? null)}</div>
                  {dec === "confirm" && edits[i] !== undefined ? (
                    <textarea value={edits[i]} onChange={(e) => setEdits({ ...edits, [i]: e.target.value })} rows={3} className="w-full mt-1 text-sm p-2 rounded-lg border border-gray-300" />
                  ) : (
                    <div className="font-semibold">{show(c.field_id, edits[i] ?? c.new_value)}</div>
                  )}
                  <div className="text-xs text-muted mt-1">Reason: {c.reason}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDecisions({ ...decisions, [i]: "confirm" })} className={`flex-1 h-11 rounded-lg font-semibold text-sm ${dec === "confirm" ? "bg-green-100 text-green-800" : "border border-gray-300"}`}>
                    Confirm
                  </button>
                  {f?.type !== "assist" && (
                    <button type="button" onClick={() => setEdits({ ...edits, [i]: edits[i] ?? c.new_value })} className="flex-1 h-11 rounded-lg border border-gray-300 font-semibold text-sm text-navy">
                      Edit
                    </button>
                  )}
                  <button type="button" onClick={() => setDecisions({ ...decisions, [i]: "skip" })} className={`w-20 h-11 rounded-lg font-semibold text-sm ${dec === "skip" ? "bg-gray-200" : "border border-gray-300 text-muted"}`}>
                    Skip
                  </button>
                </div>
              </div>
            );
          })}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line p-4 max-w-lg mx-auto flex flex-col gap-1.5">
            <button type="button" onClick={apply} disabled={busy} className="h-13 py-3.5 rounded-xl bg-navy text-white font-semibold disabled:opacity-60">
              {busy ? "Applying…" : changes.length ? "Apply confirmed changes" : "Done"}
            </button>
            <p className="text-xs text-muted text-center">Each change is dated today and signed {authorName}. Skipped items are not written to the plan.</p>
          </div>
        </>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
