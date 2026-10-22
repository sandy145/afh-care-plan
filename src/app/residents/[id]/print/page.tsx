import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { addDays, fmtDate, fmtDateTime, fullName, loadPlan, REVIEW_INTERVAL_DAYS, type ChangeLogRow } from "@/lib/plan";
import { ASSIST_LABELS, NCP_TEMPLATE, type TemplateSection } from "@/lib/ncp-template";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const SECTIONS_PER_PAGE = 3;

export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ changes?: string; history?: string }> }) {
  const { id } = await params;
  const { changes: changesOnly, history: fullHistory } = await searchParams;
  const { supabase, profile, user } = await requireUser();
  const plan = await loadPlan(supabase, id);
  if (!plan) notFound();
  const { data: home } = await supabase.from("homes").select("name").eq("id", profile?.home_id ?? "").maybeSingle();
  await supabase.from("access_log").insert({ resident_id: id, user_id: user.id, action: "print_plan" });

  // Three ways to scope what prints: changes since the last review (default), right after
  // a review the changes it covered, or — with ?history=1 — every change ever recorded.
  let changes = plan.changesSinceReview;
  let periodStart = plan.lastReview?.reviewed_at ?? plan.resident.original_plan_date;
  let reviewFor = plan.lastReview;
  if (fullHistory) {
    const { data: cl } = await supabase.from("change_log").select("*, author:profiles!change_log_author_id_fkey(full_name,role)").eq("resident_id", id).order("created_at", { ascending: false });
    changes = (cl ?? []) as ChangeLogRow[];
    periodStart = plan.resident.original_plan_date ?? changes[changes.length - 1]?.created_at ?? null;
    reviewFor = plan.lastReview;
  } else if (changes.length === 0 && plan.lastReview) {
    const { data: prev } = await supabase.from("reviews").select("reviewed_at").eq("resident_id", id).lt("reviewed_at", plan.lastReview.reviewed_at).order("reviewed_at", { ascending: false }).limit(1);
    const from = prev?.[0]?.reviewed_at ?? "1970-01-01";
    const { data: cl } = await supabase.from("change_log").select("*, author:profiles!change_log_author_id_fkey(full_name,role)").eq("resident_id", id).gt("created_at", from).lte("created_at", plan.lastReview.reviewed_at).order("created_at", { ascending: false });
    changes = (cl ?? []) as ChangeLogRow[];
    periodStart = prev?.[0]?.reviewed_at ?? plan.resident.original_plan_date;
    reviewFor = plan.lastReview;
  }
  const changedByField: Record<string, ChangeLogRow> = {};
  for (const c of [...changes].reverse()) changedByField[c.field_id] = c; // earliest old_value, latest wins for new
  for (const c of changes) if (changedByField[c.field_id]) changedByField[c.field_id] = { ...c, old_value: changedByField[c.field_id].old_value };
  const changedSections = new Set(changes.map((c) => c.field_id.split(".")[0]));

  const sections = changesOnly ? NCP_TEMPLATE.filter((s) => changedSections.has(s.id)) : NCP_TEMPLATE;
  const pages: TemplateSection[][] = [];
  for (let i = 0; i < sections.length; i += SECTIONS_PER_PAGE) pages.push(sections.slice(i, i + SECTIONS_PER_PAGE));
  const totalPages = pages.length + 1;
  const name = fullName(plan.resident);
  const printedAt = fmtDateTime(new Date().toISOString());
  const footerMeta = `Printed ${printedAt} by ${profile?.full_name ?? ""} · Plan v${plan.version} · Last updated ${fmtDate(plan.lastUpdated)} · Last reviewed ${fmtDate(plan.lastReview?.reviewed_at)}`;
  const show = (fid: string, v: string | null) => (v == null || v === "" ? null : fid.endsWith(".level") ? ASSIST_LABELS[v] ?? v : v);

  return (
    <main className="bg-gray-200 print:bg-white min-h-screen">
      <div className="no-print max-w-[8.5in] mx-auto p-4 flex flex-wrap items-center gap-3 text-sm">
        <a href={`/residents/${id}`} className="text-navy font-semibold">
          ← Back
        </a>
        <span className="text-muted">
          {fullHistory ? "Full change history" : changesOnly ? "Changed pages only + change log" : "Full plan + change log"}
        </span>
        <span className="ml-auto flex flex-wrap gap-3">
          <a href={`/residents/${id}/print`} className={`underline ${!changesOnly && !fullHistory ? "pointer-events-none text-ink font-semibold no-underline" : "text-navy"}`}>
            Full plan
          </a>
          <a href={`/residents/${id}/print?changes=1`} className={`underline ${changesOnly && !fullHistory ? "pointer-events-none text-ink font-semibold no-underline" : "text-navy"}`}>
            Changed pages only
          </a>
          <a href={`/residents/${id}/print?history=1`} className={`underline ${fullHistory ? "pointer-events-none text-ink font-semibold no-underline" : "text-navy"}`}>
            All updates ever recorded
          </a>
        </span>
        <PrintButton />
      </div>

      {pages.map((secs, pi) => (
        <Page key={pi} name={name} page={pi + 1} total={totalPages} meta={footerMeta}>
          <div className="grid border-[1.5px] border-black" style={{ gridTemplateColumns: "2.3in 1fr 1fr" }}>
            <Th>CARE AND SERVICES</Th>
            <Th>RESIDENT STRENGTHS/WHAT RESIDENT PREFERS TO DO INDEPENDENTLY</Th>
            <Th last>WHAT PROVIDER/CAREGIVER/SUPPORT PERSON DOES/WHEN &amp; HOW</Th>
            {secs.map((s, si) => {
              const last = si === secs.length - 1;
              const col = (n: 1 | 2 | 3) => s.fields.filter((f) => f.column === n);
              const cellCls = `p-1.5 align-top ${last ? "" : "border-b border-black"}`;
              const Field = ({ fid, label, bold }: { fid: string; label?: string; bold?: boolean }) => {
                const cur = show(fid, plan.values[fid]?.value ?? null);
                const ch = changedByField[fid];
                const old = ch ? show(fid, ch.old_value) : null;
                return (
                  <div className="mb-1">
                    {label && <span>{label}: </span>}
                    {old && (
                      <>
                        <s className="text-gray-500">{old}</s>{" "}
                      </>
                    )}
                    {cur ? <span className={bold || ch ? "font-bold" : ""}>{cur}</span> : !old && <span className="text-gray-400">&nbsp;</span>}
                    {ch && (
                      <div className="text-[8px] italic text-red-800">
                        Updated {fmtDateTime(ch.created_at)} · {ch.author?.full_name}
                        {ch.voice_note_id ? " · voice note" : ""}
                        {ch.reason ? ` · ${ch.reason}` : ""}
                      </div>
                    )}
                  </div>
                );
              };
              return (
                <div key={s.id} className="contents">
                  <div className={`${cellCls} border-r border-black`}>
                    <div className="font-bold mb-1">{s.title}</div>
                    {s.hasAssistLevel !== false && <AssistRow value={plan.values[`${s.id}.level`]?.value ?? null} old={changedByField[`${s.id}.level`]?.old_value ?? null} />}
                    {changedByField[`${s.id}.level`] && (
                      <div className="text-[8px] italic text-red-800 mb-1">
                        Updated {fmtDateTime(changedByField[`${s.id}.level`].created_at)} · {changedByField[`${s.id}.level`].author?.full_name}
                      </div>
                    )}
                    {col(1)
                      .filter((f) => f.type !== "assist")
                      .map((f) => (
                        <Field key={f.id} fid={f.id} label={f.label} />
                      ))}
                  </div>
                  <div className={`${cellCls} border-r border-black`}>{col(2).map((f) => <Field key={f.id} fid={f.id} />)}</div>
                  <div className={cellCls}>
                    {col(3).map((f) => (
                      <Field key={f.id} fid={f.id} bold />
                    ))}
                    {!changedSections.has(s.id) && changes.length > 0 && (
                      <div className="text-[8px] italic text-gray-500">{fullHistory ? "No change recorded." : `No change since last review (${fmtDate(periodStart)}).`}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {secs.some((s) => changedSections.has(s.id)) && (
            <div className="mt-2 border border-red-800 bg-red-50 p-1.5 text-[9px]">
              <div className="font-bold text-red-800">{fullHistory ? "ALL CHANGES RECORDED ON THIS PAGE" : `CHANGES ON THIS PAGE SINCE LAST REVIEW (${fmtDate(periodStart)})`}</div>
              {changes
                .filter((c) => secs.some((s) => c.field_id.startsWith(s.id + ".")))
                .map((c, i) => (
                  <div key={c.id}>
                    {i + 1}. {NCP_TEMPLATE.find((s) => c.field_id.startsWith(s.id + "."))?.title} — {c.field_id.split(".")[1].replace(/_/g, " ")}: {show(c.field_id, c.old_value) ?? "(blank)"} → <b>{show(c.field_id, c.new_value) ?? "(blank)"}</b>. {fmtDateTime(c.created_at)}, {c.author?.full_name}
                    {c.voice_note_id ? ", voice note" : ""}
                    {c.reason ? `, reason: ${c.reason}` : ""}.
                  </div>
                ))}
              <div className="text-gray-600">Struck-through text is the previous value. Full history on the Change Log page.</div>
            </div>
          )}
        </Page>
      ))}

      {/* Change log + review record addendum */}
      <Page name={name} page={totalPages} total={totalPages} meta={footerMeta}>
        <div className="text-center font-bold text-[10.5px] mb-2">
          CARE PLAN CHANGE LOG {fullHistory ? "— FULL HISTORY" : "AND REVIEW RECORD — ADDENDUM"}
        </div>
        <div className="grid grid-cols-4 border-[1.5px] border-black text-[9px]">
          <div className="p-1 border-r border-black">
            <b>RESIDENT:</b> {name}
          </div>
          <div className="p-1 border-r border-black">
            <b>PROVIDER:</b> {home?.name ?? ""}
          </div>
          <div className="p-1 border-r border-black">
            <b>{fullHistory ? "SINCE" : "REVIEW PERIOD"}:</b> {fmtDate(periodStart)} – {fullHistory ? "today" : fmtDate(reviewFor?.reviewed_at ?? new Date().toISOString())}
          </div>
          <div className="p-1">
            <b>PLAN VERSION:</b> {plan.version}
          </div>
        </div>
        <div className="font-bold mt-2 mb-1">{fullHistory ? `ALL CHANGES RECORDED (${changes.length})` : "CHANGES SINCE LAST REVIEW"}</div>
        <div className="grid border-[1.5px] border-black text-[8.5px]" style={{ gridTemplateColumns: "0.85in 1.25in 1.2in 1fr 0.9in 1.1in" }}>
          {["DATE / TIME", "SECTION · FIELD", "PREVIOUS", "NEW", "BY", "SOURCE / REASON"].map((h, i) => (
            <div key={h} className={`p-1 font-bold bg-gray-100 border-b-[1.5px] border-black ${i < 5 ? "border-r" : ""}`}>
              {h}
            </div>
          ))}
          {changes.length === 0 && <div className="p-1 col-span-6 text-gray-600">No changes recorded.</div>}
          {changes.map((c, i) => {
            const last = i === changes.length - 1;
            const cell = `p-1 ${last ? "" : "border-b border-black"}`;
            return (
              <div key={c.id} className="contents">
                <div className={`${cell} border-r border-black`}>{fmtDateTime(c.created_at)}</div>
                <div className={`${cell} border-r border-black`}>
                  {NCP_TEMPLATE.find((s) => c.field_id.startsWith(s.id + "."))?.title} · {c.field_id.split(".")[1].replace(/_/g, " ")}
                </div>
                <div className={`${cell} border-r border-black text-gray-600`}>{show(c.field_id, c.old_value) ?? "(blank)"}</div>
                <div className={`${cell} border-r border-black font-bold`}>{show(c.field_id, c.new_value) ?? "(blank)"}</div>
                <div className={`${cell} border-r border-black`}>
                  {c.author?.full_name} ({c.author?.role})
                </div>
                <div className={cell}>
                  {c.voice_note_id ? "Voice note" : "By hand"}
                  {c.reason ? ` · ${c.reason}` : ""}
                  {c.significant ? " · significant" : ""}
                </div>
              </div>
            );
          })}
        </div>
        <div className="font-bold mt-2 mb-1">SECTIONS REVIEWED WITH NO CHANGE</div>
        <div className="border border-black p-1 text-[9px]">{NCP_TEMPLATE.filter((s) => !changedSections.has(s.id)).map((s) => s.title).join(" · ") || "—"}</div>
        <div className="font-bold mt-2 mb-1">REVIEW RECORD</div>
        <div className="grid grid-cols-3 border-[1.5px] border-black text-[9px]">
          <div className="p-1 border-r border-b border-black">
            <b>Date of original plan:</b> {fmtDate(plan.resident.original_plan_date)}
          </div>
          <div className="p-1 border-r border-b border-black">
            <b>This review:</b> {reviewFor ? `${fmtDate(reviewFor.reviewed_at)} (v${reviewFor.plan_version})` : "not yet completed"}
          </div>
          <div className="p-1 border-b border-black">
            <b>Next review due:</b> {fmtDate(addDays(reviewFor?.reviewed_at ?? new Date().toISOString(), REVIEW_INTERVAL_DAYS).toISOString())}
          </div>
          <div className="p-1 border-r border-black">
            <b>Reviewed by:</b> {reviewFor?.reviewer?.full_name ?? "—"}
          </div>
          <div className="p-1 border-r border-black">
            <b>Outcome:</b> {changes.length} changes, {changes.filter((c) => c.significant).length} significant
          </div>
          <div className="p-1">
            <b>Case manager notified:</b> ☐ Yes, date ______
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-4 text-[9px]">
          <div className="flex flex-col gap-4">
            <div>
              PROVIDER SIGNATURE: <span className="inline-block w-44 border-b border-black" /> DATE: <span className="inline-block w-16 border-b border-black" />
            </div>
            <div>
              RESIDENT / REPRESENTATIVE: <span className="inline-block w-36 border-b border-black" /> DATE: <span className="inline-block w-16 border-b border-black" />
            </div>
          </div>
          <div className="text-[8px] text-gray-700">The person signing writes the date s/he actually read and agreed to the changes. If the participant has verbally agreed, the provider notes the name and role of the participant, the date the changes were read to them, and any changes the participant recommended. Per WAC 388-76-10355(7) the plan is reviewed on any significant change; this home reviews every {REVIEW_INTERVAL_DAYS} days.</div>
        </div>
      </Page>
    </main>
  );
}

function Page({ children, name, page, total, meta }: { children: React.ReactNode; name: string; page: number; total: number; meta: string }) {
  return (
    <div className="print-page bg-white mx-auto my-4 print:my-0 shadow print:shadow-none flex flex-col text-[9.5px] leading-[1.35] text-black" style={{ width: "8.5in", minHeight: "11in", padding: "0.45in 0.5in 0.4in" }}>
      <div className="text-center font-bold text-[11px] leading-tight mb-3">
        ADULT FAMILY HOME
        <br />
        RESIDENT NEGOTIATED CARE PLAN
      </div>
      <div className="flex-1">{children}</div>
      <div className="mt-3 flex justify-between items-end text-[9px]">
        <div>
          RESIDENT NAME: <span className="inline-block w-64 border-b border-black px-1">{name}</span>
        </div>
        <div>
          Page {page} of {total}
        </div>
      </div>
      <div className="text-[7.5px] text-gray-500 text-right">{meta}</div>
    </div>
  );
}

function Th({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <div className={`p-1.5 font-bold bg-gray-100 border-b-[1.5px] border-black ${last ? "" : "border-r"}`}>{children}</div>;
}

function AssistRow({ value, old }: { value: string | null; old: string | null }) {
  return (
    <div className="mb-1">
      {Object.entries(ASSIST_LABELS).map(([k, lbl]) => {
        const on = value === k;
        const wasOn = old === k && old !== value;
        return (
          <span key={k} className={`mr-2 whitespace-nowrap ${on ? "font-bold" : ""} ${wasOn ? "line-through text-gray-500" : ""}`}>
            [{on || wasOn ? "YES" : "  "}] {lbl}
          </span>
        );
      })}
    </div>
  );
}
