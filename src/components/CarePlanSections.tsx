"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ASSIST_LABELS, NCP_TEMPLATE, type TemplateField } from "@/lib/ncp-template";
import { fmtDateTime, type ChangeLogRow, type FieldValue } from "@/lib/plan";

type Props = {
  residentId: string;
  values: Record<string, FieldValue>;
  log: ChangeLogRow[];
  initialSection?: string;
  canEdit: boolean;
};

export default function CarePlanSections({ residentId, values, log, initialSection, canEdit }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(initialSection && NCP_TEMPLATE.some((s) => s.id === initialSection) ? initialSection : "bed_mobility");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const section = NCP_TEMPLATE.find((s) => s.id === active)!;
  const sectionLog = useMemo(() => log.filter((l) => l.field_id.startsWith(active + ".")), [log, active]);
  const lastChange = sectionLog[0];
  const prevValue = (fieldId: string) => sectionLog.find((l) => l.field_id === fieldId && l.old_value);

  function startEdit() {
    const d: Record<string, string> = {};
    for (const f of section.fields) d[f.id] = values[f.id]?.value ?? "";
    setDraft(d);
    setReason("");
    setEditing(true);
  }

  async function save() {
    const changes = section.fields
      .filter((f) => (draft[f.id] ?? "") !== (values[f.id]?.value ?? ""))
      .map((f) => ({ field_id: f.id, new_value: draft[f.id] || null, reason: reason || null, significant: f.type === "assist" }));
    if (changes.length === 0) return setEditing(false);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ residentId, changes }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Could not save");
    setEditing(false);
    router.refresh();
  }

  const col = (n: 1 | 2 | 3) => section.fields.filter((f) => f.column === n);

  return (
    <div className="flex flex-col flex-1">
      <nav className="no-print bg-white border-b border-line px-3 py-2 overflow-x-auto">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wide px-1 mb-1.5">NCP sections · same order as the form</div>
        <div className="flex gap-2 w-max">
          {NCP_TEMPLATE.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActive(s.id);
                setEditing(false);
              }}
              className={`h-9 px-3 rounded-full border text-[13px] whitespace-nowrap ${s.id === active ? "bg-navy border-navy text-white font-semibold" : "bg-white border-gray-300"}`}
            >
              {titleCase(s.title)}
            </button>
          ))}
        </div>
      </nav>

      <section className="p-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{section.title}</h2>
          {lastChange && (
            <span className="text-xs text-muted">
              Changed {fmtDateTime(lastChange.created_at)} by {lastChange.author?.full_name ?? "—"}
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Column title={section.title} fields={col(1)} values={values} draft={draft} editing={editing} setDraft={setDraft} prevValue={prevValue} hasAssist={section.hasAssistLevel !== false} />
          {col(2).length > 0 && <Column title="Resident strengths and abilities · prefers to do independently · preferences and personal goals" fields={col(2)} values={values} draft={draft} editing={editing} setDraft={setDraft} prevValue={prevValue} />}
          {col(3).length > 0 && <Column title="Assistance required · who will provide, when, and how" fields={col(3)} values={values} draft={draft} editing={editing} setDraft={setDraft} prevValue={prevValue} />}
        </div>

        {canEdit && !editing && (
          <div className="no-print flex gap-2.5">
            <Link href={`/residents/${residentId}/voice?s=${active}`} className="flex-1 h-12 rounded-xl bg-navy text-white font-semibold flex items-center justify-center gap-2">
              <MicIcon /> Voice update
            </Link>
            <button type="button" onClick={startEdit} className="flex-1 h-12 rounded-xl bg-white border border-gray-300 font-semibold text-navy">
              Edit by hand
            </button>
          </div>
        )}
        {editing && (
          <div className="no-print bg-white border border-line rounded-2xl p-3.5 flex flex-col gap-3">
            <label className="text-sm font-semibold flex flex-col gap-1">
              Reason for change (shows on the printed plan)
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. hospice transfer, fall on 10/11" className="h-11 px-3 rounded-lg border border-gray-300 font-normal" />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-2.5">
              <button type="button" disabled={busy} onClick={save} className="flex-1 h-12 rounded-xl bg-green-100 text-green-800 font-semibold disabled:opacity-60">
                {busy ? "Saving…" : "Confirm changes"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="flex-1 h-12 rounded-xl bg-white border border-gray-300 font-semibold">
                Cancel
              </button>
            </div>
            <p className="text-xs text-muted">Each changed field is dated, signed with your name, and the old value is kept in the change log.</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Change log · this section</div>
          <div className="bg-white border border-line rounded-xl px-3 py-2.5 text-xs flex flex-col gap-2">
            {sectionLog.length === 0 && <div className="text-muted">No changes recorded yet.</div>}
            {sectionLog.slice(0, 8).map((l) => (
              <div key={l.id} className="flex gap-2">
                <span className="text-muted w-24 shrink-0">{fmtDateTime(l.created_at)}</span>
                <span className="min-w-0">
                  <span className="text-muted">{labelOf(l.field_id)}:</span> {l.old_value ? <s className="text-gray-500">{short(l.old_value)}</s> : "(blank)"} → <strong>{short(l.new_value)}</strong> · {l.author?.full_name ?? "—"}
                  {l.reason ? ` · ${l.reason}` : ""}
                  {l.voice_note_id ? " · voice" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Column({
  title,
  fields,
  values,
  draft,
  editing,
  setDraft,
  prevValue,
  hasAssist,
}: {
  title: string;
  fields: TemplateField[];
  values: Record<string, FieldValue>;
  draft: Record<string, string>;
  editing: boolean;
  setDraft: (d: Record<string, string>) => void;
  prevValue: (id: string) => ChangeLogRow | undefined;
  hasAssist?: boolean;
}) {
  return (
    <div className="bg-white border border-line rounded-2xl p-3.5 flex flex-col gap-3">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">{title}</div>
      {fields.map((f) => {
        const cur = values[f.id]?.value ?? "";
        const prev = prevValue(f.id);
        if (f.type === "assist" && hasAssist === false) return null;
        return (
          <div key={f.id} className="flex flex-col gap-1">
            {f.column === 1 && <div className="text-xs text-muted">{f.label}</div>}
            {editing ? (
              f.type === "assist" ? (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(ASSIST_LABELS).map(([k, lbl]) => (
                    <button key={k} type="button" onClick={() => setDraft({ ...draft, [f.id]: k })} className={`text-xs px-2.5 py-1.5 rounded-md border ${draft[f.id] === k ? "bg-blue-100 border-navy text-navy font-semibold" : "border-gray-300"}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              ) : f.type === "yesno" ? (
                <div className="flex gap-1.5">
                  {["Yes", "No"].map((k) => (
                    <button key={k} type="button" onClick={() => setDraft({ ...draft, [f.id]: k })} className={`text-xs px-3 py-1.5 rounded-md border ${draft[f.id] === k ? "bg-blue-100 border-navy text-navy font-semibold" : "border-gray-300"}`}>
                      {k}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea value={draft[f.id] ?? ""} onChange={(e) => setDraft({ ...draft, [f.id]: e.target.value })} rows={f.column === 1 ? 2 : 4} className="text-sm p-2 rounded-lg border border-gray-300" />
              )
            ) : (
              <>
                <div className={`text-[15px] ${f.column === 3 ? "font-semibold" : ""}`}>{f.type === "assist" ? renderAssist(cur) : cur || <span className="text-gray-400">—</span>}</div>
                {prev && prev.new_value === (cur || null) && (
                  <div className="text-xs text-red-800 line-through">{f.type === "assist" ? ASSIST_LABELS[prev.old_value ?? ""] ?? prev.old_value : prev.old_value}</div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderAssist(v: string) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(ASSIST_LABELS).map(([k, lbl]) => (
        <span key={k} className={`text-xs px-2 py-1 rounded-md border ${v === k ? "bg-blue-100 border-navy text-navy font-semibold" : "border-gray-300 text-muted"}`}>
          [{v === k ? "YES" : " "}] {lbl}
        </span>
      ))}
    </div>
  );
}

export function labelOf(fieldId: string) {
  for (const s of NCP_TEMPLATE) for (const f of s.fields) if (f.id === fieldId) return f.column === 1 ? f.label : f.column === 2 ? "Strengths" : "Caregiver will";
  return fieldId;
}
function short(s: string | null) {
  if (!s) return "(blank)";
  return ASSIST_LABELS[s] ?? (s.length > 90 ? s.slice(0, 90) + "…" : s);
}
function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/: .*/, "")
    .replace("Psych/Social/Cognitive Status", "Psych/Social/Cognitive")
    .replace("Toileting/Continence Issues", "Toileting/Continence")
    .replace("Other Issues/Concerns/Problems", "Other Issues");
}
function MicIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
