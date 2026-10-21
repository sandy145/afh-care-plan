"use client";
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="ml-auto h-10 px-4 rounded-lg bg-navy text-white font-semibold">
      Print / Save PDF
    </button>
  );
}
