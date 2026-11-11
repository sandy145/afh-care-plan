"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ASSIST_LABELS, ASSIST_DESCRIPTIONS, SECTION_DESCRIPTIONS, NCP_TEMPLATE, type TemplateField, type TemplateSection } from "@/lib/ncp-template";
import { fmtDate, fmtDateTime, type ChangeLogRow, type FieldValue } from "@/lib/plan";
import { friendlyError } from "@/lib/friendlyError";

type Props = {
  residentId: string;
  values: Record<string, FieldValue>;
  log: ChangeLogRow[];
  initialSection?: string;
  canEdit: boolean;
};

type Completion = { documented: number; total: number };

function sectionCompletion(s: TemplateSection, values: Record<string, FieldValue>): Completion {
  return { documented: s.fields.filter((f) => !!values[f.id]?.value).length, total: s.fields.length };
}

const ASSIST_TONE: Record<string, { chip: string; text: string }> = {
  independent: { chip: "bg-green-100 text-green-800", text: "text-green-700" },
  supervision: { chip: "bg-blue-100 text-blue-800", text: "text-blue-700" },
  assistance: { chip: "bg-amber-100 text-amber-800", text: "text-amber-700" },
  dependent: { chip: "bg-red-100 text-red-800", text: "text-red-700" },
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

  const completionBySection = useMemo(() => {
    const m: Record<string, Completion> = {};
    for (const s of NCP_TEMPLATE) m[s.id] = sectionCompletion(s, values);
    return m;
  }, [values]);
  const startedCount = Object.values(completionBySection).filter((c) => c.documented > 0).length;
  const current = completionBySection[active];
  const pct = current.total > 0 ? Math.round((current.documented / current.total) * 100) : 0;

  function goTo(id: string) {
    setActive(id);
    setEditing(false);
  }

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
    if (!res.ok) return setError(friendlyError((await res.json()).error ?? "Could not save"));
    setEditing(false);
    router.refresh();
  }

  const col = (n: 1 | 2 | 3) => section.fields.filter((f) => f.column === n);
  const hasAssist = section.hasAssistLevel !== false;
  const assistField = hasAssist ? col(1).find((f) => f.type === "assist") : undefined;
  const col1Display = col(1).filter((f) => f.type !== "assist");
  const col2 = col(2);
  const caregiverField = col(3)[0];
  const assistValue = assistField ? (values[assistField.id]?.value ?? null) : null;
  const tone = assistValue ? ASSIST_TONE[assistValue] : undefined;

  const blankLabels = [
    ...(assistField && !assistValue ? ["level of assistance"] : []),
    ...col1Display.filter((f) => !values[f.id]?.value).map((f) => f.label.toLowerCase()),
    ...(col2.length > 0 && !values[col2[0].id]?.value ? ["resident strengths"] : []),
    ...(caregiverField && !values[caregiverField.id]?.value ? ["caregiver instructions"] : []),
  ];

  return (
    <div className="flex flex-col flex-1 lg:flex-row lg:items-start lg:gap-0">
      {/* Mobile / narrow screens: horizontal scrolling pills */}
      <nav className="no-print lg:hidden bg-white border-b border-line px-3 py-2 overflow-x-auto">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wide px-1 mb-1.5">Care plan sections · {startedCount} of {NCP_TEMPLATE.length} started</div>
        <div className="flex gap-2 w-max">
          {NCP_TEMPLATE.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className={`h-9 pl-2.5 pr-3 rounded-full border text-[13px] whitespace-nowrap flex items-center gap-1.5 ${s.id === active ? "bg-navy border-navy text-white font-semibold" : "bg-white border-gray-300"}`}
            >
              <SectionStatusIcon completion={completionBySection[s.id]} active={s.id === active} />
              {titleCase(s.title)}
            </button>
          ))}
        </div>
      </nav>

      {/* Wide screens: persistent sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:border-r lg:border-line lg:bg-white lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
        <div className="px-4 pt-4 pb-1 text-[11px] font-semibold text-muted uppercase tracking-wide">Care plan sections</div>
        <div className="px-4 pb-3 text-xs text-muted">{startedCount} of {NCP_TEMPLATE.length} started</div>
        <div className="flex-1 overflow-y-auto flex flex-col pb-2">
          {NCP_TEMPLATE.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className={`text-left px-4 py-2 text-sm flex items-center gap-2 border-l-[3px] ${s.id === active ? "border-navy bg-blue-50 text-navy font-semibold" : "border-transparent text-ink hover:bg-gray-50"}`}
            >
              <SectionStatusIcon completion={completionBySection[s.id]} active={s.id === active} />
              <span className="truncate">{titleCase(s.title)}</span>
            </button>
          ))}
        </div>
        <div className="m-3 p-3 rounded-xl bg-gray-50 border border-line">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Plan completeness</div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden mb-1.5">
            <div className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-navy"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted">{pct}% of this section&apos;s details completed</p>
          {pct < 100 && <p className="text-xs text-muted mt-1">Complete missing care details before the next review.</p>}
        </div>
      </aside>

      <section className="flex-1 min-w-0 p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Care plan / {titleCase(section.title)}</div>
          <h2 className="text-2xl font-bold leading-tight">{titleCase(section.title)}</h2>
          {SECTION_DESCRIPTIONS[section.id] && <p className="text-sm text-muted max-w-prose">{SECTION_DESCRIPTIONS[section.id]}</p>}
          <span className="inline-flex self-start items-center text-xs font-medium text-muted bg-gray-100 px-2.5 py-1 rounded-full mt-1">
            {lastChange ? `Updated ${fmtDate(lastChange.created_at)}` : "No changes recorded yet"}
          </span>
        </div>

        <div className={`grid gap-3 ${assistField ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {assistField && (
            <StatCard
              label="Assistance level"
              value={assistValue ? ASSIST_LABELS[assistValue] ?? assistValue : "Not set"}
              valueClassName={tone?.text}
              sub={assistValue ? ASSIST_DESCRIPTIONS[assistValue] : "No level selected yet"}
            />
          )}
          <StatCard label="Care plan details" value={`${current.documented} / ${current.total}`} sub="Fields documented" />
          <StatCard label="Last updated" value={lastChange ? fmtDate(lastChange.created_at) : "Never"} sub={lastChange ? `By ${lastChange.author?.full_name ?? "—"}` : "No changes yet"} />
        </div>

        {blankLabels.length > 0 && (
          <div className="no-print bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2.5 items-start">
            <WarningIcon />
            <p className="text-sm text-amber-900">
              <strong>
                {blankLabels.length} care detail{blankLabels.length === 1 ? "" : "s"} need{blankLabels.length === 1 ? "s" : ""} attention.
              </strong>{" "}
              Review missing items such as {formatList(blankLabels.slice(0, 3))}. Don&apos;t assume these are unnecessary.
            </p>
          </div>
        )}

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

        {!editing ? (
          <>
            {(assistField || caregiverField) && (
              <div className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-4">
                {assistField && (
                  <div>
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Level of assistance</div>
                    <AssistChip value={assistValue} />
                  </div>
                )}
                {caregiverField && (
                  <div>
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Primary caregiver instruction</div>
                    <div className="text-base font-semibold leading-snug">{values[caregiverField.id]?.value || <span className="text-gray-400 font-normal italic">Not documented yet</span>}</div>
                  </div>
                )}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              <Column title={`${titleCase(section.title)} details`} fields={col1Display} values={values} draft={draft} editing={false} setDraft={setDraft} prevValue={prevValue} />
              {col2.length > 0 && <Column title="Resident strengths & preferences" fields={col2} values={values} draft={draft} editing={false} setDraft={setDraft} prevValue={prevValue} />}
            </div>
          </>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            <Column title={section.title} fields={col(1)} values={values} draft={draft} editing={editing} setDraft={setDraft} prevValue={prevValue} hasAssist={hasAssist} />
            {col2.length > 0 && <Column title="Resident strengths and abilities · prefers to do independently · preferences and personal goals" fields={col2} values={values} draft={draft} editing={editing} setDraft={setDraft} prevValue={prevValue} />}
            {col(3).length > 0 && <Column title="Assistance required · who will provide, when, and how" fields={col(3)} values={values} draft={draft} editing={editing} setDraft={setDraft} prevValue={prevValue} />}
          </div>
        )}

        {sectionLog.length > 0 && (
          <details className="no-print group">
            <summary className="list-none cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wide select-none">
              <ChevronIcon />
              Change history for this section ({sectionLog.length})
            </summary>
            <div className="bg-white border border-line rounded-xl px-3 py-2.5 mt-1.5 text-xs flex flex-col gap-2">
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
          </details>
        )}
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
  const visibleFields = fields.filter((f) => !(f.type === "assist" && hasAssist === false));
  // The assist-level checkbox grid is itself worth showing even with nothing selected,
  // so only collapse a column when it has no assist field and no field has a value.
  const hasAssistField = visibleFields.some((f) => f.type === "assist");
  const allEmpty = !editing && !hasAssistField && visibleFields.every((f) => !values[f.id]?.value);

  return (
    <div className="bg-white border border-line rounded-2xl p-3.5 flex flex-col gap-3">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">{title}</div>
      {allEmpty ? (
        <p className="text-sm text-gray-400 italic py-1">Nothing recorded yet.</p>
      ) : (
        visibleFields.map((f, i) => {
          const cur = values[f.id]?.value ?? "";
          const prev = prevValue(f.id);
          return (
            <div key={f.id} className={`flex flex-col gap-1 ${i > 0 ? "pt-3 border-t border-gray-100" : ""}`}>
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
                  <div className={`text-[15px] ${f.column === 3 ? "font-semibold" : ""}`}>
                    {f.type === "assist" ? (
                      <AssistChip value={cur || null} />
                    ) : (
                      cur || <span className="text-gray-400 italic text-sm">Not documented yet</span>
                    )}
                  </div>
                  {prev && prev.new_value === (cur || null) && (
                    <div className="text-xs text-red-800 line-through">{f.type === "assist" ? ASSIST_LABELS[prev.old_value ?? ""] ?? prev.old_value : prev.old_value}</div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function StatCard({ label, value, sub, valueClassName }: { label: string; value: React.ReactNode; sub?: string; valueClassName?: string }) {
  return (
    <div className="bg-white border border-line rounded-2xl p-3.5 flex flex-col gap-1">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold ${valueClassName ?? ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

function AssistChip({ value }: { value: string | null }) {
  if (!value) return <span className="text-sm text-gray-400 italic">Not set yet</span>;
  const tone = ASSIST_TONE[value]?.chip ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${tone}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {ASSIST_LABELS[value] ?? value}
    </span>
  );
}

function formatList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
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
function SectionStatusIcon({ completion, active }: { completion: Completion; active: boolean }) {
  if (active) return <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />;
  if (completion.documented === 0) return <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />;
  if (completion.documented < completion.total) {
    return (
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
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
function ChevronIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90 shrink-0">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
      <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}
