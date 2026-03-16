import { AlertTriangle } from "lucide-react";

export function InternalBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-[24px] border border-warning/20 bg-warning/10 px-5 py-4 text-sm text-slate-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p>
        Internal-use underwriting intelligence system. Sensitive borrower and trade data may be present.
        Model outputs are advisory and must be reviewed by an authorized analyst.
      </p>
    </div>
  );
}
