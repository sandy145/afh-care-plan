// Generates SQL to load the NCP template into form_sections/form_fields.
// Run: npx tsx scripts/gen-seed-sql.ts > supabase/seed-template.sql
import { NCP_TEMPLATE } from "../src/lib/ncp-template";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const out: string[] = [];
out.push("insert into form_sections (id,title,area,sort_order,has_assist_level) values");
out.push(
  NCP_TEMPLATE.map((s, i) => `(${q(s.id)},${q(s.title)},${q(s.area)},${i + 1},${s.hasAssistLevel === false ? "false" : "true"})`).join(",\n") +
    "\non conflict (id) do update set title=excluded.title, area=excluded.area, sort_order=excluded.sort_order, has_assist_level=excluded.has_assist_level;"
);
out.push("insert into form_fields (id,section_id,label,column_no,field_type,sort_order) values");
const rows: string[] = [];
for (const s of NCP_TEMPLATE) s.fields.forEach((f, i) => rows.push(`(${q(f.id)},${q(s.id)},${q(f.label)},${f.column},${q(f.type ?? "text")},${i + 1})`));
out.push(rows.join(",\n") + "\non conflict (id) do update set label=excluded.label, column_no=excluded.column_no, field_type=excluded.field_type, sort_order=excluded.sort_order;");
console.log(out.join("\n"));
