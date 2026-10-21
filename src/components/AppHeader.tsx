import Link from "next/link";
import SignOutButton from "./SignOutButton";

export default function AppHeader({
  title,
  subtitle,
  back,
  right,
  who,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: React.ReactNode;
  who?: { full_name: string; role: string } | null;
}) {
  return (
    <header className="no-print bg-white border-b border-line px-5 pt-5 pb-3 flex items-center gap-2.5 sticky top-0 z-10">
      {back && (
        <Link href={back} aria-label="Back" className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold truncate">{title}</h1>
        {subtitle && <div className="text-xs text-muted truncate">{subtitle}</div>}
      </div>
      {right}
      {who && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted bg-gray-100 px-2.5 py-1.5 rounded-full whitespace-nowrap">
            {who.full_name.split(" ")[0]} · {who.role === "admin" ? "Admin" : "Caregiver"}
          </span>
          <SignOutButton />
        </div>
      )}
    </header>
  );
}
